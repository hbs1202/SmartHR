-- =============================================
-- 부서 관리 관련 Stored Procedures
-- 작성자: SmartHR Team
-- 작성일: 2024-09-13
-- =============================================

-- ===========================================
-- SP_GetDepartments: 부서 목록 조회
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_GetDepartments')
    DROP PROCEDURE SP_GetDepartments;
GO

CREATE PROCEDURE SP_GetDepartments
    @SubCompanyId INT = NULL,
    @ParentDeptId INT = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 20,
    @IsActive BIT = NULL,
    @SearchKeyword NVARCHAR(100) = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
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
            d.DeptNameEng,
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
            (@SubCompanyId IS NULL OR d.SubCompanyId = @SubCompanyId)
            AND (@ParentDeptId IS NULL OR d.ParentDeptId = @ParentDeptId)
            AND (@IsActive IS NULL OR d.IsActive = @IsActive)
            AND (
                @SearchKeyword IS NULL 
                OR d.DeptName LIKE '%' + @SearchKeyword + '%'
                OR d.DeptCode LIKE '%' + @SearchKeyword + '%'
                OR d.DeptNameEng LIKE '%' + @SearchKeyword + '%'
            )
        ORDER BY d.DeptLevel, d.DeptCode
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

-- ===========================================
-- SP_GetDepartmentById: 부서 상세 조회
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_GetDepartmentById')
    DROP PROCEDURE SP_GetDepartmentById;
GO

CREATE PROCEDURE SP_GetDepartmentById
    @DeptId INT,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF @DeptId IS NULL OR @DeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 부서 ID를 입력해주세요.';
            RETURN;
        END
        
        SELECT 
            d.DeptId,
            d.SubCompanyId,
            sc.SubCompanyName,
            sc.CompanyId,
            c.CompanyName,
            d.DeptCode,
            d.DeptName,
            d.DeptNameEng,
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
            d.CreatedBy,
            d.UpdatedBy,
            (SELECT COUNT(*) FROM uDeptTb WHERE ParentDeptId = d.DeptId AND IsActive = 1) AS ActiveChildDeptCount,
            (SELECT COUNT(*) FROM uDeptTb WHERE ParentDeptId = d.DeptId) AS TotalChildDeptCount
        FROM uDeptTb d
        INNER JOIN uSubCompanyTb sc ON d.SubCompanyId = sc.SubCompanyId
        INNER JOIN uCompanyTb c ON sc.CompanyId = c.CompanyId
        LEFT JOIN uDeptTb pd ON d.ParentDeptId = pd.DeptId
        WHERE d.DeptId = @DeptId;
        
        IF @@ROWCOUNT = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '해당 부서를 찾을 수 없습니다.';
            RETURN;
        END
        
        SET @ResultCode = 0;
        SET @Message = '부서 정보를 성공적으로 조회했습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '부서 정보 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ===========================================
-- SP_CreateDepartment: 부서 등록
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_CreateDepartment')
    DROP PROCEDURE SP_CreateDepartment;
GO

