# Google OAuth Refresh Token 디버깅 가이드

## 🚨 증상

권한을 완전히 제거하고 동의 화면에서 허용했는데도 `hasRefreshToken: false`가 나옵니다.

## 🔍 단계별 진단

### 1단계: 서버 로그 확인 (가장 중요!)

배포 후 다시 로그인하면서 **Vercel 로그**를 실시간으로 확인하세요:

1. Vercel Dashboard → 프로젝트 선택
2. Deployments → 최신 배포 클릭
3. Functions → Logs
4. 새 탭에서 시크릿 모드로 로그인 시도

**기대하는 로그:**
```
🔐 JWT Callback - Account received: {
  provider: 'google',
  hasAccessToken: true,
  hasRefreshToken: true,    ← 이게 true여야 함!
  expiresAt: 1697123456
}
✅ Refresh token saved to DB for user: xxx
```

**문제가 있는 로그:**
```
🔐 JWT Callback - Account received: {
  provider: 'google',
  hasAccessToken: true,
  hasRefreshToken: false,   ← 문제!
  expiresAt: 1697123456
}
⚠️ Google did not provide refresh_token! Check OAuth app settings.
```

### 2단계: Google Cloud Console 설정 확인

만약 `hasRefreshToken: false`가 나온다면 Google OAuth 앱 설정 문제입니다.

#### 확인할 항목:

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com

2. **API 및 서비스 → 사용자 인증 정보**

3. **OAuth 2.0 클라이언트 ID** 클릭

4. **승인된 리디렉션 URI 확인**
   ```
   http://localhost:3000/api/auth/callback/google  (개발)
   https://your-domain.vercel.app/api/auth/callback/google  (프로덕션)
   ```
   ✅ 정확히 일치해야 함! (끝에 슬래시 없음)

5. **OAuth 동의 화면 → 앱 게시 상태**
   - ⚠️ "테스트" 모드라면 → **테스트 사용자에 이메일 추가**
   - ✅ "프로덕션" 모드 (추천)

6. **범위(Scope) 확인**
   - openid
   - email
   - profile
   - https://www.googleapis.com/auth/youtube.readonly
   - https://www.googleapis.com/auth/youtube

### 3단계: 환경 변수 확인

Vercel Dashboard → Settings → Environment Variables:

```bash
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
NEXTAUTH_URL=https://your-domain.vercel.app  (또는 http://localhost:3000)
NEXTAUTH_SECRET=랜덤한긴문자열
```

⚠️ **주의**: 
- `NEXTAUTH_URL`에 끝에 슬래시(/) 없어야 함
- Production, Preview 환경 모두 설정

### 4단계: Google OAuth 앱 타입 확인

Google Cloud Console에서 OAuth 클라이언트를 만들 때:

- ✅ **웹 애플리케이션** 타입이어야 함
- ❌ "데스크톱 앱" 또는 "모바일 앱"이면 안 됨!

"데스크톱 앱" 타입은 Refresh Token 발급 방식이 다릅니다.

---

## ✅ 해결 방법

### Case 1: Google이 Refresh Token을 안 준 경우

로그에서 `hasRefreshToken: false`가 나오면:

#### 옵션 A: OAuth 앱 재생성 (추천)

1. Google Cloud Console → API 및 서비스 → 사용자 인증 정보
2. 기존 OAuth 클라이언트 ID **삭제**
3. **새로 만들기**:
   - 애플리케이션 유형: **웹 애플리케이션**
   - 이름: aicast (또는 원하는 이름)
   - 승인된 JavaScript 원본: `https://your-domain.vercel.app`
   - 승인된 리디렉션 URI: `https://your-domain.vercel.app/api/auth/callback/google`
4. 새 Client ID와 Secret을 Vercel 환경 변수에 업데이트
5. Vercel 재배포

#### 옵션 B: OAuth 동의 화면 설정 변경

1. OAuth 동의 화면으로 이동
2. **게시 상태를 "프로덕션"으로 변경**
3. 앱 검토 제출 (또는 테스트 사용자 추가)

