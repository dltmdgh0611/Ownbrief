'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { User, Settings, Mic2 } from 'lucide-react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="liquid-glass text-white sticky top-0 z-50 border-b border-white/20">
      <div className="px-4 py-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 liquid-glass rounded-xl flex items-center justify-center">
              <Mic2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-over-prism">Ownbrief</h1>
              <p className="text-xs text-white/80">AI 팟캐스트</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {status === 'loading' ? (
              <div className="animate-pulse liquid-glass h-10 w-10 rounded-full"></div>
            ) : session ? (
              <div className="flex items-center space-x-2">
                <Link
                  href="/settings"
                  className="w-10 h-10 liquid-glass rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
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
                  <div className="h-10 w-10 liquid-glass rounded-full flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="liquid-glass-button px-5 py-2.5 rounded-full text-sm font-bold hover:bg-white/20 transition-all text-white"
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
