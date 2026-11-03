import { getServerSession } from 'next-auth'
import { authOptions } from './config'

export async function operatorAccess() {
  try {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email
    const allowed = Boolean(email && (process.env.ADMIN_EMAILS ?? '')
      .split(',').map(value => value.trim()).filter(Boolean).includes(email))
    return { authenticated: Boolean(email), allowed }
  } catch {
    return { authenticated: false, allowed: false }
  }
}
