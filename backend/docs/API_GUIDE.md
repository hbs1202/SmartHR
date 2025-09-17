# API 개발 가이드

SmartHR 백엔드 API 개발을 위한 상세 가이드입니다.

## 📋 목차

- [API 컨트롤러 표준 템플릿](#api-컨트롤러-표준-템플릿)
- [라우팅 구조](#라우팅-구조)
- [에러 처리 가이드](#에러-처리-가이드)
- [인증 미들웨어](#인증-미들웨어)
- [입력값 검증](#입력값-검증)
- [테스트 가이드](#테스트-가이드)
- [프론트엔드 연동 가이드](#프론트엔드-연동-가이드)

## API 컨트롤러 표준 템플릿

```javascript
/**
 * [기능명] API 컨트롤러
 * @description [상세 기능 설명]
 * @author 개발자명
 * @date 2024-09-XX
 */

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth"); // JWT 인증 미들웨어
const { executeStoredProcedure } = require("../database/dbHelper"); // DB 헬퍼 함수

/**
 * [API 기능명]
 * @route POST /api/[엔드포인트]
 * @description [API 상세 설명]
 * @access Private (JWT 토큰 필요)
 */
router.post("/api/[엔드포인트]", authenticateToken, async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const { param1, param2, param3 } = req.body;

    // 2. 필수 파라미터 검증
    if (!param1 || !param2) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "필수 입력 항목이 누락되었습니다.",
      });
    }

    // 3. 추가 비즈니스 검증 (필요시)
    if (param1.length < 3) {
      return res.status(400).json({
        success: false,
        data: null,
        message: "입력값이 유효하지 않습니다.",
      });
    }

    // 4. Stored Procedure 호출
    const spParams = [param1, param2, param3];
    const result = await executeStoredProcedure("SP_FunctionName", spParams);

    // 5. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      // 성공 응답
      res.json({
        success: true,
        data: result.data,
        message: result.Message || "성공적으로 처리되었습니다.",
      });
    } else {
      // 비즈니스 로직 오류 응답
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || "처리 중 오류가 발생했습니다.",
      });
    }
  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[기능명] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      timestamp: new Date().toISOString(),
    });

    // 시스템 오류 응답
    res.status(500).json({
      success: false,
      data: null,
      message: "서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
    });
  }
});

module.exports = router;
```

## 라우팅 구조

### 표준 라우팅 패턴

```
/api/auth           # 인증 관련
  POST /login       # 로그인
  POST /register    # 회원가입
  POST /refresh     # 토큰 갱신
  POST /logout      # 로그아웃

/api/employees      # 직원 관리
  GET /             # 목록 조회
  POST /            # 직원 등록
  GET /:id          # 상세 조회
  PUT /:id          # 정보 수정
  DELETE /:id       # 직원 삭제

/api/departments    # 부서 관리
/api/positions      # 직급 관리
/api/attendance     # 근태 관리
/api/leaves         # 휴가 관리
```

### 라우터 파일 구조

```javascript
// src/routes/index.js (메인 라우터)
const express = require("express");
const router = express.Router();

// 각 모듈별 라우터 import
const authRoutes = require("./auth");
const employeeRoutes = require("./employee");
const departmentRoutes = require("./department");

// 라우터 등록
router.use("/auth", authRoutes);
router.use("/employees", employeeRoutes);
router.use("/departments", departmentRoutes);

module.exports = router;
```

## 에러 처리 가이드

### HTTP 상태코드 가이드

```javascript
// 성공 응답
200 OK              # 조회, 수정 성공
201 Created         # 생성 성공
204 No Content      # 삭제 성공

// 클라이언트 오류
400 Bad Request     # 잘못된 요청 데이터
401 Unauthorized    # 인증 토큰 없음
403 Forbidden       # 권한 없음
404 Not Found       # 리소스 없음
409 Conflict        # 데이터 충돌 (중복 등)

// 서버 오류
500 Internal Server Error  # 서버 내부 오류
```

### 에러 로깅 템플릿

```javascript
console.error(`[${기능명}] ${에러타입} 오류 발생:`, {
  error: error.message,
  stack: error.stack,
  requestBody: req.body,
  requestParams: req.params,
  userId: req.user?.id,
  timestamp: new Date().toISOString(),
});
```

### 비즈니스 로직 에러 처리

```javascript
// SP 결과 코드에 따른 처리
switch (result.ResultCode) {
  case 0:
    // 성공
    return res.json({
      success: true,
      data: result.data,
      message: result.Message
    });
    
  case -1:
    // 일반적인 비즈니스 오류
    return res.status(400).json({
      success: false,
      data: null,
      message: result.Message
    });
    
  case -2:
    // 권한 오류
    return res.status(403).json({
      success: false,
      data: null,
      message: result.Message
    });
    
  case -3:
    // 리소스 없음
    return res.status(404).json({
      success: false,
      data: null,
      message: result.Message
    });
    
  default:
    // 알 수 없는 오류
    return res.status(500).json({
      success: false,
      data: null,
      message: "알 수 없는 오류가 발생했습니다."
    });
}
```

## 인증 미들웨어

### JWT 인증 미들웨어

```javascript
/**
 * JWT 토큰 검증 미들웨어
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: "인증 토큰이 필요합니다.",
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        data: null,
        message: "유효하지 않은 토큰입니다.",
      });
    }

    req.user = user;
    next();
  });
};
```

### 권한별 접근 제어

```javascript
/**
 * 관리자 권한 확인 미들웨어
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      data: null,
      message: "관리자 권한이 필요합니다.",
    });
  }
  next();
};

/**
 * 본인 데이터 접근 권한 확인 미들웨어
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
const requireSelfOrAdmin = (req, res, next) => {
  const targetUserId = parseInt(req.params.id);
  
  if (req.user.role !== 'ADMIN' && req.user.id !== targetUserId) {
    return res.status(403).json({
      success: false,
      data: null,
      message: "본인의 데이터만 접근할 수 있습니다.",
    });
  }
  next();
};
```

## 입력값 검증

### 기본 검증 패턴

```javascript
// 필수 파라미터 검증
const requiredFields = ['employeeCode', 'firstName', 'email'];
const missingFields = requiredFields.filter(field => !req.body[field]);

if (missingFields.length > 0) {
  return res.status(400).json({
    success: false,
    data: null,
    message: `필수 입력 항목이 누락되었습니다: ${missingFields.join(', ')}`,
  });
}

// 데이터 타입 검증
if (typeof req.body.departmentId !== 'number') {
  return res.status(400).json({
    success: false,
    data: null,
    message: "부서 ID는 숫자여야 합니다.",
  });
}

// 길이 검증
if (req.body.employeeCode.length < 3 || req.body.employeeCode.length > 10) {
  return res.status(400).json({
    success: false,
    data: null,
    message: "직원코드는 3-10자 사이여야 합니다.",
  });
}

// 이메일 형식 검증
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(req.body.email)) {
  return res.status(400).json({
    success: false,
    data: null,
    message: "올바른 이메일 형식이 아닙니다.",
  });
}
```

### Express Validator 사용 예시

```javascript
const { body, validationResult } = require('express-validator');

// 검증 규칙 정의
const validateEmployee = [
  body('employeeCode')
    .isLength({ min: 3, max: 10 })
    .withMessage('직원코드는 3-10자 사이여야 합니다.'),
  
  body('firstName')
    .notEmpty()
    .withMessage('이름은 필수입니다.')
    .isLength({ max: 50 })
    .withMessage('이름은 50자 이하여야 합니다.'),
    
  body('email')
    .isEmail()
    .withMessage('올바른 이메일 형식이 아닙니다.')
    .normalizeEmail(),
    
  body('departmentId')
    .isInt({ min: 1 })
    .withMessage('유효한 부서 ID여야 합니다.')
];

// 검증 결과 처리 미들웨어
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return res.status(400).json({
      success: false,
      data: null,
      message: errorMessages.join(', ')
    });
  }
  next();
};

// 사용 예시
router.post('/api/employees', 
  validateEmployee, 
  handleValidationErrors, 
  authenticateToken, 
  async (req, res) => {
    // API 로직
  }
);
```

## 테스트 가이드

### Postman 테스트 템플릿

#### 인증 API 테스트
```
POST http://localhost:3000/api/auth/login
Headers:
  Content-Type: application/json

Body:
{
  "email": "admin@company.com",
  "password": "password123"
}

Expected Response:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "admin@company.com",
      "role": "ADMIN"
    }
  },
  "message": "로그인이 성공했습니다."
}
```

#### 직원 등록 API 테스트
```
POST http://localhost:3000/api/employees
Headers:
  Content-Type: application/json
  Authorization: Bearer [JWT_TOKEN]

Body:
{
  "employeeCode": "EMP001",
  "firstName": "홍길동",
  "lastName": "홍",
  "email": "hong@company.com",
  "phone": "010-1234-5678",
  "departmentId": 1,
  "positionId": 1,
  "hireDate": "2024-09-12",
  "salary": 3500000
}

Expected Response:
{
  "success": true,
  "data": {
    "employeeId": 1,
    "employeeCode": "EMP001"
  },
  "message": "직원이 성공적으로 등록되었습니다."
}
```

#### 에러 케이스 테스트
```
POST http://localhost:3000/api/employees
Headers:
  Content-Type: application/json
  Authorization: Bearer [JWT_TOKEN]

Body:
{
  "employeeCode": "EMP001"
  // firstName 누락
}

Expected Response:
{
  "success": false,
  "data": null,
  "message": "필수 입력 항목이 누락되었습니다: firstName, email"
}
```

### API 테스트 체크리스트

#### 기본 테스트
- [ ] 정상 요청 시 성공 응답 확인
- [ ] 필수 파라미터 누락 시 400 에러 확인
- [ ] 잘못된 데이터 타입 시 400 에러 확인
- [ ] 인증 토큰 없이 요청 시 401 에러 확인
- [ ] 유효하지 않은 토큰 시 403 에러 확인

#### 비즈니스 로직 테스트
- [ ] 중복 데이터 등록 시 409 에러 확인
- [ ] 존재하지 않는 리소스 요청 시 404 에러 확인
- [ ] 권한 없는 리소스 접근 시 403 에러 확인
- [ ] 비즈니스 규칙 위반 시 적절한 에러 메시지 확인

#### 응답 형식 테스트
- [ ] 성공 응답이 {success: true, data: {...}, message: "..."} 형식인지 확인
- [ ] 실패 응답이 {success: false, data: null, message: "..."} 형식인지 확인
- [ ] 모든 메시지가 한국어로 작성되었는지 확인

## 각 API 개발 시 필수 포함 사항

1. **입력값 검증** - 필수 파라미터, 데이터 타입, 길이, 형식 검증
2. **비즈니스 로직 검증** - 중복 체크, 권한 확인, 관계 데이터 확인
3. **Stored Procedure 호출** - 파라미터 바인딩, 결과 처리
4. **결과 처리 및 응답** - 표준 응답 포맷 준수
5. **에러 처리 및 로깅** - try-catch, 상세 에러 로깅
6. **JSDoc 주석 작성** - 함수, 파라미터, 리턴값 설명

## 성능 최적화 가이드

### 데이터베이스 최적화
- 인덱스 활용을 위한 쿼리 최적화
- 페이지네이션 구현
- N+1 쿼리 문제 방지
- 트랜잭션 범위 최소화

### 응답 최적화
- 필요한 필드만 반환
- 데이터 압축 (gzip)
- 캐싱 전략 구현
- API 버전 관리

### 보안 강화
- Rate Limiting 구현
- SQL Injection 방지
- XSS 방지
- CSRF 방지
- 민감 정보 로깅 방지

## 프론트엔드 연동 가이드

### React + TypeScript 연동

#### API 서비스 작성
```typescript
// services/companyService.ts
import api from './api';
import type { ApiResponse } from '../types/api';

export interface Company {
  CompanyId: number;           // PascalCase - API 응답 구조
  CompanyCode: string;
  CompanyName: string;
  BusinessNumber?: string;
  // ... 기타 필드
}

export interface CompanyCreateRequest {
  companyCode: string;         // camelCase - 요청 구조
  companyName: string;
  businessNumber?: string;
  // ... 기타 필드
}

export const getCompanies = async (params: CompanyListParams = {}): Promise<ApiResponse<CompanyListResponse>> => {
  try {
    const response = await api.get<ApiResponse<CompanyListResponse>>('/api/organization/companies', { params });
    return response.data;
  } catch (error: unknown) {
    console.error('회사 목록 조회 오류:', error);
    throw error;
  }
};
```

#### 타입 안전성 확보
```typescript
// 응답 타입과 요청 타입 구분
interface Company {          // API 응답 (PascalCase)
  CompanyId: number;
  CompanyName: string;
}

interface CompanyCreateRequest {  // API 요청 (camelCase)
  companyCode: string;
  companyName: string;
}

// 에러 처리 타입 안전성
try {
  const response = await createCompany(data);
} catch (error: unknown) {
  const axiosError = error as {
    response?: {
      data?: { message?: string };
      status?: number
    };
    message?: string
  };

  if (axiosError.response?.data?.message) {
    message.error(axiosError.response.data.message);
  }
}
```

#### React 컴포넌트 연동
```typescript
const CompanyList: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);

  // useCallback으로 성능 최적화
  const fetchCompanies = useCallback(async (params: CompanyListParams = filters) => {
    try {
      setLoading(true);
      const response = await getCompanies(params);

      if (response && response.success && response.data) {
        setCompanies(response.data.companies);
      }
    } catch (error: unknown) {
      console.error('조회 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // React Hooks exhaustive-deps 규칙 준수
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);
};
```

### API 응답 처리 패턴

#### 성공 응답 처리
```typescript
const response = await createCompany(formData);

// 유연한 성공 조건 처리
if (response && (response.success === true || String(response.success) === 'true' || !('success' in response))) {
  message.success('회사가 성공적으로 등록되었습니다.');
  // 성공 처리 로직
} else {
  message.error(response?.message || '등록에 실패했습니다.');
}
```

#### 에러 응답 처리
```typescript
catch (error: unknown) {
  const axiosError = error as {
    response?: {
      data?: { message?: string };
      status?: number
    };
    message?: string
  };

  if (axiosError.response?.data?.message) {
    message.error(axiosError.response.data.message);
  } else if (axiosError.response?.status === 400) {
    message.error('입력 정보를 확인해주세요.');
  } else if (axiosError.response?.status === 409) {
    message.error('이미 존재하는 데이터입니다.');
  } else {
    message.error('처리 중 오류가 발생했습니다.');
  }
}
```

### 폼 처리 및 유효성 검사

#### Ant Design Form 연동
```typescript
const handleSubmit = async (values: CompanyCreateRequest) => {
  try {
    // 날짜 포맷팅
    const formData: CompanyCreateRequest = {
      ...values,
      establishDate: values.establishDate ? dayjs(values.establishDate).format('YYYY-MM-DD') : undefined,
    };

    // 클라이언트 사이드 유효성 검증
    const validation = validateCompanyForm(formData);
    if (!validation.isValid) {
      message.error(validation.errors.join('\n'));
      return;
    }

    // API 호출
    const response = await createCompany(formData);

    if (response?.success) {
      message.success('등록이 완료되었습니다.');
      form.resetFields();
      setIsModalOpen(false);
      await fetchCompanies(); // 목록 새로고침
    }
  } catch (error: unknown) {
    // 에러 처리
  }
};
```

#### 자동 포맷팅 구현
```typescript
// 사업자등록번호 자동 포맷팅
const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const formatted = formatBusinessNumber(e.target.value);
  form.setFieldValue('businessNumber', formatted);
};

// 포맷팅 함수
export const formatBusinessNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
};
```

### 외부 API 연동

#### 다음 우편번호 검색 API
```typescript
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          address: string;
          zonecode: string;
        }) => void;
      }) => {
        open: () => void;
      };
    };
  }
}

const openAddressSearch = () => {
  new window.daum.Postcode({
    oncomplete: (data) => {
      form.setFieldsValue({
        postalCode: data.zonecode,
        address: data.address,
      });
    }
  }).open();
};
```

### 성능 최적화

#### React 최적화
- useCallback을 사용한 함수 메모이제이션
- React.memo를 사용한 컴포넌트 메모이제이션
- 의존성 배열 정확한 관리 (exhaustive-deps)

#### TypeScript 최적화
- `any` 타입 사용 금지
- 구체적인 타입 정의 사용
- 에러 처리에 `unknown` 타입 사용

#### UI/UX 최적화
- 모달 시스템으로 페이지 이동 최소화
- 로딩 상태 명확한 표시
- 에러 메시지 사용자 친화적 표시