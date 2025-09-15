# SmartHR 테스트 디렉토리

이 디렉토리는 SmartHR 인사관리 시스템의 모든 테스트 파일을 관리합니다.

## 📁 디렉토리 구조

```
/tests
├── README.md                 # 현재 파일
├── TEST_RESULTS.md          # 전체 테스트 결과 문서
├── test-db-connection.js    # 데이터베이스 연결 테스트
├── test-auth-utils.js       # 인증 유틸리티 테스트
├── /unit                    # 단위 테스트 (예정)
├── /integration             # 통합 테스트 (예정)
└── /api                     # API 테스트 (예정)
```

## 🧪 테스트 실행 방법

### 개별 테스트 실행
```bash
# 데이터베이스 연결 테스트
node tests/test-db-connection.js

# 인증 유틸리티 테스트
node tests/test-auth-utils.js
```

### 전체 테스트 실행 (예정)
```bash
# Jest 테스트 실행
npm test

# 테스트 감시 모드
npm run test:watch
```

## 📊 테스트 결과

최신 테스트 결과는 `TEST_RESULTS.md` 파일에서 확인할 수 있습니다.

**현재 테스트 상태:** ✅ 전체 성공 (4/4)

## 🔧 테스트 파일 작성 가이드

### 파일 명명 규칙
- **기능 테스트:** `test-[기능명].js`
- **API 테스트:** `test-api-[모듈명].js`
- **통합 테스트:** `test-integration-[기능명].js`

### 표준 템플릿
```javascript
/**
 * [기능명] 테스트
 * @description [테스트 설명]
 * @author SmartHR Team
 * @date 2024-09-12
 */

require('dotenv').config();

const test[기능명] = async () => {
  console.log('==========================================');
  console.log('🧪 [기능명] 테스트 시작');
  console.log('==========================================');
  
  try {
    // 테스트 로직
    console.log('✅ 테스트 성공');
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  }
};

// 테스트 실행
test[기능명]();
```

## 📋 테스트 체크리스트

### 완료된 테스트
- [x] 서버 실행 테스트
- [x] 기본 엔드포인트 테스트
- [x] 데이터베이스 연결 테스트
- [x] 인증 유틸리티 테스트

### 예정된 테스트
- [ ] API 엔드포인트 테스트
- [ ] 데이터베이스 CRUD 테스트
- [ ] 인증 미들웨어 테스트
- [ ] 에러 처리 테스트
- [ ] 보안 테스트
- [ ] 성능 테스트

## 🚀 테스트 환경

### 필수 요구사항
- Node.js 16.0.0 이상
- MS SQL Server 
- .env 파일 설정

### 의존성 패키지
```json
{
  "devDependencies": {
    "jest": "^29.6.2",
    "supertest": "^6.3.3"
  }
}
```

---

📝 **참고:** 모든 새로운 테스트는 이 디렉토리에 작성해주세요.