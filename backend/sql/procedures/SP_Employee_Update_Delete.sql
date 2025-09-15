-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-13
-- 설명: 직원 수정 및 삭제 Stored Procedures
-- =============================================

USE hr_system;
GO

-- =============================================
-- 1. 직원 정보 수정 SP
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('SP_UpdateEmployee'))
BEGIN
    DROP PROCEDURE SP_UpdateEmployee;
END
GO

CREATE PROCEDURE SP_UpdateEmployee
    @EmployeeId INT,                    -- 수정할 직원 ID
    @FirstName NVARCHAR(50) = NULL,     -- 성 (선택적)
    @LastName NVARCHAR(50) = NULL,      -- 이름 (선택적)
    @NameEng NVARCHAR(100) = NULL,      -- 영문명 (선택적)
    @Gender NCHAR(1) = NULL,            -- 성별 (선택적)
    @BirthDate DATE = NULL,             -- 생년월일 (선택적)
    @PhoneNumber NVARCHAR(20) = NULL,   -- 전화번호 (선택적)
    @EmploymentType NVARCHAR(50) = NULL, -- 고용형태 (선택적)
    @CurrentSalary DECIMAL(15,2) = NULL, -- 현재 급여 (선택적)
    @UserRole NVARCHAR(50) = NULL,      -- 권한 (선택적, admin만 수정 가능)
    @UpdatedBy INT,                     -- 수정자 ID
    @ResultCode INT OUTPUT,             -- 결과 코드
    @Message NVARCHAR(500) OUTPUT       -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 변수 선언
    DECLARE @ExistingCount INT = 0;
    DECLARE @UpdateCount INT = 0;
    DECLARE @UpdateFields NVARCHAR(MAX) = '';
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않은 직원 ID입니다.';
            RETURN;
        END
        
        IF @UpdatedBy IS NULL OR @UpdatedBy <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '수정자 정보가 필요합니다.';
            RETURN;
        END

        -- 2. 직원 존재 여부 확인
        SELECT @ExistingCount = COUNT(*)
        FROM uEmployeeTb 
        WHERE EmployeeId = @EmployeeId AND IsActive = 1;

        IF @ExistingCount = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 직원이거나 비활성화된 직원입니다.';
            RETURN;
        END

        -- 3. 수정할 데이터가 있는지 확인
        IF @FirstName IS NULL AND @LastName IS NULL AND @NameEng IS NULL 
           AND @Gender IS NULL AND @BirthDate IS NULL AND @PhoneNumber IS NULL
           AND @EmploymentType IS NULL AND @CurrentSalary IS NULL AND @UserRole IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '수정할 정보가 없습니다.';
            RETURN;
        END

        -- 4. 유효성 검사
        IF @Gender IS NOT NULL AND @Gender NOT IN ('M', 'F')
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '성별은 M(남성) 또는 F(여성)이어야 합니다.';
            RETURN;
        END

        IF @UserRole IS NOT NULL AND @UserRole NOT IN ('admin', 'manager', 'employee')
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '권한은 admin, manager, employee 중 하나여야 합니다.';
            RETURN;
        END

        IF @PhoneNumber IS NOT NULL AND LEN(@PhoneNumber) > 0
        BEGIN
            -- 간단한 전화번호 형식 검증
            IF @PhoneNumber NOT LIKE '01[0-9]-%[0-9][0-9][0-9][0-9]-%[0-9][0-9][0-9][0-9]'
               AND @PhoneNumber NOT LIKE '0[2-9][0-9]-%[0-9][0-9][0-9][0-9]-%[0-9][0-9][0-9][0-9]'
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '전화번호 형식이 올바르지 않습니다. (예: 010-1234-5678)';
                RETURN;
            END
        END

        -- 5. 동적 UPDATE 쿼리 생성 및 실행
        DECLARE @SqlQuery NVARCHAR(MAX) = 'UPDATE uEmployeeTb SET ';
        DECLARE @SetClause NVARCHAR(MAX) = '';
        DECLARE @ParamDefinition NVARCHAR(MAX) = '';

        -- FirstName 업데이트
        IF @FirstName IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'FirstName = @FirstName, ';
            SET @ParamDefinition = @ParamDefinition + '@FirstName NVARCHAR(50), ';
        END

        -- LastName 업데이트
        IF @LastName IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'LastName = @LastName, ';
            SET @ParamDefinition = @ParamDefinition + '@LastName NVARCHAR(50), ';
        END

        -- FullName 업데이트 (FirstName 또는 LastName이 변경된 경우)
        IF @FirstName IS NOT NULL OR @LastName IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'FullName = ISNULL(@FirstName, FirstName) + ISNULL(@LastName, LastName), ';
        END

        -- NameEng 업데이트
        IF @NameEng IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'NameEng = @NameEng, ';
            SET @ParamDefinition = @ParamDefinition + '@NameEng NVARCHAR(100), ';
        END

        -- Gender 업데이트
        IF @Gender IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'Gender = @Gender, ';
            SET @ParamDefinition = @ParamDefinition + '@Gender NCHAR(1), ';
        END

        -- BirthDate 업데이트
        IF @BirthDate IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'BirthDate = @BirthDate, ';
            SET @ParamDefinition = @ParamDefinition + '@BirthDate DATE, ';
        END

        -- PhoneNumber 업데이트
        IF @PhoneNumber IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'PhoneNumber = @PhoneNumber, ';
            SET @ParamDefinition = @ParamDefinition + '@PhoneNumber NVARCHAR(20), ';
        END

        -- EmploymentType 업데이트
        IF @EmploymentType IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'EmploymentType = @EmploymentType, ';
            SET @ParamDefinition = @ParamDefinition + '@EmploymentType NVARCHAR(50), ';
        END

        -- CurrentSalary 업데이트
        IF @CurrentSalary IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'CurrentSalary = @CurrentSalary, ';
            SET @ParamDefinition = @ParamDefinition + '@CurrentSalary DECIMAL(15,2), ';
        END

        -- UserRole 업데이트
        IF @UserRole IS NOT NULL
        BEGIN
            SET @SetClause = @SetClause + 'UserRole = @UserRole, ';
            SET @ParamDefinition = @ParamDefinition + '@UserRole NVARCHAR(50), ';
        END

        -- 공통 업데이트 필드
        SET @SetClause = @SetClause + 'UpdatedAt = GETDATE(), UpdatedBy = @UpdatedBy ';
        SET @ParamDefinition = @ParamDefinition + '@UpdatedBy INT, @EmployeeId INT';

        -- WHERE 조건 추가
        SET @SqlQuery = @SqlQuery + @SetClause + ' WHERE EmployeeId = @EmployeeId AND IsActive = 1';

        -- 동적 쿼리 실행
        EXEC sp_executesql @SqlQuery, @ParamDefinition, 
             @FirstName = @FirstName,
             @LastName = @LastName,
             @NameEng = @NameEng,
             @Gender = @Gender,
             @BirthDate = @BirthDate,
             @PhoneNumber = @PhoneNumber,
             @EmploymentType = @EmploymentType,
             @CurrentSalary = @CurrentSalary,
             @UserRole = @UserRole,
             @UpdatedBy = @UpdatedBy,
             @EmployeeId = @EmployeeId;

        -- 업데이트된 행 수 확인
        SET @UpdateCount = @@ROWCOUNT;

        IF @UpdateCount > 0
        BEGIN
            -- 6. 성공 처리
            SET @ResultCode = 0;
            SET @Message = '직원 정보가 성공적으로 수정되었습니다.';
            
            -- 수정된 직원 정보 반환
            SELECT 
                EmployeeId,
                EmployeeCode,
                Email,
                FullName,
                FirstName,
                LastName,
                NameEng,
                Gender,
                BirthDate,
                PhoneNumber,
                EmploymentType,
                CurrentSalary,
                UserRole,
                UpdatedAt,
                UpdatedBy
            FROM uEmployeeTb 
            WHERE EmployeeId = @EmployeeId;
        END
        ELSE
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '직원 정보 수정에 실패했습니다.';
        END

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '직원 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        -- 에러 로깅 (개발/디버깅용)
        PRINT '=== SP_UpdateEmployee 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'EmployeeId: ' + CAST(@EmployeeId AS NVARCHAR(10));
        PRINT 'UpdatedBy: ' + CAST(@UpdatedBy AS NVARCHAR(10));
        PRINT '========================================';

    END CATCH
