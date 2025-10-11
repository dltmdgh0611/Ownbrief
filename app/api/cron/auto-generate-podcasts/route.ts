import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/backend/lib/prisma'
import { getYouTubeVideosFromPlaylists, getVideoDetails } from '@/backend/lib/youtube'
import { getVideoTranscript, combineTranscripts } from '@/backend/lib/subtitle'
import { generatePodcastScript, generateMultiSpeakerSpeech } from '@/backend/lib/gemini'
import { uploadAudioToStorage } from '@/backend/lib/supabase'

// Vercel Cron Jobs에서만 실행 가능하도록 설정
export const maxDuration = 300

export async function GET(request: NextRequest) {
  console.log('🕐 Auto-generate podcasts cron job started...')

  // Vercel Cron Job 인증 확인
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Unauthorized cron job request')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 현재 UTC 시간
    const now = new Date()
    const utcHour = now.getUTCHours()
    const utcMinute = now.getUTCMinutes()
    
    // UTC를 한국 시간(KST, UTC+9)으로 변환
    const kstTotalMinutes = (utcHour * 60 + utcMinute + 9 * 60) % (24 * 60)
    const kstHour = Math.floor(kstTotalMinutes / 60)
    const kstMinute = kstTotalMinutes % 60
    
    // 15분 단위로 반올림 (0, 15, 30, 45)
    const currentTargetMinute = Math.floor(kstMinute / 15) * 15
    
    // 1시간 후 배달 시간 계산 (사용자가 받고 싶은 시간)
    const deliveryTotalMinutes = (kstTotalMinutes + 60) % (24 * 60)
    const deliveryHour = Math.floor(deliveryTotalMinutes / 60)
    const deliveryMinute = currentTargetMinute // 현재 반올림된 분 사용

    console.log(`⏰ Current UTC time: ${now.toISOString()}`)
    console.log(`⏰ Current KST time: ${String(kstHour).padStart(2, '0')}:${String(kstMinute).padStart(2, '0')}`)
    console.log(`⏰ Generating podcasts for delivery at: ${String(deliveryHour).padStart(2, '0')}:${String(deliveryMinute).padStart(2, '0')} KST (1 hour from now)`)

    // 1시간 후 배달 시간에 설정한 사용자들 조회
    const users = await prisma.user.findMany({
      where: {
        userSettings: {
          deliveryTimeHour: deliveryHour,
          deliveryTimeMinute: deliveryMinute,
          onboardingCompleted: true,
        },
      },
      include: {
        userSettings: true,
        accounts: true,
      },
    })

    console.log(`👥 Found ${users.length} users for this time slot`)

    const results = []

    for (const user of users) {
      try {
        console.log(`\n👤 Processing user: ${user.email}`)

        // 크레딧 확인
        if (!user.userSettings || user.userSettings.credits <= 0) {
          console.log(`⚠️ User ${user.email} has insufficient credits (${user.userSettings?.credits || 0})`)
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: 'Insufficient credits',
          })
          continue
        }

        // YouTube access token 가져오기
        const account = user.accounts.find((acc) => acc.provider === 'google')
        if (!account?.access_token) {
          console.log(`⚠️ User ${user.email} has no Google account connected`)
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: 'No Google account',
          })
          continue
        }

        const accessToken = account.access_token
        const selectedPlaylists = user.userSettings.selectedPlaylists || []

        if (selectedPlaylists.length === 0) {
          console.log(`⚠️ User ${user.email} has no playlists selected`)
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: 'No playlists selected',
          })
          continue
        }

        // 팟캐스트 생성 시작
        console.log(`🎬 Fetching videos for user ${user.email}...`)
        const playlistVideos = await getYouTubeVideosFromPlaylists(accessToken, selectedPlaylists)

        if (!playlistVideos || playlistVideos.length === 0) {
          console.log(`⚠️ No videos found for user ${user.email}`)
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: 'No videos found',
          })
          continue
        }

        // 최신 5개 동영상
        const videoIds = playlistVideos
          .slice(0, 5)
          .map((video: any) => video.snippet?.resourceId?.videoId)
          .filter(Boolean)

        console.log(`📹 Selected ${videoIds.length} videos`)

        const videoDetails = await getVideoDetails(videoIds, accessToken)

        // 자막 추출
        console.log('📝 Extracting subtitles...')
        const transcripts = []
        for (const videoId of videoIds) {
          try {
            const transcript = await getVideoTranscript(videoId!)
            transcripts.push(transcript)
            await new Promise((resolve) => setTimeout(resolve, 2000))
          } catch (error) {
            console.error(`❌ Subtitle extraction failed for ${videoId}:`, error)
            transcripts.push([])
          }
        }

        const combinedTranscript = combineTranscripts(transcripts.filter((t: any) => t.length > 0))

        if (!combinedTranscript || combinedTranscript.trim().length === 0) {
          console.log(`⚠️ No subtitles extracted for user ${user.email}`)
          results.push({
            userId: user.id,
            email: user.email,
            success: false,
            error: 'No subtitles extracted',
          })
          continue
        }

        // 스크립트 생성
        console.log('✍️ Generating script...')
        const script = await generatePodcastScript(combinedTranscript)

        // publishedAt 계산 (KST 기준 배달 시간을 UTC로 변환)
        const publishedAtKST = new Date()
        publishedAtKST.setHours(deliveryHour, deliveryMinute, 0, 0)
        // KST를 UTC로 변환 (UTC = KST - 9시간)
        const publishedAtUTC = new Date(publishedAtKST.getTime() - 9 * 60 * 60 * 1000)

        // 팟캐스트 레코드 생성
        const podcast = await prisma.podcast.create({
          data: {
            title: `AI Cast - ${new Date().toLocaleDateString('ko-KR')}`,
            description: `Podcast generated from ${videoIds.length} videos`,
            script: script,
            userId: user.id,
            status: 'processing',
            isAutoGenerated: true,
            publishedAt: publishedAtUTC,
          },
        })

        console.log(`✅ Podcast created: ${podcast.id}`)

        // 음성 생성
        console.log('🎤 Generating voice...')
        const audioResult = await generateMultiSpeakerSpeech(script)

        // 파일 확장자 결정
        let fileExtension = 'wav'
        if (audioResult.mimeType.includes('mpeg') || audioResult.mimeType.includes('mp3')) {
          fileExtension = 'mp3'
        } else if (audioResult.mimeType.includes('wav')) {
          fileExtension = 'wav'
        } else if (audioResult.mimeType.includes('ogg')) {
          fileExtension = 'ogg'
        }

        const audioFileName = `podcast-${podcast.id}.${fileExtension}`

        // Supabase Storage에 업로드
        const publicUrl = await uploadAudioToStorage(audioResult.buffer, audioFileName, audioResult.mimeType)

        // Duration 계산
        let duration = 0
        if (fileExtension === 'wav' && audioResult.buffer.length > 44) {
          const sampleRate = audioResult.buffer.readUInt32LE(24)
          const byteRate = audioResult.buffer.readUInt32LE(28)
          const dataSize = audioResult.buffer.readUInt32LE(40)
          duration = Math.floor(dataSize / byteRate)
        }

        // 팟캐스트 업데이트
        await prisma.podcast.update({
          where: { id: podcast.id },
          data: {
            status: 'completed',
            audioUrl: publicUrl,
            duration,
          },
        })

        // 크레딧 차감
        await prisma.userSettings.update({
          where: { userId: user.id },
          data: {
            credits: user.userSettings.credits - 1,
          },
        })

        console.log(`✅ Podcast generation complete for ${user.email}`)
        console.log(`💰 Credits remaining: ${user.userSettings.credits - 1}`)

        results.push({
          userId: user.id,
          email: user.email,
          success: true,
          podcastId: podcast.id,
        })
      } catch (error: any) {
        console.error(`❌ Error processing user ${user.email}:`, error)
        results.push({
          userId: user.id,
          email: user.email,
          success: false,
          error: error.message,
        })
      }
    }

    console.log('\n✅ Auto-generate cron job completed')
    console.log('📊 Results:', results)

    return NextResponse.json({
      success: true,
      currentKST: `${String(kstHour).padStart(2, '0')}:${String(kstMinute).padStart(2, '0')} KST`,
      deliveryTime: `${String(deliveryHour).padStart(2, '0')}:${String(deliveryMinute).padStart(2, '0')} KST`,
      usersProcessed: users.length,
      results,
    })
  } catch (error: any) {
    console.error('❌ Cron job error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

