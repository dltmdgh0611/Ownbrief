# AI Cast - AI 팟캐스트 생성기

유튜브 나중에 볼 동영상을 바탕으로 AI가 팟캐스트를 생성하는 웹 애플리케이션입니다.

## ✨ 기능

- 🔐 구글 OAuth 로그인
- 📺 유튜브 플레이리스트 연동
- 📝 자동 자막 추출
- 🤖 Gemini API를 통한 팟캐스트 스크립트 생성
- 🎙️ Gemini 2.5 TTS를 통한 네이티브 다중 화자 음성 생성
- 🎵 웹에서 팟캐스트 재생
- ☁️ Supabase 클라우드 데이터베이스

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (풀스택 프레임워크)
- **Authentication**: NextAuth.js (JWT 전략)
- **Database**: Supabase PostgreSQL + Prisma ORM
- **APIs**: Google YouTube API, Gemini API (스크립트 생성 + TTS)
- **Deployment**: Vercel (자동 배포)

## 📁 프로젝트 구조

```
aicast/
├── app/                      # Next.js App Router (라우팅)
│   ├── api/                  # API 엔드포인트
│   └── (pages)/              # 페이지 컴포넌트
├── backend/                  # 백엔드 로직
│   ├── controllers/          # API 컨트롤러
│   ├── services/             # 비즈니스 로직
│   ├── lib/                  # 유틸리티 & 외부 API
│   └── types/                # TypeScript 타입
├── frontend/                 # 프론트엔드 UI
│   ├── components/           # React 컴포넌트
│   └── hooks/                # 커스텀 훅
└── prisma/                   # 데이터베이스 스키마
```

상세한 구조 설명은 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)를 참조하세요.

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone <repository-url>
cd aicast
```

### 2. 의존성 설치

```bash
# Yarn 권장 (빠름)
yarn install

# 또는 npm
npm install
```

### 3. 환경 변수 설정

```bash
# .env.local 파일 생성
cp env.example .env.local
```

`.env.local` 파일을 편집하여 필요한 API 키를 입력하세요:

```env
# Supabase PostgreSQL
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Gemini API
GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Supabase 설정

Supabase 데이터베이스 설정은 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)를 참조하세요.

요약:
1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. Database URL 복사
3. `.env.local`에 `DATABASE_URL` 설정

### 5. 데이터베이스 마이그레이션

```bash
# Prisma 클라이언트 생성
yarn db:generate

# 마이그레이션 실행
yarn db:migrate
```

### 6. 개발 서버 실행

```bash
yarn dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 🔑 API 키 발급 가이드

### 1. Google OAuth & YouTube API
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성
3. **YouTube Data API v3** 활성화
4. OAuth 2.0 클라이언트 ID 생성
5. 승인된 리디렉션 URI: `http://localhost:3000/api/auth/callback/google`
6. Scope 추가: `youtube.readonly`, `youtube`

