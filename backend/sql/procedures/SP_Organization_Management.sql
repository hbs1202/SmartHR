-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-12
-- 설명: 조직도 관리 Stored Procedures
-- 수정이력: 
-- =============================================

USE hr_system;
GO

-- =============================================
-- 1. 회사 관련 Stored Procedures
-- =============================================

-- 회사 등록
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreateCompany')
    DROP PROCEDURE x_CreateCompany;
GO

CREATE PROCEDURE x_CreateCompany
    @CompanyCode NVARCHAR(20),
    @CompanyName NVARCHAR(200),
    @CompanyNameEng NVARCHAR(200) = NULL,
    @BusinessNumber NVARCHAR(20) = NULL,
    @CeoName NVARCHAR(100) = NULL,
    @EstablishDate DATE = NULL,
    @Address NVARCHAR(500) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @Email NVARCHAR(255) = NULL,
    @Industry NVARCHAR(100) = NULL,
    @CreatedBy INT = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CompanyId INT = 0;
    DECLARE @Count INT = 0;
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @CompanyCode IS NULL OR LTRIM(RTRIM(@CompanyCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '회사 코드는 필수 입력 항목입니다.';
            RETURN;
        END
        
        IF @CompanyName IS NULL OR LTRIM(RTRIM(@CompanyName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '회사명은 필수 입력 항목입니다.';
            RETURN;
        END
        
        -- 2. 중복 확인
        SELECT @Count = COUNT(*)
        FROM uCompanyTb 
        WHERE CompanyCode = @CompanyCode OR CompanyName = @CompanyName;
        
        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 회사 코드 또는 회사명입니다.';
            RETURN;
        END
        
        -- 사업자등록번호 중복 확인
        IF @BusinessNumber IS NOT NULL
        BEGIN
            SELECT @Count = COUNT(*)
            FROM uCompanyTb 
            WHERE BusinessNumber = @BusinessNumber;
            
            IF @Count > 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '이미 등록된 사업자등록번호입니다.';
                RETURN;
            END
        END
        
        -- 3. 회사 등록
        INSERT INTO uCompanyTb (
            CompanyCode, CompanyName, CompanyNameEng, BusinessNumber, 
            CeoName, EstablishDate, Address, PhoneNumber, Email, 
            Industry, CreatedBy, CreatedAt
        )
        VALUES (
            @CompanyCode, @CompanyName, @CompanyNameEng, @BusinessNumber,
            @CeoName, @EstablishDate, @Address, @PhoneNumber, @Email,
            @Industry, @CreatedBy, GETDATE()
        );
        
        SET @CompanyId = SCOPE_IDENTITY();
        
        -- 4. 결과 반환
        SELECT @CompanyId AS CompanyId;
        
        SET @ResultCode = 0;
        SET @Message = '회사가 성공적으로 등록되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '회사 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        PRINT '=== x_CreateCompany 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'CompanyCode: ' + ISNULL(@CompanyCode, 'NULL');
        PRINT 'CompanyName: ' + ISNULL(@CompanyName, 'NULL');
        PRINT '================================';
    END CATCH
END
GO

-- =============================================
-- 2. 사업장 관련 Stored Procedures
-- =============================================

-- 사업장 등록
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreateSubCompany')
    DROP PROCEDURE x_CreateSubCompany;
GO

CREATE PROCEDURE x_CreateSubCompany
    @CompanyId INT,
    @SubCompanyCode NVARCHAR(20),
    @SubCompanyName NVARCHAR(200),
    @SubCompanyType NVARCHAR(50) = '본사',
    @Address NVARCHAR(500) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @IsHeadquarters BIT = 0,
    @CreatedBy INT = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @SubCompanyId INT = 0;
    DECLARE @Count INT = 0;
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 회사 ID가 필요합니다.';
            RETURN;
        END
        
        IF @SubCompanyCode IS NULL OR LTRIM(RTRIM(@SubCompanyCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '사업장 코드는 필수 입력 항목입니다.';
            RETURN;
        END
        
        IF @SubCompanyName IS NULL OR LTRIM(RTRIM(@SubCompanyName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '사업장명은 필수 입력 항목입니다.';
            RETURN;
        END
        
        -- 2. 회사 존재 확인
        SELECT @Count = COUNT(*)
        FROM uCompanyTb 
        WHERE CompanyId = @CompanyId AND IsActive = 1;
        
        IF @Count = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 회사입니다.';
            RETURN;
        END
        
        -- 3. 사업장 코드 중복 확인
        SELECT @Count = COUNT(*)
        FROM uSubCompanyTb 
        WHERE SubCompanyCode = @SubCompanyCode;
        
        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 사업장 코드입니다.';
            RETURN;
        END
        
        -- 4. 본사 설정 확인 (본사가 이미 있는지)
        IF @IsHeadquarters = 1
        BEGIN
            SELECT @Count = COUNT(*)
            FROM uSubCompanyTb 
            WHERE CompanyId = @CompanyId AND IsHeadquarters = 1 AND IsActive = 1;
            
            IF @Count > 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '해당 회사에는 이미 본사가 등록되어 있습니다.';
                RETURN;
            END
        END
        
        -- 5. 사업장 등록
        INSERT INTO uSubCompanyTb (
            CompanyId, SubCompanyCode, SubCompanyName, SubCompanyType,
            Address, PhoneNumber, IsHeadquarters, CreatedBy, CreatedAt
        )
        VALUES (
            @CompanyId, @SubCompanyCode, @SubCompanyName, @SubCompanyType,
            @Address, @PhoneNumber, @IsHeadquarters, @CreatedBy, GETDATE()
        );
        
        SET @SubCompanyId = SCOPE_IDENTITY();
        
        -- 6. 결과 반환
        SELECT @SubCompanyId AS SubCompanyId;
        
        SET @ResultCode = 0;
        SET @Message = '사업장이 성공적으로 등록되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================
-- 3. 부서 관련 Stored Procedures
-- =============================================

-- 부서 등록
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreateDepartment')
    DROP PROCEDURE x_CreateDepartment;
GO

CREATE PROCEDURE x_CreateDepartment
    @SubCompanyId INT,
    @DeptCode NVARCHAR(20),
    @DeptName NVARCHAR(200),
    @DeptLevel INT = 1,
    @DeptType NVARCHAR(50) = '일반부서',
    @ParentDeptId INT = NULL,
    @CostCenter NVARCHAR(20) = NULL,
    @CreatedBy INT = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @DeptId INT = 0;
    DECLARE @Count INT = 0;
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID가 필요합니다.';
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
        
        -- 2. 사업장 존재 확인
        SELECT @Count = COUNT(*)
        FROM uSubCompanyTb 
        WHERE SubCompanyId = @SubCompanyId AND IsActive = 1;
        
        IF @Count = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 사업장입니다.';
            RETURN;
        END
        
        -- 3. 부서 코드 중복 확인
        SELECT @Count = COUNT(*)
        FROM uDeptTb 
        WHERE DeptCode = @DeptCode;
        
        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 부서 코드입니다.';
            RETURN;
        END
        
        -- 4. 상위 부서 확인
        IF @ParentDeptId IS NOT NULL
        BEGIN
            SELECT @Count = COUNT(*)
            FROM uDeptTb 
            WHERE DeptId = @ParentDeptId 
                AND SubCompanyId = @SubCompanyId 
                AND IsActive = 1;
            
            IF @Count = 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '존재하지 않거나 다른 사업장의 상위 부서입니다.';
                RETURN;
            END
        END
        
        -- 5. 부서 등록
        INSERT INTO uDeptTb (
            SubCompanyId, DeptCode, DeptName, 
            DeptLevel, DeptType, ParentDeptId,
            CostCenter, CreatedBy, CreatedAt
        )
        VALUES (
            @SubCompanyId, @DeptCode, @DeptName,
            @DeptLevel, @DeptType, @ParentDeptId,
            @CostCenter, @CreatedBy, GETDATE()
        );
        
        SET @DeptId = SCOPE_IDENTITY();
        
        -- 6. 결과 반환
        SELECT @DeptId AS DeptId;
        
        SET @ResultCode = 0;
        SET @Message = '부서가 성공적으로 등록되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '부서 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================
-- 4. 직책 관련 Stored Procedures
-- =============================================

-- 직책 등록
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreatePosition')
    DROP PROCEDURE x_CreatePosition;
GO

CREATE PROCEDURE x_CreatePosition
    @DeptId INT,
    @PosCode NVARCHAR(20),
    @PosName NVARCHAR(200),
    @PositionLevel INT = 1,
    @PositionGrade NVARCHAR(20) = NULL,
    @JobTitle NVARCHAR(200) = NULL,
    @JobCategory NVARCHAR(100) = NULL,
    @BaseSalary DECIMAL(15,2) = NULL,
    @MaxHeadcount INT = 1,
    @IsManagerPosition BIT = 0,
    @CreatedBy INT = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @PositionId INT = 0;
    DECLARE @Count INT = 0;
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @DeptId IS NULL OR @DeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 부서 ID가 필요합니다.';
            RETURN;
        END
        
        IF @PosCode IS NULL OR LTRIM(RTRIM(@PosCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '직책 코드는 필수 입력 항목입니다.';
            RETURN;
        END
        
        IF @PosName IS NULL OR LTRIM(RTRIM(@PosName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '직책명은 필수 입력 항목입니다.';
            RETURN;
        END
        
        -- 2. 부서 존재 확인
        SELECT @Count = COUNT(*)
        FROM uDeptTb 
        WHERE DeptId = @DeptId AND IsActive = 1;
        
        IF @Count = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 부서입니다.';
            RETURN;
        END
        
        -- 3. 직책 코드 중복 확인
        SELECT @Count = COUNT(*)
        FROM uPositionTb 
        WHERE PosCode = @PosCode;
        
        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 직책 코드입니다.';
            RETURN;
        END
        
        -- 4. 직책 등록
        INSERT INTO uPositionTb (
            DeptId, PosCode, PosName, PosLevel,
            PosGrade, JobTitle, JobCategory, BaseSalary,
            MaxHeadcount, IsManagerPosition, CreatedBy, CreatedAt
        )
        VALUES (
            @DeptId, @PosCode, @PosName, @PositionLevel,
            @PositionGrade, @JobTitle, @JobCategory, @BaseSalary,
            @MaxHeadcount, @IsManagerPosition, @CreatedBy, GETDATE()
        );
        
        SET @PositionId = SCOPE_IDENTITY();
        
        -- 5. 결과 반환
        SELECT @PositionId AS PositionId;
        
        SET @ResultCode = 0;
        SET @Message = '직책이 성공적으로 등록되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '직책 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================
-- 5. 조직도 조회 Stored Procedures
-- =============================================

-- 전체 조직도 조회
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_GetOrganizationTree')
    DROP PROCEDURE SP_GetOrganizationTree;
GO

CREATE PROCEDURE SP_GetOrganizationTree
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @IncludeInactive BIT = 0,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- 조직도 트리 구조 조회
        SELECT 
            'Company' AS NodeType,
            c.CompanyId AS Id,
            NULL AS ParentId,
            c.CompanyCode AS Code,
            c.CompanyName AS Name,
            1 AS Level,
            c.IsActive,
            0 AS EmployeeCount
        FROM uCompanyTb c
        WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (c.IsActive = 1 OR @IncludeInactive = 1)
            
        UNION ALL
        
        SELECT 
            'WorkSite' AS NodeType,
            ws.SubCompanyId AS Id,
            ws.CompanyId AS ParentId,
            ws.SubCompanyCode AS Code,
            ws.SubCompanyName AS Name,
            2 AS Level,
            ws.IsActive,
            0 AS EmployeeCount
        FROM uSubCompanyTb ws
        INNER JOIN uCompanyTb c ON ws.CompanyId = c.CompanyId
        WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR ws.SubCompanyId = @SubCompanyId)
            AND (ws.IsActive = 1 OR @IncludeInactive = 1)
            AND (c.IsActive = 1 OR @IncludeInactive = 1)
            
        UNION ALL
        
        SELECT 
            'Department' AS NodeType,
            d.DeptId AS Id,
            d.SubCompanyId AS ParentId,
            d.DeptCode AS Code,
            d.DeptName AS Name,
            3 + d.DeptLevel AS Level,
            d.IsActive,
            d.EmployeeCount
        FROM uDeptTb d
        INNER JOIN uSubCompanyTb ws ON d.SubCompanyId = ws.SubCompanyId
        INNER JOIN uCompanyTb c ON ws.CompanyId = c.CompanyId
        WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR ws.SubCompanyId = @SubCompanyId)
            AND (d.IsActive = 1 OR @IncludeInactive = 1)
            AND (ws.IsActive = 1 OR @IncludeInactive = 1)
            AND (c.IsActive = 1 OR @IncludeInactive = 1)
            
        UNION ALL
        
        SELECT 
            'Position' AS NodeType,
            p.PosId AS Id,
            p.DeptId AS ParentId,
            p.PosCode AS Code,
            p.PosName AS Name,
            5 + p.PositionLevel AS Level,
            p.IsActive,
            p.CurrentHeadcount AS EmployeeCount
        FROM uPositionTb p
        INNER JOIN uDeptTb d ON p.DeptId = d.DeptId
        INNER JOIN uSubCompanyTb ws ON d.SubCompanyId = ws.SubCompanyId
        INNER JOIN uCompanyTb c ON ws.CompanyId = c.CompanyId
        WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR ws.SubCompanyId = @SubCompanyId)
            AND (p.IsActive = 1 OR @IncludeInactive = 1)
            AND (d.IsActive = 1 OR @IncludeInactive = 1)
            AND (ws.IsActive = 1 OR @IncludeInactive = 1)
            AND (c.IsActive = 1 OR @IncludeInactive = 1)
        
        ORDER BY Level, Code;
        
        SET @ResultCode = 0;
        SET @Message = '조직도 조회가 완료되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '조직도 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

PRINT '==========================================';
PRINT '✅ 조직도 관리 Stored Procedures 생성 완료';
PRINT '==========================================';
PRINT '📋 생성된 Stored Procedures:';
PRINT '   - x_CreateCompany (회사 등록)';
PRINT '   - x_CreateSubCompany (사업장 등록)';
PRINT '   - x_CreateDepartment (부서 등록)';
PRINT '   - x_CreatePosition (직책 등록)';
PRINT '   - SP_GetOrganizationTree (조직도 조회)';
PRINT '==========================================';
GO