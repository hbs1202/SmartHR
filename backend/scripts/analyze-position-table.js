/**
 * uPositionTb 테이블 상세 구조 분석
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
    console.log('🔍 uPositionTb 테이블 상세 분석 중...');
    
    const pool = await sql.connect(config);
    
    // 1. uPositionTb 테이블 구조 조회
    console.log('\n=== uPositionTb 테이블 구조 ===');
    const structure = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'uPositionTb'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📊 컬럼 구조:');
    structure.recordset.forEach(col => {
      const length = col.CHARACTER_MAXIMUM_LENGTH ? `(${col.CHARACTER_MAXIMUM_LENGTH})` : 
                     (col.NUMERIC_PRECISION ? `(${col.NUMERIC_PRECISION}${col.NUMERIC_SCALE ? ',' + col.NUMERIC_SCALE : ''})` : '');
      console.log(`  ${col.ORDINAL_POSITION}. ${col.COLUMN_NAME}: ${col.DATA_TYPE}${length} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} ${col.COLUMN_DEFAULT ? `DEFAULT ${col.COLUMN_DEFAULT}` : ''}`);
    });
    
    // 2. 기존 직책 데이터 확인
    console.log('\n=== 기존 직책 데이터 ===');
    const existingData = await pool.request().query(`
      SELECT TOP 10 * FROM uPositionTb
      ORDER BY PositionId
    `);
    
    if (existingData.recordset.length > 0) {
      console.log('📝 기존 직책 데이터:');
      existingData.recordset.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
      });
    } else {
      console.log('❌ 기존 직책 데이터가 없습니다.');
    }
    
    // 3. 테이블 제약조건 확인
    console.log('\n=== 테이블 제약조건 ===');
    const constraints = await pool.request().query(`
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.CONSTRAINT_TYPE,
        kcu.COLUMN_NAME,
        rc.MATCH_OPTION,
        rc.UPDATE_RULE,
        rc.DELETE_RULE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
      LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu 
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
        ON tc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      WHERE tc.TABLE_NAME = 'uPositionTb'
      ORDER BY tc.CONSTRAINT_TYPE, tc.CONSTRAINT_NAME
    `);
    
    console.log('🔒 제약조건:');
    constraints.recordset.forEach(constraint => {
      console.log(`  - ${constraint.CONSTRAINT_TYPE}: ${constraint.CONSTRAINT_NAME} (${constraint.COLUMN_NAME || 'N/A'})`);
    });
    
    // 4. 인덱스 정보 확인
    console.log('\n=== 인덱스 정보 ===');
    const indexes = await pool.request().query(`
      SELECT 
        i.name AS index_name,
        i.type_desc AS index_type,
        c.name AS column_name,
        ic.is_descending_key
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE i.object_id = OBJECT_ID('uPositionTb')
      ORDER BY i.name, ic.key_ordinal
    `);
    
    console.log('📚 인덱스:');
    indexes.recordset.forEach(idx => {
      console.log(`  - ${idx.index_name} (${idx.index_type}): ${idx.column_name} ${idx.is_descending_key ? 'DESC' : 'ASC'}`);
    });
    
    await pool.close();
    console.log('\n✅ uPositionTb 테이블 분석 완료');
    
  } catch (error) {
    console.error('❌ 테이블 분석 실패:', error.message);
    process.exit(1);
  }
}

analyzePositionTable();