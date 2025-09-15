/**
 * 직원 수정/삭제 SP 배포 스크립트
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 데이터베이스 연결 설정
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

async function deploySPs() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // SP 파일 읽기
    const spFilePath = path.join(__dirname, '..', 'sql', 'procedures', 'SP_Employee_Update_Delete.sql');
    console.log('📁 SP 파일 경로:', spFilePath);
    
    const spContent = fs.readFileSync(spFilePath, 'utf8');
    console.log('📄 SP 파일 읽기 완료');

    // SP 실행
    console.log('🔄 SP 배포 중...');
    await sql.query(spContent);
    console.log('✅ SP 배포 완료');

    // SP 존재 여부 확인
    console.log('\n🔍 배포된 SP 확인 중...');
    const checkResult = await sql.query(`
      SELECT name, create_date, modify_date
      FROM sys.objects 
      WHERE type = 'P' 
      AND name IN ('SP_UpdateEmployee', 'SP_DeleteEmployee')
      ORDER BY name
    `);
    
    console.log('✅ 배포된 SP 목록:');
    checkResult.recordset.forEach(sp => {
      console.log(`   📋 ${sp.name} - 생성: ${sp.create_date}, 수정: ${sp.modify_date}`);
    });

    // 간단한 기능 테스트 (SP_UpdateEmployee)
    console.log('\n🔄 SP_UpdateEmployee 기능 테스트...');
    const request = new sql.Request();
    
    request.input('EmployeeId', sql.Int, 5); // 테스트로 생성한 직원 ID
    request.input('PhoneNumber', sql.NVarChar(20), '010-9999-8888');
    request.input('UpdatedBy', sql.Int, 1);
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    const testResult = await request.execute('SP_UpdateEmployee');
    
    console.log('✅ SP_UpdateEmployee 테스트 결과:');
    console.log(`   📝 ResultCode: ${testResult.output.ResultCode}`);
    console.log(`   📝 Message: ${testResult.output.Message}`);
    
    if (testResult.recordset && testResult.recordset.length > 0) {
      console.log('   📋 수정된 직원 정보:', testResult.recordset[0]);
    }

    console.log('\n🎉 SP 배포 및 테스트 완료!');

  } catch (error) {
    console.error('❌ SP 배포 실패:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

// SP 배포 실행
deploySPs().catch(console.error);