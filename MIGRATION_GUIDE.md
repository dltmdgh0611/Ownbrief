# 마이그레이션 가이드

이 문서는 기존 프로젝트에서 새로운 구조로 마이그레이션하는 과정을 설명합니다.

## 🔄 변경 사항 요약

### 1. 폴더 구조 개선

#### Before (기존)
```
aicast/
├── app/
│   └── api/              # API 로직이 route.ts에 모두 포함
├── components/           # 루트에 컴포넌트
├── lib/                  # 루트에 유틸리티
└── prisma/
```

#### After (신규)
```
aicast/
├── app/
│   └── api/              # 얇은 라우터만 (5-10줄)
├── backend/
│   ├── controllers/      # API 컨트롤러
│   ├── services/         # 비즈니스 로직
│   ├── lib/              # 유틸리티
│   └── types/            # 타입 정의
├── frontend/
│   ├── components/       # React 컴포넌트
│   └── hooks/            # 커스텀 훅
└── prisma/
```

### 2. Import 경로 변경

모든 import 경로가 변경되었습니다:

```typescript
// Before
import { apiClient } from '@/lib/api-client'
import Header from '@/components/Header'

// After
import { apiClient } from '@/backend/lib/api-client'
import Header from '@/frontend/components/Header'
```

### 3. 세션 만료 처리 추가

- 401 에러 자동 감지 및 로그아웃
- 5분마다 세션 자동 갱신
- 포커스 시 세션 재확인

### 4. Supabase 지원 추가

- PostgreSQL에서 Supabase PostgreSQL로 전환 가능
- DATABASE_URL만 변경하면 됨
- 클라우드 기반 확장성

## 📝 마이그레이션 체크리스트

### ✅ 완료된 작업

- [x] backend/ 폴더 구조 생성
- [x] frontend/ 폴더 구조 생성
- [x] lib → backend/lib 이동
- [x] components → frontend/components 이동
- [x] 컨트롤러 및 서비스 계층 추가
- [x] 모든 import 경로 수정
- [x] 세션 만료 처리 구현
- [x] API 클라이언트 (401 자동 처리) 추가
- [x] 타입 정의 파일 추가
- [x] Supabase 설정 문서 작성
- [x] Vercel 배포 가이드 작성
- [x] README 업데이트

### 🔄 사용자가 해야 할 일

#### 1. 환경 변수 업데이트
```bash
# .env.local 확인
DATABASE_URL="postgresql://..."  # Supabase URL로 변경 가능
```

#### 2. 의존성 재설치
```bash
# 모든 패키지 재설치
rm -rf node_modules
yarn install
```

#### 3. Prisma 재생성
```bash
yarn db:generate
```

#### 4. 테스트
```bash
# 개발 서버 실행
yarn dev

# 브라우저에서 확인
open http://localhost:3000
```

## 🆕 새로운 기능

### 1. 세션 자동 갱신
- 더 이상 오래 머물러도 401 에러 없음
- 자동 로그아웃 처리

### 2. 명확한 코드 구조
- route.ts는 5-10줄로 간결
- 비즈니스 로직은 서비스 계층에
- 코드 재사용 및 테스트 용이

### 3. TypeScript 타입 강화
- 모든 데이터 모델 타입 정의
- API 응답 타입 지정
- 타입 안정성 향상

### 4. Supabase 지원
- 클라우드 데이터베이스
- 자동 백업 및 확장
- Vercel과 완벽한 통합

## 🔧 기존 프로젝트 적용 방법

이미 실행 중인 프로젝트에서 이 구조를 적용하려면:

### 1. 백업
```bash
git commit -am "Backup before migration"
git branch backup-before-migration
```

### 2. 폴더 생성
```bash
mkdir -p backend/{controllers,services,lib,types}
mkdir -p frontend/{components,hooks}
```

### 3. 파일 이동
```bash
# lib 파일들
mv lib/* backend/lib/

# 컴포넌트들
mv components/* frontend/components/
```

### 4. Import 경로 수정
모든 파일에서 다음과 같이 변경:
```typescript
// 찾기 & 바꾸기
'@/lib/' → '@/backend/lib/'
'@/components/' → '@/frontend/components/'
```

### 5. 서비스 및 컨트롤러 생성
- `backend/services/` 폴더에 비즈니스 로직 추출
- `backend/controllers/` 폴더에 API 컨트롤러 생성

### 6. route.ts 파일 단순화
각 `app/api/**/route.ts` 파일을 다음과 같이 수정:
```typescript
// Before (복잡)
export async function GET() {
  // 50-100줄의 로직
}

// After (간단)
import { getController } from '@/backend/controllers/...'
export async function GET() {
  return getController()
}
```

## ⚠️ 주의사항

### Breaking Changes
- Import 경로가 변경되어 기존 코드 수정 필요
- 모든 파일을 다시 빌드해야 함

### 호환성
- Next.js 14 필요
- Node.js 18+ 필요
- TypeScript 5+ 필요

### 데이터베이스
- 기존 데이터는 영향 없음
- Prisma 스키마는 동일
- DATABASE_URL만 Supabase로 변경 가능

## 🎯 마이그레이션 후 확인사항

### 1. 빌드 확인
```bash
yarn build
```
오류 없이 빌드되어야 함

### 2. 타입 확인
```bash
yarn tsc --noEmit
```
타입 오류 없어야 함

### 3. 린트 확인
```bash
yarn lint
```

### 4. 기능 테스트
- [ ] 로그인/로그아웃
- [ ] 팟캐스트 생성
- [ ] 설정 저장
- [ ] 세션 유지

### 5. API 테스트
- [ ] GET /api/podcast
- [ ] POST /api/user/settings
- [ ] DELETE /api/user/delete

## 📊 성능 개선

### Before
- route.ts 파일당 평균 100-200줄
- 비즈니스 로직 재사용 어려움
- 테스트 작성 복잡

### After
- route.ts 파일당 평균 5-10줄 (95% 감소)
- 서비스 계층으로 로직 재사용
- 단위 테스트 용이

## 🚀 다음 단계

1. **Supabase 전환**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) 참조
2. **Vercel 배포**: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) 참조
3. **모니터링 설정**: Vercel Analytics 활성화
4. **CI/CD 구축**: GitHub Actions 설정

## 💬 지원

문제가 발생하면:
1. [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) 참조
2. GitHub Issues 생성
3. 로그 확인: `yarn dev` 출력
