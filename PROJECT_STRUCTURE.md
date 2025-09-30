# 프로젝트 구조 설명

이 문서는 aicast 프로젝트의 폴더 구조와 파일 구성을 설명합니다.

## 📁 전체 구조

```
aicast/
├── app/                      # Next.js App Router (라우팅만 담당)
│   ├── api/                  # API 엔드포인트 (얇은 레이어)
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts    # NextAuth 인증
│   │   ├── podcast/
│   │   │   ├── route.ts                  # GET /api/podcast
│   │   │   ├── [id]/audio/route.ts       # GET /api/podcast/:id/audio
│   │   │   ├── generate/route.ts         # POST /api/podcast/generate
│   │   │   ├── generate-voice/route.ts   # POST /api/podcast/generate-voice
│   │   │   ├── videos/route.ts           # POST /api/podcast/videos
│   │   │   ├── script/route.ts           # POST /api/podcast/script
│   │   │   └── script-stream/route.ts    # POST /api/podcast/script-stream
│   │   ├── user/
│   │   │   ├── settings/route.ts         # GET/POST /api/user/settings
│   │   │   └── delete/route.ts           # DELETE /api/user/delete
│   │   └── youtube/
│   │       └── playlists/route.ts        # GET /api/youtube/playlists
│   ├── globals.css           # 전역 스타일
│   ├── layout.tsx            # 루트 레이아웃
│   ├── page.tsx              # 메인 페이지 (/)
│   ├── providers.tsx         # React 프로바이더 (SessionProvider)
│   └── settings/
│       └── page.tsx          # 설정 페이지 (/settings)
│
├── backend/                  # 백엔드 로직 (비즈니스 로직 & 데이터)
│   ├── controllers/          # API 컨트롤러 (요청/응답 처리)
│   │   ├── podcast.controller.ts    # 팟캐스트 관련 컨트롤러
│   │   └── user.controller.ts       # 사용자 관련 컨트롤러
│   ├── services/             # 비즈니스 로직 (데이터 처리)
│   │   ├── podcast.service.ts       # 팟캐스트 서비스
│   │   └── user.service.ts          # 사용자 서비스
│   ├── lib/                  # 유틸리티 & 외부 서비스 연동
│   │   ├── api-client.ts     # 프론트엔드 API 클라이언트
│   │   ├── apify-transcript.ts      # Apify 자막 추출
│   │   ├── auth.ts           # NextAuth 설정
│   │   ├── elevenlabs.ts     # ElevenLabs 음성 생성
│   │   ├── gemini.ts         # Google Gemini AI
│   │   ├── prisma.ts         # Prisma 클라이언트
│   │   ├── subtitle.ts       # 자막 처리
│   │   └── youtube.ts        # YouTube API
│   └── types/                # TypeScript 타입 정의
│       └── index.ts          # 공통 타입
│
├── frontend/                 # 프론트엔드 코드 (UI 컴포넌트)
│   ├── components/           # React 컴포넌트
│   │   ├── Header.tsx        # 헤더 컴포넌트
│   │   ├── PodcastGenerator.tsx     # 팟캐스트 생성 UI
│   │   ├── PodcastGenerationModal.tsx
│   │   └── StepByStepModal.tsx      # 단계별 생성 모달
│   └── hooks/                # 커스텀 React 훅 (향후 확장)
│
├── prisma/                   # Prisma ORM 설정
│   ├── schema.prisma         # 데이터베이스 스키마
│   ├── migrations/           # 마이그레이션 파일
│   └── dev.db               # SQLite 개발 DB (사용 안 함)
│
├── public/                   # 정적 파일
│   └── audio/               # 생성된 오디오 파일
│
├── .gitignore               # Git 무시 파일
├── next.config.js           # Next.js 설정
├── package.json             # 의존성 관리
├── tsconfig.json            # TypeScript 설정
├── tailwind.config.js       # Tailwind CSS 설정
├── postcss.config.js        # PostCSS 설정
│
├── env.example              # 환경 변수 예제
├── README.md                # 프로젝트 소개
├── SUPABASE_SETUP.md        # Supabase 설정 가이드
├── VERCEL_DEPLOY.md         # Vercel 배포 가이드
└── PROJECT_STRUCTURE.md     # 이 문서
```

## 🎯 아키텍처 설계 원칙