END
GO

-- =============================================
-- 2. 직원 삭제 SP (소프트 삭제)
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('SP_DeleteEmployee'))
BEGIN
    DROP PROCEDURE SP_DeleteEmployee;
END
GO

CREATE PROCEDURE SP_DeleteEmployee
    @EmployeeId INT,                    -- 삭제할 직원 ID
    @DeletedBy INT,                     -- 삭제자 ID
    @DeleteReason NVARCHAR(500) = NULL, -- 삭제 사유 (선택적)
    @ResultCode INT OUTPUT,             -- 결과 코드
    @Message NVARCHAR(500) OUTPUT       -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    -- 변수 선언
    DECLARE @ExistingCount INT = 0;
    DECLARE @DeleteCount INT = 0;
    DECLARE @EmployeeCode NVARCHAR(20) = '';
    DECLARE @FullName NVARCHAR(100) = '';
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않은 직원 ID입니다.';
            RETURN;
        END
        
        IF @DeletedBy IS NULL OR @DeletedBy <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '삭제자 정보가 필요합니다.';
            RETURN;
        END

        -- 2. 자기 자신 삭제 방지
        IF @EmployeeId = @DeletedBy
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '본인 계정은 삭제할 수 없습니다.';
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
                SET @Message = '이미 삭제된 직원입니다.';
            END
            ELSE
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '존재하지 않는 직원입니다.';
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
            -- 5. 삭제 이력 기록 (향후 확장 가능)
            -- TODO: 삭제 이력 테이블 생성 후 기록 기능 추가
            
            -- 6. 성공 처리
            SET @ResultCode = 0;
            SET @Message = '직원이 성공적으로 삭제되었습니다.';
            
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
            SET @Message = '직원 삭제에 실패했습니다.';
        END

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '직원 삭제 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        -- 에러 로깅 (개발/디버깅용)
        PRINT '=== SP_DeleteEmployee 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'EmployeeId: ' + CAST(@EmployeeId AS NVARCHAR(10));
        PRINT 'DeletedBy: ' + CAST(@DeletedBy AS NVARCHAR(10));
        PRINT '=====================================';

    END CATCH
END
GO

PRINT '✅ SP_UpdateEmployee 및 SP_DeleteEmployee 생성 완료';
PRINT '📝 사용법:';
PRINT '   EXEC SP_UpdateEmployee @EmployeeId=1, @FirstName=N''수정된'', @UpdatedBy=1, @ResultCode=@rc OUTPUT, @Message=@msg OUTPUT';
PRINT '   EXEC SP_DeleteEmployee @EmployeeId=1, @DeletedBy=1, @ResultCode=@rc OUTPUT, @Message=@msg OUTPUT';