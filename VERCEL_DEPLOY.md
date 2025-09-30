# Vercel 배포 가이드

이 프로젝트를 Vercel에 배포하는 방법을 설명합니다.

## 🚀 Vercel 배포 (자동)

### 1. GitHub에 코드 푸시
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. Vercel에 프로젝트 임포트
1. [Vercel](https://vercel.com) 접속 및 로그인
2. "Add New Project" 클릭
3. GitHub 저장소 연결
4. 프로젝트 선택 (aicast)

### 3. 환경 변수 설정
Vercel Dashboard → Settings → Environment Variables에서 다음 변수 추가:

```env
# Database
DATABASE_URL=postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres

# NextAuth
NEXTAUTH_URL=https://your-project.vercel.app
NEXTAUTH_SECRET=your-production-secret-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AI Services
GEMINI_API_KEY=your-gemini-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
APIFY_API_TOKEN=your-apify-token
```

**중요**: 
- `NEXTAUTH_URL`은 배포 후 실제 도메인으로 변경
- `NEXTAUTH_SECRET`은 새로 생성 (보안): 
  ```bash
  openssl rand -base64 32
  ```

### 4. 빌드 설정
Vercel이 자동으로 감지하지만, 수동 설정이 필요한 경우:

- **Framework Preset**: Next.js
- **Build Command**: `yarn build`
- **Output Directory**: `.next`
- **Install Command**: `yarn install`

### 5. 배포
"Deploy" 클릭 → 자동 빌드 및 배포 시작

## 🔄 자동 배포

GitHub에 푸시할 때마다 Vercel이 자동으로 재배포합니다:
```bash
git push origin main  # 자동 배포 트리거
```

## 🗄️ 데이터베이스 마이그레이션 (Production)

첫 배포 후 한 번 실행:

### 방법 1: Vercel CLI 사용
```bash
# Vercel CLI 설치
npm install -g vercel

# 프로젝트 링크
vercel link

# 프로덕션 환경에서 마이그레이션
vercel env pull .env.production
yarn db:migrate
```

### 방법 2: Supabase Dashboard에서 직접 실행
1. Supabase Dashboard → SQL Editor
2. `prisma/migrations` 폴더의 SQL 파일 내용 복사
3. SQL Editor에서 실행

### 방법 3: GitHub Actions (추천)
`.github/workflows/deploy.yml` 생성:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: yarn install
      
    - name: Run migrations
      run: yarn db:migrate
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
        
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
        vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## 🔐 Google OAuth 리다이렉트 URI 설정

### 1. Google Cloud Console 설정
1. [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → Credentials
3. OAuth 2.0 Client ID 선택
4. "Authorized redirect URIs" 추가:
   ```
   https://your-project.vercel.app/api/auth/callback/google
   ```

### 2. NextAuth 콜백 URL 확인
배포 후 다음 URL이 작동하는지 확인:
```
https://your-project.vercel.app/api/auth/signin
```

## 🎨 커스텀 도메인 설정 (선택사항)

### 1. 도메인 추가
1. Vercel Dashboard → Settings → Domains
2. "Add" 클릭하여 도메인 추가
3. DNS 설정 (A 레코드 또는 CNAME)

### 2. 환경 변수 업데이트
```env
NEXTAUTH_URL=https://your-custom-domain.com
```

### 3. Google OAuth URI 업데이트
Google Cloud Console에서 새 도메인의 redirect URI 추가

## 📊 모니터링

### Vercel Analytics
1. Dashboard → Analytics 탭
2. 실시간 방문자, 페이지 뷰 확인

### Vercel Logs
1. Dashboard → Deployments → 특정 배포 선택
2. "Runtime Logs" 탭에서 실시간 로그 확인

### Supabase Logs
1. Supabase Dashboard → Logs
2. Database, API 로그 확인

## 🐛 문제 해결

### 빌드 실패: Prisma Client 오류
```
Error: @prisma/client did not initialize yet
```
**해결**: `package.json`의 `build` 스크립트 수정:
```json
{
  "scripts": {
    "build": "prisma generate && next build"
  }
}
```

### 환경 변수 오류
```
Error: Environment variable not found
```
**해결**: Vercel Dashboard에서 환경 변수 재확인 및 재배포

### 401 에러: Google OAuth
**해결**: 
1. Google Cloud Console에서 redirect URI 확인
2. NEXTAUTH_URL이 올바른 도메인인지 확인
3. Vercel 환경 변수 재확인

### Database Connection 타임아웃
**해결**: 
1. Supabase 프로젝트가 활성 상태인지 확인
2. DATABASE_URL에 `?connection_limit=1` 추가 (Vercel Serverless 최적화)

## 🔄 롤백

문제가 발생한 경우 이전 배포로 롤백:
1. Vercel Dashboard → Deployments
2. 이전 성공한 배포 선택
3. "Promote to Production" 클릭

## 📈 성능 최적화

### Edge Functions (선택사항)
특정 API를 Edge에서 실행하여 지연 시간 감소:
```typescript
export const config = {
  runtime: 'edge',
}
```

### Caching
```typescript
// app/api/podcast/route.ts
export const revalidate = 60 // 60초 캐싱
```

## 💰 비용

- **Vercel Free Plan**: 
  - 100GB bandwidth/month
  - Unlimited deployments
  - Hobby 프로젝트에 적합

- **Vercel Pro Plan** ($20/month):
  - 1TB bandwidth
  - 팀 협업 기능
  - 고급 분석

## 📚 추가 리소스

- [Vercel 문서](https://vercel.com/docs)
- [Next.js 배포 가이드](https://nextjs.org/docs/deployment)
- [Vercel + Supabase](https://vercel.com/guides/using-supabase-with-vercel)
