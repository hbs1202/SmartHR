-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-13
-- 설명: 직원 관리 Stored Procedures
-- 수정이력: 
-- =============================================

USE hr_system;
GO

-- =============================================
-- 1. 직원 등록 SP
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_CreateEmployee'))
BEGIN
    DROP PROCEDURE x_CreateEmployee;
END
GO

CREATE PROCEDURE x_CreateEmployee
    @CompanyId INT,
    @SubCompanyId INT,
    @DeptId INT,
    @PosId INT,
    @EmployeeCode NVARCHAR(20),
    @Password NVARCHAR(255),           -- bcrypt 해시된 비밀번호
    @Email NVARCHAR(255),
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @NameEng NVARCHAR(100) = NULL,
    @Gender NCHAR(1) = NULL,
    @BirthDate DATE = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @HireDate DATE,
    @EmploymentType NVARCHAR(50) = N'정규직',
    @CurrentSalary DECIMAL(15,2) = NULL,
    @UserRole NVARCHAR(50) = 'employee',
    @CreatedBy INT,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 변수 선언
    DECLARE @NewEmployeeId INT = 0;
    DECLARE @ExistingCount INT = 0;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'회사 ID가 유효하지 않습니다.';
            RETURN;
        END

        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'사업장 ID가 유효하지 않습니다.';
            RETURN;
        END

        IF @DeptId IS NULL OR @DeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'부서 ID가 유효하지 않습니다.';
            RETURN;
        END

        IF @PosId IS NULL OR @PosId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'직책 ID가 유효하지 않습니다.';
            RETURN;
        END

        IF @EmployeeCode IS NULL OR LTRIM(RTRIM(@EmployeeCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'사번이 필수입니다.';
            RETURN;
        END

        IF @Password IS NULL OR LTRIM(RTRIM(@Password)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'비밀번호가 필수입니다.';
            RETURN;
        END

        IF @Email IS NULL OR LTRIM(RTRIM(@Email)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이메일이 필수입니다.';
            RETURN;
        END

        IF @FirstName IS NULL OR LTRIM(RTRIM(@FirstName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이름이 필수입니다.';
            RETURN;
        END

        IF @LastName IS NULL OR LTRIM(RTRIM(@LastName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'성이 필수입니다.';
            RETURN;
        END

        IF @HireDate IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'입사일이 필수입니다.';
            RETURN;
        END

        -- 2. 조직도 유효성 검증
        IF NOT EXISTS (SELECT 1 FROM uCompanyTb WHERE CompanyId = @CompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 회사입니다.';
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId AND CompanyId = @CompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 사업장입니다.';
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @DeptId AND SubCompanyId = @SubCompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 부서입니다.';
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM uPositionTb WHERE PosId = @PosId AND DeptId = @DeptId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 직책입니다.';
            RETURN;
        END

        -- 3. 중복 검증
        SELECT @ExistingCount = COUNT(*)
        FROM uEmployeeTb
        WHERE EmployeeCode = @EmployeeCode AND IsActive = 1;

        IF @ExistingCount > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이미 존재하는 사번입니다.';
            RETURN;
        END

        SELECT @ExistingCount = COUNT(*)
        FROM uEmployeeTb
        WHERE Email = @Email AND IsActive = 1;

        IF @ExistingCount > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이미 존재하는 이메일입니다.';
            RETURN;
        END

        -- 4. 직원 데이터 삽입
        INSERT INTO uEmployeeTb (
            CompanyId, SubCompanyId, DeptId, PosId, EmployeeCode, Password, Email,
            FirstName, LastName, NameEng, Gender, BirthDate, PhoneNumber,
            HireDate, EmploymentType, CurrentSalary, UserRole, 
            IsActive, CreatedAt, CreatedBy, PasswordChangedAt
        )
        VALUES (
            @CompanyId, @SubCompanyId, @DeptId, @PosId, @EmployeeCode, @Password, @Email,
            @FirstName, @LastName, @NameEng, @Gender, @BirthDate, @PhoneNumber,
            @HireDate, @EmploymentType, @CurrentSalary, @UserRole,
            1, GETDATE(), @CreatedBy, GETDATE()
        );

        SET @NewEmployeeId = SCOPE_IDENTITY();

        -- 5. 직책 현재 인원 업데이트
        UPDATE uPositionTb 
        SET CurrentHeadcount = CurrentHeadcount + 1,
            UpdatedAt = GETDATE(),
            UpdatedBy = @CreatedBy
        WHERE PosId = @PosId;

        -- 6. 신규 채용 발령 이력 생성
        INSERT INTO uEmployeeAssignmentTb (
            EmployeeId, NewCompanyId, NewSubCompanyId, NewDeptId, NewPosId,
            AssignmentType, AssignmentReason, EffectiveDate, NewSalary,
            ApprovedBy, ApprovedAt, CreatedBy, CreatedAt
        )
        VALUES (
            @NewEmployeeId, @CompanyId, @SubCompanyId, @DeptId, @PosId,
            N'신규채용', N'신규 직원 채용', @HireDate, @CurrentSalary,
            @CreatedBy, GETDATE(), @CreatedBy, GETDATE()
        );

        -- 7. 결과 반환
        SELECT 
            @NewEmployeeId AS EmployeeId,
            @EmployeeCode AS EmployeeCode,
            @Email AS Email,
            (@LastName + @FirstName) AS FullName,
            @HireDate AS HireDate,
            @UserRole AS UserRole;

        SET @ResultCode = 0;
        SET @Message = N'직원이 성공적으로 등록되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'직원 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        -- 에러 로깅
        PRINT '=== x_CreateEmployee 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'EmployeeCode: ' + ISNULL(@EmployeeCode, 'NULL');
        PRINT 'Email: ' + ISNULL(@Email, 'NULL');
        PRINT '================================';
    END CATCH
END
GO

-- =============================================
-- 2. 직원 목록 조회 SP
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('SP_GetEmployees'))
BEGIN
    DROP PROCEDURE SP_GetEmployees;
END
GO

CREATE PROCEDURE SP_GetEmployees
    @Page INT = 1,
    @PageSize INT = 20,
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @DeptId INT = NULL,
    @PosId INT = NULL,
    @IsActive BIT = NULL,
    @SearchKeyword NVARCHAR(100) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @EmploymentType NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    DECLARE @TotalCount INT = 0;

    -- 전체 개수 조회
    SELECT @TotalCount = COUNT(*)
    FROM uEmployeeDetailView e
    WHERE (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
      AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
      AND (@DeptId IS NULL OR e.DeptId = @DeptId)
      AND (@PosId IS NULL OR e.PosId = @PosId)
      AND (@IsActive IS NULL OR e.EmployeeActive = @IsActive)
      AND (@UserRole IS NULL OR e.UserRole = @UserRole)
      AND (@EmploymentType IS NULL OR e.EmploymentType = @EmploymentType)
      AND (@SearchKeyword IS NULL OR 
           e.FullName LIKE '%' + @SearchKeyword + '%' OR
           e.EmployeeCode LIKE '%' + @SearchKeyword + '%' OR
           e.Email LIKE '%' + @SearchKeyword + '%' OR
           e.DeptName LIKE '%' + @SearchKeyword + '%' OR
           e.PosName LIKE '%' + @SearchKeyword + '%');

    -- 페이지별 데이터 조회
    SELECT 
        e.EmployeeId,
        e.EmployeeCode,
        e.Email,
        e.FullName,
        e.FirstName,
        e.LastName,
        e.Gender,
        e.BirthDate,
        e.PhoneNumber,
        e.HireDate,
        e.EmploymentType,
        e.UserRole,
        e.CurrentSalary,
        e.EmployeeActive,
        e.CompanyName,
        e.SubCompanyName,
        e.DeptName,
        e.PosName,
        e.PosGrade,
        e.OrganizationPath,
        e.EmploymentStatus,
        e.LastLoginAt,
        e.CreatedAt,
        @TotalCount AS TotalCount,
        @Page AS CurrentPage,
        @PageSize AS PageSize,
        CEILING(CAST(@TotalCount AS FLOAT) / @PageSize) AS TotalPages
    FROM uEmployeeDetailView e
    WHERE (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
      AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
      AND (@DeptId IS NULL OR e.DeptId = @DeptId)
      AND (@PosId IS NULL OR e.PosId = @PosId)
      AND (@IsActive IS NULL OR e.EmployeeActive = @IsActive)
      AND (@UserRole IS NULL OR e.UserRole = @UserRole)
      AND (@EmploymentType IS NULL OR e.EmploymentType = @EmploymentType)
      AND (@SearchKeyword IS NULL OR 
           e.FullName LIKE '%' + @SearchKeyword + '%' OR
           e.EmployeeCode LIKE '%' + @SearchKeyword + '%' OR
           e.Email LIKE '%' + @SearchKeyword + '%' OR
           e.DeptName LIKE '%' + @SearchKeyword + '%' OR
           e.PosName LIKE '%' + @SearchKeyword + '%')
    ORDER BY e.CreatedAt DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- =============================================
-- 3. 직원 상세 조회 SP
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('SP_GetEmployeeById'))
BEGIN
    DROP PROCEDURE SP_GetEmployeeById;
END
GO

CREATE PROCEDURE SP_GetEmployeeById
    @EmployeeId INT,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'유효하지 않은 직원 ID입니다.';
            RETURN;
        END

        -- 직원 정보 조회
        IF EXISTS (SELECT 1 FROM uEmployeeTb WHERE EmployeeId = @EmployeeId)
        BEGIN
            SELECT 
                e.EmployeeId,
                e.EmployeeCode,
                e.Email,
                e.FullName,
                e.FirstName,
                e.LastName,
                e.NameEng,
                e.Gender,
                e.BirthDate,
                e.PhoneNumber,
                e.HireDate,
                e.EmploymentType,
                e.UserRole,
                e.CurrentSalary,
                e.EmployeeActive,
                e.CompanyId,
                e.CompanyName,
                e.CompanyCode,
                e.SubCompanyId,
                e.SubCompanyName,
                e.SubCompanyCode,
                e.DeptId,
                e.DeptName,
                e.DeptCode,
                e.PosId,
                e.PosName,
                e.PosCode,
                e.PosGrade,
                e.OrganizationPath,
                e.EmploymentStatus,
                e.LastLoginAt,
                e.CreatedAt,
                e.UpdatedAt
            FROM uEmployeeDetailView e
            WHERE e.EmployeeId = @EmployeeId;

            SET @ResultCode = 0;
            SET @Message = N'직원 정보 조회 성공';
        END
        ELSE
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않는 직원입니다.';
        END

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'직원 정보 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================
-- 4. 직원 로그인 인증 SP
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('SP_AuthenticateEmployee'))
BEGIN
    DROP PROCEDURE SP_AuthenticateEmployee;
END
GO

CREATE PROCEDURE SP_AuthenticateEmployee
    @LoginId NVARCHAR(255),            -- 사번 또는 이메일
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 입력값 검증
        IF @LoginId IS NULL OR LTRIM(RTRIM(@LoginId)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'로그인 ID가 필요합니다.';
            RETURN;
        END

        -- 직원 정보 조회 (사번 또는 이메일로)
        IF EXISTS (
            SELECT 1 FROM uEmployeeTb 
            WHERE (EmployeeCode = @LoginId OR Email = @LoginId) 
              AND IsActive = 1
        )
        BEGIN
            SELECT 
                e.EmployeeId,
                e.EmployeeCode,
                e.Email,
                e.Password,
                e.FullName,
                e.UserRole,
                e.AccountLocked,
                e.LoginFailCount,
                e.IsActive AS EmployeeActive,
                e.CompanyId,
                e.CompanyName,
                e.SubCompanyId,
                e.SubCompanyName,
                e.DeptId,
                e.DeptName,
                e.PosId,
                e.PosName,
                e.OrganizationPath
            FROM uEmployeeDetailView e
            WHERE (e.EmployeeCode = @LoginId OR e.Email = @LoginId) 
              AND e.EmployeeActive = 1;

            SET @ResultCode = 0;
            SET @Message = N'인증 정보 조회 성공';
        END
        ELSE
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 계정입니다.';
        END

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'인증 정보 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================
-- 5. 로그인 성공/실패 업데이트 SP
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('SP_UpdateLoginStatus'))
BEGIN
    DROP PROCEDURE SP_UpdateLoginStatus;
END
GO

CREATE PROCEDURE SP_UpdateLoginStatus
    @EmployeeId INT,
    @IsSuccess BIT,                    -- 1: 성공, 0: 실패
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        IF @IsSuccess = 1
        BEGIN
            -- 로그인 성공 시
            UPDATE uEmployeeTb 
            SET LastLoginAt = GETDATE(),
                LoginFailCount = 0,
                AccountLocked = 0,
                AccountLockedAt = NULL,
                UpdatedAt = GETDATE()
            WHERE EmployeeId = @EmployeeId;

            SET @ResultCode = 0;
            SET @Message = N'로그인 성공 기록 업데이트 완료';
        END
        ELSE
        BEGIN
            -- 로그인 실패 시
            DECLARE @FailCount INT = 0;
            
            UPDATE uEmployeeTb 
            SET LoginFailCount = LoginFailCount + 1,
                UpdatedAt = GETDATE()
            WHERE EmployeeId = @EmployeeId;

            -- 실패 횟수 확인
            SELECT @FailCount = LoginFailCount 
            FROM uEmployeeTb 
            WHERE EmployeeId = @EmployeeId;

            -- 5회 실패 시 계정 잠금
            IF @FailCount >= 5
            BEGIN
                UPDATE uEmployeeTb 
                SET AccountLocked = 1,
                    AccountLockedAt = GETDATE()
                WHERE EmployeeId = @EmployeeId;

                SET @ResultCode = -2;
                SET @Message = N'로그인 5회 실패로 계정이 잠겼습니다.';
            END
            ELSE
            BEGIN
                SET @ResultCode = 0;
                SET @Message = N'로그인 실패 횟수: ' + CAST(@FailCount AS NVARCHAR(10));
            END
        END

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'로그인 상태 업데이트 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

PRINT '✅ 직원 관리 Stored Procedures 생성이 완료되었습니다.';
PRINT '생성된 SP 목록:';
PRINT '  - x_CreateEmployee (직원 등록)';
PRINT '  - SP_GetEmployees (직원 목록 조회)';
PRINT '  - SP_GetEmployeeById (직원 상세 조회)';
PRINT '  - SP_AuthenticateEmployee (로그인 인증)';
PRINT '  - SP_UpdateLoginStatus (로그인 상태 업데이트)';
GO