-- 부서 관리 저장 프로시저 배포 스크립트
-- 실행 순서: 1. x_GetDepartments, 2. x_CreateDepartment, 3. x_UpdateDepartment, 4. x_DeleteDepartment

USE hr_system;
GO

PRINT '🚀 부서 관리 저장 프로시저 배포 시작...';
PRINT '';

-- 1. x_GetDepartments 저장 프로시저
PRINT '📋 1. x_GetDepartments 저장 프로시저 생성 중...';

-- 기존 프로시저 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_GetDepartments')
    DROP PROCEDURE x_GetDepartments;

-- QUOTED_IDENTIFIER 설정
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

CREATE PROCEDURE x_GetDepartments
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @IsActive BIT = NULL,
    @SearchKeyword NVARCHAR(100) = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

        SELECT
            d.DeptId,
            d.SubCompanyId,
            sc.SubCompanyName,
            sc.CompanyId,
            c.CompanyName,
            d.DeptCode,
            d.DeptName,
            d.ParentDeptId,
            pd.DeptName AS ParentDeptName,
            d.DeptLevel,
            d.DeptType,
            d.ManagerEmployeeId,
            d.ViceManagerEmployeeId,
            d.CostCenter,
            d.Budget,
            d.EmployeeCount,
            d.PhoneNumber,
            d.Extension,
            d.Email,
            d.Location,
            d.EstablishDate,
            d.CloseDate,
            d.Purpose,
            d.IsActive,
            d.CreatedAt,
            d.UpdatedAt,
            COUNT(*) OVER() AS TotalCount
        FROM uDeptTb d
        INNER JOIN uSubCompanyTb sc ON d.SubCompanyId = sc.SubCompanyId
        INNER JOIN uCompanyTb c ON sc.CompanyId = c.CompanyId
        LEFT JOIN uDeptTb pd ON d.ParentDeptId = pd.DeptId
        WHERE
            (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR d.SubCompanyId = @SubCompanyId)
            AND (@IsActive IS NULL OR d.IsActive = @IsActive)
            AND (
                @SearchKeyword IS NULL
                OR d.DeptName LIKE '%' + @SearchKeyword + '%'
                OR d.DeptCode LIKE '%' + @SearchKeyword + '%'
                OR sc.SubCompanyName LIKE '%' + @SearchKeyword + '%'
                OR c.CompanyName LIKE '%' + @SearchKeyword + '%'
            )
        ORDER BY c.CompanyName, sc.SubCompanyName, d.DeptLevel, d.DeptCode
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY;

        SET @ResultCode = 0;
        SET @Message = '부서 목록을 성공적으로 조회했습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '부서 목록 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO
PRINT '✅ x_GetDepartments 저장 프로시저 생성 완료!';
PRINT '';

-- 2. x_CreateDepartment 저장 프로시저
PRINT '📝 2. x_CreateDepartment 저장 프로시저 생성 중...';

-- 기존 프로시저 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreateDepartment')
    DROP PROCEDURE x_CreateDepartment;

-- QUOTED_IDENTIFIER 설정
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

CREATE PROCEDURE x_CreateDepartment
    @SubCompanyId INT,
    @DeptCode NVARCHAR(20),
    @DeptName NVARCHAR(200),
    @ParentDeptId INT = NULL,
    @EstablishDate DATE = NULL,
    @CreatedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        -- 1. 유효성 검증
        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 사업장입니다.';
            RETURN;
        END

        -- 2. 부서코드 중복 검증 (같은 사업장 내)
        IF EXISTS (SELECT 1 FROM uDeptTb WHERE SubCompanyId = @SubCompanyId AND DeptCode = @DeptCode)
        BEGIN
            SET @ResultCode = -2;
            SET @Message = '해당 사업장에 동일한 부서코드가 이미 존재합니다.';
            RETURN;
        END

        -- 3. 상위부서 검증
        DECLARE @DeptLevel INT = 1;
        DECLARE @DeptType NVARCHAR(50) = '일반부서';

        IF @ParentDeptId IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @ParentDeptId AND SubCompanyId = @SubCompanyId AND IsActive = 1)
            BEGIN
                SET @ResultCode = -3;
                SET @Message = '존재하지 않거나 다른 사업장의 상위부서입니다.';
                RETURN;
            END

            -- 상위부서의 레벨 + 1
            SELECT @DeptLevel = DeptLevel + 1 FROM uDeptTb WHERE DeptId = @ParentDeptId;
        END

        -- 4. 부서 등록
        INSERT INTO uDeptTb (
            SubCompanyId, DeptCode, DeptName, ParentDeptId, DeptLevel, DeptType,
            EmployeeCount, EstablishDate, IsActive, CreatedBy, CreatedAt
        ) VALUES (
            @SubCompanyId, @DeptCode, @DeptName, @ParentDeptId, @DeptLevel, @DeptType,
            0, @EstablishDate, 1, @CreatedBy, GETDATE()
        );

        DECLARE @NewDeptId INT = SCOPE_IDENTITY();

        -- 5. 등록된 부서 정보 반환
        SELECT
            d.DeptId,
            d.SubCompanyId,
            sc.SubCompanyName,
            sc.CompanyId,
            c.CompanyName,
            d.DeptCode,
            d.DeptName,
            d.ParentDeptId,
            pd.DeptName AS ParentDeptName,
            d.DeptLevel,
            d.DeptType,
            d.ManagerEmployeeId,
            d.ViceManagerEmployeeId,
            d.CostCenter,
            d.Budget,
            d.EmployeeCount,
            d.PhoneNumber,
            d.Extension,
            d.Email,
            d.Location,
            d.EstablishDate,
            d.CloseDate,
            d.Purpose,
            d.IsActive,
            d.CreatedAt,
            d.UpdatedAt
        FROM uDeptTb d
        INNER JOIN uSubCompanyTb sc ON d.SubCompanyId = sc.SubCompanyId
        INNER JOIN uCompanyTb c ON sc.CompanyId = c.CompanyId
        LEFT JOIN uDeptTb pd ON d.ParentDeptId = pd.DeptId
        WHERE d.DeptId = @NewDeptId;

        SET @ResultCode = 0;
        SET @Message = '부서가 성공적으로 등록되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -99;
        SET @Message = '부서 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO
