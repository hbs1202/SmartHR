/**
 * 부서 관리 SP 배포 스크립트
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
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

async function deployDepartmentSPs() {
  try {
    console.log('📋 부서 관리 SP 배포 중...');
    
    const pool = await sql.connect(config);
    
    // SP 파일 읽기
    const spFilePath = path.join(__dirname, 'sql', 'procedures', 'SP_DepartmentManagement.sql');
    const spContent = fs.readFileSync(spFilePath, 'utf8');
    
    // SP 실행 (배치로 실행)
    const batches = spContent.split('GO').filter(batch => batch.trim().length > 0);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        console.log(`🔄 배치 ${i + 1}/${batches.length} 실행 중...`);
        await pool.request().query(batch);
      }
    }
    
    console.log('✅ 부서 관리 SP 배포 완료');
    console.log('📋 배포된 SP 목록:');
    console.log('  - SP_GetDepartments (부서 목록 조회)');
    console.log('  - SP_GetDepartmentById (부서 상세 조회)');
    console.log('  - SP_CreateDepartment (부서 등록)');
    console.log('  - SP_UpdateDepartment (부서 정보 수정)');
    console.log('  - SP_DeleteDepartment (부서 삭제)');
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ SP 배포 실패:', error.message);
    process.exit(1);
  }
}

deployDepartmentSPs();