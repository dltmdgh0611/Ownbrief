# 🎯 Ownbrief - AI 기반 개인 맞춤형 브리핑 서비스

**AI를 활용한 지능형 데이터 추출 및 프롬프트 엔지니어링으로 개인 비서를 만듭니다**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini-2.0-orange)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)

---

## 🎬 서비스 개요

**Ownbrief**는 Google, Slack, Notion 등 다양한 서비스에서 수집된 데이터를 **AI 프롬프트 엔지니어링**으로 정제하여, 개인 맞춤형 음성 브리핑을 생성하는 지능형 플랫폼입니다.

### 핵심 가치
- 🤖 **AI 주도**: Gemini 2.0을 활용한 스마트 데이터 처리
- 🎯 **맞춤형**: 사용자 페르소나 기반 개인화
- 🔄 **실시간**: 스트리밍 방식의 즉시 브리핑 생성
- 🧠 **지능형**: 프롬프트 엔지니어링으로 고품질 콘텐츠

---

## 🧠 AI를 활용한 데이터 처리 파이프라인

### 1. **데이터 수집 (Multi-Source Integration)**

```typescript
// backend/lib/*.ts 에서 다양한 서비스 API 활용

📅 Google Calendar  → 오늘 일정 추출
📧 Gmail            → 중요 메일 필터링
💬 Slack             → 멘션 및 업무 메시지
📝 Notion            → 최근 작업 업데이트
📺 YouTube           → 관심사 트렌드 분석
```

**정제 과정:**
- 광고성 메일 자동 필터링 (70% 업무 메일 우선)
- 중요한 이벤트만 선별 (24시간 이내)
- 사용자 개인 정보 보호 필터링

### 2. **AI 페르소나 생성 (Prompt Engineering)**

```typescript
// backend/services/persona.service.ts

🤖 Gemini 2.0 Flash가 사용자 데이터를 분석하여:
   - 업무 스타일 추론 (morning-person / night-owl)
   - 관심사 키워드 추출 (8-10개)
   - 커뮤니케이션 패턴 분석
```

**프롬프트 구조:**
```
당신은 사용자 행동 분석 전문가입니다.

## 데이터 분석 규칙:
1. 다양성 우선: 한 분야에 집중하지 말고 5개 이상 카테고리
2. 비중 적용: Gmail 70% + YouTube 30%
3. 광고 필터링: 이름, URL 완전 무시
4. 카테고리 분산: 같은 카테고리는 최대 2개

## 출력 형식 (JSON):
{
  "workStyle": "morning-person | night-owl | flexible",
  "interests": ["AI", "Startup", "Growth Hacking", ...],
  "communicationStyle": "collaborative | independent | hybrid",
  "preferredTime": "morning | afternoon | evening"
}
```

### 3. **스마트 브리핑 생성 (Context-Aware)**

```typescript
// backend/services/briefing.service.ts

각 섹션별 프롬프트 엔지니어링:
📅 오늘 일정    → 시간 순서, 중요도 우선
📧 중요 메일    → 2건만, 핵심 요약
💼 업무 진행    → 전체 동향 요약 (페이지 나열 금지)
📊 트렌드      → Grounding 기반 최신 뉴스 + 인사이트
```

**섹션별 프롬프트 예시:**
```
지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성하고, 
불필요한 영어 표현을 사용하지 마세요.

오늘의 일정을 브리핑해주세요. 자연스럽고 친근한 대화체로 작성하세요.

## 작성 규칙
- "오늘은 [시간]에 [일정명]이 있습니다" 형식
- 중요한 일정 우선 언급
- 시간 순서대로 정리
- **절대로 참석자 이름이나 이메일은 언급하지 마세요**
- 총 25~35초 분량으로 간결하게
- 마지막에 다음 섹션으로 넘어가는 연결 문장 1문장 포함

## 일정 데이터
{calendarData}
```


---

## 🏗️ 시스템 아키텍처

### 전체 흐름도

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  • 브리핑 플레이어                                       │
│  • 카드/텍스트 뷰 전환                                    │
│  • 실시간 오디오 재생                                     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP Streaming
┌────────────────────▼────────────────────────────────────┐
│              Next.js API Routes                          │
│  /api/briefing/next-section  → 섹션별 스크립트 생성      │
│  /api/briefing/save           → DB 저장                  │
│  /api/briefing/latest         → 오늘 브리핑 조회          │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│           Backend Services                              │
│  • BriefingService: 브리핑 생성                         │
│  • PersonaService: 페르소나 분석                         │
│  • Gemini Integration: AI 프롬프트 처리                  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│Calendar   │  │Gmail      │  │Slack      │
│           │  │           │  │           │
│Notion     │  │           │  │           │
└───────────┘  └───────────┘  └───────────┘
        └────────────┼────────────┘
                     ▼
            ┌──────────────┐
            │ Supabase DB  │
            │ Prisma ORM   │
            └──────────────┘
