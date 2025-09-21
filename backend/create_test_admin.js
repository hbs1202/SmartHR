/**
 * 테스트용 관리자 계정 생성 스크립트
 */

const bcrypt = require('bcrypt');
const { executeQuery } = require('./src/database/dbHelper');

async function createTestAdmin() {
  try {
    console.log('=== 테스트용 관리자 계정 생성 ===');

    // 비밀번호 해싱
    const password = 'admin123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log(`원본 비밀번호: ${password}`);
    console.log(`해시된 비밀번호: ${hashedPassword}`);

    // 기존 테스트 계정 삭제
    await executeQuery(`
      DELETE FROM uEmployeeTb WHERE Email = 'testadmin@smarthr.com'
    `);

    // 새 테스트 관리자 계정 삽입 (FullName은 계산 컬럼이므로 제외)
    const result = await executeQuery(`
      INSERT INTO uEmployeeTb (
        CompanyId, SubCompanyId, DeptId, PosId,
        EmployeeCode, Password, Email,
        FirstName, LastName,
        HireDate, EmploymentType, UserRole, IsActive,
        CreatedAt, CreatedBy
      ) VALUES (
        1, 1, 1, 1,
        'TESTADMIN', '${hashedPassword}', 'testadmin@smarthr.com',
        '테스트', '관리자',
        GETDATE(), '정규직', 'admin', 1,
        GETDATE(), 1
      )
    `);

    console.log('✅ 테스트 관리자 계정이 생성되었습니다!');
    console.log('   이메일: testadmin@smarthr.com');
    console.log('   비밀번호: admin123');

  } catch (error) {
    console.error('❌ 계정 생성 오류:', error.message);
  }

  process.exit(0);
}

createTestAdmin();