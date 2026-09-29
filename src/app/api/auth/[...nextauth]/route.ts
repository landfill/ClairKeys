import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const handler = NextAuth({
  ...authOptions,
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    // debug is left to next-auth, which prints it only when authOptions.debug
    // is on (development).
  },
})

export { handler as GET, handler as POST }
