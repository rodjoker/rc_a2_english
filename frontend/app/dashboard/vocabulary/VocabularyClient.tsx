'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { saveVocabularyProgress } from './actions'

type Word = {
  id: string
  word: string
  pronunciation: string
  translation: string
  example_sentence: string
  is_required: boolean
  word_order: number
}

type Phase = 'card' | 'batch-done' | 'all-done'

const BATCH_SIZE = 5

export default function VocabularyClient({ words, currentDay, initialBatch }: { words: Word[]; currentDay: number; initialBatch: number }) {
  const totalBatches = Math.ceil(words.length / BATCH_SIZE)

  const [batchIndex, setBatchIndex] = useState(initialBatch)
  const [cardIndex, setCardIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('card')
  const [showHint, setShowHint] = useState(false)
  const [userInput, setUserInput] = useState('')
  const [wrongAnswer, setWrongAnswer] = useState(false)
  const [saving, setSaving] = useState(false)
  const [seenWordIds, setSeenWordIds] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const currentWord = words[batchIndex * BATCH_SIZE + cardIndex]
  const totalSeen = batchIndex * BATCH_SIZE + (phase === 'card' ? cardIndex : BATCH_SIZE)

  useEffect(() => {
    if (phase === 'card') inputRef.current?.focus()
  }, [cardIndex, batchIndex, phase])

  function checkAnswer(input: string, translation: string): boolean {
    const norm = (s: string) =>
      s.toLowerCase().trim()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s]/g, '').trim()
    const userNorm = norm(input)
    const options = translation.split(/\s*[\/,]\s*/).map(norm).filter(Boolean)
    return options.some(opt => userNorm === opt)
  }

  function handleNoSe() {
    setShowHint(true)
    setWrongAnswer(false)
    setUserInput('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function advance() {
    if (!showHint && !checkAnswer(userInput, currentWord.translation)) {
      setWrongAnswer(true)
      inputRef.current?.focus()
      return
    }
    setWrongAnswer(false)
    const newIds = [...seenWordIds, currentWord.id]
    setSeenWordIds(newIds)

    if (cardIndex < BATCH_SIZE - 1) {
      setCardIndex(cardIndex + 1)
      setShowHint(false)
      setUserInput('')
    } else {
      setShowHint(false)
      setUserInput('')
      if (batchIndex + 1 >= totalBatches) {
        setPhase('all-done')
      } else {
        setPhase('batch-done')
      }
    }
  }

  function handleNextBatch() {
    setBatchIndex(batchIndex + 1)
    setCardIndex(0)
    setPhase('card')
  }

  async function handleSave() {
    setSaving(true)
    await saveVocabularyProgress(seenWordIds)
  }

  if (phase === 'batch-done') {
    return (
      <BatchDoneScreen
        wordsDone={(batchIndex + 1) * BATCH_SIZE}
        onMore={handleNextBatch}
        onSave={handleSave}
        saving={saving}
      />
    )
  }

  if (phase === 'all-done') {
    return <AllDoneScreen onSave={handleSave} saving={saving} />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-sm font-medium text-slate-700">
            📝 Vocabulary · Day {currentDay}
          </span>
          <span className="text-sm text-slate-400">{totalSeen}/15</span>
        </div>
      </header>

      <div className="h-1.5 bg-slate-100">
        <div
          className="h-full bg-violet-500 transition-all duration-300"
          style={{ width: `${(totalSeen / 15) * 100}%` }}
        />
      </div>

      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
              Set {batchIndex + 1}/{totalBatches} · Word {cardIndex + 1}/{BATCH_SIZE}
            </span>
            <span className="text-xs text-slate-400">
              {currentWord.is_required ? '⭐ Required' : 'Extra'}
            </span>
          </div>

          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              {currentWord.word}
            </h1>
            {currentWord.pronunciation && (
              <p className="mt-2 text-sm text-slate-400">[{currentWord.pronunciation}]</p>
            )}
          </div>

          {currentWord.example_sentence && (
            <p className="mt-5 text-center text-sm italic text-slate-500 leading-relaxed px-2">
              &ldquo;{currentWord.example_sentence}&rdquo;
            </p>
          )}

          <div className="my-6 border-t border-slate-100" />

          {showHint && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-center">
              <p className="text-xs font-medium text-amber-600 mb-1">Translation</p>
              <p className="text-xl font-bold text-amber-900">{currentWord.translation}</p>
              <p className="text-xs text-amber-600 mt-1">Now type it below to continue</p>
            </div>
          )}

          {wrongAnswer && (
            <div className="mb-4 flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
              <span className="text-3xl shrink-0">🙅</span>
              <div>
                <p className="text-sm font-semibold text-rose-700">That&apos;s not the right translation!</p>
                <p className="text-xs text-rose-500 mt-0.5">Give it another try 💪</p>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={e => { setUserInput(e.target.value); setWrongAnswer(false) }}
            onKeyDown={e => { if (e.key === 'Enter' && userInput.trim()) advance() }}
            placeholder="Write the translation here..."
            className={`w-full rounded-xl border bg-slate-50 px-4 py-3.5 text-center text-lg text-slate-800 placeholder-slate-400 outline-none transition-all ${
              wrongAnswer
                ? 'border-rose-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100'
                : 'border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
            }`}
          />

          <div className="mt-4 flex gap-3">
            {!showHint && (
              <button
                onClick={handleNoSe}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
              >
                I don&apos;t know
              </button>
            )}
            <button
              onClick={advance}
              disabled={!userInput.trim()}
              className={`rounded-xl py-3 text-sm font-semibold transition-all ${showHint ? 'flex-1' : 'flex-[2]'} ${
                userInput.trim()
                  ? 'bg-violet-600 text-white hover:bg-violet-700'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function BatchDoneScreen({
  wordsDone,
  onMore,
  onSave,
  saving,
}: {
  wordsDone: number
  onMore: () => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-slate-900">{wordsDone} words done!</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Great work — keep going or save your daily progress.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={onMore}
            className="w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Practice 5 more words
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="w-full rounded-xl border border-slate-200 py-3.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save progress & exit'}
          </button>
        </div>
      </div>
    </div>
  )
}

function AllDoneScreen({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-2xl font-bold text-slate-900">All 15 words learned!</h2>
        <p className="mt-2 text-sm text-slate-500">
          You&apos;ve completed today&apos;s vocabulary session.
        </p>

        <div className="mt-6 rounded-xl bg-violet-50 border border-violet-200 px-4 py-4 text-left">
          <p className="text-xs font-semibold text-violet-700 mb-1">✨ Want to practice more?</p>
          <p className="text-sm text-violet-600 leading-relaxed">
            Chat with <strong>RodCode</strong>, your personal AI instructor — write sentences
            using the words you just learned and get instant feedback.
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-6 w-full rounded-xl bg-violet-600 py-3.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save progress'}
        </button>
      </div>
    </div>
  )
}
