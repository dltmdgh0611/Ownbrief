import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { BriefingService } from '@/backend/services/briefing.service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분

/**
 * 브리핑 생성 스트리밍 API (Server-Sent Events)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new Response('Unauthorized', { status: 401 })
    }

    // SSE 스트림 설정
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 브리핑 생성 스트림 시작
          for await (const event of BriefingService.generateStreamingBriefing(session.user.email!)) {
            const sseData = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
            controller.enqueue(encoder.encode(sseData))
          }

          // 스트림 종료
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          const errorData = `event: error\ndata: ${JSON.stringify({ 
            message: error instanceof Error ? error.message : 'Unknown error' 
          })}\n\n`
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('API error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to generate briefing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}



