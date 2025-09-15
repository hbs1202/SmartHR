/**
 * SP_UpdateEmployee 생성 스크립트
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
    console.log('🔄 기존 SP_UpdateEmployee 삭제 중...');
    await sql.query(`
      IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('SP_UpdateEmployee'))
      DROP PROCEDURE SP_UpdateEmployee
    `);

    // SP_UpdateEmployee 생성
    console.log('🔄 SP_UpdateEmployee 생성 중...');
    const createSPQuery = `
CREATE PROCEDURE SP_UpdateEmployee
    @EmployeeId INT,
    @FirstName NVARCHAR(50) = NULL,
    @LastName NVARCHAR(50) = NULL,
    @NameEng NVARCHAR(100) = NULL,
    @Gender NCHAR(1) = NULL,
    @BirthDate DATE = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @EmploymentType NVARCHAR(50) = NULL,
    @CurrentSalary DECIMAL(15,2) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @UpdatedBy INT,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ExistingCount INT = 0;
    DECLARE @UpdateCount INT = 0;
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'유효하지 않은 직원 ID입니다.';
            RETURN;
        END
        
        IF @UpdatedBy IS NULL OR @UpdatedBy <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'수정자 정보가 필요합니다.';
            RETURN;
        END

        -- 2. 직원 존재 여부 확인
        SELECT @ExistingCount = COUNT(*)
        FROM uEmployeeTb 
        WHERE EmployeeId = @EmployeeId AND IsActive = 1;

        IF @ExistingCount = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않는 직원이거나 비활성화된 직원입니다.';
            RETURN;
        END

        -- 3. 수정할 데이터가 있는지 확인
        IF @FirstName IS NULL AND @LastName IS NULL AND @NameEng IS NULL 
           AND @Gender IS NULL AND @BirthDate IS NULL AND @PhoneNumber IS NULL
           AND @EmploymentType IS NULL AND @CurrentSalary IS NULL AND @UserRole IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'수정할 정보가 없습니다.';
            RETURN;
        END

        -- 4. 간단한 UPDATE 실행 (FullName은 computed column이므로 제외)
        UPDATE uEmployeeTb 
        SET 
            FirstName = ISNULL(@FirstName, FirstName),
            LastName = ISNULL(@LastName, LastName),
            NameEng = ISNULL(@NameEng, NameEng),
            Gender = ISNULL(@Gender, Gender),
            BirthDate = ISNULL(@BirthDate, BirthDate),
            PhoneNumber = ISNULL(@PhoneNumber, PhoneNumber),
            EmploymentType = ISNULL(@EmploymentType, EmploymentType),
            CurrentSalary = ISNULL(@CurrentSalary, CurrentSalary),
            UserRole = ISNULL(@UserRole, UserRole),
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE EmployeeId = @EmployeeId AND IsActive = 1;

        SET @UpdateCount = @@ROWCOUNT;

        IF @UpdateCount > 0
        BEGIN
            SET @ResultCode = 0;
            SET @Message = N'직원 정보가 성공적으로 수정되었습니다.';
            
            -- 수정된 직원 정보 반환
            SELECT 
                EmployeeId, EmployeeCode, Email, FullName, 
                FirstName, LastName, NameEng, Gender, BirthDate,
                PhoneNumber, EmploymentType, CurrentSalary, UserRole,
                UpdatedAt, UpdatedBy
            FROM uEmployeeTb 
            WHERE EmployeeId = @EmployeeId;
        END
        ELSE
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'직원 정보 수정에 실패했습니다.';
        END

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'직원 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END`;

    await sql.query(createSPQuery);
    console.log('✅ SP_UpdateEmployee 생성 완료');

    // SP 존재 확인
    const checkResult = await sql.query(`
      SELECT name, create_date
      FROM sys.objects 
      WHERE type = 'P' AND name = 'SP_UpdateEmployee'
    `);
    
    console.log('✅ SP 생성 확인:', checkResult.recordset[0]);

    // 간단한 테스트
    console.log('🔄 SP_UpdateEmployee 테스트...');
    const request = new sql.Request();
    
    request.input('EmployeeId', sql.Int, 5);
    request.input('PhoneNumber', sql.NVarChar(20), '010-8888-9999');
    request.input('UpdatedBy', sql.Int, 1);
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    const testResult = await request.execute('SP_UpdateEmployee');
    
    console.log('✅ 테스트 결과:');
    console.log(`   ResultCode: ${testResult.output.ResultCode}`);
    console.log(`   Message: ${testResult.output.Message}`);

    console.log('🎉 SP_UpdateEmployee 생성 및 테스트 완료!');

  } catch (error) {
    console.error('❌ SP 생성 실패:', error.message);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

createSP().catch(console.error);