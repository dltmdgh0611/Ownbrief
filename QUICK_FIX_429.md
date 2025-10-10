# ⚡ 429 에러 1분 안에 해결하기

## 문제
```
[429 Too Many Requests] You exceeded your current quota
```

---

## ✅ 해결 (1분 소요)

### 1️⃣ 새 API 키 발급
https://aistudio.google.com/app/apikey

### 2️⃣ "Create API key in new project" 클릭
→ 새 프로젝트가 자동 생성됨

### 3️⃣ API 키 복사
```
AIzaSyNEW_KEY_12345...
```

### 4️⃣ .env.local 업데이트
```env
GEMINI_API_KEY="AIzaSyNEW_KEY_12345..."
```

### 5️⃣ 서버 재시작
```bash
yarn dev
```

---

## 🎯 완료!
새 프로젝트 = 새로운 할당량 = 문제 해결! 🎉

---

**상세 가이드:** [GEMINI_QUOTA_FIX_STEP_BY_STEP.md](./GEMINI_QUOTA_FIX_STEP_BY_STEP.md)

