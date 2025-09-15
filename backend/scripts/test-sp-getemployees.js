/**
 * SP_GetEmployees 테스트 스크립트
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

async function testSP() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 1. SP_GetEmployees가 존재하는지 확인
    console.log('\n🔍 SP_GetEmployees 존재 여부 확인...');
    const spCheckResult = await sql.query(`
      SELECT name 
      FROM sys.objects 
      WHERE type = 'P' AND name = 'SP_GetEmployees'
    `);
    
    if (spCheckResult.recordset.length === 0) {
      console.log('❌ SP_GetEmployees가 존재하지 않습니다.');
      return;
    }
    
    console.log('✅ SP_GetEmployees 존재 확인');

    // 2. uEmployeeDetailView가 존재하는지 확인
    console.log('\n🔍 uEmployeeDetailView 존재 여부 확인...');
    const viewCheckResult = await sql.query(`
      SELECT name 
      FROM sys.views 
      WHERE name = 'uEmployeeDetailView'
    `);
    
    if (viewCheckResult.recordset.length === 0) {
      console.log('❌ uEmployeeDetailView가 존재하지 않습니다.');
      return;
    }
    
    console.log('✅ uEmployeeDetailView 존재 확인');

    // 3. uEmployeeDetailView에서 데이터 조회 테스트
    console.log('\n🔄 uEmployeeDetailView 데이터 조회 테스트...');
    const viewDataResult = await sql.query(`
      SELECT TOP 3 
        EmployeeId, EmployeeCode, Email, FullName, UserRole, EmployeeActive
      FROM uEmployeeDetailView
    `);
    
    console.log('✅ uEmployeeDetailView 데이터 조회 성공:');
    console.log(viewDataResult.recordset);

    // 4. SP_GetEmployees 직접 호출 테스트
    console.log('\n🔄 SP_GetEmployees 직접 호출 테스트...');
    const request = new sql.Request();
    
    // SP 파라미터 설정
    request.input('Page', sql.Int, 1);
    request.input('PageSize', sql.Int, 5);
    request.input('CompanyId', sql.Int, null);
    request.input('SubCompanyId', sql.Int, null);
    request.input('DeptId', sql.Int, null);
    request.input('PosId', sql.Int, null);
    request.input('IsActive', sql.Bit, null);
    request.input('SearchKeyword', sql.NVarChar(100), null);
    request.input('UserRole', sql.NVarChar(50), null);
    request.input('EmploymentType', sql.NVarChar(50), null);

    const spResult = await request.execute('SP_GetEmployees');
    
    console.log('✅ SP_GetEmployees 호출 성공:');
    console.log('반환된 레코드 수:', spResult.recordset.length);
    
    if (spResult.recordset.length > 0) {
      console.log('첫 번째 레코드:', spResult.recordset[0]);
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error('오류 상세:', error);
  } finally {
    await sql.close();
    console.log('\n🔌 데이터베이스 연결 종료');
  }
}

// 테스트 실행
testSP().catch(console.error);