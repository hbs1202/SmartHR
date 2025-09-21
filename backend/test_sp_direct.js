/**
 * x_GetEmployees SP 직접 테스트
 */

const { executeStoredProcedureWithNamedParams } = require('./src/database/dbHelper');

async function testSPDirect() {
  try {
    console.log('=== x_GetEmployees SP 직접 테스트 ===');

    const spParams = {
      Page: 1,
      PageSize: 5,
      CompanyId: null,
      SubCompanyId: null,
      DeptId: null,
      PosId: null,
      EmploymentType: null,
      UserRole: null,
      IsActive: 1,
      SearchTerm: null,
      RequestingUserId: 7,
      RequestingUserRole: 'admin'
    };

    console.log('파라미터:', spParams);

    const result = await executeStoredProcedureWithNamedParams('x_GetEmployees', spParams);

    console.log('✅ SP 실행 성공!');
    console.log('ResultCode:', result.ResultCode);
    console.log('Message:', result.Message);
    console.log('Data length:', result.data?.length || 0);

    if (result.data && result.data.length > 0) {
      console.log('첫 번째 레코드:', result.data[0]);
    }

  } catch (error) {
    console.error('❌ SP 테스트 오류:', error.message);
  }

  process.exit(0);
}

testSPDirect();