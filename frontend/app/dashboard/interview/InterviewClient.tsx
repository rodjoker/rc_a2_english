'use client'

import { useState } from 'react'
import Link from 'next/link'
import { saveInterviewProgress } from './actions'

type Question = {
  id: string
  question_order: number
  question_en: string
  category: string
  tips: string[]
}

const CATEGORY_LABELS: Record<string, string> = {
  introduction: 'Introduction',
  experience:   'Experience',
  technical:    'Technical',
  behavioral:   'Behavioral',
  teamwork:     'Teamwork',
  motivation:   'Motivation',
  soft_skills:  'Soft Skills',
  programming:  'Programming',
  closing:      'Closing',
}

const CATEGORY_COLORS: Record<string, string> = {
  introduction: 'bg-blue-50 text-blue-700 border-blue-200',
  experience:   'bg-violet-50 text-violet-700 border-violet-200',
  technical:    'bg-orange-50 text-orange-700 border-orange-200',
  behavioral:   'bg-rose-50 text-rose-700 border-rose-200',
  teamwork:     'bg-teal-50 text-teal-700 border-teal-200',
  motivation:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  soft_skills:  'bg-pink-50 text-pink-700 border-pink-200',
  programming:  'bg-indigo-50 text-indigo-700 border-indigo-200',
  closing:      'bg-slate-50 text-slate-700 border-slate-200',
}

export default function InterviewClient({ questions, currentDay }: { questions: Question[]; currentDay: number }) {
  const [qIndex, setQIndex]       = useState(0)
  const [answer, setAnswer]       = useState('')
  const [saving, setSaving]       = useState(false)

  const current  = questions[qIndex]
  const isLast   = qIndex === questions.length - 1
  const tips     = current?.tips ?? []
  const catColor = CATEGORY_COLORS[current?.category] ?? CATEGORY_COLORS.closing
  const catLabel = CATEGORY_LABELS[current?.category] ?? current?.category

  function handleNext() {
    if (isLast) {
      setSaving(true)
      saveInterviewProgress()
    } else {
      setQIndex(qIndex + 1)
      setAnswer('')
    }
  }

  if (saving) {
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
            🎤 Interview · Day {currentDay}
          </span>
          <span className="text-sm text-slate-400">
            {qIndex + 1}/{questions.length}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div className="flex mx-0">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 transition-colors ${i <= qIndex ? 'bg-amber-500' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      <main className="mx-auto max-w-xl px-4 py-6 space-y-4">

        {/* Category badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold border px-2.5 py-1 rounded-full ${catColor}`}>
            {catLabel}
          </span>
          <span className="text-xs text-slate-400">Question {qIndex + 1} of {questions.length}</span>
        </div>

        {/* Question card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <p className="text-2xl font-bold text-slate-900 leading-snug">
            {current.question_en}
          </p>
        </div>

        {/* How to answer */}
        {tips.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-3">
              💡 How to answer this
            </h2>
            <ul className="space-y-2">
              {tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm text-amber-900 leading-relaxed">
                  <span className="shrink-0 font-bold text-amber-500">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Practice textarea */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            ✍️ Practice your answer
          </label>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Write your answer in English here. Don't worry about mistakes — this is practice."
            rows={5}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none"
          />
          <p className="mt-2 text-xs text-slate-400">
            Your answer is not evaluated — just write freely in English.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={handleNext}
          className="w-full rounded-xl bg-amber-500 py-4 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          {isLast ? 'Done practicing ✓' : 'Next question →'}
        </button>

      </main>
    </div>
  )
}
