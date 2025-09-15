/**
 * SP_AuthLogin 직접 테스트
 */

const sql = require('mssql');
const bcrypt = require('bcrypt');
require('dotenv').config();

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

async function testSPLogin() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // SP_AuthLogin 테스트
    console.log('\n🧪 SP_AuthLogin 테스트 시작');
    console.log('📧 이메일: admin@smarthr.com');
    console.log('🔑 비밀번호: Admin123!');

    const request = new sql.Request();

    // 출력 매개변수 설정
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    // 입력 매개변수 설정
    request.input('Email', sql.NVarChar(255), 'admin@smarthr.com');
    request.input('Password', sql.NVarChar(255), 'Admin123!'); // SP에서는 사용하지 않음

    const result = await request.execute('SP_AuthLogin');

    console.log('\n📊 SP 실행 결과:');
    console.log('ResultCode:', result.output.ResultCode);
    console.log('Message:', result.output.Message);

    if (result.recordset && result.recordset.length > 0) {
      console.log('\n👤 반환된 사용자 데이터:');
      const user = result.recordset[0];
      console.log('EmployeeId:', user.EmployeeId);
      console.log('EmployeeCode:', user.EmployeeCode);
      console.log('Email:', user.Email);
      console.log('FullName:', user.FullName);
      console.log('UserRole:', user.UserRole);
      console.log('HashedPassword:', user.HashedPassword ? user.HashedPassword.substring(0, 30) + '...' : 'null');

      // bcrypt 비교 테스트
      console.log('\n🔐 비밀번호 해시 검증:');
      const inputPassword = 'Admin123!';
      const storedHash = user.HashedPassword;

      console.log('입력 비밀번호:', inputPassword);
      console.log('저장된 해시:', storedHash ? storedHash.substring(0, 30) + '...' : 'null');

      if (storedHash) {
        const isValid = await bcrypt.compare(inputPassword, storedHash);
        console.log('🎯 비밀번호 일치:', isValid ? '✅ 성공' : '❌ 실패');

        if (!isValid) {
          // 다른 비밀번호들도 테스트
          console.log('\n🔍 다른 비밀번호 패턴 테스트:');
          const testPasswords = ['admin123', 'admin', 'Admin123', 'ADMIN123!'];
          for (const testPw of testPasswords) {
            const testResult = await bcrypt.compare(testPw, storedHash);
            console.log(`  - "${testPw}": ${testResult ? '✅' : '❌'}`);
          }
        }
      } else {
        console.log('❌ 저장된 해시가 없습니다!');
      }
    } else {
      console.log('❌ 반환된 데이터가 없습니다!');
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  } finally {
    try {
      await sql.close();
      console.log('\n🔌 데이터베이스 연결 해제');
    } catch (e) {
      console.log('연결 해제 중 오류:', e.message);
    }
  }
}

testSPLogin();