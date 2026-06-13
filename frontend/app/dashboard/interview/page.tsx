import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InterviewClient from './InterviewClient'

export default async function InterviewPage() {
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
    .select('task4_done')
    .eq('user_id', user.id)
    .eq('day_number', currentDay)
    .single()

  if (progress?.task4_done) redirect('/dashboard')

  const { data: questions } = await supabase
    .from('interview_questions')
    .select('id, question_order, question_en, category, tips')
    .eq('day_number', currentDay)
    .order('question_order')

  if (!questions || questions.length === 0) redirect('/dashboard')

  return <InterviewClient questions={questions} currentDay={currentDay} />
}
