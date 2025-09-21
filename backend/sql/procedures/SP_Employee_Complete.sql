-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2025-01-19
-- 설명: 직원 관리 통합 Stored Procedures
-- 버전: v2.0 - 직원관리 시스템 전용
-- =============================================

USE hr_system;
GO

-- =============================================
-- 1. 직원 목록 조회 SP (페이징, 필터, 검색)
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetEmployees'))
    DROP PROCEDURE x_GetEmployees;
GO

CREATE PROCEDURE x_GetEmployees
    @Page INT = 1,
    @PageSize INT = 20,
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @DeptId INT = NULL,
    @PosId INT = NULL,
    @EmploymentType NVARCHAR(50) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @IsActive BIT = 1,
    @SearchTerm NVARCHAR(100) = NULL,
    @RequestingUserId INT = NULL,      -- 요청하는 사용자 ID (권한 체크용)
    @RequestingUserRole NVARCHAR(50) = NULL    -- 요청하는 사용자 역할
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 변수 선언
        DECLARE @Offset INT = (@Page - 1) * @PageSize;
        DECLARE @TotalCount INT = 0;
        DECLARE @RequestingUserDeptId INT = NULL;

        -- 권한별 데이터 접근 제어
        IF @RequestingUserRole = 'manager'
        BEGIN
            -- Manager는 본인 부서 직원만 조회 가능
            SELECT @RequestingUserDeptId = DeptId
            FROM uEmployeeTb
            WHERE EmployeeId = @RequestingUserId AND IsActive = 1;

            SET @DeptId = @RequestingUserDeptId;
        END
        ELSE IF @RequestingUserRole = 'employee'
        BEGIN
            -- Employee는 본인만 조회 가능 (목록 조회 불가)
            SET @RequestingUserId = @RequestingUserId;
        END
        -- Admin은 모든 데이터 접근 가능

        -- 검색 조건 준비
        SET @SearchTerm = LTRIM(RTRIM(@SearchTerm));
        IF @SearchTerm = '' SET @SearchTerm = NULL;

        -- 메인 쿼리 (CTE 사용)
        WITH EmployeeData AS (
            SELECT
                e.EmployeeId,
                e.EmployeeCode,
                e.Email,
                e.FullName,
                e.FirstName,
                e.LastName,
                e.NameEng,
                e.Gender,
                e.BirthDate,
                e.PhoneNumber,
                e.HireDate,
                e.RetireDate,
                e.EmploymentType,
                e.CurrentSalary,
                e.UserRole,
                e.IsActive,

                -- 조직 정보
                c.CompanyId,
                c.CompanyName,
                c.CompanyCode,
                s.SubCompanyId,
                s.SubCompanyName,
                s.SubCompanyCode,
                d.DeptId,
                d.DeptName,
                d.DeptCode,
                p.PosId,
                p.PosName,
                p.PosCode,
                p.PosGrade,

                -- 계산 필드
                CASE
                    WHEN e.RetireDate IS NOT NULL THEN N'퇴사'
                    WHEN e.IsActive = 1 THEN N'재직'
                    ELSE N'비활성'
                END AS EmploymentStatus,

                CASE
                    WHEN e.BirthDate IS NOT NULL
                    THEN DATEDIFF(YEAR, e.BirthDate, GETDATE())
                    ELSE NULL
                END AS Age,

                CASE
                    WHEN e.RetireDate IS NULL
                    THEN DATEDIFF(YEAR, e.HireDate, GETDATE())
                    ELSE DATEDIFF(YEAR, e.HireDate, e.RetireDate)
                END AS CareerYears,

                -- 조직 경로
                c.CompanyName + ' > ' + s.SubCompanyName + ' > ' + d.DeptName + ' > ' + p.PosName AS OrganizationPath,

                e.CreatedAt,
                e.UpdatedAt,
                e.LastLoginAt

            FROM uEmployeeTb e
                INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
                INNER JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
                INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
                INNER JOIN uPositionTb p ON e.PosId = p.PosId
            WHERE 1=1
                -- 권한별 필터링
                AND (@RequestingUserRole = 'admin'
                     OR (@RequestingUserRole = 'manager' AND e.DeptId = @RequestingUserDeptId)
                     OR (@RequestingUserRole = 'employee' AND e.EmployeeId = @RequestingUserId))

                -- 기본 필터
                AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
                AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
                AND (@DeptId IS NULL OR e.DeptId = @DeptId)
                AND (@PosId IS NULL OR e.PosId = @PosId)
                AND (@EmploymentType IS NULL OR e.EmploymentType = @EmploymentType)
                AND (@UserRole IS NULL OR e.UserRole = @UserRole)
                AND (@IsActive IS NULL OR e.IsActive = @IsActive)

                -- 검색 조건
                AND (@SearchTerm IS NULL OR
                     e.FullName LIKE '%' + @SearchTerm + '%' OR
                     e.EmployeeCode LIKE '%' + @SearchTerm + '%' OR
                     e.Email LIKE '%' + @SearchTerm + '%' OR
                     e.PhoneNumber LIKE '%' + @SearchTerm + '%' OR
                     d.DeptName LIKE '%' + @SearchTerm + '%' OR
                     p.PosName LIKE '%' + @SearchTerm + '%')
        ),

        -- 페이징과 총 개수를 함께 계산
        PagedData AS (
            SELECT *,
                   ROW_NUMBER() OVER (ORDER BY EmployeeCode) as RowNum,
                   COUNT(*) OVER() as TotalCount
            FROM EmployeeData
        )

        -- 페이징된 결과 반환 (CTE 한 번만 사용)
        SELECT *,
               @Page AS CurrentPage,
               @PageSize AS PageSize,
               CEILING(CAST(TotalCount AS FLOAT) / @PageSize) AS TotalPages
        FROM PagedData
        WHERE RowNum > @Offset AND RowNum <= (@Offset + @PageSize)
        ORDER BY EmployeeCode;

    END TRY
    BEGIN CATCH
        -- 에러 정보 반환
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine,
            'x_GetEmployees' AS ProcedureName;
    END CATCH
