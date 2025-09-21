-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-19
-- 설명: 조직도 데이터 조회 Stored Procedures
-- =============================================

USE hr_system;
GO

-- 1. 조직도 전체 데이터 조회 (계층구조)
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetOrganizationChart'))
    DROP PROCEDURE x_GetOrganizationChart;
GO

CREATE PROCEDURE x_GetOrganizationChart
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 회사 > 사업장 > 부서 > 직책 계층구조로 조직도 데이터 조회
        WITH OrganizationHierarchy AS (
            -- 회사 레벨 (Level 1)
            SELECT
                'company' AS NodeType,
                CAST(c.CompanyId AS VARCHAR(50)) AS NodeId,
                c.CompanyName AS NodeName,
                c.CompanyCode AS NodeCode,
                NULL AS ParentId,
                1 AS Level,
                c.CompanyName AS DisplayName,
                (SELECT COUNT(*) FROM uEmployeeTb e
                 INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
                 INNER JOIN uSubCompanyTb sc ON d.SubCompanyId = sc.SubCompanyId
                 WHERE sc.CompanyId = c.CompanyId AND e.IsActive = 1 AND e.RetireDate IS NULL) AS MemberCount,
                c.IsActive,
                CAST('/' + CAST(c.CompanyId AS VARCHAR) AS VARCHAR(500)) AS NodePath,
                c.CreatedAt,
                c.CompanyId,
                NULL AS SubCompanyId,
                NULL AS DeptId,
                NULL AS PosId
            FROM uCompanyTb c
            WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
                AND (c.IsActive = 1 OR @IncludeInactive = 1)

            UNION ALL

            -- 사업장 레벨 (Level 2)
            SELECT
                'subcompany' AS NodeType,
                CAST(s.CompanyId AS VARCHAR) + '_' + CAST(s.SubCompanyId AS VARCHAR) AS NodeId,
                s.SubCompanyName AS NodeName,
                s.SubCompanyCode AS NodeCode,
                CAST(s.CompanyId AS VARCHAR(50)) AS ParentId,
                2 AS Level,
                s.SubCompanyName + ' (' + s.SubCompanyType + ')' AS DisplayName,
                (SELECT COUNT(*) FROM uEmployeeTb e
                 INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
                 WHERE d.SubCompanyId = s.SubCompanyId AND e.IsActive = 1 AND e.RetireDate IS NULL) AS MemberCount,
                s.IsActive,
                CAST('/' + CAST(s.CompanyId AS VARCHAR) + '/' + CAST(s.SubCompanyId AS VARCHAR) AS VARCHAR(500)) AS NodePath,
                s.CreatedAt,
                s.CompanyId,
                s.SubCompanyId,
                NULL AS DeptId,
                NULL AS PosId
            FROM uSubCompanyTb s
                INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
            WHERE (@CompanyId IS NULL OR s.CompanyId = @CompanyId)
                AND (@SubCompanyId IS NULL OR s.SubCompanyId = @SubCompanyId)
                AND (c.IsActive = 1 OR @IncludeInactive = 1)
                AND (s.IsActive = 1 OR @IncludeInactive = 1)

            UNION ALL

            -- 부서 레벨 (Level 3)
            SELECT
                'department' AS NodeType,
                CAST(d.SubCompanyId AS VARCHAR) + '_' + CAST(d.DeptId AS VARCHAR) AS NodeId,
                d.DeptName AS NodeName,
                d.DeptCode AS NodeCode,
                CAST(s.CompanyId AS VARCHAR) + '_' + CAST(d.SubCompanyId AS VARCHAR) AS ParentId,
                3 AS Level,
                d.DeptName AS DisplayName,
                (SELECT COUNT(*) FROM uEmployeeTb e WHERE e.DeptId = d.DeptId AND e.IsActive = 1 AND e.RetireDate IS NULL) AS MemberCount,
                d.IsActive,
                CAST('/' + CAST(s.CompanyId AS VARCHAR) + '/' + CAST(d.SubCompanyId AS VARCHAR) + '/' + CAST(d.DeptId AS VARCHAR) AS VARCHAR(500)) AS NodePath,
                d.CreatedAt,
                s.CompanyId,
                d.SubCompanyId,
                d.DeptId,
                NULL AS PosId
            FROM uDeptTb d
                INNER JOIN uSubCompanyTb s ON d.SubCompanyId = s.SubCompanyId
                INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
            WHERE (@CompanyId IS NULL OR s.CompanyId = @CompanyId)
                AND (@SubCompanyId IS NULL OR d.SubCompanyId = @SubCompanyId)
                AND (c.IsActive = 1 OR @IncludeInactive = 1)
                AND (s.IsActive = 1 OR @IncludeInactive = 1)
                AND (d.IsActive = 1 OR @IncludeInactive = 1)

            UNION ALL

            -- 사원 레벨 (Level 4) - 직책 정보 포함
            SELECT
                'employee' AS NodeType,
                CAST(e.DeptId AS VARCHAR) + '_' + CAST(e.EmployeeId AS VARCHAR) AS NodeId,
                e.FullName AS NodeName,
                e.EmployeeCode AS NodeCode,
                CAST(d.SubCompanyId AS VARCHAR) + '_' + CAST(e.DeptId AS VARCHAR) AS ParentId,
                4 AS Level,
                e.FullName + ' (' + p.PosName + ISNULL(' ' + p.PosGrade, '') + ')' AS DisplayName,
                1 AS MemberCount,
                e.IsActive,
                CAST('/' + CAST(s.CompanyId AS VARCHAR) + '/' + CAST(d.SubCompanyId AS VARCHAR) + '/' + CAST(e.DeptId AS VARCHAR) + '/' + CAST(e.EmployeeId AS VARCHAR) AS VARCHAR(500)) AS NodePath,
                e.CreatedAt,
                s.CompanyId,
                d.SubCompanyId,
                e.DeptId,
                e.PosId
            FROM uEmployeeTb e
                INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
                INNER JOIN uSubCompanyTb s ON d.SubCompanyId = s.SubCompanyId
                INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
                INNER JOIN uPositionTb p ON e.PosId = p.PosId
            WHERE (@CompanyId IS NULL OR s.CompanyId = @CompanyId)
                AND (@SubCompanyId IS NULL OR d.SubCompanyId = @SubCompanyId)
                AND (c.IsActive = 1 OR @IncludeInactive = 1)
                AND (s.IsActive = 1 OR @IncludeInactive = 1)
                AND (d.IsActive = 1 OR @IncludeInactive = 1)
                AND (e.IsActive = 1 OR @IncludeInactive = 1)
                AND e.RetireDate IS NULL -- 퇴사하지 않은 직원만
        )

        SELECT
            NodeType,
            NodeId,
            NodeName,
            NodeCode,
            ParentId,
            Level,
            DisplayName,
            MemberCount,
            IsActive,
            NodePath,
            CreatedAt,
            CompanyId,
            SubCompanyId,
            DeptId,
            PosId
        FROM OrganizationHierarchy
        ORDER BY Level, CompanyId, SubCompanyId, DeptId, PosId;

    END TRY
    BEGIN CATCH
        -- 에러 정보 반환
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine;
    END CATCH
