# 개발 모드 테스트 가이드

## 환경 변수 설정

`.env.local` 파일을 프로젝트 루트에 생성하고 다음 내용을 추가하세요:

```env
# NextAuth 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth 설정 (Google Cloud Console에서 발급)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# API 키들
GEMINI_API_KEY=your-gemini-api-key
YOUTUBE_API_KEY=your-youtube-api-key
OPENAI_API_KEY=your-openai-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key

# Supabase 설정 (선택사항)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 데이터베이스 설정
DATABASE_URL="file:./dev.db"

# 개발 모드 설정
NODE_ENV=development
```

## 개발 서버 실행

```bash
# 의존성 설치
yarn install

# 데이터베이스 마이그레이션
yarn db:migrate

# 개발 서버 시작
yarn dev
```

## 테스트 시나리오

### 1. 기본 브리핑 테스트
- 브라우저에서 `http://localhost:3000` 접속
- Google 로그인
- 브리핑 재생 버튼 클릭
- 콘솔에서 로그 확인

### 2. API 테스트
- `http://localhost:3000/api/health` - 서버 상태 확인
- `http://localhost:3000/api/openapi` - API 문서 확인

### 3. 데이터베이스 확인
```bash
yarn db:studio
```

## 디버깅 팁

### 콘솔 로그 확인
브라우저 개발자 도구에서 다음 로그들을 확인하세요:
- `🎤 섹션 X 재생 시작/종료`
- `🔄 섹션 X 준비 중`
- `🎵 TTS 생성 완료`
- `🔄 Calendar/Gmail: Refreshing expired access token`

### 네트워크 탭 확인
- `/api/briefing/next-section` 요청
- `/api/tts/generate` 요청
- Google API 호출

### 오류 해결
1. **인증 오류**: Google OAuth 설정 확인
2. **TTS 오류**: GEMINI_API_KEY 확인
3. **데이터베이스 오류**: `yarn db:migrate` 실행
4. **포트 충돌**: 다른 포트 사용 (`yarn dev -p 3001`)
