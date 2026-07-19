import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'node:crypto'

export const authOptions: NextAuthOptions = {
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
      try {
        if (account && user.email) {
          const dbUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name || undefined,
              image: user.image || undefined
            },
            create: {
              id: randomUUID(),
              name: user.name || null,
              email: user.email,
              image: user.image || null,
              emailVerified: new Date()
            }
          })

          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId
              }
            },
            update: {
              userId: dbUser.id,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state
            },
            create: {
              userId: dbUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state
            }
          })
        }
        return true
      } catch (error) {
        console.error('Sign in callback error:', error)
        // Reject sign-in when the database identity cannot be established.
        return false
      }
    },
    session: async ({ session, token }) => {
      // Look up database user by email to get correct ID
      if (session.user && session.user.email && !token.databaseUserId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email }
          })
          if (dbUser) {
            session.user.id = dbUser.id
            return session
          }
        } catch (error) {
          console.error('Session callback error:', error)
        }
      }
      
      if (session.user && typeof token.databaseUserId === 'string') {
        session.user.id = token.databaseUserId
      } else if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
    jwt: async ({ token, user, account }) => {
      // Look up database user to store correct ID
      if (account && user?.email && !token.databaseUserId) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: user.email }
          })
          if (dbUser) {
            token.databaseUserId = dbUser.id
            token.sub = dbUser.id
          }
        } catch (error) {
          console.error('JWT callback error:', error)
        }
      }
      
      // The database lookup above is authoritative for OAuth users.
      if (!account && user && typeof token.databaseUserId !== 'string') {
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
  debug: process.env.NODE_ENV === 'development'
}
