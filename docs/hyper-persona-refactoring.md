# OwnBrief 초개인화 브리핑 서비스 재개발 계획

## 1. 프로젝트 개요

기존 YouTube 플레이리스트 기반 팟캐스트 서비스에서 **초개인화 실시간 브리핑 서비스**로 전환합니다.

### 핵심 변경사항

- **기존**: 플레이리스트 기반 팟캐스트 생성 및 목록 관리
- **신규**: 실시간 스트리밍 브리핑 생성 (재생 버튼 클릭 시)
- **데이터 소스**: Google Calendar + Gmail + Slack + Notion + YouTube (관심사)
- **UI**: 팟캐스트 목록 → 단일 재생 화면 (LyricsPlayerDemo 스타일)
- **TTS**: 일괄 생성 → **스트리밍 생성 및 재생**
- **페르소나**: 수동 설정 → **AI 자동 생성 + 사용자 피드백**

## 2. 데이터베이스 스키마

### 신규 테이블

**UserPersona**

```prisma
model UserPersona {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  persona     Json     // AI 생성 페르소나 (업무 스타일, 선호도 등)
  interests   String[] // 자동 추출된 관심사
  workStyle   String?  // "morning-person", "night-owl", "flexible" 등
  
  confirmed   Boolean  @default(false) // 사용자 확인 여부
  feedback    Json?    // 사용자 피드백
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**ConnectedService**

```prisma
model ConnectedService {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  serviceName   String   // "google", "slack", "notion"
  accessToken   String   @db.Text
  refreshToken  String?  @db.Text
  expiresAt     DateTime?
  
  metadata      Json?    // 서비스별 추가 정보
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([userId, serviceName])
}
```

**Briefing**

```prisma
model Briefing {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  script       String   @db.Text
  audioUrl     String?
  duration     Int?     // 초 단위
  
  dataSources  Json     // 사용된 데이터 소스 정보
  playCount    Int      @default(0)
  
  createdAt    DateTime @default(now())
}
```

### 기존 테이블 수정

**UserSettings** - 불필요한 필드 제거

```prisma
// 제거할 필드들:
- selectedPlaylists: String[]
- deliveryTimeHour: Int
- deliveryTimeMinute: Int
- onboardingCompleted: Boolean (UserPersona.confirmed로 대체)

// 유지할 필드들:
- isAdmin: Boolean
- credits: Int
- referralCode: String
- referralCount: Int
```

## 3. OAuth 통합 확장

### Google OAuth (확장)

**기존 Scopes**:
- `openid`, `email`, `profile`
- `https://www.googleapis.com/auth/youtube.readonly`

**추가 Scopes**:
- `https://www.googleapis.com/auth/calendar.readonly`
- `https://www.googleapis.com/auth/gmail.readonly`

### Slack OAuth (신규)

