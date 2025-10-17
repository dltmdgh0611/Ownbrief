# 온브리프 소스 파일 구조

## 📁 최종 프로젝트 구조 (2025년 업데이트)

```
ownbrief/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # ✅ 인증 관련 API
│   │   │   ├── [...nextauth]/   # NextAuth.js 핸들러
│   │   │   │   └── route.ts
│   │   │   ├── reauthorize/      # 재인증 (레거시)
│   │   │   │   └── route.ts
│   │   │   └── reauthorize-google/  # Google 재인증
│   │   │       └── route.ts
│   │   │
│   │   ├── briefing/             # ✅ 브리핑 생성 & 재생
│   │   │   ├── generate-stream/  # SSE 스트리밍 생성
│   │   │   │   └── route.ts
│   │   │   ├── latest/          # 최신 브리핑 조회
│   │   │   │   └── route.ts
│   │   │   └── [id]/            # 특정 브리핑
│   │   │       └── play/        # 오디오 재생
│   │   │           └── route.ts
│   │   │
│   │   ├── health/               # ✅ 헬스체크
│   │   │   └── route.ts
│   │   │
│   │   ├── onboarding/           # ✅ 온보딩
│   │   │   └── status/          # 온보딩 상태 확인
│   │   │       └── route.ts
│   │   │
│   │   ├── openapi/              # ✅ API 문서 (Swagger)
│   │   │   └── route.ts
│   │   │
│   │   ├── persona/              # ✅ 페르소나 관리
│   │   │   ├── generate/        # 페르소나 생성
│   │   │   │   └── route.ts
│   │   │   ├── confirm/         # 페르소나 확인
│   │   │   │   └── route.ts
│   │   │   ├── feedback/        # 피드백 제출
│   │   │   │   └── route.ts
│   │   │   └── route.ts         # 페르소나 조회/업데이트
│   │   │
│   │   └── user/                 # ✅ 사용자 관리
│   │       ├── settings/        # 설정 조회/업데이트
│   │       │   └── route.ts
│   │       └── delete/          # 계정 삭제
│   │           └── route.ts
│   │
│   ├── onboarding/               # 온보딩 페이지
│   │   └── page.tsx
│   ├── settings/                 # 설정 페이지
│   │   └── page.tsx
│   ├── welcome/                  # 웰컴 페이지
│   │   └── page.tsx
│   ├── globals.css              # 전역 CSS
│   ├── layout.tsx               # 루트 레이아웃
│   ├── page.tsx                 # 메인 페이지 (브리핑 플레이어)
│   └── providers.tsx            # Context Providers
│
├── backend/                      # 백엔드 로직
│   ├── controllers/              # 컨트롤러
│   │   └── user.controller.ts   # 사용자 컨트롤러
│   │
│   ├── lib/                      # 라이브러리 & 클라이언트
│   │   ├── api-client.ts        # API 클라이언트 유틸
│   │   ├── apify-transcript.ts  # Apify 트랜스크립트 (레거시)
│   │   ├── auth.ts              # ✅ NextAuth 설정
│   │   ├── calendar.ts          # ✅ Google Calendar 클라이언트
│   │   ├── elevenlabs.ts        # ElevenLabs TTS (레거시)
│   │   ├── gemini.ts            # ✅ Google Gemini AI 클라이언트
│   │   ├── gmail.ts             # ✅ Gmail 클라이언트
│   │   ├── notion.ts            # ✅ Notion 클라이언트
│   │   ├── prisma.ts            # ✅ Prisma 클라이언트
│   │   ├── referral.ts          # 추천 코드 (레거시)
│   │   ├── slack.ts             # ✅ Slack 클라이언트
│   │   ├── subtitle.ts          # 자막 생성 (레거시)
│   │   ├── supabase.ts          # ✅ Supabase 클라이언트
│   │   └── youtube.ts           # ✅ YouTube 클라이언트
│   │
│   ├── services/                 # 서비스 레이어
│   │   ├── briefing.service.ts  # ✅ 브리핑 생성 서비스
│   │   ├── persona.service.ts   # ✅ 페르소나 생성/관리 서비스
│   │   └── user.service.ts      # ✅ 사용자 서비스
│   │
│   └── types/                    # TypeScript 타입 정의
│       └── index.ts
│
├── frontend/                     # 프론트엔드 컴포넌트
│   ├── components/               # React 컴포넌트
│   │   ├── BriefingPlayer.tsx   # ✅ 브리핑 플레이어 (메인)
│   │   ├── ConnectedServices.tsx # ✅ 연동 서비스 상태 표시
│   │   ├── GenerationStatus.tsx # ✅ 생성 상태 표시
│   │   ├── Header.tsx           # ✅ 앱 헤더
│   │   ├── OnboardingCheck.tsx  # ✅ 온보딩 확인 컴포넌트
│   │   ├── ScriptViewer.tsx     # ✅ 스크립트 뷰어
│   │   └── SkeletonLoader.tsx   # ✅ 로딩 스켈레톤
│   │
│   └── hooks/                    # Custom React Hooks
│       └── useOnboarding.ts     # 온보딩 상태 관리 훅
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma            # ✅ 데이터베이스 스키마
│   └── migrations/              # 마이그레이션 파일
│       ├── 20250923091922_aicast1/
│       ├── 20250923104458_add_user_settings/
│       ├── 20250923133859_add_script_field/
│       ├── 20250923134621_add_script_field_back/
│       ├── 20251008084719_add_interests_and_onboarding/
│       ├── 20251008093044_add_cascade_delete_to_user_settings/
│       ├── 20251010133209_add_delivery_time_and_credits/
│       └── migration_lock.toml
│
├── public/                       # 정적 파일
│   └── audio/                   # 오디오 파일 (레거시)
│
├── docs/                         # 문서
│   ├── architecture.md          # ✅ 아키텍처 문서
│   ├── database-schema.md       # ✅ 데이터베이스 스키마
│   ├── hyper-persona-refactoring.md  # ✅ 리팩토링 계획
│   ├── IMPLEMENTATION_SUMMARY.md # ✅ 구현 요약
│   ├── MIGRATION_GUIDE.md       # ✅ 마이그레이션 가이드
│   ├── openapi.yaml             # ✅ OpenAPI 스펙
│   └── source-files.md          # ✅ 소스 파일 구조 (현재 파일)
│
├── .env.local                    # 환경 변수 (로컬)
├── .gitignore                    # Git 제외 파일
├── LICENSE                       # 라이선스
├── next-env.d.ts                # Next.js 타입 정의
├── next.config.js               # Next.js 설정
├── package.json                 # 의존성 관리
├── package-lock.json            # 의존성 잠금 파일
├── postcss.config.js            # PostCSS 설정
├── README.md                    # 프로젝트 README
├── tailwind.config.js           # Tailwind CSS 설정
├── tsconfig.json                # TypeScript 설정
├── vercel.json                  # Vercel 배포 설정
└── yarn.lock                    # Yarn 잠금 파일
```

