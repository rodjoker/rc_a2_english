'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { saveTestResult } from './actions'
import type { TestQuestion } from './types'

const SOURCE_LABEL: Record<string, string> = {
  vocabulary: '📝 Vocabulary',
  reading:    '📖 Reading',
  grammar:    '📐 Grammar',
  interview:  '🎤 Interview',
}

const SOURCE_COLOR: Record<string, string> = {
  vocabulary: 'text-violet-600 bg-violet-50',
  reading:    'text-sky-600 bg-sky-50',
  grammar:    'text-emerald-600 bg-emerald-50',
  interview:  'text-amber-600 bg-amber-50',
}

function norm(s: string) {
  return s.toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim()
}

type Answer = { questionId: string; userAnswer: string | number; correct: boolean }

export default function TestClient({
  questions,
  currentDay,
  bestScore,
}: {
  questions: TestQuestion[]
  currentDay: number
  bestScore: number
}) {
  const [qIndex,   setQIndex]   = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [input,    setInput]    = useState('')
  const [revealed, setRevealed] = useState(false)
  const [answers,  setAnswers]  = useState<Answer[]>([])
  const [phase,    setPhase]    = useState<'quiz' | 'results'>('quiz')
  const [saving,   setSaving]   = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const current = questions[qIndex]
  const isLast  = qIndex === questions.length - 1

  useEffect(() => {
    if (current?.type === 'fill' && !revealed) inputRef.current?.focus()
  }, [qIndex, revealed, current?.type])

  function handleSelectMCQ(idx: number) {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
  }

  function handleCheckFill() {
    if (!input.trim() || current?.type !== 'fill') return
    setRevealed(true)
  }

  function recordAndAdvance() {
    if (!current) return
    let correct = false
    let userAnswer: string | number = ''

    if (current.type === 'mcq') {
      correct    = selected === current.correct
      userAnswer = selected ?? -1
    } else {
      correct    = norm(input) === norm(current.answer)
      userAnswer = input
    }

    const newAnswers = [...answers, { questionId: current.id, userAnswer, correct }]
    setAnswers(newAnswers)

    if (isLast) {
      setPhase('results')
    } else {
      setQIndex(qIndex + 1)
      setSelected(null)
      setInput('')
      setRevealed(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    const correctCount = answers.filter(a => a.correct).length
    const score = Math.round((correctCount / questions.length) * 100)
    await saveTestResult(score, answers)
    // Reaches here only if NOT passed (server didn't redirect)
    setSaving(false)
  }

  function handleRetry() {
    setQIndex(0)
    setSelected(null)
    setInput('')
    setRevealed(false)
    setAnswers([])
    setPhase('quiz')
  }

  // ── RESULTS SCREEN ──
  if (phase === 'results') {
    const correctCount = answers.filter(a => a.correct).length
    const score        = Math.round((correctCount / questions.length) * 100)
    const passed       = score >= 70

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <div className="text-5xl mb-3">{passed ? '🏆' : '💪'}</div>
          <h2 className="text-2xl font-bold text-slate-900">
            {correctCount}/{questions.length} correct
          </h2>
          <div className={`mt-2 text-4xl font-extrabold ${passed ? 'text-emerald-600' : 'text-rose-500'}`}>
            {score}%
          </div>
          <p className={`mt-1 text-sm ${passed ? 'text-emerald-600' : 'text-slate-500'}`}>
            {passed ? 'You passed! Great work.' : `You need 70% to pass. Best so far: ${Math.max(bestScore, score)}%`}
          </p>

          {/* Answer summary */}
          <div className="mt-5 text-left space-y-1">
            {answers.map((a, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${a.correct ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
                <span>{a.correct ? '✓' : '✗'}</span>
                <span className="font-medium">{SOURCE_LABEL[questions[i]?.source] ?? 'Q'}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {passed ? (
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Complete ✓'}
              </button>
            ) : (
              <>
                <button
                  onClick={handleRetry}
                  className="w-full rounded-xl bg-slate-800 py-3.5 text-sm font-semibold text-white hover:bg-slate-900 transition-colors"
                >
                  Try again
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-xl border border-slate-200 py-3.5 text-sm text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save score & exit'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!current) return null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-sm font-medium text-slate-700">
            🧪 Daily Test · Day {currentDay}
          </span>
          <span className="text-sm text-slate-400">{qIndex + 1}/{questions.length}</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="flex">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1.5 transition-colors ${
              i < qIndex ? 'bg-slate-700'
              : i === qIndex ? 'bg-slate-400'
              : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      <main className="mx-auto max-w-xl px-4 py-6 space-y-4">

        {/* Source badge */}
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SOURCE_COLOR[current.source]}`}>
          {SOURCE_LABEL[current.source]}
        </span>

        {/* Question card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          {current.type === 'mcq' && (
            <>
              {current.context && (
                <p className="mb-4 text-sm italic text-slate-500 border-l-2 border-slate-200 pl-3 leading-relaxed">
                  &ldquo;{current.context}&rdquo;
                </p>
              )}
              <p className="text-lg font-semibold text-slate-900 leading-snug mb-5">{current.prompt}</p>

              <div className="space-y-3">
                {current.options.map((opt, idx) => {
                  let style = 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  if (revealed) {
                    if (idx === current.correct) style = 'border-emerald-400 bg-emerald-50 text-emerald-800 font-medium'
                    else if (idx === selected)   style = 'border-rose-300 bg-rose-50 text-rose-700'
                    else                         style = 'border-slate-200 bg-white text-slate-400'
                  } else if (selected === idx) {
                    style = 'border-slate-600 bg-slate-50 text-slate-800'
                  }
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectMCQ(idx)}
                      disabled={revealed}
                      className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${style}`}
                    >
                      <span className="font-medium mr-2 text-slate-400">{String.fromCharCode(65 + idx)}.</span>
                      {opt}
                    </button>
                  )
                })}
              </div>

              {revealed && (
                <div className="mt-4">
                  {selected === current.correct
                    ? <p className="text-center text-sm font-medium text-emerald-600">✓ Correct!</p>
                    : <p className="text-center text-sm text-slate-500">The correct answer is <strong className="text-emerald-700">{current.options[current.correct]}</strong></p>
                  }
                </div>
              )}
            </>
          )}

          {current.type === 'fill' && (
            <>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Fill in the blank</p>
              <p className="text-lg text-slate-800 font-medium mb-5 leading-relaxed">
                {current.sentence.split('_____').map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && (
                      <span className={`inline-block min-w-[80px] border-b-2 mx-1 text-center transition-colors ${
                        revealed
                          ? norm(input) === norm(current.answer) ? 'border-emerald-400 text-emerald-700' : 'border-rose-400 text-rose-600'
                          : 'border-slate-400 text-slate-400'
                      } font-bold`}>
                        {revealed ? current.answer : '     '}
                      </span>
                    )}
                  </span>
                ))}
              </p>

              {!revealed && (
                <>
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleCheckFill() }}
                    placeholder="Type the missing word..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg text-slate-800 placeholder-slate-400 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
                  />
                  <button
                    onClick={handleCheckFill}
                    disabled={!input.trim()}
                    className={`mt-3 w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                      input.trim() ? 'bg-slate-800 text-white hover:bg-slate-900' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Check
                  </button>
                </>
              )}

              {revealed && (
                <div className={`mt-2 text-center text-sm font-medium ${norm(input) === norm(current.answer) ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {norm(input) === norm(current.answer) ? '✓ Correct!' : `✗ The answer is "${current.answer}"`}
                </div>
              )}
            </>
          )}
        </div>

        {/* Next button */}
        {revealed && (
          <button
            onClick={recordAndAdvance}
            className="w-full rounded-xl bg-slate-800 py-4 text-sm font-semibold text-white hover:bg-slate-900 transition-colors"
          >
            {isLast ? 'See results →' : 'Next question →'}
          </button>
        )}
      </main>
    </div>
  )
}
