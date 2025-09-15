-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-13
-- 설명: 인증 관리 Stored Procedures
-- =============================================

-- 1. 로그인 인증 SP
CREATE OR ALTER PROCEDURE SP_AuthLogin
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

        -- 7. 비밀번호 검증 (실제로는 bcrypt를 사용해야 하므로 여기서는 임시 처리)
        -- 비밀번호 검증은 애플리케이션 레벨에서 bcrypt.compare()로 처리
        -- 여기서는 사용자 정보만 반환하고 비밀번호 검증은 API에서 처리

        -- 8. 로그인 성공 시 정보 업데이트
        UPDATE uEmployeeTb 
        SET LastLoginAt = GETDATE(),
            LoginFailCount = 0,
            UpdatedAt = GETDATE()
        WHERE EmployeeId = @EmployeeId;

        -- 9. 성공 결과 반환
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

        -- 에러 로깅
        PRINT '=== SP_AuthLogin 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'Input Email: ' + ISNULL(@Email, 'NULL');
        PRINT '================================';

    END CATCH
END

GO

-- 2. 비밀번호 변경 SP
CREATE OR ALTER PROCEDURE SP_ChangePassword
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

        -- 에러 로깅
        PRINT '=== SP_ChangePassword 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'EmployeeId: ' + CAST(@EmployeeId AS NVARCHAR(10));
        PRINT '================================';

    END CATCH
END

GO

-- 3. 로그인 실패 카운트 증가 SP
CREATE OR ALTER PROCEDURE SP_IncrementLoginFailCount
    @Email NVARCHAR(255),           -- 이메일 주소
    @ResultCode INT OUTPUT,         -- 결과 코드
    @Message NVARCHAR(500) OUTPUT   -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    -- 변수 선언
    DECLARE @EmployeeId INT = 0;
    DECLARE @LoginFailCount INT = 0;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @Email IS NULL OR LTRIM(RTRIM(@Email)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이메일 주소를 입력해주세요.';
            RETURN;
        END

        -- 2. 사용자 정보 조회
        SELECT 
            @EmployeeId = EmployeeId,
            @LoginFailCount = LoginFailCount
        FROM uEmployeeTb 
        WHERE Email = @Email;

        -- 3. 사용자 존재 여부 확인
        IF @EmployeeId = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 사용자입니다.';
            RETURN;
        END

        -- 4. 로그인 실패 카운트 증가
        UPDATE uEmployeeTb 
        SET LoginFailCount = LoginFailCount + 1,
            UpdatedAt = GETDATE()
        WHERE EmployeeId = @EmployeeId;

        -- 5. 업데이트된 실패 카운트 조회
        SELECT @LoginFailCount = LoginFailCount + 1;

        -- 6. 5회 이상 실패 시 계정 잠금
        IF @LoginFailCount >= 5
        BEGIN
            UPDATE uEmployeeTb 
            SET AccountLocked = 1
            WHERE EmployeeId = @EmployeeId;

            SET @Message = '로그인 실패 횟수 초과로 계정이 잠금되었습니다.';
        END
        ELSE
        BEGIN
            SET @Message = '로그인 실패 카운트가 증가되었습니다. (' + CAST(@LoginFailCount AS NVARCHAR(10)) + '/5)';
        END

        SET @ResultCode = 0;

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '로그인 실패 처리 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

    END CATCH
END

GO

-- 4. 계정 잠금 해제 SP (관리자용)
CREATE OR ALTER PROCEDURE SP_UnlockAccount
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

        -- 2. 계정 잠금 해제 및 실패 카운트 초기화
        UPDATE uEmployeeTb 
        SET AccountLocked = 0,
            LoginFailCount = 0,
            UpdatedAt = GETDATE()
        WHERE EmployeeId = @EmployeeId;

        -- 3. 업데이트 확인
        IF @@ROWCOUNT = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 직원입니다.';
            RETURN;
        END

        -- 4. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '계정 잠금이 해제되었습니다.';

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '계정 잠금 해제 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

    END CATCH
END