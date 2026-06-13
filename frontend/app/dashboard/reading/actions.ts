'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveReadingProgress(readingId: string, hintsClicked: string[]) {
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
      { user_id: user.id, day_number: currentDay, task2_done: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,day_number' }
    )

  await supabase
    .from('user_reading_progress')
    .upsert(
      {
        user_id: user.id,
        reading_id: readingId,
        hints_clicked: hintsClicked,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,reading_id' }
    )

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