END;
GO

-- =============================================
-- 2. 직원 상세 조회 SP
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetEmployeeById'))
    DROP PROCEDURE x_GetEmployeeById;
GO

CREATE PROCEDURE x_GetEmployeeById
    @EmployeeId INT,
    @RequestingUserId INT = NULL,
    @RequestingUserRole NVARCHAR(50) = NULL,
    @IncludeSalary BIT = 0,        -- 급여 정보 포함 여부
    @IncludePersonalInfo BIT = 0   -- 개인정보 포함 여부
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 권한 검증
        DECLARE @RequestingUserDeptId INT = NULL;
        DECLARE @TargetEmployeeDeptId INT = NULL;
        DECLARE @CanAccess BIT = 0;

        -- 요청자 부서 정보 조회
        IF @RequestingUserRole = 'manager'
        BEGIN
            SELECT @RequestingUserDeptId = DeptId
            FROM uEmployeeTb
            WHERE EmployeeId = @RequestingUserId AND IsActive = 1;
        END

        -- 대상 직원 부서 정보 조회
        SELECT @TargetEmployeeDeptId = DeptId
        FROM uEmployeeTb
        WHERE EmployeeId = @EmployeeId;

        -- 접근 권한 확인
        IF @RequestingUserRole = 'admin'
            SET @CanAccess = 1;
        ELSE IF @RequestingUserRole = 'manager' AND @RequestingUserDeptId = @TargetEmployeeDeptId
            SET @CanAccess = 1;
        ELSE IF @RequestingUserRole = 'employee' AND @RequestingUserId = @EmployeeId
            SET @CanAccess = 1;

        IF @CanAccess = 0
        BEGIN
            SELECT 'UNAUTHORIZED' AS ErrorCode, '접근 권한이 없습니다.' AS ErrorMessage;
            RETURN;
        END

        -- 메인 조회
        SELECT
            e.EmployeeId,
            e.EmployeeCode,
            e.Email,
            e.FullName,
            e.FirstName,
            e.LastName,
            e.NameEng,

            -- 개인정보 (권한에 따라 마스킹)
            CASE
                WHEN @IncludePersonalInfo = 1 OR @RequestingUserId = @EmployeeId
                THEN e.Gender
                ELSE NULL
            END AS Gender,

            CASE
                WHEN @IncludePersonalInfo = 1 OR @RequestingUserId = @EmployeeId
                THEN e.BirthDate
                ELSE NULL
            END AS BirthDate,

            e.PhoneNumber,


            -- 근무 정보
            e.HireDate,
            e.RetireDate,
            e.EmploymentType,

            -- 급여 정보 (권한 확인)
            CASE
                WHEN @IncludeSalary = 1 AND (@RequestingUserRole = 'admin' OR @RequestingUserId = @EmployeeId)
                THEN e.CurrentSalary
                ELSE NULL
            END AS CurrentSalary,


            e.UserRole,
            e.IsActive,

            -- 조직 정보
            c.CompanyId,
            c.CompanyName,
            c.CompanyCode,
            s.SubCompanyId,
            s.SubCompanyName,
            s.SubCompanyCode,
            d.DeptId,
            d.DeptName,
            d.DeptCode,
            p.PosId,
            p.PosName,
            p.PosCode,
            p.PosGrade,
            p.JobTitle,

            -- 계산 필드
            CASE
                WHEN e.RetireDate IS NOT NULL THEN N'퇴사'
                WHEN e.IsActive = 1 THEN N'재직'
                ELSE N'비활성'
            END AS EmploymentStatus,

            CASE
                WHEN e.BirthDate IS NOT NULL
                THEN DATEDIFF(YEAR, e.BirthDate, GETDATE())
                ELSE NULL
            END AS Age,

            CASE
                WHEN e.RetireDate IS NULL
                THEN DATEDIFF(YEAR, e.HireDate, GETDATE())
                ELSE DATEDIFF(YEAR, e.HireDate, e.RetireDate)
            END AS CareerYears,

            -- 조직 경로
            c.CompanyName + ' > ' + s.SubCompanyName + ' > ' + d.DeptName + ' > ' + p.PosName AS OrganizationPath,

            -- 시스템 정보
            e.LastLoginAt,
            e.CreatedAt,
            e.UpdatedAt

        FROM uEmployeeTb e
            INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
            INNER JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
            INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
            INNER JOIN uPositionTb p ON e.PosId = p.PosId
        WHERE e.EmployeeId = @EmployeeId;

    END TRY
    BEGIN CATCH
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine,
            'x_GetEmployeeById' AS ProcedureName;
    END CATCH
