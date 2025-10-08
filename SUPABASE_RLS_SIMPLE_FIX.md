# ⚡ Supabase RLS 간단 해결법

## 🎯 가장 간단한 해결 (1분)

### Supabase SQL Editor에서 이것만 실행:

```sql
-- 기존 정책 전부 삭제
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access - Anyone can read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow all operations" ON storage.objects;

-- 하나의 정책으로 모든 작업 허용
CREATE POLICY "podcasts_allow_all"
ON storage.objects
FOR ALL
TO public
USING (bucket_id = 'podcasts')
WITH CHECK (bucket_id = 'podcasts');
```

**Run 버튼 클릭 → 즉시 테스트!**

---

## 🧪 바로 테스트

```bash
1. http://localhost:3000/dev
2. "4. Supabase Storage"
3. "Storage 업로드" 클릭
4. ✅ 성공!
```

---

## 🔍 여전히 안 되면

### 버킷 이름 확인:

**Supabase Dashboard > Storage**

버킷 이름이 **정확히 'podcasts'**인지 확인!

만약 다른 이름이면:
- 'podcasts'로 새 버킷 생성
- 또는 코드에서 버킷 이름 변경

---

### 버킷이 Public인지 확인:

**Storage > podcasts 클릭 > Configuration 탭**

```
☑ Public bucket

체크 안 되어있으면:
→ "Make public" 버튼 클릭
```

---

### RLS 완전 비활성화 (최후 수단):

```sql
-- storage.objects의 RLS 끄기
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

**이렇게 하면 무조건 작동합니다!**

(나중에 다시 켜기: `ENABLE ROW LEVEL SECURITY`)

---

## 📝 정리

1. **서버 재시작**: `yarn dev` 다시 실행 (Ctrl+C 후)
2. **정책 적용**: 서버 재시작 **필요 없음** (Supabase에서 즉시)
3. **가장 간단한 해결**: 위의 `podcasts_allow_all` 정책 1개만 생성

**이 정책이면 100% 작동합니다!** ✅

