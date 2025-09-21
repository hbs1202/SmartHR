인사관리 시스템 개발 필수 규칙
🚨 Claude Code 절대 준수 사항 (예외 없음)
1. 언어 및 주석 규칙
모든 응답과 설명은 한국어로 작성
모든 코드에 한국어 주석 반드시 포함
함수 설명, 파라미터 설명, 로직 설명 모두 포함
JSDoc 형식 사용 권장
2. 코딩 표준
변수명/함수명: camelCase (예: employeeCode, createEmployee)
상수: UPPER_SNAKE_CASE (예: MAX_LOGIN_ATTEMPTS)
파일명: kebab-case (예: employee-controller.js)
들여쓰기: 2칸 스페이스
3. 필수 에러 처리
모든 API에 try-catch 필수 적용
에러 메시지는 한국어로 작성
console.error로 에러 로깅 필수
적절한 HTTP 상태코드 설정
4. 표준 응답 포맷 (절대 변경 금지)
json
{
  "success": boolean,
  "data": any,
  "message": string
}
성공 응답 예시:

javascript
res.json({
  success: true,
  data: { employeeId: 1, employeeCode: 'EMP001' },
  message: '직원이 성공적으로 등록되었습니다.'
});
실패 응답 예시:

javascript
res.status(400).json({
  success: false,
  data: null,
  message: '필수 입력 항목이 누락되었습니다.'
});
5. 보안 규칙 (필수)
JWT 토큰 검증 미들웨어 적용 (auth API 제외)
비밀번호 bcrypt 해싱 필수 (saltRounds: 10)
SQL Injection 방지 (Parameterized Query만 사용)
환경변수로 민감정보 관리
6. 데이터베이스 규칙
MS SQL Server 사용
Stored Procedure 호출 방식만 사용
직접 SQL 쿼리 작성 금지
Identity PK 사용
한글 필드는 nvarchar 타입
🛠 API 컨트롤러 표준 템플릿
javascript
/**
 * [기능명] API 컨트롤러
 * @description [상세 기능 설명]
 * @author 개발자명
 * @date 2024-01-XX
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth'); // JWT 인증 미들웨어
const { executeStoredProcedure } = require('../database/dbHelper'); // DB 헬퍼 함수

/**
 * [API 기능명]
 * @route POST /api/[엔드포인트]
 * @description [API 상세 설명]
 * @access Private (JWT 토큰 필요)
 */
router.post('/api/[엔드포인트]', authenticateToken, async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const { param1, param2, param3 } = req.body;
    
    // 2. 필수 파라미터 검증
    if (!param1 || !param2) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '필수 입력 항목이 누락되었습니다.'
      });
    }

    // 3. 추가 비즈니스 검증 (필요시)
    if (param1.length < 3) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '입력값이 유효하지 않습니다.'
      });
    }

    // 4. Stored Procedure 호출
    const spParams = [param1, param2, param3];
    const result = await executeStoredProcedure('SP_FunctionName', spParams);
    
    // 5. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      // 성공 응답
      res.json({
        success: true,
        data: result.data,
        message: result.Message || '성공적으로 처리되었습니다.'
      });
    } else {
      // 비즈니스 로직 오류 응답
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '처리 중 오류가 발생했습니다.'
      });
    }
    
  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[기능명] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });
    
    // 시스템 오류 응답
    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

module.exports = router;
🗄 Stored Procedure 표준 템플릿
sql
-- =============================================
-- 작성자: 개발자명
-- 작성일: 2024-01-XX
-- 설명: [SP 기능 상세 설명]
-- 수정이력: 
-- =============================================

