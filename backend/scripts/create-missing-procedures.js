/**
 * 누락된 전자결재 저장 프로시저 생성
 * @description SP_CreateApprovalDocument, SP_ProcessApproval 개별 생성
 * @author SmartHR Team
 * @date 2024-09-14
 */

const sql = require('mssql');
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
 * 누락된 저장 프로시저 생성
 */
async function createMissingProcedures() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('📋 누락된 저장 프로시저 생성 시작...');
    
    // 1. SP_CreateApprovalDocument 생성
    console.log('🔄 SP_CreateApprovalDocument 생성 중...');
    
    // 기존 프로시저 삭제
    await pool.request().query(`
      IF OBJECT_ID('SP_CreateApprovalDocument', 'P') IS NOT NULL
          DROP PROCEDURE SP_CreateApprovalDocument
    `);
    
    const createDocumentSP = `
    CREATE PROCEDURE SP_CreateApprovalDocument
        @FormId INT,                    -- 결재 양식 ID
        @Title NVARCHAR(200),           -- 문서 제목
        @Content NTEXT,                 -- 문서 내용 (JSON 형태)
        @RequesterId INT,               -- 신청자 ID
        @ApprovalLineJson NTEXT = NULL, -- 사용자 지정 결재선 (JSON 배열)
        @ResultCode INT OUTPUT,         -- 결과 코드 (0: 성공, -1: 실패)
        @Message NVARCHAR(500) OUTPUT,  -- 결과 메시지
        @DocumentId INT OUTPUT          -- 생성된 문서 ID
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @DocumentNo NVARCHAR(50);
        DECLARE @AutoApprovalLine NVARCHAR(500);
        DECLARE @MaxLevel INT;
        DECLARE @CurrentDate DATETIME = GETDATE();
        DECLARE @YearMonth NVARCHAR(6) = FORMAT(@CurrentDate, 'yyyyMM');
        
        BEGIN TRY
            -- 1. 입력값 검증
            IF @FormId IS NULL OR @RequesterId IS NULL
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '필수 파라미터가 누락되었습니다.';
                RETURN;
            END
            
            -- 2. 결재 양식 정보 조회
            SELECT @AutoApprovalLine = AutoApprovalLine, @MaxLevel = MaxApprovalLevel
            FROM uApprovalFormTb 
            WHERE FormId = @FormId AND IsActive = 1;
            
            IF @AutoApprovalLine IS NULL
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '존재하지 않는 결재 양식입니다.';
                RETURN;
            END
            
            -- 3. 문서 번호 자동 생성
            EXEC SP_GenerateDocumentNumber 
                @FormId = @FormId,
                @YearMonth = @YearMonth,
                @DocumentNo = @DocumentNo OUTPUT;
            
            -- 4. 결재 문서 생성
            INSERT INTO uApprovalDocumentTb (
                DocumentNo, FormId, Title, Content, RequesterId,
                CurrentStatus, CurrentLevel, TotalLevel,
                CreatedAt
            ) VALUES (
                @DocumentNo, @FormId, @Title, @Content, @RequesterId,
                'DRAFT', 0, @MaxLevel,
                @CurrentDate
            );
            
            SET @DocumentId = SCOPE_IDENTITY();
            
            -- 5. 자동 결재선 생성
            EXEC SP_CreateAutoApprovalLine 
                @DocumentId = @DocumentId,
                @RequesterId = @RequesterId,
                @AutoApprovalLine = @AutoApprovalLine,
                @ResultCode = @ResultCode OUTPUT,
                @Message = @Message OUTPUT;
            
            -- 결재선 생성 실패 시 롤백
            IF @ResultCode = -1
            BEGIN
                DELETE FROM uApprovalDocumentTb WHERE DocumentId = @DocumentId;
                RETURN;
            END
            
            -- 6. 결재 히스토리 생성 (작성)
            INSERT INTO uApprovalHistoryTb (
                DocumentId, ActionType, ActionBy,
                ActionDate, Comment, NewStatus
            ) VALUES (
                @DocumentId, 'DRAFT', @RequesterId,
                @CurrentDate, '결재 문서 작성', 'DRAFT'
            );
            
            SET @ResultCode = 0;
            SET @Message = '결재 문서가 성공적으로 생성되었습니다. (문서번호: ' + @DocumentNo + ')';
            
        END TRY
        BEGIN CATCH
            SET @ResultCode = -1;
            SET @Message = '문서 생성 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        END CATCH
    END`;
    
    await pool.request().query(createDocumentSP);
    console.log('✅ SP_CreateApprovalDocument 생성 완료');

    // 2. SP_ProcessApproval 생성
    console.log('🔄 SP_ProcessApproval 생성 중...');
    
    // 기존 프로시저 삭제
    await pool.request().query(`
      IF OBJECT_ID('SP_ProcessApproval', 'P') IS NOT NULL
          DROP PROCEDURE SP_ProcessApproval
    `);
    
    const processApprovalSP = `
    CREATE PROCEDURE SP_ProcessApproval
        @DocumentId INT,        -- 문서 ID
        @ApproverId INT,        -- 결재자 ID
        @Action NVARCHAR(20),   -- 액션 (APPROVE, REJECT)
        @Comment NTEXT = NULL,  -- 결재 의견
        @ResultCode INT OUTPUT,
        @Message NVARCHAR(500) OUTPUT
    AS
    BEGIN
        SET NOCOUNT ON;
        
        DECLARE @CurrentLevel INT;
        DECLARE @TotalLevel INT;
        DECLARE @CurrentStatus NVARCHAR(20);
        DECLARE @NextLevel INT;
        
        BEGIN TRY
            -- 1. 문서 정보 조회
            SELECT @CurrentLevel = CurrentLevel, @TotalLevel = TotalLevel, @CurrentStatus = CurrentStatus
            FROM uApprovalDocumentTb 
            WHERE DocumentId = @DocumentId;
            
            -- 2. 문서 존재 여부 확인
            IF @CurrentLevel IS NULL
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '존재하지 않는 문서입니다.';
                RETURN;
            END
            
            -- 3. 결재 가능 상태 확인
            IF @CurrentStatus NOT IN ('PENDING', 'IN_PROGRESS')
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '결재 처리할 수 없는 문서 상태입니다.';
                RETURN;
            END
            
            -- 4. 결재 권한 확인
            IF NOT EXISTS (
                SELECT 1 FROM uApprovalLineTb 
                WHERE DocumentId = @DocumentId 
                AND ApproverEmployeeId = @ApproverId 
                AND ApprovalLevel = @CurrentLevel + 1
                AND ApprovalStatus = 'PENDING'
            )
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '결재 권한이 없습니다.';
                RETURN;
            END
            
            -- 5. 결재 처리
            SET @NextLevel = @CurrentLevel + 1;
            
            -- 결재선 업데이트
            UPDATE uApprovalLineTb 
            SET ApprovalStatus = @Action,
                ApprovalDate = GETDATE(),
                ApprovalComment = @Comment,
                ActualApproverEmployeeId = @ApproverId
            WHERE DocumentId = @DocumentId 
            AND ApproverEmployeeId = @ApproverId 
            AND ApprovalLevel = @NextLevel;
            
            -- 결재 히스토리 생성
            INSERT INTO uApprovalHistoryTb (
                DocumentId, ActionType, ActionBy,
                ActionDate, Comment, NewStatus
            ) VALUES (
                @DocumentId, @Action, @ApproverId,
                GETDATE(), @Comment, @Action
            );
            
            -- 6. 문서 상태 업데이트
            IF @Action = 'REJECT'
            BEGIN
                -- 반려 처리
                UPDATE uApprovalDocumentTb 
                SET CurrentStatus = 'REJECTED',
                    ProcessedAt = GETDATE()
                WHERE DocumentId = @DocumentId;
                
                SET @Message = '문서가 반려되었습니다.';
            END
            ELSE IF @Action = 'APPROVE'
            BEGIN
                -- 승인 처리
                IF @NextLevel >= @TotalLevel
                BEGIN
                    -- 최종 승인
                    UPDATE uApprovalDocumentTb 
                    SET CurrentStatus = 'APPROVED',
                        CurrentLevel = @NextLevel,
                        ProcessedAt = GETDATE()
                    WHERE DocumentId = @DocumentId;
                    
                    SET @Message = '문서가 최종 승인되었습니다.';
                END
                ELSE
                BEGIN
                    -- 중간 승인
                    UPDATE uApprovalDocumentTb 
                    SET CurrentStatus = 'IN_PROGRESS',
                        CurrentLevel = @NextLevel
                    WHERE DocumentId = @DocumentId;
                    
                    SET @Message = '문서가 승인되어 다음 결재자에게 전달되었습니다.';
                END
            END
            
            SET @ResultCode = 0;
            
        END TRY
        BEGIN CATCH
            SET @ResultCode = -1;
            SET @Message = '결재 처리 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        END CATCH
    END`;
    
    await pool.request().query(processApprovalSP);
    console.log('✅ SP_ProcessApproval 생성 완료');

    // 생성된 저장 프로시저 최종 확인
    const finalResult = await pool.request().query(`
      SELECT 
        name AS ProcedureName,
        create_date AS CreatedDate
      FROM sys.procedures 
      WHERE name IN ('SP_CreateApprovalDocument', 'SP_ProcessApproval')
      ORDER BY name
    `);

    console.log('');
    console.log('🎉 누락된 저장 프로시저 생성이 완료되었습니다!');
    console.log('');
    console.log('📊 처리 결과:');
    console.log(`   - 신규 생성: 2개`);
    console.log(`   - 확인된 프로시저: ${finalResult.recordset.length}개`);
    console.log('');
    console.log('📋 생성된 프로시저:');
    
    finalResult.recordset.forEach((proc, index) => {
      const createdDate = new Date(proc.CreatedDate).toLocaleDateString('ko-KR');
      console.log(`   ${index + 1}. ${proc.ProcedureName} (생성일: ${createdDate})`);
    });

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
  createMissingProcedures();
}

module.exports = { createMissingProcedures };