/**
 * SP_DeleteEmployee 생성 스크립트
 */

const sql = require('mssql');
require('dotenv').config();

// 데이터베이스 연결 설정
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

async function createSP() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 기존 SP 삭제
    console.log('🔄 기존 SP_DeleteEmployee 삭제 중...');
    await sql.query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('SP_DeleteEmployee'))
      DROP PROCEDURE SP_DeleteEmployee
    `);

    // SP_DeleteEmployee 생성
    console.log('🔄 SP_DeleteEmployee 생성 중...');
    const createSPQuery = `
CREATE PROCEDURE SP_DeleteEmployee
    @EmployeeId INT,                    -- 삭제할 직원 ID
    @DeletedBy INT,                     -- 삭제자 ID
    @DeleteReason NVARCHAR(500) = NULL, -- 삭제 사유 (선택적)
    @ResultCode INT OUTPUT,             -- 결과 코드
    @Message NVARCHAR(500) OUTPUT       -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ExistingCount INT = 0;
    DECLARE @DeleteCount INT = 0;
    DECLARE @EmployeeCode NVARCHAR(20) = '';
    DECLARE @FullName NVARCHAR(100) = '';
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'유효하지 않은 직원 ID입니다.';
            RETURN;
        END
        
        IF @DeletedBy IS NULL OR @DeletedBy <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'삭제자 정보가 필요합니다.';
            RETURN;
        END

        -- 2. 자기 자신 삭제 방지
        IF @EmployeeId = @DeletedBy
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'본인 계정은 삭제할 수 없습니다.';
            RETURN;
        END

        -- 3. 직원 존재 여부 및 활성 상태 확인
        SELECT 
            @ExistingCount = COUNT(*),
            @EmployeeCode = MAX(EmployeeCode),
            @FullName = MAX(FullName)
        FROM uEmployeeTb 
        WHERE EmployeeId = @EmployeeId AND IsActive = 1;

        IF @ExistingCount = 0
        BEGIN
            -- 이미 삭제되었는지 확인
            SELECT @ExistingCount = COUNT(*)
            FROM uEmployeeTb 
            WHERE EmployeeId = @EmployeeId AND IsActive = 0;
            
            IF @ExistingCount > 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = N'이미 삭제된 직원입니다.';
            END
            ELSE
            BEGIN
                SET @ResultCode = -1;
                SET @Message = N'존재하지 않는 직원입니다.';
            END
            RETURN;
        END

        -- 4. 소프트 삭제 실행
        UPDATE uEmployeeTb 
        SET 
            IsActive = 0,
            RetireDate = GETDATE(),
            UpdatedAt = GETDATE(),
            UpdatedBy = @DeletedBy
        WHERE EmployeeId = @EmployeeId AND IsActive = 1;

        SET @DeleteCount = @@ROWCOUNT;

        IF @DeleteCount > 0
        BEGIN
            -- 5. 성공 처리
            SET @ResultCode = 0;
            SET @Message = N'직원이 성공적으로 삭제되었습니다.';
            
            -- 삭제된 직원 정보 반환
            SELECT 
                EmployeeId,
                EmployeeCode,
                FullName,
                Email,
                IsActive,
                RetireDate,
                UpdatedAt,
                UpdatedBy
            FROM uEmployeeTb 
            WHERE EmployeeId = @EmployeeId;
        END
        ELSE
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'직원 삭제에 실패했습니다.';
        END

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'직원 삭제 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        -- 에러 로깅 (개발/디버깅용)
        PRINT '=== SP_DeleteEmployee 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'EmployeeId: ' + CAST(@EmployeeId AS NVARCHAR(10));
        PRINT 'DeletedBy: ' + CAST(@DeletedBy AS NVARCHAR(10));
        PRINT '===================================';
        
    END CATCH
END`;

    await sql.query(createSPQuery);
    console.log('✅ SP_DeleteEmployee 생성 완료');

    // SP 존재 확인
    const checkResult = await sql.query(`
      SELECT name, create_date
      FROM sys.objects 
      WHERE type = 'P' AND name = 'SP_DeleteEmployee'
    `);
    
    console.log('✅ SP 생성 확인:', checkResult.recordset[0]);

    // 간단한 테스트 (실제로는 삭제하지 않고 검증만)
    console.log('🔄 SP_DeleteEmployee 검증 테스트...');
    const request = new sql.Request();
    
    // 존재하지 않는 직원 ID로 테스트 (오류 처리 확인)
    request.input('EmployeeId', sql.Int, 999);
    request.input('DeletedBy', sql.Int, 1);
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    const testResult = await request.execute('SP_DeleteEmployee');
    
    console.log('✅ 테스트 결과 (존재하지 않는 직원):');
    console.log(`   ResultCode: ${testResult.output.ResultCode}`);
    console.log(`   Message: ${testResult.output.Message}`);

    console.log('🎉 SP_DeleteEmployee 생성 및 테스트 완료!');

  } catch (error) {
    console.error('❌ SP 생성 실패:', error.message);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

createSP().catch(console.error);