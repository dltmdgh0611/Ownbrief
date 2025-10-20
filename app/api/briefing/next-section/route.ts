import { NextRequest, NextResponse } from 'next/server'
import { BriefingService } from '@/backend/services/briefing.service'
import { CalendarClient } from '@/backend/lib/calendar'
import { GmailClient } from '@/backend/lib/gmail'
import { PersonaService } from '@/backend/services/persona.service'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/backend/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60초 타임아웃 - 관심사 섹션 등 긴 텍스트 대응

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

    const { sectionIndex } = await request.json()
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
      { name: 'interests', title: '관심사 트렌드' },
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
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60초 타임아웃 - 관심사 섹션 등 긴 텍스트 대응

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
          // 슬랙/노션 통합 (연동 여부에 따라 스킵 가능하도록 빈 배열 반환 허용)
          const [slackData, notionData] = await Promise.allSettled([
            (async () => {
              try { return await BriefingService.collectData(userEmail).then(d => d.slack) } catch { return [] }
            })(),
            (async () => {
              try { return await BriefingService.collectData(userEmail).then(d => d.notion) } catch { return [] }
            })(),
          ])
          data = {
            slack: slackData.status === 'fulfilled' ? slackData.value : [],
            notion: notionData.status === 'fulfilled' ? notionData.value : [],
          }
          break
        }
        case 'interests':
          // 페르소나의 관심 키워드를 기반으로 뉴스 검색 (현재는 프롬프트만 사용)
          data = {
            interests: persona?.interests || [],
            // 실제 뉴스 데이터는 AI 모델이 생성하도록 프롬프트에 위임
          }
          break
        case 'outro':
          // 마무리 섹션은 정적 스크립트
          data = null
          break
        default:
          data = []
      }

      clearTimeout(timeoutId)

      const sectionScript = await BriefingService.generateSectionScript(
        nextSection.name, 
        data, 
        persona // persona 전달
      )

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
