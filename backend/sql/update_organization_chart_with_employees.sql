-- =============================================
-- 사원 정보 포함 조직도 SP 업데이트
-- 회사 > 사업장 > 부서 > 사원(직책포함) 계층구조
-- =============================================

USE hr_system;
GO

-- 기존 SP 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetOrganizationChart'))
    DROP PROCEDURE x_GetOrganizationChart;
GO

-- 사원 정보를 포함한 조직도 SP 생성
CREATE PROCEDURE x_GetOrganizationChart
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @IncludeInactive BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 회사 > 사업장 > 부서 > 사원(직책 포함) 계층구조로 조직도 데이터 조회
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
                 INNER JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
                 WHERE s.CompanyId = c.CompanyId AND e.IsActive = 1) AS MemberCount,
                c.IsActive,
                CAST('/' + CAST(c.CompanyId AS VARCHAR) AS VARCHAR(500)) AS NodePath,
                c.CreatedAt,
                c.CompanyId,
                NULL AS SubCompanyId,
                NULL AS DeptId,
                NULL AS PosId,
                NULL AS EmployeeId,
                NULL AS PositionName
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
                (SELECT COUNT(*) FROM uEmployeeTb e WHERE e.SubCompanyId = s.SubCompanyId AND e.IsActive = 1) AS MemberCount,
                s.IsActive,
                CAST('/' + CAST(s.CompanyId AS VARCHAR) + '/' + CAST(s.SubCompanyId AS VARCHAR) AS VARCHAR(500)) AS NodePath,
                s.CreatedAt,
                s.CompanyId,
                s.SubCompanyId,
                NULL AS DeptId,
                NULL AS PosId,
                NULL AS EmployeeId,
                NULL AS PositionName
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
                (SELECT COUNT(*) FROM uEmployeeTb e WHERE e.DeptId = d.DeptId AND e.IsActive = 1) AS MemberCount,
                d.IsActive,
                CAST('/' + CAST(s.CompanyId AS VARCHAR) + '/' + CAST(d.SubCompanyId AS VARCHAR) + '/' + CAST(d.DeptId AS VARCHAR) AS VARCHAR(500)) AS NodePath,
                d.CreatedAt,
                s.CompanyId,
                d.SubCompanyId,
                d.DeptId,
                NULL AS PosId,
                NULL AS EmployeeId,
                NULL AS PositionName
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
                e.FullName + ISNULL(' (' + p.PosName + ')', '') AS DisplayName,
                0 AS MemberCount,
                e.IsActive,
                CAST('/' + CAST(s.CompanyId AS VARCHAR) + '/' + CAST(d.SubCompanyId AS VARCHAR) + '/' + CAST(e.DeptId AS VARCHAR) + '/' + CAST(e.EmployeeId AS VARCHAR) AS VARCHAR(500)) AS NodePath,
                e.CreatedAt,
                s.CompanyId,
                d.SubCompanyId,
                e.DeptId,
                e.PosId,
                e.EmployeeId,
                p.PosName AS PositionName
            FROM uEmployeeTb e
                INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
                INNER JOIN uSubCompanyTb s ON d.SubCompanyId = s.SubCompanyId
                INNER JOIN uCompanyTb c ON s.CompanyId = c.CompanyId
                LEFT JOIN uPositionTb p ON e.PosId = p.PosId
            WHERE (@CompanyId IS NULL OR s.CompanyId = @CompanyId)
                AND (@SubCompanyId IS NULL OR d.SubCompanyId = @SubCompanyId)
                AND (c.IsActive = 1 OR @IncludeInactive = 1)
                AND (s.IsActive = 1 OR @IncludeInactive = 1)
                AND (d.IsActive = 1 OR @IncludeInactive = 1)
                AND (e.IsActive = 1 OR @IncludeInactive = 1)
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
            PosId,
            EmployeeId,
            PositionName
        FROM OrganizationHierarchy
        ORDER BY Level, CompanyId, SubCompanyId, DeptId, EmployeeId;

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

PRINT '✅ 조직도 SP 업데이트 완료 (사원 및 직책 정보 포함)';
PRINT '   - 계층구조: 회사 > 사업장 > 부서 > 사원(직책포함)';