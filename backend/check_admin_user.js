/**
 * 관리자 계정 확인 스크립트
 */

const { executeQuery } = require('./src/database/dbHelper');

async function checkAdminUser() {
  try {
    console.log('=== 관리자 계정 확인 ===');

    const result = await executeQuery(`
      SELECT TOP 5
        EmployeeId, EmployeeCode, Email, FullName, UserRole, IsActive
      FROM uEmployeeTb
      WHERE UserRole = 'admin' OR EmployeeCode LIKE '%ADMIN%'
      ORDER BY EmployeeId
    `);

    if (result.data && result.data.length > 0) {
      console.log('\n📋 관리자 계정 목록:');
      result.data.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.FullName} (${user.EmployeeCode})`);
        console.log(`     이메일: ${user.Email}`);
        console.log(`     역할: ${user.UserRole}`);
        console.log(`     활성: ${user.IsActive ? 'Yes' : 'No'}`);
        console.log('');
      });
    } else {
      console.log('❌ 관리자 계정이 없습니다.');
    }

  } catch (error) {
    console.error('❌ 계정 확인 오류:', error.message);
  }

  process.exit(0);
}

checkAdminUser();