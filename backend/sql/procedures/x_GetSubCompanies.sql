-- x_GetSubCompanies (네이밍 규칙 적용)
USE hr_system;
GO

SET QUOTED_IDENTIFIER ON;
GO

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

PRINT '✅ x_GetSubCompanies 생성 완료!';