import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/backend/lib/auth';
import { prisma } from '@/backend/lib/prisma';

export async function POST(request: NextRequest) {
  console.log('🧪 테스트 팟캐스트 업로드 시작...');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const { audioUrl, title, description, duration } = await request.json();

    // 사용자 찾기
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }

    // 테스트 팟캐스트 생성
    const podcast = await prisma.podcast.create({
      data: {
        title: title || '테스트 팟캐스트',
        description: description || '개발자 모드에서 생성한 테스트 팟캐스트입니다.',
        audioUrl: audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        duration: duration || 180, // 기본 3분
        status: 'completed',
        script: '테스트 스크립트\n\n호스트: 안녕하세요! 테스트 팟캐스트입니다.\n\n게스트: 네, 반갑습니다!',
        userId: user.id
      }
    });

    console.log('✅ 테스트 팟캐스트 생성 완료:', podcast.id);

    return NextResponse.json({
      success: true,
      podcast: {
        id: podcast.id,
        title: podcast.title,
        audioUrl: podcast.audioUrl,
        duration: podcast.duration,
        status: podcast.status,
        createdAt: podcast.createdAt
      }
    });

  } catch (error: any) {
    console.error('❌ 테스트 팟캐스트 업로드 실패:', error);
    return NextResponse.json(
      { error: error.message || '팟캐스트 업로드에 실패했습니다' },
      { status: 500 }
    );
  }
}

