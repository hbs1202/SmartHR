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
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'uSubCompanyTb' 
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('uSubCompanyTb 테이블 구조:');
    result.recordset.forEach(row => {
      console.log(`  - ${row.COLUMN_NAME} (${row.DATA_TYPE}, ${row.IS_NULLABLE})`);
    });
    
    await pool.close();
  } catch (error) {
    console.error('오류:', error.message);
  }
}

checkTableStructure();