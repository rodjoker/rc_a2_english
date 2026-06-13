'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveVocabularyProgress(wordIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lp } = await supabase
    .from('user_learning_profiles')
    .select('current_day')
    .eq('user_id', user.id)
    .single()

  const currentDay = lp?.current_day ?? 1

  await supabase
    .from('user_daily_progress')
    .upsert(
      { user_id: user.id, day_number: currentDay, task1_done: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,day_number' }
    )

  if (wordIds.length > 0) {
    const now = new Date().toISOString()
    await supabase
      .from('user_vocabulary_progress')
      .upsert(
        wordIds.map(wordId => ({
          user_id: user.id,
          word_id: wordId,
          day_number: currentDay,
          total_attempts: 1,
          last_practiced_at: now,
        })),
        { onConflict: 'user_id,word_id,day_number' }
      )
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
