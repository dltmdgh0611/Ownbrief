# 🔄 빠른 재인증 가이드

## ⚠️ 문제: "No refresh token - please re-login"

Cron job 로그에서 이 메시지가 나오면 **재로그인**이 필요합니다.

```
⚠️ No refresh token available for user xxx@gmail.com
```

## 🚀 해결 방법 (2분 소요)

### 방법 1: 앱에서 직접 (추천)

1. **앱 접속**
   - 상단에 주황색 배너 표시됨: "⚠️ 재인증이 필요합니다"
   
2. **"재인증하기" 버튼 클릭**
   - 자동으로 로그아웃됨
   
3. **Google 계정 권한 제거**
   - 브라우저에서: https://myaccount.google.com/permissions
   - 앱 이름(aicast 또는 Ownbrief) 찾기
   - **"액세스 권한 삭제"** 클릭
   
4. **다시 로그인**
   - 앱에서 "Google로 로그인" 클릭
   - Google 동의 화면에서 **"허용"** 클릭
   - ✅ 완료! 이제 Refresh Token이 저장됨

### 방법 2: 수동 (앱 배너가 없는 경우)

1. **로그아웃**
   - 앱 → 설정 → 로그아웃
   
2. **Google 계정 설정에서 앱 제거**
   - https://myaccount.google.com/permissions
   - 또는: Google 계정 → 보안 → 타사 앱 액세스 권한
   - 앱 찾기 → **"액세스 권한 삭제"**
   
3. **다시 로그인**
   - 앱에서 "Google로 로그인"
   - ✅ 완료!

---

## 📊 재인증 전후 비교

| 항목 | 재인증 전 | 재인증 후 |
|-----|----------|----------|
| Access Token | ✅ 있음 (1시간 유효) | ✅ 있음 |
| Refresh Token | ❌ 없음 | ✅ 있음 |
| 자동 팟캐스트 | ❌ 실패 | ✅ 작동 |
| 토큰 자동 갱신 | ❌ 불가능 | ✅ 자동 |

---

## 🔍 재인증 확인 방법

### 1. 앱에서 확인
- 재로그인 후 주황색 배너가 **사라지면** 성공

### 2. API로 확인
```bash
# 로그인한 상태에서
curl https://your-domain.vercel.app/api/user/check-token

# 응답:
{
  "hasAccount": true,
  "hasRefreshToken": true,    # ← 이게 true여야 함!
  "isExpired": false,
  "needsReauth": false,
  "message": "✅ 토큰이 정상입니다."
}
```

### 3. 다음 Cron 실행 대기
- 설정한 시간 1시간 전에 Cron 실행
- Vercel Dashboard → Functions → Logs 확인
- 예상 로그:
  ```
  👤 Processing user: xxx@gmail.com
  🎬 Fetching videos...
  ✅ Podcast generation complete
  ```

---

## ❓ FAQ

### Q1: 왜 이런 일이 발생했나요?
**A:** 최근 업데이트로 Refresh Token 받는 설정(`access_type: 'offline'`)을 추가했습니다. 기존 사용자는 이 설정 없이 로그인해서 Refresh Token이 없습니다.

### Q2: 재인증 후에도 문제가 있다면?
**A:** 다음을 확인하세요:
1. Google 계정 권한을 정말로 제거했는지
2. 로그인 시 "허용" 버튼을 눌렀는지
3. API(`/api/user/check-token`)로 `hasRefreshToken: true` 확인

### Q3: 다른 사용자도 재인증 해야 하나요?
**A:** 네, 이번 업데이트 **이전에** 로그인한 모든 사용자는 한 번 재인증이 필요합니다. 이후에 가입하는 사용자는 자동으로 Refresh Token을 받습니다.

### Q4: 얼마나 자주 재인증 해야 하나요?
**A:** **단 한 번만** 하면 됩니다! Refresh Token은 영구적으로 유효하며, 이후 Access Token은 자동으로 갱신됩니다.

### Q5: 재인증 안 하면 어떻게 되나요?
**A:** 
- ❌ 자동 팟캐스트 생성 실패
- ❌ YouTube 플레이리스트 접근 불가
- ✅ 하지만 앱 접속과 로그인은 정상 작동

---

## 🎯 중요 포인트

### ✅ DO
- Google 계정 권한을 먼저 제거
- 동의 화면에서 "허용" 클릭
- 재인증 후 토큰 상태 확인

### ❌ DON'T
- 로그아웃만 하고 다시 로그인 (권한 제거 안 함)
- "허용" 대신 "취소" 클릭
- 여러 번 시도 (한 번만 제대로 하면 됨)

---

## 📝 배포 체크리스트

이번 업데이트 배포 시:

- [x] `access_type: 'offline'` 추가
- [x] `prompt: 'consent'` 추가
- [x] JWT callback에 토큰 갱신 로직 추가
- [x] Cron job에 토큰 확인 로직 추가
- [x] 토큰 상태 확인 API 추가
- [x] 재인증 안내 배너 추가
- [ ] 기존 사용자에게 재인증 요청 안내
- [ ] 다음 Cron 실행 시 로그 모니터링

---

## 📞 문제 해결

재인증 후에도 문제가 계속되면:

1. **브라우저 캐시 삭제**
   - Ctrl+Shift+Delete → 쿠키 및 캐시 삭제
   
2. **시크릿 모드에서 테스트**
   - 시크릿 창에서 로그인 시도
   
3. **다른 브라우저에서 시도**
   - Chrome, Firefox, Safari 등
   
4. **로그 확인**
   - Vercel Dashboard → Functions → Logs
   - 에러 메시지 확인

그래도 안 되면 GitHub Issue를 생성하거나 개발자에게 문의하세요.

