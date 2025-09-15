-- =============================================
-- 사업장 관리 관련 Stored Procedures (실제 테이블 구조 기반)
-- 작성자: SmartHR Team
-- 작성일: 2024-09-12
-- =============================================

-- ===========================================
-- SP_GetSubCompanies: 사업장 목록 조회
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_GetSubCompanies')
    DROP PROCEDURE SP_GetSubCompanies;
GO

CREATE PROCEDURE SP_GetSubCompanies
    @CompanyId INT = NULL,
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
            sc.SubCompanyId,
            sc.CompanyId,
            c.CompanyName,
            c.CompanyCode,
            sc.SubCompanyCode,
            sc.SubCompanyName,
            sc.SubCompanyType,
            sc.Address,
            sc.PostalCode,
            sc.PhoneNumber,
            sc.FaxNumber,
            sc.ManagerEmployeeId,
            sc.OpenDate,
            sc.IsHeadquarters,
            sc.IsActive,
            sc.CreatedAt,
            sc.UpdatedAt,
            COUNT(*) OVER() AS TotalCount
        FROM uSubCompanyTb sc
        INNER JOIN uCompanyTb c ON sc.CompanyId = c.CompanyId
        WHERE 
            (@CompanyId IS NULL OR sc.CompanyId = @CompanyId)
            AND (@IsActive IS NULL OR sc.IsActive = @IsActive)
            AND (
                @SearchKeyword IS NULL 
                OR sc.SubCompanyName LIKE '%' + @SearchKeyword + '%'
                OR sc.SubCompanyCode LIKE '%' + @SearchKeyword + '%'
                OR c.CompanyName LIKE '%' + @SearchKeyword + '%'
            )
        ORDER BY sc.SubCompanyId DESC
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY;
        
        SET @ResultCode = 0;
        SET @Message = '사업장 목록을 성공적으로 조회했습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 목록 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ===========================================
-- SP_GetSubCompanyById: 사업장 상세 조회
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_GetSubCompanyById')
    DROP PROCEDURE SP_GetSubCompanyById;
GO

CREATE PROCEDURE SP_GetSubCompanyById
    @SubCompanyId INT,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END
        
        SELECT 
            sc.SubCompanyId,
            sc.CompanyId,
            c.CompanyName,
            c.CompanyCode,
            sc.SubCompanyCode,
            sc.SubCompanyName,
            sc.SubCompanyType,
            sc.Address,
            sc.PostalCode,
            sc.PhoneNumber,
            sc.FaxNumber,
            sc.ManagerEmployeeId,
            sc.OpenDate,
            sc.CloseDate,
            sc.Area,
            sc.FloorCount,
            sc.ParkingSpots,
            sc.Description,
            sc.IsHeadquarters,
            sc.IsActive,
            sc.CreatedAt,
            sc.UpdatedAt,
            sc.CreatedBy,
            sc.UpdatedBy,
            (SELECT COUNT(*) FROM uDeptTb WHERE SubCompanyId = sc.SubCompanyId AND IsActive = 1) AS ActiveDeptCount,
            (SELECT COUNT(*) FROM uDeptTb WHERE SubCompanyId = sc.SubCompanyId) AS TotalDeptCount
        FROM uSubCompanyTb sc
        INNER JOIN uCompanyTb c ON sc.CompanyId = c.CompanyId
        WHERE sc.SubCompanyId = @SubCompanyId;
        
        IF @@ROWCOUNT = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '해당 사업장을 찾을 수 없습니다.';
            RETURN;
        END
        
        SET @ResultCode = 0;
        SET @Message = '사업장 정보를 성공적으로 조회했습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 정보 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ===========================================
-- SP_CreateSubCompany: 사업장 등록
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_CreateSubCompany')
    DROP PROCEDURE SP_CreateSubCompany;
GO

CREATE PROCEDURE SP_CreateSubCompany
    @CompanyId INT,
    @SubCompanyCode NVARCHAR(50),
    @SubCompanyName NVARCHAR(100),
    @SubCompanyType NVARCHAR(50) = '일반사업장',
    @Address NVARCHAR(500) = NULL,
    @PostalCode NVARCHAR(10) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @FaxNumber NVARCHAR(20) = NULL,
    @ManagerEmployeeId INT = NULL,
    @OpenDate DATE = NULL,
    @Area DECIMAL(10,2) = NULL,
    @FloorCount INT = NULL,
    @ParkingSpots INT = NULL,
    @Description NVARCHAR(500) = NULL,
    @IsHeadquarters BIT = 0,
    @CreatedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- 파라미터 검증
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 회사 ID를 입력해주세요.';
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
        
        -- 회사 존재 여부 확인
        IF NOT EXISTS (SELECT 1 FROM uCompanyTb WHERE CompanyId = @CompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않거나 비활성화된 회사입니다.';
            RETURN;
        END
        
        -- 사업장 코드 중복 체크
        IF EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyCode = @SubCompanyCode)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 사업장 코드입니다.';
            RETURN;
        END
        
        -- 사업장 정보 삽입
        INSERT INTO uSubCompanyTb (
            CompanyId, SubCompanyCode, SubCompanyName, SubCompanyType,
            Address, PostalCode, PhoneNumber, FaxNumber, ManagerEmployeeId,
            OpenDate, Area, FloorCount, ParkingSpots, Description,
            IsHeadquarters, IsActive, CreatedAt, CreatedBy
        )
        VALUES (
            @CompanyId, @SubCompanyCode, @SubCompanyName, @SubCompanyType,
            @Address, @PostalCode, @PhoneNumber, @FaxNumber, @ManagerEmployeeId,
            @OpenDate, @Area, @FloorCount, @ParkingSpots, @Description,
            @IsHeadquarters, 1, GETDATE(), @CreatedBy
        );
        
        DECLARE @NewSubCompanyId INT = SCOPE_IDENTITY();
        SELECT @NewSubCompanyId AS SubCompanyId;
        
        SET @ResultCode = 0;
        SET @Message = '사업장이 성공적으로 등록되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ===========================================
