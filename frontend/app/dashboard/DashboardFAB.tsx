'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import rodcodeImg from '@/app/assets/rodcode_ia.png'

export default function DashboardFAB() {
  const pathname = usePathname()
  if (pathname === '/dashboard/rodcode') return null

  return (
    <Link href="/dashboard/rodcode" className="fixed top-[68px] right-5 z-50 flex flex-col items-center gap-1">
      <div className="w-14 h-14 rounded-full overflow-hidden shadow-xl ring-2 ring-violet-400 ring-offset-2 bg-violet-100 hover:scale-105 hover:ring-violet-500 transition-all">
        <Image src={rodcodeImg} alt="RodCode" width={56} height={56} className="w-full h-full object-cover" />
      </div>
      <span className="text-[11px] font-semibold text-violet-700 bg-white/90 rounded-full px-2 py-0.5 shadow border border-violet-200">
        RodCode
      </span>
    </Link>
  )
}
