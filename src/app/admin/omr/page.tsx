import { notFound } from 'next/navigation'
import { operatorAccess } from '@/lib/auth/operator'
import OmrMonitor from '@/components/admin/OmrMonitor'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = { title: 'OMR 모니터링 | ClairKeys', robots: { index: false, follow: false } }

export default async function OmrMonitorPage() {
  if (!(await operatorAccess()).allowed) notFound()
  return <OmrMonitor />
}
