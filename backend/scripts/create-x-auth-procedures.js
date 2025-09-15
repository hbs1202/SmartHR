/**
 * x_ 인증 관련 Stored Procedures 생성 스크립트
 * SP_AuthLogin, SP_ChangePassword, SP_GetEmployeeById를 x_ 접두사로 변경하여 생성
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

const createXAuthProcedures = async () => {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 1. x_AuthLogin 생성
    console.log('\n📋 x_AuthLogin SP 생성 중...');
    const xAuthLoginSQL = `
-- =============================================
-- x_AuthLogin - 로그인 인증 SP (x_ 네이밍 적용)
-- =============================================
CREATE OR ALTER PROCEDURE x_AuthLogin
    @Email NVARCHAR(255),           -- 이메일 주소
    @Password NVARCHAR(255),        -- 입력된 비밀번호 (평문)
    @ResultCode INT OUTPUT,         -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT   -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    -- 변수 선언
    DECLARE @EmployeeId INT = 0;
    DECLARE @StoredPassword NVARCHAR(255) = '';
    DECLARE @EmployeeCode NVARCHAR(20) = '';
    DECLARE @UserRole NVARCHAR(50) = '';
    DECLARE @FullName NVARCHAR(100) = '';
    DECLARE @IsActive BIT = 0;
    DECLARE @LoginFailCount INT = 0;
    DECLARE @AccountLocked BIT = 0;
    DECLARE @DeptId INT = 0;
    DECLARE @CompanyId INT = 0;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @Email IS NULL OR LTRIM(RTRIM(@Email)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이메일 주소를 입력해주세요.';
            RETURN;
        END

        IF @Password IS NULL OR LTRIM(RTRIM(@Password)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '비밀번호를 입력해주세요.';
            RETURN;
        END

        -- 2. 사용자 정보 조회
        SELECT 
            @EmployeeId = EmployeeId,
            @StoredPassword = Password,
            @EmployeeCode = EmployeeCode,
            @UserRole = UserRole,
            @FullName = FullName,
            @IsActive = IsActive,
            @LoginFailCount = LoginFailCount,
            @AccountLocked = AccountLocked,
            @DeptId = DeptId,
            @CompanyId = CompanyId
        FROM uEmployeeTb 
        WHERE Email = @Email;

        -- 3. 사용자 존재 여부 확인
        IF @EmployeeId = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '등록되지 않은 이메일 주소입니다.';
            RETURN;
        END

        -- 4. 계정 잠금 상태 확인
        IF @AccountLocked = 1
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '계정이 잠금 상태입니다. 관리자에게 문의하세요.';
            RETURN;
        END

        -- 5. 계정 활성 상태 확인
        IF @IsActive = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '비활성화된 계정입니다. 관리자에게 문의하세요.';
            RETURN;
        END

        -- 6. 로그인 실패 횟수 확인 (5회 이상 시 계정 잠금)
        IF @LoginFailCount >= 5
        BEGIN
            -- 계정 잠금 처리
            UPDATE uEmployeeTb 
            SET AccountLocked = 1, 
                UpdatedAt = GETDATE()
            WHERE EmployeeId = @EmployeeId;

            SET @ResultCode = -1;
            SET @Message = '로그인 실패 횟수 초과로 계정이 잠금되었습니다.';
            RETURN;
        END

        -- 7. 로그인 성공 시 정보 업데이트
        UPDATE uEmployeeTb 
        SET LastLoginAt = GETDATE(),
            LoginFailCount = 0,
            UpdatedAt = GETDATE()
        WHERE EmployeeId = @EmployeeId;

        -- 8. 성공 결과 반환
        SELECT 
            @EmployeeId AS EmployeeId,
            @EmployeeCode AS EmployeeCode,
            @Email AS Email,
            @FullName AS FullName,
            @UserRole AS UserRole,
            @DeptId AS DeptId,
            @CompanyId AS CompanyId,
            @StoredPassword AS HashedPassword, -- bcrypt 검증용
            GETDATE() AS LastLoginAt;

        SET @ResultCode = 0;
        SET @Message = '로그인 정보 조회 성공';

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '로그인 처리 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

    END CATCH
END
`;

    await sql.query(xAuthLoginSQL);
    console.log('✅ x_AuthLogin SP 생성 완료');

    // 2. x_ChangePassword 생성
    console.log('\n📋 x_ChangePassword SP 생성 중...');
    const xChangePasswordSQL = `
-- =============================================
-- x_ChangePassword - 비밀번호 변경 SP (x_ 네이밍 적용)
-- =============================================
CREATE OR ALTER PROCEDURE x_ChangePassword
    @EmployeeId INT,                -- 직원 ID
    @CurrentPassword NVARCHAR(255), -- 현재 비밀번호 (평문)
    @NewPassword NVARCHAR(255),     -- 새 비밀번호 (해시된 값)
    @ResultCode INT OUTPUT,         -- 결과 코드
    @Message NVARCHAR(500) OUTPUT   -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    -- 변수 선언
    DECLARE @StoredPassword NVARCHAR(255) = '';
    DECLARE @IsActive BIT = 0;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않은 직원 ID입니다.';
            RETURN;
        END

        IF @CurrentPassword IS NULL OR LTRIM(RTRIM(@CurrentPassword)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '현재 비밀번호를 입력해주세요.';
            RETURN;
        END

        IF @NewPassword IS NULL OR LTRIM(RTRIM(@NewPassword)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '새 비밀번호를 입력해주세요.';
            RETURN;
        END

        -- 2. 직원 정보 조회
        SELECT 
            @StoredPassword = Password,
            @IsActive = IsActive
        FROM uEmployeeTb 
        WHERE EmployeeId = @EmployeeId;

        -- 3. 직원 존재 여부 확인
        IF @StoredPassword = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 직원입니다.';
            RETURN;
        END

        -- 4. 계정 활성 상태 확인
        IF @IsActive = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '비활성화된 계정입니다.';
            RETURN;
        END

        -- 5. 현재 비밀번호 검증 (애플리케이션 레벨에서 수행)
        -- 현재 비밀번호 반환하여 API에서 bcrypt.compare() 수행
        SELECT @StoredPassword AS CurrentHashedPassword;

        -- 6. 새 비밀번호로 업데이트
        UPDATE uEmployeeTb 
        SET Password = @NewPassword,
            PasswordChangedAt = GETDATE(),
            UpdatedAt = GETDATE()
        WHERE EmployeeId = @EmployeeId;

        -- 7. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '비밀번호가 성공적으로 변경되었습니다.';

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '비밀번호 변경 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

    END CATCH
END
`;

    await sql.query(xChangePasswordSQL);
    console.log('✅ x_ChangePassword SP 생성 완료');

    // 3. x_GetEmployeeById 생성
    console.log('\n📋 x_GetEmployeeById SP 생성 중...');
    const xGetEmployeeByIdSQL = `
-- =============================================
-- x_GetEmployeeById - 직원 상세 조회 SP (x_ 네이밍 적용)
-- =============================================
CREATE OR ALTER PROCEDURE x_GetEmployeeById
    @EmployeeId INT,                -- 직원 ID
    @ResultCode INT OUTPUT,         -- 결과 코드
    @Message NVARCHAR(500) OUTPUT   -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않은 직원 ID입니다.';
            RETURN;
        END

        -- 2. 직원 상세 정보 조회
        SELECT 
            EmployeeId,
            EmployeeCode,
            Email,
            FirstName,
            LastName,
            FullName,
            NameEng,
            Gender,
            BirthDate,
            PhoneNumber,
            HireDate,
            EmploymentType,
            CurrentSalary,
            UserRole,
            IsActive,
            LastLoginAt,
            CompanyId,
            SubCompanyId,
            DeptId,
            PosId,
            CreatedAt,
            UpdatedAt
        FROM uEmployeeTb 
        WHERE EmployeeId = @EmployeeId;

        -- 3. 직원 존재 여부 확인
        IF @@ROWCOUNT = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 직원입니다.';
            RETURN;
        END

        -- 4. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '직원 정보 조회 성공';

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '직원 정보 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

    END CATCH
END
`;

    await sql.query(xGetEmployeeByIdSQL);
    console.log('✅ x_GetEmployeeById SP 생성 완료');

    // 4. 생성된 SP 확인
    console.log('\n📋 생성된 x_ 인증 관련 SP 확인...');
    const checkQuery = `
        SELECT name 
        FROM sys.objects 
        WHERE type = 'P' 
        AND name IN ('x_AuthLogin', 'x_ChangePassword', 'x_GetEmployeeById')
        ORDER BY name
    `;
    
    const result = await sql.query(checkQuery);
    
    console.log('\n✅ 생성된 x_ 인증 SP 목록:');
    result.recordset.forEach(sp => {
        console.log(`  - ${sp.name}`);
    });

    console.log('\n🎉 모든 x_ 인증 관련 SP 생성 완료!');

  } catch (error) {
    console.error('❌ x_ 인증 SP 생성 실패:', error.message);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
};

createXAuthProcedures().catch(console.error);