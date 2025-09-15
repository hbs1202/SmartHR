/**
 * 데이터베이스 네이밍 규칙 검사 스크립트
 */

const sql = require('mssql');
require('dotenv').config();

// 데이터베이스 연결 설정
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

async function checkNamingRules() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 테이블 네이밍 규칙 검사
    console.log('\n📋 테이블 네이밍 규칙 검사 (u로 시작, Tb로 끝나야 함)');
    const tablesQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_NAME NOT LIKE 'sys%'
      ORDER BY TABLE_NAME
    `;
    
    const tablesResult = await sql.query(tablesQuery);
    
    console.log('\n현재 테이블 목록:');
    let tableViolations = [];
    
    tablesResult.recordset.forEach(table => {
      const name = table.TABLE_NAME;
      const isCorrect = name.startsWith('u') && name.endsWith('Tb');
      
      if (isCorrect) {
        console.log(`  ✅ ${name} - 규칙 준수`);
      } else {
        console.log(`  ❌ ${name} - 규칙 위반 (u로 시작하고 Tb로 끝나야 함)`);
        tableViolations.push(name);
      }
    });

    // 2. Stored Procedure 네이밍 규칙 검사
    console.log('\n📋 Stored Procedure 네이밍 규칙 검사 (모든 SP는 x_로 시작해야 함)');
    console.log('   생성용: x_Create[TableName]');
    console.log('   조회용: x_Get[TableName]');  
    console.log('   수정용: x_Update[TableName]');
    console.log('   삭제용: x_Delete[TableName]');
    console.log('   인증용: x_Auth[Function]');
    console.log('   기타: x_[Function]');
    
    const spQuery = `
      SELECT name 
      FROM sys.objects 
      WHERE type = 'P' 
      AND name NOT LIKE 'sp_%'  -- 시스템 sp 제외 (소문자)
      ORDER BY name
    `;
    
    const spResult = await sql.query(spQuery);
    
    console.log('\n현재 Stored Procedure 목록:');
    let spViolations = [];
    
    spResult.recordset.forEach(sp => {
      const name = sp.name;
      const isCorrect = name.startsWith('x_');
      
      if (isCorrect) {
        console.log(`  ✅ ${name} - x_ 규칙 준수`);
      } else {
        console.log(`  ❌ ${name} - 규칙 위반 (x_로 시작해야 함)`);
        spViolations.push(name);
      }
    });

    // 3. 뷰 네이밍 규칙 검사 (u로 시작하고 View로 끝나야 함)
    console.log('\n📋 뷰 네이밍 규칙 검사 (u로 시작하고 View로 끝나야 함)');
    const viewsQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME NOT LIKE 'sys%'
      ORDER BY TABLE_NAME
    `;
    
    const viewsResult = await sql.query(viewsQuery);
    
    console.log('\n현재 뷰 목록:');
    let viewViolations = [];
    
    viewsResult.recordset.forEach(view => {
      const name = view.TABLE_NAME;
      const isCorrect = name.startsWith('u') && name.endsWith('View');
      
      if (isCorrect) {
        console.log(`  ✅ ${name} - 규칙 준수`);
      } else {
        console.log(`  ❌ ${name} - 규칙 위반 (u로 시작하고 View로 끝나야 함)`);
        viewViolations.push(name);
      }
    });

    // 4. 결과 요약
    console.log('\n📊 네이밍 규칙 검사 결과 요약');
    console.log(`  테이블 규칙 위반: ${tableViolations.length}개`);
    console.log(`  SP 규칙 위반: ${spViolations.length}개`);
    console.log(`  뷰 규칙 위반: ${viewViolations.length}개`);
    
    if (tableViolations.length > 0) {
      console.log('\n❌ 테이블 규칙 위반 목록:');
      tableViolations.forEach(name => {
        console.log(`  - ${name} (권장: u${name}Tb)`);
      });
    }
    
    if (spViolations.length > 0) {
      console.log('\n❌ SP 규칙 위반 목록:');
      spViolations.forEach(name => {
        console.log(`  - ${name} (권장: x_${name} 또는 SP_${name})`);
      });
    }
    
    if (viewViolations.length > 0) {
      console.log('\n❌ 뷰 규칙 위반 목록:');
      viewViolations.forEach(name => {
        console.log(`  - ${name} (권장: u${name}View)`);
      });
    }
    
    if (tableViolations.length === 0 && spViolations.length === 0 && viewViolations.length === 0) {
      console.log('\n🎉 모든 네이밍 규칙이 준수되고 있습니다!');
    }

  } catch (error) {
    console.error('❌ 네이밍 규칙 검사 실패:', error.message);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

checkNamingRules().catch(console.error);