PRINT '✅ x_CreateDepartment 저장 프로시저 생성 완료!';
PRINT '';

-- 3. x_UpdateDepartment 저장 프로시저
PRINT '✏️ 3. x_UpdateDepartment 저장 프로시저 생성 중...';

-- 기존 프로시저 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_UpdateDepartment')
    DROP PROCEDURE x_UpdateDepartment;

-- QUOTED_IDENTIFIER 설정
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

CREATE PROCEDURE x_UpdateDepartment
    @DeptId INT,
    @DeptCode NVARCHAR(20),
    @DeptName NVARCHAR(200),
    @ParentDeptId INT = NULL,
    @EstablishDate DATE = NULL,
    @UpdatedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        -- 1. 부서 존재 검증
        DECLARE @SubCompanyId INT;
        DECLARE @CurrentParentDeptId INT;

        SELECT @SubCompanyId = SubCompanyId, @CurrentParentDeptId = ParentDeptId
        FROM uDeptTb
        WHERE DeptId = @DeptId AND IsActive = 1;

        IF @SubCompanyId IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 부서입니다.';
            RETURN;
        END

        -- 2. 부서코드 중복 검증 (자신 제외)
        IF EXISTS (SELECT 1 FROM uDeptTb
                   WHERE SubCompanyId = @SubCompanyId
                     AND DeptCode = @DeptCode
                     AND DeptId != @DeptId)
        BEGIN
            SET @ResultCode = -2;
            SET @Message = '해당 사업장에 동일한 부서코드가 이미 존재합니다.';
            RETURN;
        END

        -- 3. 상위부서 순환참조 검증
        IF @ParentDeptId IS NOT NULL
        BEGIN
            -- 자기 자신을 상위부서로 설정하는 경우
            IF @ParentDeptId = @DeptId
            BEGIN
                SET @ResultCode = -3;
                SET @Message = '자기 자신을 상위부서로 설정할 수 없습니다.';
                RETURN;
            END

            -- 하위부서를 상위부서로 설정하는 경우 (순환참조 방지)
            DECLARE @CheckDeptId INT = @ParentDeptId;
            WHILE @CheckDeptId IS NOT NULL
            BEGIN
                SELECT @CheckDeptId = ParentDeptId FROM uDeptTb WHERE DeptId = @CheckDeptId;
                IF @CheckDeptId = @DeptId
                BEGIN
                    SET @ResultCode = -4;
                    SET @Message = '하위부서를 상위부서로 설정할 수 없습니다.';
                    RETURN;
                END
            END

            -- 상위부서가 같은 사업장에 있는지 검증
            IF NOT EXISTS (SELECT 1 FROM uDeptTb
                          WHERE DeptId = @ParentDeptId
                            AND SubCompanyId = @SubCompanyId
                            AND IsActive = 1)
            BEGIN
                SET @ResultCode = -5;
                SET @Message = '상위부서는 같은 사업장 내에서만 선택할 수 있습니다.';
                RETURN;
            END
        END

        -- 4. 부서 레벨 계산
        DECLARE @NewDeptLevel INT = 1;
        IF @ParentDeptId IS NOT NULL
        BEGIN
            SELECT @NewDeptLevel = DeptLevel + 1 FROM uDeptTb WHERE DeptId = @ParentDeptId;
        END

        -- 5. 부서 정보 업데이트
        UPDATE uDeptTb
        SET
            DeptCode = @DeptCode,
            DeptName = @DeptName,
            ParentDeptId = @ParentDeptId,
            DeptLevel = @NewDeptLevel,
            EstablishDate = @EstablishDate,
            UpdatedBy = @UpdatedBy,
            UpdatedAt = GETDATE()
        WHERE DeptId = @DeptId;

        -- 6. 하위부서들의 레벨 업데이트 (재귀적으로)
        WITH DeptHierarchy AS (
            -- 현재 부서의 직접 하위부서들
            SELECT DeptId, @NewDeptLevel + 1 AS NewLevel
            FROM uDeptTb
            WHERE ParentDeptId = @DeptId

            UNION ALL

            -- 재귀적으로 하위부서들
            SELECT d.DeptId, dh.NewLevel + 1
            FROM uDeptTb d
            INNER JOIN DeptHierarchy dh ON d.ParentDeptId = dh.DeptId
        )
        UPDATE d
        SET DeptLevel = dh.NewLevel,
            UpdatedBy = @UpdatedBy,
            UpdatedAt = GETDATE()
        FROM uDeptTb d
        INNER JOIN DeptHierarchy dh ON d.DeptId = dh.DeptId;

        -- 7. 업데이트된 부서 정보 반환
        SELECT
            d.DeptId,
            d.SubCompanyId,
            sc.SubCompanyName,
            sc.CompanyId,
            c.CompanyName,
            d.DeptCode,
            d.DeptName,
            d.ParentDeptId,
            pd.DeptName AS ParentDeptName,
            d.DeptLevel,
            d.DeptType,
            d.ManagerEmployeeId,
            d.ViceManagerEmployeeId,
            d.CostCenter,
            d.Budget,
            d.EmployeeCount,
            d.PhoneNumber,
            d.Extension,
            d.Email,
            d.Location,
            d.EstablishDate,
            d.CloseDate,
            d.Purpose,
            d.IsActive,
            d.CreatedAt,
            d.UpdatedAt
        FROM uDeptTb d
        INNER JOIN uSubCompanyTb sc ON d.SubCompanyId = sc.SubCompanyId
        INNER JOIN uCompanyTb c ON sc.CompanyId = c.CompanyId
        LEFT JOIN uDeptTb pd ON d.ParentDeptId = pd.DeptId
        WHERE d.DeptId = @DeptId;

        SET @ResultCode = 0;
        SET @Message = '부서 정보가 성공적으로 수정되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -99;
        SET @Message = '부서 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO
