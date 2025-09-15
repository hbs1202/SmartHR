const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: { encrypt: false, trustServerCertificate: true }
};

async function checkTableStructure() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'uDeptTb' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('uDeptTb 테이블 구조:');
    result.recordset.forEach(row => {
      const maxLength = row.CHARACTER_MAXIMUM_LENGTH ? `(${row.CHARACTER_MAXIMUM_LENGTH})` : '';
      console.log(`  - ${row.COLUMN_NAME} ${row.DATA_TYPE}${maxLength} ${row.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    await pool.close();
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkTableStructure();