# 🔍 Supabase RLS 문제 디버깅

## 🐛 문제
RLS 정책을 설정했는데도 같은 오류 발생:
```
new row violates row-level security policy
```

---

## ⚠️ 주의: 서버 재시작

**네, yarn dev 재시작이 맞습니다!**

```bash
# 터미널에서
Ctrl + C (서버 중지)
yarn dev (서버 재시작)
```

**하지만 Supabase 정책은 서버 재시작 필요 없음** - 즉시 적용됨

---

## 🔍 문제 확인 체크리스트

### 1. 버킷 이름 확인

**Supabase Dashboard > Storage**

```
버킷 이름이 정확히 'podcasts'인가?
❌ podcast (s 빠짐)
❌ Podcasts (대문자)
✅ podcasts (소문자, 복수형)
```

---

### 2. 버킷이 Public인지 확인

**Storage > podcasts 버킷 클릭 > Configuration**

```
Public bucket: ✅ 체크되어 있어야 함

만약 Private이면:
1. Configuration 탭
2. "Make public" 버튼 클릭
```

---

### 3. RLS 정책 확인

**SQL Editor에서 실행**:

```sql
-- 정책 목록 확인
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
```

**예상 결과**:
```
최소 2개 이상의 정책이 있어야 함:
- SELECT 정책 (읽기)
- INSERT 정책 (업로드)
```

**아무것도 안 나오면**: 정책이 생성 안 된 것!

---

### 4. 간단한 RLS 정책 (다시 시도)

**기존 정책 모두 삭제 후 재생성**:

```sql
-- 1. 기존 정책 삭제 (에러 나도 괜찮음)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access - Anyone can read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- 2. 가장 간단한 정책 생성 (모두 허용)
CREATE POLICY "Allow all operations"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'podcasts')
WITH CHECK (bucket_id = 'podcasts');
```

**주의**: 위 정책은 누구나 업로드/삭제 가능 (테스트용만!)

---

### 5. 대안: RLS 완전히 비활성화 (테스트용)

**SQL Editor에서**:

```sql
-- storage.objects 테이블의 RLS 비활성화
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**경고**: 
- ⚠️ 보안 위험 (누구나 접근 가능)
- 🧪 테스트 목적으로만 사용
- ✅ 테스트 완료 후 다시 활성화 필요

**다시 활성화**:
```sql
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
```

---

## 🔧 완전 처음부터 다시 설정

### 올인원 SQL (전체 삭제 후 재생성)

```sql
-- === STEP 1: 기존 정책 모두 삭제 ===
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects'
          AND policyname LIKE '%podcast%'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- === STEP 2: 새 정책 생성 ===

-- 읽기: 누구나
CREATE POLICY "podcasts_public_select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'podcasts');

-- 삽입: 누구나 (테스트용, 나중에 authenticated로 변경)
CREATE POLICY "podcasts_public_insert"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'podcasts');

-- 업데이트: 누구나 (테스트용)
CREATE POLICY "podcasts_public_update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'podcasts')
WITH CHECK (bucket_id = 'podcasts');

-- 삭제: 누구나 (테스트용)
CREATE POLICY "podcasts_public_delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'podcasts');
```

**이 SQL 실행 후 즉시 테스트!**

---

## 🧪 테스트 순서

### 1. 정책 설정 후
```bash
1. Supabase SQL Editor에서 위 SQL 실행
2. ✅ Success 확인
3. 브라우저로 돌아가기 (서버 재시작 필요 없음!)
```

### 2. 즉시 테스트
```bash
1. http://localhost:3000/dev
2. "4. Supabase Storage" 섹션
3. "Storage 업로드" 버튼 클릭
```

### 3. 결과 확인

**성공 시**:
```
✓ 업로드 성공
파일: test-podcast-1696750000.wav
URL: https://...
```

**실패 시**:
```
✗ 업로드 실패
new row violates row-level security policy

→ 정책이 아직 적용 안 됨
→ SQL을 다시 확인하고 재실행
```

---

## 🔍 추가 디버깅

### 환경 변수 확인

**터미널에서 (서버 실행 중)**:
```javascript
// 브라우저 콘솔에서
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
```

**서버 로그에서**:
```
Environment variables loaded from .env
```

### 정책 확인 API 호출

**브라우저에서**:
```
http://localhost:3000/api/dev/check-supabase-policies
```

**응답 확인**:
```json
{
  "supabaseUrl": "https://xxxxx.supabase.co",
  "hasAnonKey": true,
  "policies": [...],  // 정책 목록
  "message": "2개의 정책 발견"
}
```

---

## 💡 가능한 원인

### 원인 1: 정책이 실제로 생성 안 됨
```
해결: SQL 실행 시 Success 메시지 확인
```

### 원인 2: 버킷 이름 오타
```
코드: 'podcasts'
실제 버킷: 'podcast' ❌

해결: 버킷 이름을 'podcasts'로 변경
```

### 원인 3: authenticated 대신 public 필요
```
현재 정책: TO authenticated
문제: anon key로는 'authenticated' 아님

해결: TO public으로 변경 (테스트용)
```

### 원인 4: 캐시 문제
```
해결:
1. 브라우저 캐시 삭제
2. 시크릿 모드에서 테스트
3. Supabase 클라이언트 재생성
```

---

## 🚀 최종 해결 SQL (보장됨)

```sql
-- 모든 작업을 public으로 허용 (테스트용)
CREATE POLICY "Allow everything for podcasts bucket"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'podcasts')
WITH CHECK (bucket_id = 'podcasts');
```

**이 한 줄이면 모든 작업이 허용됩니다!**

---

**정책 적용 후 바로 테스트하세요!** (서버 재시작 필요 없음) 🎯
