import DashboardFAB from './DashboardFAB'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DashboardFAB />
    </>
  )
}
