# 데이터베이스 가이드

SmartHR 백엔드 데이터베이스 연동 및 Stored Procedure 개발을 위한 상세 가이드입니다.

## 📋 목차

- [데이터베이스 연결 설정](#데이터베이스-연결-설정)
- [Stored Procedure 표준 템플릿](#stored-procedure-표준-템플릿)
- [DB 헬퍼 함수](#db-헬퍼-함수)
- [트랜잭션 처리](#트랜잭션-처리)
- [에러 처리](#에러-처리)
- [성능 최적화](#성능-최적화)

## 네이밍 규칙

### 테이블 네이밍
- 테이블 이름은 `u`로 시작하고 `Tb`로 끝나게 함
- 예: `uEmployeeTb`, `uCompanyTb`, `uDeptTb`

### Stored Procedure 네이밍  
- **모든 Stored Procedure 이름은 `x_`로 시작하게 함**
- 생성용: `x_Create[TableName]` (예: `x_CreateEmployee`)
- 조회용: `x_Get[TableName]` (예: `x_GetEmployees`)  
- 수정용: `x_Update[TableName]` (예: `x_UpdateEmployee`)
- 삭제용: `x_Delete[TableName]` (예: `x_DeleteEmployee`)
- 인증용: `x_Auth[Function]` (예: `x_AuthLogin`)
- 기타: `x_[Function]` (예: `x_GetOrganizationTree`)

### 뷰 네이밍
- 뷰 이름은 `u`로 시작하고 `View`로 끝나게 함
- 예: `uEmployeeDetailView`, `uOrganizationView`

## 데이터베이스 연결 설정

### 연결 풀 설정 (config/database.js)

```javascript
/**
 * MS SQL Server 데이터베이스 연결 설정
 * @description Connection Pool을 사용하여 효율적인 연결 관리
 * @author 개발자명
 * @date 2024-09-12
 */

const sql = require("mssql");

// 데이터베이스 연결 설정
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  pool: {
    max: 10, // 최대 연결 수
    min: 0, // 최소 연결 수
    idleTimeoutMillis: 30000, // 유휴 연결 타임아웃 (30초)
    acquireTimeoutMillis: 60000, // 연결 획득 타임아웃 (1분)
  },
  options: {
    encrypt: false, // Azure SQL Database 사용시 true
    trustServerCertificate: true, // 개발환경에서만 true
    enableArithAbort: true, // 성능 최적화
  },
  connectionTimeout: 15000, // 연결 타임아웃 (15초)
  requestTimeout: 30000, // 쿼리 타임아웃 (30초)
};

// 전역 연결 풀
let pool = null;

/**
 * 데이터베이스 연결 풀 초기화
 * @returns {Promise<mssql.ConnectionPool>} 연결 풀
 */
const initializePool = async () => {
  try {
    if (pool) {
      return pool;
    }

    pool = await sql.connect(dbConfig);
    console.log("✅ 데이터베이스 연결 풀이 성공적으로 초기화되었습니다.");

    // 연결 이벤트 처리
    pool.on("error", (error) => {
      console.error("💥 데이터베이스 연결 풀 오류:", error);
    });

    return pool;
  } catch (error) {
    console.error("❌ 데이터베이스 연결 풀 초기화 실패:", error);
    throw error;
  }
};

/**
 * 데이터베이스 연결 풀 종료
 */
const closePool = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log("✅ 데이터베이스 연결 풀이 안전하게 종료되었습니다.");
    }
  } catch (error) {
    console.error("❌ 데이터베이스 연결 풀 종료 오류:", error);
  }
};

/**
 * 연결 상태 확인
 * @returns {boolean} 연결 상태
 */
const isConnected = () => {
  return pool && pool.connected;
};

module.exports = {
  sql,
  dbConfig,
  initializePool,
  closePool,
  isConnected,
  getPool: () => pool,
};
```

## Stored Procedure 표준 템플릿

### 기본 SP 템플릿

```sql
-- =============================================
-- 작성자: 개발자명
-- 작성일: 2024-09-XX
-- 설명: [SP 기능 상세 설명]
-- 파라미터:
--   @Param1: 파라미터1 설명
--   @Param2: 파라미터2 설명
-- 반환값:
--   ResultCode: 0(성공), -1(실패), -2(권한오류), -3(데이터없음)
--   Message: 결과 메시지
-- 수정이력:
--   2024-09-XX: 최초 생성
-- =============================================

CREATE PROCEDURE SP_FunctionName
    @Param1 NVARCHAR(100),           -- 파라미터1 설명
    @Param2 INT,                     -- 파라미터2 설명
    @Param3 DATETIME = NULL,         -- 파라미터3 설명 (선택적)
    @UserId INT = NULL,              -- 요청 사용자 ID (권한 확인용)
    @ResultCode INT OUTPUT,          -- 결과 코드
    @Message NVARCHAR(500) OUTPUT    -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    SET TRANSACTION ISOLATION LEVEL READ COMMITTED;

    -- 변수 선언
    DECLARE @Count INT = 0;
    DECLARE @ExistingId INT = 0;
    DECLARE @ErrorMessage NVARCHAR(MAX);

    -- 트랜잭션 시작
    BEGIN TRANSACTION;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @Param1 IS NULL OR LTRIM(RTRIM(@Param1)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '필수 파라미터가 누락되었습니다.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 2. 권한 검증 (필요시)
        IF @UserId IS NOT NULL
        BEGIN
            -- 사용자 권한 확인 로직
            IF NOT EXISTS (SELECT 1 FROM Users WHERE UserId = @UserId AND IsActive = 1)
            BEGIN
                SET @ResultCode = -2;
                SET @Message = '유효하지 않은 사용자입니다.';
                ROLLBACK TRANSACTION;
                RETURN;
            END
        END

        -- 3. 비즈니스 규칙 검증
        SELECT @Count = COUNT(*)
        FROM TableName
        WHERE ColumnName = @Param1;

        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 데이터입니다.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 4. 실제 비즈니스 로직 처리
        INSERT INTO TableName (
            Column1,
            Column2,
            Column3,
            CreatedBy,
            CreatedAt,
            UpdatedBy,
            UpdatedAt
        )
        VALUES (
            @Param1,
            @Param2,
            @Param3,
            @UserId,
            GETDATE(),
            @UserId,
            GETDATE()
        );

        -- 5. 생성된 ID 반환 (필요시)
        SET @ExistingId = SCOPE_IDENTITY();

        -- 6. 결과 데이터 반환
        SELECT
            @ExistingId AS NewId,
            @Param1 AS Column1,
            @Param2 AS Column2,
            GETDATE() AS CreatedAt;

        -- 7. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '성공적으로 처리되었습니다.';

        COMMIT TRANSACTION;

    END TRY
    BEGIN CATCH
        -- 트랜잭션 롤백
        IF @@TRANCOUNT > 0
        BEGIN
            ROLLBACK TRANSACTION;
        END

        -- 에러 정보 수집
        SET @ErrorMessage =
            'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10)) + CHAR(13) +
            'Error Message: ' + ERROR_MESSAGE() + CHAR(13) +
            'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10)) + CHAR(13) +
            'Error Procedure: ' + ISNULL(ERROR_PROCEDURE(), 'N/A');

        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '처리 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        -- 에러 로깅 (개발/디버깅용)
        PRINT '=== SP_FunctionName 오류 발생 ===';
        PRINT @ErrorMessage;
        PRINT 'Input Param1: ' + ISNULL(@Param1, 'NULL');
        PRINT 'Input Param2: ' + ISNULL(CAST(@Param2 AS NVARCHAR(10)), 'NULL');
        PRINT 'Input UserId: ' + ISNULL(CAST(@UserId AS NVARCHAR(10)), 'NULL');
        PRINT '==================================';

    END CATCH
END
```

### 조회용 SP 템플릿

```sql
-- =============================================
-- 작성자: 개발자명
-- 작성일: 2024-09-XX
-- 설명: [조회 기능] 목록 조회 SP
-- =============================================

CREATE PROCEDURE SP_GetListWithPaging
    @SearchKeyword NVARCHAR(100) = '',    -- 검색 키워드
    @PageNumber INT = 1,                  -- 페이지 번호
    @PageSize INT = 20,                   -- 페이지 크기
    @SortColumn NVARCHAR(50) = 'CreatedAt', -- 정렬 컬럼
    @SortDirection NVARCHAR(4) = 'DESC',  -- 정렬 방향
    @UserId INT = NULL,                   -- 요청 사용자 ID
    @ResultCode INT OUTPUT,               -- 결과 코드
    @Message NVARCHAR(500) OUTPUT,        -- 결과 메시지
    @TotalCount INT OUTPUT                -- 전체 개수
AS
BEGIN
    SET NOCOUNT ON;

    -- 변수 선언
    DECLARE @Offset INT;
    DECLARE @SQL NVARCHAR(MAX);
    DECLARE @CountSQL NVARCHAR(MAX);

    BEGIN TRY
        -- 입력값 검증
        IF @PageNumber < 1 SET @PageNumber = 1;
        IF @PageSize < 1 OR @PageSize > 100 SET @PageSize = 20;
        IF @SortDirection NOT IN ('ASC', 'DESC') SET @SortDirection = 'DESC';

        -- 오프셋 계산
        SET @Offset = (@PageNumber - 1) * @PageSize;

        -- 허용된 정렬 컬럼 검증
        IF @SortColumn NOT IN ('Id', 'Name', 'CreatedAt', 'UpdatedAt')
        BEGIN
            SET @SortColumn = 'CreatedAt';
        END

        -- 전체 개수 조회
        SET @CountSQL = N'
        SELECT @TotalCount = COUNT(*)
        FROM TableName t
        WHERE (@SearchKeyword = '''' OR t.Name LIKE ''%'' + @SearchKeyword + ''%'')
          AND t.IsDeleted = 0';

        EXEC sp_executesql @CountSQL,
            N'@SearchKeyword NVARCHAR(100), @TotalCount INT OUTPUT',
            @SearchKeyword, @TotalCount OUTPUT;

        -- 데이터 조회 (페이징)
        SET @SQL = N'
        SELECT
            t.Id,
            t.Name,
            t.Description,
            t.CreatedAt,
            t.UpdatedAt,
            u.Name AS CreatedByName
        FROM TableName t
        LEFT JOIN Users u ON t.CreatedBy = u.UserId
        WHERE (@SearchKeyword = '''' OR t.Name LIKE ''%'' + @SearchKeyword + ''%'')
          AND t.IsDeleted = 0
        ORDER BY ' + @SortColumn + ' ' + @SortDirection + '
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY';

        EXEC sp_executesql @SQL,
            N'@SearchKeyword NVARCHAR(100), @Offset INT, @PageSize INT',
            @SearchKeyword, @Offset, @PageSize;

        -- 페이징 정보 반환
        SELECT
            @PageNumber AS CurrentPage,
            @PageSize AS PageSize,
            @TotalCount AS TotalCount,
            CEILING(CAST(@TotalCount AS FLOAT) / @PageSize) AS TotalPages;

        -- 성공 처리
        SET @ResultCode = 0;
        SET @Message = '조회가 완료되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        PRINT '=== SP_GetListWithPaging 오류 발생 ===';
        PRINT 'Error: ' + ERROR_MESSAGE();
        PRINT '=======================================';
    END CATCH
END
```

## DB 헬퍼 함수

### 기본 DB 헬퍼 (src/database/dbHelper.js)

```javascript
/**
 * 데이터베이스 헬퍼 함수 모음
 * @description Stored Procedure 실행, 트랜잭션 처리 등을 위한 헬퍼 함수
 * @author 개발자명
 * @date 2024-09-12
 */

const { sql, getPool } = require("../../config/database");

/**
 * Stored Procedure 실행 헬퍼 함수
 * @param {string} procedureName - SP 이름
 * @param {Array} inputParams - 입력 파라미터 배열 [{name, type, value}]
 * @param {Array} outputParams - 출력 파라미터 배열 [{name, type}]
 * @returns {Object} 실행 결과
 */
const executeStoredProcedure = async (
  procedureName,
  inputParams = [],
  outputParams = []
) => {
  try {
    const pool = getPool();
    if (!pool) {
      throw new Error("데이터베이스 연결 풀이 초기화되지 않았습니다.");
    }

    const request = pool.request();

    // 입력 파라미터 추가
    inputParams.forEach((param, index) => {
      if (param.name && param.type !== undefined) {
        // 타입별 파라미터 추가
        request.input(param.name, param.type, param.value);
      } else {
        // 기본 방식 (이전 버전 호환성)
        request.input(`param${index + 1}`, param);
      }
    });

    // 출력 파라미터 추가
    outputParams.forEach((param) => {
      request.output(param.name, param.type);
    });

    // 기본 출력 파라미터 (표준)
    request.output("ResultCode", sql.Int);
    request.output("Message", sql.NVarChar(500));

    // SP 실행
    const result = await request.execute(procedureName);

    return {
      ResultCode: result.output.ResultCode,
      Message: result.output.Message,
      data: result.recordsets[0] || [], // 첫 번째 결과셋
      recordsets: result.recordsets, // 모든 결과셋
      output: result.output, // 출력 파라미터
    };
  } catch (error) {
    console.error(`❌ SP 실행 오류 [${procedureName}]:`, {
      error: error.message,
      stack: error.stack,
      inputParams,
      outputParams,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
};

/**
 * 간단한 SP 실행 (이전 버전 호환성)
 * @param {string} procedureName - SP 이름
 * @param {Array} parameters - 파라미터 배열
 * @returns {Object} 실행 결과
 */
const executeStoredProcedureSimple = async (procedureName, parameters = []) => {
  return await executeStoredProcedure(procedureName, parameters);
};

/**
 * 트랜잭션과 함께 SP 실행
 * @param {string} procedureName - SP 이름
 * @param {Array} inputParams - 입력 파라미터
 * @param {Array} outputParams - 출력 파라미터
 * @returns {Object} 실행 결과
 */
const executeStoredProcedureWithTransaction = async (
  procedureName,
  inputParams = [],
  outputParams = []
) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const request = new sql.Request(transaction);

    // 파라미터 추가
    inputParams.forEach((param) => {
      request.input(param.name, param.type, param.value);
    });

    outputParams.forEach((param) => {
      request.output(param.name, param.type);
    });

    // 기본 출력 파라미터
    request.output("ResultCode", sql.Int);
    request.output("Message", sql.NVarChar(500));

    const result = await request.execute(procedureName);

    // SP에서 오류 반환 시 롤백
    if (result.output.ResultCode !== 0) {
      await transaction.rollback();
      return {
        ResultCode: result.output.ResultCode,
        Message: result.output.Message,
        data: null,
      };
    }

    await transaction.commit();

    return {
      ResultCode: result.output.ResultCode,
      Message: result.output.Message,
      data: result.recordsets[0] || [],
      recordsets: result.recordsets,
      output: result.output,
    };
  } catch (error) {
    await transaction.rollback();
    console.error(`❌ 트랜잭션 SP 실행 오류 [${procedureName}]:`, error);
    throw error;
  }
};

/**
 * 여러 SP를 트랜잭션으로 실행
 * @param {Array} procedures - SP 배열 [{name, inputParams, outputParams}]
 * @returns {Object} 실행 결과
 */
const executeMultipleStoredProcedures = async (procedures) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const results = [];

    for (const proc of procedures) {
      const request = new sql.Request(transaction);

      // 파라미터 추가
      proc.inputParams?.forEach((param) => {
        request.input(param.name, param.type, param.value);
      });

      proc.outputParams?.forEach((param) => {
        request.output(param.name, param.type);
      });

      request.output("ResultCode", sql.Int);
      request.output("Message", sql.NVarChar(500));

      const result = await request.execute(proc.name);

      // 실패 시 전체 롤백
      if (result.output.ResultCode !== 0) {
        await transaction.rollback();
        return {
          ResultCode: result.output.ResultCode,
          Message: `${proc.name}: ${result.output.Message}`,
          data: null,
        };
      }

      results.push({
        procedure: proc.name,
        result: result,
      });
    }

    await transaction.commit();

    return {
      ResultCode: 0,
      Message: "모든 프로시저가 성공적으로 실행되었습니다.",
      data: results,
    };
  } catch (error) {
    await transaction.rollback();
    console.error("❌ 다중 SP 실행 오류:", error);
    throw error;
  }
};

module.exports = {
  executeStoredProcedure,
  executeStoredProcedureSimple,
  executeStoredProcedureWithTransaction,
  executeMultipleStoredProcedures,
  sql, // SQL 타입 export
};
```

### 타입 정의 헬퍼

```javascript
/**
 * SQL Server 데이터 타입 헬퍼
 * @description 자주 사용하는 SQL 타입들을 쉽게 사용하기 위한 헬퍼
 */
const { sql } = require("../../config/database");

const SqlTypes = {
  // 문자열 타입
  VarChar: (length = 255) => sql.VarChar(length),
  NVarChar: (length = 255) => sql.NVarChar(length),
  Text: sql.Text,
  NText: sql.NText,

  // 숫자 타입
  Int: sql.Int,
  BigInt: sql.BigInt,
  SmallInt: sql.SmallInt,
  TinyInt: sql.TinyInt,
  Decimal: (precision = 18, scale = 2) => sql.Decimal(precision, scale),
  Float: sql.Float,
  Real: sql.Real,

  // 날짜/시간 타입
  DateTime: sql.DateTime,
  DateTime2: sql.DateTime2,
  Date: sql.Date,
  Time: sql.Time,

  // 논리 타입
  Bit: sql.Bit,

  // 이진 타입
  VarBinary: (length) => sql.VarBinary(length),
  Binary: (length) => sql.Binary(length),

  // GUID 타입
  UniqueIdentifier: sql.UniqueIdentifier,
};

module.exports = SqlTypes;
```

## 트랜잭션 처리

### 트랜잭션 매니저

```javascript
/**
 * 트랜잭션 매니저
 * @description 복잡한 트랜잭션 처리를 위한 헬퍼
 */
const { getPool, sql } = require("../../config/database");

class TransactionManager {
  constructor() {
    this.transaction = null;
    this.pool = null;
  }

  /**
   * 트랜잭션 시작
   * @param {string} isolationLevel - 격리 수준
   */
  async begin(isolationLevel = sql.ISOLATION_LEVEL.READ_COMMITTED) {
    try {
      this.pool = getPool();
      this.transaction = new sql.Transaction(this.pool);
      this.transaction.isolationLevel = isolationLevel;
      await this.transaction.begin();
      console.log("🔄 트랜잭션이 시작되었습니다.");
    } catch (error) {
      console.error("❌ 트랜잭션 시작 오류:", error);
      throw error;
    }
  }

  /**
   * 트랜잭션 커밋
   */
  async commit() {
    try {
      if (this.transaction) {
        await this.transaction.commit();
        console.log("✅ 트랜잭션이 커밋되었습니다.");
      }
    } catch (error) {
      console.error("❌ 트랜잭션 커밋 오류:", error);
      throw error;
    } finally {
      this.transaction = null;
    }
  }

  /**
   * 트랜잭션 롤백
   */
  async rollback() {
    try {
      if (this.transaction) {
        await this.transaction.rollback();
        console.log("🔄 트랜잭션이 롤백되었습니다.");
      }
    } catch (error) {
      console.error("❌ 트랜잭션 롤백 오류:", error);
    } finally {
      this.transaction = null;
    }
  }

  /**
   * 요청 객체 생성
   * @returns {sql.Request} 요청 객체
   */
  request() {
    if (!this.transaction) {
      throw new Error("트랜잭션이 시작되지 않았습니다.");
    }
    return new sql.Request(this.transaction);
  }

  /**
   * SP 실행 (트랜잭션 내에서)
   * @param {string} procedureName - SP 이름
   * @param {Array} inputParams - 입력 파라미터
   * @returns {Object} 실행 결과
   */
  async executeStoredProcedure(procedureName, inputParams = []) {
    const request = this.request();

    // 파라미터 추가
    inputParams.forEach((param) => {
      request.input(param.name, param.type, param.value);
    });

    // 출력 파라미터
    request.output("ResultCode", sql.Int);
    request.output("Message", sql.NVarChar(500));

    const result = await request.execute(procedureName);

    return {
      ResultCode: result.output.ResultCode,
      Message: result.output.Message,
      data: result.recordsets[0] || [],
    };
  }
}

module.exports = TransactionManager;
```

## 에러 처리

### DB 에러 코드 정의

```javascript
/**
 * 데이터베이스 에러 코드 정의
 */
const DB_ERROR_CODES = {
  // 성공
  SUCCESS: 0,

  // 일반 오류
  GENERAL_ERROR: -1,

  // 권한 오류
  ACCESS_DENIED: -2,
  INVALID_USER: -21,
  INSUFFICIENT_PERMISSION: -22,

  // 데이터 오류
  DATA_NOT_FOUND: -3,
  DUPLICATE_DATA: -31,
  INVALID_DATA: -32,
  DATA_CONFLICT: -33,

  // 비즈니스 로직 오류
  BUSINESS_RULE_VIOLATION: -4,
  INVALID_STATE: -41,
  OPERATION_NOT_ALLOWED: -42,

  // 시스템 오류
  SYSTEM_ERROR: -5,
  DATABASE_ERROR: -51,
  TRANSACTION_ERROR: -52,
};

/**
 * 에러 코드를 HTTP 상태 코드로 변환
 * @param {number} errorCode - DB 에러 코드
 * @returns {number} HTTP 상태 코드
 */
const getHttpStatusFromErrorCode = (errorCode) => {
  switch (errorCode) {
    case DB_ERROR_CODES.SUCCESS:
      return 200;
    case DB_ERROR_CODES.ACCESS_DENIED:
    case DB_ERROR_CODES.INVALID_USER:
    case DB_ERROR_CODES.INSUFFICIENT_PERMISSION:
      return 403;
    case DB_ERROR_CODES.DATA_NOT_FOUND:
      return 404;
    case DB_ERROR_CODES.DUPLICATE_DATA:
    case DB_ERROR_CODES.DATA_CONFLICT:
      return 409;
    case DB_ERROR_CODES.INVALID_DATA:
    case DB_ERROR_CODES.BUSINESS_RULE_VIOLATION:
    case DB_ERROR_CODES.INVALID_STATE:
    case DB_ERROR_CODES.OPERATION_NOT_ALLOWED:
      return 400;
    default:
      return 500;
  }
};

module.exports = {
  DB_ERROR_CODES,
  getHttpStatusFromErrorCode,
};
```

## 성능 최적화

### 연결 풀 모니터링

```javascript
/**
 * 데이터베이스 성능 모니터링
 */
const monitorDatabasePerformance = () => {
  const pool = getPool();

  if (pool) {
    const stats = {
      totalConnections: pool.size,
      availableConnections: pool.available,
      pendingAcquires: pool.pending,
      totalAcquires: pool.totalacquires,
      totalCreates: pool.totalcreates,
      totalDestroys: pool.totaldestroys,
      totalTimeouts: pool.totaltimeouts,
    };

    console.log("📊 DB 연결 풀 상태:", stats);

    // 경고 임계값 체크
    if (pool.available < 2) {
      console.warn("⚠️ 사용 가능한 DB 연결이 부족합니다.");
    }

    return stats;
  }

  return null;
};

// 주기적 모니터링 (5분마다)
setInterval(monitorDatabasePerformance, 5 * 60 * 1000);
```

### 쿼리 성능 로깅

```javascript
/**
 * SP 실행 시간 측정 및 로깅
 * @param {string} procedureName - SP 이름
 * @param {Function} executeFunction - 실행 함수
 * @returns {Object} 실행 결과
 */
const executeWithPerformanceLogging = async (
  procedureName,
  executeFunction
) => {
  const startTime = process.hrtime.bigint();

  try {
    const result = await executeFunction();

    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000; // 밀리초로 변환

    // 성능 로깅
    if (executionTime > 1000) {
      // 1초 이상
      console.warn(
        `⚠️ 느린 쿼리 감지 [${procedureName}]: ${executionTime.toFixed(2)}ms`
      );
    } else if (executionTime > 500) {
      // 500ms 이상
      console.info(
        `📊 쿼리 실행 시간 [${procedureName}]: ${executionTime.toFixed(2)}ms`
      );
    }

    return result;
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;

    console.error(
      `❌ 쿼리 실행 실패 [${procedureName}]: ${executionTime.toFixed(2)}ms`,
      error
    );
    throw error;
  }
};
```

### 캐싱 전략

```javascript
/**
 * 간단한 메모리 캐시
 * @description 자주 조회되는 데이터를 메모리에 캐싱
 */
class SimpleCache {
  constructor(defaultTtl = 5 * 60 * 1000) {
    // 기본 5분
    this.cache = new Map();
    this.defaultTtl = defaultTtl;
  }

  /**
   * 캐시에 데이터 저장
   * @param {string} key - 캐시 키
   * @param {any} value - 캐시 값
   * @param {number} ttl - TTL (밀리초)
   */
  set(key, value, ttl = this.defaultTtl) {
    const expireAt = Date.now() + ttl;
    this.cache.set(key, { value, expireAt });
  }

  /**
   * 캐시에서 데이터 조회
   * @param {string} key - 캐시 키
   * @returns {any} 캐시된 값 또는 null
   */
  get(key) {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    if (Date.now() > cached.expireAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * 캐시에서 데이터 삭제
   * @param {string} key - 캐시 키
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 만료된 캐시 정리
   */
  cleanup() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expireAt) {
        this.cache.delete(key);
      }
    }
  }
}

// 전역 캐시 인스턴스
const globalCache = new SimpleCache();

// 주기적 정리 (1분마다)
setInterval(() => globalCache.cleanup(), 60 * 1000);

module.exports = { SimpleCache, globalCache };
```

## 사용 예시

### API에서의 사용

```javascript
const { executeStoredProcedure, sql } = require("../database/dbHelper");
const SqlTypes = require("../database/sqlTypes");

// 사용 예시
const createEmployee = async (employeeData, userId) => {
  const inputParams = [
    {
      name: "EmployeeCode",
      type: SqlTypes.NVarChar(20),
      value: employeeData.employeeCode,
    },
    {
      name: "FirstName",
      type: SqlTypes.NVarChar(50),
      value: employeeData.firstName,
    },
    {
      name: "LastName",
      type: SqlTypes.NVarChar(50),
      value: employeeData.lastName,
    },
    { name: "Email", type: SqlTypes.NVarChar(100), value: employeeData.email },
    {
      name: "DepartmentId",
      type: SqlTypes.Int,
      value: employeeData.departmentId,
    },
    { name: "UserId", type: SqlTypes.Int, value: userId },
  ];

  const result = await executeStoredProcedure("SP_CreateEmployee", inputParams);

  return result;
};
```

## 데이터베이스 마이그레이션

### 스키마 버전 관리

```sql
-- 데이터베이스 버전 관리 테이블
CREATE TABLE DatabaseVersions (
    VersionId INT IDENTITY(1,1) PRIMARY KEY,
    Version NVARCHAR(20) NOT NULL,
    Description NVARCHAR(500),
    AppliedAt DATETIME2 DEFAULT GETDATE(),
    AppliedBy NVARCHAR(100)
);

-- 초기 버전 기록
INSERT INTO DatabaseVersions (Version, Description, AppliedBy)
VALUES ('1.0.0', '초기 스키마 생성', 'System');
```

### 마이그레이션 스크립트 템플릿

```sql
-- =============================================
-- 마이그레이션: v1.0.1
-- 설명: 직원 테이블에 전화번호 필드 추가
-- 작성일: 2024-09-XX
-- =============================================

BEGIN TRANSACTION;

BEGIN TRY
    -- 변경사항 적용
    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_NAME = 'Employees' AND COLUMN_NAME = 'PhoneNumber')
    BEGIN
        ALTER TABLE Employees
        ADD PhoneNumber NVARCHAR(20) NULL;

        PRINT '✅ Employees 테이블에 PhoneNumber 컬럼이 추가되었습니다.';
    END

    -- 버전 기록
    INSERT INTO DatabaseVersions (Version, Description, AppliedBy)
    VALUES ('1.0.1', '직원 테이블에 전화번호 필드 추가', 'Migration Script');

    COMMIT TRANSACTION;
    PRINT '✅ 마이그레이션 v1.0.1이 완료되었습니다.';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '❌ 마이그레이션 v1.0.1이 실패했습니다: ' + ERROR_MESSAGE();
    THROW;
END CATCH
```
