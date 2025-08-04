import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth/config'

const handler = NextAuth({
  ...authOptions,
  events: {
    async signOut() {
      // 로그아웃 시 추가 정리 작업
      console.log('User signed out')
    },
    async session({ session }) {
      // 세션 이벤트 로깅
      console.log('Session accessed:', session?.user?.email)
    },
  },
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', code, metadata)
    },
    warn(code) {
      console.warn('NextAuth Warning:', code)
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Debug:', code, metadata)
      }
    },
  },
})

export { handler as GET, handler as POST }