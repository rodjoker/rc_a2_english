import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RodCodeClient from './RodCodeClient'

export default async function RodCodePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return <RodCodeClient />
}
