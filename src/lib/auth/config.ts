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
    signIn: async ({ user, account, profile }) => {
      try {
        if (account && user.email) {
          // Find existing user by email
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email }
          })

          if (existingUser) {
            // Store the actual database user ID in the token
            account.databaseUserId = existingUser.id
          } else {
            // Create new user if doesn't exist
            const newUser = await prisma.user.create({
              data: {
                name: user.name || null,
                email: user.email,
                image: user.image || null,
                emailVerified: new Date(),
              }
            })
            account.databaseUserId = newUser.id
            
            // Create associated account record
            await prisma.account.create({
              data: {
                userId: newUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
              }
            })
          }
        }
        return true
      } catch (error) {
        console.error('Sign in callback error:', error)
        // Allow sign in even if DB operation fails
        return true
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
      
      if (session.user && token.databaseUserId) {
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
      
      // Store database user ID in token
      if (account && account.databaseUserId) {
        token.databaseUserId = account.databaseUserId
        token.sub = account.databaseUserId
      } else if (user) {
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