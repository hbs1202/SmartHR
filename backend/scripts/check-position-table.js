/**
 * 직책 테이블 구조 분석 스크립트
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

async function analyzePositionTable() {
  try {
    console.log('🔍 직책 테이블 구조 분석 중...');
    
    const pool = await sql.connect(config);
    
    // 1. 직책 관련 테이블 목록 조회
    console.log('\n=== 직책 관련 테이블 목록 ===');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME, TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%position%' OR TABLE_NAME LIKE '%직책%' OR TABLE_NAME LIKE '%pos%'
         OR TABLE_NAME LIKE '%rank%' OR TABLE_NAME LIKE '%title%'
      ORDER BY TABLE_NAME
    `);
    
    if (tablesResult.recordset.length > 0) {
      tablesResult.recordset.forEach(table => {
        console.log(`📋 ${table.TABLE_NAME} (${table.TABLE_TYPE})`);
      });
    } else {
      console.log('❌ 직책 관련 테이블을 찾을 수 없습니다.');
      
      // 모든 테이블 목록 조회
      console.log('\n=== 전체 테이블 목록 ===');
      const allTablesResult = await pool.request().query(`
        SELECT TABLE_NAME, TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
      
      allTablesResult.recordset.forEach(table => {
        console.log(`📋 ${table.TABLE_NAME}`);
      });
    }
    
    // 2. 직원 테이블에서 직책 관련 컬럼 확인
    console.log('\n=== 직원 테이블 구조 분석 ===');
    try {
      const employeeStructure = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME LIKE '%employee%' OR TABLE_NAME LIKE '%emp%' OR TABLE_NAME LIKE '%직원%'
        ORDER BY ORDINAL_POSITION
      `);
      
      if (employeeStructure.recordset.length > 0) {
        console.log('📊 직원 테이블 컬럼:');
        employeeStructure.recordset.forEach(col => {
          console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE}${col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : ''} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
      }
    } catch (error) {
      console.log('❌ 직원 테이블을 찾을 수 없습니다.');
    }
    
    // 3. 기존 샘플 데이터로 직책 정보 확인
    console.log('\n=== 기존 데이터에서 직책 정보 확인 ===');
    try {
      // 여러 가능한 테이블명으로 시도
      const possibleTables = ['uEmployeeTb', 'employee', 'emp', 'Employee'];
      let found = false;
      
      for (const tableName of possibleTables) {
        try {
          const sampleData = await pool.request().query(`
            SELECT TOP 5 * FROM ${tableName}
          `);
          
          if (sampleData.recordset.length > 0) {
            console.log(`📝 ${tableName} 테이블 샘플 데이터:`);
            sampleData.recordset.forEach((row, index) => {
              console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
            });
            found = true;
            break;
          }
        } catch (err) {
          // 테이블이 없으면 다음으로 넘어감
          continue;
        }
      }
      
      if (!found) {
        console.log('❌ 직원 데이터를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.log('❌ 샘플 데이터 조회 실패:', error.message);
    }
    
    await pool.close();
    console.log('\n✅ 직책 테이블 구조 분석 완료');
    
  } catch (error) {
    console.error('❌ 직책 테이블 분석 실패:', error.message);
    process.exit(1);
  }
}

analyzePositionTable();