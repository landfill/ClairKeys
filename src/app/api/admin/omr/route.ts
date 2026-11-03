import { NextResponse } from 'next/server'
import { operatorAccess } from '@/lib/auth/operator'
import { readMonitorReport } from '@/lib/omr/monitorProbe'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const headers = { 'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie' }
  const access = await operatorAccess()
  if (!access.allowed) return NextResponse.json({ error: 'access_denied' }, { status: access.authenticated ? 403 : 401, headers })
  return NextResponse.json(await readMonitorReport(), { headers })
}
