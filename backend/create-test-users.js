/**
 * 테스트 사용자 계정 생성 스크립트
 * @description bcrypt로 해시화된 비밀번호를 사용하여 테스트 계정 생성
 */

const bcrypt = require('bcrypt');
const sql = require('mssql');
require('dotenv').config();

// 데이터베이스 설정
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'hr_system',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

// 테스트 계정 정보
const testUsers = [
  {
    employeeCode: 'EMP001',
    fullName: '시스템 관리자',
    email: 'admin@smarthr.com',
    password: 'Admin123!',
    role: 'admin',
    phone: '010-1111-1111'
  },
  {
    employeeCode: 'EMP002',
    fullName: '인사팀 매니저',
    email: 'hr@smarthr.com',
    password: 'Hr123!',
    role: 'manager',
    phone: '010-2222-2222'
  },
  {
    employeeCode: 'EMP003',
    fullName: '김직원',
    email: 'employee1@smarthr.com',
    password: 'Employee123!',
    role: 'employee',
    phone: '010-3333-3333'
  }
];

async function createTestUsers() {
  let pool;

  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 기존 테스트 계정 삭제
    console.log('🔄 기존 테스트 계정 삭제 중...');
    const deleteEmails = testUsers.map(user => `'${user.email}'`).join(',');
    await pool.request().query(`DELETE FROM uEmployeeTb WHERE Email IN (${deleteEmails})`);
    console.log('✅ 기존 테스트 계정 삭제 완료');

    // 2. 새 테스트 계정 생성
    console.log('🔄 새 테스트 계정 생성 중...');

    for (const user of testUsers) {
      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(user.password, 10);
      console.log(`📋 ${user.email}: ${user.password} -> ${hashedPassword.substring(0, 20)}...`);

      // 계정 생성
      const insertQuery = `
        INSERT INTO uEmployeeTb (
          EmployeeCode, FirstName, LastName, Email, Password,
          PhoneNumber, HireDate, UserRole, IsActive,
          CompanyId, SubCompanyId, DeptId, PosId
        ) VALUES (
          @employeeCode, @firstName, @lastName, @email, @password,
          @phone, GETDATE(), @role, 1,
          1, 1, 1, 1
        )
      `;

      await pool.request()
        .input('employeeCode', sql.NVarChar(20), user.employeeCode)
        .input('firstName', sql.NVarChar(50), user.fullName.substring(0, user.fullName.length-1))
        .input('lastName', sql.NVarChar(50), user.fullName.substring(user.fullName.length-1))
        .input('email', sql.NVarChar(255), user.email)
        .input('password', sql.NVarChar(255), hashedPassword)
        .input('phone', sql.NVarChar(20), user.phone)
        .input('role', sql.NVarChar(50), user.role)
        .query(insertQuery);

      console.log(`✅ ${user.email} 계정 생성 완료`);
    }

    console.log('\n🎉 모든 테스트 계정 생성 완료!');
    console.log('📋 생성된 계정:');
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} / ${user.password} (${user.fullName})`);
    });

    // 3. 생성된 계정 확인
    console.log('\n🔄 생성된 계정 확인 중...');
    const result = await pool.request().query(`
      SELECT EmployeeCode, FullName, Email, UserRole, IsActive
      FROM uEmployeeTb
      WHERE Email IN (${deleteEmails})
      ORDER BY EmployeeCode
    `);

    console.log('📊 데이터베이스 확인 결과:');
    result.recordset.forEach(record => {
      console.log(`  - ${record.Email} (${record.FullName}) - ${record.UserRole} - ${record.IsActive ? '활성' : '비활성'}`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
createTestUsers()
  .then(() => {
    console.log('\n✅ 테스트 계정 생성 스크립트 완료!');
    console.log('🚀 이제 로그인을 테스트해보세요!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });