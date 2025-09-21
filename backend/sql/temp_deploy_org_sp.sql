-- 임시 조직도 SP 배포 스크립트
-- x_ 접두사를 사용한 새로운 SP들 생성

USE hr_system;
GO

-- 1. 기존 SP 삭제 (있다면)
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetOrganizationChart'))
    DROP PROCEDURE x_GetOrganizationChart;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetDepartmentHierarchy'))
    DROP PROCEDURE x_GetDepartmentHierarchy;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetOrganizationStats'))
    DROP PROCEDURE x_GetOrganizationStats;
GO

-- 2. 간단한 테스트용 SP 생성
CREATE PROCEDURE x_GetOrganizationChart
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 테스트용 간단한 데이터 반환
        SELECT
            'company' AS NodeType,
            '1' AS NodeId,
            '테스트 회사' AS NodeName,
            'TEST01' AS NodeCode,
            NULL AS ParentId,
            1 AS Level,
            '테스트 회사' AS DisplayName,
            10 AS MemberCount,
            1 AS IsActive,
            '/1' AS NodePath,
            GETDATE() AS CreatedAt,
            1 AS CompanyId,
            NULL AS SubCompanyId,
            NULL AS DeptId,
            NULL AS PosId

        UNION ALL

        SELECT
            'department' AS NodeType,
            '1_1' AS NodeId,
            '개발팀' AS NodeName,
            'DEV01' AS NodeCode,
            '1' AS ParentId,
            2 AS Level,
            '개발팀' AS DisplayName,
            5 AS MemberCount,
            1 AS IsActive,
            '/1/1' AS NodePath,
            GETDATE() AS CreatedAt,
            1 AS CompanyId,
            NULL AS SubCompanyId,
            1 AS DeptId,
            NULL AS PosId;

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine;
    END CATCH
END;
GO

CREATE PROCEDURE x_GetDepartmentHierarchy
    @DeptId INT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 테스트용 데이터
        SELECT
            @DeptId AS DeptId,
            '개발팀' AS DeptName,
            'DEV01' AS DeptCode,
            1 AS DeptLevel,
            NULL AS ParentDeptId,
            0 AS Depth,
            '/1' AS DeptPath,
            5 AS EmployeeCount,
            1 AS IsActive,
            '[]' AS Positions;

    END TRY
    BEGIN CATCH
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine;
    END CATCH
END;
GO

CREATE PROCEDURE x_GetOrganizationStats
    @CompanyId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT
            1 AS TotalCompanies,
            0 AS TotalSubCompanies,
            2 AS TotalDepartments,
            0 AS TotalPositions,
            10 AS TotalEmployees,
            '[]' AS TopDepartmentsBySize;

    END TRY
    BEGIN CATCH
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine;
    END CATCH
END;
GO

PRINT '✅ 테스트용 조직도 SP 생성 완료';
PRINT '   - x_GetOrganizationChart: 조직도 계층구조 조회';
PRINT '   - x_GetDepartmentHierarchy: 부서 계층구조 조회';
PRINT '   - x_GetOrganizationStats: 조직도 통계 정보 조회';