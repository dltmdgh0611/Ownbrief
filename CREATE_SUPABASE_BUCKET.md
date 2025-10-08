# 🪣 Supabase Storage 버킷 생성 가이드

## 🐛 에러
```
StorageApiError: Bucket not found
```

**원인**: 'podcasts' 버킷이 Supabase Storage에 생성되지 않음

---

## ✅ 해결 방법 (2가지)

### 방법 1: Dashboard에서 생성 (쉬움) ⭐

#### 1. Supabase Dashboard 접속
```
https://app.supabase.com
```

#### 2. 프로젝트 선택
- 현재 사용 중인 프로젝트 클릭

#### 3. Storage 메뉴로 이동
```
왼쪽 메뉴
  ↓
🗄️ Storage 클릭
```

#### 4. 새 버킷 생성
```
1. "New bucket" 또는 "Create a new bucket" 버튼 클릭

2. 버킷 설정:
   ┌─────────────────────────────────────┐
   │ Name: podcasts                      │  ⭐ 정확히 'podcasts'
   │                                     │
   │ ☑ Public bucket                    │  ⭐ 반드시 체크!
   │                                     │
   │ File size limit: 50 MB              │
   │                                     │
   │ Allowed MIME types: (비워둠)        │
   └─────────────────────────────────────┘

3. "Create bucket" 버튼 클릭
```

#### 5. 버킷 확인
```
Storage 메뉴에서 'podcasts' 버킷이 보이면 성공! ✅
```

---

### 방법 2: SQL로 생성 (빠름)

#### 1. SQL Editor 열기
```
왼쪽 메뉴 > 🔧 SQL Editor 클릭
```

#### 2. New query 생성
```
"New query" 또는 "+ " 버튼 클릭
```

#### 3. 다음 SQL 붙여넣기
```sql
-- 1. Bucket 생성
insert into storage.buckets (id, name, public)
values ('podcasts', 'podcasts', true);

-- 2. Public 읽기 정책 (누구나 오디오 파일 접근 가능)
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'podcasts' );

-- 3. 인증된 사용자만 업로드 가능
create policy "Authenticated users can upload"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'podcasts' );

-- 4. 본인이 업로드한 파일만 삭제 가능 (선택사항)
create policy "Users can delete own files"
on storage.objects for delete
to authenticated
using ( bucket_id = 'podcasts' );
```

#### 4. 실행
```
"Run" 또는 Ctrl+Enter 누르기
```

#### 5. 결과 확인
```
✅ Success. No rows returned

Storage 메뉴에서 'podcasts' 버킷 확인
```

---

## 🔍 버킷 생성 확인

### Dashboard에서 확인
```
Storage 메뉴
  ↓
버킷 목록에 'podcasts' 있는지 확인
  ↓
podcasts 클릭
  ↓
빈 폴더 화면 (정상)
```

### SQL로 확인
```sql
-- SQL Editor에서 실행
select * from storage.buckets where name = 'podcasts';
```

**예상 결과**:
```
id       | podcasts
name     | podcasts
public   | true
created_at | 2025-10-08 ...
```

---

## 🧪 테스트

### 1. 버킷 생성 완료 후
```bash
1. 서버 재시작 (npm run dev)
2. 팟캐스트 생성
3. 음성 생성까지 진행
4. 콘솔 로그 확인:
   📤 Uploading to Supabase Storage: podcast-xxx.wav
   ✅ Upload successful: podcast-xxx.wav
   🔗 Public URL: https://xxxxx.supabase.co/storage/v1/object/public/podcasts/podcast-xxx.wav
```

### 2. Supabase Dashboard에서 파일 확인
```
Storage > podcasts 버킷
  ↓
업로드된 파일 목록:
- podcast-clxxx1.wav (3.2 MB)
- podcast-clxxx2.wav (2.8 MB)
```

---

## ⚠️ 중요 체크리스트

버킷 생성 시 반드시 확인:

- [ ] 이름이 정확히 **'podcasts'**인가? (오타 없이)
- [ ] **Public bucket** 체크했는가?
- [ ] 버킷이 생성되었는가? (Storage 메뉴에서 확인)
- [ ] 서버를 재시작했는가?

---

## 🔧 트러블슈팅

### 에러: "Bucket not found"
```
✅ 해결: Storage에서 'podcasts' 버킷 생성
```

### 에러: "Row level security policy"
```
✅ 해결: Public 읽기 정책 추가 (위 SQL 참고)
```

### 에러: "Access denied"
```
✅ 해결: Public bucket으로 생성했는지 확인
```

### 버킷은 있는데도 에러
```
1. 버킷 이름 확인 (오타?)
2. 서버 재시작했는지 확인
3. 환경 변수 올바른지 확인
```

---

## 🎯 최종 확인

정상 작동 시 콘솔 로그:

```
🎤 Gemini 네이티브 TTS 음성 생성 시작...
✅ Gemini 네이티브 TTS 음성 생성 완료
📤 Uploading to Supabase Storage: podcast-cmxxx.wav (3.45MB)
✅ Upload successful: podcast-cmxxx.wav
🔗 Public URL: https://xxxxx.supabase.co/storage/v1/object/public/podcasts/podcast-cmxxx.wav
✅ Podcast voice generation complete
```

---

## 🚀 빠른 해결 (30초)

```
1. https://app.supabase.com 로그인
2. 프로젝트 선택
3. Storage 클릭
4. New bucket 클릭
5. 이름: podcasts, Public: ✅ 체크
6. Create bucket
7. 완료! ✅
```

**버킷 생성 완료 후 팟캐스트 생성을 다시 시도하세요!** 🎉

