# 🔒 Supabase Storage RLS 정책 설정

## 🐛 에러
```
new row violates row-level security policy
```

**원인**: 'podcasts' 버킷은 있지만, 업로드 권한 정책(RLS)이 설정되지 않음

---

## ✅ 해결 방법 (SQL 실행)

### Supabase SQL Editor에서 실행:

```sql
-- 1. 모든 사용자가 읽기 가능 (Public)
CREATE POLICY "Public Access - Anyone can read"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcasts');

-- 2. 인증된 사용자만 업로드 가능
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'podcasts');

-- 3. 인증된 사용자만 업데이트 가능 (선택사항)
CREATE POLICY "Authenticated users can update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'podcasts')
WITH CHECK (bucket_id = 'podcasts');

-- 4. 본인이 업로드한 파일만 삭제 가능 (선택사항)
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'podcasts' AND auth.uid()::text = owner);
```

---

## 🚀 빠른 실행 (복사 & 붙여넣기)

### 1. Supabase Dashboard 접속
```
https://app.supabase.com
→ 프로젝트 선택
```

### 2. SQL Editor 열기
```
왼쪽 메뉴 > 🔧 SQL Editor
→ "New query" 클릭
```

### 3. 아래 SQL 전체 복사 & 붙여넣기

```sql
-- Supabase Storage RLS 정책 설정
-- 'podcasts' 버킷용

-- 1. 읽기 정책: 누구나 읽기 가능
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'podcasts');

-- 2. 삽입 정책: 인증된 사용자만 업로드
CREATE POLICY "Authenticated insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'podcasts');

-- 3. 업데이트 정책: 인증된 사용자만
CREATE POLICY "Authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'podcasts')
WITH CHECK (bucket_id = 'podcasts');

-- 4. 삭제 정책: 인증된 사용자만
CREATE POLICY "Authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'podcasts');
```

### 4. "Run" 버튼 클릭

### 5. 결과 확인
```
✅ Success. No rows returned

또는

✅ 4 rows affected (정책 4개 생성됨)
```

---

## 🔍 정책 설명

### 정책 1: Public read access
```sql
FOR SELECT
USING (bucket_id = 'podcasts');
```

**의미**: 누구나 'podcasts' 버킷의 파일을 읽을 수 있음  
**필요성**: 팟캐스트를 로그인 없이도 들을 수 있게

### 정책 2: Authenticated insert
```sql
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'podcasts');
```

**의미**: 로그인한 사용자만 'podcasts' 버킷에 업로드 가능  
**필요성**: 아무나 파일을 업로드하지 못하도록

### 정책 3: Authenticated update
```sql
FOR UPDATE
TO authenticated
```

**의미**: 로그인한 사용자만 파일 수정 가능

### 정책 4: Authenticated delete
```sql
FOR DELETE
TO authenticated
```

**의미**: 로그인한 사용자만 파일 삭제 가능

---

## 📋 정책 확인

### SQL로 정책 확인:

```sql
-- storage.objects 테이블의 정책 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%podcasts%';
```

**예상 결과**:
```
4 rows (4개 정책)
- Public read access
- Authenticated insert
- Authenticated update
- Authenticated delete
```

---

## 🧪 테스트

### 정책 설정 후:

```bash
1. http://localhost:3000/dev 접속
2. "4. Supabase Storage" 섹션
3. "Storage 업로드" 버튼 클릭
4. 결과 확인:

✓ 업로드 성공 ✅
파일: test-podcast-1696750000.wav
크기: 48.04KB
URL: https://xxxxx.supabase.co/storage/v1/object/public/podcasts/test-podcast-...
```

---

## 🔐 보안 수준

### 현재 설정 (권장):
```
읽기:   🌐 Public (누구나)
쓰기:   🔒 Authenticated (로그인 필요)
수정:   🔒 Authenticated (로그인 필요)
삭제:   🔒 Authenticated (로그인 필요)
```

**이유**: 
- 팟캐스트는 공개 콘텐츠 (누구나 들을 수 있어야 함)
- 업로드는 인증된 사용자만 (스팸 방지)

---

## ⚠️ 흔한 실수

### 실수 1: 정책 이름 중복
```sql
-- 이미 같은 이름의 정책이 있으면 에러
ERROR: duplicate key value violates unique constraint
```

**해결**: 
```sql
-- 기존 정책 먼저 삭제
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
-- 그 다음 생성
CREATE POLICY "Public read access" ...
```

### 실수 2: bucket_id 오타
```sql
-- ❌ 틀림
bucket_id = 'podcast'   -- s 빠짐!

-- ✅ 올바름
bucket_id = 'podcasts'
```

### 실수 3: 정책을 잘못된 테이블에 적용
```sql
-- ❌ 틀림
ON storage.buckets ...

-- ✅ 올바름
ON storage.objects ...
```

---

## 🎯 전체 설정 순서 (처음부터)

```
1. Supabase 프로젝트 생성
   ↓
2. 환경 변수 설정 (.env)
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ↓
3. Storage 버킷 생성
   이름: podcasts
   Public: ✅
   ↓
4. RLS 정책 설정 (이 문서의 SQL) ⭐
   ↓
5. 서버 재시작
   ↓
6. 테스트 (/dev > Storage 업로드)
   ↓
7. ✅ 성공!
```

---

## 💡 정책이 제대로 설정되었는지 확인

### 테스트 1: 읽기 (Public)
```bash
# 브라우저에서 직접 접속
https://xxxxx.supabase.co/storage/v1/object/public/podcasts/test-podcast-xxx.wav

✅ 파일 다운로드되면 성공
❌ 403 Forbidden이면 읽기 정책 없음
```

### 테스트 2: 쓰기 (Authenticated)
```bash
# /dev 페이지에서
"Storage 업로드" 버튼 클릭

✅ 업로드 성공하면 정책 OK
❌ RLS 에러면 쓰기 정책 없음
```

---

**SQL 실행 후 바로 테스트하면 됩니다!** (서버 재시작 필요 없음)

정책 설정 SQL은 위의 코드 블록을 복사해서 Supabase SQL Editor에 붙여넣고 실행하세요! 🚀
