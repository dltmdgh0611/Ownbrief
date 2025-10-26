import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Notion API로 토큰 검증 및 워크스페이스 정보 가져오기
    const userResponse = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
      },
    })

    if (!userResponse.ok) {
      return NextResponse.json({ 
        error: '유효하지 않은 토큰입니다. Notion에서 발급받은 Internal Integration Token을 입력해주세요.' 
      }, { status: 400 })
    }

    const userData = await userResponse.json()

    if (!userData.id) {
      return NextResponse.json({ error: '워크스페이스 정보를 가져올 수 없습니다.' }, { status: 400 })
    }

    // 워크스페이스 정보 가져오기 (검색으로 확인)
    const searchResponse = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_size: 1,
      }),
    })

    const searchData = await searchResponse.json()

    // bot의 workspace 정보 추출
    const workspaceId = userData.bot?.workspace_name || userData.id
    const workspaceName = userData.bot?.workspace_name || 'Notion Workspace'

    // 이미 연결된 워크스페이스인지 확인
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        connectedServices: {
          where: {
            serviceName: {
              startsWith: 'notion'
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 중복 확인 (같은 workspace_id 또는 같은 token)
    const isDuplicate = user.connectedServices.some(service => {
      const metadata = service.metadata as any
      return metadata?.workspaceId === workspaceId || service.accessToken === token
    })

    if (isDuplicate) {
      return NextResponse.json({ 
        error: '이미 연결된 워크스페이스입니다.' 
      }, { status: 400 })
    }

    // 고유한 serviceName 생성
    const serviceName = `notion-${workspaceId}`

    // 워크스페이스 정보 저장
    const workspaceInfo = {
      workspaceId: workspaceId,
      workspaceName: workspaceName,
      workspaceIcon: null,
      botId: userData.bot?.owner?.workspace ? null : userData.id,
      type: 'token', // OAuth가 아닌 토큰 방식
      userName: userData.name || null,
    }

    await prisma.connectedService.create({
      data: {
        userId: user.id,
        serviceName: serviceName,
        accessToken: token,
        refreshToken: null,
        expiresAt: null, // Internal Integration Token은 만료되지 않음
        metadata: workspaceInfo,
      }
    })

    console.log('✅ Notion workspace added successfully:', workspaceName)

    return NextResponse.json({
      success: true,
      message: `${workspaceName} 워크스페이스가 추가되었습니다.`,
      workspace: workspaceInfo,
    })
  } catch (error: any) {
    console.error('Add Notion workspace error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add workspace' },
      { status: 500 }
    )
  }
}

