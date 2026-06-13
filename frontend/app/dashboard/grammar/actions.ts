'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function saveGrammarProgress() {
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
      { user_id: user.id, day_number: currentDay, task3_done: true, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,day_number' }
    )

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
