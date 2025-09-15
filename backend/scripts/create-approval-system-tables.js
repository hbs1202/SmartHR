/**
 * 전자결재 시스템 테이블 생성 스크립트
 * @description 결재 문서, 결재라인, 결재이력 등 전자결재 시스템 테이블 생성
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

const approvalSystemTables = `
-- =================================================================
-- 전자결재 시스템 테이블 생성 스크립트
-- 작성자: SmartHR Team
-- 작성일: 2024-09-14
-- 설명: 결재 문서, 결재라인, 결재이력 테이블 생성
-- =================================================================

-- 1. 결재 문서 양식 테이블 (uApprovalFormTb)
-- 결재에 사용될 문서 양식 관리 (휴가신청서, 발령신청서, 지출결의서 등)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uApprovalFormTb' AND xtype='U')
CREATE TABLE uApprovalFormTb (
    FormId INT IDENTITY(1,1) PRIMARY KEY,                    -- 양식 ID
    FormCode NVARCHAR(50) NOT NULL UNIQUE,                  -- 양식 코드 (VACATION, ASSIGNMENT, EXPENSE 등)
    FormName NVARCHAR(100) NOT NULL,                        -- 양식명 (휴가신청서, 발령신청서 등)
    FormNameEng NVARCHAR(100),                               -- 양식명 영문
    CategoryCode NVARCHAR(30) NOT NULL,                     -- 분류 코드 (HR, FINANCE, GENERAL 등)
    CategoryName NVARCHAR(50) NOT NULL,                     -- 분류명 (인사, 재무, 일반 등)
    FormTemplate NTEXT,                                      -- 양식 템플릿 (JSON 형태)
    RequiredFields NVARCHAR(500),                           -- 필수 입력 필드 목록
    AutoApprovalLine NVARCHAR(200),                         -- 자동 결재라인 설정 (조직도 기반)
    MaxApprovalLevel INT DEFAULT 5,                         -- 최대 결재 단계
    IsActive BIT DEFAULT 1,                                 -- 활성 상태
    DisplayOrder INT DEFAULT 0,                             -- 정렬 순서
    Description NVARCHAR(500),                              -- 양식 설명
    CreatedAt DATETIME2 DEFAULT GETDATE(),                  -- 생성일시
    CreatedBy INT,                                          -- 생성자 (EmployeeId 참조)
    UpdatedAt DATETIME2,                                    -- 수정일시
    UpdatedBy INT                                           -- 수정자 (EmployeeId 참조)
);

-- 2. 결재 문서 테이블 (uApprovalDocumentTb)
-- 실제 결재 요청 문서 정보
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uApprovalDocumentTb' AND xtype='U')
CREATE TABLE uApprovalDocumentTb (
    DocumentId INT IDENTITY(1,1) PRIMARY KEY,               -- 문서 ID
    DocumentNo NVARCHAR(50) NOT NULL UNIQUE,               -- 문서 번호 (자동 생성)
    FormId INT NOT NULL,                                    -- 양식 ID (uApprovalFormTb 참조)
    Title NVARCHAR(200) NOT NULL,                          -- 제목
    Content NTEXT,                                          -- 내용 (JSON 형태의 양식 데이터)
    RequesterId INT NOT NULL,                               -- 기안자 ID (uEmployeeTb 참조)
    RequesterDeptId INT NOT NULL,                           -- 기안 부서 ID (uDeptTb 참조)
    CurrentStatus NVARCHAR(20) DEFAULT 'DRAFT',            -- 현재 상태 (DRAFT, PENDING, APPROVED, REJECTED, WITHDRAWN)
    CurrentLevel INT DEFAULT 0,                             -- 현재 결재 단계 (0: 기안, 1~N: 결재단계)
    TotalLevel INT DEFAULT 0,                               -- 총 결재 단계
    Priority NVARCHAR(10) DEFAULT 'NORMAL',                -- 우선순위 (HIGH, NORMAL, LOW)
    UrgentFlag BIT DEFAULT 0,                               -- 긴급 결재 여부
    DueDate DATETIME2,                                      -- 결재 만료일
    ProcessedAt DATETIME2,                                  -- 결재 완료일시
    WithdrawnAt DATETIME2,                                  -- 회수일시
    WithdrawnBy INT,                                        -- 회수자
    WithdrawReason NVARCHAR(500),                           -- 회수 사유
    RelatedSystemId INT,                                    -- 연관 시스템 데이터 ID (발령의 경우 AssignmentId 등)
    RelatedSystemType NVARCHAR(30),                         -- 연관 시스템 타입 (ASSIGNMENT, VACATION 등)
    AttachmentsCount INT DEFAULT 0,                         -- 첨부파일 개수
    CommentsCount INT DEFAULT 0,                            -- 결재 의견 개수
    IsActive BIT DEFAULT 1,                                 -- 활성 상태
    CreatedAt DATETIME2 DEFAULT GETDATE(),                  -- 생성일시
    UpdatedAt DATETIME2,                                    -- 수정일시
    
    FOREIGN KEY (FormId) REFERENCES uApprovalFormTb(FormId),
    FOREIGN KEY (RequesterId) REFERENCES uEmployeeTb(EmployeeId),
    FOREIGN KEY (RequesterDeptId) REFERENCES uDeptTb(DeptId),
    FOREIGN KEY (WithdrawnBy) REFERENCES uEmployeeTb(EmployeeId)
);

-- 3. 결재 라인 테이블 (uApprovalLineTb)
-- 각 결재 문서의 결재 라인 정보
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uApprovalLineTb' AND xtype='U')
CREATE TABLE uApprovalLineTb (
    LineId INT IDENTITY(1,1) PRIMARY KEY,                   -- 라인 ID
    DocumentId INT NOT NULL,                                -- 문서 ID (uApprovalDocumentTb 참조)
    ApprovalLevel INT NOT NULL,                             -- 결재 단계 (1, 2, 3, ...)
    ApprovalType NVARCHAR(20) DEFAULT 'APPROVE',            -- 결재 타입 (APPROVE: 승인, REVIEW: 검토, REFERENCE: 참조)
    ApproverPositionId INT,                                 -- 결재자 직책 ID (uPositionTb 참조)
    ApproverDeptId INT,                                     -- 결재 부서 ID (uDeptTb 참조)
    ApproverEmployeeId INT,                                 -- 지정 결재자 ID (uEmployeeTb 참조, NULL이면 직책으로 자동 결정)
    ActualApproverEmployeeId INT,                           -- 실제 결재자 ID (대결/위임 시 실제 결재한 사람)
    ApprovalStatus NVARCHAR(20) DEFAULT 'PENDING',         -- 결재 상태 (PENDING, APPROVED, REJECTED, DELEGATED)
    ApprovalDate DATETIME2,                                 -- 결재일시
    ApprovalComment NVARCHAR(1000),                         -- 결재 의견
    ReadDate DATETIME2,                                     -- 읽은 일시
    DelegatedFrom INT,                                      -- 위임받은 원 결재자 ID
    DelegatedTo INT,                                        -- 위임된 대상자 ID
    DelegationReason NVARCHAR(200),                         -- 위임 사유
    IsParallel BIT DEFAULT 0,                               -- 병렬 결재 여부 (같은 Level에서 여러 명이 동시에 결재)
    IsRequired BIT DEFAULT 1,                               -- 필수 결재 여부
    SortOrder INT DEFAULT 0,                                -- 같은 레벨 내 정렬 순서
    CreatedAt DATETIME2 DEFAULT GETDATE(),                  -- 생성일시
    
    FOREIGN KEY (DocumentId) REFERENCES uApprovalDocumentTb(DocumentId) ON DELETE CASCADE,
    FOREIGN KEY (ApproverPositionId) REFERENCES uPositionTb(PosId),
    FOREIGN KEY (ApproverDeptId) REFERENCES uDeptTb(DeptId),
    FOREIGN KEY (ApproverEmployeeId) REFERENCES uEmployeeTb(EmployeeId),
    FOREIGN KEY (ActualApproverEmployeeId) REFERENCES uEmployeeTb(EmployeeId),
    FOREIGN KEY (DelegatedFrom) REFERENCES uEmployeeTb(EmployeeId),
    FOREIGN KEY (DelegatedTo) REFERENCES uEmployeeTb(EmployeeId)
);

-- 4. 결재 히스토리 테이블 (uApprovalHistoryTb)
-- 결재 과정의 모든 이력 추적
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uApprovalHistoryTb' AND xtype='U')
CREATE TABLE uApprovalHistoryTb (
    HistoryId INT IDENTITY(1,1) PRIMARY KEY,                -- 히스토리 ID
    DocumentId INT NOT NULL,                                -- 문서 ID (uApprovalDocumentTb 참조)
    LineId INT,                                             -- 라인 ID (uApprovalLineTb 참조)
    ActionType NVARCHAR(20) NOT NULL,                       -- 액션 타입 (DRAFT, SUBMIT, APPROVE, REJECT, WITHDRAW, DELEGATE 등)
    ActionBy INT NOT NULL,                                  -- 액션 수행자 ID (uEmployeeTb 참조)
    ActionDate DATETIME2 DEFAULT GETDATE(),                 -- 액션 수행일시
    PreviousStatus NVARCHAR(20),                            -- 이전 상태
    NewStatus NVARCHAR(20),                                 -- 새로운 상태
    Comment NVARCHAR(1000),                                 -- 처리 의견/코멘트
    IPAddress NVARCHAR(45),                                 -- 접속 IP
    UserAgent NVARCHAR(200),                                -- 접속 브라우저 정보
    AdditionalData NVARCHAR(1000),                          -- 추가 데이터 (JSON)
    
    FOREIGN KEY (DocumentId) REFERENCES uApprovalDocumentTb(DocumentId) ON DELETE CASCADE,
    FOREIGN KEY (LineId) REFERENCES uApprovalLineTb(LineId),
    FOREIGN KEY (ActionBy) REFERENCES uEmployeeTb(EmployeeId)
);

-- 5. 결재 첨부파일 테이블 (uApprovalAttachmentTb)
-- 결재 문서의 첨부파일 관리
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uApprovalAttachmentTb' AND xtype='U')
CREATE TABLE uApprovalAttachmentTb (
    AttachmentId INT IDENTITY(1,1) PRIMARY KEY,             -- 첨부파일 ID
    DocumentId INT NOT NULL,                                -- 문서 ID (uApprovalDocumentTb 참조)
    OriginalFileName NVARCHAR(255) NOT NULL,                -- 원본 파일명
    StoredFileName NVARCHAR(255) NOT NULL,                  -- 저장된 파일명
    FilePath NVARCHAR(500) NOT NULL,                        -- 파일 저장 경로
    FileSize BIGINT NOT NULL,                               -- 파일 크기 (bytes)
    FileExtension NVARCHAR(10),                             -- 파일 확장자
    ContentType NVARCHAR(100),                              -- MIME 타입
    UploadedBy INT NOT NULL,                                -- 업로드한 사용자 ID
    UploadedAt DATETIME2 DEFAULT GETDATE(),                 -- 업로드 일시
    IsActive BIT DEFAULT 1,                                 -- 활성 상태
    
    FOREIGN KEY (DocumentId) REFERENCES uApprovalDocumentTb(DocumentId) ON DELETE CASCADE,
    FOREIGN KEY (UploadedBy) REFERENCES uEmployeeTb(EmployeeId)
);

-- 6. 결재 설정 테이블 (uApprovalSettingTb)
-- 조직별, 양식별 결재 라인 설정
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uApprovalSettingTb' AND xtype='U')
CREATE TABLE uApprovalSettingTb (
    SettingId INT IDENTITY(1,1) PRIMARY KEY,                -- 설정 ID
    FormId INT,                                             -- 양식 ID (NULL이면 전체 적용)
    CompanyId INT,                                          -- 회사 ID (NULL이면 전체 적용)
    DeptId INT,                                             -- 부서 ID (NULL이면 전체 적용)
    AmountMin DECIMAL(15,2),                                -- 최소 금액 (금액 기준 결재라인용)
    AmountMax DECIMAL(15,2),                                -- 최대 금액
    ApprovalLineTemplate NVARCHAR(1000),                    -- 결재라인 템플릿 (JSON)
    Priority INT DEFAULT 0,                                 -- 우선순위 (높을수록 우선)
    IsActive BIT DEFAULT 1,                                 -- 활성 상태
    CreatedAt DATETIME2 DEFAULT GETDATE(),                  -- 생성일시
    CreatedBy INT,                                          -- 생성자 ID
    UpdatedAt DATETIME2,                                    -- 수정일시
    UpdatedBy INT,                                          -- 수정자 ID
    
    FOREIGN KEY (FormId) REFERENCES uApprovalFormTb(FormId),
    FOREIGN KEY (CompanyId) REFERENCES uCompanyTb(CompanyId),
    FOREIGN KEY (DeptId) REFERENCES uDeptTb(DeptId),
    FOREIGN KEY (CreatedBy) REFERENCES uEmployeeTb(EmployeeId),
    FOREIGN KEY (UpdatedBy) REFERENCES uEmployeeTb(EmployeeId)
);

-- 7. 대결자/위임자 설정 테이블 (uApprovalDelegationTb)
-- 부재 시 결재 권한 위임 설정
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uApprovalDelegationTb' AND xtype='U')
CREATE TABLE uApprovalDelegationTb (
    DelegationId INT IDENTITY(1,1) PRIMARY KEY,             -- 위임 ID
    DelegatorId INT NOT NULL,                               -- 위임자 ID (uEmployeeTb 참조)
    DelegateId INT NOT NULL,                                -- 대결자 ID (uEmployeeTb 참조)
    FormId INT,                                             -- 특정 양식만 위임 (NULL이면 전체)
    StartDate DATETIME2 NOT NULL,                           -- 위임 시작일
    EndDate DATETIME2 NOT NULL,                             -- 위임 종료일
    Reason NVARCHAR(200),                                   -- 위임 사유
    IsActive BIT DEFAULT 1,                                 -- 활성 상태
    CreatedAt DATETIME2 DEFAULT GETDATE(),                  -- 생성일시
    CreatedBy INT,                                          -- 생성자 ID
    
    FOREIGN KEY (DelegatorId) REFERENCES uEmployeeTb(EmployeeId),
    FOREIGN KEY (DelegateId) REFERENCES uEmployeeTb(EmployeeId),
    FOREIGN KEY (FormId) REFERENCES uApprovalFormTb(FormId),
    FOREIGN KEY (CreatedBy) REFERENCES uEmployeeTb(EmployeeId),
    CHECK (EndDate > StartDate)
);

-- 인덱스 생성
-- uApprovalFormTb 인덱스
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_uApprovalForm_FormCode')
    CREATE INDEX IX_uApprovalForm_FormCode ON uApprovalFormTb(FormCode);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_uApprovalForm_Category')
    CREATE INDEX IX_uApprovalForm_Category ON uApprovalFormTb(CategoryCode);

-- uApprovalDocumentTb 인덱스
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_uApprovalDocument_DocumentNo')
    CREATE UNIQUE INDEX IX_uApprovalDocument_DocumentNo ON uApprovalDocumentTb(DocumentNo);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_uApprovalDocument_Status')
    CREATE INDEX IX_uApprovalDocument_Status ON uApprovalDocumentTb(CurrentStatus);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_uApprovalDocument_Requester')
    CREATE INDEX IX_uApprovalDocument_Requester ON uApprovalDocumentTb(RequesterId);

-- uApprovalLineTb 인덱스
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_uApprovalLine_Document')
    CREATE INDEX IX_uApprovalLine_Document ON uApprovalLineTb(DocumentId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UX_uApprovalLine_DocumentLevel')
    CREATE UNIQUE INDEX UX_uApprovalLine_DocumentLevel ON uApprovalLineTb(DocumentId, ApprovalLevel, SortOrder);

-- uApprovalHistoryTb 인덱스
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_uApprovalHistory_Document')
    CREATE INDEX IX_uApprovalHistory_Document ON uApprovalHistoryTb(DocumentId);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_uApprovalHistory_ActionDate')
    CREATE INDEX IX_uApprovalHistory_ActionDate ON uApprovalHistoryTb(ActionDate);

-- 결재 문서 번호 생성 함수
IF NOT EXISTS (SELECT * FROM sys.objects WHERE type = 'FN' AND name = 'fn_GenerateApprovalDocumentNo')
EXEC('
CREATE FUNCTION fn_GenerateApprovalDocumentNo(@FormCode NVARCHAR(50))
RETURNS NVARCHAR(50)
AS
BEGIN
    DECLARE @Year NVARCHAR(4) = FORMAT(GETDATE(), ''yyyy'')
    DECLARE @Month NVARCHAR(2) = FORMAT(GETDATE(), ''MM'')
    DECLARE @SeqNo INT
    
    SELECT @SeqNo = ISNULL(MAX(CAST(RIGHT(DocumentNo, 4) AS INT)), 0) + 1
    FROM uApprovalDocumentTb d
    INNER JOIN uApprovalFormTb f ON d.FormId = f.FormId
    WHERE f.FormCode = @FormCode
    AND LEFT(d.DocumentNo, 6) = @Year + @Month
    
    RETURN @FormCode + ''-'' + @Year + @Month + ''-'' + FORMAT(@SeqNo, ''0000'')
END
')

PRINT '✅ 전자결재 시스템 테이블 생성이 완료되었습니다.';
PRINT '📋 생성된 테이블:';
PRINT '   - uApprovalFormTb (결재 양식)';
PRINT '   - uApprovalDocumentTb (결재 문서)';
PRINT '   - uApprovalLineTb (결재 라인)';
PRINT '   - uApprovalHistoryTb (결재 히스토리)';
PRINT '   - uApprovalAttachmentTb (첨부파일)';
PRINT '   - uApprovalSettingTb (결재 설정)';
PRINT '   - uApprovalDelegationTb (위임 설정)';
PRINT '🔧 생성된 함수:';
PRINT '   - fn_GenerateApprovalDocumentNo (문서번호 생성)';
`;

async function createApprovalSystemTables() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('📋 전자결재 시스템 테이블 생성 시작...');
    
    // 테이블 생성 SQL 실행
    const result = await pool.request().batch(approvalSystemTables);
    
    console.log('🎉 전자결재 시스템 테이블 생성이 완료되었습니다!');
    console.log('');
    console.log('📊 생성된 테이블 목록:');
    console.log('   1. uApprovalFormTb - 결재 양식 관리');
    console.log('   2. uApprovalDocumentTb - 결재 문서');
    console.log('   3. uApprovalLineTb - 결재 라인');
    console.log('   4. uApprovalHistoryTb - 결재 히스토리');
    console.log('   5. uApprovalAttachmentTb - 첨부파일');
    console.log('   6. uApprovalSettingTb - 결재 설정');
    console.log('   7. uApprovalDelegationTb - 위임 설정');
    console.log('');
    console.log('🔧 생성된 함수:');
    console.log('   - fn_GenerateApprovalDocumentNo() - 문서번호 자동 생성');

  } catch (error) {
    console.error('❌ 테이블 생성 중 오류 발생:', error.message);
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
  createApprovalSystemTables();
}

module.exports = { createApprovalSystemTables };