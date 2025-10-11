# Google OAuth Token 자동 갱신 가이드

## 🚨 문제: Access Token 만료

Google OAuth Access Token은 **1시간 후 자동 만료**됩니다.

```json
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials",
    "status": "UNAUTHENTICATED"
  }
}
```

## ✅ 해결: Refresh Token으로 자동 갱신

### 1️⃣ NextAuth JWT Callback (사용자 세션)

사용자가 앱을 사용할 때마다 자동으로 토큰 갱신:

```typescript
// backend/lib/auth.ts
async jwt({ token, account, user }) {
  // 토큰이 만료되었는지 확인
  if (token.expiresAt && Date.now() < token.expiresAt * 1000) {
    return token  // 아직 유효함
  }

  // 만료되었다면 refresh token으로 갱신
  if (token.refreshToken) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    })
    
    const newTokens = await response.json()
    token.accessToken = newTokens.access_token
    token.expiresAt = Date.now() / 1000 + newTokens.expires_in
    
    // DB도 업데이트
    await prisma.account.updateMany({...})
  }
}
```

### 2️⃣ Cron Job (자동 팟캐스트 생성)

Cron job 실행 시 토큰 확인 및 갱신:

```typescript
// app/api/cron/auto-generate-podcasts/route.ts
for (const user of users) {
  const account = user.accounts.find(acc => acc.provider === 'google')
  let accessToken = account.access_token

  // 토큰 만료 확인
  if (account.expires_at * 1000 < Date.now()) {
    console.log('⏰ Token expired, refreshing...')
    accessToken = await refreshAccessToken(user.id, account.refresh_token)
  }

  // 갱신된 토큰으로 YouTube API 호출
  const videos = await getYouTubeVideos(accessToken, playlists)
}
```

### 3️⃣ Google Provider 설정

**Refresh Token을 항상 받도록** 설정:

```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  authorization: {
    params: {
      scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube",
      access_type: "offline",  // ✅ Refresh token 받기
      prompt: "consent",       // ✅ 항상 동의 화면 표시
    }
  }
})
```

## 📋 토큰 관리 플로우

### Access Token 수명 주기

```
1. 로그인
   ↓
2. Access Token (1시간 유효) + Refresh Token (영구) 발급
   ↓
3. 1시간 후 Access Token 만료
   ↓
4. Refresh Token으로 새 Access Token 발급
   ↓
5. DB와 JWT 업데이트
   ↓
6. 3-5 반복
```

### Cron Job 플로우

```
오전 2시 (설정 시간 1시간 전)
   ↓
Cron job 실행
   ↓
사용자 조회
   ↓
각 사용자마다:
  - Access Token 만료 확인
  - 만료되었다면 Refresh
  - YouTube API 호출 (플레이리스트 가져오기)
  - 팟캐스트 생성
  - 오전 3시에 공개
```

## 🔍 트러블슈팅

### 1. Refresh Token이 없는 경우

**증상**: `No refresh token available for user`

**원인**: 
- 처음 로그인 시 `access_type: 'offline'` 설정이 없었음
- Google이 이미 동의를 받아서 refresh token을 주지 않음

**해결**:
1. 사용자 로그아웃
2. Google 계정 설정 → 보안 → 앱 액세스 권한 → 앱 제거
3. 다시 로그인 (이제 `prompt: 'consent'`로 refresh token 받음)

### 2. Refresh Token도 만료된 경우

**증상**: `Failed to refresh access token`

**원인**: 
- 사용자가 6개월 이상 로그인하지 않음
- Google이 앱 권한을 취소함

**해결**:
- 사용자에게 재로그인 요청
- 이메일 알림 또는 앱 내 알림

### 3. Token이 갱신되었는데도 401 에러

**증상**: Token을 갱신했는데도 계속 401

**원인**: 
- DB는 업데이트되었지만 메모리의 변수는 이전 값
- API 전파 지연 (드물음)

**해결**:
- DB에서 최신 토큰 다시 조회
- 1-2초 대기 후 재시도

## 📊 로그 확인

### 성공 케이스

```
🕐 Auto-generate podcasts cron job started...
⏰ Current KST time: 02:00
⏰ Generating podcasts for delivery at: 03:00 KST
👥 Found 1 users for this time slot

👤 Processing user: user@example.com
⏰ Access token expired for user@example.com, refreshing...
🔄 Refreshing access token for user xxx...
✅ Access token refreshed for user xxx
🎬 Fetching videos for user user@example.com...
✅ Podcast generation complete for user@example.com
```

### 실패 케이스

```
👤 Processing user: user@example.com
⏰ Access token expired for user@example.com, refreshing...
🔄 Refreshing access token for user xxx...
❌ Failed to refresh token for user xxx: invalid_grant
⚠️ Failed to refresh token for user@example.com
```

이 경우 사용자에게 재로그인을 요청해야 합니다.

## 🚀 배포 후 테스트

1. **로그아웃 → 재로그인**
   - Refresh Token이 DB에 저장되는지 확인
   
2. **1시간 대기**
   - Access Token 자동 갱신 확인
   
3. **Cron Job 로그 확인**
   - Vercel Dashboard → Functions → Logs
   - Token refresh 로그 확인

## 💡 모범 사례

1. **항상 Refresh Token 저장**
   - `access_type: 'offline'` 설정 필수
   
2. **만료 5분 전에 갱신**
   - 현재는 만료된 후 갱신
   - 더 안전하게 하려면: `if (expiresAt - 300 < Date.now())`
   
3. **에러 처리**
   - Token refresh 실패 시 사용자 알림
   - 재로그인 유도
   
4. **로깅**
   - 모든 토큰 갱신 이벤트 로깅
   - 성공/실패 추적

## 📚 참고 자료

- [Google OAuth 2.0 Refresh Tokens](https://developers.google.com/identity/protocols/oauth2#expiration)
- [NextAuth.js Refresh Token Rotation](https://next-auth.js.org/tutorials/refresh-token-rotation)
- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

