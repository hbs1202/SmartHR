/**
 * 데이터베이스 연결 테스트 스크립트
 * @description MS SQL Server 연결 상태 확인
 * @author SmartHR Team
 * @date 2024-09-12
 */

require('dotenv').config();
const { initializePool, executeQuery, closePool } = require('../src/database/dbHelper');

/**
 * 데이터베이스 연결 테스트 실행
 */
const testDatabaseConnection = async () => {
  console.log('==========================================');
  console.log('🔄 데이터베이스 연결 테스트 시작');
  console.log('==========================================');
  
  try {
    // 1. 연결 풀 초기화 테스트
    console.log('1️⃣ 연결 풀 초기화 테스트...');
    await initializePool();
    console.log('✅ 연결 풀 초기화 성공');
    
    // 2. 기본 쿼리 실행 테스트
    console.log('\n2️⃣ 기본 쿼리 실행 테스트...');
    const result = await executeQuery('SELECT @@VERSION as ServerVersion, GETDATE() as CurrentTime');
    
    if (result.data && result.data.length > 0) {
      console.log('✅ 쿼리 실행 성공');
      console.log('📊 서버 정보:', {
        version: result.data[0].ServerVersion.substring(0, 50) + '...',
        currentTime: result.data[0].CurrentTime,
        executionTime: result.executionTime + 'ms'
      });
    }
    
    // 3. 데이터베이스 존재 확인
    console.log('\n3️⃣ 데이터베이스 존재 확인...');
    const dbResult = await executeQuery(`
      SELECT 
        name as DatabaseName,
        create_date as CreateDate,
        collation_name as Collation
      FROM sys.databases 
      WHERE name = 'hr_system'
    `);
    
    if (dbResult.data && dbResult.data.length > 0) {
      console.log('✅ hr_system 데이터베이스 존재 확인');
      console.log('📊 데이터베이스 정보:', {
        name: dbResult.data[0].DatabaseName,
        createDate: dbResult.data[0].CreateDate,
        collation: dbResult.data[0].Collation
      });
    } else {
      console.log('⚠️ hr_system 데이터베이스가 존재하지 않습니다.');
      console.log('💡 데이터베이스 생성이 필요합니다.');
    }
    
    // 4. 테이블 존재 확인 (데이터베이스가 있는 경우)
    if (dbResult.data && dbResult.data.length > 0) {
      console.log('\n4️⃣ 테이블 존재 확인...');
      const tableResult = await executeQuery(`
        SELECT TABLE_NAME, TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
      
      if (tableResult.data && tableResult.data.length > 0) {
        console.log('✅ 기존 테이블 발견:', tableResult.data.length + '개');
        tableResult.data.forEach(table => {
          console.log(`   📋 ${table.TABLE_NAME}`);
        });
      } else {
        console.log('ℹ️ 사용자 정의 테이블이 없습니다. (신규 프로젝트)');
      }
    }
    
    console.log('\n==========================================');
    console.log('✅ 데이터베이스 연결 테스트 완료');
    console.log('==========================================');
    
  } catch (error) {
    console.error('==========================================');
    console.error('❌ 데이터베이스 연결 테스트 실패');
    console.error('==========================================');
    console.error('오류 내용:', error.message);
    
    // 일반적인 오류 해결 방법 안내
    console.log('\n💡 문제 해결 방법:');
    console.log('1. SQL Server가 실행 중인지 확인하세요');
    console.log('2. .env 파일의 데이터베이스 설정을 확인하세요');
    console.log('3. 방화벽에서 SQL Server 포트(1433)가 열려있는지 확인하세요');
    console.log('4. SQL Server에서 TCP/IP가 활성화되어 있는지 확인하세요');
    
  } finally {
    // 연결 종료
    await closePool();
    console.log('\n🔚 연결 풀 정리 완료');
    process.exit(0);
  }
};

// 테스트 실행
testDatabaseConnection();