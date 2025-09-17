-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-17
-- 설명: x_UpdateCompany SP의 회사명 중복 체크 로직 수정
-- =============================================

USE hr_system;
GO

-- =============================================
-- 회사 수정 SP 수정 (중복 체크 로직 개선)
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
    @IsActive BIT = NULL,
    @UpdatedBy INT = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Count INT = 0;
    DECLARE @CurrentCompanyName NVARCHAR(200);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 회사 존재 여부 체크 및 현재 회사명 조회
        SELECT @CurrentCompanyName = CompanyName
        FROM uCompanyTb
        WHERE CompanyId = @CompanyId;

        SELECT @Count = COUNT(*)
        FROM uCompanyTb
        WHERE CompanyId = @CompanyId;

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

        -- 회사명 중복 체크 (자신 제외, 회사명이 실제로 변경되는 경우만)
        IF @CompanyName IS NOT NULL AND @CompanyName != @CurrentCompanyName
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
            IsActive = ISNULL(@IsActive, IsActive),
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

PRINT '=== x_UpdateCompany SP 중복 체크 로직 수정 완료 ===';