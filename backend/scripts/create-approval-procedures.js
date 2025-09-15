/**
 * 전자결재 시스템 Stored Procedure 생성 스크립트
 * @description 결재 처리 관련 핵심 저장 프로시저 생성
 * @author SmartHR Team
 * @date 2024-09-14
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 300000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

/**
 * 저장 프로시저 생성 실행
 */
async function createApprovalProcedures() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('📋 전자결재 시스템 Stored Procedure 생성 시작...');
    
    // SQL 파일 읽기
    const sqlFilePath = path.join(__dirname, '..', 'sql', 'procedures', 'create-approval-procedures.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // 기존 저장 프로시저 삭제
    console.log('📋 기존 저장 프로시저 삭제 중...');
    const dropProcedures = [
      'SP_CreateApprovalDocument',
      'SP_GenerateDocumentNumber', 
      'SP_CreateAutoApprovalLine',
      'SP_ProcessApproval',
      'SP_GetApprovalDocument',
      'SP_GetPendingApprovalList',
      'SP_GetMyDocumentList'
    ];
    
    for (const procName of dropProcedures) {
      try {
        await pool.request().query(`IF OBJECT_ID('${procName}', 'P') IS NOT NULL DROP PROCEDURE ${procName}`);
        console.log(`🗑️ ${procName} 삭제 완료`);
      } catch (error) {
        console.log(`⚠️ ${procName} 삭제 실패: ${error.message}`);
      }
    }

    // SQL 스크립트를 개별 명령으로 분리 (GO 문을 기준으로)
    const sqlCommands = sqlContent
      .split(/\r?\nGO\r?\n/)
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('/*') && !cmd.startsWith('--'));

    console.log(`📊 생성할 저장 프로시저: ${sqlCommands.length - 1}개`); // 마지막 PRINT 문 제외

    let createdCount = 0;
    let errorCount = 0;

    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      
      if (command.includes('USE [hr_system]') || command.includes('PRINT')) {
        continue; // USE 문과 PRINT 문은 건너뛰기
      }

      try {
        await pool.request().query(command);
        
        // 프로시저 이름 추출
        const procMatch = command.match(/CREATE PROCEDURE\s+(\w+)/i);
        if (procMatch) {
          console.log(`✅ ${procMatch[1]} 생성 완료`);
          createdCount++;
        }
        
      } catch (error) {
        console.error(`❌ 저장 프로시저 생성 오류:`, error.message);
        errorCount++;
      }
    }

    // 생성된 저장 프로시저 목록 확인
    const procedureList = await pool.request().query(`
      SELECT 
        name AS ProcedureName,
        create_date AS CreatedDate,
        modify_date AS ModifiedDate
      FROM sys.procedures 
      WHERE name LIKE 'SP_%Approval%' 
      OR name LIKE 'SP_GetPending%'
      OR name LIKE 'SP_GetMy%'
      ORDER BY name
    `);

    console.log('');
    console.log('🎉 전자결재 시스템 Stored Procedure 생성이 완료되었습니다!');
    console.log('');
    console.log('📊 처리 결과:');
    console.log(`   - 생성 성공: ${createdCount}개`);
    console.log(`   - 생성 실패: ${errorCount}개`);
    console.log(`   - 총 등록된 프로시저: ${procedureList.recordset.length}개`);
    console.log('');
    console.log('📋 생성된 저장 프로시저 목록:');
    
    procedureList.recordset.forEach((proc, index) => {
      const createdDate = new Date(proc.CreatedDate).toLocaleDateString('ko-KR');
      console.log(`   ${index + 1}. ${proc.ProcedureName} (생성일: ${createdDate})`);
    });

    console.log('');
    console.log('🔧 주요 프로시저 기능:');
    console.log('   • SP_CreateApprovalDocument: 결재 문서 생성 및 결재선 자동 설정');
    console.log('   • SP_ProcessApproval: 결재 승인/반려 처리');
    console.log('   • SP_GetApprovalDocument: 결재 문서 상세 조회');
    console.log('   • SP_GetPendingApprovalList: 결재 대기 문서 목록');
    console.log('   • SP_GetMyDocumentList: 내가 신청한 문서 목록');
    console.log('   • SP_GenerateDocumentNumber: 문서번호 자동 생성');
    console.log('   • SP_CreateAutoApprovalLine: 자동 결재선 생성');

    console.log('');
    console.log('📝 다음 단계:');
    console.log('   1. 결재 프로세스 API 개발');
    console.log('   2. 휴가 신청 결재 시스템 구현');
    console.log('   3. 결재 알림 시스템 구현');

  } catch (error) {
    console.error('❌ 저장 프로시저 생성 중 오류 발생:', error.message);
    console.error('전체 오류:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  createApprovalProcedures();
}

module.exports = { createApprovalProcedures };