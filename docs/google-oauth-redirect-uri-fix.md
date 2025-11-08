# Google OAuth 리다이렉트 URI 설정 가이드

## redirect_uri_mismatch 오류 해결

이 오류는 Google Cloud Console에 등록된 리다이렉트 URI와 실제 요청하는 URI가 정확히 일치하지 않을 때 발생합니다.

## 확인 사항

### 1. 환경 변수 확인

프로덕션 환경(Vercel)에서 `NEXTAUTH_URL` 환경 변수가 올바르게 설정되어 있는지 확인하세요:

```
NEXTAUTH_URL=https://ownbrief.vercel.app
```

**주의사항:**
- `https://`로 시작해야 함
- 끝에 슬래시(`/`)가 없어야 함
- 도메인이 정확해야 함

### 2. Google Cloud Console에 등록할 URI

**프로덕션 환경:**
```
https://ownbrief.vercel.app/api/auth/service-callback
```

**개발 환경 (로컬):**
```
http://localhost:3000/api/auth/service-callback
```

### 3. 정확한 URI 확인 방법

브라우저 개발자 도구의 Network 탭에서 OAuth 요청을 확인하거나, 서버 로그에서 다음을 확인하세요:
- `🔗 OAuth Redirect URI:` 로그 메시지
- 실제 요청되는 URI

### 4. Google Cloud Console 설정 단계

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. **API 및 서비스** > **사용자 인증 정보**로 이동
3. OAuth 2.0 클라이언트 ID 클릭
4. **승인된 리디렉션 URI** 섹션에서 다음 URI들을 **정확히** 추가:

```
https://ownbrief.vercel.app/api/auth/callback/google
https://ownbrief.vercel.app/api/auth/service-callback
```

**중요:**
- 프로토콜(`https://`)이 정확해야 함
- 도메인이 정확해야 함 (`ownbrief.vercel.app`)
- 경로가 정확해야 함 (`/api/auth/service-callback`)
- 끝에 슬래시가 없어야 함
- 대소문자 구분

### 5. 일반적인 실수

❌ 잘못된 예시:
- `https://ownbrief.vercel.app/api/auth/service-callback/` (끝에 슬래시)
- `http://ownbrief.vercel.app/api/auth/service-callback` (http 대신 https)
- `https://ownbrief.vercel.app/api/auth/service-callback ` (공백)
- `https://www.ownbrief.vercel.app/api/auth/service-callback` (www 추가)

✅ 올바른 예시:
- `https://ownbrief.vercel.app/api/auth/service-callback`

### 6. Vercel 환경 변수 설정

Vercel 대시보드에서:
1. 프로젝트 선택
2. **Settings** > **Environment Variables**
3. `NEXTAUTH_URL` 확인/수정:
   - Key: `NEXTAUTH_URL`
   - Value: `https://ownbrief.vercel.app`
   - Environment: Production, Preview, Development 모두 설정

### 7. 변경 후 확인

1. Google Cloud Console에서 URI 추가/수정 후 **저장**
2. Vercel에서 환경 변수 확인 후 **재배포**
3. 브라우저 캐시 삭제 후 다시 시도

### 8. 디버깅

코드에서 실제 사용되는 URI를 확인하려면:
- 브라우저 개발자 도구 > Network 탭
- OAuth 요청 URL 확인
- `redirect_uri` 파라미터 값 확인

서버 로그에서도 확인 가능:
```
🔗 OAuth Redirect URI: https://ownbrief.vercel.app/api/auth/service-callback
```

이 URI가 Google Cloud Console에 등록된 URI와 **정확히** 일치해야 합니다.

