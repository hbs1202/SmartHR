-- x_UpdateSubCompany 최종 수정 (네이밍 규칙 적용 + QUOTED_IDENTIFIER 문제 해결)
USE hr_system;
GO

SET QUOTED_IDENTIFIER ON;
GO

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

PRINT '✅ x_UpdateSubCompany 생성 완료!';