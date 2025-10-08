'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { User, Settings, Mic2 } from 'lucide-react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="bg-gradient-to-r from-brand to-brand-light text-white sticky top-0 z-50 shadow-lg">
      <div className="px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Mic2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Ownbrief</h1>
              <p className="text-xs text-white/80">AI 팟캐스트</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {status === 'loading' ? (
              <div className="animate-pulse bg-white/20 h-10 w-10 rounded-full"></div>
            ) : session ? (
              <div className="flex items-center space-x-2">
                <Link
                  href="/settings"
                  className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors backdrop-blur-sm"
                  title="설정"
                >
                  <Settings className="w-5 h-5" />
                </Link>
                {session.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="h-10 w-10 rounded-full border-2 border-white/30"
                  />
                ) : (
                  <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="bg-white text-brand px-5 py-2.5 rounded-full text-sm font-bold hover:bg-white/90 transition-all shadow-lg"
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
