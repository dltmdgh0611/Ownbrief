import { NextRequest, NextResponse } from 'next/server';
import { uploadAudioToStorage } from '@/backend/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('🧪 Supabase Storage 업로드 테스트 시작...');
  
  try {
    // 테스트용 작은 오디오 데이터 생성 (WAV 헤더 + 1초 무음)
    const sampleRate = 24000;
    const duration = 1; // 1초
    const numSamples = sampleRate * duration;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const dataSize = numSamples * blockAlign;

    // WAV 파일 생성
    const buffer = Buffer.alloc(44 + dataSize);
    
    // RIFF 헤더
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);
    
    // fmt 청크
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    
    // data 청크
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    // 나머지는 0 (무음)

    const fileName = `test-podcast-${Date.now()}.wav`;
    
    console.log(`📤 테스트 파일 업로드 시도: ${fileName} (${(buffer.length / 1024).toFixed(2)}KB)`);

    // Supabase Storage에 업로드
    const publicUrl = await uploadAudioToStorage(buffer, fileName, 'audio/wav');

    console.log('✅ Supabase Storage 업로드 성공!');
    console.log('🔗 Public URL:', publicUrl);

    return NextResponse.json({
      success: true,
      fileName,
      fileSize: buffer.length,
      publicUrl,
      message: 'Supabase Storage 업로드 성공!'
    });

  } catch (error: any) {
    console.error('❌ Supabase Storage 업로드 실패:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.code,
        status: error.status
      }
    }, { status: 500 });
  }
}