-- SP_UpdateSubCompany: 사업장 정보 수정
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_UpdateSubCompany')
    DROP PROCEDURE SP_UpdateSubCompany;
GO

CREATE PROCEDURE SP_UpdateSubCompany
    @SubCompanyId INT,
    @SubCompanyName NVARCHAR(100),
    @SubCompanyType NVARCHAR(50) = NULL,
    @Address NVARCHAR(500) = NULL,
    @PostalCode NVARCHAR(10) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @FaxNumber NVARCHAR(20) = NULL,
    @ManagerEmployeeId INT = NULL,
    @OpenDate DATE = NULL,
    @Area DECIMAL(10,2) = NULL,
    @FloorCount INT = NULL,
    @ParkingSpots INT = NULL,
    @Description NVARCHAR(500) = NULL,
    @IsHeadquarters BIT = NULL,
    @IsActive BIT = NULL,
    @UpdatedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END
        
        IF @SubCompanyName IS NULL OR LTRIM(RTRIM(@SubCompanyName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '사업장명은 필수 입력 항목입니다.';
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '수정할 사업장을 찾을 수 없습니다.';
            RETURN;
        END
        
        UPDATE uSubCompanyTb
        SET 
            SubCompanyName = @SubCompanyName,
            SubCompanyType = CASE WHEN @SubCompanyType IS NOT NULL THEN @SubCompanyType ELSE SubCompanyType END,
            Address = CASE WHEN @Address IS NOT NULL THEN @Address ELSE Address END,
            PostalCode = CASE WHEN @PostalCode IS NOT NULL THEN @PostalCode ELSE PostalCode END,
            PhoneNumber = CASE WHEN @PhoneNumber IS NOT NULL THEN @PhoneNumber ELSE PhoneNumber END,
            FaxNumber = CASE WHEN @FaxNumber IS NOT NULL THEN @FaxNumber ELSE FaxNumber END,
            ManagerEmployeeId = CASE WHEN @ManagerEmployeeId IS NOT NULL THEN @ManagerEmployeeId ELSE ManagerEmployeeId END,
            OpenDate = CASE WHEN @OpenDate IS NOT NULL THEN @OpenDate ELSE OpenDate END,
            Area = CASE WHEN @Area IS NOT NULL THEN @Area ELSE Area END,
            FloorCount = CASE WHEN @FloorCount IS NOT NULL THEN @FloorCount ELSE FloorCount END,
            ParkingSpots = CASE WHEN @ParkingSpots IS NOT NULL THEN @ParkingSpots ELSE ParkingSpots END,
            Description = CASE WHEN @Description IS NOT NULL THEN @Description ELSE Description END,
            IsHeadquarters = CASE WHEN @IsHeadquarters IS NOT NULL THEN @IsHeadquarters ELSE IsHeadquarters END,
            IsActive = CASE WHEN @IsActive IS NOT NULL THEN @IsActive ELSE IsActive END,
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE SubCompanyId = @SubCompanyId;
        
        SET @ResultCode = 0;
        SET @Message = '사업장 정보가 성공적으로 수정되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ===========================================
-- SP_DeleteSubCompany: 사업장 삭제 (소프트 삭제)
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_DeleteSubCompany')
    DROP PROCEDURE SP_DeleteSubCompany;
GO

CREATE PROCEDURE SP_DeleteSubCompany
    @SubCompanyId INT,
    @DeletedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END
        
        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '삭제할 사업장을 찾을 수 없습니다.';
            RETURN;
        END
        
        -- 활성화된 하위 부서가 있는지 확인
        IF EXISTS (SELECT 1 FROM uDeptTb WHERE SubCompanyId = @SubCompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '활성화된 하위 부서가 존재하여 사업장을 삭제할 수 없습니다. 먼저 하위 부서를 삭제해주세요.';
            RETURN;
        END
        
        -- 사업장 소프트 삭제
        UPDATE uSubCompanyTb
        SET 
            IsActive = 0,
            UpdatedAt = GETDATE(),
            UpdatedBy = @DeletedBy
        WHERE SubCompanyId = @SubCompanyId;
        
        -- 하위 부서도 함께 비활성화
        UPDATE uDeptTb
        SET 
            IsActive = 0,
            UpdatedAt = GETDATE(),
            UpdatedBy = @DeletedBy
        WHERE SubCompanyId = @SubCompanyId;
        
        SET @ResultCode = 0;
        SET @Message = '사업장이 성공적으로 삭제되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 삭제 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

PRINT '사업장 관리 관련 Stored Procedures 생성 완료!';