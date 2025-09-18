-- x_CreateSubCompany 저장 프로시저 (QUOTED_IDENTIFIER 문제 해결)
USE hr_system;
GO

-- 기존 프로시저 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreateSubCompany')
    DROP PROCEDURE x_CreateSubCompany;
GO

-- QUOTED_IDENTIFIER 설정
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
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

PRINT '✅ x_CreateSubCompany 저장 프로시저 재생성 완료!';