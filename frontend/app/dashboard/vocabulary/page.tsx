import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import VocabularyClient from './VocabularyClient'

export default async function VocabularyPage() {
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
    .select('task1_done')
    .eq('user_id', user.id)
    .eq('day_number', currentDay)
    .single()

  const { data: words } = await supabase
    .from('vocabulary_words')
    .select('id, word, pronunciation, translation, example_sentence, is_required, word_order')
    .eq('day_number', currentDay)
    .order('word_order', { ascending: true })
    .limit(15)

  if (!words || words.length === 0) redirect('/dashboard')

  // How many words already practiced
  const { data: practiced } = await supabase
    .from('user_vocabulary_progress')
    .select('word_id')
    .eq('user_id', user.id)
    .eq('day_number', currentDay)

  const practicedCount = practiced?.length ?? 0

  // Block re-entry only when all 15 words are done
  if (progress?.task1_done && practicedCount >= 15) redirect('/dashboard')

  const initialBatch = Math.min(Math.floor(practicedCount / 5), 2)

  return <VocabularyClient words={words} currentDay={currentDay} initialBatch={initialBatch} />
}