PRINT '✅ x_UpdateDepartment 저장 프로시저 생성 완료!';
PRINT '';

-- 4. x_DeleteDepartment 저장 프로시저
PRINT '🗑️ 4. x_DeleteDepartment 저장 프로시저 생성 중...';

-- 기존 프로시저 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_DeleteDepartment')
    DROP PROCEDURE x_DeleteDepartment;

-- QUOTED_IDENTIFIER 설정
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

CREATE PROCEDURE x_DeleteDepartment
    @DeptId INT,
    @DeletedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        -- 1. 부서 존재 검증
        IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @DeptId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 이미 삭제된 부서입니다.';
            RETURN;
        END

        -- 2. 하위부서 존재 검증
        IF EXISTS (SELECT 1 FROM uDeptTb WHERE ParentDeptId = @DeptId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -2;
            SET @Message = '하위부서가 존재하는 부서는 삭제할 수 없습니다. 먼저 하위부서를 삭제하거나 이동시켜주세요.';
            RETURN;
        END

        -- 3. 소속 직원 존재 검증 (직원 테이블이 있다면)
        -- IF EXISTS (SELECT 1 FROM uEmployeeTb WHERE DeptId = @DeptId AND IsActive = 1)
        -- BEGIN
        --     SET @ResultCode = -3;
        --     SET @Message = '소속 직원이 있는 부서는 삭제할 수 없습니다. 먼저 직원을 다른 부서로 이동시켜주세요.';
        --     RETURN;
        -- END

        -- 4. 부서 삭제 (비활성화)
        UPDATE uDeptTb
        SET
            IsActive = 0,
            UpdatedBy = @DeletedBy,
            UpdatedAt = GETDATE(),
            CloseDate = GETDATE()
        WHERE DeptId = @DeptId;

        SET @ResultCode = 0;
        SET @Message = '부서가 성공적으로 삭제되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -99;
        SET @Message = '부서 삭제 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO
PRINT '✅ x_DeleteDepartment 저장 프로시저 생성 완료!';
PRINT '';

PRINT '🎉 부서 관리 저장 프로시저 배포 완료!';
PRINT '';
PRINT '📊 배포된 저장 프로시저 목록:';
PRINT '  ✅ x_GetDepartments - 부서 목록 조회';
PRINT '  ✅ x_CreateDepartment - 부서 등록';
PRINT '  ✅ x_UpdateDepartment - 부서 수정';
PRINT '  ✅ x_DeleteDepartment - 부서 삭제';
PRINT '';
PRINT '🚀 이제 부서 관리 API를 테스트할 수 있습니다!';