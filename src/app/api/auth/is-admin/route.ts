import { operatorAccess } from '@/lib/auth/operator'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({ isAdmin: (await operatorAccess()).allowed }, {
      headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' },
    })
  } catch {
    console.error('Error checking admin status')
    return NextResponse.json({ isAdmin: false }, { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } })
  }
}
