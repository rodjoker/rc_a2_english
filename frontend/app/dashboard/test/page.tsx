import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TestClient from './TestClient'
import type { TestQuestion } from './types'

const ALL_CATEGORIES = [
  'introduction','experience','technical','behavioral',
  'teamwork','motivation','soft_skills','programming','closing',
]

function seededRng(seed: number) {
  let s = seed | 0
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s ^= s >>> 16
    return (s >>> 0) / 0xffffffff
  }
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = seededRng(seed)
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function shuffleWithCorrect(opts: string[], correctValue: string, seed: number) {
  const shuffled = seededShuffle(opts, seed)
  return { options: shuffled, correct: shuffled.indexOf(correctValue) }
}

export default async function TestPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lp } = await supabase
    .from('user_learning_profiles')
    .select('current_day')
    .eq('user_id', user.id)
    .single()
  const currentDay = lp?.current_day ?? 1

  const { data: progress } = await supabase
    .from('user_daily_progress')
    .select('task5_done, task5_best_score')
    .eq('user_id', user.id)
    .eq('day_number', currentDay)
    .single()

  if (progress?.task5_done) redirect('/dashboard')

  const [vocabRes, readingRes, grammarRes, interviewRes] = await Promise.all([
    supabase.from('vocabulary_words').select('id, word, translation').eq('day_number', currentDay).order('word_order'),
    supabase.from('reading_texts').select('questions').eq('day_number', currentDay).single(),
    supabase.from('grammar_lessons').select('exercises').eq('day_number', currentDay).single(),
    supabase.from('interview_questions').select('question_en, category').eq('day_number', currentDay).order('question_order').limit(1).single(),
  ])

  const vocab     = vocabRes.data ?? []
  const readingQs: Array<{ q: string; options: string[]; correct: number }> = readingRes.data?.questions ?? []
  const grammarExs: Array<{ sentence: string; answer: string; hint: string }> = grammarRes.data?.exercises ?? []
  const interview  = interviewRes.data

  const seed = currentDay * 7919

  // Helper: build a vocab MCQ for any word in the day's pool
  function makeVocabQ(word: { id: string; word: string; translation: string }, qSeed: number, qId: string): TestQuestion {
    const wrongPool = vocab.filter(w => w.id !== word.id && w.translation !== word.translation)
    const wrongs    = seededShuffle(wrongPool, qSeed).slice(0, 3).map(w => w.translation)
    const { options, correct } = shuffleWithCorrect([word.translation, ...wrongs], word.translation, qSeed + 100)
    return { id: qId, type: 'mcq', source: 'vocabulary', prompt: `What does "${word.word}" mean in Spanish?`, options, correct }
  }

  // Collect all candidates in order; deduplicate by prompt/sentence before finalizing
  const candidates: TestQuestion[] = []
  const usedWords = new Set<string>() // track vocab words already used as question subjects

  // Primary vocab picks: positions 0, 5, 10
  const primaryIndices = [0, Math.min(5, vocab.length - 1), Math.min(10, vocab.length - 1)]
  primaryIndices.forEach((idx, i) => {
    const word = vocab[idx]
    if (!word || usedWords.has(word.word)) return
    usedWords.add(word.word)
    candidates.push(makeVocabQ(word, seed + i, `vocab-${i}`))
  })

  // 2 Reading MCQ — skip any that ask about a word we already covered in vocab
  readingQs.slice(0, 2).forEach((rq, i) => {
    // Reading Q1 format: What does "X" mean in Spanish? — detect overlap
    const wordMatch = rq.q.match(/What does "(.+?)" mean/)
    if (wordMatch && usedWords.has(wordMatch[1])) return  // skip — already asked
    candidates.push({ id: `reading-${i}`, type: 'mcq', source: 'reading', prompt: rq.q, options: rq.options, correct: rq.correct })
  })

  // 1 Grammar fill-blank
  if (grammarExs.length > 0) {
    const ex = grammarExs[0]
    candidates.push({ id: 'grammar-0', type: 'fill', source: 'grammar', sentence: ex.sentence, answer: ex.answer, hint: ex.hint })
  }

  // 1 Interview MCQ — category identification
  if (interview) {
    const wrongCats = seededShuffle(ALL_CATEGORIES.filter(c => c !== interview.category), seed + 9000).slice(0, 3)
    const { options, correct } = shuffleWithCorrect(
      [interview.category, ...wrongCats].map(c => c.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())),
      interview.category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      seed + 9001
    )
    candidates.push({
      id: 'interview-0', type: 'mcq', source: 'interview',
      prompt: 'Which category does this interview question belong to?',
      context: interview.question_en,
      options, correct,
    })
  }

  // Final deduplication by exact prompt/sentence key
  const seenKeys = new Set<string>()
  const questions: TestQuestion[] = []
  for (const q of candidates) {
    const key = (q.type === 'mcq' ? q.prompt : q.sentence).trim().toLowerCase()
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      questions.push(q)
    }
  }

  // If we're short of 7, fill from remaining vocab words not yet used
  let backupCounter = 0
  for (let i = 0; questions.length < 7 && i < vocab.length; i++) {
    const word = vocab[i]
    if (!word || usedWords.has(word.word)) continue
    const key = `What does "${word.word}" mean in Spanish?`.toLowerCase()
    if (seenKeys.has(key)) continue
    seenKeys.add(key)
    usedWords.add(word.word)
    questions.push(makeVocabQ(word, seed + 200 + backupCounter, `vocab-backup-${backupCounter}`))
    backupCounter++
  }

  return (
    <TestClient
      questions={questions}
      currentDay={currentDay}
      bestScore={progress?.task5_best_score ?? 0}
    />
  )
}
