/**
 * x_GetEmployees SP 정의 확인 스크립트
 */

const { executeQuery } = require('./src/database/dbHelper');

async function checkSPDefinition() {
  try {
    console.log('=== x_GetEmployees SP 정의 확인 ===');

    // SP 정의 확인
    const result = await executeQuery(`
      SELECT
        ROUTINE_DEFINITION
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_NAME = 'x_GetEmployees'
    `);

    if (result.data && result.data.length > 0) {
      console.log('\n📋 x_GetEmployees SP 정의:');
      console.log(result.data[0].ROUTINE_DEFINITION);
    } else {
      console.log('❌ x_GetEmployees SP를 찾을 수 없습니다.');
    }

    // Output 파라미터 확인
    const outputParams = await executeQuery(`
      SELECT
        PARAMETER_NAME,
        PARAMETER_MODE,
        DATA_TYPE
      FROM INFORMATION_SCHEMA.PARAMETERS
      WHERE SPECIFIC_NAME = 'x_GetEmployees'
        AND PARAMETER_MODE = 'OUT'
    `);

    if (outputParams.data && outputParams.data.length > 0) {
      console.log('\n📤 Output 파라미터:');
      outputParams.data.forEach((param, index) => {
        console.log(`  ${index + 1}. ${param.PARAMETER_NAME} - ${param.DATA_TYPE}`);
      });
    } else {
      console.log('\n📤 Output 파라미터: 없음 (SELECT 결과만 반환)');
    }

  } catch (error) {
    console.error('❌ SP 정의 확인 오류:', error.message);
  }

  process.exit(0);
}

checkSPDefinition();