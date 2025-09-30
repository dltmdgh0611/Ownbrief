import { prisma } from '@/backend/lib/prisma'
import type { Podcast } from '@/backend/types'

export class PodcastService {
  /**
   * 사용자의 팟캐스트 목록 가져오기
   */
  static async getUserPodcasts(userEmail: string): Promise<Podcast[]> {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    return await prisma.podcast.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * 팟캐스트 생성
   */
  static async createPodcast(
    userEmail: string,
    title: string,
    description: string,
    script: string
  ): Promise<Podcast> {
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    })

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }

    return await prisma.podcast.create({
      data: {
        title,
        description,
        script,
        userId: user.id,
        status: 'pending'
      }
    })
  }

  /**
   * 팟캐스트 상태 업데이트
   */
  static async updatePodcastStatus(
    podcastId: string,
    status: string,
    audioUrl?: string,
    duration?: number
  ): Promise<Podcast> {
    return await prisma.podcast.update({
      where: { id: podcastId },
      data: {
        status,
        audioUrl,
        duration,
        updatedAt: new Date()
      }
    })
  }

  /**
   * 팟캐스트 ID로 조회
   */
  static async getPodcastById(podcastId: string): Promise<Podcast | null> {
    return await prisma.podcast.findUnique({
      where: { id: podcastId }
    })
  }
}
