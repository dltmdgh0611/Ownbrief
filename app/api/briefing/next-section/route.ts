import { NextRequest, NextResponse } from 'next/server'
import { BriefingService } from '@/backend/services/briefing.service'
import { CalendarClient } from '@/backend/lib/calendar'
import { GmailClient } from '@/backend/lib/gmail'
import { SlackClient } from '@/backend/lib/slack'
import { NotionClient } from '@/backend/lib/notion'
import { PersonaService } from '@/backend/services/persona.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'
import { prisma } from '@/backend/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120 // 120초 타임아웃 - 관심사 섹션 등 긴 텍스트 대응

/**
 * 다음 섹션 요청 API
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ 
        success: false,
        error: 'UNAUTHORIZED',
        message: '인증이 필요합니다'
      }, { status: 401 })
    }

    const { sectionIndex, toneOfVoice = 'default' } = await request.json()
    const userEmail = session.user.email

    // 섹션 인덱스 유효성 검증
    if (typeof sectionIndex !== 'number' || sectionIndex < 0) {
      return NextResponse.json({ 
        success: false,
        error: 'INVALID_INDEX',
        message: '잘못된 섹션 인덱스입니다'
      }, { status: 400 })
    }

    console.log(`🎵 다음 섹션 요청: index=${sectionIndex}`)

    // 섹션 정의 (프론트엔드와 일치)
    const sections = [
      { name: 'calendar', title: '오늘 일정' },
      { name: 'gmail', title: '중요 메일' },
      { name: 'work', title: '업무 진행 상황' },
      { name: 'trend1', title: '트렌드 1' },
      { name: 'trend2', title: '트렌드 2' },
      { name: 'trend3', title: '트렌드 3' },
      { name: 'outro', title: '마무리' },
    ]

    const nextSection = sections[sectionIndex]
    if (!nextSection) {
      console.log(`🎵 섹션 ${sectionIndex} 없음, 브리핑 완료`)
      return NextResponse.json({ 
        success: false, 
        error: 'SECTION_COMPLETE',
        message: '더 이상 처리할 섹션이 없습니다',
        completed: true
      }, { status: 200 }) // 완료는 200 상태 코드로
    }

    console.log(`🎵 섹션 ${sectionIndex} 처리 중: ${nextSection.title}`)

    // 타임아웃 처리를 위한 AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 120초 타임아웃 - 관심사 섹션 등 긴 텍스트 대응

    try {
      // 다음 섹션 데이터 수집 및 스크립트 생성
      let data: any = null
      let persona: any = null
      
      // 페르소나 정보는 모든 동적 섹션에서 필요할 수 있으므로 미리 가져옴
      if (!nextSection.name.includes('outro')) {
        try {
          persona = await PersonaService.getPersona(userEmail)
        } catch (error) {
          console.log('페르소나 정보 가져오기 실패:', error)
        }
      }
      
      switch (nextSection.name) {
        case 'calendar':
          data = await CalendarClient.getTodayEvents(userEmail, 10)
          break
        case 'gmail':
          // 미읽음 중요 메일 5개 요약 대상으로 반환
          data = await GmailClient.getUnreadImportant(userEmail, 5)
          break
        case 'work': {
          // 슬랙/노션 통합
          console.log('🔄 슬랙/노션 데이터 수집 시작...')
          const [slackData, notionData] = await Promise.allSettled([
            SlackClient.getUnreadMentions(userEmail, 20).catch(() => []),
            NotionClient.getRecentPersonalActivity(userEmail, 10).catch(() => []),
          ])
          data = {
            slack: slackData.status === 'fulfilled' ? slackData.value : [],
            notion: notionData.status === 'fulfilled' ? notionData.value : [],
          }
          console.log(`✅ 슬랙/노션 데이터 수집 완료: slack=${data.slack?.length || 0}, notion=${data.notion?.length || 0}`)
          break
        }
        case 'trend1':
        case 'trend2':
        case 'trend3': {
          // 키워드 기반 뉴스 검색 및 스크립트 생성
          const trendIndex = parseInt(nextSection.name.replace('trend', '')) - 1
          console.log(`🔍 트렌드 ${trendIndex + 1} 키워드만 처리 중...`)
          
          try {
            // DB에서 키워드만 가져오기 (뉴스/스크립트 생성 안함)
            const user = await prisma.user.findUnique({ where: { email: userEmail } })
            if (!user) {
              data = { skip: true }
              break
            }

            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

            const existingKeywords = await prisma.dailyTrendKeywords.findFirst({
              where: {
                userId: user.id,
                createdAt: {
                  gte: today,
                  lt: tomorrow
                }
              },
              orderBy: {
                createdAt: 'desc'
              }
            })

            const keywords = existingKeywords?.keywords as any[]
            if (!existingKeywords || !keywords || trendIndex >= keywords.length) {
              console.log('⚠️ 키워드 없음 또는 인덱스 초과')
              data = { skip: true }
            } else {
              // 해당 키워드만 처리
              const keyword = keywords[trendIndex]
              console.log(`📌 키워드 처리: ${keyword.level1} > ${keyword.level2} > ${keyword.level3}`)
              
              // 뉴스 검색 및 스크립트 생성
              const news = await BriefingService.searchNewsForKeyword(keyword)
              const script = await BriefingService.generateScriptForKeyword(keyword, news, toneOfVoice)
              
              data = { keyword, news, script }
              console.log(`✅ 트렌드 ${trendIndex + 1} 완료: ${script.length}자`)
            }
          } catch (error) {
            console.error('❌ 트렌드 키워드 처리 오류:', error)
            data = { skip: true }
          }
          break
        }
        case 'outro':
          // 마무리 섹션은 정적 스크립트
          data = null
          break
        default:
          data = []
      }

      clearTimeout(timeoutId)

      // trend 섹션은 이미 스크립트가 준비되어 있음
      let sectionScript
      if (nextSection.name.startsWith('trend') && data && data.script) {
        sectionScript = data.script
        console.log(`✅ 트렌드 스크립트 직접 사용: ${sectionScript.length}자`)
      } else {
        sectionScript = await BriefingService.generateSectionScript(
          nextSection.name, 
          data, 
          persona, // persona 전달
          toneOfVoice // 말투 전달
        )
      }

      if (sectionScript) {
        console.log(`🎵 다음 섹션 준비 완료: ${nextSection.title}`)
        
        return NextResponse.json({
          success: true,
          section: nextSection.name,
          script: sectionScript,
          data: data
        })
      } else {
        return NextResponse.json({
          success: false,
          error: 'SCRIPT_GENERATION_FAILED',
          message: '스크립트 생성에 실패했습니다'
        }, { status: 500 })
      }
    } catch (innerError: any) {
      clearTimeout(timeoutId)
      if (innerError.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          error: 'TIMEOUT',
          message: '요청 처리 시간이 초과되었습니다'
        }, { status: 408 })
      }
      throw innerError
    }

  } catch (error: any) {
    console.error('다음 섹션 요청 오류:', error)
    
    // 에러 타입에 따른 적절한 응답
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'
    const errorCode = error.code || 'INTERNAL_ERROR'
    
    return NextResponse.json({
      success: false,
      error: errorCode,
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}
