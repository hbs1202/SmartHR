/**
 * 나머지 간단한 직원 관리 SP들 생성
 */

const { executeQuery } = require('./src/database/dbHelper');

async function createRemainingSimpleSPs() {
  try {
    console.log('=== 나머지 간단한 직원 관리 SP들 생성 ===');

    // 1. x_GetEmployeeById_Simple 생성
    console.log('\n1. x_GetEmployeeById_Simple 생성 중...');
    await executeQuery(`
      IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'x_GetEmployeeById_Simple') AND type = 'P')
        DROP PROCEDURE x_GetEmployeeById_Simple
    `);

    const createEmployeeById = `
CREATE PROCEDURE x_GetEmployeeById_Simple
    @EmployeeId INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.EmployeeId,
        e.EmployeeCode,
        e.Email,
        e.FullName,
        e.FirstName,
        e.LastName,
        e.Gender,
        e.BirthDate,
        e.PhoneNumber,
        e.HireDate,
        e.RetireDate,
        e.EmploymentType,
        e.CurrentSalary,
        e.UserRole,
        e.IsActive,
        c.CompanyName,
        s.SubCompanyName,
        d.DeptName,
        p.PosName,
        e.CreatedAt,
        e.UpdatedAt,
        e.LastLoginAt
    FROM uEmployeeTb e
        INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
        INNER JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
        INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
        INNER JOIN uPositionTb p ON e.PosId = p.PosId
    WHERE e.EmployeeId = @EmployeeId
END;
    `;

    await executeQuery(createEmployeeById);
    console.log('✅ x_GetEmployeeById_Simple 생성 완료');

    // 2. x_GetEmployeeStats_Simple 생성
    console.log('\n2. x_GetEmployeeStats_Simple 생성 중...');
    await executeQuery(`
      IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'x_GetEmployeeStats_Simple') AND type = 'P')
        DROP PROCEDURE x_GetEmployeeStats_Simple
    `);

    const createEmployeeStats = `
CREATE PROCEDURE x_GetEmployeeStats_Simple
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COUNT(*) AS TotalEmployees,
        SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END) AS ActiveEmployees,
        SUM(CASE WHEN IsActive = 0 THEN 1 ELSE 0 END) AS InactiveEmployees,
        COUNT(DISTINCT DeptId) AS TotalDepartments,
        AVG(CASE
            WHEN RetireDate IS NULL
            THEN DATEDIFF(YEAR, HireDate, GETDATE())
            ELSE DATEDIFF(YEAR, HireDate, RetireDate)
        END) AS AvgCareerYears
    FROM uEmployeeTb
END;
    `;

    await executeQuery(createEmployeeStats);
    console.log('✅ x_GetEmployeeStats_Simple 생성 완료');

    // 3. x_SearchEmployees_Simple 생성
    console.log('\n3. x_SearchEmployees_Simple 생성 중...');
    await executeQuery(`
      IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'x_SearchEmployees_Simple') AND type = 'P')
        DROP PROCEDURE x_SearchEmployees_Simple
    `);

    const createSearchEmployees = `
CREATE PROCEDURE x_SearchEmployees_Simple
    @SearchTerm NVARCHAR(100),
    @MaxResults INT = 10
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (@MaxResults)
        e.EmployeeId,
        e.EmployeeCode,
        e.Email,
        e.FullName,
        e.FirstName,
        e.LastName,
        e.UserRole,
        e.IsActive,
        c.CompanyName,
        d.DeptName,
        p.PosName
    FROM uEmployeeTb e
        INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
        INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
        INNER JOIN uPositionTb p ON e.PosId = p.PosId
    WHERE e.IsActive = 1
        AND (
            e.FullName LIKE '%' + @SearchTerm + '%' OR
            e.EmployeeCode LIKE '%' + @SearchTerm + '%' OR
            e.Email LIKE '%' + @SearchTerm + '%' OR
            d.DeptName LIKE '%' + @SearchTerm + '%'
        )
    ORDER BY e.EmployeeCode
END;
    `;

    await executeQuery(createSearchEmployees);
    console.log('✅ x_SearchEmployees_Simple 생성 완료');

    // 4. 테스트 실행
    console.log('\n=== SP 테스트 실행 ===');

    // 직원 상세 조회 테스트
    console.log('\n1. 직원 상세 조회 테스트 (ID: 1)');
    const detailTest = await executeQuery('EXEC x_GetEmployeeById_Simple @EmployeeId = 1');
    if (detailTest.data && detailTest.data.length > 0) {
      console.log('✅ 성공:', detailTest.data[0].FullName);
    }

    // 직원 통계 테스트
    console.log('\n2. 직원 통계 테스트');
    const statsTest = await executeQuery('EXEC x_GetEmployeeStats_Simple');
    if (statsTest.data && statsTest.data.length > 0) {
      console.log('✅ 성공:', {
        총직원수: statsTest.data[0].TotalEmployees,
        활성직원: statsTest.data[0].ActiveEmployees
      });
    }

    // 직원 검색 테스트
    console.log('\n3. 직원 검색 테스트 (검색어: admin)');
    const searchTest = await executeQuery("EXEC x_SearchEmployees_Simple @SearchTerm = 'admin', @MaxResults = 5");
    if (searchTest.data && searchTest.data.length > 0) {
      console.log('✅ 성공:', `${searchTest.data.length}명 검색됨`);
    }

    console.log('\n🎉 모든 간단한 SP 생성 및 테스트 완료!');

  } catch (error) {
    console.error('❌ SP 생성 오류:', error.message);
  }

  process.exit(0);
}

createRemainingSimpleSPs();