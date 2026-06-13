'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveTestResult(score: number, answers: object[]) {
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
    .select('task5_best_score')
    .eq('user_id', user.id)
    .eq('day_number', currentDay)
    .single()

  const prevBest = progress?.task5_best_score ?? 0
  const newBest  = Math.max(prevBest, score)
  const passed   = score >= 70

  await supabase.from('user_test_attempts').insert({
    user_id:    user.id,
    day_number: currentDay,
    test_type:  'daily',
    score,
    answers,
  })

  await supabase.from('user_daily_progress').upsert(
    {
      user_id:          user.id,
      day_number:       currentDay,
      task5_best_score: newBest,
      task5_done:       passed,
      updated_at:       new Date().toISOString(),
    },
    { onConflict: 'user_id,day_number' }
  )

  revalidatePath('/dashboard')

  if (passed) redirect('/dashboard')
  // If not passed: return without redirect — client handles retry UI
}