**설정**:
- Slack App 생성 (https://api.slack.com/apps)
- Redirect URI: `{NEXTAUTH_URL}/api/auth/callback/slack`

**Scopes**:
- `channels:read` - 채널 목록 조회
- `groups:read` - 프라이빗 채널 조회
- `im:read` - DM 조회
- `mpim:read` - 그룹 DM 조회
- `users:read` - 사용자 정보
- `channels:history` - 채널 메시지 읽기

### Notion OAuth (신규)

**설정**:
- Notion Integration 생성 (https://www.notion.so/my-integrations)
- Redirect URI: `{NEXTAUTH_URL}/api/auth/callback/notion`

**Scopes**:
- `read_content` - 페이지 및 데이터베이스 읽기
- `read_user` - 사용자 정보

## 4. 온보딩 플로우 재설계

### 새로운 온보딩 단계

**Step 1: 환영 화면**
- 서비스 소개
- "시작하기" 버튼

**Step 2: 서비스 연결**
```
[ ] Google (Calendar + Gmail + YouTube) ✅ 필수
[ ] Slack 🔵 선택
[ ] Notion 🔵 선택
```
- 각 서비스별 OAuth 연결 버튼
- 연결 완료 시 체크마크 표시
- 최소 Google 연결 필수

**Step 3: 페르소나 생성 중**
- 로딩 애니메이션
- "당신의 데이터를 분석하고 있어요..."
- AI가 연동된 데이터로 페르소나 자동 생성
  - Calendar: 일정 패턴, 회의 빈도
  - Gmail: 주요 연락처, 프로젝트 키워드
  - YouTube: 관심사 추출
  - Slack: 팀 커뮤니케이션 스타일
  - Notion: 작업 관리 방식

**Step 4: 페르소나 확인 및 피드백**
```
📊 분석 결과

업무 스타일: 아침형 인간 (주로 오전에 활동)
관심사: AI, 스타트업, 프로그래밍, 비즈니스
주요 프로젝트: [추출된 프로젝트명들]
커뮤니케이션: 팀 협업 중심

[ 정확해요 👍 ]  [ 수정할게요 ✏️ ]
```
- 사용자 피드백 입력
- 수정 시 텍스트 필드 활성화

**Step 5: 완료**
- "준비 완료!" 메시지
- 메인 화면으로 이동

### 온보딩 API

- `POST /api/onboarding/connect-google` - Google 연결
- `POST /api/onboarding/connect-slack` - Slack 연결
- `POST /api/onboarding/connect-notion` - Notion 연결
- `POST /api/onboarding/generate-persona` - 페르소나 생성 (AI)
- `GET /api/onboarding/persona` - 페르소나 조회
- `PUT /api/onboarding/persona/feedback` - 페르소나 피드백 제출
- `POST /api/onboarding/complete` - 온보딩 완료

## 5. 브리핑 생성 파이프라인 (스트리밍)

### 5.1 실시간 스트리밍 플로우

```
사용자: 재생 버튼 클릭
  ↓
Frontend: Server-Sent Events 연결
  ↓
Backend: 데이터 수집 시작 (병렬)
  ├─→ event: "status" data: "일정 확인 중..."
  ├─→ event: "status" data: "메일 분석 중..."
  ├─→ event: "status" data: "Slack 확인 중..."
  └─→ event: "collected" data: {...데이터}
  ↓
Backend: 스크립트 생성 (Gemini Streaming)
  ├─→ event: "status" data: "스크립트 작성 중..."
  └─→ event: "script" data: "호스트: 안녕하세요..."
  ↓
Backend: TTS 스트리밍 생성 (Gemini TTS)
  ├─→ event: "status" data: "음성 생성 중..."
  ├─→ event: "audio-chunk" data: base64(audioBuffer1)
  ├─→ event: "audio-chunk" data: base64(audioBuffer2)
  └─→ event: "complete" data: {briefingId, duration}
  ↓
Frontend: 오디오 청크 수신하며 즉시 재생
  - Web Audio API 사용
  - 버퍼링 최소화
```

### 5.2 데이터 수집 (병렬)

**모든 서비스 동시 호출** (Promise.allSettled):

```typescript
const [calendar, gmail, slack, notion, youtube] = await Promise.allSettled([
  CalendarService.getTodayEvents(userId),      // 5초 타임아웃
  GmailService.getUnreadImportant(userId),     // 5초 타임아웃
  SlackService.getMentions(userId),            // 5초 타임아웃
  NotionService.getRecentUpdates(userId),      // 5초 타임아웃
  YouTubeService.getInterestTopics(userId)     // 10초 타임아웃
])

// 실패한 서비스는 건너뛰고 부분 브리핑 생성
```

### 5.3 브리핑 스크립트 구조

```
[ 인사 및 오늘의 개요 ]
좋은 아침입니다, {이름}님! 오늘도 멋진 하루를 시작해볼까요?

[ 오늘의 일정 ] ← Google Calendar
오늘은 총 {N}개의 일정이 있습니다.
- 오전 10시, {회의명}
- 오후 2시, {미팅명}
...

[ 중요 메일 브리핑 ] ← Gmail  
확인하지 않은 중요 메일이 {N}개 있습니다.
- {발신자}님의 "{제목}" - {요약}
...

[ 팀 커뮤니케이션 ] ← Slack
Slack에서 당신을 언급한 메시지가 {N}개 있습니다.
- {채널명}에서 {사용자}님: "{메시지 요약}"
...

[ 업무 진행 상황 ] ← Notion
Notion에서 최근 업데이트된 작업들입니다.
- {페이지명}: {변경 내용}
...

[ 관심사 트렌드 ] ← YouTube
당신이 관심있는 {분야}에서 이런 내용이 화제입니다.
- {영상 제목}: {주요 내용}
...

[ 마무리 인사 ]
오늘 하루도 화이팅하세요!
```

### 5.4 Gemini 프롬프트 (브리핑용)

```typescript
const prompt = `
당신은 개인 비서입니다. 사용자의 하루를 준비할 수 있도록 간결하고 친근한 브리핑을 제공하세요.

## 사용자 페르소나
${JSON.stringify(persona, null, 2)}

## 수집된 데이터

### 오늘의 일정 (Google Calendar)
${calendarData}

### 중요 메일 (Gmail)
${gmailData}

### 팀 커뮤니케이션 (Slack)
${slackData}

### 업무 진행 (Notion)
${notionData}

### 관심사 트렌드 (YouTube)
${youtubeData}

## 출력 형식
- 자연스러운 대화체
- 각 섹션을 명확히 구분
- 중요한 정보 우선
- 총 길이: 2-3분 분량
- 형식: "호스트: [내용]"

브리핑을 시작하세요:
`.trim()
```

## 6. API 엔드포인트

### 브리핑 API
- `POST /api/briefing/generate-stream` - SSE로 브리핑 생성 및 스트리밍
- `GET /api/briefing/latest` - 최근 브리핑 조회
- `POST /api/briefing/:id/play` - 재생 횟수 증가

### 서비스 데이터 수집 API
- `GET /api/services/google/calendar` - Calendar 데이터
- `GET /api/services/google/gmail` - Gmail 데이터
- `GET /api/services/slack/mentions` - Slack 멘션
- `GET /api/services/notion/updates` - Notion 업데이트
- `GET /api/services/youtube/interests` - YouTube 관심사

### 페르소나 API
- `POST /api/persona/generate` - AI 페르소나 생성
- `GET /api/persona` - 페르소나 조회
- `PUT /api/persona/feedback` - 피드백 제출
- `PUT /api/persona` - 페르소나 수정

## 7. 프론트엔드 재설계

### 메인 화면 (BriefingPlayer)

```tsx
<div className="h-screen flex flex-col">
  {/* 헤더 */}
  <Header />
  
  {/* 중앙 재생 영역 */}
  <main className="flex-1 flex flex-col items-center justify-center">
    {/* 큰 재생 버튼 */}
    <button 
      className="w-32 h-32 rounded-full bg-gradient-to-r from-brand to-brand-light"
      onClick={handlePlay}
    >
      <Play className="w-16 h-16" />
    </button>
    
    {/* 생성 상태 */}
    {isGenerating && (
      <GenerationStatus currentStep={step} />
    )}
    
    {/* 스크립트 뷰어 (재생 중) */}
    {isPlaying && (
      <ScriptViewer 
        script={script}
        currentTime={audioTime}
      />
    )}
  </main>
  
  {/* 하단 연결된 서비스 */}
  <ConnectedServices />
</div>
```

### 실시간 생성 UX

1. **재생 버튼 클릭** → SSE 연결
2. **배경 음악 시작** (`loading-music.mp3`)
3. **진행 상황 실시간 표시**:
   - "일정 확인 중..." (0-20%)
   - "메일 분석 중..." (20-40%)
   - "스크립트 작성 중..." (40-70%)
   - "음성 생성 중..." (70-100%)
4. **오디오 청크 수신** → Web Audio API로 즉시 재생
5. **배경 음악 페이드아웃** → 브리핑 재생
6. **스크립트 동기화 표시** (LyricsPlayerDemo 스타일)

### 컴포넌트 구조

**신규 컴포넌트**:
- `BriefingPlayer.tsx` - 메인 재생 화면
- `GenerationStatus.tsx` - 생성 진행 상황
- `ScriptViewer.tsx` - 스크립트 동기화 표시
- `ConnectedServices.tsx` - 연동 서비스 상태
- `PersonaReview.tsx` - 페르소나 확인 및 피드백

## 8. 백엔드 서비스 구현

### Service Layer

**briefing.service.ts** - 브리핑 생성 총괄
```typescript
class BriefingService {
  static async generateStreamingBriefing(userId: string): AsyncGenerator
  static async collectData(userId: string): Promise<BriefingData>
  static async generateScript(data: BriefingData, persona: Persona): Promise<string>
  static async generateStreamingAudio(script: string): AsyncGenerator<Buffer>
}
```

**persona.service.ts** - 페르소나 관리
```typescript
class PersonaService {
  static async generatePersona(userId: string): Promise<Persona>
  static async analyzeCalendar(events): Promise<WorkStyleInsights>
  static async analyzeGmail(emails): Promise<InterestInsights>
  static async analyzeYouTube(videos): Promise<TopicInsights>
  static async submitFeedback(userId: string, feedback: PersonaFeedback)
}
```

**calendar.service.ts** - Calendar 통합
```typescript
class CalendarService {
  static async getTodayEvents(userId: string, limit = 10)
  static async getTomorrowEvents(userId: string, limit = 5)
}
```

**gmail.service.ts** - Gmail 통합
```typescript
class GmailService {
  static async getUnreadImportant(userId: string, limit = 5)
  static async summarizeEmail(email): Promise<string>
}
```

**slack.service.ts** - Slack 통합
```typescript
class SlackService {
  static async getMentions(userId: string, limit = 10)
  static async getDirectMessages(userId: string, limit = 5)
}
```

**notion.service.ts** - Notion 통합
```typescript
class NotionService {
  static async getRecentUpdates(userId: string, limit = 5)
  static async searchPages(userId: string, query: string)
}
```

### Lib Layer

- **calendar.ts** - Google Calendar API
- **gmail.ts** - Gmail API
- **slack.ts** - Slack Web API
- **notion.ts** - Notion API
- **audio-stream.ts** - Web Audio 스트리밍 유틸

## 9. 스트리밍 TTS 구현

### Gemini TTS Streaming

```typescript
async function* generateStreamingAudio(script: string) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-preview-tts" 
  })
  
  const result = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: script }] }],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: [
            { speaker: '호스트', voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }}
          ]
        }
      }
    }
  })
  
  for await (const chunk of result.stream) {
    if (chunk.audioData) {
      const wavBuffer = convertPcmToWav(chunk.audioData)
      yield wavBuffer
    }
  }
}
```

### Frontend Audio Streaming

```typescript
const audioContext = new AudioContext()
const audioQueue: AudioBuffer[] = []

eventSource.addEventListener('audio-chunk', async (e) => {
  const base64 = e.data
  const arrayBuffer = base64ToArrayBuffer(base64)
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
  
  audioQueue.push(audioBuffer)
  
  if (!isPlaying) {
    playNextChunk()
  }
})

function playNextChunk() {
  if (audioQueue.length === 0) return
  
  const buffer = audioQueue.shift()
  const source = audioContext.createBufferSource()
  source.buffer = buffer
  source.connect(audioContext.destination)
  source.onended = playNextChunk
  source.start()
}
```

## 10. 페르소나 생성 로직

### AI 분석 프롬프트

```typescript
const personaPrompt = `
당신은 사용자 행동 분석 전문가입니다. 다음 데이터를 바탕으로 사용자의 페르소나를 생성하세요.

## Calendar 데이터 (최근 30일)
${calendarEvents}

## Gmail 데이터 (최근 50개)
${gmailThreads}

## YouTube 구독 채널
${youtubeSubscriptions}

## 출력 형식 (JSON)
{
  "workStyle": "morning-person | night-owl | flexible",
  "interests": ["AI", "startup", ...],
  "meetingFrequency": "high | medium | low",
  "communicationStyle": "collaborative | independent | hybrid",
  "primaryProjects": ["프로젝트명1", ...],
  "preferredTime": "morning | afternoon | evening"
}
`
```

### 사용자 피드백 통합

```typescript
async function refinePersona(originalPersona, userFeedback) {
  // 사용자 피드백을 반영하여 페르소나 업데이트
  return {
    ...originalPersona,
    ...userFeedback,
    confirmed: true
  }
}
```

## 11. 기존 코드 정리 (먼저 수행)

### 제거할 API Routes
- `app/api/podcast/*` - 모든 팟캐스트 관련 API
- `app/api/cron/auto-generate-podcasts/route.ts` - 자동 생성 cron
- `app/api/youtube/playlists/route.ts` - 플레이리스트 관리 (온보딩에서만 사용)

### 제거할 Frontend 컴포넌트
- `frontend/components/PodcastGenerator.tsx`
- `frontend/components/StepByStepModal.tsx`
- `frontend/components/PodcastGenerationModal.tsx`
- `frontend/components/PlaylistSkeleton.tsx`
- `frontend/components/PricingModal.tsx`
- `frontend/components/ProPlanTooltip.tsx`
- `frontend/components/AdminCreditManager.tsx` (추후 재구현)
- `frontend/components/TokenStatusBanner.tsx` (Google 통합으로 대체)

### 제거할 Backend Services
- `backend/services/podcast.service.ts`
- `backend/controllers/podcast.controller.ts`

### 제거할 Backend Lib (일부)
- `backend/lib/apify-transcript.ts` (YouTube 관심사 추출로만 사용하도록 변경)
- `backend/lib/subtitle.ts` (통합)

### 데이터베이스 정리

**Podcast 테이블**:
- 기존 데이터는 백업 후 유지
- 새로운 Briefing 테이블로 대체

**UserSettings 필드 제거**:
```prisma
// 제거할 필드들:
- selectedPlaylists: String[]
- deliveryTimeHour: Int
- deliveryTimeMinute: Int
- onboardingCompleted: Boolean (UserPersona.confirmed로 대체)
```

### 환경 정리
- `vercel.json`의 cron 설정 제거
- `public/audio/` 폴더 정리 (테스트 파일들)

## 12. 구현 순서 (병렬 작업 가능)

### Phase 0: 코드 정리 (1-2일)
- 기존 팟캐스트 관련 API 제거
- 사용하지 않는 컴포넌트 제거
- DB 마이그레이션 준비 (백업)

### 그룹 A: 인프라 구축
- DB 스키마 변경 및 마이그레이션
- OAuth 설정 확장 (Google, Slack, Notion)
- NextAuth 설정 업데이트

### 그룹 B: 데이터 수집 (병렬)
- Google Calendar API 통합
- Gmail API 통합
- Slack API 통합
- Notion API 통합
- YouTube API (기존 활용)

### 그룹 C: 페르소나 시스템
- AI 페르소나 생성 로직
- 페르소나 피드백 시스템
- 온보딩 페르소나 단계

### 그룹 D: 브리핑 파이프라인
- 데이터 병렬 수집 로직
- Gemini 브리핑 프롬프트
- 스트리밍 TTS 구현
- SSE 엔드포인트

### 그룹 E: 프론트엔드
- 온보딩 페이지 재설계
- BriefingPlayer 컴포넌트
- 실시간 생성 UX
- 오디오 스트리밍 재생

### 그룹 F: 최적화
- 에러 핸들링 (부분 브리핑)
- 성능 최적화 (병렬, 타임아웃)
- 통합 테스트

## 13. 환경 변수

```env
# Google OAuth (확장)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Slack OAuth
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Notion OAuth  
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=

# Gemini AI
GEMINI_API_KEY=

# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

## 14. 구현 체크리스트

### Phase 0: 코드 정리
- [ ] 기존 팟캐스트 API 제거
- [ ] 미사용 컴포넌트 제거
- [ ] 데이터베이스 백업

### 인프라
- [ ] 데이터베이스 스키마 변경 (UserPersona, ConnectedService, Briefing)
- [ ] Google OAuth scopes 확장
- [ ] Slack OAuth 앱 생성 및 통합
- [ ] Notion OAuth 통합 생성
- [ ] NextAuth 설정 업데이트

### 데이터 수집
- [ ] Google Calendar API 통합
- [ ] Gmail API 통합
- [ ] Slack API 통합
- [ ] Notion API 통합
- [ ] YouTube 관심사 추출
- [ ] 병렬 데이터 수집 로직

### 페르소나 시스템
- [ ] AI 페르소나 생성 로직
- [ ] 페르소나 피드백 시스템
- [ ] PersonaService 구현
- [ ] 온보딩 페르소나 단계

### 브리핑 파이프라인
- [ ] Gemini 브리핑 프롬프트 작성
- [ ] 스크립트 생성 로직
- [ ] 스트리밍 TTS 구현
- [ ] SSE 엔드포인트
- [ ] BriefingService 구현

### 프론트엔드
- [ ] 온보딩 페이지 재설계
- [ ] 서비스 연결 UI
- [ ] 페르소나 확인 및 피드백 UI
- [ ] BriefingPlayer 메인 컴포넌트
- [ ] GenerationStatus 컴포넌트
- [ ] ScriptViewer 컴포넌트
- [ ] 오디오 스트리밍 재생
- [ ] ConnectedServices 컴포넌트
- [ ] 로딩 배경 음악

### 최적화
- [ ] 에러 핸들링 (부분 브리핑)
- [ ] 성능 최적화 (병렬, 타임아웃, 캐싱)
- [ ] 보안 강화 (민감 정보 필터링, Token 암호화)
- [ ] 통합 테스트
- [ ] 사용자 테스트

---

**문서 작성일**: 2025-10-17
**버전**: 1.0