## 🗑️ 삭제된 파일/디렉토리 (2025년 피벗 후)

### API 엔드포인트
```
❌ app/api/admin/                 # 크레딧 관리 (폐기)
❌ app/api/cron/                  # 자동 생성 스케줄러 (폐기)
❌ app/api/dev/                   # 개발 테스트 엔드포인트 (삭제)
❌ app/api/podcast/               # 팟캐스트 API (브리핑으로 대체)
❌ app/api/youtube/playlists/     # 플레이리스트 선택 (폐기)
❌ app/api/onboarding/interests/  # 관심사 설정 (페르소나로 대체)
❌ app/api/onboarding/complete/   # 온보딩 완료 (페르소나로 대체)
❌ app/api/user/credits/          # 크레딧 조회 (폐기)
❌ app/api/user/check-token/      # 토큰 확인 (폐기)
```

### 페이지
```
❌ app/dev/                       # 개발 페이지 (삭제)
```

### 프론트엔드 컴포넌트
```
❌ frontend/components/PodcastGenerator.tsx       # BriefingPlayer로 대체
❌ frontend/components/AdminCreditManager.tsx     # 크레딧 시스템 폐기
❌ frontend/components/PricingModal.tsx           # 크레딧 시스템 폐기
❌ frontend/components/ProPlanTooltip.tsx         # 크레딧 시스템 폐기
❌ frontend/components/TokenStatusBanner.tsx      # 토큰 상태 폐기
❌ frontend/components/StepByStepModal.tsx        # 튜토리얼 폐기
❌ frontend/components/PlaylistSkeleton.tsx       # 플레이리스트 폐기
❌ frontend/components/ConnectorsDemo.tsx         # 데모 컴포넌트
❌ frontend/components/LyricsPlayerDemo.tsx       # 데모 컴포넌트
❌ frontend/components/DevModeLink.tsx            # 개발 모드 링크
```

### 백엔드 서비스
```
❌ backend/services/onboarding.service.ts  # 온보딩 서비스 (페르소나로 대체)
❌ backend/services/calendar.service.ts    # lib/calendar.ts로 이동
❌ backend/services/gmail.service.ts       # lib/gmail.ts로 이동
❌ backend/services/slack.service.ts       # lib/slack.ts로 이동
❌ backend/services/notion.service.ts      # lib/notion.ts로 이동
❌ backend/services/podcast.service.ts     # briefing.service.ts로 대체
```

### 컨트롤러
```
❌ backend/controllers/onboarding.controller.ts  # 온보딩 API 삭제
❌ backend/controllers/podcast.controller.ts     # 팟캐스트 API 삭제
```

## ✅ 주요 변경사항 요약

