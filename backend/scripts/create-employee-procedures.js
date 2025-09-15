/**
 * 직원 관리 Stored Procedures 생성 스크립트
 */

const sql = require('mssql');
const fs = require('fs');
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

async function createEmployeeProcedures() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // SQL 파일 읽기
    const sqlFilePath = path.join(__dirname, 'sql', 'procedures', 'SP_Employee_Management.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('🔄 직원 관리 Stored Procedures 생성 중...');
    
    // SQL을 GO 구분자로 분할
    const batches = sqlContent.split(/\n\s*GO\s*\n/i).filter(batch => batch.trim().length > 0);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i].trim();
      if (batch.length > 0) {
        try {
          await pool.request().query(batch);
          console.log(`✅ 배치 ${i + 1}/${batches.length} 실행 완료`);
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('이미 존재')) {
            console.log(`⚠️ 배치 ${i + 1}: 이미 존재하는 객체 (무시)`);
          } else {
            console.error(`❌ 배치 ${i + 1} 실행 실패:`, error.message);
          }
        }
      }
    }
    
    console.log('✅ 직원 관리 Stored Procedures 생성 완료');

    // 생성된 SP 목록 확인
    const spResult = await pool.request().query(`
      SELECT 
        ROUTINE_NAME as 'SP명',
        CREATED as '생성일',
        LAST_ALTERED as '수정일'
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_TYPE = 'PROCEDURE' 
        AND (ROUTINE_NAME LIKE 'x_CreateEmployee%' 
             OR ROUTINE_NAME LIKE 'SP_%Employee%'
             OR ROUTINE_NAME LIKE 'SP_AuthenticateEmployee%'
             OR ROUTINE_NAME LIKE 'SP_UpdateLoginStatus%')
      ORDER BY ROUTINE_NAME
    `);

    console.log('📋 생성된 직원 관리 SP 목록:');
    spResult.recordset.forEach(row => {
      console.log(`  ✅ ${row['SP명']} (생성: ${row['생성일'].toISOString().substring(0, 10)})`);
    });

    console.log('✅ 직원 관리 Stored Procedures 생성이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 직원 관리 SP 생성 실패:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔄 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
createEmployeeProcedures();