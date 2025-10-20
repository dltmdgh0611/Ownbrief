# 프로젝트 헌법 (Project Constitution)

이 문서는 AICast 프로젝트의 핵심 가이드라인과 규칙을 정의합니다. 모든 개발자는 이 헌법을 준수해야 합니다.

## 📋 핵심 규칙

### 1. 패키지 매니저
- **npm 대신 yarn을 사용하세요**
- 모든 의존성 설치 및 스크립트 실행은 yarn을 통해 수행됩니다
- `package.json`에 정의된 스크립트는 yarn으로 실행합니다

### 2. Git 커밋 메시지
- **모든 git 커밋 메시지는 반드시 영어로 작성하세요**
- 명확하고 간결한 메시지를 작성합니다
- 예시:
  ```
  feat: add user authentication system
  fix: resolve database connection issue
  docs: update API documentation
  refactor: simplify user service logic
  ```

### 3. 문서 가이드라인
- **docs 폴더에 있는 모든 가이드라인을 준수하세요**
- 새로운 기능이나 변경사항이 있을 때 관련 문서를 업데이트합니다
- 코드 변경 전에 해당 가이드라인을 확인합니다

## 📚 참조 문서

다음 문서들을 항상 참조하여 프로젝트의 일관성을 유지하세요:

- `docs/architecture.md` - 프로젝트 아키텍처 가이드
- `docs/database-schema.md` - 데이터베이스 스키마 문서
- `docs/IMPLEMENTATION_SUMMARY.md` - 구현 요약
- `docs/MIGRATION_GUIDE.md` - 마이그레이션 가이드
- `docs/openapi.yaml` - API 명세서

## 🔄 업데이트 정책

이 헌법은 프로젝트의 성장과 함께 업데이트될 수 있습니다. 중요한 변경사항이 있을 때는 모든 팀원에게 공지하고 이 문서를 갱신하세요.

---

**⚠️ 주의: 이 헌법을 준수하지 않으면 코드 리뷰에서 거부될 수 있습니다.**
