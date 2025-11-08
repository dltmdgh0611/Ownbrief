# Google Cloud Console 설정 가이드

## 개별 서비스 OAuth 연결을 위한 설정

온보딩에서 개별적으로 Gmail, Calendar, YouTube를 연결할 수 있도록 하려면 Google Cloud Console에서 추가 리다이렉트 URI를 설정해야 합니다.

## 설정 단계

### 1. Google Cloud Console 접속
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 선택

### 2. OAuth 2.0 클라이언트 ID 수정
1. **API 및 서비스** > **사용자 인증 정보**로 이동
2. 기존 OAuth 2.0 클라이언트 ID를 클릭하여 편집
3. **승인된 리디렉션 URI** 섹션에서 다음 URI들이 모두 있는지 확인:

**기존 URI (NextAuth 기본 로그인용):**
```
https://your-domain.com/api/auth/callback/google
```

**새로 추가할 URI (개별 서비스 연결용):**
```
https://your-domain.com/api/auth/service-callback
```

**예시 (개발 환경):**
- `http://localhost:3000/api/auth/callback/google` (기존)
- `http://localhost:3000/api/auth/service-callback` (추가 필요)

**예시 (프로덕션):**
- `https://ownbrief.vercel.app/api/auth/callback/google` (기존)
- `https://ownbrief.vercel.app/api/auth/service-callback` (추가 필요)

### 3. OAuth 동의 화면 확인
1. **API 및 서비스** > **OAuth 동의 화면**으로 이동
2. 다음 스코프가 승인되어 있는지 확인:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/youtube.readonly`

### 4. 테스트 사용자 추가 (개발 환경)
- 앱이 **테스트** 상태인 경우, 테스트 사용자 이메일을 추가해야 합니다.
- **OAuth 동의 화면** > **테스트 사용자**에서 추가

## 환경 변수 확인

`.env.local` 파일에 다음 변수들이 올바르게 설정되어 있는지 확인:

```env
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
NEXTAUTH_URL=http://localhost:3000  # 또는 프로덕션 URL
```

## 주의사항

1. **리다이렉트 URI는 정확히 일치해야 합니다**
   - 프로토콜(http/https), 도메인, 포트, 경로가 모두 정확해야 함
   - 끝에 슬래시(/)가 있으면 안 됨

2. **프로덕션 배포 시**
   - 프로덕션 도메인의 리다이렉트 URI도 추가해야 함
   - HTTPS를 사용해야 함

3. **스코프 승인**
   - 사용자가 처음 연결할 때 각 서비스에 대한 권한을 요청함
   - 사용자가 거부하면 해당 서비스는 연결되지 않음

## 문제 해결

### "redirect_uri_mismatch" 오류
- Google Cloud Console의 리다이렉트 URI와 코드의 URI가 정확히 일치하는지 확인
- 환경 변수 `NEXTAUTH_URL`이 올바른지 확인

### "access_denied" 오류
- 사용자가 권한을 거부한 경우
- OAuth 동의 화면에서 필요한 스코프가 승인되어 있는지 확인

### 팝업이 차단되는 경우
- 브라우저 팝업 차단 설정 확인
- 사용자에게 팝업을 허용하도록 안내

