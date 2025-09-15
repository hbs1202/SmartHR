/**
 * 인증 관리 Stored Procedures 배포 스크립트
 */

const sql = require('mssql');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// 데이터베이스 설정
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 30000,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function deployAuthSP() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // SP 파일 읽기
    const spFilePath = path.join(__dirname, '../sql/procedures/SP_Auth_Management.sql');
    
    console.log('🔄 SP 파일 읽는 중...');
    const spContent = await fs.readFile(spFilePath, 'utf8');
    
    // GO 문으로 분리하여 각각 실행
    const batches = spContent.split(/\r?\nGO\r?\n/);
    
    console.log(`🔄 ${batches.length}개의 SP 배치 실행 중...`);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch && batch.length > 0) {
        try {
          console.log(`  ${i + 1}/${batches.length} 배치 실행 중...`);
          await pool.request().query(batch);
          console.log(`  ✅ 배치 ${i + 1} 실행 완료`);
        } catch (batchError) {
          console.error(`  ❌ 배치 ${i + 1} 실행 실패:`, batchError.message);
          throw batchError;
        }
      }
    }

    // 생성된 SP 확인
    console.log('🔄 생성된 SP 확인 중...');
    const result = await pool.request().query(`
      SELECT 
        name AS 'SP명',
        create_date AS '생성일',
        modify_date AS '수정일'
      FROM sys.procedures 
      WHERE name LIKE 'SP_Auth%' OR name LIKE 'SP_%Login%' OR name LIKE 'SP_%Password%'
      ORDER BY name
    `);

    console.log('📋 배포된 인증 관련 SP 목록:');
    result.recordset.forEach(row => {
      console.log(`  ✅ ${row['SP명']} (생성: ${row['생성일'].toISOString().substring(0, 10)})`);
    });

    console.log('✅ 인증 관리 SP 배포가 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ SP 배포 실패:', error.message);
    console.error('상세 오류:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔄 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
deployAuthSP();