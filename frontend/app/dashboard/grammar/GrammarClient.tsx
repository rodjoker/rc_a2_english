'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { saveGrammarProgress } from './actions'

type Example  = { en: string }
type Exercise = { sentence: string; blank_index: number; answer: string; hint: string }
type GrammarTable = { points: string[]; pro_tip: string }
type Lesson = {
  id: string
  unit_number: number
  title: string
  explanation: string
  grammar_table: GrammarTable
  examples: Example[]
  exercises: Exercise[]
}

type Phase = 'lesson' | 'exercises' | 'saving'
type ExState = 'idle' | 'correct' | 'wrong'

const UNIT_NAMES: Record<number, string> = {
  1: 'Present Tenses',
  2: 'Past Tenses',
  3: 'Future Forms',
  4: 'Questions & Negatives',
  5: 'Modals & Obligations',
  6: 'Comparatives & Superlatives',
  7: 'Connectors & Linking',
  8: 'Review & Advanced A2',
  9: 'Interview Grammar Focus',
}

function norm(s: string) {
  return s.toLowerCase().trim().replace(/[.,!?;:'"]/g, '')
}

export default function GrammarClient({ lesson, currentDay }: { lesson: Lesson; currentDay: number }) {
  const [phase, setPhase]   = useState<Phase>('lesson')
  const [exIdx, setExIdx]   = useState(0)
  const [input, setInput]   = useState('')
  const [exState, setExState] = useState<ExState>('idle')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const exercises = lesson.exercises ?? []
  const currentEx = exercises[exIdx]
  const isLast    = exIdx === exercises.length - 1

  useEffect(() => {
    if (phase === 'exercises' && exState === 'idle') {
      inputRef.current?.focus()
    }
  }, [phase, exIdx, exState])

  function checkAnswer() {
    if (!input.trim()) return
    if (norm(input) === norm(currentEx.answer)) {
      setExState('correct')
    } else {
      setExState('wrong')
    }
  }

  function handleNext() {
    if (isLast) {
      setSaving(true)
      saveGrammarProgress()
    } else {
      setExIdx(exIdx + 1)
      setInput('')
      setExState('idle')
    }
  }

  if (phase === 'saving' || saving) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💾</div>
          <p className="text-slate-600">Saving your progress...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-sm font-medium text-slate-700">
            📐 Grammar · Day {currentDay}
          </span>
          <span className="text-sm text-slate-400">
            {phase === 'lesson' ? `Unit ${lesson.unit_number}` : `Ex ${exIdx + 1}/${exercises.length}`}
          </span>
        </div>
      </header>

      {/* Progress tabs */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-xl flex">
          <div className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${phase === 'lesson' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-400'}`}>
            1 · Lesson
          </div>
          <div className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${phase === 'exercises' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-slate-400'}`}>
            2 · Practice
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-xl px-4 py-6">

        {/* ── LESSON PHASE ── */}
        {phase === 'lesson' && (
          <div className="space-y-4">
            {/* Title card */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Unit {lesson.unit_number} · {UNIT_NAMES[lesson.unit_number] ?? ''}
              </span>
              <h1 className="mt-3 text-2xl font-bold text-slate-900">{lesson.title}</h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">{lesson.explanation}</p>
            </div>

            {/* Structure */}
            {lesson.grammar_table?.points?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Structure</h2>
                <ul className="space-y-2">
                  {lesson.grammar_table.points.map((pt, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="shrink-0 text-emerald-500 font-bold">▸</span>
                      <span className="font-mono text-[13px] leading-relaxed">{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Examples */}
            {lesson.examples?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Examples</h2>
                <ul className="space-y-2">
                  {lesson.examples.map((ex, i) => (
                    <li key={i} className="flex gap-2 text-sm text-slate-700">
                      <span className="shrink-0 text-slate-300">•</span>
                      <span className="italic">{ex.en}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pro tip */}
            {lesson.grammar_table?.pro_tip && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">💡 Interview tip</p>
                <p className="text-sm text-amber-800 leading-relaxed">{lesson.grammar_table.pro_tip}</p>
              </div>
            )}

            {exercises.length > 0 ? (
              <button
                onClick={() => setPhase('exercises')}
                className="w-full rounded-xl bg-emerald-600 py-4 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Practice exercises →
              </button>
            ) : (
              <button
                onClick={() => { setSaving(true); saveGrammarProgress() }}
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 py-4 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete lesson ✓'}
              </button>
            )}
          </div>
        )}

        {/* ── EXERCISES PHASE ── */}
        {phase === 'exercises' && currentEx && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="mb-6">
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                Exercise {exIdx + 1} of {exercises.length}
              </span>

              {/* Progress dots */}
              <div className="flex gap-2 mt-4">
                {exercises.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i < exIdx ? 'bg-emerald-400'
                      : i === exIdx ? 'bg-emerald-600'
                      : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Fill in the blank
            </p>

            {/* Sentence with blank highlighted */}
            <p className="text-lg text-slate-800 leading-relaxed mb-6">
              {currentEx.sentence.split('_____').map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 && (
                    <span className={`inline-block min-w-[80px] border-b-2 mx-1 text-center font-bold transition-colors ${
                      exState === 'correct' ? 'border-emerald-400 text-emerald-700'
                      : exState === 'wrong'   ? 'border-rose-400 text-rose-700'
                      : 'border-slate-400 text-slate-400'
                    }`}>
                      {exState !== 'idle' ? currentEx.answer : '      '}
                    </span>
                  )}
                </span>
              ))}
            </p>

            {/* Feedback */}
            {exState === 'correct' && (
              <div className="mb-4 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <span className="text-2xl">✓</span>
                <p className="text-sm font-semibold text-emerald-700">Correct!</p>
              </div>
            )}
            {exState === 'wrong' && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3">
                <p className="text-sm font-semibold text-rose-700">
                  Not quite — the answer is <span className="font-bold">{currentEx.answer}</span>
                </p>
              </div>
            )}

            {/* Input */}
            {exState === 'idle' && (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && input.trim()) checkAnswer() }}
                  placeholder="Type the missing word..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-lg text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                />
                <button
                  onClick={checkAnswer}
                  disabled={!input.trim()}
                  className={`mt-3 w-full rounded-xl py-3.5 text-sm font-semibold transition-all ${
                    input.trim()
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Check answer
                </button>
              </>
            )}

            {/* Next / Complete */}
            {exState !== 'idle' && (
              <button
                onClick={handleNext}
                className="mt-3 w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                {isLast ? 'Complete lesson ✓' : 'Next exercise →'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
