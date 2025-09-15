/**
 * 조직도 조회 테스트 스크립트
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testOrganization() {
  try {
    console.log('📋 조직도 데이터 조회 테스트...');
    
    const pool = await sql.connect(config);
    
    // 1. 전체 테이블 데이터 건수 확인
    console.log('📊 테이블별 데이터 건수:');
    
    const companies = await pool.request().query('SELECT COUNT(*) as count FROM uCompanyTb');
    console.log(`  - 회사: ${companies.recordset[0].count}개`);
    
    const subCompanies = await pool.request().query('SELECT COUNT(*) as count FROM uSubCompanyTb');
    console.log(`  - 사업장: ${subCompanies.recordset[0].count}개`);
    
    const departments = await pool.request().query('SELECT COUNT(*) as count FROM uDeptTb');
    console.log(`  - 부서: ${departments.recordset[0].count}개`);
    
    const positions = await pool.request().query('SELECT COUNT(*) as count FROM uPositionTb');
    console.log(`  - 직책: ${positions.recordset[0].count}개`);
    
    // 2. 생성된 회사 정보
    console.log('\n📈 등록된 회사 정보:');
    const companyList = await pool.request().query('SELECT * FROM uCompanyTb');
    companyList.recordset.forEach(company => {
      console.log(`  - ${company.CompanyName} (${company.CompanyCode})`);
    });
    
    // 3. 조직 뷰 조회
    console.log('\n📊 조직도 뷰 조회:');
    const orgView = await pool.request().query('SELECT TOP 10 * FROM uOrganizationView ORDER BY CompanyId, SubCompanyId, DeptId, PosId');
    orgView.recordset.forEach(row => {
      console.log(`  - ${row.CompanyName} > ${row.SubCompanyName} > ${row.DeptName} > ${row.PosName}`);
    });
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ 조회 테스트 실패:', error.message);
    process.exit(1);
  }
}

testOrganization();