### 2. Gemini API
1. [Google AI Studio](https://makersuite.google.com/app/apikey) 접속
2. API 키 생성
3. Gemini 2.5 Flash 및 TTS 모델 사용 가능

### 3. Supabase Database
1. [Supabase](https://supabase.com) 계정 생성
2. 새 프로젝트 생성
3. Database URL 복사

자세한 설정은 [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 참조

## 📖 사용 방법

1. **로그인**: Google 계정으로 로그인
2. **설정**: 설정 페이지에서 YouTube 플레이리스트 선택
3. **생성**: "팟캐스트 생성하기" 버튼 클릭
4. **대기**: AI가 자막 추출 → 스크립트 생성 → 음성 생성
5. **재생**: 생성된 팟캐스트를 웹에서 재생

## 🚢 배포

Vercel을 통한 배포 가이드는 [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)를 참조하세요.

간단 요약:
```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel
```

또는 GitHub 연동으로 자동 배포 설정

## 🔧 개발 스크립트

```bash
# 개발 서버 실행
yarn dev

# 프로덕션 빌드
yarn build

# 프로덕션 서버 실행
yarn start

# Prisma Studio (DB GUI)
yarn db:studio

# 데이터베이스 마이그레이션
yarn db:migrate

# Prisma 클라이언트 생성
yarn db:generate

# 데이터베이스 리셋 (주의!)
yarn db:reset
```

## 🏗️ 아키텍처

### 계층 구조
```
┌─────────────────────────────┐
│  Frontend (React)           │  사용자 인터페이스
├─────────────────────────────┤
│  API Routes (Next.js)       │  HTTP 엔드포인트
├─────────────────────────────┤
│  Controllers                │  요청/응답 처리
├─────────────────────────────┤
│  Services                   │  비즈니스 로직
├─────────────────────────────┤
│  Prisma ORM                 │  데이터베이스 접근
├─────────────────────────────┤
│  Supabase PostgreSQL        │  클라우드 데이터베이스
└─────────────────────────────┘
```

상세한 아키텍처는 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) 참조

## 📚 주요 문서

### 프로젝트 문서
- [docs/architecture.md](./docs/architecture.md) - 시스템 아키텍처 및 데이터 흐름
- [docs/database-schema.md](./docs/database-schema.md) - 데이터베이스 스키마 명세
- [docs/source-files.md](./docs/source-files.md) - 모든 소스 파일 상세 설명
- [docs/openapi.yaml](./docs/openapi.yaml) - OpenAPI 3.0 API 명세

### API 문서
- **Swagger UI**: [http://localhost:3000/dev/api-docs](http://localhost:3000/dev/api-docs) (개발 서버 실행 시)
- 29개의 API 엔드포인트 문서화
- 요청/응답 스키마 및 예제 포함
- 직접 API 테스트 가능

### 설정 가이드
- [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) - 프로젝트 구조 상세 설명
- [GEMINI_QUOTA_FIX_STEP_BY_STEP.md](./GEMINI_QUOTA_FIX_STEP_BY_STEP.md) - 🔥 Gemini 429 에러 해결 (스크린샷 가이드)
- [GEMINI_429_QUOTA_FIX.md](./GEMINI_429_QUOTA_FIX.md) - Gemini 할당량 초과 상세 가이드
- [GEMINI_API_SETUP.md](./GEMINI_API_SETUP.md) - Gemini API 설정 가이드
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase 설정 가이드
- [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) - Vercel 배포 가이드

## 🐛 문제 해결

### Gemini 429 할당량 초과 에러 🔥
**"429 Too Many Requests" 에러 발생 시:**

**즉시 해결 방법 (1분 소요):**
1. https://aistudio.google.com/app/apikey 접속
2. **"Create API key in new project"** 클릭
3. 새 API 키 복사
4. `.env.local` 파일에 붙여넣기
5. `yarn dev` 재시작

**자세한 해결 방법:**
- 스크린샷 단위 가이드: [GEMINI_QUOTA_FIX_STEP_BY_STEP.md](./GEMINI_QUOTA_FIX_STEP_BY_STEP.md)
- 상세 설명: [GEMINI_429_QUOTA_FIX.md](./GEMINI_429_QUOTA_FIX.md)

### 세션 만료 오류
- 자동 로그아웃 처리가 구현되어 있습니다
- 5분마다 세션 자동 갱신
- 401 에러 시 자동으로 로그인 페이지로 이동

### Prisma 클라이언트 오류
```bash
yarn db:generate
```

### 데이터베이스 연결 오류
- DATABASE_URL 확인
- Supabase 프로젝트가 활성 상태인지 확인

## 🤝 기여

이슈와 풀 리퀘스트를 환영합니다!

## 📄 라이선스

MIT License

## 🙏 감사의 말

- Next.js 팀
- Vercel
- Supabase
- Google Gemini AI
- Prisma