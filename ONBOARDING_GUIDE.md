# 온보딩 시스템 가이드

신규 사용자와 기존 사용자를 구분하여 적절한 UI를 제공하기 위한 온보딩 시스템입니다.

## 📋 개요

사용자가 처음 Google 로그인을 하면:
1. 관심 키워드를 선택 (최대 5개)
2. 팟캐스트를 만들 유튜브 플레이리스트를 선택
3. 위 두 단계를 완료하면 **기존 사용자**로 간주됩니다

## 🗄️ 데이터베이스 스키마

### UserSettings 테이블
```prisma
model UserSettings {
  id                   String   @id @default(cuid())
  userId               String   @unique
  selectedPlaylists    String[] // 선택한 유튜브 플레이리스트 ID 배열
  interests            String[] // 관심 키워드 배열
  onboardingCompleted  Boolean  @default(false) // 온보딩 완료 여부
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

## 🔌 API 엔드포인트

### 1. 온보딩 상태 확인
```http
GET /api/onboarding/status
```

**응답 예시:**
```json
{
  "isNewUser": true,
  "needsOnboarding": true,
  "settings": null
}
```
또는
```json
{
  "isNewUser": false,
  "needsOnboarding": false,
  "settings": {
    "onboardingCompleted": true,
    "interests": ["AI", "Technology", "Startup"],
    "selectedPlaylists": ["PLxxx1", "PLxxx2"]
  }
}
```

### 2. 온보딩 완료
```http
POST /api/onboarding/complete
Content-Type: application/json

{
  "interests": ["AI", "Technology", "Startup"],
  "selectedPlaylists": ["PLxxx1", "PLxxx2"]
}
```

**응답:**
```json
{
  "success": true,
  "settings": {
    "id": "xxx",
    "userId": "xxx",
    "interests": ["AI", "Technology", "Startup"],
    "selectedPlaylists": ["PLxxx1", "PLxxx2"],
    "onboardingCompleted": true,
    "createdAt": "2025-10-08T...",
    "updatedAt": "2025-10-08T..."
  }
}
```

### 3. 관심사 업데이트
```http
PUT /api/onboarding/interests
Content-Type: application/json

{
  "interests": ["AI", "Technology", "Business", "Marketing"]
}
```

## 💻 프론트엔드 사용법

### React Hook 사용 예시

```tsx
'use client';

import { useOnboarding } from '@/frontend/hooks/useOnboarding';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const { status, loading, completeOnboarding } = useOnboarding();

  useEffect(() => {
    // 로딩이 끝나고 온보딩이 필요한 신규 사용자라면 온보딩 페이지로 이동
    if (!loading && status?.needsOnboarding) {
      router.push('/onboarding');
    }
  }, [loading, status, router]);

  if (loading) {
    return <div>로딩 중...</div>;
  }

  if (status?.isNewUser) {
    return null; // 온보딩 페이지로 리다이렉트되므로 아무것도 표시하지 않음
  }

  return (
    <div>
      <h1>환영합니다!</h1>
      <p>관심사: {status?.settings?.interests.join(', ')}</p>
    </div>
  );
}
```

### 온보딩 페이지 예시

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/frontend/hooks/useOnboarding';

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [selectedPlaylists, setSelectedPlaylists] = useState<string[]>([]);

  const availableInterests = [
    'AI', 'Technology', 'Startup', 'Business', 'Marketing',
    'Design', 'Programming', 'Science', 'Health', 'Finance'
  ];

  const handleInterestToggle = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      if (interests.length < 5) {
        setInterests([...interests, interest]);
      }
    }
  };

  const handleComplete = async () => {
    try {
      await completeOnboarding(interests, selectedPlaylists);
      router.push('/'); // 홈으로 이동
    } catch (error) {
      console.error('온보딩 완료 실패:', error);
      alert('온보딩 완료에 실패했습니다. 다시 시도해주세요.');
    }
  };

  if (step === 1) {
    return (
      <div className="onboarding-container">
        <h1>관심사를 최대 5개까지 골라주세요</h1>
        <div className="interests-grid">
          {availableInterests.map((interest) => (
            <button
              key={interest}
              onClick={() => handleInterestToggle(interest)}
              className={interests.includes(interest) ? 'selected' : ''}
            >
              {interest}
            </button>
          ))}
        </div>
        <button
          onClick={() => setStep(2)}
          disabled={interests.length === 0}
        >
          다음
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="onboarding-container">
        <h1>플레이리스트를 선택하거나 생성하세요</h1>
        {/* 플레이리스트 선택 UI */}
        <button onClick={() => setStep(1)}>뒤로</button>
        <button
          onClick={handleComplete}
          disabled={selectedPlaylists.length === 0}
        >
          완료
        </button>
      </div>
    );
  }

  return null;
}
```