END;
GO

-- =============================================
-- 3. 직원 통계 조회 SP
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_GetEmployeeStats'))
    DROP PROCEDURE x_GetEmployeeStats;
GO

CREATE PROCEDURE x_GetEmployeeStats
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @DeptId INT = NULL,
    @RequestingUserRole NVARCHAR(50) = NULL,
    @RequestingUserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 권한별 필터 조건 설정
        DECLARE @RequestingUserDeptId INT = NULL;

        IF @RequestingUserRole = 'manager'
        BEGIN
            SELECT @RequestingUserDeptId = DeptId
            FROM uEmployeeTb
            WHERE EmployeeId = @RequestingUserId AND IsActive = 1;

            SET @DeptId = @RequestingUserDeptId;
        END

        -- 기본 통계
        SELECT
            -- 전체 통계
            (SELECT COUNT(*) FROM uEmployeeTb e
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)) AS TotalEmployees,

            -- 고용형태별 통계
            (SELECT COUNT(*) FROM uEmployeeTb e
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL AND e.EmploymentType = N'정규직'
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)) AS RegularEmployees,

            (SELECT COUNT(*) FROM uEmployeeTb e
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL AND e.EmploymentType = N'계약직'
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)) AS ContractEmployees,

            -- 성별 통계
            (SELECT COUNT(*) FROM uEmployeeTb e
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL AND e.Gender = 'M'
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)) AS MaleEmployees,

            (SELECT COUNT(*) FROM uEmployeeTb e
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL AND e.Gender = 'F'
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)) AS FemaleEmployees,

            -- 연령대별 통계 (JSON 형태)
            (SELECT
                COUNT(CASE WHEN DATEDIFF(YEAR, e.BirthDate, GETDATE()) < 30 THEN 1 END) AS Age20s,
                COUNT(CASE WHEN DATEDIFF(YEAR, e.BirthDate, GETDATE()) BETWEEN 30 AND 39 THEN 1 END) AS Age30s,
                COUNT(CASE WHEN DATEDIFF(YEAR, e.BirthDate, GETDATE()) BETWEEN 40 AND 49 THEN 1 END) AS Age40s,
                COUNT(CASE WHEN DATEDIFF(YEAR, e.BirthDate, GETDATE()) >= 50 THEN 1 END) AS Age50Plus
             FROM uEmployeeTb e
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL AND e.BirthDate IS NOT NULL
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)
             FOR JSON PATH, WITHOUT_ARRAY_WRAPPER) AS AgeGroupStats,

            -- 부서별 Top 5
            (SELECT TOP 5
                d.DeptName,
                COUNT(e.EmployeeId) AS EmployeeCount
             FROM uEmployeeTb e
                INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)
             GROUP BY d.DeptName
             ORDER BY COUNT(e.EmployeeId) DESC
             FOR JSON PATH) AS TopDepartmentsBySize,

            -- 직책별 Top 5
            (SELECT TOP 5
                p.PosName,
                COUNT(e.EmployeeId) AS EmployeeCount
             FROM uEmployeeTb e
                INNER JOIN uPositionTb p ON e.PosId = p.PosId
             WHERE e.IsActive = 1 AND e.RetireDate IS NULL
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)
             GROUP BY p.PosName
             ORDER BY COUNT(e.EmployeeId) DESC
             FOR JSON PATH) AS TopPositionsBySize,

            -- 월별 신규 입사자 (최근 12개월)
            (SELECT
                FORMAT(e.HireDate, 'yyyy-MM') AS YearMonth,
                COUNT(e.EmployeeId) AS NewHires
             FROM uEmployeeTb e
             WHERE e.HireDate >= DATEADD(MONTH, -12, GETDATE())
               AND e.IsActive = 1
               AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
               AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
               AND (@DeptId IS NULL OR e.DeptId = @DeptId)
             GROUP BY FORMAT(e.HireDate, 'yyyy-MM')
             ORDER BY YearMonth
             FOR JSON PATH) AS MonthlyNewHires;

    END TRY
    BEGIN CATCH
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine,
            'x_GetEmployeeStats' AS ProcedureName;
    END CATCH
