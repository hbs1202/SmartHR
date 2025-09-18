/**
 * 부서 테이블 데이터 확인 스크립트
 */

const { executeStoredProcedureWithNamedParams } = require('../src/database/dbHelper');

async function checkDepartmentData() {
  try {
    console.log('🔍 부서 데이터 확인 중...');

    // x_GetDepartments 저장 프로시저 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetDepartments', {
      CompanyId: 1,
      SubCompanyId: 1,
      PageNumber: 1,
      PageSize: 20,
      IsActive: null,
      SearchKeyword: null
    });

    console.log('📊 조회 결과:');
    console.log('  - ResultCode:', result.ResultCode);
    console.log('  - Message:', result.Message);
    console.log('  - 데이터 개수:', result.data?.length || 0);

    if (result.data && result.data.length > 0) {
      console.log('  - 첫 번째 부서:', result.data[0]);
      console.log('  - TotalCount:', result.data[0].TotalCount);
    } else {
      console.log('  ❌ 부서 데이터가 없습니다.');
      console.log('  💡 테스트 부서 데이터를 추가해야 합니다.');
    }

  } catch (error) {
    console.error('❌ 부서 데이터 확인 실패:', error.message);
  } finally {
    process.exit(0);
  }
}

// 스크립트 실행
checkDepartmentData();