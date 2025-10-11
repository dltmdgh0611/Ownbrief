# Supabase + Vercel 데이터베이스 연결 설정 가이드

## 🚨 문제: Vercel Cron에서 Supabase 연결 실패

Vercel serverless 환경에서는 일반 Supabase Connection String으로는 연결이 자주 실패합니다.

```
Error: Can't reach database server at `aws-1-ap-northeast-2.pooler.supabase.com:5432`
```

## ✅ 해결 방법: Transaction Pooler 사용

### 1. Supabase에서 연결 문자열 가져오기

1. Supabase Dashboard → Project → Settings → Database
2. **Connection Pooling** 섹션 찾기
3. **Transaction Mode** 선택
4. Connection String 복사

형식:
```
postgresql://postgres.xxxxxx:[YOUR-PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

**중요**: 
- 포트가 `6543`인지 확인 (5432 아님!)
- `?pgbouncer=true&connection_limit=1` 파라미터가 있는지 확인

### 2. Vercel 환경 변수 설정

#### Vercel Dashboard에서:

1. Vercel Dashboard → 프로젝트 선택
2. Settings → Environment Variables
3. `DATABASE_URL` 변수 수정:
   ```
   postgresql://postgres.xxxxxx:[YOUR-PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```
4. **Production, Preview, Development** 모두 체크
5. Save

#### 또는 Vercel CLI로:

```bash
vercel env add DATABASE_URL production
# 위의 connection string 붙여넣기

vercel env add DATABASE_URL preview
# 위의 connection string 붙여넣기
```

### 3. 재배포

```bash
git add .
git commit -m "Fix Supabase connection for Vercel serverless"
git push
```

또는 Vercel Dashboard에서 Redeploy

## 📋 환경 변수 체크리스트

Vercel에 다음 환경 변수들이 설정되어 있는지 확인:

- ✅ `DATABASE_URL` - Supabase Transaction Pooler URL (port 6543)
- ✅ `CRON_SECRET` - Cron job 인증용 시크릿
- ✅ `NEXTAUTH_SECRET` - NextAuth 시크릿
- ✅ `NEXTAUTH_URL` - 프로덕션 URL
- ✅ `GOOGLE_CLIENT_ID` - Google OAuth
- ✅ `GOOGLE_CLIENT_SECRET` - Google OAuth
- ✅ `GEMINI_API_KEY` - Gemini API
- ✅ `SUPABASE_URL` - Supabase 프로젝트 URL
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Supabase Service Role Key

## 🔍 연결 테스트

배포 후 Vercel Dashboard에서:
1. Deployments → 최신 배포 선택
2. Functions → Logs
3. 다음 cron 실행 시간까지 대기 (15분 단위)
4. 로그 확인:
   ```
   ⏰ Current UTC time: ...
   ⏰ Current KST time: ...
   ⏰ Generating podcasts for delivery at: ...
   👥 Found X users for this time slot
   ```

## 💡 추가 팁

### Connection Pool 설정

- Vercel Free Plan: 최대 5개 concurrent connections
- Supabase Free Plan: 최대 60개 connections
- `connection_limit=1`로 제한하여 connection exhaustion 방지

### 로컬 개발

로컬에서는 Direct Connection을 사용해도 됩니다:

`.env.local` 파일:
```bash
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxx.supabase.co:5432/postgres"
```

## 📚 참고 자료

- [Prisma Connection Management](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