```

### 핵심 컴포넌트

**1. Data Collection Layer**
```typescript
// backend/lib/*.ts
- CalendarClient: Google Calendar API 연동
- GmailClient: Gmail API + 광고 필터링
- SlackClient: Slack Web API + 멘션 추출
- NotionClient: Notion API + 개인 작업 분석
```

**2. AI Processing Layer**
```typescript
// backend/services/*.ts
- PersonaService: 사용자 행동 분석 → 페르소나 생성
- BriefingService: 섹션별 프롬프트 → 스크립트 생성
```

**3. Orchestration Layer**
```typescript
// app/api/briefing/next-section/route.ts
- 섹션별 데이터 수집
- 프롬프트에 맞는 스크립트 생성
- TTS 오디오 생성
```

---

## 🚀 기술 스택

### Frontend
- **Next.js 14** (App Router) - 서버사이드 렌더링
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **Lucide React** - 아이콘

### Backend
- **Next.js API Routes** - 풀스택 프레임워크
- **NextAuth.js** - 인증 및 OAuth
- **Prisma ORM** - 데이터베이스 추상화

### AI & ML
- **Google Gemini 2.0 Flash** - 스크립트 생성
- **ElevenLabs TTS** - 음성 합성
- **Gemini Grounding** - 최신 뉴스 검색

### Database
- **Supabase PostgreSQL** - 클라우드 데이터베이스
- **Supabase Storage** - 오디오 파일 저장

### APIs
- **Google Calendar API** - 일정 조회
- **Gmail API** - 메일 분석
- **Slack Web API** - 커뮤니케이션
- **Notion API** - 작업 관리

---

## 🎯 프롬프트 엔지니어링 전략

### 1. **콘텍스트 기반 프롬프트**

각 섹션마다 명확한 **역할, 규칙, 출력 형식**을 정의:

```typescript
private static buildSectionPrompt(sectionName: string, data: any, persona: any): string {
  switch (sectionName) {
    case 'calendar':
      return `
      지시: 모든 문장은 자연스러운 한국어(존댓말)로만 작성
      
      ## 작성 규칙 (10가지)
      1. 시간 순서대로 정리
      2. 중요한 일정 우선
      3. 참석자 정보 제외
      4. 다음 섹션 연결문 포함
      5. 25~35초 분량
      
      ## 데이터
      ${JSON.stringify(data)}
      `
  }
}
```

### 2. **Few-Shot Learning**

예시를 통해 원하는 형식을 명확히:

```typescript
## 출력 예시:
"오늘은 오후 2시에 팀 미팅이 있고, 4시에 고객사 발표가 예정되어 있습니다."
"메일에도 확인할 게 몇 가지 있네요."
```

### 3. **역할 부여 (Role-Based)**

```typescript
당신은 개인 비서입니다. 
사용자의 하루를 준비할 수 있도록 간결하고 친근한 브리핑을 제공하세요.
```

### 4. **제약 조건 명시**

```typescript
- 광고/알림/뉴스레터는 절대 포함하지 마세요
- 메일 주소는 표시하지 마세요
- 페이지 나열 금지 (A에서... B에서... X)
- 30자 이내의 설명으로만 표시
```

---

## 📊 데이터 처리 예시

### 입력 (Raw Data)
```json
{
  "calendar": [
    {
      "summary": "팀 미팅",
      "start": "2025-01-15T14:00:00",
      "attendees": ["user1@email.com", "user2@email.com"]
    }
  ],
  "gmail": [
    {
      "from": "manager@company.com",
      "subject": "긴급: 프로젝트 검토 필요",
      "snippet": "프로젝트 관련하여..."
    }
  ]
}
```

### AI 처리 후 (Refined Output)
```
"오늘은 오후 2시에 팀 미팅이 있고, 4시에 고객사 발표가 예정되어 있습니다. 
메일에도 확인할 게 몇 가지 있네요."
```

**핵심 차이점:**
- ❌ 불필요한 정보 제거 (참석자, 이메일)
- ✅ 핵심만 간결하게
- ✅ 자연스러운 문장 구조
- ✅ 다음 섹션 연결

---

## 🎨 주요 기능

### 1. **실시간 브리핑 생성**
```typescript
// 섹션별로 순차적 처리
섹션 1 (일정) 준비 중 → TTS 생성
섹션 2 (메일) 준비 중 → TTS 생성
섹션 3 (업무) 준비 중 → TTS 생성
...
```

### 2. **페르소나 기반 개인화**
- 사용자의 업무 스타일 분석
- 관심사 키워드 자동 추출
- 커뮤니케이션 패턴 학습

### 3. **카드/텍스트 뷰**
- **카드 뷰**: 시각적 데이터 요약
- **텍스트 뷰**: 전체 스크립트 확인

### 4. **하루 1회 브리핑**
- 오늘 생성된 브리핑은 DB에 저장
- 다시 생성 시 기존 데이터 재생
- 효율적인 리소스 사용

---

## 🔧 개발 환경 설정

```bash
# 1. 의존성 설치
yarn install

# 2. 환경 변수 설정
cp .env.example .env.local

# 3. Prisma 설정
yarn prisma generate
yarn prisma db push

# 4. 개발 서버 실행
yarn dev
```

---

## 📈 성능 최적화

- **스트리밍**: 섹션별 실시간 처리
- **병렬 처리**: Promise.allSettled로 안정성 확보
- **캐싱**: 오늘 브리핑 1회만 생성
- **DB 인덱스**: userId + createdAt으로 빠른 조회


