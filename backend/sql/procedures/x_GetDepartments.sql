-- x_GetDepartments 저장 프로시저
USE hr_system;
GO

-- 기존 프로시저 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_GetDepartments')
    DROP PROCEDURE x_GetDepartments;
GO

-- QUOTED_IDENTIFIER 설정
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE PROCEDURE x_GetDepartments
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
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
            d.DeptId,
            d.SubCompanyId,
            sc.SubCompanyName,
            sc.CompanyId,
            c.CompanyName,
            d.DeptCode,
            d.DeptName,
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
            (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR d.SubCompanyId = @SubCompanyId)
            AND (@IsActive IS NULL OR d.IsActive = @IsActive)
            AND (
                @SearchKeyword IS NULL
                OR d.DeptName LIKE '%' + @SearchKeyword + '%'
                OR d.DeptCode LIKE '%' + @SearchKeyword + '%'
                OR sc.SubCompanyName LIKE '%' + @SearchKeyword + '%'
                OR c.CompanyName LIKE '%' + @SearchKeyword + '%'
            )
        ORDER BY c.CompanyName, sc.SubCompanyName, d.DeptLevel, d.DeptCode
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

PRINT '✅ x_GetDepartments 저장 프로시저 생성 완료!';