## 🔍 서비스 함수 직접 사용

백엔드나 서버 컴포넌트에서 직접 사용하는 경우:

```typescript
import * as onboardingService from '@/backend/services/onboarding.service';

// 온보딩 상태 확인
const status = await onboardingService.checkOnboardingStatus(userId);

if (status.needsOnboarding) {
  // 신규 사용자 처리
  console.log('신규 사용자입니다. 온보딩이 필요합니다.');
} else {
  // 기존 사용자 처리
  console.log('기존 사용자입니다.');
  console.log('관심사:', status.settings?.interests);
}

// 온보딩 완료 처리
await onboardingService.completeOnboarding(userId, {
  interests: ['AI', 'Technology'],
  selectedPlaylists: ['PLxxx1', 'PLxxx2']
});

// 관심사만 업데이트
await onboardingService.updateInterests(userId, ['AI', 'Technology', 'Business']);

// 플레이리스트만 업데이트
await onboardingService.updatePlaylists(userId, ['PLxxx3', 'PLxxx4']);
```

## 📝 체크리스트

- [x] Prisma 스키마에 `interests`, `onboardingCompleted` 필드 추가
- [x] 마이그레이션 적용 (`20251008084719_add_interests_and_onboarding`)
- [x] 온보딩 서비스 구현 (`backend/services/onboarding.service.ts`)
- [x] 온보딩 컨트롤러 구현 (`backend/controllers/onboarding.controller.ts`)
- [x] API 라우트 생성
  - [x] `GET /api/onboarding/status`
  - [x] `POST /api/onboarding/complete`
  - [x] `PUT /api/onboarding/interests`
- [x] React Hook 구현 (`frontend/hooks/useOnboarding.ts`)
- [x] TypeScript 타입 정의 (`backend/types/index.ts`)
- [x] 온보딩 페이지 UI 구현 (`app/onboarding/page.tsx`)
  - [x] Step 1: 환영 메시지 + 관심사 선택
  - [x] Step 2: 플레이리스트 선택
- [x] 홈 페이지에서 온보딩 상태 확인 (`app/page.tsx`)
- [x] 설정 페이지에서 관심사 수정 기능 (`app/settings/page.tsx`)
- [x] NextAuth 세션에 userId 추가 (`backend/lib/auth.ts`)
- [x] UserService 업데이트 (interests 지원)

## ✅ 완료된 기능

### 신규 사용자 플로우
1. Google 로그인
2. 자동으로 온보딩 페이지로 리다이렉트
3. 관심사 선택 (최대 5개)
4. 플레이리스트 선택
5. 완료 후 홈으로 이동

### 기존 사용자 플로우
1. Google 로그인
2. 바로 홈 화면 표시
3. 팟캐스트 생성 가능

### 설정 페이지
- 관심사 수정 (최대 5개)
- 플레이리스트 선택 수정
- 설정 저장

## 🎨 Figma 디자인 참고

현재 연결된 Figma 문서 "MCP Ownbrief"에 다음 화면들이 있습니다:
- "1.1.인사" - 처음 사용자 인사 화면
- "1.2.관심사 설정(키워드)" - 키워드 선택 화면
- "1.3. 플리 기존/신규 선택" - 플레이리스트 선택 화면
- "기존사용자_홈화면" - 기존 사용자 홈 화면

이 디자인을 참고하여 UI를 구현하시면 됩니다.

