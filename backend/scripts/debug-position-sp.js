/**
 * 직책 관리 SP 개별 배포 및 디버깅 스크립트
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

async function debugPositionSPs() {
  try {
    console.log('🔍 직책 관리 SP 개별 디버깅 중...');
    
    const pool = await sql.connect(config);
    
    // SP 파일 읽기
    const spFilePath = path.join(__dirname, 'sql', 'procedures', 'SP_PositionManagement.sql');
    const spContent = fs.readFileSync(spFilePath, 'utf8');
    
    // 각 배치를 개별적으로 실행하면서 오류 확인
    const batches = spContent.split('GO').filter(batch => batch.trim().length > 0);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch) {
        try {
          console.log(`🔄 배치 ${i + 1}/${batches.length} 실행 중...`);
          console.log(`📄 배치 내용 (처음 100자): ${batch.substring(0, 100)}...`);
          
          await pool.request().query(batch);
          console.log(`✅ 배치 ${i + 1} 성공`);
          
        } catch (error) {
          console.error(`❌ 배치 ${i + 1} 실패:`, error.message);
          console.log(`🔍 문제 배치 전체 내용:`);
          console.log(batch);
          console.log('='.repeat(80));
          break;
        }
      }
    }
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ 디버깅 실패:', error.message);
    process.exit(1);
  }
}

debugPositionSPs();