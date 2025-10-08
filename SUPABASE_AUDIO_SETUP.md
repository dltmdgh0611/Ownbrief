# 🎵 Supabase 오디오 스토리지 설정 가이드

## 🐛 문제
```
Failed to upload audio file: Supabase URL or Anon Key not configured in environment variables
```

음성 생성은 완료되었지만 Supabase에 업로드하지 못함

---

## ✅ 해결 방법

### 1단계: Supabase 프로젝트 생성

```bash
1. https://supabase.com 접속
2. 새 프로젝트 생성
3. 프로젝트 설정에서 API 키 확인
```

---

### 2단계: Storage 버킷 생성

```sql
-- Supabase Dashboard > Storage > Create new bucket

버킷 이름: podcasts
Public bucket: ✅ 체크 (공개 접근 허용)
```

**또는 SQL로 생성**:
```sql
-- Storage bucket 생성
insert into storage.buckets (id, name, public)
values ('podcasts', 'podcasts', true);

-- Public 접근 정책 추가
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'podcasts' );

create policy "Authenticated Upload"
on storage.objects for insert
with check ( bucket_id = 'podcasts' and auth.role() = 'authenticated' );
```

---

### 3단계: 환경 변수 설정

**`.env` 파일에 추가**:

```bash
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 또는 서버 사이드만
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**환경 변수 가져오는 위치**:
1. Supabase Dashboard
2. Settings > API
3. Project URL 복사
4. Project API keys > anon public 복사

---

### 4단계: 개발 서버 재시작

```bash
# 서버 중지 (Ctrl+C)
# 서버 재시작
npm run dev
```

**환경 변수는 서버 재시작 시에만 로드됩니다!**

---

## 📁 관련 파일

### `backend/lib/supabase.ts`

```typescript
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      process.env.SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                          process.env.SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or Anon Key not configured')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}
```

**우선순위**:
1. `NEXT_PUBLIC_SUPABASE_URL` (클라이언트+서버)
2. `SUPABASE_URL` (서버만)

---

## 🔐 환경 변수 종류

### NEXT_PUBLIC_ 접두사
```bash
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

**특징**:
- ✅ 클라이언트(브라우저)에서도 접근 가능
- ✅ 서버에서도 접근 가능
- ⚠️ 브라우저에 노출됨 (public key만 사용!)

### 일반 환경 변수
```bash
SUPABASE_URL="..."
SUPABASE_ANON_KEY="..."
```

**특징**:
- ✅ 서버에서만 접근 가능
- ✅ 브라우저에 노출 안 됨
- ❌ 클라이언트 코드에서 접근 불가

---

## 📊 현재 코드 동작

```typescript
// backend/lib/supabase.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 
                    process.env.SUPABASE_URL || ''

// 1. NEXT_PUBLIC_SUPABASE_URL 확인
// 2. 없으면 SUPABASE_URL 확인
// 3. 둘 다 없으면 '' (빈 문자열)
// 4. 빈 문자열이면 에러 발생!
```

---

## 🔍 Supabase 정보 확인 방법

### Supabase Dashboard에서

```
1. https://app.supabase.com 로그인
2. 프로젝트 선택
3. Settings (왼쪽 메뉴)
4. API 클릭

확인할 정보:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project URL:
https://xxxxxxxxxxxxx.supabase.co
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project API keys:
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 📝 .env 파일 설정 예시

```bash
# .env 파일 (프로젝트 루트)

# Database (이미 있음)
DATABASE_URL="postgresql://postgres:..."

# NextAuth (이미 있음)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Gemini (이미 있음)
GEMINI_API_KEY="..."

# Supabase (추가 필요!) ⭐
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🗂️ Supabase Storage 구조

```
Supabase Storage
  └── podcasts (bucket)
      ├── podcast-clxxx1.wav
      ├── podcast-clxxx2.wav
      └── podcast-clxxx3.wav
```

---

## 🧪 테스트 방법

### 1. 환경 변수 확인
```bash
# .env 파일 확인
cat .env | grep SUPABASE

# 또는
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 2. 서버 재시작
```bash
# Ctrl+C로 서버 중지
npm run dev
```

### 3. 오디오 업로드 테스트
```bash
1. 팟캐스트 생성
2. 음성 생성까지 완료
3. 콘솔 로그 확인:
   📤 Uploading to Supabase Storage: podcast-xxx.wav
   ✅ Upload successful: podcast-xxx.wav
   🔗 Public URL: https://xxxxx.supabase.co/storage/v1/object/public/podcasts/podcast-xxx.wav
```

---

## ⚠️ 주의사항

### 1. 환경 변수 이름 정확히
```bash
# ✅ 올바름
NEXT_PUBLIC_SUPABASE_URL

# ❌ 틀림
SUPABASE_PUBLIC_URL
NEXT_SUPABASE_URL
PUBLIC_SUPABASE_URL
```

### 2. 따옴표 사용
```bash
# ✅ 올바름
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"

# ✅ 올바름 (따옴표 없이도 가능)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# ❌ 공백 있으면 따옴표 필수
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co (공백)
```

### 3. 서버 재시작 필수
- .env 파일 변경 후 **반드시 서버 재시작**
- 핫 리로드 안 됨!

---

## 🔧 대안: 로컬 파일 저장 (임시)

Supabase 설정이 없어도 작동하도록 로컬 저장 옵션 추가:

```typescript
// backend/lib/supabase.ts 수정
export async function uploadAudioToStorage(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  // Supabase 설정이 없으면 로컬에 저장
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  
  if (!supabaseUrl) {
    console.warn('⚠️ Supabase 미설정 - 로컬에 저장합니다')
    
    // public/audio 폴더에 저장
    const fs = require('fs').promises
    const path = require('path')
    const publicPath = path.join(process.cwd(), 'public', 'audio', fileName)
    
    await fs.writeFile(publicPath, buffer)
    
    return `/audio/${fileName}` // 로컬 URL 반환
  }
  
  // Supabase 업로드 (기존 코드)
  // ...
}
```

---

## 📋 체크리스트

**Supabase 사용하려면**:
- [ ] Supabase 프로젝트 생성
- [ ] Storage > podcasts 버킷 생성
- [ ] .env에 SUPABASE_URL 추가
- [ ] .env에 SUPABASE_ANON_KEY 추가
- [ ] 서버 재시작
- [ ] 팟캐스트 생성 테스트

**임시 로컬 저장 사용하려면**:
- [ ] public/audio 폴더 생성
- [ ] Supabase 환경 변수 없이 사용
- [ ] 오디오 파일이 public/audio에 저장됨

---

## 🚀 빠른 해결

### 옵션 1: Supabase 설정 (권장)

```bash
1. .env 파일 열기
2. 다음 추가:
   NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbG..."
3. 서버 재시작
```

### 옵션 2: 로컬 저장 (임시)

```bash
1. public/audio 폴더 생성
   mkdir public/audio
2. 코드 수정 (위 대안 코드 참고)
3. 서버 재시작
```

---

**환경 변수 설정 후 서버 재시작하면 오디오 업로드가 정상 작동합니다!** ✅

