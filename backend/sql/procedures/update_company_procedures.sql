-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-17
-- 설명: 회사 관리 Stored Procedures 업데이트 (우편번호, 상세주소, 법인번호, 업태 필드 추가)
-- =============================================

USE hr_system;
GO

-- =============================================
-- 회사 등록 SP 업데이트
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreateCompany')
    DROP PROCEDURE x_CreateCompany;
GO

CREATE PROCEDURE x_CreateCompany
    @CompanyCode NVARCHAR(20),
    @CompanyName NVARCHAR(200),
    @CompanyNameEng NVARCHAR(200) = NULL,
    @BusinessNumber NVARCHAR(20) = NULL,
    @CorporateNumber NVARCHAR(20) = NULL, -- 법인번호 추가
    @CeoName NVARCHAR(100) = NULL,
    @EstablishDate DATE = NULL,
    @PostalCode NVARCHAR(10) = NULL, -- 우편번호 추가
    @Address NVARCHAR(500) = NULL,
    @AddressDetail NVARCHAR(300) = NULL, -- 상세주소 추가
    @PhoneNumber NVARCHAR(20) = NULL,
    @FaxNumber NVARCHAR(20) = NULL, -- 팩스번호 추가
    @Email NVARCHAR(255) = NULL,
    @Industry NVARCHAR(100) = NULL,
    @BusinessType NVARCHAR(100) = NULL, -- 업태 추가
    @CreatedBy INT = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @CompanyId INT = 0;
    DECLARE @Count INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 회사 코드 중복 체크
        SELECT @Count = COUNT(*) FROM uCompanyTb WHERE CompanyCode = @CompanyCode;
        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 회사 코드입니다.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 회사명 중복 체크
        SELECT @Count = COUNT(*) FROM uCompanyTb WHERE CompanyName = @CompanyName AND IsActive = 1;
        IF @Count > 0
        BEGIN
            SET @ResultCode = -2;
            SET @Message = '이미 존재하는 회사명입니다.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 회사 등록
        INSERT INTO uCompanyTb (
            CompanyCode, CompanyName, CompanyNameEng, BusinessNumber, CorporateNumber,
            CeoName, EstablishDate, PostalCode, Address, AddressDetail,
            PhoneNumber, FaxNumber, Email, Industry, BusinessType,
            IsActive, CreatedAt
        )
        VALUES (
            @CompanyCode, @CompanyName, @CompanyNameEng, @BusinessNumber, @CorporateNumber,
            @CeoName, @EstablishDate, @PostalCode, @Address, @AddressDetail,
            @PhoneNumber, @FaxNumber, @Email, @Industry, @BusinessType,
            1, GETDATE()
        );

        SET @CompanyId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        SET @ResultCode = 0;
        SET @Message = '회사가 성공적으로 등록되었습니다.';

        -- 등록된 회사 정보 반환
        SELECT
            CompanyId, CompanyCode, CompanyName, CompanyNameEng, BusinessNumber, CorporateNumber,
            CeoName, EstablishDate, PostalCode, Address, AddressDetail,
            PhoneNumber, FaxNumber, Email, Industry, BusinessType,
            IsActive, CreatedAt
        FROM uCompanyTb
        WHERE CompanyId = @CompanyId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @ResultCode = -999;
        SET @Message = '회사 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END;
GO

-- =============================================
-- 회사 수정 SP 업데이트
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_UpdateCompany')
    DROP PROCEDURE x_UpdateCompany;
GO

CREATE PROCEDURE x_UpdateCompany
    @CompanyId INT,
    @CompanyCode NVARCHAR(20) = NULL,
    @CompanyName NVARCHAR(200) = NULL,
    @CompanyNameEng NVARCHAR(200) = NULL,
    @BusinessNumber NVARCHAR(20) = NULL,
    @CorporateNumber NVARCHAR(20) = NULL,
    @CeoName NVARCHAR(100) = NULL,
    @EstablishDate DATE = NULL,
    @PostalCode NVARCHAR(10) = NULL,
    @Address NVARCHAR(500) = NULL,
    @AddressDetail NVARCHAR(300) = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @FaxNumber NVARCHAR(20) = NULL,
    @Email NVARCHAR(255) = NULL,
    @Industry NVARCHAR(100) = NULL,
    @BusinessType NVARCHAR(100) = NULL,
    @UpdatedBy INT = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Count INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 회사 존재 여부 체크
        SELECT @Count = COUNT(*) FROM uCompanyTb WHERE CompanyId = @CompanyId AND IsActive = 1;
        IF @Count = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 회사입니다.';
            ROLLBACK TRANSACTION;
            RETURN;
        END

        -- 회사 코드 중복 체크 (자신 제외)
        IF @CompanyCode IS NOT NULL
        BEGIN
            SELECT @Count = COUNT(*) FROM uCompanyTb
            WHERE CompanyCode = @CompanyCode AND CompanyId != @CompanyId;
            IF @Count > 0
            BEGIN
                SET @ResultCode = -2;
                SET @Message = '이미 존재하는 회사 코드입니다.';
                ROLLBACK TRANSACTION;
                RETURN;
            END
        END

        -- 회사명 중복 체크 (자신 제외)
        IF @CompanyName IS NOT NULL
        BEGIN
            SELECT @Count = COUNT(*) FROM uCompanyTb
            WHERE CompanyName = @CompanyName AND CompanyId != @CompanyId AND IsActive = 1;
            IF @Count > 0
            BEGIN
                SET @ResultCode = -3;
                SET @Message = '이미 존재하는 회사명입니다.';
                ROLLBACK TRANSACTION;
                RETURN;
            END
        END

        -- 동적 업데이트
        UPDATE uCompanyTb SET
            CompanyCode = ISNULL(@CompanyCode, CompanyCode),
            CompanyName = ISNULL(@CompanyName, CompanyName),
            CompanyNameEng = @CompanyNameEng,
            BusinessNumber = @BusinessNumber,
            CorporateNumber = @CorporateNumber,
            CeoName = @CeoName,
            EstablishDate = @EstablishDate,
            PostalCode = @PostalCode,
            Address = @Address,
            AddressDetail = @AddressDetail,
            PhoneNumber = @PhoneNumber,
            FaxNumber = @FaxNumber,
            Email = @Email,
            Industry = @Industry,
            BusinessType = @BusinessType,
            UpdatedAt = GETDATE()
        WHERE CompanyId = @CompanyId;

        COMMIT TRANSACTION;

        SET @ResultCode = 0;
        SET @Message = '회사 정보가 성공적으로 수정되었습니다.';

        -- 수정된 회사 정보 반환
        SELECT
            CompanyId, CompanyCode, CompanyName, CompanyNameEng, BusinessNumber, CorporateNumber,
            CeoName, EstablishDate, PostalCode, Address, AddressDetail,
            PhoneNumber, FaxNumber, Email, Industry, BusinessType,
            IsActive, CreatedAt, UpdatedAt
        FROM uCompanyTb
        WHERE CompanyId = @CompanyId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        SET @ResultCode = -999;
        SET @Message = '회사 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END;
GO

PRINT '=== 회사 관리 Stored Procedures 업데이트 완료 ===';