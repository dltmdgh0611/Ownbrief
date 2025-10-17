# 온브리프 아키텍처

## 🏗️ 시스템 개요

온브리프는 사용자의 다양한 데이터 소스를 분석하여 초개인화된 브리핑을 제공하는 서비스입니다.

## 📦 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: Tailwind CSS
- **State Management**: React Hooks
- **Authentication**: NextAuth.js

### Backend
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **AI**: Google Gemini 2.0 Flash

### External Services
- **Storage**: Supabase Storage
- **OAuth**: Google, Slack, Notion
- **APIs**: Gmail, Calendar, YouTube, Slack, Notion

## 🔄 데이터 흐름

### 1. 온보딩 & 페르소나 생성
```
사용자 로그인 (Google OAuth)
  ↓
서비스 연동 (Gmail, Calendar, YouTube)
  ↓
데이터 수집 (병렬)
  ├─ Gmail: 이메일 분석 (70% 비중)
  ├─ Calendar: 일정 패턴 분석
  ├─ YouTube: 플레이리스트 분석 (30% 비중)
  ├─ Slack: 커뮤니케이션 스타일 분석
  └─ Notion: 업무 스타일 분석
  ↓
Gemini AI로 페르소나 생성
  - workStyle: morning-person | night-owl | flexible
  - interests: 다양한 카테고리에서 8-10개 추출
  - communicationStyle: collaborative | independent | hybrid
  - preferredTime: morning | afternoon | evening
  ↓
DB에 저장 (UserPersona 테이블)
```

### 2. 브리핑 생성 (실시간)
```
사용자가 Play 버튼 클릭
  ↓
실시간 데이터 수집
  ├─ Calendar: 오늘/내일 일정
  ├─ Gmail: 미읽음 중요 메일
  ├─ Persona: 사용자 관심사
  └─ 외부 API: 트렌드, 뉴스
  ↓
Gemini AI로 스크립트 생성
  - 페르소나 기반 맞춤화
  - 다양한 관심사 균형있게 반영
  ↓
TTS (Text-to-Speech) 변환
  - Gemini TTS API
  - 스트리밍 방식
  ↓
클라이언트로 실시간 전송 (SSE)
  - 생성 상태 업데이트
  - 스크립트 및 오디오 스트리밍
```

## 📂 디렉토리 구조

