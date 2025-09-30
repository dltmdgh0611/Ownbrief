'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { User, LogOut, Settings } from 'lucide-react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">OwnBrief</h1>
            <span className="ml-2 text-sm text-gray-500">AI 팟캐스트 생성기</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-700">
                    {session.user?.name || session.user?.email}
                  </span>
                </div>
                <Link
                  href="/settings"
                  className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <Settings className="h-4 w-4" />
                  <span>설정</span>
                </Link>
                <button
                  onClick={() => signOut()}
                  className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('google')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                구글로 로그인
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