CREATE PROCEDURE SP_FunctionName
    @Param1 NVARCHAR(100),      -- 파라미터1 설명
    @Param2 INT,                -- 파라미터2 설명  
    @Param3 DATETIME = NULL,    -- 파라미터3 설명 (선택적)
    @ResultCode INT OUTPUT,     -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 변수 선언
    DECLARE @Count INT = 0;
    DECLARE @ExistingId INT = 0;
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @Param1 IS NULL OR LTRIM(RTRIM(@Param1)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '필수 파라미터가 누락되었습니다.';
            RETURN;
        END
        
        -- 2. 비즈니스 규칙 검증
        SELECT @Count = COUNT(*)
        FROM TableName 
        WHERE ColumnName = @Param1;
        
        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 데이터입니다.';
            RETURN;
        END
        
        -- 3. 실제 비즈니스 로직 처리
        INSERT INTO TableName (Column1, Column2, Column3, CreatedAt)
        VALUES (@Param1, @Param2, @Param3, GETDATE());
        
        -- 4. 생성된 ID 반환 (필요시)
        SELECT SCOPE_IDENTITY() AS NewId;
        
        -- 5. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '성공적으로 처리되었습니다.';
        
    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '처리 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        -- 에러 로깅 (개발/디버깅용)
        PRINT '=== SP_FunctionName 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'Input Param1: ' + ISNULL(@Param1, 'NULL');
        PRINT 'Input Param2: ' + CAST(@Param2 AS NVARCHAR(10));
        PRINT '================================';
        
    END CATCH
END
📋 프로젝트 기본 정보
기술 스택
Backend: Node.js + Express
Database: MS SQL Server
인증: JWT + bcrypt
패키지: mssql, jsonwebtoken, cors, helmet, morgan
프로젝트 구조
/backend
  /src
    /controllers     # API 컨트롤러
    /services        # 비즈니스 로직
    /routes          # 라우터
    /middleware      # 인증, 검증 미들웨어
    /database        # DB 연결, 쿼리 헬퍼
    /utils           # 유틸리티 함수
  /sql
    /procedures      # Stored Procedure 파일들
    /schema          # 테이블 생성 스크립트
  /config
  /tests
환경 설정
javascript
// .env 파일 필수 항목
DB_SERVER=localhost
DB_DATABASE=hr_system
DB_USER=sa
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
PORT=3000
🔍 코드 품질 검증 체크리스트
Claude Code 결과물 반드시 확인할 사항
 모든 설명과 주석이 한국어로 작성되었는가?
 모든 함수에 JSDoc 형식 주석이 포함되었는가?
 try-catch 에러 처리가 모든 API에 포함되었는가?
 표준 응답 포맷 {success, data, message}를 사용했는가?
 JWT 인증 미들웨어가 적절히 적용되었는가?
 에러 메시지가 모두 한국어로 작성되었는가?
 Stored Procedure에 적절한 주석과 에러 처리가 있는가?
 입력값 검증 로직이 포함되었는가?
 console.error로 에러 로깅이 포함되었는가?
 환경변수를 적절히 사용했는가?
⚠️ 절대 금지 사항
영어 주석이나 설명 사용 금지
응답 포맷 임의 변경 금지
try-catch 에러 처리 생략 금지
하드코딩된 값 사용 금지 (환경변수 사용)
직접 SQL 쿼리 작성 금지 (SP만 사용)
JWT 인증 생략 금지 (auth API 제외)
비밀번호 평문 저장 금지 (bcrypt 해싱 필수)
에러 로깅 생략 금지
입력값 검증 생략 금지
SQL Injection 취약한 코드 작성 금지
📁 부서 관리 API 구현 현황

## 부서 관리 Stored Procedures (x_ 명명 규칙)
- **x_GetDepartments**: 부서 목록 조회 (페이징, 검색, 필터링 지원)
- **x_GetDepartmentById**: 부서 상세 조회
- **x_CreateDepartment**: 부서 등록 (부서코드 중복 검증, 상위부서 검증 포함)
- **x_UpdateDepartment**: 부서 수정 (간단 버전 - 5개 필드만 수정)
- **x_DeleteDepartment**: 부서 삭제 (소프트 삭제 방식)

## 부서 관리 API 엔드포인트
```javascript
// 부서 목록 조회 (GET /api/organization/departments)
// 파라미터: companyId, subCompanyId, page, limit, isActive, search
// 응답: {departments: Array, pagination: Object}

// 부서 상세 조회 (GET /api/organization/departments/:id)
// 응답: Department 객체

// 부서 등록 (POST /api/organization/departments)
// 요청: {subCompanyId, deptCode, deptName, parentDeptId?, establishDate?}
// 응답: 생성된 Department 객체

// 부서 수정 (PUT /api/organization/departments/:id)
// 요청: {deptCode, deptName, parentDeptId?, establishDate?}
// 응답: 수정된 Department 객체

// 부서 삭제 (DELETE /api/organization/departments/:id)
// 응답: 성공 메시지
```

## 부서 관리 컨트롤러 특징
- **organization-controller.js**: 통합 조직 관리 컨트롤러
- **executeStoredProcedureWithNamedParams**: 명명된 파라미터를 사용한 SP 호출
- **QUOTED_IDENTIFIER ON**: SQL Server 호환성 설정
- **JWT 인증**: 모든 API에 인증 미들웨어 적용
- **한국어 오류 메시지**: 모든 에러 메시지 한국어 처리
- **로깅**: 요청/응답/에러 로깅 포함

## 테이블 구조
```sql
-- uDeptTb (부서 테이블)
DeptId (PK), SubCompanyId (FK), CompanyId (FK),
DeptCode, DeptName, ParentDeptId, DeptLevel, DeptType,
ManagerEmployeeId, ViceManagerEmployeeId, CostCenter, Budget,
EmployeeCount, PhoneNumber, Extension, Email, Location,
EstablishDate, CloseDate, Purpose, IsActive,
CreatedAt, UpdatedAt, CreatedBy, UpdatedBy
```

💬 Claude Code 소통 방식
작업 완료 시 반드시 포함할 내용
구현된 기능 설명 (한국어)
테스트 방법 안내
Postman 테스트 예시
다음 작업 제안
주의사항이나 참고사항
질문이나 확인이 필요한 경우
구현 중 다음 사항을 확인하고 싶습니다:
1. [질문 내용]
2. [대안 제시]
어떤 방향으로 진행할까요?
에러나 문제 발생 시 보고 형식
다음 문제가 발생했습니다:
- 오류 내용: [구체적인 오류]
- 발생 위치: [파일명 및 라인]
- 해결 방안: [제안사항]
🎯 개발 진행 방식
Phase별 작업 순서
테이블 설계 및 생성
Stored Procedure 개발
API 컨트롤러 구현
테스트 및 검증
다음 Phase 진행
각 API 개발 시 필수 포함 사항
입력값 검증 (필수 파라미터, 데이터 타입, 길이 등)
비즈니스 로직 검증 (중복 체크, 권한 확인 등)
Stored Procedure 호출
결과 처리 및 응답
에러 처리 및 로깅
JSDoc 주석 작성
테스트 가이드
javascript
// Postman 테스트 예시 제공 형식
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
  "departmentId": 1,
  "positionId": 1
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
🔧 공통 유틸리티 함수
DB 헬퍼 함수 표준
javascript
/**
 * Stored Procedure 실행 헬퍼 함수
 * @param {string} procedureName - SP 이름
 * @param {Array} parameters - 파라미터 배열
 * @returns {Object} 실행 결과
 */
const executeStoredProcedure = async (procedureName, parameters = []) => {
  try {
    const pool = await sql.connect(dbConfig);
    const request = pool.request();
    
    // 파라미터 추가
    parameters.forEach((param, index) => {
      request.input(`param${index + 1}`, param);
    });
    
    // Output 파라미터 추가
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));
    
    const result = await request.execute(procedureName);
    
    return {
      ResultCode: result.output.ResultCode,
      Message: result.output.Message,
      data: result.recordset
    };
    
  } catch (error) {
    console.error('SP 실행 오류:', error);
    throw error;
  }
};
JWT 인증 미들웨어 표준
javascript
/**
 * JWT 토큰 검증 미들웨어
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체  
 * @param {Function} next - 다음 미들웨어
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: '인증 토큰이 필요합니다.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        data: null,
        message: '유효하지 않은 토큰입니다.'
      });
    }
    
    req.user = user;
    next();
  });
};
