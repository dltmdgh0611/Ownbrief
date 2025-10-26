# Notion 연동 설정 가이드

## 1. Notion Integration 생성 (더 간단한 방법)

### Internal Integration 방식 (추천)

1. https://www.notion.so/my-integrations 접속
2. "+ New integration" 클릭
3. 설정:
   - **Name**: AIcast
   - **Associated workspace**: 본인의 워크스페이스 선택
   - **Type**: Internal
4. 만들기 클릭
5. "Show" 버튼을 클릭하여 **Internal Integration Token** 복사
6. 이 토큰을 환경 변수에 추가:

```env
NOTION_CLIENT_SECRET=secret_xxx... (방금 복사한 토큰)
```

### Notion OAuth 방식 (공개 앱 방식 - 현재 구현된 방식)

1. https://developers.notion.com 접속
2. 로그인 후 "Create new app" 클릭
3. 설정:
   - **App name**: AIcast
   - **Redirect URI**: 
     - 개발 환경: `http://localhost:3000/api/auth/notion/callback`
     - 프로덕션: `https://your-domain.com/api/auth/notion/callback`
4. 저장 후 **Client ID**와 **Client Secret** 복사

## 2. 환경 변수 설정

`.env.local` 파일에 추가:

```env
# Notion OAuth (선택 1: OAuth 방식)
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret
NEXT_PUBLIC_NOTION_CLIENT_ID=your_notion_client_id

# 또는 Notion Internal Integration (선택 2: 간단한 방식)
NOTION_CLIENT_SECRET=secret_xxx...
```

**참고**: 
- OAuth 방식은 사용자에게 동의를 받고 여러 워크스페이스 접근 가능
- Internal Integration은 하나의 워크스페이스만, 토큰만 있으면 바로 접근

## 3. Notion 페이지 공유 설정

Integration을 사용할 Notion 페이지에서:

1. 해당 페이지 또는 데이터베이스 열기
2. 우측 상단 "..." 메뉴 클릭
3. "Add connections" 선택
4. 본인이 만든 Integration 추가
5. 이제 API로 접근 가능!

## 4. 테스트

설정이 완료되면:
1. 개발 서버 재시작: `yarn dev` 또는 `npm run dev`
2. 설정 페이지로 이동
3. Notion "연결하기" 클릭
4. 권한 승인 후 콜백 확인