```
ownbrief/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── auth/                 # 인증 (NextAuth)
│   │   │   ├── [...nextauth]/   # NextAuth 핸들러
│   │   │   └── reauthorize-google/  # Google 재인증
│   │   ├── briefing/             # 브리핑 생성 & 재생
│   │   │   ├── generate-stream/ # SSE 스트리밍
│   │   │   ├── latest/          # 최신 브리핑 조회
│   │   │   └── [id]/play/       # 오디오 재생
│   │   ├── health/               # 헬스체크
│   │   ├── onboarding/           # 온보딩
│   │   │   └── status/          # 온보딩 상태 확인
│   │   ├── openapi/              # API 문서
│   │   ├── persona/              # 페르소나 관리
│   │   │   ├── generate/        # 페르소나 생성
│   │   │   ├── confirm/         # 페르소나 확인
│   │   │   ├── feedback/        # 피드백 제출
│   │   │   └── route.ts         # 페르소나 조회/업데이트
│   │   └── user/                 # 사용자 관리
│   │       ├── settings/        # 설정 조회/업데이트
│   │       └── delete/          # 계정 삭제
│   ├── onboarding/               # 온보딩 페이지
│   ├── settings/                 # 설정 페이지
│   ├── welcome/                  # 웰컴 페이지
│   └── page.tsx                  # 메인 페이지
│
├── backend/                      # 백엔드 로직
│   ├── controllers/              # 컨트롤러
│   │   └── user.controller.ts   # 사용자 컨트롤러
│   ├── lib/                      # 라이브러리
│   │   ├── auth.ts              # NextAuth 설정
│   │   ├── prisma.ts            # Prisma 클라이언트
│   │   ├── gemini.ts            # Gemini AI 클라이언트
│   │   ├── calendar.ts          # Google Calendar 클라이언트
│   │   ├── gmail.ts             # Gmail 클라이언트
│   │   ├── youtube.ts           # YouTube 클라이언트
│   │   ├── slack.ts             # Slack 클라이언트
│   │   ├── notion.ts            # Notion 클라이언트
│   │   └── supabase.ts          # Supabase 클라이언트
│   └── services/                 # 서비스 레이어
│       ├── briefing.service.ts  # 브리핑 생성 서비스
│       ├── persona.service.ts   # 페르소나 생성/관리 서비스
│       └── user.service.ts      # 사용자 서비스
│
├── frontend/                     # 프론트엔드 컴포넌트
│   ├── components/               # React 컴포넌트
│   │   ├── BriefingPlayer.tsx   # 브리핑 플레이어 (메인)
│   │   ├── GenerationStatus.tsx # 생성 상태 표시
│   │   ├── ScriptViewer.tsx     # 스크립트 뷰어
│   │   ├── ConnectedServices.tsx # 연동 서비스 표시
│   │   ├── Header.tsx           # 헤더
│   │   ├── OnboardingCheck.tsx  # 온보딩 확인
│   │   └── SkeletonLoader.tsx   # 로딩 스켈레톤
│   └── hooks/                    # Custom Hooks
│       └── useOnboarding.ts     # 온보딩 훅
│
├── prisma/                       # Prisma ORM
│   ├── schema.prisma            # 데이터베이스 스키마
│   └── migrations/              # 마이그레이션 파일
│
└── docs/                         # 문서
    ├── architecture.md          # 아키텍처 문서 (현재 파일)
    ├── database-schema.md       # 데이터베이스 스키마
    ├── hyper-persona-refactoring.md  # 리팩토링 계획
    ├── MIGRATION_GUIDE.md       # 마이그레이션 가이드
    └── IMPLEMENTATION_SUMMARY.md # 구현 요약
```

## 🔐 인증 & 권한

### OAuth 2.0 Flow
```
1. 사용자가 "Google로 로그인" 클릭
2. Google OAuth Consent Screen으로 리다이렉트
3. 사용자가 권한 승인
   - email
   - profile
   - youtube.readonly
   - calendar.readonly
   - gmail.readonly
4. Callback URL로 리다이렉트 + Authorization Code
5. NextAuth가 Access Token & Refresh Token 획득
6. DB에 Account 정보 저장
7. Session 생성 및 유지
```

### 권한 재인증
- `invalid_grant` 오류 발생 시 자동으로 재인증 프로세스 시작
- `/api/auth/reauthorize-google`로 새로운 OAuth URL 생성
- `prompt=consent` 파라미터로 강제 재승인

## 🤖 AI 페르소나 시스템

### 다양성 중심 알고리즘
```typescript
// 19개 카테고리 지원
const categories = [
  '기술/AI', '개발/프로그래밍', '데이터/분석', '클라우드/인프라',
  '비즈니스/스타트업', '마케팅/성장', '금융/투자', '산업/분야',
  '정책/규제', '뉴스/트렌드', '게임/e스포츠', '운동/건강',
  '음악/엔터', '요리/푸드', '여행/라이프', '학습/교육',
  '언어', '예술/디자인', 'XR/메타버스'
]

// 추출 규칙
- Gmail 70% + YouTube 30% 비중
- 카테고리당 최대 2개 키워드
- 전체 8-10개 관심사
- 다양한 카테고리에서 균형있게 추출
```

### AI 프롬프트 전략
- **다양성 우선**: 한 분야 집중 방지
- **빈도 분석**: Gmail에서 자주 등장하는 키워드 우선
- **광고 필터링**: 사람 이름, URL, 광고성 키워드 제거
- **카테고리 분산**: 최소 5개 이상의 다른 카테고리 포함

## 📊 데이터 수집 전략

### Gmail 분석
- **대상**: 최근 30일, 최대 50개 이메일
- **필터링**: 프로모션, 소셜, 스팸 제외
- **광고 감지**: 
  - 발신자: no-reply, marketing, promo, newsletter
  - 제목: unsubscribe, 구독, 광고, 프로모션