END;
GO

-- =============================================
-- 4. 직원 검색 SP (자동완성용)
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_SearchEmployees'))
    DROP PROCEDURE x_SearchEmployees;
GO

CREATE PROCEDURE x_SearchEmployees
    @SearchTerm NVARCHAR(100),
    @MaxResults INT = 10,
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @DeptId INT = NULL,
    @RequestingUserRole NVARCHAR(50) = NULL,
    @RequestingUserId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 권한별 필터 조건 설정
        DECLARE @RequestingUserDeptId INT = NULL;

        IF @RequestingUserRole = 'manager'
        BEGIN
            SELECT @RequestingUserDeptId = DeptId
            FROM uEmployeeTb
            WHERE EmployeeId = @RequestingUserId AND IsActive = 1;

            SET @DeptId = @RequestingUserDeptId;
        END

        -- 검색어 정리
        SET @SearchTerm = LTRIM(RTRIM(@SearchTerm));

        IF @SearchTerm = '' OR LEN(@SearchTerm) < 2
        BEGIN
            SELECT 'INVALID_SEARCH_TERM' AS ErrorCode, '검색어는 2자 이상 입력해주세요.' AS ErrorMessage;
            RETURN;
        END

        -- 검색 실행
        SELECT TOP (@MaxResults)
            e.EmployeeId,
            e.EmployeeCode,
            e.FullName,
            e.Email,
            e.PhoneNumber,
            d.DeptName,
            p.PosName,
            c.CompanyName + ' > ' + s.SubCompanyName + ' > ' + d.DeptName AS OrganizationPath,

            -- 검색 점수 계산 (매칭 정확도)
            CASE
                WHEN e.FullName = @SearchTerm THEN 100
                WHEN e.EmployeeCode = @SearchTerm THEN 95
                WHEN e.FullName LIKE @SearchTerm + '%' THEN 90
                WHEN e.EmployeeCode LIKE @SearchTerm + '%' THEN 85
                WHEN e.Email LIKE @SearchTerm + '%' THEN 80
                WHEN e.FullName LIKE '%' + @SearchTerm + '%' THEN 70
                WHEN e.EmployeeCode LIKE '%' + @SearchTerm + '%' THEN 65
                WHEN e.Email LIKE '%' + @SearchTerm + '%' THEN 60
                ELSE 50
            END AS SearchScore

        FROM uEmployeeTb e
            INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
            INNER JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
            INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
            INNER JOIN uPositionTb p ON e.PosId = p.PosId
        WHERE e.IsActive = 1
            AND e.RetireDate IS NULL
            AND (e.FullName LIKE '%' + @SearchTerm + '%' OR
                 e.EmployeeCode LIKE '%' + @SearchTerm + '%' OR
                 e.Email LIKE '%' + @SearchTerm + '%' OR
                 e.PhoneNumber LIKE '%' + @SearchTerm + '%')

            -- 권한별 필터링
            AND (@RequestingUserRole = 'admin'
                 OR (@RequestingUserRole = 'manager' AND e.DeptId = @RequestingUserDeptId)
                 OR (@RequestingUserRole = 'employee' AND e.EmployeeId = @RequestingUserId))

            -- 추가 필터
            AND (@CompanyId IS NULL OR e.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR e.SubCompanyId = @SubCompanyId)
            AND (@DeptId IS NULL OR e.DeptId = @DeptId)

        ORDER BY
            -- 검색 점수 순, 이름 순
            CASE
                WHEN e.FullName = @SearchTerm THEN 100
                WHEN e.EmployeeCode = @SearchTerm THEN 95
                WHEN e.FullName LIKE @SearchTerm + '%' THEN 90
                WHEN e.EmployeeCode LIKE @SearchTerm + '%' THEN 85
                WHEN e.Email LIKE @SearchTerm + '%' THEN 80
                WHEN e.FullName LIKE '%' + @SearchTerm + '%' THEN 70
                WHEN e.EmployeeCode LIKE '%' + @SearchTerm + '%' THEN 65
                WHEN e.Email LIKE '%' + @SearchTerm + '%' THEN 60
                ELSE 50
            END DESC,
            e.FullName ASC;

    END TRY
    BEGIN CATCH
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine,
            'x_SearchEmployees' AS ProcedureName;
    END CATCH
