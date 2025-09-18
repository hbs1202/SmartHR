-- ==============================================
-- 사업장 관리 SP 네이밍 규칙 적용 배포 스크립트
-- SP_ → x_ 네이밍 규칙 적용
-- 작성일: 2025-01-18
-- ==============================================

USE hr_system;
GO

PRINT '🚀 사업장 관리 SP 네이밍 규칙 적용 배포 시작...';
PRINT '';

-- ==============================================
-- 1. x_CreateSubCompany 배포
-- ==============================================
PRINT '1️⃣ x_CreateSubCompany 배포 중...';

SET QUOTED_IDENTIFIER ON;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreateSubCompany')
    DROP PROCEDURE x_CreateSubCompany;
GO

CREATE PROCEDURE x_CreateSubCompany
    @CompanyId INT,
    @SubCompanyCode NVARCHAR(50),
    @SubCompanyName NVARCHAR(100),
    @BusinessNumber NVARCHAR(20) = NULL,
    @CeoName NVARCHAR(100) = NULL,
    @Industry NVARCHAR(200) = NULL,
    @BusinessType NVARCHAR(200) = NULL,
    @SubCompanyType NVARCHAR(50) = '일반사업장',
    @Address NVARCHAR(500) = NULL,
    @AddressDetail NVARCHAR(500) = NULL,
    @PostalCode NVARCHAR(10) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @FaxNumber NVARCHAR(20) = NULL,
    @Email NVARCHAR(200) = NULL,
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
    SET QUOTED_IDENTIFIER ON;

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
            CompanyId, SubCompanyCode, SubCompanyName, BusinessNumber, CeoName,
            Industry, BusinessType, SubCompanyType,
            Address, AddressDetail, PostalCode, PhoneNumber, FaxNumber, Email,
            ManagerEmployeeId, OpenDate, Area, FloorCount, ParkingSpots, Description,
            IsHeadquarters, IsActive, CreatedAt, CreatedBy
        )
        VALUES (
            @CompanyId, @SubCompanyCode, @SubCompanyName, @BusinessNumber, @CeoName,
            @Industry, @BusinessType, @SubCompanyType,
            @Address, @AddressDetail, @PostalCode, @PhoneNumber, @FaxNumber, @Email,
            @ManagerEmployeeId, @OpenDate, @Area, @FloorCount, @ParkingSpots, @Description,
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

PRINT '✅ x_CreateSubCompany 배포 완료!';
PRINT '';

-- ==============================================
-- 2. x_UpdateSubCompany 배포
-- ==============================================
PRINT '2️⃣ x_UpdateSubCompany 배포 중...';

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_UpdateSubCompany')
    DROP PROCEDURE x_UpdateSubCompany;
GO

CREATE PROCEDURE x_UpdateSubCompany
    @SubCompanyId INT,
    @SubCompanyName NVARCHAR(100),
    @BusinessNumber NVARCHAR(20) = NULL,
    @CeoName NVARCHAR(100) = NULL,
    @Industry NVARCHAR(200) = NULL,
    @BusinessType NVARCHAR(200) = NULL,
    @SubCompanyType NVARCHAR(50) = NULL,
    @Address NVARCHAR(500) = NULL,
    @AddressDetail NVARCHAR(500) = NULL,
    @PostalCode NVARCHAR(10) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @FaxNumber NVARCHAR(20) = NULL,
    @Email NVARCHAR(200) = NULL,
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
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        -- 사업장 존재 여부 확인
        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '수정할 사업장을 찾을 수 없습니다.';
            RETURN;
        END

        -- 사업장 정보 수정
        UPDATE uSubCompanyTb
        SET
            SubCompanyName = @SubCompanyName,
            BusinessNumber = ISNULL(@BusinessNumber, BusinessNumber),
            CeoName = ISNULL(@CeoName, CeoName),
            Industry = ISNULL(@Industry, Industry),
            BusinessType = ISNULL(@BusinessType, BusinessType),
            SubCompanyType = ISNULL(@SubCompanyType, SubCompanyType),
            Address = ISNULL(@Address, Address),
            AddressDetail = ISNULL(@AddressDetail, AddressDetail),
            PostalCode = ISNULL(@PostalCode, PostalCode),
            PhoneNumber = ISNULL(@PhoneNumber, PhoneNumber),
            FaxNumber = ISNULL(@FaxNumber, FaxNumber),
            Email = ISNULL(@Email, Email),
            ManagerEmployeeId = ISNULL(@ManagerEmployeeId, ManagerEmployeeId),
            OpenDate = ISNULL(@OpenDate, OpenDate),
            Area = ISNULL(@Area, Area),
            FloorCount = ISNULL(@FloorCount, FloorCount),
            ParkingSpots = ISNULL(@ParkingSpots, ParkingSpots),
            Description = ISNULL(@Description, Description),
            IsHeadquarters = ISNULL(@IsHeadquarters, IsHeadquarters),
            IsActive = ISNULL(@IsActive, IsActive),
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

PRINT '✅ x_UpdateSubCompany 배포 완료!';
PRINT '';

-- ==============================================
-- 3. x_GetSubCompanies 배포
-- ==============================================
PRINT '3️⃣ x_GetSubCompanies 배포 중...';

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_GetSubCompanies')
    DROP PROCEDURE x_GetSubCompanies;
GO

CREATE PROCEDURE x_GetSubCompanies
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
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;

        SELECT
            sc.SubCompanyId,
            sc.CompanyId,
            c.CompanyName,
            c.CompanyCode,
            sc.SubCompanyCode,
            sc.SubCompanyName,
            sc.BusinessNumber,
            sc.CeoName,
            sc.Industry,
            sc.BusinessType,
            sc.SubCompanyType,
            sc.Address,
            sc.AddressDetail,
            sc.PostalCode,
            sc.PhoneNumber,
            sc.FaxNumber,
            sc.Email,
            sc.ManagerEmployeeId,
            sc.OpenDate,
            sc.Area,
            sc.FloorCount,
            sc.ParkingSpots,
            sc.Description,
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

PRINT '✅ x_GetSubCompanies 배포 완료!';
PRINT '';

-- ==============================================
-- 4. x_GetSubCompanyById 배포
-- ==============================================
PRINT '4️⃣ x_GetSubCompanyById 배포 중...';

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_GetSubCompanyById')
    DROP PROCEDURE x_GetSubCompanyById;
GO

CREATE PROCEDURE x_GetSubCompanyById
    @SubCompanyId INT,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        -- 파라미터 검증
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END

        -- 사업장 상세 정보 조회
        SELECT
            sc.SubCompanyId,
            sc.CompanyId,
            c.CompanyName,
            c.CompanyCode,
            sc.SubCompanyCode,
            sc.SubCompanyName,
            sc.BusinessNumber,
            sc.CeoName,
            sc.Industry,
            sc.BusinessType,
            sc.SubCompanyType,
            sc.Address,
            sc.AddressDetail,
            sc.PostalCode,
            sc.PhoneNumber,
            sc.FaxNumber,
            sc.Email,
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

        -- 결과 확인
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

PRINT '✅ x_GetSubCompanyById 배포 완료!';
PRINT '';

-- ==============================================
-- 배포 완료 메시지
-- ==============================================
PRINT '';
PRINT '🎉 사업장 관리 SP 네이밍 규칙 적용 배포 완료!';
PRINT '';
PRINT '✅ 배포된 SP 목록:';
PRINT '   1. x_CreateSubCompany';
PRINT '   2. x_UpdateSubCompany';
PRINT '   3. x_GetSubCompanies';
PRINT '   4. x_GetSubCompanyById';
PRINT '';
PRINT '📋 네이밍 규칙: x_ 접두사 사용';
PRINT '📋 QUOTED_IDENTIFIER ON 설정 완료';
PRINT '📋 모든 신규 필드 지원 (BusinessNumber, CeoName, Industry, BusinessType, AddressDetail, Email)';
PRINT '';
PRINT '🚀 백엔드 컨트롤러에서 새로운 SP 이름으로 호출 가능!';