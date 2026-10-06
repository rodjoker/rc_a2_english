'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rodcodeImg from '@/app/assets/rodcode_ia.png'

type Message = { role: 'user' | 'assistant'; content: string }

const MD_COMPONENTS: Components = {
  h1: ({ children }) => <h3 className="mt-3 mb-1 text-base font-bold text-slate-900 first:mt-0">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-3 mb-1 text-[15px] font-bold text-slate-900 first:mt-0">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 mb-1 font-semibold text-slate-900 first:mt-0">{children}</h4>,
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  ul: ({ children }) => <ul className="my-1.5 list-disc pl-5 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal pl-5 space-y-0.5">{children}</ol>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-4 border-violet-300 bg-violet-50/60 py-1 pl-3 pr-2 text-slate-700 rounded-r-lg [&>p]:my-0.5">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-slate-200" />,
  code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[13px] text-violet-700">{children}</code>,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[13px] text-slate-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-slate-100">{children}</pre>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 underline">{children}</a>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-slate-200 px-2.5 py-1.5">{children}</td>,
}

const WELCOME: Message = {
  role: 'assistant',
  content: "Hello! I'm RodCode, your English teacher 👋\n\nI can help you with:\n• Grammar (verb tenses, infinitives, modals...)\n• Reading texts in English\n• Interview practice questions\n• Correcting your sentences\n• Vocabulary for tech & work\n\nWhat would you like to practice today?",
}

export default function RodCodeClient() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    // Exclude the hardcoded WELCOME from API history
    const apiHistory = [...messages.slice(1), userMsg]

    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const res = await fetch('/api/rodcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiHistory }),
      })

      if (!res.ok || !res.body) throw new Error('Connection failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') continue
          try {
            const delta = JSON.parse(data).choices[0]?.delta?.content ?? ''
            if (delta) {
              setMessages(prev => {
                const last = { ...prev[prev.length - 1], content: prev[prev.length - 1].content + delta }
                return [...prev.slice(0, -1), last]
              })
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch {
      setMessages(prev => {
        const last = { ...prev[prev.length - 1], content: 'Sorry, I had trouble connecting. Please try again. 🙏' }
        return [...prev.slice(0, -1), last]
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-slate-700 transition-colors text-lg font-medium px-1"
        >
          ←
        </Link>
        <div className="w-10 h-10 rounded-full bg-violet-100 overflow-hidden shrink-0">
          <Image src={rodcodeImg} alt="RodCode" width={40} height={40} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="font-semibold text-slate-900 text-sm leading-tight">RodCode</p>
          <p className="text-xs text-emerald-500 font-medium">● Your English Teacher</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-violet-100 overflow-hidden shrink-0 mt-0.5">
                <Image src={rodcodeImg} alt="RodCode" width={32} height={32} className="w-full h-full object-cover" />
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'whitespace-pre-wrap' : 'break-words'} ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-tr-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
              }`}
            >
              {msg.content === '' && loading && i === messages.length - 1 ? (
                <span className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              ) : msg.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                  {msg.content}
                </ReactMarkdown>
              ) : msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex gap-3 items-end">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKey}
          placeholder="Ask RodCode anything about English..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 overflow-y-auto"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          className="shrink-0 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-violet-700 active:bg-violet-800 transition-colors"
        >
          Send
        </button>
      </div>

    </div>
  )
}
