import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  // 임시로 PrismaAdapter 비활성화하여 JWT 기반 인증 사용
  // adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    signIn: async ({ user, account }) => {
      // Temporarily simplified - just allow sign in without DB
      return true
    },
    session: ({ session, token }) => {
      // JWT 기반 인증에서는 token에서 id를 가져옵니다
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    jwt: ({ token, user, account }) => {
      if (user) {
        token.sub = user.id
      }
      // OAuth 계정 정보를 토큰에 저장
      if (account) {
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  debug: true, // Temporarily enable debug for production
}