END;
GO

-- 2. 특정 부서의 하위 조직 조회
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetDepartmentHierarchy'))
    DROP PROCEDURE x_GetDepartmentHierarchy;
GO

CREATE PROCEDURE x_GetDepartmentHierarchy
    @DeptId INT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 재귀 CTE를 사용하여 부서 계층구조 조회
        WITH DepartmentHierarchy AS (
            -- 시작점: 지정된 부서
            SELECT
                d.DeptId,
                d.DeptName,
                d.DeptCode,
                d.DeptLevel,
                d.ParentDeptId,
                0 AS Depth,
                CAST('/' + CAST(d.DeptId AS VARCHAR) AS VARCHAR(500)) AS DeptPath,
                d.EmployeeCount,
                d.IsActive
            FROM uDeptTb d
            WHERE d.DeptId = @DeptId

            UNION ALL

            -- 재귀: 하위 부서들
            SELECT
                d.DeptId,
                d.DeptName,
                d.DeptCode,
                d.DeptLevel,
                d.ParentDeptId,
                h.Depth + 1 AS Depth,
                CAST(h.DeptPath + '/' + CAST(d.DeptId AS VARCHAR) AS VARCHAR(500)) AS DeptPath,
                d.EmployeeCount,
                d.IsActive
            FROM uDeptTb d
                INNER JOIN DepartmentHierarchy h ON d.ParentDeptId = h.DeptId
            WHERE d.IsActive = 1
        )

        SELECT
            dh.*,
            -- 직책 정보도 함께 조회
            (
                SELECT
                    p.PosId,
                    p.PosName,
                    p.PosCode,
                    p.PosGrade,
                    p.CurrentHeadcount,
                    p.MaxHeadcount
                FROM uPositionTb p
                WHERE p.DeptId = dh.DeptId AND p.IsActive = 1
                FOR JSON PATH
            ) AS Positions
        FROM DepartmentHierarchy dh
        ORDER BY dh.Depth, dh.DeptLevel, dh.DeptName;

    END TRY
    BEGIN CATCH
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine;
    END CATCH
