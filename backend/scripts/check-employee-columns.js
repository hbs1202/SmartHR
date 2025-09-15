/**
 * 직원 테이블 컬럼 구조 확인 스크립트
 */

const sql = require('mssql');
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
    enableArithAbort: true
  }
};

async function checkEmployeeColumns() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 직원 테이블 컬럼 구조 확인
    const result = await pool.request().query(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        CHARACTER_MAXIMUM_LENGTH,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'uEmployeeTb'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('\n📋 uEmployeeTb 테이블 컬럼 구조:');
    result.recordset.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`  ${col.COLUMN_NAME} - ${col.DATA_TYPE}${length} ${nullable}${defaultVal}`);
    });

    // 인증 관련 컬럼들 특별히 확인
    console.log('\n🔍 인증 관련 컬럼 확인:');
    const authColumns = ['LoginFailCount', 'AccountLocked', 'LastLoginAt', 'PasswordChangedAt'];
    
    authColumns.forEach(colName => {
      const found = result.recordset.find(col => col.COLUMN_NAME === colName);
      if (found) {
        console.log(`  ✅ ${colName} - 존재`);
      } else {
        console.log(`  ❌ ${colName} - 없음`);
      }
    });
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔄 데이터베이스 연결 종료');
    }
  }
}

checkEmployeeColumns();