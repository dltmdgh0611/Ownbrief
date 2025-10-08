# 🔍 온보딩 디버깅 가이드

## 문제: 신규 로그인 시 온보딩 페이지로 자동 이동 안 됨

## ✅ 수정 사항

### 1. useOnboarding Hook 개선
**파일**: `frontend/hooks/useOnboarding.ts`

**변경 사항**:
- 세션이 로드된 후에만 온보딩 상태 확인
- 로그인 안 된 경우 즉시 로딩 완료 처리
- 401 에러 처리 추가
- 디버깅 로그 추가

```typescript
useEffect(() => {
  // 세션이 로드되고 로그인된 상태에서만 온보딩 체크
  if (sessionStatus === 'authenticated' && session) {
    checkOnboardingStatus();
  } else if (sessionStatus === 'unauthenticated') {
    setLoading(false);
    setStatus(null);
  }
}, [session, sessionStatus]);
```

### 2. Onboarding Service 로깅 추가
**파일**: `backend/services/onboarding.service.ts`

**추가된 로그**:
```typescript
console.log('🔍 온보딩 상태 확인 - userId:', userId);
console.log('📊 UserSettings 조회 결과:', settings);
console.log('✨ 신규 사용자 감지 - 온보딩 필요!');
console.log('✅ 기존 사용자 - 온보딩 완료됨');
```

### 3. 메인 페이지 리다이렉트 로직 강화
**파일**: `app/page.tsx`

**추가된 로그**:
```typescript
console.log('🚪 로그인 안 됨 → /welcome으로 리다이렉트');
console.log('🎯 온보딩 필요 감지 → /onboarding으로 리다이렉트');
console.log('✅ 온보딩 완료 - 홈 화면 표시');
```

---

## 🧪 테스트 방법

### Step 1: 완전 신규 사용자 테스트

```bash
1. 브라우저 시크릿 모드 실행
2. 개발자 도구 열기 (F12)
3. Console 탭 열기
4. http://localhost:3000 접속
```

**예상 로그 순서**:
```
🚪 로그인 안 됨 → /welcome으로 리다이렉트
```

```bash
5. Google 로그인 버튼 클릭
6. Google 계정 선택 및 권한 승인
7. 로그인 완료 후 콘솔 확인
```

**예상 로그 순서**:
```
🔍 온보딩 상태 확인 - userId: clxxx...
📊 UserSettings 조회 결과: null
✨ 신규 사용자 감지 - 온보딩 필요!
📋 온보딩 상태: {
  isNewUser: true,
  needsOnboarding: true,
  settings: null
}
🎯 온보딩 필요 감지 → /onboarding으로 리다이렉트
```

```bash
8. 온보딩 페이지에서 관심사 선택
9. 플레이리스트 선택
10. "시작하기" 버튼 클릭
```

**예상 로그 순서**:
```
💾 온보딩 완료 처리 시작 - userId: clxxx...
📋 데이터: {
  interests: ['AI', 'Technology', 'Startup'],
  selectedPlaylists: ['PLxxx1', 'PLxxx2']
}
✅ 온보딩 완료! onboardingCompleted = true
```

```bash
11. 홈으로 리다이렉트 확인
```

**예상 로그 순서**:
```
🔍 온보딩 상태 확인 - userId: clxxx...
📊 UserSettings 조회 결과: {
  onboardingCompleted: true,
  interests: ['AI', 'Technology', 'Startup'],
  selectedPlaylists: ['PLxxx1', 'PLxxx2']
}
✅ 기존 사용자 - 온보딩 완료됨
📋 온보딩 상태: {
  isNewUser: false,
  needsOnboarding: false,
  settings: {...}
}
✅ 온보딩 완료 - 홈 화면 표시
```

---

### Step 2: 기존 사용자 테스트

```bash
1. 이미 온보딩 완료한 계정으로 로그인
2. http://localhost:3000 접속
```

**예상 로그**:
```
🔍 온보딩 상태 확인 - userId: clxxx...
📊 UserSettings 조회 결과: { onboardingCompleted: true, ... }
✅ 기존 사용자 - 온보딩 완료됨
✅ 온보딩 완료 - 홈 화면 표시
```

---

## 🐛 문제 해결

### 문제 1: 로그인 후에도 /onboarding으로 안 가는 경우

**체크 리스트**:
1. [ ] 콘솔에 "🔍 온보딩 상태 확인" 로그가 있는가?
   - 없으면: useSession이 제대로 작동 안 함
   - 해결: NextAuth 설정 확인

2. [ ] "📊 UserSettings 조회 결과: null" 로그가 있는가?
   - 없으면: userId가 잘못됨
   - 해결: session.user.id 확인

3. [ ] "✨ 신규 사용자 감지" 로그가 있는가?
   - 없으면: onboarding.service.ts 로직 문제
   - 해결: checkOnboardingStatus 함수 확인

4. [ ] "🎯 온보딩 필요 감지" 로그가 있는가?
   - 없으면: app/page.tsx의 useEffect 문제
   - 해결: onboardingStatus.needsOnboarding 확인

---

### 문제 2: UserSettings가 null이 아닌데 onboardingCompleted가 false

**원인**: 이전에 UserSettings가 생성되었지만 onboardingCompleted가 false인 경우

**해결 방법**:
```sql
-- DB에서 직접 확인
SELECT * FROM "UserSettings" WHERE "userId" = 'xxx';

-- onboardingCompleted 업데이트
UPDATE "UserSettings" 
SET "onboardingCompleted" = true 
WHERE "userId" = 'xxx';
```

또는:
```bash
# Prisma Studio로 확인
npx prisma studio
```

---

### 문제 3: 세션에 userId가 없는 경우

