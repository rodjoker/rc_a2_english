import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GrammarClient from './GrammarClient'

export default async function GrammarPage() {
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
    .select('task3_done')
    .eq('user_id', user.id)
    .eq('day_number', currentDay)
    .single()

  if (progress?.task3_done) redirect('/dashboard')

  const { data: lesson } = await supabase
    .from('grammar_lessons')
    .select('id, unit_number, title, explanation, grammar_table, examples, exercises')
    .eq('day_number', currentDay)
    .single()

  if (!lesson) redirect('/dashboard')

  return <GrammarClient lesson={lesson} currentDay={currentDay} />
}
