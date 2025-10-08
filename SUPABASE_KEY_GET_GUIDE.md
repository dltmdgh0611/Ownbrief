# 🔑 Supabase URL 및 키 가져오기 가이드

## 📍 Supabase URL과 Anon Key 위치

---

## 🚀 단계별 가이드

### 1단계: Supabase 접속
```
https://app.supabase.com
```

1. 위 주소로 접속
2. Google 계정으로 로그인
3. 프로젝트 목록이 보임

---

### 2단계: 프로젝트 선택 (또는 생성)

**기존 프로젝트가 있다면**:
- 프로젝트 클릭

**프로젝트가 없다면**:
1. "New project" 버튼 클릭
2. 이름 입력 (예: aicast-storage)
3. Database Password 설정
4. Region 선택 (Northeast Asia - Seoul 권장)
5. Plan 선택 (Free tier 가능)
6. "Create new project" 클릭
7. 2-3분 대기 (프로젝트 생성 중)

---

### 3단계: API 설정 페이지로 이동

```
프로젝트 대시보드에서:

왼쪽 메뉴
  ↓
⚙️ Settings (설정) 클릭
  ↓
API 클릭
```

---

### 4단계: URL과 Key 복사

화면에서 다음 정보 복사:

#### 📍 Project URL
```
Configuration > Project URL
┌────────────────────────────────────────┐
│ https://xxxxxxxxxxxxx.supabase.co      │
│                                        │
│ [Copy] 버튼 클릭                        │
└────────────────────────────────────────┘
```

#### 🔑 API Keys - anon public
```
Project API keys > anon public
┌────────────────────────────────────────────────────┐
│ eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...  │
│                                                    │
│ [Copy] 버튼 클릭                                    │
└────────────────────────────────────────────────────┘
```

**⚠️ service_role key는 복사하지 마세요!** (서버 전용, 위험)

---

### 5단계: .env 파일에 붙여넣기

**프로젝트 루트의 `.env` 파일 열기**:

```bash
# 기존 내용은 그대로 두고, 아래 추가:

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxxxxxxxxxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**예시 (실제 값)**:
```bash
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5..."
```

---

### 6단계: Storage 버킷 생성

**Supabase Dashboard에서**:

```
1. 왼쪽 메뉴 > Storage 클릭
2. "New bucket" 버튼 클릭
3. 설정:
   - Name: podcasts
   - Public bucket: ✅ 체크 (중요!)
   - File size limit: 50 MB
4. "Create bucket" 클릭
```

**또는 SQL Editor에서**:
```
1. 왼쪽 메뉴 > SQL Editor
2. "New query" 클릭
3. 다음 SQL 붙여넣기:
```

```sql
-- Bucket 생성
insert into storage.buckets (id, name, public)
values ('podcasts', 'podcasts', true);

-- Public 읽기 정책
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'podcasts' );

-- 인증된 사용자 업로드 정책
create policy "Authenticated Upload"
on storage.objects for insert
with check ( bucket_id = 'podcasts' );
```

```
4. "Run" 버튼 클릭
```

---

### 7단계: 서버 재시작

```bash
# 터미널에서
# Ctrl+C (서버 중지)
npm run dev
```

---

## 🔍 확인 방법

### .env 파일 확인
```bash
# Windows PowerShell
Get-Content .env | Select-String "SUPABASE"

# Windows CMD
type .env | findstr "SUPABASE"

# Git Bash / WSL
cat .env | grep SUPABASE
```

**예상 출력**:
```
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."
```

### 환경 변수 로드 확인 (개발 서버 시작 시)
```
Environment variables loaded from .env  ✅
```

---

## 📸 스크린샷 위치 (참고)

### Supabase Dashboard
```
https://app.supabase.com
  ↓
프로젝트 선택
  ↓
왼쪽 메뉴 ⚙️ Settings
  ↓
API 메뉴
  ↓
┌─────────────────────────────────────┐
│ Configuration                       │
├─────────────────────────────────────┤
│ Project URL                         │
│ https://xxxxx.supabase.co  [Copy]   │
├─────────────────────────────────────┤
│ Project API keys                    │
├─────────────────────────────────────┤
│ anon public                         │
│ eyJhbGci...  [Copy]                 │
│                                     │
│ service_role (⚠️ 사용 금지)          │
│ eyJhbGci...                         │
└─────────────────────────────────────┘
```

---

## 🎯 요약

### 필요한 정보 2가지:

1. **SUPABASE_URL** 
   - 위치: Settings > API > Project URL
   - 형식: `https://xxxxx.supabase.co`

2. **SUPABASE_ANON_KEY**
   - 위치: Settings > API > anon public
   - 형식: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### .env 파일에 추가:
```bash
NEXT_PUBLIC_SUPABASE_URL="복사한 URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="복사한 Key"
```

### 서버 재시작:
```bash
npm run dev
```

---

**이제 오디오 파일이 Supabase Storage에 업로드됩니다!** 🎉

상세 내용은 `SUPABASE_AUDIO_SETUP.md`를 참고하세요!