**체크 리스트**:
1. [ ] `backend/lib/auth.ts`에서 userId가 세션에 추가되는가?

```typescript
// auth.ts의 session callback 확인
async session({ session, token, user }) {
  session.accessToken = token.accessToken as string
  
  // JWT 전략을 사용하므로 token에서 userId 가져오기
  if (token.userId) {
    session.user.id = token.userId as string
  }
  
  return session
}
```

2. [ ] jwt callback에서 userId가 설정되는가?

```typescript
async jwt({ token, account, user }) {
  if (account) {
    token.accessToken = account.access_token
    token.refreshToken = account.refresh_token
    token.expiresAt = account.expires_at
  }
  if (user) {
    token.userId = user.id  // 이 부분 확인!
  }
  return token
}
```

---

## 📊 데이터베이스 확인

### UserSettings 테이블 확인
```sql
SELECT 
  "userId",
  "onboardingCompleted",
  array_length("interests", 1) as interests_count,
  array_length("selectedPlaylists", 1) as playlists_count,
  "createdAt",
  "updatedAt"
FROM "UserSettings"
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 특정 사용자 확인
```sql
SELECT * FROM "UserSettings" 
WHERE "userId" = 'YOUR_USER_ID_HERE';
```

### 온보딩 미완료 사용자 찾기
```sql
SELECT * FROM "UserSettings" 
WHERE "onboardingCompleted" = false;
```

---

## 🔧 수동 테스트 명령어

### 1. 온보딩 상태 API 직접 호출
```bash
# 로그인 후 브라우저 콘솔에서
fetch('/api/onboarding/status')
  .then(r => r.json())
  .then(console.log)
```

**예상 응답 (신규 사용자)**:
```json
{
  "isNewUser": true,
  "needsOnboarding": true,
  "settings": null
}
```

**예상 응답 (기존 사용자)**:
```json
{
  "isNewUser": false,
  "needsOnboarding": false,
  "settings": {
    "onboardingCompleted": true,
    "interests": ["AI", "Technology"],
    "selectedPlaylists": ["PLxxx"]
  }
}
```

### 2. 온보딩 완료 API 테스트
```bash
# 브라우저 콘솔에서
fetch('/api/onboarding/complete', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    interests: ['AI', 'Technology'],
    selectedPlaylists: ['PLxxx1']
  })
})
  .then(r => r.json())
  .then(console.log)
```

---

## ✅ 정상 작동 체크리스트

신규 사용자 온보딩이 정상적으로 작동하려면:

- [ ] 로그인 안 된 사용자 → `/welcome` 리다이렉트
- [ ] Google 로그인 성공
- [ ] 세션에 `userId` 포함 확인
- [ ] `/api/onboarding/status` 호출
- [ ] `needsOnboarding: true` 반환
- [ ] `/onboarding` 자동 리다이렉트
- [ ] 관심사 선택 (1~5개)
- [ ] 플레이리스트 선택 (1개 이상)
- [ ] `/api/onboarding/complete` 호출
- [ ] `onboardingCompleted: true` 저장
- [ ] `/` 홈으로 리다이렉트
- [ ] 홈 화면 표시 (PodcastGenerator)

---

## 🚨 자주 발생하는 에러

### 에러 1: "인증이 필요합니다"
```
원인: 세션이 없거나 만료됨
해결: 다시 로그인
```

### 에러 2: "온보딩 상태를 확인할 수 없습니다"
```
원인: DB 연결 문제 또는 Prisma 에러
해결: 
1. DATABASE_URL 환경 변수 확인
2. npx prisma generate 실행
3. 서버 재시작
```

### 에러 3: 무한 리다이렉트
```
원인: 온보딩 상태와 실제 페이지 불일치
해결: 
1. 콘솔 로그 확인
2. 브라우저 캐시 삭제
3. 시크릿 모드에서 재테스트
```

---

## 📝 로그 해석 가이드

| 로그 | 의미 | 다음 동작 |
|------|------|----------|
| 🚪 로그인 안 됨 | 세션 없음 | /welcome으로 이동 |
| 🔍 온보딩 상태 확인 | API 호출 시작 | DB 조회 중 |
| 📊 UserSettings: null | 신규 사용자 | 온보딩 필요 |
| ✨ 신규 사용자 감지 | needsOnboarding: true | /onboarding 이동 |
| 🎯 온보딩 필요 감지 | 리다이렉트 시작 | 페이지 이동 |
| 💾 온보딩 완료 처리 | 저장 시작 | DB 업데이트 |
| ✅ 온보딩 완료! | 저장 성공 | 홈으로 이동 |
| ✅ 기존 사용자 | 온보딩 완료됨 | 홈 화면 표시 |

---

## 🎉 테스트 성공 시나리오

완벽하게 작동한다면 콘솔에 다음과 같은 로그가 순서대로 출력됩니다:

```
1. 앱 시작 (미로그인)
   🚪 로그인 안 됨 → /welcome으로 리다이렉트

2. Google 로그인 후
   🔍 온보딩 상태 확인 - userId: clxxx...
   📊 UserSettings 조회 결과: null
   ✨ 신규 사용자 감지 - 온보딩 필요!
   🎯 온보딩 필요 감지 → /onboarding으로 리다이렉트

3. 온보딩 완료 후
   💾 온보딩 완료 처리 시작
   ✅ 온보딩 완료! onboardingCompleted = true
   🔍 온보딩 상태 확인 - userId: clxxx...
   ✅ 기존 사용자 - 온보딩 완료됨
   ✅ 온보딩 완료 - 홈 화면 표시
```

이 순서대로 로그가 나오면 모든 것이 정상입니다! ✅

