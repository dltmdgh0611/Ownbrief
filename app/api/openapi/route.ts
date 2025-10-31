import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    // docs/openapi.yaml 파일 읽기
    const filePath = path.join(process.cwd(), 'docs', 'openapi.yaml')
    const fileContents = await readFile(filePath, 'utf8')

    return new NextResponse(fileContents, {
      headers: {
        'Content-Type': 'application/x-yaml',
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    console.error('OpenAPI 스펙 로드 실패:', error)
    return NextResponse.json(
      { error: 'OpenAPI 스펙을 찾을 수 없습니다.' },
      { status: 404 }
    )
  }
}