### 1. API 라우트 재구성
- **Podcast → Briefing**: 팟캐스트 생성을 브리핑 생성으로 피벗
- **Admin/Credits 삭제**: 크레딧 시스템 완전 제거
- **Dev 엔드포인트 삭제**: 테스트 API 정리

### 2. 프론트엔드 컴포넌트 간소화
- **BriefingPlayer**: 새로운 메인 플레이어
- **GenerationStatus**: 실시간 생성 상태 표시
- **ScriptViewer**: 스크립트 동기화 뷰어
- **ConnectedServices**: 연동 서비스 상태

### 3. 백엔드 서비스 재구성
- **PersonaService**: AI 기반 페르소나 생성/관리
- **BriefingService**: 실시간 브리핑 생성
- **UserService**: 사용자 관리

### 4. 데이터 모델 변경
- **UserPersona**: 페르소나 정보 저장
- **ConnectedService**: OAuth 토큰 관리
- **Briefing**: 브리핑 기록 (Podcast 대체)

## 🔑 핵심 파일 설명

### 인증
- `backend/lib/auth.ts`: NextAuth 설정, Google OAuth, Custom Adapter
- `app/api/auth/[...nextauth]/route.ts`: NextAuth 핸들러

### 페르소나
- `backend/services/persona.service.ts`: 페르소나 생성/관리 로직
- `backend/lib/gmail.ts`: Gmail 분석 (70% 비중)
- `backend/lib/youtube.ts`: YouTube 분석 (30% 비중)
- `backend/lib/calendar.ts`: Calendar 패턴 분석

### 브리핑
- `backend/services/briefing.service.ts`: 브리핑 생성 오케스트레이션
- `app/api/briefing/generate-stream/route.ts`: SSE 스트리밍 엔드포인트
- `frontend/components/BriefingPlayer.tsx`: 메인 플레이어 UI

### 데이터베이스
- `prisma/schema.prisma`: 데이터베이스 스키마 정의
- `backend/lib/prisma.ts`: Prisma 클라이언트 싱글톤

## 📊 파일 통계

### 총 파일 수
- **API Routes**: 15개
- **Pages**: 4개 (메인, 온보딩, 설정, 웰컴)
- **Frontend Components**: 7개
- **Backend Services**: 3개
- **Backend Libraries**: 12개
- **Controllers**: 1개

### 코드 라인 수 (추정)
- **TypeScript**: ~8,000 라인
- **React/TSX**: ~2,000 라인
- **Prisma Schema**: ~200 라인
- **Documentation**: ~1,500 라인

## 🚀 다음 단계

### 추가 예정
1. **오디오 스트리밍**: Web Audio API 구현
2. **배경 음악**: 생성 중 BGM
3. **Slack/Notion 완전 통합**: 현재는 기본 연동만
4. **다국어 지원**: i18n 추가
5. **모바일 최적화**: 반응형 개선

### 제거 예정
1. **레거시 파일 정리**:
   - `backend/lib/apify-transcript.ts`
   - `backend/lib/elevenlabs.ts`
   - `backend/lib/referral.ts`
   - `backend/lib/subtitle.ts`
2. **빈 디렉토리**: `public/audio`

## 📝 코딩 컨벤션

### 파일 명명
- **Components**: PascalCase (예: `BriefingPlayer.tsx`)
- **Services**: camelCase.service.ts (예: `persona.service.ts`)
- **Lib**: camelCase.ts (예: `gmail.ts`)
- **API Routes**: route.ts (Next.js App Router 규칙)

### 디렉토리 구조
- `/app`: Next.js App Router (Pages & API)
- `/backend`: 비즈니스 로직
- `/frontend`: UI 컴포넌트
- `/docs`: 문서

### Import 순서
1. External libraries (React, Next.js)
2. Internal libraries (`@/backend`, `@/frontend`)
3. Relative imports (`./`, `../`)
4. Types

## 🔍 찾기 쉬운 파일 가이드

### "페르소나 생성 로직을 수정하고 싶다면?"
→ `backend/services/persona.service.ts`

### "브리핑 생성 흐름을 이해하고 싶다면?"
→ `backend/services/briefing.service.ts`

### "Gmail 분석 알고리즘을 바꾸고 싶다면?"
→ `backend/lib/gmail.ts`

### "메인 페이지 UI를 수정하고 싶다면?"
→ `app/page.tsx` + `frontend/components/BriefingPlayer.tsx`

### "데이터베이스 스키마를 확인하고 싶다면?"
→ `prisma/schema.prisma` + `docs/database-schema.md`

### "API 엔드포인트를 추가하고 싶다면?"
→ `app/api/` 하위에 새 디렉토리 생성

## 📖 추가 문서

- **[Architecture](./architecture.md)**: 시스템 아키텍처
- **[Database Schema](./database-schema.md)**: 데이터베이스 구조
- **[Migration Guide](./MIGRATION_GUIDE.md)**: 마이그레이션 가이드
- **[Implementation Summary](./IMPLEMENTATION_SUMMARY.md)**: 구현 요약
