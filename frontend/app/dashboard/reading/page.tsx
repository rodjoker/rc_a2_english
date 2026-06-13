import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ReadingClient from './ReadingClient'

export default async function ReadingPage() {
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
    .select('task2_done')
    .eq('user_id', user.id)
    .eq('day_number', currentDay)
    .single()

  if (progress?.task2_done) redirect('/dashboard')

  const { data: text } = await supabase
    .from('reading_texts')
    .select('id, title, content, hints, questions, estimated_minutes')
    .eq('day_number', currentDay)
    .single()

  if (!text) redirect('/dashboard')

  return <ReadingClient reading={text} currentDay={currentDay} />
}
