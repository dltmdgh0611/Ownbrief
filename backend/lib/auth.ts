import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { prisma } from "./prisma"

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    accessToken?: string
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    userId?: string
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube",
          access_type: "offline",  // refresh token을 받기 위해 필수
          prompt: "consent",       // 항상 동의 화면 표시하여 refresh token 받기
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // 초기 로그인 시
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      if (user) {
        token.userId = user.id
      }

      // 토큰이 아직 유효한 경우
      if (token.expiresAt && Date.now() < (token.expiresAt as number) * 1000) {
        return token
      }

      // 토큰이 만료된 경우 refresh
      if (token.refreshToken) {
        try {
          console.log('🔄 Refreshing expired access token...')
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              grant_type: 'refresh_token',
              refresh_token: token.refreshToken as string,
            }),
          })

          const refreshedTokens = await response.json()

          if (!response.ok) {
            throw new Error(refreshedTokens.error || 'Failed to refresh token')
          }

          console.log('✅ Access token refreshed successfully')
          
          // 새로운 토큰으로 업데이트
          token.accessToken = refreshedTokens.access_token
          token.expiresAt = Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
          
          // refresh_token이 새로 발급되었다면 업데이트
          if (refreshedTokens.refresh_token) {
            token.refreshToken = refreshedTokens.refresh_token
          }

          // DB의 Account 테이블도 업데이트
          if (token.userId) {
            await prisma.account.updateMany({
              where: {
                userId: token.userId as string,
                provider: 'google',
              },
              data: {
                access_token: refreshedTokens.access_token,
                expires_at: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
                refresh_token: refreshedTokens.refresh_token || token.refreshToken as string,
              },
            })
          }

          return token
        } catch (error) {
          console.error('❌ Error refreshing access token:', error)
          // 에러 발생 시 기존 토큰 반환 (사용자 재로그인 유도)
          return token
        }
      }

      return token
    },
    async session({ session, token, user }) {
      session.accessToken = token.accessToken as string
      
      // JWT 전략을 사용하므로 token에서 userId 가져오기
      if (token.userId) {
        session.user.id = token.userId as string
      }
      
      return session
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30일
    updateAge: 24 * 60 * 60, // 24시간마다 세션 업데이트
  },
  pages: {
    signIn: '/', // 로그인 페이지 (메인 페이지로 리다이렉트)
    error: '/', // 에러 페이지
  },
  debug: process.env.NODE_ENV === 'development',
}
