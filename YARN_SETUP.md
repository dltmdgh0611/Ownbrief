# Yarn으로 AI Cast 설정하기

npm보다 빠른 yarn을 사용해서 AI Cast를 설정하는 방법입니다.

## 🚀 빠른 시작 (yarn 사용)

### 1. 의존성 설치
```bash
yarn install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 필요한 API 키들을 설정하세요:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
YOUTUBE_API_KEY=your_youtube_api_key
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
DATABASE_URL="postgresql://username:password@localhost:5432/aicast"
```

### 3. 데이터베이스 설정
```bash
# Prisma 마이그레이션 실행
yarn db:migrate

# Prisma 클라이언트 생성
yarn db:generate
```

### 4. 개발 서버 실행
```bash
yarn dev
```

## 📋 유용한 yarn 명령어들

```bash
# 개발 서버 실행
yarn dev

# 프로덕션 빌드
yarn build

# 프로덕션 서버 실행
yarn start

# 린트 검사
yarn lint

# 데이터베이스 마이그레이션
yarn db:migrate

# Prisma 클라이언트 생성
yarn db:generate

# Prisma Studio 실행 (데이터베이스 GUI)
yarn db:studio

# 데이터베이스 리셋
yarn db:reset
```

## ⚡ yarn의 장점

- **더 빠른 설치**: npm보다 2-3배 빠른 패키지 설치
- **더 나은 캐싱**: 패키지 캐싱으로 중복 다운로드 방지
- **더 나은 보안**: 패키지 무결성 검증
- **더 나은 성능**: 병렬 설치로 시간 단축

## 🔧 yarn 설치 방법

yarn이 설치되어 있지 않다면:

```bash
# npm으로 yarn 설치
npm install -g yarn

# 또는 Homebrew (macOS)
brew install yarn

# 또는 Chocolatey (Windows)
choco install yarn
```

설치 확인:
```bash
yarn --version
```
