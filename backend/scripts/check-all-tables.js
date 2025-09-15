/**
 * 전체 테이블 목록 및 직원 테이블 확인 스크립트
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

async function checkAllTables() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 전체 테이블 목록 확인
    console.log('\n📋 데이터베이스의 모든 테이블:');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    tablesResult.recordset.forEach(table => {
      console.log(`  📄 ${table.TABLE_NAME}`);
    });

    // 직원 관련 테이블 찾기
    console.log('\n🔍 직원 관련 테이블 검색:');
    const empTablesResult = await pool.request().query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%Employee%' OR TABLE_NAME LIKE '%emp%'
      ORDER BY TABLE_NAME
    `);
    
    if (empTablesResult.recordset.length > 0) {
      empTablesResult.recordset.forEach(table => {
        console.log(`  👤 ${table.TABLE_NAME}`);
      });
      
      // 첫 번째 직원 테이블의 컬럼 구조 확인
      const firstTable = empTablesResult.recordset[0].TABLE_NAME;
      console.log(`\n📋 ${firstTable} 테이블 컬럼 구조:`);
      
      const columnsResult = await pool.request().query(`
        SELECT 
          COLUMN_NAME, 
          DATA_TYPE, 
          IS_NULLABLE,
          CHARACTER_MAXIMUM_LENGTH,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${firstTable}'
        ORDER BY ORDINAL_POSITION
      `);
      
      columnsResult.recordset.forEach(col => {
        const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : '';
        const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
        const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
        console.log(`    ${col.COLUMN_NAME} - ${col.DATA_TYPE}${length} ${nullable}${defaultVal}`);
      });
    } else {
      console.log('  ❌ 직원 관련 테이블을 찾을 수 없습니다.');
    }

    // SP 목록도 확인
    console.log('\n📋 인증 관련 Stored Procedures:');
    const spResult = await pool.request().query(`
      SELECT name, create_date, modify_date
      FROM sys.procedures 
      WHERE name LIKE '%Auth%' OR name LIKE '%Login%' OR name LIKE '%Password%'
      ORDER BY name
    `);
    
    if (spResult.recordset.length > 0) {
      spResult.recordset.forEach(sp => {
        console.log(`  ⚙️ ${sp.name} (생성: ${sp.create_date.toISOString().substring(0, 10)})`);
      });
    } else {
      console.log('  ❌ 인증 관련 SP를 찾을 수 없습니다.');
    }
    
  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔄 데이터베이스 연결 종료');
    }
  }
}

checkAllTables();