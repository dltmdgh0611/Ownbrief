# 🚨 Gemini 429 할당량 초과 해결 - 스크린샷 단위 가이드

## 에러 메시지
```
[GoogleGenerativeAI Error]: Error fetching from 
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: 
[429 Too Many Requests] You exceeded your current quota, 
please check your plan and billing details.
```

---

## 🎯 해결 방법 (3가지 옵션)

### ✅ 옵션 1: 유료 플랜 활성화 (즉시 해결, 권장)
### ✅ 옵션 2: 할당량 증가 요청 (무료, 1-2일 소요)
### ✅ 옵션 3: 대기 (무료, 다음 날 오전 9시까지)

---

# 📸 옵션 1: 유료 플랜 활성화 (즉시 해결)

## 화면 1: Google Cloud Console 접속

**링크:** https://console.cloud.google.com/

```
┌─────────────────────────────────────────────────┐
│  Google Cloud Console                           │
│  ┌──────────────────────────────────────┐      │
│  │  프로젝트 선택 ▼                      │      │
│  │  [현재 프로젝트 이름]                 │      │
│  └──────────────────────────────────────┘      │
│                                                 │
│  우측 상단에서 Gemini API 키를 발급받은       │
│  프로젝트가 선택되어 있는지 확인!             │
└─────────────────────────────────────────────────┘
```

**중요:** 반드시 올바른 프로젝트를 선택하세요!

---

## 화면 2: APIs & Services 메뉴

```
┌─────────────────────────────────────────────────┐
│  ☰ (왼쪽 상단 햄버거 메뉴 클릭)                │
│                                                 │
│  메뉴에서 찾기:                                 │
│  ▸ Compute Engine                              │
│  ▸ Cloud Storage                               │
│  ▸ Kubernetes Engine                           │
│  ▸ APIs & Services           ← 여기 클릭!      │
│     ▸ Enabled APIs & services                  │
│     ▸ Library                                  │
│     ▸ Credentials                              │
│     ▸ Quotas                   ← 또는 여기!    │
└─────────────────────────────────────────────────┘
```

---

## 화면 3: Quotas 페이지로 이동

**방법 1: 직접 링크 (가장 빠름)**
```
https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
```

**방법 2: 메뉴에서**
```
APIs & Services → Quotas → Generative Language API 선택
```

---

## 화면 4: Quotas 페이지 확인

