/**
 * SP_UpdateEmployee와 SP_DeleteEmployee 직접 테스트
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

async function testSPOperations() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 현재 직원 상태 확인
    console.log('\n📋 현재 직원 목록 확인');
    const currentEmployees = await sql.query(`
      SELECT TOP 5 EmployeeId, EmployeeCode, FullName, PhoneNumber, IsActive, UpdatedAt
      FROM uEmployeeTb 
      ORDER BY EmployeeId DESC
    `);
    
    console.log('현재 직원 상태:');
    currentEmployees.recordset.forEach(emp => {
      console.log(`  ${emp.EmployeeId}: ${emp.FullName} (${emp.EmployeeCode}) - ${emp.PhoneNumber} - ${emp.IsActive ? '활성' : '비활성'}`);
    });

    // 2. SP_UpdateEmployee 테스트
    console.log('\n🔄 SP_UpdateEmployee 테스트 - ID 5 전화번호 변경');
    const updateRequest = new sql.Request();
    
    updateRequest.input('EmployeeId', sql.Int, 5);
    updateRequest.input('PhoneNumber', sql.NVarChar(20), '010-1111-2222');
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
      SELECT EmployeeId, FullName, PhoneNumber, UpdatedAt
      FROM uEmployeeTb 
      WHERE EmployeeId = 5
    `);
    
    if (afterUpdate.recordset.length > 0) {
      const emp = afterUpdate.recordset[0];
      console.log(`  직원 ID 5: ${emp.FullName} - ${emp.PhoneNumber} (수정일시: ${emp.UpdatedAt})`);
    }

    // 4. SP_DeleteEmployee 테스트 (실제로는 삭제하지 않고 검증만)
    console.log('\n🔄 SP_DeleteEmployee 테스트 - 존재하지 않는 직원으로 검증');
    const deleteRequest = new sql.Request();
    
    deleteRequest.input('EmployeeId', sql.Int, 999); // 존재하지 않는 ID
    deleteRequest.input('DeletedBy', sql.Int, 1);
    deleteRequest.input('DeleteReason', sql.NVarChar(500), '테스트 삭제');
    deleteRequest.output('ResultCode', sql.Int);
    deleteRequest.output('Message', sql.NVarChar(500));

    const deleteResult = await deleteRequest.execute('SP_DeleteEmployee');
    
    console.log('✅ SP_DeleteEmployee 검증 결과:');
    console.log(`   ResultCode: ${deleteResult.output.ResultCode}`);
    console.log(`   Message: ${deleteResult.output.Message}`);

    console.log('\n🎉 SP 테스트 완료!');

  } catch (error) {
    console.error('❌ SP 테스트 실패:', error.message);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

testSPOperations().catch(console.error);