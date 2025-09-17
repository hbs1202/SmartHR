-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-17
-- 설명: x_GetCompanies Stored Procedure 업데이트 (새로운 필드들 추가)
-- =============================================

USE hr_system;
GO

-- =============================================
-- 회사 목록 조회 SP 업데이트
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_GetCompanies')
    DROP PROCEDURE x_GetCompanies;
GO

CREATE PROCEDURE x_GetCompanies
    @PageNumber INT = 1,           -- 페이지 번호
    @PageSize INT = 20,            -- 페이지 크기
    @IsActive BIT = NULL,          -- 활성 상태 필터
    @SearchKeyword NVARCHAR(100) = NULL,  -- 검색 키워드
    @Offset INT = 0                -- 오프셋
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 파라미터 검증
        IF @PageNumber < 1 SET @PageNumber = 1;
        IF @PageSize < 1 SET @PageSize = 20;
        IF @PageSize > 100 SET @PageSize = 100; -- 최대 100건까지 제한

        SET @Offset = (@PageNumber - 1) * @PageSize;

        -- 전체 회사 조회 및 페이지네이션된 결과를 조회
        SELECT
            c.CompanyId,
            c.CompanyCode,
            c.CompanyName,
            c.CompanyNameEng,
            c.BusinessNumber,
            c.CorporateNumber,      -- 법인번호 추가
            c.CeoName,
            c.EstablishDate,
            c.PostalCode,           -- 우편번호 추가
            c.Address,
            c.AddressDetail,        -- 상세주소 추가
            c.PhoneNumber,
            c.FaxNumber,           -- 팩스번호 추가
            c.Email,
            c.Industry,
            c.BusinessType,        -- 업태 추가
            c.IsActive,
            c.CreatedAt,
            c.UpdatedAt,
            -- 총 개수 추가 (모든 행에 동일한 값)
            COUNT(*) OVER() AS TotalCount
        FROM uCompanyTb c
        WHERE
            (@IsActive IS NULL OR c.IsActive = @IsActive)
            AND (
                @SearchKeyword IS NULL
                OR c.CompanyName LIKE '%' + @SearchKeyword + '%'
                OR c.CompanyCode LIKE '%' + @SearchKeyword + '%'
                OR c.CeoName LIKE '%' + @SearchKeyword + '%'
                OR c.Industry LIKE '%' + @SearchKeyword + '%'
                OR c.BusinessType LIKE '%' + @SearchKeyword + '%'  -- 업태 검색 추가
            )
        ORDER BY c.CompanyId DESC
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY;

    END TRY
    BEGIN CATCH
        -- 오류 로그
        PRINT '=== SP_GetCompanies 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT '================================';

        -- 오류 발생 시 빈 결과 반환
        SELECT
            NULL AS CompanyId,
            NULL AS CompanyCode,
            NULL AS CompanyName,
            NULL AS CompanyNameEng,
            NULL AS BusinessNumber,
            NULL AS CorporateNumber,
            NULL AS CeoName,
            NULL AS EstablishDate,
            NULL AS PostalCode,
            NULL AS Address,
            NULL AS AddressDetail,
            NULL AS PhoneNumber,
            NULL AS FaxNumber,
            NULL AS Email,
            NULL AS Industry,
            NULL AS BusinessType,
            NULL AS IsActive,
            NULL AS CreatedAt,
            NULL AS UpdatedAt,
            0 AS TotalCount
        WHERE 1 = 0; -- 빈 결과 반환
    END CATCH
END;
GO

PRINT '=== x_GetCompanies Stored Procedure 업데이트 완료 ===';