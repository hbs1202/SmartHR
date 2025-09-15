/**
 * 활성 직원으로 SP 업데이트 테스트
 */

const sql = require('mssql');
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

async function testActiveEmployeeOperations() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 활성 직원 확인 (ID 4: 박민지)
    console.log('\n📋 활성 직원 정보 확인 (ID: 4)');
    const beforeUpdate = await sql.query(`
      SELECT EmployeeId, FullName, PhoneNumber, IsActive, UpdatedAt
      FROM uEmployeeTb 
      WHERE EmployeeId = 4
    `);
    
    if (beforeUpdate.recordset.length > 0) {
      const emp = beforeUpdate.recordset[0];
      console.log(`  수정 전: ${emp.FullName} - ${emp.PhoneNumber || '전화번호 없음'} - ${emp.IsActive ? '활성' : '비활성'}`);
    }

    // 2. SP_UpdateEmployee로 전화번호 업데이트
    console.log('\n🔄 SP_UpdateEmployee 테스트 - ID 4 전화번호 추가');
    const updateRequest = new sql.Request();
    
    updateRequest.input('EmployeeId', sql.Int, 4);
    updateRequest.input('PhoneNumber', sql.NVarChar(20), '010-2222-3333');
    updateRequest.input('UpdatedBy', sql.Int, 1);
    updateRequest.output('ResultCode', sql.Int);
    updateRequest.output('Message', sql.NVarChar(500));

    const updateResult = await updateRequest.execute('SP_UpdateEmployee');
    
    console.log('✅ SP_UpdateEmployee 실행 결과:');
    console.log(`   ResultCode: ${updateResult.output.ResultCode}`);
    console.log(`   Message: ${updateResult.output.Message}`);
    
    if (updateResult.recordset && updateResult.recordset.length > 0) {
      const updatedEmployee = updateResult.recordset[0];
      console.log(`   수정된 직원: ${updatedEmployee.FullName} - ${updatedEmployee.PhoneNumber}`);
    }

    // 3. 변경사항 확인
    console.log('\n📋 변경사항 확인');
    const afterUpdate = await sql.query(`
      SELECT EmployeeId, FullName, PhoneNumber, UpdatedAt, UpdatedBy
      FROM uEmployeeTb 
      WHERE EmployeeId = 4
    `);
    
    if (afterUpdate.recordset.length > 0) {
      const emp = afterUpdate.recordset[0];
      console.log(`  수정 후: ${emp.FullName} - ${emp.PhoneNumber} (수정자: ${emp.UpdatedBy}, 수정일시: ${emp.UpdatedAt})`);
    }

    // 4. 다른 필드 업데이트 테스트
    console.log('\n🔄 SP_UpdateEmployee 테스트 - 영문명 추가');
    const updateRequest2 = new sql.Request();
    
    updateRequest2.input('EmployeeId', sql.Int, 4);
    updateRequest2.input('NameEng', sql.NVarChar(100), 'Park Min-Ji');
    updateRequest2.input('UpdatedBy', sql.Int, 1);
    updateRequest2.output('ResultCode', sql.Int);
    updateRequest2.output('Message', sql.NVarChar(500));

    const updateResult2 = await updateRequest2.execute('SP_UpdateEmployee');
    
    console.log('✅ SP_UpdateEmployee (영문명) 실행 결과:');
    console.log(`   ResultCode: ${updateResult2.output.ResultCode}`);
    console.log(`   Message: ${updateResult2.output.Message}`);

    // 5. 최종 상태 확인
    console.log('\n📋 최종 상태 확인');
    const finalState = await sql.query(`
      SELECT EmployeeId, FullName, NameEng, PhoneNumber, UpdatedAt
      FROM uEmployeeTb 
      WHERE EmployeeId = 4
    `);
    
    if (finalState.recordset.length > 0) {
      const emp = finalState.recordset[0];
      console.log(`  최종: ${emp.FullName} (${emp.NameEng || '영문명 없음'}) - ${emp.PhoneNumber} (수정일시: ${emp.UpdatedAt})`);
    }

    console.log('\n🎉 활성 직원 업데이트 테스트 완료!');

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

testActiveEmployeeOperations().catch(console.error);