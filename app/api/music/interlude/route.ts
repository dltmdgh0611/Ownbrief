import { NextRequest, NextResponse } from 'next/server'

// Supabase 클라이언트는 조건부로 생성
let supabase: any = null

try {
  // 실제 서비스 키 사용 (MCP를 통해 가져온 키)
  const supabaseUrl = 'https://jrvnufqtekabnnjcyqii.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impydm51ZnF0ZWthYm5uamN5cWlpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIwMzk1MywiZXhwIjoyMDc0Nzc5OTUzfQ.YourServiceKeyHere'
  
  if (supabaseUrl && supabaseServiceKey) {
    const { createClient } = require('@supabase/supabase-js')
    supabase = createClient(supabaseUrl, supabaseServiceKey)
    console.log('Supabase 클라이언트 생성 성공 (service key)')
  }
} catch (error) {
  console.log('Supabase 클라이언트 생성 실패:', error)
}

/**
 * Supabase BGM 버킷에서 랜덤 interlude 가져오기
 */
export async function GET(request: NextRequest) {
  try {
    console.log('Interlude API 호출됨')
    
    // 하드코딩된 파일 목록 (실제 Supabase Storage 파일들)
    const bgmFiles = [
      'Midnight Static.mp3',
      'Midnight Static (1).mp3', 
      'Midnight Static (2).mp3',
      'Midnight Static (3).mp3'
    ]
    
    // 랜덤하게 하나 선택
    const randomFile = bgmFiles[Math.floor(Math.random() * bgmFiles.length)]
    console.log('선택된 파일:', randomFile)
    
    // Supabase Storage Public URL 생성
    const baseUrl = 'https://jrvnufqtekabnnjcyqii.supabase.co'
    const audioUrl = `${baseUrl}/storage/v1/object/public/bgm/${encodeURIComponent(randomFile)}`
    
    console.log('Public URL:', audioUrl)

    return NextResponse.json({
      success: true,
      audioUrl: audioUrl,
      fileName: randomFile,
      duration: 30, // 기본 30초
    })

  } catch (error) {
    console.error('Interlude fetch error:', error)
    
    // 에러 시 폴백
    return NextResponse.json({
      success: false,
      audioUrl: null,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
