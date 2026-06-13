'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { saveReadingProgress } from './actions'

type Hint = { word: string; translation: string }
type Question = { q: string; options: string[]; correct: number }
type Reading = {
  id: string
  title: string
  content: string
  hints: Hint[]
  questions: Question[]
  estimated_minutes: number
}

type Phase = 'reading' | 'questions' | 'saving'

export default function ReadingClient({ reading, currentDay }: { reading: Reading; currentDay: number }) {
  const [phase, setPhase] = useState<Phase>('reading')
  const [hintsClicked, setHintsClicked] = useState<string[]>([])
  const [activeHint, setActiveHint] = useState<Hint | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const hints: Hint[] = reading.hints ?? []
  const questions: Question[] = reading.questions ?? []

  // Build tokenized segments with hints highlighted (longest match first)
  const segments = useCallback(() => {
    const sorted = [...hints].sort((a, b) => b.word.length - a.word.length)
    type Seg = { text: string; hint: Hint | null }
    let parts: Seg[] = [{ text: reading.content, hint: null }]

    for (const hint of sorted) {
      const next: Seg[] = []
      for (const seg of parts) {
        if (seg.hint !== null) { next.push(seg); continue }
        const regex = new RegExp(`(${hint.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        const split = seg.text.split(regex)
        for (const chunk of split) {
          if (chunk.toLowerCase() === hint.word.toLowerCase()) {
            next.push({ text: chunk, hint })
          } else if (chunk) {
            next.push({ text: chunk, hint: null })
          }
        }
      }
      parts = next
    }
    return parts
  }, [reading.content, hints])

  function handleHintClick(hint: Hint) {
    setActiveHint(hint)
    if (!hintsClicked.includes(hint.word)) {
      setHintsClicked(prev => [...prev, hint.word])
    }
  }

  function handleSelect(idx: number) {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
  }

  function handleNext() {
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex(questionIndex + 1)
      setSelected(null)
      setRevealed(false)
    } else {
      setPhase('saving')
      saveReadingProgress(reading.id, hintsClicked)
    }
  }

  const currentQ = questions[questionIndex]

  if (phase === 'saving') {
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
    <div className="min-h-screen bg-slate-50" onClick={() => setActiveHint(null)}>
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 sticky top-0 z-10">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 transition-colors" onClick={e => e.stopPropagation()}>
            ← Dashboard
          </Link>
          <span className="text-sm font-medium text-slate-700">
            📖 Reading · Day {currentDay}
          </span>
          <span className="text-sm text-slate-400">
            {phase === 'reading' ? `~${reading.estimated_minutes} min` : `Q${questionIndex + 1}/${questions.length}`}
          </span>
        </div>
      </header>

      {/* Phase indicator */}
      <div className="border-b border-slate-100 bg-white">
        <div className="mx-auto max-w-2xl flex">
          <div className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${phase === 'reading' ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-400'}`}>
            1 · Read
          </div>
          <div className={`flex-1 py-2.5 text-center text-xs font-medium transition-colors ${phase === 'questions' ? 'text-sky-600 border-b-2 border-sky-500' : 'text-slate-400'}`}>
            2 · Comprehension
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-2xl px-4 py-6 pb-40">
        {phase === 'reading' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">{reading.title}</h1>
              <p className="mt-1 text-xs text-sky-600 font-medium uppercase tracking-wide">
                Click highlighted words to see their translation
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 leading-relaxed text-slate-700 text-[15px] space-y-4">
              <RenderedContent segments={segments()} onHintClick={handleHintClick} />
            </div>

            {hints.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {hints.map(h => (
                  <button
                    key={h.word}
                    onClick={e => { e.stopPropagation(); handleHintClick(h) }}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      hintsClicked.includes(h.word)
                        ? 'border-sky-300 bg-sky-50 text-sky-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-600'
                    }`}
                  >
                    {h.word}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={e => { e.stopPropagation(); setPhase('questions') }}
              className="mt-6 w-full rounded-xl bg-sky-600 py-4 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
            >
              I&apos;ve finished reading →
            </button>
          </>
        )}

        {phase === 'questions' && currentQ && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="mb-6">
              <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2.5 py-1 rounded-full">
                Question {questionIndex + 1} of {questions.length}
              </span>
              <p className="mt-4 text-lg font-semibold text-slate-900 leading-snug">
                {currentQ.q}
              </p>
            </div>

            <div className="space-y-3">
              {currentQ.options.map((opt, idx) => {
                let style = 'border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50'
                if (revealed) {
                  if (idx === currentQ.correct) {
                    style = 'border-emerald-400 bg-emerald-50 text-emerald-800 font-medium'
                  } else if (idx === selected) {
                    style = 'border-rose-300 bg-rose-50 text-rose-700'
                  } else {
                    style = 'border-slate-200 bg-white text-slate-400'
                  }
                } else if (selected === idx) {
                  style = 'border-sky-400 bg-sky-50 text-sky-800'
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(idx)}
                    disabled={revealed}
                    className={`w-full rounded-xl border px-4 py-3.5 text-left text-sm transition-all ${style}`}
                  >
                    <span className="font-medium mr-2 text-slate-400">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </button>
                )
              })}
            </div>

            {revealed && (
              <div className="mt-4">
                {selected === currentQ.correct ? (
                  <p className="text-center text-sm font-medium text-emerald-600">✓ Correct!</p>
                ) : (
                  <p className="text-center text-sm text-slate-500">
                    The correct answer is <strong className="text-emerald-700">{currentQ.options[currentQ.correct]}</strong>
                  </p>
                )}
                <button
                  onClick={handleNext}
                  className="mt-4 w-full rounded-xl bg-sky-600 py-3.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors"
                >
                  {questionIndex + 1 < questions.length ? 'Next question →' : 'Complete & save'}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Word translation popup */}
      {activeHint && (
        <div
          className="fixed bottom-6 left-4 right-4 mx-auto max-w-md rounded-2xl bg-slate-900 shadow-2xl px-5 py-4 z-50"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-sky-400 mb-0.5">Translation</p>
              <p className="text-xl font-bold text-white">{activeHint.word}</p>
              <p className="text-base text-slate-300 mt-0.5">{activeHint.translation}</p>
            </div>
            <button
              onClick={() => setActiveHint(null)}
              className="ml-4 shrink-0 w-8 h-8 rounded-full bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

type Seg = { text: string; hint: { word: string; translation: string } | null }

function RenderedContent({ segments, onHintClick }: { segments: Seg[]; onHintClick: (h: { word: string; translation: string }) => void }) {
  // Split segments by paragraph boundaries (\n\n) and render
  const fullText = segments.map(s => s.text).join('')
  const paragraphs = fullText.split('\n\n')

  // Re-apply hint mapping per character offset
  let offset = 0
  const segsByOffset: Array<{ start: number; end: number; hint: Seg['hint'] }> = []
  for (const seg of segments) {
    segsByOffset.push({ start: offset, end: offset + seg.text.length, hint: seg.hint })
    offset += seg.text.length
  }

  let paraOffset = 0
  return (
    <>
      {paragraphs.map((para, pi) => {
        const paraStart = paraOffset
        const paraEnd = paraOffset + para.length
        paraOffset += para.length + 2 // +2 for \n\n

        // Get segments that intersect this paragraph
        const paraSegs: Seg[] = []
        for (const s of segsByOffset) {
          if (s.end <= paraStart || s.start >= paraEnd) continue
          const start = Math.max(s.start, paraStart) - paraStart
          const end = Math.min(s.end, paraEnd) - paraStart
          paraSegs.push({ text: para.slice(start, end), hint: s.hint })
        }

        return (
          <p key={pi}>
            {paraSegs.map((seg, si) =>
              seg.hint ? (
                <button
                  key={si}
                  onClick={e => { e.stopPropagation(); onHintClick(seg.hint!) }}
                  className="font-semibold text-sky-600 underline decoration-dotted underline-offset-2 hover:text-sky-800 transition-colors"
                >
                  {seg.text}
                </button>
              ) : (
                <span key={si}>{seg.text}</span>
              )
            )}
          </p>
        )
      })}
    </>
  )
}
