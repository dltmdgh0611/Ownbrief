# 🔧 Prisma 에러 수정 가이드

## 에러: TypeError: Cannot read properties of undefined (reading 'userSettings')

### 원인
Prisma Client가 제대로 생성되지 않았거나, UserSettings 모델을 인식하지 못함

---

## ✅ 해결 방법

### 방법 1: 개발 서버 재시작 (가장 간단)

```bash
# 1. 현재 실행 중인 서버 중지 (Ctrl+C)

# 2. node_modules/.prisma 폴더 삭제
rm -rf node_modules/.prisma

# 3. Prisma 클라이언트 재생성
npx prisma generate

# 4. 개발 서버 재시작
npm run dev
```

### 방법 2: Windows에서 파일 잠금 문제 해결

```bash
# 1. 작업 관리자 열기 (Ctrl+Shift+Esc)
# 2. "세부 정보" 탭
# 3. node.exe 프로세스 모두 종료
# 4. VS Code 재시작
# 5. 다시 시도

npx prisma generate
npm run dev
```

### 방법 3: 수동으로 마이그레이션 확인

```bash
# 1. 마이그레이션 상태 확인
npx prisma migrate status

# 2. 마이그레이션 적용 (필요시)
npx prisma migrate deploy

# 3. Prisma Studio로 데이터 확인
npx prisma studio

# 4. UserSettings 테이블이 있는지 확인
```

---

## 🔍 코드 수정사항

### backend/services/onboarding.service.ts
```typescript
// Before (잘못된 import)
import prisma from '../lib/prisma';

// After (올바른 import)
import { prisma } from '../lib/prisma';
```

### backend/lib/prisma.ts (확인)
```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

---

## 📋 체크리스트

에러 발생 시 순서대로 확인:

1. [ ] **Prisma Schema 확인**
   ```bash
   # schema.prisma에 UserSettings 모델이 있는지 확인
   cat prisma/schema.prisma | grep "model UserSettings"
   ```

2. [ ] **마이그레이션 적용 확인**
   ```bash
   npx prisma migrate status
   # "Database schema is up to date!" 확인
   ```

3. [ ] **Prisma 클라이언트 생성**
   ```bash
   npx prisma generate
   # "Generated Prisma Client" 확인
   ```

4. [ ] **Import 구문 확인**
   - ✅ `import { prisma } from '../lib/prisma'` (올바름)
   - ❌ `import prisma from '../lib/prisma'` (틀림)

5. [ ] **타입 확인**
   ```typescript
   // node_modules/.prisma/client/index.d.ts에서
   // UserSettings 타입이 export되는지 확인
   ```

6. [ ] **서버 재시작**
   ```bash
   # 개발 서버 완전히 종료 후 재시작
   npm run dev
   ```

---

## 🐛 여전히 에러 발생 시

### 디버깅 코드 추가

```typescript
// backend/services/onboarding.service.ts 최상단에 추가
import { prisma } from '../lib/prisma';

console.log('🔍 Prisma Client:', prisma);
console.log('🔍 UserSettings Model:', prisma.userSettings);

// 이후 코드...
```

### 예상 출력
```
🔍 Prisma Client: PrismaClient { ... }
🔍 UserSettings Model: { findUnique: [Function], ... }
```

만약 `undefined`가 나온다면:
1. Prisma 클라이언트가 제대로 생성 안 됨
2. Schema에 UserSettings 모델 없음
3. 마이그레이션 미적용

---

## 🚀 빠른 해결 스크립트

```bash
# 올인원 수정 스크립트
echo "1. 서버 종료..."
# Ctrl+C로 서버 종료

echo "2. Prisma 클라이언트 삭제..."
rm -rf node_modules/.prisma

echo "3. 마이그레이션 확인..."
npx prisma migrate status

echo "4. Prisma 클라이언트 재생성..."
npx prisma generate

echo "5. 타입 확인..."
ls -la node_modules/.prisma/client/

echo "6. 서버 재시작..."
npm run dev
```

---

## 💡 핵심 원인과 해결

### 문제
```
TypeError: Cannot read properties of undefined (reading 'userSettings')
```

### 원인
```typescript
// prisma.userSettings가 undefined
const settings = await prisma.userSettings.findUnique(...)
                              ↑
                        undefined
```

### 해결
```typescript
// 1. Prisma 스키마 확인
model UserSettings {
  id String @id @default(cuid())
  // ...
}

// 2. 마이그레이션 적용
npx prisma migrate dev

// 3. 클라이언트 생성
npx prisma generate

// 4. Import 수정
import { prisma } from '../lib/prisma'

// 5. 서버 재시작
```

---

## ✅ 성공 확인

정상 작동 시 콘솔 로그:
```
🔍 온보딩 상태 확인 - userId: clxxx...
📊 UserSettings 조회 결과: null (또는 데이터)
```

에러 없이 이 로그가 나오면 성공! ✨

---

## 📞 추가 지원

여전히 문제가 해결되지 않으면:
1. `prisma/schema.prisma` 파일 확인
2. `.env` 파일의 `DATABASE_URL` 확인
3. 데이터베이스 연결 테스트
4. Prisma Studio로 테이블 확인 (`npx prisma studio`)

