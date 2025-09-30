import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { PodcastService } from '@/backend/services/podcast.service'

/**
 * 팟캐스트 목록 가져오기
 */
export async function getPodcasts() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const podcasts = await PodcastService.getUserPodcasts(session.user.email)
    return NextResponse.json(podcasts)

  } catch (error) {
    console.error('Podcast fetch error:', error)
    return NextResponse.json(
      { error: '팟캐스트 목록을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

/**
 * 팟캐스트 생성
 */
export async function createPodcast(
  title: string,
  description: string,
  script: string
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      )
    }

    const podcast = await PodcastService.createPodcast(
      session.user.email,
      title,
      description,
      script
    )

    return NextResponse.json(podcast)

  } catch (error) {
    console.error('Podcast creation error:', error)
    return NextResponse.json(
      { error: '팟캐스트 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}
