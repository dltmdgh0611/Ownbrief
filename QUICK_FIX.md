# 🚨 빠른 수정 가이드

## 에러: TypeError: Cannot read properties of undefined (reading 'userSettings')

## ⚡ 즉시 해결 방법 (3단계)

### 1단계: 개발 서버 중지
```bash
# 터미널에서 Ctrl+C 눌러서 npm run dev 중지
```

### 2단계: Prisma 클라이언트 재생성
```bash
npx prisma generate
```

### 3단계: 개발 서버 재시작
```bash
npm run dev
```

---

## 🔍 이미 수정된 사항

✅ `backend/services/onboarding.service.ts`의 import 수정됨:
```typescript
// 수정 완료
import { prisma } from '../lib/prisma';
```

---

## 📝 확인 사항

정상 작동 시 콘솔 로그:
```
✓ Ready in 3.2s
○ Compiling / ...
✓ Compiled / in 1.2s
🔍 온보딩 상태 확인 - userId: clxxx...
📊 UserSettings 조회 결과: ...
```

---

## 💡 왜 이런 에러가 발생했나요?

1. Prisma 스키마가 업데이트됨 (UserSettings 필드 추가)
2. Prisma 클라이언트가 자동 재생성 안 됨
3. `prisma.userSettings`가 `undefined`로 인식됨

**해결**: Prisma 클라이언트 수동 재생성 필요!

---

## ✅ 완료 후 테스트

```bash
# 브라우저 시크릿 모드
1. http://localhost:3000
2. Google 로그인
3. 콘솔에서 로그 확인:
   🔍 온보딩 상태 확인 - userId: xxx
   ✨ 신규 사용자 감지 - 온보딩 필요!
   🎯 온보딩 필요 감지 → /onboarding으로 리다이렉트
```

성공! 🎉

