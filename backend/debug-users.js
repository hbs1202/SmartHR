/**
 * 데이터베이스 사용자 확인 스크립트
 */

const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'hr_system',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

async function checkUsers() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 데이터베이스 테이블 목록 확인
    console.log('🔍 데이터베이스 테이블 목록 확인...');
    const tablesResult = await sql.query`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `;

    console.log('📋 테이블 목록:');
    tablesResult.recordset.forEach(table => {
      console.log(`  - ${table.TABLE_NAME}`);
    });

    // Users 테이블이 있는지 확인
    const userTables = tablesResult.recordset.filter(table =>
      table.TABLE_NAME.toLowerCase().includes('user') ||
      table.TABLE_NAME.toLowerCase().includes('employee') ||
      table.TABLE_NAME.toLowerCase().includes('auth')
    );

    if (userTables.length > 0) {
      console.log('\n🔍 사용자 관련 테이블 데이터 확인:');
      for (const table of userTables) {
        try {
          console.log(`\n📊 ${table.TABLE_NAME} 테이블:`);
          const result = await sql.query(`SELECT TOP 5 * FROM [${table.TABLE_NAME}]`);

          if (result.recordset.length > 0) {
            console.log(`  레코드 수: ${result.recordset.length}`);
            console.log('  컬럼:', Object.keys(result.recordset[0]).join(', '));

            // smarthr.com 도메인 찾기
            result.recordset.forEach((record, index) => {
              console.log(`  [${index + 1}]`, JSON.stringify(record, null, 4));
            });
          } else {
            console.log('  데이터 없음');
          }
        } catch (err) {
          console.log(`  오류: ${err.message}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ 데이터베이스 오류:', error.message);
    console.error('🔍 연결 정보:', {
      server: dbConfig.server,
      database: dbConfig.database,
      user: dbConfig.user,
      port: dbConfig.port
    });
  } finally {
    try {
      await sql.close();
      console.log('🔌 데이터베이스 연결 해제');
    } catch (e) {
      console.log('연결 해제 중 오류 (무시 가능):', e.message);
    }
  }
}

checkUsers();