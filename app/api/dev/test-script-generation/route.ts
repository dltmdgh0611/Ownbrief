import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { generatePodcastScript } from '@/backend/lib/gemini'

// 타임아웃 설정: 15분
export const maxDuration = 900

export async function POST(request: NextRequest) {
  console.log('🧪 Script generation test started...')
  
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { transcriptText } = await request.json()
    
    if (!transcriptText) {
      return NextResponse.json({ error: 'Transcript text is required' }, { status: 400 })
    }

    console.log(`🤖 Testing script generation with text length: ${transcriptText.length}`)
    
    const startTime = Date.now()
    const script = await generatePodcastScript(transcriptText)
    const duration = Date.now() - startTime

    console.log(`✅ Script generation completed in ${duration}ms`)

    return NextResponse.json({
      success: true,
      duration,
      scriptLength: script.length,
      script: script.substring(0, 1000), // First 1000 chars
      fullScript: script
    })

  } catch (error: any) {
    console.error('❌ Script generation test error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Script generation test failed',
        details: error.stack
      },
      { status: 500 }
    )
  }
}
