# 코딩 표준

SmartHR 백엔드 프로젝트의 코딩 표준 및 개발 규칙입니다.

## 📋 목차

- [네이밍 규칙](#네이밍-규칙)
- [코드 구조](#코드-구조)
- [주석 규칙](#주석-규칙)
- [에러 처리 표준](#에러-처리-표준)
- [보안 가이드라인](#보안-가이드라인)
- [품질 체크리스트](#품질-체크리스트)

## 네이밍 규칙

### 변수명 및 함수명
```javascript
// ✅ 올바른 예시 - camelCase 사용
const employeeCode = "EMP001";
const firstName = "홍길동";
const departmentId = 1;

function createEmployee(employeeData) {
  // 함수 로직
}

function getUserById(userId) {
  // 함수 로직
}

// ❌ 잘못된 예시
const employee_code = "EMP001";    // snake_case 사용 금지
const EmployeeName = "홍길동";      // PascalCase 사용 금지
```

### 상수명
```javascript
// ✅ 올바른 예시 - UPPER_SNAKE_CASE 사용
const MAX_LOGIN_ATTEMPTS = 5;
const JWT_EXPIRES_IN = "24h";
const DB_CONNECTION_TIMEOUT = 15000;

// API 경로 상수
const API_ENDPOINTS = {
  EMPLOYEES: "/api/employees",
  AUTH: "/api/auth",
  DEPARTMENTS: "/api/departments"
};

// 에러 메시지 상수
const ERROR_MESSAGES = {
  INVALID_TOKEN: "유효하지 않은 토큰입니다.",
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다.",
  PERMISSION_DENIED: "권한이 없습니다."
};
```

### 파일명
```javascript
// ✅ 올바른 예시 - kebab-case 사용
employee-controller.js
auth-middleware.js
database-helper.js
user-service.js

// ❌ 잘못된 예시
employeeController.js     // camelCase 금지
Employee_Controller.js    // snake_case 금지
EmployeeController.js     // PascalCase 금지
```

### 클래스명 및 생성자 함수
```javascript
// ✅ 올바른 예시 - PascalCase 사용
class EmployeeService {
  constructor() {
    // 생성자 로직
  }
}

class DatabaseConnection {
  // 클래스 로직
}

// 생성자 함수
function UserValidator(options) {
  this.options = options;
}
```

### 데이터베이스 관련 네이밍
```sql
-- 테이블명: PascalCase
CREATE TABLE Employees (
    EmployeeId INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeCode NVARCHAR(20) NOT NULL,
    FirstName NVARCHAR(50) NOT NULL,
    LastName NVARCHAR(50) NOT NULL
);

-- Stored Procedure: SP_ 접두사 + PascalCase
CREATE PROCEDURE SP_CreateEmployee
    @EmployeeCode NVARCHAR(20),
    @FirstName NVARCHAR(50)
-- SP 로직

-- 컬럼명: PascalCase
-- 인덱스명: IX_ 접두사
-- 외래키명: FK_ 접두사
```

## 코드 구조

### 파일 구조 표준
```javascript
/**
 * [파일 목적] - [간단한 설명]
 * @description [상세 설명]
 * @author 개발자명
 * @date 2024-09-XX
 */

// 1. Node.js 내장 모듈
const path = require('path');
const fs = require('fs');

// 2. 외부 라이브러리
const express = require('express');
const jwt = require('jsonwebtoken');

// 3. 내부 모듈 (상위 디렉토리부터)
const { authenticateToken } = require('../middleware/auth');
const { executeStoredProcedure } = require('../database/dbHelper');

// 4. 상수 정의
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

// 5. 메인 코드
// ...

// 6. 모듈 export
module.exports = router;
```

### 함수 구조 표준
```javascript
/**
 * 직원 정보 생성
 * @param {Object} employeeData - 직원 정보
 * @param {string} employeeData.employeeCode - 직원 코드
 * @param {string} employeeData.firstName - 이름
 * @param {string} employeeData.email - 이메일
 * @param {number} userId - 요청 사용자 ID
 * @returns {Promise<Object>} 생성 결과
 * @throws {Error} 데이터베이스 오류 시
 */
const createEmployee = async (employeeData, userId) => {
  // 1. 입력값 검증
  if (!employeeData || !employeeData.employeeCode) {
    throw new Error('직원 코드는 필수입니다.');
  }

  // 2. 비즈니스 로직 검증
  const existingEmployee = await checkEmployeeExists(employeeData.employeeCode);
  if (existingEmployee) {
    throw new Error('이미 존재하는 직원 코드입니다.');
  }

  try {
    // 3. 데이터베이스 작업
    const spParams = [
      employeeData.employeeCode,
      employeeData.firstName,
      employeeData.email,
      userId
    ];

    const result = await executeStoredProcedure('SP_CreateEmployee', spParams);

    // 4. 결과 처리
    if (result.ResultCode === 0) {
      return {
        success: true,
        data: result.data,
        message: result.Message
      };
    } else {
      throw new Error(result.Message);
    }

  } catch (error) {
    // 5. 에러 로깅 및 재발생
    console.error('[createEmployee] 직원 생성 오류:', {
      error: error.message,
      employeeData: { ...employeeData, password: '[REDACTED]' },
      userId,
      timestamp: new Date().toISOString()
    });

    throw error;
  }
};
```

### 들여쓰기 및 포맷팅
```javascript
// ✅ 올바른 예시 - 2칸 스페이스 사용
if (condition) {
  const result = processData();
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
      message: "처리가 완료되었습니다."
    };
  }
}

// 긴 객체는 각 속성을 새 줄에
const employeeData = {
  employeeCode: "EMP001",
  firstName: "홍길동",
  lastName: "홍",
  email: "hong@company.com",
  departmentId: 1,
  positionId: 1
};

// 긴 함수 호출은 파라미터를 새 줄에
const result = await executeStoredProcedure(
  'SP_CreateEmployee',
  employeeParams,
  outputParams
);
```

## 주석 규칙

### JSDoc 주석 표준
```javascript
/**
 * API 엔드포인트 함수 주석
 * @route POST /api/employees
 * @description 새로운 직원을 등록합니다.
 * @access Private - JWT 토큰 필요
 * @param {Object} req - Express 요청 객체
 * @param {Object} req.body - 요청 바디
 * @param {string} req.body.employeeCode - 직원 코드 (필수)
 * @param {string} req.body.firstName - 이름 (필수)
 * @param {string} req.body.email - 이메일 (필수)
 * @param {Object} res - Express 응답 객체
 * @returns {Promise<void>} JSON 응답
 * @example
 * POST /api/employees
 * {
 *   "employeeCode": "EMP001",
 *   "firstName": "홍길동",
 *   "email": "hong@company.com"
 * }
 */
```

### 인라인 주석 규칙
```javascript
// ✅ 올바른 예시 - 한국어 주석 사용
const createEmployee = async (employeeData, userId) => {
  // 입력값 검증 - 필수 필드 확인
  const requiredFields = ['employeeCode', 'firstName', 'email'];
  const missingFields = requiredFields.filter(field => !employeeData[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`필수 입력 항목이 누락되었습니다: ${missingFields.join(', ')}`);
  }
  
  // TODO: 이메일 중복 검사 로직 추가 예정
  // FIXME: 비밀번호 암호화 로직 검토 필요
  
  // 직원 생성 SP 호출
  const result = await executeStoredProcedure('SP_CreateEmployee', spParams);
  
  return result;
};
```

### 코드 블록 주석
```javascript
/**
 * ===========================================
 * 직원 관리 API 컨트롤러
 * ===========================================
 * 
 * 이 섹션은 직원 생성, 수정, 삭제, 조회 API를 포함합니다.
 * 모든 API는 JWT 인증이 필요하며, 관리자 권한이 필요한 경우 별도 표시됩니다.
 */

// ===========================================
// 직원 등록 API
// ===========================================
router.post('/api/employees', authenticateToken, async (req, res) => {
  // API 로직
});

// ===========================================
// 직원 정보 수정 API (본인 또는 관리자만)
// ===========================================
router.put('/api/employees/:id', authenticateToken, requireSelfOrAdmin, async (req, res) => {
  // API 로직
});
```

## 에러 처리 표준

### Try-Catch 블록 표준
```javascript
const processEmployeeData = async (employeeData, userId) => {
  try {
    // 1. 입력값 검증
    validateEmployeeData(employeeData);
    
    // 2. 비즈니스 로직 처리
    const result = await createEmployeeRecord(employeeData, userId);
    
    // 3. 성공 응답
    return {
      success: true,
      data: result,
      message: "직원 정보가 성공적으로 처리되었습니다."
    };
    
  } catch (error) {
    // 4. 상세 에러 로깅
    console.error('[processEmployeeData] 직원 데이터 처리 오류:', {
      error: error.message,
      stack: error.stack,
      employeeData: {
        ...employeeData,
        // 민감한 정보는 마스킹
        password: employeeData.password ? '[REDACTED]' : undefined,
        socialSecurityNumber: employeeData.socialSecurityNumber ? '[REDACTED]' : undefined
      },
      userId,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] // 요청 추적용 ID (있는 경우)
    });
    
    // 5. 에러 재발생 (상위에서 처리)
    throw error;
  }
};
```

### API 에러 응답 표준
```javascript
router.post('/api/employees', authenticateToken, async (req, res) => {
  try {
    const result = await processEmployeeData(req.body, req.user.id);
    
    res.status(201).json({
      success: true,
      data: result.data,
      message: result.message
    });
    
  } catch (error) {
    // 에러 타입별 처리
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        data: null,
        message: `입력값 오류: ${error.message}`
      });
    }
    
    if (error.name === 'DuplicateError') {
      return res.status(409).json({
        success: false,
        data: null,
        message: `데이터 중복: ${error.message}`
      });
    }
    
    if (error.name === 'PermissionError') {
      return res.status(403).json({
        success: false,
        data: null,
        message: `권한 오류: ${error.message}`
      });
    }
    
    // 예상치 못한 오류
    res.status(500).json({
      success: false,
      data: null,
      message: "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    });
  }
});
```

### 커스텀 에러 클래스
```javascript
/**
 * 커스텀 에러 클래스들
 */

// 기본 커스텀 에러
class CustomError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 검증 오류
class ValidationError extends CustomError {
  constructor(message, field = null) {
    super(message, 400);
    this.field = field;
  }
}

// 권한 오류
class PermissionError extends CustomError {
  constructor(message = '권한이 없습니다.') {
    super(message, 403);
  }
}

// 데이터 중복 오류
class DuplicateError extends CustomError {
  constructor(message, duplicateField = null) {
    super(message, 409);
    this.duplicateField = duplicateField;
  }
}

// 리소스 없음 오류
class NotFoundError extends CustomError {
  constructor(message = '요청한 리소스를 찾을 수 없습니다.') {
    super(message, 404);
  }
}

module.exports = {
  CustomError,
  ValidationError,
  PermissionError,
  DuplicateError,
  NotFoundError
};
```

## 보안 가이드라인

### 민감 정보 처리
```javascript
// ✅ 올바른 예시 - 민감 정보 로깅 방지
const logUserActivity = (userData) => {
  console.log('사용자 활동 로그:', {
    userId: userData.id,
    email: userData.email.replace(/(.{2}).*@/, '$1***@'), // 이메일 마스킹
    action: userData.action,
    timestamp: new Date().toISOString(),
    // 비밀번호, 주민등록번호 등은 로그에서 완전 제외
  });
};

// ❌ 잘못된 예시 - 민감 정보 노출
const logUserActivity = (userData) => {
  console.log('사용자 활동 로그:', userData); // 모든 정보 노출 위험
};
```

### SQL Injection 방지
```javascript
// ✅ 올바른 예시 - Parameterized Query (SP 사용)
const getUserByEmail = async (email) => {
  const spParams = [
    { name: 'Email', type: SqlTypes.NVarChar(100), value: email }
  ];
  
  return await executeStoredProcedure('SP_GetUserByEmail', spParams);
};

// ❌ 절대 금지 - 직접 SQL 문자열 조합
const getUserByEmail = async (email) => {
  const query = `SELECT * FROM Users WHERE Email = '${email}'`; // SQL Injection 위험
  // 이런 코드는 절대 작성하지 마세요!
};
```

### 환경변수 사용
```javascript
// ✅ 올바른 예시 - 환경변수 사용
const jwtSecret = process.env.JWT_SECRET;
const dbPassword = process.env.DB_PASSWORD;

if (!jwtSecret) {
  throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
}

// ❌ 잘못된 예시 - 하드코딩
const jwtSecret = 'mySecretKey123'; // 절대 하드코딩하지 마세요!
const dbPassword = 'admin123'; // 보안 위험
```

### 입력값 검증 및 정제
```javascript
// ✅ 올바른 예시 - 입력값 검증 및 정제
const validateAndSanitizeInput = (input) => {
  // 1. 타입 검증
  if (typeof input.email !== 'string') {
    throw new ValidationError('이메일은 문자열이어야 합니다.');
  }
  
  // 2. 길이 검증
  if (input.email.length > 100) {
    throw new ValidationError('이메일은 100자를 초과할 수 없습니다.');
  }
  
  // 3. 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    throw new ValidationError('올바른 이메일 형식이 아닙니다.');
  }
  
  // 4. 데이터 정제
  return {
    ...input,
    email: input.email.trim().toLowerCase(),
    firstName: input.firstName?.trim(),
    lastName: input.lastName?.trim()
  };
};
```

## 품질 체크리스트

### 코드 작성 전 체크리스트
- [ ] 기능 요구사항을 명확히 이해했는가?
- [ ] API 명세를 확인했는가?
- [ ] 데이터베이스 스키마를 확인했는가?
- [ ] 관련 Stored Procedure가 준비되어 있는가?

### 코드 작성 중 체크리스트
- [ ] 네이밍 규칙을 준수하고 있는가?
- [ ] 함수는 단일 책임 원칙을 따르는가?
- [ ] 적절한 주석을 작성했는가?
- [ ] 에러 처리를 포함했는가?
- [ ] 입력값 검증을 포함했는가?

### 코드 완성 후 체크리스트
- [ ] 모든 설명과 주석이 한국어로 작성되었는가?
- [ ] JSDoc 형식 주석이 모든 함수에 포함되었는가?
- [ ] try-catch 에러 처리가 모든 API에 포함되었는가?
- [ ] 표준 응답 포맷 {success, data, message}를 사용했는가?
- [ ] JWT 인증 미들웨어가 적절히 적용되었는가?
- [ ] 에러 메시지가 모두 한국어로 작성되었는가?
- [ ] Stored Procedure에 적절한 주석과 에러 처리가 있는가?
- [ ] 민감한 정보가 로그에 노출되지 않는가?
- [ ] console.error로 에러 로깅이 포함되었는가?
- [ ] 환경변수를 적절히 사용했는가?
- [ ] SQL Injection 등 보안 취약점이 없는가?

### 테스트 체크리스트
- [ ] 정상 케이스 테스트를 완료했는가?
- [ ] 에러 케이스 테스트를 완료했는가?
- [ ] 권한 관련 테스트를 완료했는가?
- [ ] Postman 테스트 컬렉션을 작성했는가?
- [ ] 모든 응답이 표준 포맷을 따르는가?

### 성능 체크리스트
- [ ] 데이터베이스 쿼리가 최적화되어 있는가?
- [ ] 페이지네이션이 적절히 구현되어 있는가?
- [ ] 메모리 누수 가능성은 없는가?
- [ ] 불필요한 데이터 조회는 없는가?

### 보안 체크리스트
- [ ] 입력값 검증이 충분히 이루어지는가?
- [ ] SQL Injection 방지 조치가 되어 있는가?
- [ ] 민감한 정보가 로그에 노출되지 않는가?
- [ ] JWT 토큰 검증이 적절히 이루어지는가?
- [ ] 권한 검사가 적절히 이루어지는가?

### 문서화 체크리스트
- [ ] API 문서가 업데이트되었는가?
- [ ] 코드 변경사항이 주석에 반영되었는가?
- [ ] 사용 예시가 포함되어 있는가?
- [ ] 다른 개발자가 이해할 수 있는 수준인가?

## 코드 리뷰 가이드

### 리뷰어 체크 포인트
1. **기능성**: 요구사항을 충족하는가?
2. **가독성**: 코드를 이해하기 쉬운가?
3. **일관성**: 프로젝트 표준을 따르는가?
4. **보안**: 보안 취약점은 없는가?
5. **성능**: 성능 이슈는 없는가?
6. **테스트**: 적절한 테스트가 포함되어 있는가?

### 코드 리뷰 템플릿
```markdown
## 코드 리뷰 체크리스트

### ✅ 확인 완료 항목
- [ ] 기능 요구사항 충족
- [ ] 네이밍 규칙 준수
- [ ] 에러 처리 포함
- [ ] 보안 가이드라인 준수
- [ ] 성능 고려사항 적용

### 💬 리뷰 코멘트
- **긍정적인 부분**: [잘 작성된 부분 언급]
- **개선 제안**: [구체적인 개선 방안]
- **질문 사항**: [명확히 하고 싶은 부분]

### 🔧 수정 요청 사항 (있는 경우)
1. [구체적인 수정 요청]
2. [보안 관련 수정 요청]
3. [성능 개선 요청]

### ✅ 승인 조건
- [ ] 모든 수정 사항 반영 완료
- [ ] 테스트 통과 확인
- [ ] 문서 업데이트 완료
```

## 지속적인 개선

### 정기적 검토 항목
- **월간**: 코딩 표준 준수율 검토
- **분기별**: 새로운 베스트 프랙티스 도입 검토
- **연간**: 전체 코딩 가이드라인 업데이트

### 팀 학습 및 공유
- 코드 리뷰를 통한 지식 공유
- 정기적인 기술 세미나 개최
- 모범 사례 문서화 및 공유
- 실수 사례 분석 및 개선 방안 도출