import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import rodcodeImg from '@/app/assets/rodcode_ia.png'
import bannerImg from '@/app/assets/banner_english_app.png'

async function logout() {
  'use server'
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

const TASKS = [
  {
    key: 'task1_done' as const,
    number: 1,
    label: 'Vocabulary',
    description: '15 words — flashcards + writing practice',
    icon: '📝',
    href: '/dashboard/vocabulary',
    color: 'violet',
  },
  {
    key: 'task2_done' as const,
    number: 2,
    label: 'Reading',
    description: '~5 min — tech text in English',
    icon: '📖',
    href: '/dashboard/reading',
    color: 'sky',
  },
  {
    key: 'task3_done' as const,
    number: 3,
    label: 'Grammar',
    description: 'Lesson + mini exercises',
    icon: '✏️',
    href: '/dashboard/grammar',
    color: 'amber',
  },
  {
    key: 'task4_done' as const,
    number: 4,
    label: 'Interview Q&A',
    description: '2 questions — practice your answers',
    icon: '💬',
    href: '/dashboard/interview',
    color: 'rose',
  },
  {
    key: 'task5_done' as const,
    number: 5,
    label: 'Daily Test',
    description: 'Min 70/100 to pass',
    icon: '🎯',
    href: '/dashboard/test',
    color: 'emerald',
  },
] as const

type DailyProgress = {
  task1_done: boolean
  task2_done: boolean
  task3_done: boolean
  task4_done: boolean
  task5_done: boolean
  task5_best_score: number
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', user.id)
    .single()

  // Learning profile — create if first time
  let { data: lp } = await supabase
    .from('user_learning_profiles')
    .select('current_day, streak, longest_streak')
    .eq('user_id', user.id)
    .single()

  if (!lp) {
    const { data: created } = await supabase
      .from('user_learning_profiles')
      .insert({ user_id: user.id })
      .select('current_day, streak, longest_streak')
      .single()
    lp = created
  }

  let currentDay = lp?.current_day ?? 1
  let streak     = lp?.streak ?? 0

  // Today's task progress
  let { data: progress } = await supabase
    .from('user_daily_progress')
    .select('task1_done, task2_done, task3_done, task4_done, task5_done, task5_best_score, completed_at')
    .eq('user_id', user.id)
    .eq('day_number', currentDay)
    .single() as { data: (DailyProgress & { completed_at: string | null }) | null }

  // Auto-advance day when all 5 tasks complete (gated by completed_at to run only once)
  const tasksCompleted = TASKS.filter(t => progress?.[t.key]).length
  if (tasksCompleted === 5 && !progress?.completed_at) {
    const newStreak = streak + 1
    const newDay    = Math.min(currentDay + 1, 60)
    await Promise.all([
      supabase
        .from('user_daily_progress')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('day_number', currentDay),
      supabase
        .from('user_learning_profiles')
        .update({
          current_day:     newDay,
          streak:          newStreak,
          longest_streak:  Math.max(lp?.longest_streak ?? 0, newStreak),
        })
        .eq('user_id', user.id),
    ])
    currentDay = newDay
    streak     = newStreak
    progress   = null   // new day — tasks all incomplete
  }

  // Create progress row for new day if missing
  if (!progress) {
    const { data: created } = await supabase
      .from('user_daily_progress')
      .insert({ user_id: user.id, day_number: currentDay })
      .select('task1_done, task2_done, task3_done, task4_done, task5_done, task5_best_score, completed_at')
      .single()
    progress = created as (DailyProgress & { completed_at: string | null }) | null
  }

  const doneTasks   = TASKS.filter(t => progress?.[t.key]).length
  const allDone     = doneTasks === 5
  const daysLeft    = 60 - currentDay + 1
  const progressPct = Math.round(((currentDay - 1) / 60) * 100)

  const { count: wordsSeen } = await supabase
    .from('user_vocabulary_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const displayName = profile?.full_name?.split(' ')[0] ?? profile?.email?.split('@')[0] ?? 'there'

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}
      <header className="relative border-b border-violet-200 bg-white h-20 md:h-36">
        <Image
          src={bannerImg}
          alt="English Journey"
          fill
          className="object-contain object-center"
          priority
        />
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
        {/* Nav content */}
        <div className="absolute inset-0 z-10 flex items-center px-6">
          <div className="mx-auto w-full max-w-2xl flex items-center justify-between">
            <span className="font-semibold text-white drop-shadow">English Journey</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-xs font-semibold text-white bg-black/30 hover:bg-black/50 transition-colors px-3 py-1 rounded-full"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 py-8 space-y-6">

        {/* Greeting + Day info */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6">
          <p className="text-sm text-slate-500">Good day,</p>
          <h1 className="mt-0.5 text-2xl font-bold text-slate-900">
            {displayName} 👋
          </h1>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <span className="text-4xl font-extrabold text-violet-600">Day {currentDay}</span>
              <span className="ml-2 text-slate-400 text-lg font-medium">/ 60</span>
            </div>
            <div className="text-right">
              {streak > 0 && (
                <p className="text-sm font-semibold text-amber-500">
                  🔥 {streak} day streak
                </p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">{daysLeft} days left</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
              <span>Overall progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Today's tasks */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">
              Today&apos;s tasks
            </h2>
            <span className="text-sm text-slate-500">
              {doneTasks}/5 done
            </span>
          </div>

          {allDone && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-medium text-emerald-700 flex items-center gap-2">
              <span>🎉</span>
              All tasks complete for today. Great work!
            </div>
          )}

          <div className="space-y-3">
            {TASKS.map((task) => {
              const done = progress?.[task.key] ?? false
              return (
                <Link
                  key={task.key}
                  href={task.href}
                  className={`flex items-center gap-4 rounded-xl border bg-white px-5 py-4 transition-all hover:shadow-sm ${
                    done
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Status indicator */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      done
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {done ? '✓' : task.number}
                  </div>

                  {/* Icon + info */}
                  <span className="text-2xl">{task.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${done ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {task.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {task.description}
                    </p>
                  </div>

                  {/* Arrow or score */}
                  {task.key === 'task5_done' && done && (progress?.task5_best_score ?? 0) > 0 ? (
                    <span className="shrink-0 text-xs font-bold text-emerald-600">
                      {progress?.task5_best_score}/100
                    </span>
                  ) : (
                    <span className={`shrink-0 text-slate-300 ${done ? 'text-emerald-300' : ''}`}>
                      →
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* RodCode AI */}
        <Link href="/dashboard/rodcode">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex items-center gap-4 hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm cursor-pointer">
            <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 ring-2 ring-white/30 bg-white/10">
              <Image src={rodcodeImg} alt="RodCode" width={56} height={56} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-violet-200 text-xs font-medium">AI English Teacher</p>
              <p className="text-white font-bold text-base">RodCode</p>
              <p className="text-violet-200 text-xs mt-0.5">Ask me anything about English →</p>
            </div>
            <span className="shrink-0 text-2xl">🎓</span>
          </div>
        </Link>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{currentDay - 1}</p>
            <p className="text-xs text-slate-400 mt-0.5">Days done</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-center">
            <p className="text-2xl font-bold text-amber-500">{streak}</p>
            <p className="text-xs text-slate-400 mt-0.5">Streak</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-center">
            <p className="text-2xl font-bold text-violet-600">{wordsSeen ?? 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">Words seen</p>
          </div>
        </div>

      </main>
    </div>
  )
}
