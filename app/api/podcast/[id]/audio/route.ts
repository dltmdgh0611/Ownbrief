import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email || 'unknown' }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const podcast = await prisma.podcast.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!podcast) {
      return NextResponse.json({ error: 'Podcast not found' }, { status: 404 })
    }

    if (podcast.status !== 'completed') {
      return NextResponse.json({ error: 'Podcast is not ready yet' }, { status: 202 })
    }

    // In production, fetch from S3 or other storage
    // Returning empty response for now
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': `attachment; filename="podcast-${params.id}.mp3"`
      }
    })

  } catch (error: any) {
    console.error('Audio fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audio file' },
      { status: 500 }
    )
  }
}