END;
GO

-- =============================================
-- 5. 직원 등록 SP (기존 x_CreateEmployee 개선)
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_CreateEmployee'))
    DROP PROCEDURE x_CreateEmployee;
GO

CREATE PROCEDURE x_CreateEmployee
    @CompanyId INT,
    @SubCompanyId INT,
    @DeptId INT,
    @PosId INT,
    @EmployeeCode NVARCHAR(20),
    @Password NVARCHAR(255),           -- bcrypt 해시된 비밀번호
    @Email NVARCHAR(255),
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @NameEng NVARCHAR(100) = NULL,
    @Gender NCHAR(1) = NULL,
    @BirthDate DATE = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @HireDate DATE,
    @EmploymentType NVARCHAR(50) = N'정규직',
    @CurrentSalary DECIMAL(15,2) = NULL,
    @UserRole NVARCHAR(50) = 'employee',
    @CreatedBy INT,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    -- 변수 선언
    DECLARE @NewEmployeeId INT = 0;
    DECLARE @ExistingCount INT = 0;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'회사 ID가 유효하지 않습니다.';
            RETURN;
        END

        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'사업장 ID가 유효하지 않습니다.';
            RETURN;
        END

        IF @DeptId IS NULL OR @DeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'부서 ID가 유효하지 않습니다.';
            RETURN;
        END

        IF @PosId IS NULL OR @PosId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'직책 ID가 유효하지 않습니다.';
            RETURN;
        END

        IF @EmployeeCode IS NULL OR LTRIM(RTRIM(@EmployeeCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'사번이 필수입니다.';
            RETURN;
        END

        IF @Password IS NULL OR LTRIM(RTRIM(@Password)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'비밀번호가 필수입니다.';
            RETURN;
        END

        IF @Email IS NULL OR LTRIM(RTRIM(@Email)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이메일이 필수입니다.';
            RETURN;
        END

        IF @FirstName IS NULL OR LTRIM(RTRIM(@FirstName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이름이 필수입니다.';
            RETURN;
        END

        IF @LastName IS NULL OR LTRIM(RTRIM(@LastName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'성이 필수입니다.';
            RETURN;
        END

        IF @HireDate IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'입사일이 필수입니다.';
            RETURN;
        END

        -- 2. 조직도 유효성 검증
        IF NOT EXISTS (SELECT 1 FROM uCompanyTb WHERE CompanyId = @CompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 회사입니다.';
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId AND CompanyId = @CompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 사업장입니다.';
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @DeptId AND SubCompanyId = @SubCompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 부서입니다.';
            RETURN;
        END

        IF NOT EXISTS (SELECT 1 FROM uPositionTb WHERE PosId = @PosId AND DeptId = @DeptId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않거나 비활성화된 직책입니다.';
            RETURN;
        END

        -- 3. 중복 검증
        SELECT @ExistingCount = COUNT(*)
        FROM uEmployeeTb
        WHERE EmployeeCode = @EmployeeCode AND IsActive = 1;

        IF @ExistingCount > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이미 존재하는 사번입니다.';
            RETURN;
        END

        SELECT @ExistingCount = COUNT(*)
        FROM uEmployeeTb
        WHERE Email = @Email AND IsActive = 1;

        IF @ExistingCount > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이미 존재하는 이메일입니다.';
            RETURN;
        END

        -- 4. 직원 데이터 삽입
        INSERT INTO uEmployeeTb (
            CompanyId, SubCompanyId, DeptId, PosId, EmployeeCode, Password, Email,
            FirstName, LastName, NameEng, Gender, BirthDate, PhoneNumber,
            HireDate, EmploymentType, CurrentSalary, UserRole,
            IsActive, CreatedAt, CreatedBy, PasswordChangedAt
        )
        VALUES (
            @CompanyId, @SubCompanyId, @DeptId, @PosId, @EmployeeCode, @Password, @Email,
            @FirstName, @LastName, @NameEng, @Gender, @BirthDate, @PhoneNumber,
            @HireDate, @EmploymentType, @CurrentSalary, @UserRole,
            1, GETDATE(), @CreatedBy, GETDATE()
        );

        SET @NewEmployeeId = SCOPE_IDENTITY();

        -- 5. 직책 현재 인원 업데이트
        UPDATE uPositionTb
        SET CurrentHeadcount = CurrentHeadcount + 1,
            UpdatedAt = GETDATE(),
            UpdatedBy = @CreatedBy
        WHERE PosId = @PosId;

        -- 6. 신규 채용 발령 이력 생성
        INSERT INTO uEmployeeAssignmentTb (
            EmployeeId, NewCompanyId, NewSubCompanyId, NewDeptId, NewPosId,
            AssignmentType, AssignmentReason, EffectiveDate, NewSalary,
            ApprovedBy, ApprovedAt, CreatedBy, CreatedAt
        )
        VALUES (
            @NewEmployeeId, @CompanyId, @SubCompanyId, @DeptId, @PosId,
            N'신규채용', N'신규 직원 채용', @HireDate, @CurrentSalary,
            @CreatedBy, GETDATE(), @CreatedBy, GETDATE()
        );

        -- 7. 결과 반환
        SELECT
            @NewEmployeeId AS EmployeeId,
            @EmployeeCode AS EmployeeCode,
            @Email AS Email,
            (@LastName + @FirstName) AS FullName,
            @HireDate AS HireDate,
            @UserRole AS UserRole;

        SET @ResultCode = 0;
        SET @Message = N'직원이 성공적으로 등록되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'직원 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        -- 에러 로깅
        PRINT '=== x_CreateEmployee 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'EmployeeCode: ' + ISNULL(@EmployeeCode, 'NULL');
        PRINT 'Email: ' + ISNULL(@Email, 'NULL');
        PRINT '================================';
    END CATCH
END;
GO

-- =============================================
-- 6. 직원 정보 수정 SP (x_UpdateEmployee)
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_UpdateEmployee'))
    DROP PROCEDURE x_UpdateEmployee;
GO

CREATE PROCEDURE x_UpdateEmployee
    @EmployeeId INT,
    @FirstName NVARCHAR(50) = NULL,
    @LastName NVARCHAR(50) = NULL,
    @NameEng NVARCHAR(100) = NULL,
    @Gender NCHAR(1) = NULL,
    @BirthDate DATE = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @EmploymentType NVARCHAR(50) = NULL,
    @CurrentSalary DECIMAL(15,2) = NULL,
    @UserRole NVARCHAR(50) = NULL,
    @UpdatedBy INT,
    @RequestingUserRole NVARCHAR(50) = NULL,    -- 권한 체크용
    @RequestingUserId INT = NULL,               -- 권한 체크용
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ExistingCount INT = 0;
    DECLARE @CanUpdate BIT = 0;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'유효하지 않은 직원 ID입니다.';
            RETURN;
        END

        -- 2. 권한 확인
        IF @RequestingUserRole = 'admin'
            SET @CanUpdate = 1;
        ELSE IF @RequestingUserRole = 'employee' AND @RequestingUserId = @EmployeeId
            SET @CanUpdate = 1;
        ELSE IF @RequestingUserRole = 'manager'
        BEGIN
            -- Manager는 본인 부서 직원만 수정 가능
            DECLARE @RequestingUserDeptId INT, @TargetEmployeeDeptId INT;

            SELECT @RequestingUserDeptId = DeptId
            FROM uEmployeeTb
            WHERE EmployeeId = @RequestingUserId AND IsActive = 1;

            SELECT @TargetEmployeeDeptId = DeptId
            FROM uEmployeeTb
            WHERE EmployeeId = @EmployeeId AND IsActive = 1;

            IF @RequestingUserDeptId = @TargetEmployeeDeptId
                SET @CanUpdate = 1;
        END

        IF @CanUpdate = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'수정 권한이 없습니다.';
            RETURN;
        END

        -- 3. 직원 존재 여부 확인
        SELECT @ExistingCount = COUNT(*)
        FROM uEmployeeTb
        WHERE EmployeeId = @EmployeeId AND IsActive = 1;

        IF @ExistingCount = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않는 직원이거나 비활성화된 직원입니다.';
            RETURN;
        END

        -- 4. 권한별 수정 제한 (Employee는 특정 필드만 수정 가능)
        IF @RequestingUserRole = 'employee' AND @RequestingUserId = @EmployeeId
        BEGIN
            -- Employee는 개인정보만 수정 가능
            SET @EmploymentType = NULL;
            SET @CurrentSalary = NULL;
            SET @UserRole = NULL;
        END

        -- 5. 유효성 검사
        IF @Gender IS NOT NULL AND @Gender NOT IN ('M', 'F')
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'성별은 M(남성) 또는 F(여성)이어야 합니다.';
            RETURN;
        END

        IF @UserRole IS NOT NULL AND @UserRole NOT IN ('admin', 'manager', 'employee')
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'권한은 admin, manager, employee 중 하나여야 합니다.';
            RETURN;
        END

        -- 6. 직원 정보 업데이트
        UPDATE uEmployeeTb
        SET
            FirstName = ISNULL(@FirstName, FirstName),
            LastName = ISNULL(@LastName, LastName),
            NameEng = ISNULL(@NameEng, NameEng),
            Gender = ISNULL(@Gender, Gender),
            BirthDate = ISNULL(@BirthDate, BirthDate),
            PhoneNumber = ISNULL(@PhoneNumber, PhoneNumber),
            EmploymentType = ISNULL(@EmploymentType, EmploymentType),
            CurrentSalary = ISNULL(@CurrentSalary, CurrentSalary),
            UserRole = ISNULL(@UserRole, UserRole),
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE EmployeeId = @EmployeeId;

        -- 7. 결과 반환
        SELECT
            EmployeeId,
            EmployeeCode,
            FullName,
            Email,
            EmploymentType,
            UserRole,
            UpdatedAt
        FROM uEmployeeTb
        WHERE EmployeeId = @EmployeeId;

        SET @ResultCode = 0;
        SET @Message = N'직원 정보가 성공적으로 수정되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'직원 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END;
GO

-- =============================================
-- 7. 직원 삭제(비활성화) SP (x_DeleteEmployee)
-- =============================================
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('x_DeleteEmployee'))
    DROP PROCEDURE x_DeleteEmployee;
GO

CREATE PROCEDURE x_DeleteEmployee
    @EmployeeId INT,
    @RetireDate DATE = NULL,                    -- 퇴사일 (NULL이면 오늘 날짜)
    @RetireReason NVARCHAR(200) = NULL,         -- 퇴사 사유
    @UpdatedBy INT,
    @RequestingUserRole NVARCHAR(50) = NULL,    -- Admin만 삭제 가능
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ExistingCount INT = 0;
    DECLARE @EmployeePosId INT = NULL;

    BEGIN TRY
        -- 1. 권한 확인 (Admin만 삭제 가능)
        IF @RequestingUserRole != 'admin'
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'직원 삭제는 관리자만 가능합니다.';
            RETURN;
        END

        -- 2. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'유효하지 않은 직원 ID입니다.';
            RETURN;
        END

        IF @RetireDate IS NULL
            SET @RetireDate = GETDATE();

        -- 3. 직원 존재 여부 확인
        SELECT @ExistingCount = COUNT(*)
        FROM uEmployeeTb
        WHERE EmployeeId = @EmployeeId AND IsActive = 1;

        -- 직원의 직책 ID 조회
        SELECT @EmployeePosId = PosId
        FROM uEmployeeTb
        WHERE EmployeeId = @EmployeeId;

        IF @ExistingCount = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'존재하지 않는 직원이거나 이미 비활성화된 직원입니다.';
            RETURN;
        END

        -- 4. 직원 비활성화 및 퇴사 처리
        UPDATE uEmployeeTb
        SET
            IsActive = 0,
            RetireDate = @RetireDate,
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE EmployeeId = @EmployeeId;

        -- 5. 직책 현재 인원 차감
        UPDATE uPositionTb
        SET CurrentHeadcount = CASE
                                 WHEN CurrentHeadcount > 0
                                 THEN CurrentHeadcount - 1
                                 ELSE 0
                               END,
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE PosId = @EmployeePosId;

        -- 6. 퇴사 발령 이력 생성
        INSERT INTO uEmployeeAssignmentTb (
            EmployeeId, PreviousCompanyId, PreviousSubCompanyId, PreviousDeptId, PreviousPosId,
            AssignmentType, AssignmentReason, EffectiveDate,
            ApprovedBy, ApprovedAt, CreatedBy, CreatedAt
        )
        SELECT
            @EmployeeId, CompanyId, SubCompanyId, DeptId, PosId,
            N'퇴사', ISNULL(@RetireReason, N'퇴사'), @RetireDate,
            @UpdatedBy, GETDATE(), @UpdatedBy, GETDATE()
        FROM uEmployeeTb
        WHERE EmployeeId = @EmployeeId;

        SET @ResultCode = 0;
        SET @Message = N'직원이 성공적으로 비활성화되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = N'직원 비활성화 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END;
GO

PRINT '✅ 직원 관리 통합 Stored Procedures 완료!';
PRINT '';
PRINT '📋 생성된 프로시저 목록:';
PRINT '   1. x_GetEmployees: 직원 목록 조회 (페이징, 필터, 검색, 권한 제어)';
PRINT '   2. x_GetEmployeeById: 직원 상세 조회 (권한별 정보 마스킹)';
PRINT '   3. x_GetEmployeeStats: 직원 통계 정보 조회';
PRINT '   4. x_SearchEmployees: 직원 검색 (자동완성용)';
PRINT '   5. x_CreateEmployee: 직원 등록 (조직도 유효성 검증, 발령 이력 자동 생성)';
PRINT '   6. x_UpdateEmployee: 직원 정보 수정 (권한별 제한)';
PRINT '   7. x_DeleteEmployee: 직원 삭제/퇴사 처리 (soft delete, 발령 이력 생성)';
PRINT '';
PRINT '🔐 권한 제어 기능:';
PRINT '   - Admin: 모든 직원 관리';
PRINT '   - Manager: 본인 부서 직원만 조회/수정';
PRINT '   - Employee: 본인 정보만 조회/수정';
PRINT '';
PRINT '🎯 다음 단계: 백엔드 API 컨트롤러 개발';