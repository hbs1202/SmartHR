/**
 * 기존 직원 관련 SP 확인
 */

const { executeQuery } = require('./src/database/dbHelper');

async function checkExistingSPs() {
  try {
    console.log('=== 기존 직원 관련 SP 확인 ===');

    // 모든 SP 확인
    const allSPs = await executeQuery(`
      SELECT
        ROUTINE_NAME,
        ROUTINE_TYPE,
        CREATED,
        LAST_ALTERED
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
        AND (ROUTINE_NAME LIKE '%Employee%' OR ROUTINE_NAME LIKE '%GetEmployee%' OR ROUTINE_NAME LIKE 'x_%')
      ORDER BY ROUTINE_NAME
    `);

    if (allSPs.data && allSPs.data.length > 0) {
      console.log('\n📋 직원 관련 SP 목록:');
      allSPs.data.forEach((sp, index) => {
        console.log(`  ${index + 1}. ${sp.ROUTINE_NAME} (${sp.ROUTINE_TYPE}) - 생성: ${sp.CREATED.toLocaleDateString()}, 수정: ${sp.LAST_ALTERED.toLocaleDateString()}`);
      });
    } else {
      console.log('❌ 직원 관련 SP를 찾을 수 없습니다.');
    }

    // 간단한 직원 목록 조회 테스트
    console.log('\n=== 직접 쿼리 테스트 ===');
    const directQuery = await executeQuery(`
      SELECT TOP 3
        EmployeeId, EmployeeCode, FullName, Email, UserRole, IsActive
      FROM uEmployeeTb
      WHERE IsActive = 1
      ORDER BY EmployeeCode
    `);

    if (directQuery.data && directQuery.data.length > 0) {
      console.log('✅ 직접 쿼리 성공:');
      directQuery.data.forEach((emp, index) => {
        console.log(`  ${index + 1}. ${emp.FullName} (${emp.EmployeeCode}) - ${emp.Email} [${emp.UserRole}]`);
      });
    }

  } catch (error) {
    console.error('❌ 확인 오류:', error.message);
  }

  process.exit(0);
}

checkExistingSPs();