### Case 2: NextAuth가 DB에 저장 안 한 경우

로그에서 `hasRefreshToken: true`인데 DB에는 없다면:

```
🔐 JWT Callback - Account received: { hasRefreshToken: true }
❌ Failed to save refresh token to DB: [error]
```

**Prisma 연결 문제**일 수 있습니다:
- [SUPABASE_VERCEL_SETUP.md](./SUPABASE_VERCEL_SETUP.md) 참고
- `DATABASE_URL`이 Transaction Pooler (port 6543) 사용하는지 확인

---

## 🧪 테스트 절차

### 1. 로컬에서 테스트

```bash
# .env.local 파일
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
DATABASE_URL=postgresql://...

npm run dev
```

1. Google 계정 권한 완전히 제거
2. 브라우저 시크릿 모드
3. `http://localhost:3000` 접속
4. Google 로그인
5. 터미널 로그 확인:
   ```
   🔐 JWT Callback - Account received: { hasRefreshToken: true }
   ✅ Refresh token saved to DB
   ```

### 2. Vercel 배포 후 테스트

1. Git push → Vercel 자동 배포
2. Vercel Dashboard → Functions → Logs (실시간 모니터링)
3. 시크릿 모드에서 로그인
4. Vercel 로그 확인

### 3. DB 확인

```bash
# Prisma Studio로 확인
npx prisma studio

# 또는 SQL 직접 실행
```

브라우저에서:
```javascript
fetch('/api/dev/check-db-token')
  .then(r => r.json())
  .then(console.log)
```

---

## 💡 자주 있는 실수

### 1. 리디렉션 URI 불일치

```
# ❌ 잘못된 예
https://your-domain.vercel.app/api/auth/callback/google/

# ✅ 올바른 예
https://your-domain.vercel.app/api/auth/callback/google
```

끝에 슬래시(`/`)가 있으면 안 됩니다!

### 2. 환경 변수 누락

- Vercel에서 Production과 Preview 둘 다 설정했는지 확인
- 대소문자 정확히 일치해야 함

### 3. OAuth 앱 타입 잘못됨

- "데스크톱 앱"이 아닌 **"웹 애플리케이션"**이어야 함

### 4. 테스트 모드에서 테스트 사용자 미등록

- OAuth 동의 화면이 "테스트" 모드라면
- "테스트 사용자"에 본인 이메일 추가 필수!

---

## 📊 체크리스트

배포 전:
- [ ] Google OAuth 앱 타입: 웹 애플리케이션
- [ ] 리디렉션 URI 정확히 설정 (끝에 슬래시 없음)
- [ ] Vercel 환경 변수 모두 설정
- [ ] `DATABASE_URL`이 Transaction Pooler 사용
- [ ] 로컬에서 정상 작동 확인

배포 후:
- [ ] Git push & Vercel 자동 배포
- [ ] Vercel 로그 실시간 모니터링
- [ ] 시크릿 모드에서 로그인 테스트
- [ ] `hasRefreshToken: true` 로그 확인
- [ ] `/api/dev/check-db-token`으로 DB 확인

---

## 🆘 여전히 안 되면?

다음 정보를 첨부해서 문의하세요:

1. **Vercel 로그** (로그인 시점의 로그)
2. **Google OAuth 앱 설정** 스크린샷
   - OAuth 클라이언트 ID 타입
   - 리디렉션 URI
   - OAuth 동의 화면 게시 상태
3. **환경 변수 목록** (값은 가리고 키 이름만)
4. **브라우저 콘솔** 로그
   ```javascript
   fetch('/api/dev/check-db-token').then(r => r.json()).then(console.log)
   ```

---

## 📚 참고 자료

- [Google OAuth 2.0 Refresh Token](https://developers.google.com/identity/protocols/oauth2/web-server#offline)
- [NextAuth.js Google Provider](https://next-auth.js.org/providers/google)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

