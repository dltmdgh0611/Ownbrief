import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // 개발자 모드 페이지 접근 제한
  if (request.nextUrl.pathname.startsWith('/dev')) {
    // 개발 모드가 아니면 접근 차단
    if (process.env.NODE_ENV !== 'development') {
      return new NextResponse('Not Found', { status: 404 })
    }
    
    // 추가 보안: 특정 헤더나 쿼리 파라미터로 접근 제한 가능
    // 예: ?dev=true 또는 특정 헤더 확인
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/dev/:path*'
}