```
┌─────────────────────────────────────────────────────────┐
│  Generative Language API - Quotas                       │
│                                                         │
│  🔍 Search quotas (검색창)                             │
│  ┌────────────────────────────────────────────────┐   │
│  │ Quota name                    │ Limit   │ Usage│   │
│  ├────────────────────────────────────────────────┤   │
│  │ Requests per minute (RPM)     │ 15      │ 15   │   │
│  │ ← 이게 꽉 찼으면 1분 대기!                     │   │
│  ├────────────────────────────────────────────────┤   │
│  │ Requests per day (RPD)        │ 1,500   │ 1,500│   │
│  │ ← 이게 꽉 찼으면 내일 오전 9시까지 대기!       │   │
│  └────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

**여기서 확인:**
- **Usage가 Limit와 같으면** → 할당량 초과!
- **RPM (분당):** 15/15 → 1분만 기다리면 OK
- **RPD (일일):** 1,500/1,500 → 내일 오전 9시까지 대기

---

## 화면 5: 유료 플랜으로 전환 (즉시 해결)

### 단계 A: Billing으로 이동

```
┌─────────────────────────────────────────────────┐
│  ☰ 메뉴 → Billing                              │
│                                                 │
│  ┌──────────────────────────────────────┐      │
│  │  Billing Account                     │      │
│  │  Status: Active ✅                   │      │
│  │  (이미 연결되어 있음)                │      │
│  └──────────────────────────────────────┘      │
│                                                 │
│  ← Billing이 Active면 이미 준비 완료!         │
└─────────────────────────────────────────────────┘
```

**직접 링크:** https://console.cloud.google.com/billing

---

### 단계 B: 할당량 자동 증가 확인

Billing 계정이 연결되어 있으면 **자동으로 할당량이 증가**합니다!

다시 Quotas 페이지를 확인하면:

```
┌─────────────────────────────────────────────────────────┐
│  Generative Language API - Quotas (유료 플랜)           │
│                                                         │
│  Quota name                    │ Limit      │ Usage    │
│  ├────────────────────────────────────────────────┤    │
│  │ Requests per minute (RPM)     │ 1,000+     │ 15   │  │
│  │                                                      │
│  │ Requests per day (RPD)        │ Unlimited  │ 1,500│  │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ✅ 이제 거의 무제한으로 사용 가능!                    │
└─────────────────────────────────────────────────────────┘
```

---

## 화면 6: API 다시 테스트

터미널에서:
```bash
yarn dev
```

브라우저에서:
```
http://localhost:3000/dev
```

**"Test Script Generation"** 클릭!

성공 메시지:
```
✅ 스크립트 생성 완료: XXXX자
```

---

# 📸 옵션 2: 할당량 증가 요청 (무료)

## 화면 1: Quotas 페이지

```
https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas
```

---

## 화면 2: 할당량 선택

```
┌─────────────────────────────────────────────────────────┐
│  Quotas                                                 │
│                                                         │
│  ☑ Requests per minute (RPM)      ← 체크박스 클릭     │
│  ☑ Requests per day (RPD)         ← 체크박스 클릭     │
│                                                         │
│  [우측 상단]                                           │
│  ┌────────────────────┐                               │
│  │  EDIT QUOTAS       │  ← 클릭!                      │
│  └────────────────────┘                               │
└─────────────────────────────────────────────────────────┘
```

---

## 화면 3: 새로운 한도 입력

```
┌─────────────────────────────────────────────────────────┐
│  Edit Quotas                                            │
│                                                         │
│  Quota: Requests per minute (RPM)                       │
│  Current limit: 15                                      │
│                                                         │
│  New limit:  ┌──────┐                                  │
│              │ 100  │  ← 원하는 숫자 입력             │
│              └──────┘                                  │
│                                                         │
│  Reason for request:                                    │
│  ┌─────────────────────────────────────────┐          │
│  │ I'm developing a podcast generation     │          │
│  │ app and need higher quota for testing.  │          │
│  │ (팟캐스트 앱 개발 중이라 테스트 필요)  │          │
│  └─────────────────────────────────────────┘          │
│                                                         │
│  ┌────────────┐                                        │
│  │  SUBMIT    │  ← 제출!                              │
│  └────────────┘                                        │
└─────────────────────────────────────────────────────────┘
```

**승인 시간:** 보통 1-2일 (영업일 기준)

---

# 📸 옵션 3: 대기하기 (무료)

## 할당량 리셋 시간

### 분당 할당량 (RPM: 15 requests/minute)
```
⏰ 리셋 시간: 1분 후
└─ 1분만 기다리면 다시 사용 가능!
```

### 일일 할당량 (RPD: 1,500 requests/day)
```
⏰ 리셋 시간: 매일 자정 UTC
└─ 한국 시간: 오전 9시

예시:
- 지금 시간: 오후 3시
- 리셋: 내일 오전 9시
- 대기 시간: 약 18시간
```

---

# 🔥 즉시 테스트하는 법 (긴급)

## 새 프로젝트로 우회하기

### 화면 1: Google AI Studio

```
https://aistudio.google.com/app/apikey
```

### 화면 2: 새 API 키 생성

```
┌─────────────────────────────────────────────────────────┐
│  API Keys                                               │
│                                                         │
│  Your API Keys:                                         │
│  ┌─────────────────────────────────────────────┐      │
│  │ AIzaSy... (My Project)  - Created today      │      │
│  └─────────────────────────────────────────────┘      │
│                                                         │
│  ┌────────────────────────────────────┐               │
│  │  Create API key ▼                  │               │
│  │    ▸ Create API key                │               │
│  │    ▸ Create API key in new project │ ← 클릭!      │
│  └────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

### 화면 3: 새 프로젝트 확인

```
┌─────────────────────────────────────────────────────────┐
│  New API key created!                                   │
│                                                         │
│  Project: Generative Language Client                    │
│  API Key: AIzaSyNEW_KEY_HERE...                        │
│                                                         │
│  ┌──────────────┐                                      │
│  │  Copy        │  ← 복사!                             │
│  └──────────────┘                                      │
│                                                         │
│  ✅ 새 프로젝트 = 새로운 할당량!                       │
└─────────────────────────────────────────────────────────┘
```

