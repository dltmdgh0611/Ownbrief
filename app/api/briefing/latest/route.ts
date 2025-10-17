import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { BriefingService } from '@/backend/services/briefing.service'

/**
 * 최근 브리핑 조회 API
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const briefing = await BriefingService.getLatestBriefing(session.user.email)

    if (!briefing) {
      return NextResponse.json({ error: 'No briefing found' }, { status: 404 })
    }

    return NextResponse.json(briefing)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to get briefing' },
      { status: 500 }
    )
  }
}



