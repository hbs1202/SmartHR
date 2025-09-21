/**
 * Stored Procedure 파라미터 확인 스크립트
 */

const { executeQuery } = require('./src/database/dbHelper');

async function checkSPParams() {
  try {
    console.log('=== Stored Procedure 파라미터 확인 ===');

    // x_GetEmployees SP 파라미터 확인
    const result = await executeQuery(`
      SELECT
        PARAMETER_NAME,
        DATA_TYPE,
        PARAMETER_MODE,
        IS_RESULT
      FROM INFORMATION_SCHEMA.PARAMETERS
      WHERE SPECIFIC_NAME = 'x_GetEmployees'
      ORDER BY ORDINAL_POSITION
    `);

    if (result.data && result.data.length > 0) {
      console.log('\n📋 x_GetEmployees SP 파라미터:');
      result.data.forEach((param, index) => {
        console.log(`  ${index + 1}. ${param.PARAMETER_NAME || '@ReturnValue'} - ${param.DATA_TYPE} (${param.PARAMETER_MODE})`);
      });
    } else {
      console.log('❌ x_GetEmployees SP를 찾을 수 없습니다.');

      // 모든 직원 관련 SP 확인
      const allSPs = await executeQuery(`
        SELECT ROUTINE_NAME, ROUTINE_TYPE
        FROM INFORMATION_SCHEMA.ROUTINES
        WHERE ROUTINE_NAME LIKE '%Employee%' OR ROUTINE_NAME LIKE '%GetEmployee%'
        ORDER BY ROUTINE_NAME
      `);

      if (allSPs.data && allSPs.data.length > 0) {
        console.log('\n📋 직원 관련 SP 목록:');
        allSPs.data.forEach((sp, index) => {
          console.log(`  ${index + 1}. ${sp.ROUTINE_NAME} (${sp.ROUTINE_TYPE})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ SP 확인 오류:', error.message);
  }

  process.exit(0);
}

checkSPParams();