### 1. **관심사의 분리 (Separation of Concerns)**
- **app/**: 라우팅만 담당 (얇은 레이어)
- **backend/**: 비즈니스 로직과 데이터 처리
- **frontend/**: UI 컴포넌트와 사용자 상호작용

### 2. **계층 구조 (Layered Architecture)**
```
┌─────────────────────────────────────┐
│  app/api/*/route.ts (라우터)        │
│  ↓ 요청 전달                        │
│  backend/controllers/ (컨트롤러)    │
│  ↓ 비즈니스 로직 호출               │
│  backend/services/ (서비스)         │
│  ↓ 데이터 처리                      │
│  backend/lib/prisma (데이터베이스)  │
└─────────────────────────────────────┘
```

### 3. **책임의 명확화**
- **route.ts**: HTTP 요청만 받아서 컨트롤러로 전달
- **controller**: 인증 확인, 입력 검증, 응답 포맷팅
- **service**: 실제 비즈니스 로직, 데이터 CRUD
- **lib**: 외부 API 연동, 유틸리티 함수

## 📝 파일별 역할

### API Routes (app/api/)
각 `route.ts`는 **라우터 역할만** 수행:
```typescript
// ❌ 나쁜 예: route.ts에 비즈니스 로직
export async function GET() {
  const user = await prisma.user.findUnique(...)
  const podcasts = await prisma.podcast.findMany(...)
  // ... 복잡한 로직
}

// ✅ 좋은 예: route.ts는 얇게 유지
export async function GET() {
  return getPodcasts()  // 컨트롤러로 위임
}
```

### Controllers (backend/controllers/)
**역할**:
- 인증 확인 (`getServerSession`)
- 입력 데이터 검증
- 서비스 계층 호출
- HTTP 응답 생성

```typescript
export async function getPodcasts() {
  const session = await getServerSession(authOptions)
  if (!session) return 401
  
  const podcasts = await PodcastService.getUserPodcasts(...)
  return NextResponse.json(podcasts)
}
```

### Services (backend/services/)
**역할**:
- 비즈니스 로직 구현
- 데이터베이스 CRUD
- 트랜잭션 처리
- 데이터 변환

```typescript
export class PodcastService {
  static async getUserPodcasts(userEmail: string) {
    // 데이터베이스 조회 및 처리
    return await prisma.podcast.findMany(...)
  }
}
```

### Lib (backend/lib/)
**역할**:
- 외부 API 클라이언트 (YouTube, Gemini, ElevenLabs)
- 유틸리티 함수
- 공통 설정 (Prisma, NextAuth)

### Components (frontend/components/)
**역할**:
- React UI 컴포넌트
- 사용자 상호작용
- 상태 관리 (useState, useEffect)
- API 호출 (apiClient 사용)

## 🔄 데이터 흐름

### 1. 팟캐스트 목록 가져오기 예시
```
사용자 클릭
  ↓
frontend/components/PodcastGenerator.tsx
  ↓ apiGet('/api/podcast')
app/api/podcast/route.ts
  ↓ getPodcasts()
backend/controllers/podcast.controller.ts
  ↓ PodcastService.getUserPodcasts()
backend/services/podcast.service.ts
  ↓ prisma.podcast.findMany()
backend/lib/prisma.ts (Supabase)
```

### 2. 사용자 설정 저장 예시
```
사용자 입력
  ↓
app/settings/page.tsx
  ↓ apiPost('/api/user/settings', data)
app/api/user/settings/route.ts
  ↓ saveUserSettings(data)
backend/controllers/user.controller.ts
  ↓ UserService.saveUserSettings()
backend/services/user.service.ts
  ↓ prisma.userSettings.upsert()
Supabase PostgreSQL
```

## 🎨 코드 스타일 가이드

### Import 경로
```typescript
// 절대 경로 사용 (@/ 프리픽스)
import { apiGet } from '@/backend/lib/api-client'
import Header from '@/frontend/components/Header'
import { PodcastService } from '@/backend/services/podcast.service'
```

### 파일 명명 규칙
- **컴포넌트**: PascalCase (예: `PodcastGenerator.tsx`)
- **서비스**: camelCase.service.ts (예: `podcast.service.ts`)
- **컨트롤러**: camelCase.controller.ts (예: `user.controller.ts`)
- **유틸리티**: kebab-case.ts (예: `api-client.ts`)

## 🔧 확장 방법

### 새로운 API 엔드포인트 추가
1. **서비스 생성** (`backend/services/*.service.ts`)
2. **컨트롤러 생성** (`backend/controllers/*.controller.ts`)
3. **라우트 추가** (`app/api/**/route.ts`)

### 새로운 UI 페이지 추가
1. **컴포넌트 생성** (`frontend/components/*.tsx`)
2. **페이지 추가** (`app/**/page.tsx`)

## 📚 추가 문서

- [README.md](./README.md) - 프로젝트 소개 및 시작 가이드
- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) - Supabase 설정
- [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) - Vercel 배포 가이드
