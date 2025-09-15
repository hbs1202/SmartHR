/**
 * 테스트 계정 비밀번호 업데이트 스크립트
 * @description 기존 계정의 비밀번호를 올바른 bcrypt 해시로 업데이트
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

// 테스트 계정 비밀번호 정보
const testPasswords = [
  { email: 'admin@smarthr.com', password: 'Admin123!' },
  { email: 'hr@smarthr.com', password: 'Hr123!' },
  { email: 'employee1@smarthr.com', password: 'Employee123!' }
];

async function updateTestPasswords() {
  let pool;

  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('🔄 테스트 계정 비밀번호 업데이트 중...');

    for (const account of testPasswords) {
      // 비밀번호 해시화
      const hashedPassword = await bcrypt.hash(account.password, 10);
      console.log(`📋 ${account.email}: ${account.password} -> ${hashedPassword.substring(0, 30)}...`);

      // 비밀번호 업데이트
      const updateQuery = `
        UPDATE uEmployeeTb
        SET Password = @password
        WHERE Email = @email
      `;

      const result = await pool.request()
        .input('email', sql.NVarChar(255), account.email)
        .input('password', sql.NVarChar(255), hashedPassword)
        .query(updateQuery);

      console.log(`✅ ${account.email} 비밀번호 업데이트 완료 (영향받은 행: ${result.rowsAffected[0]})`);
    }

    console.log('\n🎉 모든 테스트 계정 비밀번호 업데이트 완료!');
    console.log('📋 업데이트된 계정:');
    testPasswords.forEach((account, index) => {
      console.log(`${index + 1}. ${account.email} / ${account.password}`);
    });

    // 계정 확인
    console.log('\n🔄 계정 확인 중...');
    const emails = testPasswords.map(acc => `'${acc.email}'`).join(',');
    const result = await pool.request().query(`
      SELECT EmployeeCode, FullName, Email, UserRole, IsActive
      FROM uEmployeeTb
      WHERE Email IN (${emails})
      ORDER BY EmployeeCode
    `);

    console.log('📊 데이터베이스 확인 결과:');
    if (result.recordset.length > 0) {
      result.recordset.forEach(record => {
        console.log(`  - ${record.Email} (${record.FullName}) - ${record.UserRole} - ${record.IsActive ? '활성' : '비활성'}`);
      });
    } else {
      console.log('⚠️  계정이 존재하지 않습니다. 먼저 계정을 생성해야 합니다.');
    }

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
updateTestPasswords()
  .then(() => {
    console.log('\n✅ 비밀번호 업데이트 스크립트 완료!');
    console.log('🚀 이제 로그인을 테스트해보세요!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 스크립트 실행 실패:', error);
    process.exit(1);
  });