CREATE PROCEDURE SP_CreateDepartment
    @SubCompanyId INT,
    @DeptCode NVARCHAR(20),
    @DeptName NVARCHAR(200),
    @DeptNameEng NVARCHAR(200) = NULL,
    @ParentDeptId INT = NULL,
    @DeptType NVARCHAR(50) = '일반부서',
    @ManagerEmployeeId INT = NULL,
    @ViceManagerEmployeeId INT = NULL,
    @CostCenter NVARCHAR(20) = NULL,
    @Budget DECIMAL(18,2) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @Extension NVARCHAR(10) = NULL,
    @Email NVARCHAR(255) = NULL,
    @Location NVARCHAR(200) = NULL,
    @EstablishDate DATE = NULL,
    @Purpose NVARCHAR(1000) = NULL,
    @CreatedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- 파라미터 검증
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END
        
        IF @DeptCode IS NULL OR LTRIM(RTRIM(@DeptCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '부서 코드는 필수 입력 항목입니다.';
            RETURN;
        END
        
        IF @DeptName IS NULL OR LTRIM(RTRIM(@DeptName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '부서명은 필수 입력 항목입니다.';
            RETURN;
        END
        
        -- 사업장 존재 여부 확인
        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않거나 비활성화된 사업장입니다.';
            RETURN;
        END
        
        -- 부서 코드 중복 체크 (같은 사업장 내에서)
        IF EXISTS (SELECT 1 FROM uDeptTb WHERE SubCompanyId = @SubCompanyId AND DeptCode = @DeptCode)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '해당 사업장에 이미 존재하는 부서 코드입니다.';
            RETURN;
        END
        
        -- 상위 부서 검증
        DECLARE @ParentDeptLevel INT = 0;
        IF @ParentDeptId IS NOT NULL
        BEGIN
            SELECT @ParentDeptLevel = DeptLevel 
            FROM uDeptTb 
            WHERE DeptId = @ParentDeptId AND SubCompanyId = @SubCompanyId AND IsActive = 1;
            
            IF @ParentDeptLevel IS NULL
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '유효하지 않은 상위 부서입니다.';
                RETURN;
            END
        END
        
        -- 부서 레벨 계산
        DECLARE @DeptLevel INT = @ParentDeptLevel + 1;
        
        -- 부서 정보 삽입
        INSERT INTO uDeptTb (
            SubCompanyId, DeptCode, DeptName, DeptNameEng, ParentDeptId, DeptLevel,
            DeptType, ManagerEmployeeId, ViceManagerEmployeeId, CostCenter, Budget,
            PhoneNumber, Extension, Email, Location, EstablishDate, Purpose,
            IsActive, CreatedAt, CreatedBy
        )
        VALUES (
            @SubCompanyId, @DeptCode, @DeptName, @DeptNameEng, @ParentDeptId, @DeptLevel,
            @DeptType, @ManagerEmployeeId, @ViceManagerEmployeeId, @CostCenter, @Budget,
            @PhoneNumber, @Extension, @Email, @Location, @EstablishDate, @Purpose,
            1, GETDATE(), @CreatedBy
        );
        
        DECLARE @NewDeptId INT = SCOPE_IDENTITY();
        SELECT @NewDeptId AS DeptId;
        
        SET @ResultCode = 0;
        SET @Message = '부서가 성공적으로 등록되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '부서 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ===========================================
-- SP_UpdateDepartment: 부서 정보 수정
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_UpdateDepartment')
    DROP PROCEDURE SP_UpdateDepartment;
GO

CREATE PROCEDURE SP_UpdateDepartment
    @DeptId INT,
    @DeptName NVARCHAR(200),
    @DeptNameEng NVARCHAR(200) = NULL,
    @DeptType NVARCHAR(50) = NULL,
    @ManagerEmployeeId INT = NULL,
    @ViceManagerEmployeeId INT = NULL,
    @CostCenter NVARCHAR(20) = NULL,
    @Budget DECIMAL(18,2) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @Extension NVARCHAR(10) = NULL,
    @Email NVARCHAR(255) = NULL,
    @Location NVARCHAR(200) = NULL,
    @EstablishDate DATE = NULL,
    @CloseDate DATE = NULL,
    @Purpose NVARCHAR(1000) = NULL,
    @IsActive BIT = NULL,
    @UpdatedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF @DeptId IS NULL OR @DeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 부서 ID를 입력해주세요.';
            RETURN;
        END
        
        IF @DeptName IS NULL OR LTRIM(RTRIM(@DeptName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '부서명은 필수 입력 항목입니다.';
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @DeptId)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '수정할 부서를 찾을 수 없습니다.';
            RETURN;
        END
        
        UPDATE uDeptTb
        SET 
            DeptName = @DeptName,
            DeptNameEng = CASE WHEN @DeptNameEng IS NOT NULL THEN @DeptNameEng ELSE DeptNameEng END,
            DeptType = CASE WHEN @DeptType IS NOT NULL THEN @DeptType ELSE DeptType END,
            ManagerEmployeeId = CASE WHEN @ManagerEmployeeId IS NOT NULL THEN @ManagerEmployeeId ELSE ManagerEmployeeId END,
            ViceManagerEmployeeId = CASE WHEN @ViceManagerEmployeeId IS NOT NULL THEN @ViceManagerEmployeeId ELSE ViceManagerEmployeeId END,
            CostCenter = CASE WHEN @CostCenter IS NOT NULL THEN @CostCenter ELSE CostCenter END,
            Budget = CASE WHEN @Budget IS NOT NULL THEN @Budget ELSE Budget END,
            PhoneNumber = CASE WHEN @PhoneNumber IS NOT NULL THEN @PhoneNumber ELSE PhoneNumber END,
            Extension = CASE WHEN @Extension IS NOT NULL THEN @Extension ELSE Extension END,
            Email = CASE WHEN @Email IS NOT NULL THEN @Email ELSE Email END,
            Location = CASE WHEN @Location IS NOT NULL THEN @Location ELSE Location END,
            EstablishDate = CASE WHEN @EstablishDate IS NOT NULL THEN @EstablishDate ELSE EstablishDate END,
            CloseDate = CASE WHEN @CloseDate IS NOT NULL THEN @CloseDate ELSE CloseDate END,
            Purpose = CASE WHEN @Purpose IS NOT NULL THEN @Purpose ELSE Purpose END,
            IsActive = CASE WHEN @IsActive IS NOT NULL THEN @IsActive ELSE IsActive END,
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE DeptId = @DeptId;
        
        SET @ResultCode = 0;
        SET @Message = '부서 정보가 성공적으로 수정되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '부서 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ===========================================
-- SP_DeleteDepartment: 부서 삭제 (소프트 삭제)
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_DeleteDepartment')
    DROP PROCEDURE SP_DeleteDepartment;
GO

CREATE PROCEDURE SP_DeleteDepartment
    @DeptId INT,
    @DeletedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF @DeptId IS NULL OR @DeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 부서 ID를 입력해주세요.';
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @DeptId)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '삭제할 부서를 찾을 수 없습니다.';
            RETURN;
        END
        
        -- 활성화된 하위 부서가 있는지 확인
        IF EXISTS (SELECT 1 FROM uDeptTb WHERE ParentDeptId = @DeptId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '활성화된 하위 부서가 존재하여 부서를 삭제할 수 없습니다. 먼저 하위 부서를 삭제해주세요.';
            RETURN;
        END
        
        -- 부서 소프트 삭제
        UPDATE uDeptTb
        SET 
            IsActive = 0,
            CloseDate = GETDATE(),
            UpdatedAt = GETDATE(),
            UpdatedBy = @DeletedBy
        WHERE DeptId = @DeptId;
        
        SET @ResultCode = 0;
        SET @Message = '부서가 성공적으로 삭제되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '부서 삭제 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

PRINT '부서 관리 관련 Stored Procedures 생성 완료!';