/**
 * SP 네이밍 규칙 적용 스크립트
 * SP_로 시작하는 모든 SP를 x_로 변경
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

// SP 이름 매핑
const spNameMapping = {
  // 조회용 SP
  'SP_GetCompanies': 'x_GetCompanies',
  'SP_GetCompanyById': 'x_GetCompanyById',
  'SP_GetSubCompanies': 'x_GetSubCompanies',
  'SP_GetSubCompanyById': 'x_GetSubCompanyById',
  'SP_GetDepartments': 'x_GetDepartments',
  'SP_GetDepartmentById': 'x_GetDepartmentById',
  'SP_GetPositions': 'x_GetPositions',
  'SP_GetPositionById': 'x_GetPositionById',
  'SP_GetEmployees': 'x_GetEmployees',
  'SP_GetEmployeeById': 'x_GetEmployeeById',
  'SP_GetOrganizationTree': 'x_GetOrganizationTree',
  
  // 수정용 SP
  'SP_UpdateCompany': 'x_UpdateCompany',
  'SP_UpdateSubCompany': 'x_UpdateSubCompany',
  'SP_UpdateDepartment': 'x_UpdateDepartment',
  'SP_UpdatePosition': 'x_UpdatePosition',
  'SP_UpdateEmployee': 'x_UpdateEmployee',
  
  // 삭제용 SP
  'SP_DeleteCompany': 'x_DeleteCompany',
  'SP_DeleteSubCompany': 'x_DeleteSubCompany',
  'SP_DeleteDepartment': 'x_DeleteDepartment',
  'SP_DeletePosition': 'x_DeletePosition',
  'SP_DeleteEmployee': 'x_DeleteEmployee',
  
  // 인증 관련 SP
  'SP_AuthLogin': 'x_AuthLogin',
  'SP_ChangePassword': 'x_ChangePassword',
  
  // 기타 생성용 SP (이미 x_로 시작하지만 중복 확인)
  'SP_CreateDepartment': 'x_CreateDepartment',
  'SP_CreatePosition': 'x_CreatePosition',
  'SP_CreateSubCompany': 'x_CreateSubCompany'
};

async function renameSPsToXNaming() {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 현재 SP_ 시작 SP 목록 확인
    console.log('\n📋 SP_ 시작 SP 목록 확인');
    const currentSPs = await sql.query(`
      SELECT name 
      FROM sys.objects 
      WHERE type = 'P' AND name LIKE 'SP_%'
      ORDER BY name
    `);
    
    console.log(`현재 SP_ 시작 SP: ${currentSPs.recordset.length}개`);
    currentSPs.recordset.forEach(sp => {
      const newName = spNameMapping[sp.name];
      console.log(`  ${sp.name} → ${newName || '매핑 없음'}`);
    });

    // 2. 사용자 확인
    console.log('\n⚠️  주의: 이 작업은 다음을 수행합니다:');
    console.log('   1. SP_로 시작하는 모든 SP를 x_로 변경');
    console.log('   2. 기존 SP는 삭제됩니다');
    console.log('   3. 컨트롤러 코드도 함께 업데이트 해야 합니다');
    console.log('\n🔄 SP 이름 변경을 시작합니다...');

    let renamedCount = 0;
    let errors = [];

    // 3. SP 이름 변경 (실제로는 새로운 이름으로 재생성)
    for (const sp of currentSPs.recordset) {
      const oldName = sp.name;
      const newName = spNameMapping[oldName];
      
      if (!newName) {
        console.log(`⚠️  ${oldName}: 매핑되지 않은 SP, 건너뜀`);
        continue;
      }

      try {
        // SP 정의 가져오기
        const spDefinition = await sql.query(`
          SELECT OBJECT_DEFINITION(OBJECT_ID('${oldName}')) AS definition
        `);
        
        if (!spDefinition.recordset[0]?.definition) {
          console.log(`❌ ${oldName}: SP 정의를 가져올 수 없음`);
          errors.push(`${oldName}: SP 정의 가져오기 실패`);
          continue;
        }

        let definition = spDefinition.recordset[0].definition;
        
        // SP 이름 변경
        definition = definition.replace(
          new RegExp(`CREATE PROCEDURE ${oldName}`, 'gi'), 
          `CREATE PROCEDURE ${newName}`
        );

        // 기존 SP가 있다면 삭제
        await sql.query(`
          IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND OBJECT_ID = OBJECT_ID('${newName}'))
          DROP PROCEDURE ${newName}
        `);

        // 새로운 이름으로 SP 생성
        await sql.query(definition);
        
        // 기존 SP 삭제
        await sql.query(`DROP PROCEDURE ${oldName}`);
        
        console.log(`✅ ${oldName} → ${newName} 변경 완료`);
        renamedCount++;
        
      } catch (error) {
        console.log(`❌ ${oldName} 변경 실패: ${error.message}`);
        errors.push(`${oldName}: ${error.message}`);
      }
    }

    // 4. 결과 요약
    console.log('\n📊 SP 이름 변경 결과');
    console.log(`✅ 성공: ${renamedCount}개`);
    console.log(`❌ 실패: ${errors.length}개`);
    
    if (errors.length > 0) {
      console.log('\n❌ 실패 목록:');
      errors.forEach(error => console.log(`  - ${error}`));
    }

    // 5. 최종 확인
    console.log('\n📋 변경 후 SP 목록 확인');
    const finalSPs = await sql.query(`
      SELECT name 
      FROM sys.objects 
      WHERE type = 'P' AND name LIKE 'x_%'
      ORDER BY name
    `);
    
    console.log(`현재 x_ 시작 SP: ${finalSPs.recordset.length}개`);
    finalSPs.recordset.forEach(sp => {
      console.log(`  ✅ ${sp.name}`);
    });

    if (renamedCount > 0) {
      console.log('\n⚠️  중요: 컨트롤러 파일들도 업데이트 해야 합니다!');
      console.log('   executeStoredProcedure() 호출 부분의 SP 이름 변경 필요');
    }

  } catch (error) {
    console.error('❌ SP 이름 변경 실패:', error.message);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
}

renameSPsToXNaming().catch(console.error);