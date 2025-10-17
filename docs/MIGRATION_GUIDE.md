# 브리핑 서비스 피벗 마이그레이션 가이드

## 🎉 완료된 작업

### Phase 0: 코드 정리 ✅
- ✅ 팟캐스트 관련 API 제거 (`app/api/podcast/*`)
- ✅ 미사용 프론트엔드 컴포넌트 제거
- ✅ 미사용 백엔드 서비스 제거
- ✅ Vercel cron 설정 제거

### 인프라 구축 ✅
- ✅ Prisma 스키마 업데이트 (UserPersona, ConnectedService, Briefing 테이블 추가)
- ✅ Google OAuth scopes 확장 (Calendar, Gmail 추가)
- ✅ Slack, Notion 패키지 추가

### 백엔드 구현 ✅
- ✅ Calendar API 클라이언트 (`backend/lib/calendar.ts`)
- ✅ Gmail API 클라이언트 (`backend/lib/gmail.ts`)
- ✅ Slack API 클라이언트 (`backend/lib/slack.ts`)
- ✅ Notion API 클라이언트 (`backend/lib/notion.ts`)
- ✅ PersonaService (`backend/services/persona.service.ts`)
- ✅ BriefingService (`backend/services/briefing.service.ts`)
- ✅ 데이터 수집 서비스들 (Calendar, Gmail, Slack, Notion)

### API 엔드포인트 ✅
- ✅ 브리핑 생성 스트리밍 API (`/api/briefing/generate-stream`)
- ✅ 최근 브리핑 조회 API (`/api/briefing/latest`)
- ✅ 재생 횟수 증가 API (`/api/briefing/[id]/play`)
- ✅ 페르소나 생성 API (`/api/persona/generate`)
- ✅ 페르소나 조회/업데이트 API (`/api/persona`)
- ✅ 페르소나 피드백 API (`/api/persona/feedback`)
- ✅ 온보딩 상태 API 업데이트 (`/api/onboarding/status`)

---

## 📋 다음 단계

### 1. 패키지 설치

```bash
npm install
# 또는
yarn install
```

### 2. 데이터베이스 마이그레이션

**중요**: 기존 데이터베이스를 백업하세요!

```bash
# 백업 (프로덕션 환경)
pg_dump DATABASE_URL > backup_$(date +%Y%m%d).sql

# 마이그레이션 생성 및 실행
npx prisma migrate dev --name hyper_persona_refactoring

# Prisma 클라이언트 재생성
npx prisma generate
```

### 3. 환경 변수 설정

`.env.local` 파일에 다음 변수들이 설정되어 있는지 확인하세요:

```env
# 기존 변수들
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GEMINI_API_KEY=

# 신규 (Slack, Notion은 추후 설정)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
```

**참고**: Google Cloud Console에서 OAuth 동의 화면의 Scopes에 다음을 추가해야 합니다:
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/gmail.readonly`

### 4. 개발 서버 실행

```bash
npm run dev
```

### 5. 기존 사용자 처리

기존 사용자들은 다음 번 로그인 시 자동으로 온보딩 페이지로 리다이렉트됩니다.
- UserSettings의 `selectedPlaylists`, `deliveryTimeHour` 등 필드는 더 이상 사용되지 않습니다
- 기존 Podcast 데이터는 보존되지만 새로운 Briefing 시스템으로 대체됩니다

---

## 🚧 TODO: 프론트엔드 구현

다음 단계에서 구현이 필요합니다:

### 온보딩 페이지 재설계
- [ ] `app/onboarding/page.tsx` 완전 재작성
  - Step 1: 환영 화면
  - Step 2: 서비스 연결 (Google, Slack, Notion)
  - Step 3: 페르소나 생성 중 (로딩)
  - Step 4: 페르소나 확인 및 피드백
  - Step 5: 완료

### 메인 화면 재설계
- [ ] `frontend/components/BriefingPlayer.tsx` 생성
  - 중앙 재생 버튼
  - 실시간 생성 상태 표시
  - 스크립트 뷰어
- [ ] `frontend/components/GenerationStatus.tsx` 생성
- [ ] `frontend/components/ScriptViewer.tsx` 생성 (LyricsPlayerDemo 기반)
- [ ] `frontend/components/ConnectedServices.tsx` 생성
- [ ] `app/page.tsx` 업데이트 (BriefingPlayer 사용)

### 오디오 스트리밍
- [ ] Web Audio API 기반 오디오 스트리밍 재생
- [ ] 로딩 배경 음악 추가
- [ ] Gemini TTS 스트리밍 구현

### Slack/Notion OAuth 통합
- [ ] Slack App 생성 및 OAuth 설정
- [ ] Notion Integration 생성 및 OAuth 설정
- [ ] NextAuth에 Slack, Notion 프로바이더 추가

---

## 🔍 테스트 체크리스트

### API 테스트
- [ ] `/api/onboarding/status` - 온보딩 상태 확인
- [ ] `/api/persona/generate` - 페르소나 생성
- [ ] `/api/persona` - 페르소나 조회
- [ ] `/api/briefing/generate-stream` - 브리핑 스트리밍 생성
- [ ] `/api/briefing/latest` - 최근 브리핑 조회

### 데이터 수집 테스트
- [ ] Google Calendar 연동
- [ ] Gmail 연동
- [ ] Slack 연동 (앱 설정 후)
- [ ] Notion 연동 (통합 설정 후)

### 페르소나 생성 테스트
- [ ] 신규 사용자 페르소나 자동 생성
- [ ] 페르소나 피드백 제출
- [ ] 페르소나 확인 완료

### 브리핑 생성 테스트
- [ ] 데이터 병렬 수집
- [ ] 스크립트 생성
- [ ] 부분 브리핑 (일부 서비스 실패 시)
- [ ] 스트리밍 재생

---

## 📝 주요 변경사항

### 데이터베이스
- **UserPersona** 테이블 추가: AI 생성 페르소나 저장
- **ConnectedService** 테이블 추가: Slack, Notion 등 서비스 토큰 관리
- **Briefing** 테이블 추가: 기존 Podcast 대체
- **UserSettings** 필드 제거: `selectedPlaylists`, `deliveryTimeHour`, `deliveryTimeMinute`, `onboardingCompleted`

### OAuth Scopes
- Google: Calendar, Gmail API 추가
- Slack: 신규 추가 (설정 필요)
- Notion: 신규 추가 (설정 필요)

### 아키텍처
- 팟캐스트 목록 → 단일 브리핑 재생
- 일괄 생성 → 실시간 스트리밍
- 수동 설정 → AI 페르소나 자동 생성

---

## 🆘 문제 해결

### 마이그레이션 실패
```bash
# 마이그레이션 롤백
npx prisma migrate reset

# 백업에서 복구
psql DATABASE_URL < backup_YYYYMMDD.sql
```

### OAuth Scope 에러
Google Cloud Console에서 OAuth 동의 화면 → Scopes 섹션에 다음 추가:
- `.../auth/calendar.readonly`
- `.../auth/gmail.readonly`

### Prisma 클라이언트 타입 에러
```bash
npx prisma generate
```

---

## 📞 지원

문제가 발생하면 `docs/hyper-persona-refactoring.md` 문서를 참고하세요.