### 화면 4: .env.local 업데이트

```
프로젝트 루트의 .env.local 파일 열기:

# 기존 키 (할당량 초과)
# GEMINI_API_KEY="AIzaSyOLD..."

# 새 키 (새 할당량!)
GEMINI_API_KEY="AIzaSyNEW..."
```

### 화면 5: 서버 재시작

```bash
# 터미널에서 Ctrl+C

yarn dev
```

**이제 새로운 할당량으로 다시 시작!** 🎉

---

# 💰 비용 안내

## 무료 플랜
```
┌──────────────────────────────────────┐
│  Gemini 2.5 Flash - Free Tier        │
│  ────────────────────────────────    │
│  ✅ 분당: 15 requests                │
│  ✅ 일일: 1,500 requests             │
│  ✅ 비용: $0                         │
└──────────────────────────────────────┘
```

## 유료 플랜 (Pay-as-you-go)
```
┌──────────────────────────────────────┐
│  Gemini 2.5 Flash - Paid             │
│  ────────────────────────────────────│
│  ✅ 분당: 1,000+ requests            │
│  ✅ 일일: Unlimited                  │
│  💰 비용:                            │
│     - Input: $0.075 / 1M tokens      │
│     - Output: $0.30 / 1M tokens      │
│                                      │
│  예상 비용:                          │
│  팟캐스트 100개 생성 ≈ $0.03 (40원) │
│  └─ 거의 무료 수준!                 │
└──────────────────────────────────────┘
```

---

# 📋 빠른 체크리스트

## ✅ 지금 바로 할 일 (우선순위 순서)

### 1️⃣ 가장 빠른 해결: 새 프로젝트
- [ ] https://aistudio.google.com/app/apikey 접속
- [ ] "Create API key in new project" 클릭
- [ ] 새 API 키 복사
- [ ] `.env.local`에 붙여넣기
- [ ] `yarn dev` 재시작
- [ ] **소요 시간: 1분**

### 2️⃣ 1분만 대기 (분당 할당량 초과인 경우)
- [ ] Quotas 페이지에서 RPM 확인
- [ ] 15/15이면 → 1분 대기
- [ ] 다시 시도
- [ ] **소요 시간: 1분**

### 3️⃣ 유료 플랜 (권장, 거의 무료)
- [ ] Billing 계정 연결 확인
- [ ] 자동으로 할당량 증가
- [ ] **소요 시간: 즉시**

### 4️⃣ 할당량 증가 요청 (무료)
- [ ] Quotas → EDIT QUOTAS
- [ ] 새 한도 입력
- [ ] Submit
- [ ] **소요 시간: 1-2일**

### 5️⃣ 내일까지 대기
- [ ] 내일 오전 9시 (한국 시간)
- [ ] 일일 할당량 자동 리셋
- [ ] **소요 시간: 최대 24시간**

---

# 🔗 핵심 링크 모음

| 목적 | 링크 |
|------|------|
| Google AI Studio | https://aistudio.google.com/app/apikey |
| Cloud Console | https://console.cloud.google.com/ |
| Quotas 페이지 | https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas |
| Billing 설정 | https://console.cloud.google.com/billing |
| Rate Limits 문서 | https://ai.google.dev/gemini-api/docs/rate-limits |

---

# 🆘 그래도 안 될 때

## 확인 사항:

1. **프로젝트가 맞나요?**
   - Google AI Studio의 API 키 프로젝트
   - Cloud Console의 프로젝트
   - 이 둘이 동일해야 함!

2. **API 키가 올바른가요?**
   - `.env.local` 파일 확인
   - `GEMINI_API_KEY="AIzaSy..."` 형식
   - 공백이나 줄바꿈 없음

3. **서버를 재시작했나요?**
   - 환경 변수 변경 시 필수!
   - `Ctrl+C` → `yarn dev`

4. **할당량 상태는?**
   - Quotas 페이지에서 확인
   - Usage / Limit 비교

---

**마지막 업데이트:** 2025-10-10

**권장 해결책:** 
1. 새 프로젝트에서 API 키 재발급 (1분 소요) ⚡
2. 유료 플랜 활성화 (거의 무료, 즉시 해결) 💳

