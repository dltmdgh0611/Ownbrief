# React Bits Prism 배경 컴포넌트 문서

## 개요

**Prism**은 React Bits 레지스트리에서 제공하는 WebGL 기반의 회전하는 프리즘 배경 컴포넌트입니다. 3D 프리즘 효과를 생성하며, 다양한 애니메이션 타입과 설정 옵션을 제공합니다.

## 컴포넌트 정보

- **이름**: Prism
- **레지스트리**: `@react-bits`
- **타입**: Background (배경 컴포넌트)
- **기술 스택**: React + WebGL (OGL 라이브러리)
- **사용 가능한 형식**:
  - `Prism-JS-CSS` (JavaScript + CSS)
  - `Prism-JS-TW` (JavaScript + Tailwind CSS)
  - `Prism-TS-CSS` (TypeScript + CSS)
  - `Prism-TS-TW` (TypeScript + Tailwind CSS) ⭐ **권장**

## 설치

```bash
# TypeScript + Tailwind CSS 버전 설치 (권장)
npx shadcn@latest add @react-bits/Prism-TS-TW

# JavaScript + Tailwind CSS 버전 설치
npx shadcn@latest add @react-bits/Prism-JS-TW

# TypeScript + CSS 버전 설치
npx shadcn@latest add @react-bits/Prism-TS-CSS

# JavaScript + CSS 버전 설치
npx shadcn@latest add @react-bits/Prism-JS-CSS
```

## 의존성

Prism 컴포넌트는 다음 패키지를 필요로 합니다:

- `ogl` - WebGL 라이브러리

설치 시 자동으로 설치되며, 수동으로 설치하려면:

```bash
npm install ogl
# 또는
yarn add ogl
```

## Props 인터페이스

```typescript
type PrismProps = {
  height?: number;                    // 프리즘 높이 (기본값: 3.5)
  baseWidth?: number;                 // 프리즘 밑변 너비 (기본값: 5.5)
  animationType?: 'rotate' | 'hover' | '3drotate';  // 애니메이션 타입 (기본값: 'rotate')
  glow?: number;                      // 발광 강도 (기본값: 1)
  offset?: { x?: number; y?: number }; // 위치 오프셋 (기본값: { x: 0, y: 0 })
  noise?: number;                     // 노이즈 강도 (기본값: 0.5)
  transparent?: boolean;              // 투명 배경 사용 여부 (기본값: true)
  scale?: number;                     // 크기 스케일 (기본값: 3.6)
  hueShift?: number;                  // 색상 휴 시프트 (기본값: 0)
  colorFrequency?: number;             // 색상 주파수 (기본값: 1)
  hoverStrength?: number;             // 호버 효과 강도 (기본값: 2)
  inertia?: number;                   // 관성 값 (0-1, 기본값: 0.05)
  bloom?: number;                     // 블룸 효과 강도 (기본값: 1)
  suspendWhenOffscreen?: boolean;     // 화면 밖에서 애니메이션 중지 (기본값: false)
  timeScale?: number;                 // 시간 스케일 (기본값: 0.5)
}
```

## Props 상세 설명

### 기본 속성

- **height** (`number`, 기본값: `3.5`)
  - 프리즘의 세로 높이를 설정합니다. 값이 클수록 프리즘이 더 높아집니다.
  - 범위: 0.001 이상

- **baseWidth** (`number`, 기본값: `5.5`)
  - 프리즘 밑변의 너비를 설정합니다. 값이 클수록 밑변이 넓어집니다.
  - 범위: 0.001 이상

### 애니메이션 속성

- **animationType** (`'rotate' | 'hover' | '3drotate'`, 기본값: `'rotate'`)
  - `'rotate'`: 기본 회전 애니메이션 (부드러운 회전)
  - `'hover'`: 마우스 호버 시 반응하는 애니메이션
  - `'3drotate'`: 3D 공간에서 복잡한 회전 애니메이션

- **timeScale** (`number`, 기본값: `0.5`)
  - 애니메이션 속도를 조절합니다. 값이 클수록 빠르게 회전합니다.
  - 범위: 0 이상

- **suspendWhenOffscreen** (`boolean`, 기본값: `false`)
  - 화면에서 보이지 않을 때 애니메이션을 중지하여 성능을 최적화합니다.
  - 권장: `true` (성능 최적화)

### 시각적 효과 속성

- **glow** (`number`, 기본값: `1`)
  - 프리즘의 발광 효과 강도를 조절합니다. 값이 클수록 더 밝게 빛납니다.
  - 범위: 0 이상

- **bloom** (`number`, 기본값: `1`)
  - 블룸(빛 확산) 효과의 강도를 조절합니다. 값이 클수록 더 부드러운 빛을 방출합니다.
  - 범위: 0 이상

- **noise** (`number`, 기본값: `0.5`)
  - 텍스처에 추가되는 노이즈 강도를 조절합니다. 값이 클수록 더 거친 질감이 됩니다.
  - 범위: 0 이상

### 색상 속성

- **hueShift** (`number`, 기본값: `0`)
  - 전체 색상의 색조를 시프트합니다. 라디안 단위 (0 ~ 2π)
  - 예: `Math.PI / 6` = 30도 시프트

