-- x_GetSubCompanyById (네이밍 규칙 적용)
USE hr_system;
GO

SET QUOTED_IDENTIFIER ON;
GO

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

PRINT '✅ x_GetSubCompanyById 생성 완료!';