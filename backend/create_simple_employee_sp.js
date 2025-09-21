/**
 * 간단한 직원 목록 조회 SP 생성
 */

const { executeQuery } = require('./src/database/dbHelper');

async function createSimpleEmployeeSP() {
  try {
    console.log('=== 간단한 직원 목록 조회 SP 생성 ===');

    // 기존 SP 삭제
    await executeQuery(`
      IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'x_GetEmployees_Simple') AND type = 'P')
        DROP PROCEDURE x_GetEmployees_Simple
    `);

    // 새로운 간단한 SP 생성
    const createSP = `
CREATE PROCEDURE x_GetEmployees_Simple
    @Page INT = 1,
    @PageSize INT = 20,
    @IsActive BIT = 1,
    @RequestingUserId INT = NULL,
    @RequestingUserRole NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        DECLARE @Offset INT = (@Page - 1) * @PageSize;
        DECLARE @TotalCount INT = 0;

        -- 총 개수 계산
        SELECT @TotalCount = COUNT(*)
        FROM uEmployeeTb e
            INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
            INNER JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
            INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
            INNER JOIN uPositionTb p ON e.PosId = p.PosId
        WHERE (@IsActive IS NULL OR e.IsActive = @IsActive);

        -- 페이징된 결과 반환
        SELECT
            e.EmployeeId,
            e.EmployeeCode,
            e.Email,
            e.FullName,
            e.FirstName,
            e.LastName,
            e.Gender,
            e.PhoneNumber,
            e.HireDate,
            e.EmploymentType,
            e.UserRole,
            e.IsActive,
            c.CompanyName,
            s.SubCompanyName,
            d.DeptName,
            p.PosName,
            @TotalCount AS TotalCount,
            @Page AS CurrentPage,
            @PageSize AS PageSize,
            CEILING(CAST(@TotalCount AS FLOAT) / @PageSize) AS TotalPages
        FROM uEmployeeTb e
            INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
            INNER JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
            INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
            INNER JOIN uPositionTb p ON e.PosId = p.PosId
        WHERE (@IsActive IS NULL OR e.IsActive = @IsActive)
        ORDER BY e.EmployeeCode
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY;

    END TRY
    BEGIN CATCH
        SELECT
            ERROR_NUMBER() AS ErrorNumber,
            ERROR_MESSAGE() AS ErrorMessage,
            ERROR_LINE() AS ErrorLine,
            'x_GetEmployees_Simple' AS ProcedureName;
    END CATCH
END;
    `;

    await executeQuery(createSP);

    console.log('✅ 간단한 직원 목록 조회 SP 생성 완료!');

    // 테스트 실행
    console.log('\n=== SP 테스트 실행 ===');
    const testResult = await executeQuery(`
      EXEC x_GetEmployees_Simple @Page = 1, @PageSize = 3, @IsActive = 1
    `);

    if (testResult.data && testResult.data.length > 0) {
      console.log('✅ SP 테스트 성공!');
      console.log('반환된 레코드 수:', testResult.data.length);
      console.log('첫 번째 레코드:', {
        employeeId: testResult.data[0].EmployeeId,
        employeeCode: testResult.data[0].EmployeeCode,
        fullName: testResult.data[0].FullName,
        totalCount: testResult.data[0].TotalCount
      });
    } else {
      console.log('❌ SP 테스트 실패 - 데이터 없음');
    }

  } catch (error) {
    console.error('❌ SP 생성/테스트 오류:', error.message);
  }

  process.exit(0);
}

createSimpleEmployeeSP();