- **colorFrequency** (`number`, 기본값: `1`)
  - 색상 변화의 빈도를 조절합니다. 값이 클수록 색상이 더 빠르게 변화합니다.
  - 범위: 0 이상

- **transparent** (`boolean`, 기본값: `true`)
  - 배경 투명도 사용 여부입니다. `false`로 설정하면 불투명한 배경이 됩니다.

### 크기 및 위치 속성

- **scale** (`number`, 기본값: `3.6`)
  - 전체 프리즘의 크기를 조절합니다. 값이 클수록 더 크게 표시됩니다.
  - 범위: 0.001 이상

- **offset** (`{ x?: number; y?: number }`, 기본값: `{ x: 0, y: 0 }`)
  - 프리즘의 위치를 픽셀 단위로 오프셋합니다.
  - 예: `{ x: 100, y: -50 }` → 오른쪽으로 100px, 위로 50px 이동

### 상호작용 속성 (hover 모드 전용)

- **hoverStrength** (`number`, 기본값: `2`)
  - 마우스 호버 시 프리즘이 반응하는 강도를 설정합니다.
  - 범위: 0 이상

- **inertia** (`number`, 기본값: `0.05`)
  - 호버 반응의 관성 값을 설정합니다. 값이 클수록 더 부드럽고 느린 반응을 합니다.
  - 범위: 0 ~ 1

## 사용 예시

### 기본 사용

```tsx
import Prism from '@/components/ui/prism';

export default function HomePage() {
  return (
    <div className="w-full h-screen">
      <Prism />
    </div>
  );
}
```

### 커스텀 설정 예시

```tsx
import Prism from '@/components/ui/prism';

export default function CustomPrismPage() {
  return (
    <div className="w-full h-screen relative">
      {/* 컨텐츠 위에 Prism 배경 추가 */}
      <Prism
        height={4.0}
        baseWidth={6.0}
        animationType="hover"
        glow={1.5}
        bloom={1.2}
        scale={4.0}
        hueShift={Math.PI / 6}
        colorFrequency={1.5}
        hoverStrength={2.5}
        inertia={0.08}
        transparent={true}
        suspendWhenOffscreen={true}
        timeScale={0.6}
      />
      
      {/* 컨텐츠는 Prism 위에 표시 */}
      <div className="relative z-10 p-8">
        <h1 className="text-white text-4xl font-bold">내 컨텐츠</h1>
      </div>
    </div>
  );
}
```

### 다양한 애니메이션 타입 예시

```tsx
import Prism from '@/components/ui/prism';

// 1. 기본 회전 애니메이션
<Prism animationType="rotate" />

// 2. 호버 반응 애니메이션
<Prism 
  animationType="hover"
  hoverStrength={3}
  inertia={0.1}
/>

// 3. 3D 회전 애니메이션
<Prism 
  animationType="3drotate"
  timeScale={0.8}
/>
```

### 성능 최적화 설정

```tsx
import Prism from '@/components/ui/prism';

export default function OptimizedPrism() {
  return (
    <Prism
      suspendWhenOffscreen={true}  // 화면 밖에서 중지
      noise={0.3}                   // 노이즈 감소 (렌더링 부하 감소)
      scale={3.0}                   // 적절한 크기 유지
      timeScale={0.4}               // 느린 애니메이션 (GPU 부하 감소)
    />
  );
}
```

## 스타일링

Prism 컴포넌트는 `w-full h-full relative` 클래스를 가지는 컨테이너 div를 반환합니다. 
배경으로 사용하려면 부모 컨테이너에 적절한 크기 설정이 필요합니다.

```tsx
// 전체 화면 배경
<div className="fixed inset-0 w-full h-full">
  <Prism />
</div>

// 특정 영역 배경
<div className="w-[800px] h-[600px] relative">
  <Prism />
</div>
```

## 성능 고려사항

1. **WebGL 렌더링**: Prism은 WebGL을 사용하므로 GPU 가속을 활용합니다.
2. **화면 밖 중지**: `suspendWhenOffscreen={true}` 설정 시 성능 최적화 가능
3. **노이즈 조절**: `noise` 값을 낮추면 렌더링 부하가 감소합니다.
4. **애니메이션 속도**: `timeScale`을 낮추면 GPU 부하가 감소합니다.

## 주의사항

1. **의존성**: `ogl` 패키지가 반드시 설치되어 있어야 합니다.
2. **컨테이너 크기**: 부모 컨테이너에 명시적인 크기(`width`, `height`)가 필요합니다.
3. **z-index**: 다른 컨텐츠 위에 배경으로 사용할 경우 z-index 관리가 필요합니다.
4. **모바일 성능**: 모바일 기기에서는 성능 최적화 설정을 권장합니다.

## 관련 컴포넌트

- **PrismaticBurst**: 폭발하는 프리즘 효과
- **Aurora**: 오로라 그라디언트 배경
- **Plasma**: 플라즈마 그라디언트 배경
- **DarkVeil**: 다크 베일 배경

## 참고 자료

- React Bits 공식 사이트: https://reactbits.dev
- OGL 라이브러리: https://github.com/oframe/ogl
- 레지스트리 URL: `https://reactbits.dev/r/Prism-TS-TW.json`