END;
GO

-- 3. 조직도 통계 정보 조회
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetOrganizationStats'))
    DROP PROCEDURE x_GetOrganizationStats;
GO

CREATE PROCEDURE x_GetOrganizationStats
    @CompanyId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT
            -- 기본 통계
            (SELECT COUNT(*) FROM uCompanyTb WHERE IsActive = 1 AND (@CompanyId IS NULL OR CompanyId = @CompanyId)) AS TotalCompanies,
            (SELECT COUNT(*) FROM uSubCompanyTb s
             INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
             WHERE s.IsActive = 1 AND c.IsActive = 1 AND (@CompanyId IS NULL OR c.CompanyId = @CompanyId)) AS TotalSubCompanies,
            (SELECT COUNT(*) FROM uDeptTb d
             INNER JOIN uSubCompanyTb s ON d.SubCompanyId = s.SubCompanyId
             INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
             WHERE d.IsActive = 1 AND s.IsActive = 1 AND c.IsActive = 1 AND (@CompanyId IS NULL OR c.CompanyId = @CompanyId)) AS TotalDepartments,
            (SELECT COUNT(*) FROM uPositionTb p
             INNER JOIN uDeptTb d ON p.DeptId = d.DeptId
             INNER JOIN uSubCompanyTb s ON d.SubCompanyId = s.SubCompanyId
             INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
             WHERE p.IsActive = 1 AND d.IsActive = 1 AND s.IsActive = 1 AND c.IsActive = 1 AND (@CompanyId IS NULL OR c.CompanyId = @CompanyId)) AS TotalPositions,

            -- 직원 통계
            (SELECT COUNT(*) FROM uEmployeeTb e
             INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
             INNER JOIN uSubCompanyTb s ON d.SubCompanyId = s.SubCompanyId
             INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL AND c.IsActive = 1 AND (@CompanyId IS NULL OR c.CompanyId = @CompanyId)) AS TotalEmployees,

            -- 부서별 직원수 Top 5
            (
                SELECT TOP 5
                    d.DeptName,
                    COUNT(e.EmployeeId) AS EmployeeCount
                FROM uDeptTb d
                    INNER JOIN uSubCompanyTb s ON d.SubCompanyId = s.SubCompanyId
                    INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
                    LEFT JOIN uEmployeeTb e ON d.DeptId = e.DeptId AND e.IsActive = 1 AND e.RetireDate IS NULL
                WHERE d.IsActive = 1 AND s.IsActive = 1 AND c.IsActive = 1
                    AND (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
                GROUP BY d.DeptName
                ORDER BY COUNT(e.EmployeeId) DESC
                FOR JSON PATH
            ) AS TopDepartmentsBySize;

    END TRY
    BEGIN CATCH
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine;
    END CATCH
END;
GO

PRINT '✅ 조직도 관련 Stored Procedures 생성 완료';
PRINT '   - x_GetOrganizationChart: 전체 조직도 계층구조 조회';
PRINT '   - x_GetDepartmentHierarchy: 특정 부서 하위 조직 조회';
PRINT '   - x_GetOrganizationStats: 조직도 통계 정보 조회';