- **키워드 추출**:
  - 빈도 2회 이상
  - 2-20자 길이
  - 사람 이름, URL, 숫자 제외
  - 상위 30개 추출

### YouTube 분석
- **대상**: 사용자 생성 플레이리스트
- **추출**: 플레이리스트 제목 및 설명
- **카테고리화**: 기술, 음악, 게임, 교육 등

### Calendar 분석
- **패턴 분석**: 최근 14일 이벤트
- **시간대 선호도**: 아침/저녁형 판단
- **회의 빈도**: 높음/보통/낮음

## 🎯 브리핑 생성 흐름

```
[클라이언트]
  Play 버튼 클릭
    ↓
  SSE 연결 시작
  /api/briefing/generate-stream
    ↓
  실시간 상태 수신
  - "데이터 수집 중..."
  - "스크립트 생성 중..."
  - "음성 변환 중..."
    ↓
  브리핑 완성
  - 스크립트 표시
  - 오디오 재생 시작
```

## 🚀 배포 & 인프라

### Vercel 배포
- **플랫폼**: Vercel
- **환경 변수**:
  - `DATABASE_URL`: PostgreSQL 연결 문자열
  - `NEXTAUTH_SECRET`: NextAuth 시크릿
  - `GEMINI_API_KEY`: Google Gemini API 키
  - `GOOGLE_CLIENT_ID`: Google OAuth 클라이언트 ID
  - `GOOGLE_CLIENT_SECRET`: Google OAuth 시크릿
  - `SUPABASE_URL`: Supabase 프로젝트 URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Supabase 서비스 키

### Supabase
- **Database**: PostgreSQL
- **Storage**: 오디오 파일 저장
- **RLS**: Row Level Security 정책

## 📈 성능 최적화

### 병렬 처리
```typescript
const [calendar, gmail, youtube] = await Promise.allSettled([
  CalendarClient.analyzeRecentEvents(email),
  GmailClient.analyzeRecentEmails(email),
  YouTubeClient.analyzeInterestsFromPlaylists(email),
])
```

### 스트리밍
- Server-Sent Events (SSE)로 실시간 상태 업데이트
- TTS 오디오 스트리밍 (계획)

### 캐싱
- Persona 정보는 DB에 캐싱
- 재생성은 사용자 요청 시에만

## 🔒 보안

### 데이터 보호
- OAuth Token은 암호화 저장
- Refresh Token으로 자동 갱신
- HTTPS only
- CSRF 보호 (NextAuth)

### 권한 관리
- 최소 권한 원칙
- Scope별 세분화된 접근
- 사용자 동의 기반

## 📝 API 설계

### RESTful 원칙
- `GET /api/persona` - 페르소나 조회
- `POST /api/persona/generate` - 페르소나 생성
- `POST /api/persona/confirm` - 페르소나 확인
- `POST /api/persona/feedback` - 피드백 제출
- `GET /api/briefing/generate-stream` - 브리핑 생성 (SSE)
- `GET /api/briefing/latest` - 최신 브리핑 조회
- `GET /api/briefing/[id]/play` - 오디오 재생

### 에러 처리
- 일관된 에러 응답 형식
- 상세한 에러 메시지
- 적절한 HTTP 상태 코드

## 🧪 테스트

### Health Check
- `GET /api/health` - 서버 상태 확인

### OpenAPI 문서
- `GET /api/openapi` - Swagger UI
- 모든 API 엔드포인트 문서화

## 🔄 향후 개선사항

1. **오디오 스트리밍**: Web Audio API 활용한 실시간 재생
2. **배경 음악**: 생성 중 자연스러운 BGM
3. **Slack/Notion 연동**: 완전한 통합
4. **다국어 지원**: 영어, 일본어 등
5. **모바일 앱**: React Native 또는 Flutter
6. **음성 인식**: 사용자 음성 명령
7. **A/B 테스팅**: 페르소나 정확도 개선
