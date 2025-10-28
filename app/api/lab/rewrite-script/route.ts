import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { script, tonePrompt } = await request.json()

    if (!script) {
      return NextResponse.json({ 
        success: false,
        error: 'MISSING_SCRIPT',
        message: 'Script is required' 
      }, { status: 400 })
    }

    if (!tonePrompt) {
      return NextResponse.json({ 
        success: false,
        error: 'MISSING_TONE_PROMPT',
        message: 'Tone prompt is required' 
      }, { status: 400 })
    }

    console.log(`✍️ 스크립트 재작성 요청: ${script.substring(0, 50)}...`)
    console.log(`🎭 말투 프롬프트: ${tonePrompt}`)

    // API 키 확인
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        success: false,
        error: 'API_KEY_MISSING',
        message: 'GEMINI_API_KEY가 설정되지 않았습니다'
      }, { status: 503 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    
    const prompt = `
다음 대본을 주어진 말투로 재작성해주세요. 내용은 동일하게 유지하되, 말투와 표현만 변경하세요.

**원본 대본:**
${script}

**말투 프롬프트:**
${tonePrompt}

**요구사항:**
1. 원본 내용의 핵심 정보를 모두 포함해야 합니다
2. 말투만 변경하고 구조는 유지하세요
3. 자연스럽고 자연스러운 표현으로 재작성하세요
4. 불필요한 설명이나 주석 없이 재작성된 대본만 출력하세요

재작성된 대본:
`.trim()

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    })

    const response = await result.response
    const rewrittenScript = response.text().trim()

    console.log(`✅ 스크립트 재작성 완료: ${rewrittenScript.length}자`)

    return NextResponse.json({
      success: true,
      rewrittenScript: rewrittenScript
    })

  } catch (error: any) {
    console.error('스크립트 재작성 오류:', error)
    return NextResponse.json({
      success: false,
      error: 'REWRITE_FAILED',
      message: error.message || '스크립트 재작성에 실패했습니다'
    }, { status: 500 })
  }
}

