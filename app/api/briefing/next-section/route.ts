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
    console.log(`🎵 [next-section] API 요청 시작`)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.error(`❌ [next-section] 인증 실패: 세션 없음`)
      return NextResponse.json({ 
        success: false,
        error: 'UNAUTHORIZED',
        message: '인증이 필요합니다'
      }, { status: 401 })
    }

    const { sectionIndex, toneOfVoice = 'default' } = await request.json()
    const userEmail = session.user.email
    console.log(`📋 [next-section] 요청 파라미터: userEmail=${userEmail}, sectionIndex=${sectionIndex}, toneOfVoice=${toneOfVoice}`)

    // 섹션 인덱스 유효성 검증
    if (typeof sectionIndex !== 'number' || sectionIndex < 0) {
      console.error(`❌ [next-section] 잘못된 섹션 인덱스: sectionIndex=${sectionIndex}`)
      return NextResponse.json({ 
        success: false,
        error: 'INVALID_INDEX',
        message: '잘못된 섹션 인덱스입니다'
      }, { status: 400 })
    }

    console.log(`🎵 [next-section] 다음 섹션 요청: index=${sectionIndex}, userEmail=${userEmail}`)

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
      console.log(`✅ [next-section] 섹션 ${sectionIndex} 없음, 브리핑 완료: userEmail=${userEmail}`)
      return NextResponse.json({ 
        success: false, 
        error: 'SECTION_COMPLETE',
        message: '더 이상 처리할 섹션이 없습니다',
        completed: true
      }, { status: 200 }) // 완료는 200 상태 코드로
    }

    console.log(`🔄 [next-section] 섹션 ${sectionIndex} 처리 시작: ${nextSection.title} (${nextSection.name}), userEmail=${userEmail}`)

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
          console.log(`👤 [next-section] 페르소나 정보 조회 중: userEmail=${userEmail}`)
          persona = await PersonaService.getPersona(userEmail)
          console.log(`✅ [next-section] 페르소나 정보 조회 완료: userEmail=${userEmail}`)
        } catch (error: any) {
          console.error(`⚠️ [next-section] 페르소나 정보 가져오기 실패: userEmail=${userEmail}`)
          console.error(`   오류: ${error.message}`)
        }
      }
      
      console.log(`📊 [next-section] 섹션 "${nextSection.title}" 데이터 수집 시작...`)
      switch (nextSection.name) {
        case 'calendar':
          console.log(`📅 [next-section] 캘린더 일정 수집 중...`)
          data = await CalendarClient.getTodayEvents(userEmail, 10)
          console.log(`✅ [next-section] 캘린더 일정 수집 완료: ${Array.isArray(data) ? data.length : 0}개`)
          break
        case 'gmail':
          console.log(`📧 [next-section] Gmail 중요 메일 수집 중...`)
          // 미읽음 중요 메일 5개 요약 대상으로 반환
          data = await GmailClient.getUnreadImportant(userEmail, 5)
          console.log(`✅ [next-section] Gmail 중요 메일 수집 완료: ${Array.isArray(data) ? data.length : 0}개`)
          break
        case 'work': {
          // 슬랙/노션 통합
          console.log(`💼 [next-section] 슬랙/노션 데이터 수집 시작...`)
          const [slackData, notionData] = await Promise.allSettled([
            SlackClient.getUnreadMentions(userEmail, 20).catch((err: any) => {
              console.error(`❌ [next-section] Slack 수집 오류:`, err.message)
              return []
            }),
            NotionClient.getRecentPersonalActivity(userEmail, 10).catch((err: any) => {
              console.error(`❌ [next-section] Notion 수집 오류:`, err.message)
              return []
            }),
          ])
          data = {
            slack: slackData.status === 'fulfilled' ? slackData.value : [],
            notion: notionData.status === 'fulfilled' ? notionData.value : [],
          }
          console.log(`✅ [next-section] 슬랙/노션 데이터 수집 완료: slack=${data.slack?.length || 0}개, notion=${data.notion?.length || 0}개`)
          break
        }
        case 'trend1':
        case 'trend2':
        case 'trend3': {
          // 키워드 기반 뉴스 검색 및 스크립트 생성
          const trendIndex = parseInt(nextSection.name.replace('trend', '')) - 1
          console.log(`🔍 [next-section] 트렌드 ${trendIndex + 1} 처리 시작: userEmail=${userEmail}`)
          
          try {
            // DB에서 키워드만 가져오기 (뉴스/스크립트 생성 안함)
            console.log(`🔍 [next-section] 사용자 조회 중: userEmail=${userEmail}`)
            const user = await prisma.user.findUnique({ where: { email: userEmail } })
            if (!user) {
              console.error(`❌ [next-section] 사용자를 찾을 수 없음: userEmail=${userEmail}`)
              data = { skip: true }
              break
            }
            console.log(`✅ [next-section] 사용자 조회 완료: userId=${user.id}`)

            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
            console.log(`📅 [next-section] 오늘 키워드 조회: today=${today.toISOString()}, tomorrow=${tomorrow.toISOString()}`)

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

            if (!existingKeywords) {
              console.error(`❌ [next-section] 오늘 생성된 키워드가 없음: userEmail=${userEmail}`)
            } else {
              console.log(`✅ [next-section] 키워드 레코드 발견: id=${existingKeywords.id}, 생성 시간=${existingKeywords.createdAt.toISOString()}`)
            }

            const keywords = existingKeywords?.keywords as any[]
            console.log(`📊 [next-section] 키워드 개수: ${keywords?.length || 0}개, 요청 인덱스: ${trendIndex}`)
            
            if (!existingKeywords || !keywords || keywords.length === 0 || trendIndex >= keywords.length) {
              console.error(`❌ [next-section] 키워드 없음 또는 인덱스 초과: userEmail=${userEmail}`)
              console.error(`   → existingKeywords 존재: ${!!existingKeywords}, keywords 존재: ${!!keywords}, keywords 길이: ${keywords?.length || 0}, trendIndex: ${trendIndex}`)
              // 키워드가 없을 때는 안내 메시지 스크립트 생성
              let message = ''
              if (toneOfVoice === 'zephyr') {
                message = '트렌드 1, 2, 3에서 관심사를 찾지 못했어요. 유튜브에 저장을 시키면 다시 시도해 볼게요.'
              } else if (toneOfVoice === 'charon') {
                message = '트렌드 1, 2, 3에서 관심사를 찾지 못했어. 유튜브에 저장을 시키면 다시 시도해 볼게.'
              } else {
                message = '트렌드 1, 2, 3에서 관심사를 찾지 못했습니다. 유튜브에 저장을 시키면 다시 시도해 보겠습니다.'
              }
              data = { skip: true, script: message }
              console.log(`⚠️ [next-section] 키워드 없음으로 안내 메시지 생성: ${message.length}자`)
            } else {
              // 해당 키워드만 처리
              const keyword = keywords[trendIndex]
              console.log(`📌 [next-section] 키워드 처리 시작: ${keyword.level1} > ${keyword.level2} > ${keyword.level3}`)
              
              // 뉴스 검색 및 스크립트 생성
              console.log(`📰 [next-section] 뉴스 검색 시작: keyword="${keyword.level3}"`)
              const news = await BriefingService.searchNewsForKeyword(keyword)
              console.log(`✅ [next-section] 뉴스 검색 완료: ${news.length}자`)
              
              console.log(`📝 [next-section] 스크립트 생성 시작: toneOfVoice=${toneOfVoice}`)
              const script = await BriefingService.generateScriptForKeyword(keyword, news, toneOfVoice)
              console.log(`✅ [next-section] 스크립트 생성 완료: ${script.length}자`)
              
              data = { keyword, news, script }
              console.log(`✅ [next-section] 트렌드 ${trendIndex + 1} 전체 완료: 스크립트 ${script.length}자`)
            }
          } catch (error: any) {
            console.error(`❌ [next-section] 트렌드 키워드 처리 오류: userEmail=${userEmail}, trendIndex=${trendIndex}`)
            console.error(`   오류 타입: ${error.constructor.name}`)
            console.error(`   오류 메시지: ${error.message}`)
            console.error(`   오류 스택:`, error.stack)
            // 에러 발생 시에도 안내 메시지 스크립트 생성
            let message = ''
            if (toneOfVoice === 'zephyr') {
              message = '트렌드 1, 2, 3에서 관심사를 찾지 못했어요. 유튜브에 저장을 시키면 다시 시도해 볼게요.'
            } else if (toneOfVoice === 'charon') {
              message = '트렌드 1, 2, 3에서 관심사를 찾지 못했어. 유튜브에 저장을 시키면 다시 시도해 볼게.'
            } else {
              message = '트렌드 1, 2, 3에서 관심사를 찾지 못했습니다. 유튜브에 저장을 시키면 다시 시도해 보겠습니다.'
            }
            data = { skip: true, script: message }
            console.log(`⚠️ [next-section] 오류로 인해 안내 메시지 생성: ${message.length}자`)
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
      console.log(`📝 [next-section] 스크립트 생성 단계 시작: 섹션="${nextSection.name}"`)
      let sectionScript
      if (nextSection.name.startsWith('trend')) {
        if (data && data.script) {
          // 키워드가 있거나 skip 메시지가 있는 경우
          sectionScript = data.script
          console.log(`✅ [next-section] 트렌드 스크립트 직접 사용: ${sectionScript.length}자`)
        } else if (data && data.skip) {
          // skip: true인데 script가 없는 경우 (fallback)
          console.log(`⚠️ [next-section] skip=true인데 script가 없음, fallback 메시지 생성`)
          let message = ''
          if (toneOfVoice === 'zephyr') {
            message = '트렌드 1, 2, 3에서 관심사를 찾지 못했어요. 유튜브에 저장을 시키면 다시 시도해 볼게요.'
          } else if (toneOfVoice === 'charon') {
            message = '트렌드 1, 2, 3에서 관심사를 찾지 못했어. 유튜브에 저장을 시키면 다시 시도해 볼게.'
          } else {
            message = '트렌드 1, 2, 3에서 관심사를 찾지 못했습니다. 유튜브에 저장을 시키면 다시 시도해 보겠습니다.'
          }
          sectionScript = message
          console.log(`⚠️ [next-section] 트렌드 스크립트 fallback 사용: ${sectionScript.length}자`)
        } else {
          // 그 외의 경우 일반 섹션 스크립트 생성
          console.log(`📝 [next-section] 일반 섹션 스크립트 생성 시작: 섹션="${nextSection.name}"`)
          sectionScript = await BriefingService.generateSectionScript(
            nextSection.name, 
            data, 
            persona, // persona 전달
            toneOfVoice // 말투 전달
          )
          console.log(`✅ [next-section] 일반 섹션 스크립트 생성 완료: ${sectionScript?.length || 0}자`)
        }
      } else {
        console.log(`📝 [next-section] 섹션 스크립트 생성 시작: 섹션="${nextSection.name}", toneOfVoice=${toneOfVoice}`)
        sectionScript = await BriefingService.generateSectionScript(
          nextSection.name, 
          data, 
          persona, // persona 전달
          toneOfVoice // 말투 전달
        )
        console.log(`✅ [next-section] 섹션 스크립트 생성 완료: ${sectionScript?.length || 0}자`)
      }

      if (sectionScript) {
        console.log(`✅ [next-section] 다음 섹션 준비 완료: ${nextSection.title} (${nextSection.name}), 스크립트 ${sectionScript.length}자`)
        
        return NextResponse.json({
          success: true,
          section: nextSection.name,
          script: sectionScript,
          data: data
        })
      } else {
        console.error(`❌ [next-section] 스크립트 생성 실패: 섹션="${nextSection.name}", userEmail=${userEmail}`)
        return NextResponse.json({
          success: false,
          error: 'SCRIPT_GENERATION_FAILED',
          message: '스크립트 생성에 실패했습니다'
        }, { status: 500 })
      }
    } catch (innerError: any) {
      clearTimeout(timeoutId)
      console.error(`❌ [next-section] 내부 처리 오류: userEmail=${userEmail}, sectionIndex=${sectionIndex}`)
      console.error(`   오류 타입: ${innerError.constructor.name}`)
      console.error(`   오류 메시지: ${innerError.message}`)
      console.error(`   오류 스택:`, innerError.stack)
      
      if (innerError.name === 'AbortError') {
        console.error(`⏱️ [next-section] 타임아웃 발생: userEmail=${userEmail}, sectionIndex=${sectionIndex}`)
        return NextResponse.json({
          success: false,
          error: 'TIMEOUT',
          message: '요청 처리 시간이 초과되었습니다'
        }, { status: 408 })
      }
      throw innerError
    }

  } catch (error: any) {
    console.error(`❌ [next-section] 전체 오류: userEmail=${userEmail || 'unknown'}`)
    console.error(`   오류 타입: ${error.constructor.name}`)
    console.error(`   오류 메시지: ${error.message}`)
    console.error(`   오류 스택:`, error.stack)
    if (error.response) {
      console.error(`   API 응답 상태: ${error.response.status}`)
      console.error(`   API 응답 데이터:`, JSON.stringify(error.response.data, null, 2))
    }
    
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
