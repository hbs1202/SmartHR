/**
 * 인사발령 유형 시스템 생성 스크립트
 * @description 발령 분류, 유형, 사유 테이블 생성 및 기초 데이터 입력
 * @author SmartHR Team
 * @date 2024-09-14
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

const createAssignmentTypeSystem = async () => {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('\n📋 인사발령 유형 시스템 생성 중...');
    
    // 1. 발령 대분류 테이블 생성
    console.log('🔄 1. 발령 대분류 테이블 생성 중...');
    const createCategoryTable = `
-- 1. 발령 대분류 테이블 (입사, 승진, 이동, 파견, 휴직, 퇴직)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uAssignmentCategoryTb' AND xtype='U')
BEGIN
    CREATE TABLE uAssignmentCategoryTb (
        CategoryId INT IDENTITY(1,1) NOT NULL,
        CategoryCode NVARCHAR(50) NOT NULL,
        CategoryName NVARCHAR(50) NOT NULL,
        CategoryNameEng NVARCHAR(50),
        DisplayOrder INT NOT NULL DEFAULT 1,
        Description NVARCHAR(200),
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedBy INT NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedBy INT,
        UpdatedAt DATETIME,
        
        CONSTRAINT PK_uAssignmentCategoryTb PRIMARY KEY (CategoryId),
        CONSTRAINT UQ_AssignmentCategory_Code UNIQUE (CategoryCode),
        CONSTRAINT UQ_AssignmentCategory_Name UNIQUE (CategoryName)
    );
END
`;
    
    await sql.query(createCategoryTable);
    console.log('✅ 발령 대분류 테이블 생성 완료');

    // 2. 발령 세부유형 테이블 생성
    console.log('🔄 2. 발령 세부유형 테이블 생성 중...');
    const createTypeTable = `
-- 2. 발령 세부유형 테이블
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uAssignmentTypeTb' AND xtype='U')
BEGIN
    CREATE TABLE uAssignmentTypeTb (
        AssignmentTypeId INT IDENTITY(1,1) NOT NULL,
        CategoryId INT NOT NULL,
        TypeCode NVARCHAR(50) NOT NULL,
        TypeName NVARCHAR(50) NOT NULL,
        TypeNameEng NVARCHAR(50),
        DisplayOrder INT NOT NULL DEFAULT 1,
        Description NVARCHAR(200),
        
        -- 발령 특성 설정
        RequiresApproval BIT NOT NULL DEFAULT 1,
        RequiresEffectiveDate BIT NOT NULL DEFAULT 1,
        RequiresReason BIT NOT NULL DEFAULT 1,
        RequiresDocument BIT NOT NULL DEFAULT 0,
        
        -- 조직변경 허용 범위
        AllowsCompanyChange BIT NOT NULL DEFAULT 0,
        AllowsBranchChange BIT NOT NULL DEFAULT 0,
        AllowsDeptChange BIT NOT NULL DEFAULT 1,
        AllowsPositionChange BIT NOT NULL DEFAULT 0,
        AllowsSalaryChange BIT NOT NULL DEFAULT 0,
        
        -- 시스템 처리 옵션
        AutoCalculateSalary BIT NOT NULL DEFAULT 0,
        SendNotification BIT NOT NULL DEFAULT 1,
        RecordHistory BIT NOT NULL DEFAULT 1,
        
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedBy INT NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedBy INT,
        UpdatedAt DATETIME,
        
        CONSTRAINT PK_uAssignmentTypeTb PRIMARY KEY (AssignmentTypeId),
        CONSTRAINT FK_AssignmentType_Category FOREIGN KEY (CategoryId) REFERENCES uAssignmentCategoryTb(CategoryId),
        CONSTRAINT UQ_AssignmentType_Code UNIQUE (TypeCode),
        CONSTRAINT UQ_AssignmentType_Name UNIQUE (TypeName)
    );
END
`;
    
    await sql.query(createTypeTable);
    console.log('✅ 발령 세부유형 테이블 생성 완료');

    // 3. 발령 사유 테이블 생성
    console.log('🔄 3. 발령 사유 테이블 생성 중...');
    const createReasonTable = `
-- 3. 발령 사유 테이블
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uAssignmentReasonTb' AND xtype='U')
BEGIN
    CREATE TABLE uAssignmentReasonTb (
        ReasonId INT IDENTITY(1,1) NOT NULL,
        CategoryId INT,
        AssignmentTypeId INT,
        ReasonCode NVARCHAR(50) NOT NULL,
        ReasonText NVARCHAR(100) NOT NULL,
        ReasonTextEng NVARCHAR(100),
        DisplayOrder INT NOT NULL DEFAULT 1,
        IsCommon BIT NOT NULL DEFAULT 0,
        Description NVARCHAR(200),
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedBy INT NOT NULL,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedBy INT,
        UpdatedAt DATETIME,
        
        CONSTRAINT PK_uAssignmentReasonTb PRIMARY KEY (ReasonId),
        CONSTRAINT FK_AssignmentReason_Category FOREIGN KEY (CategoryId) REFERENCES uAssignmentCategoryTb(CategoryId),
        CONSTRAINT FK_AssignmentReason_Type FOREIGN KEY (AssignmentTypeId) REFERENCES uAssignmentTypeTb(AssignmentTypeId),
        CONSTRAINT UQ_AssignmentReason_Code UNIQUE (ReasonCode)
    );
END
`;
    
    await sql.query(createReasonTable);
    console.log('✅ 발령 사유 테이블 생성 완료');

    // 4. 인덱스 생성
    console.log('🔄 4. 인덱스 생성 중...');
    const createIndexes = `
-- 인덱스 생성
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AssignmentType_Category')
    CREATE INDEX IX_AssignmentType_Category ON uAssignmentTypeTb(CategoryId, IsActive);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AssignmentType_DisplayOrder')
    CREATE INDEX IX_AssignmentType_DisplayOrder ON uAssignmentTypeTb(DisplayOrder, IsActive);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AssignmentReason_Type')
    CREATE INDEX IX_AssignmentReason_Type ON uAssignmentReasonTb(AssignmentTypeId, IsActive);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AssignmentReason_Category')
    CREATE INDEX IX_AssignmentReason_Category ON uAssignmentReasonTb(CategoryId, IsActive);

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AssignmentReason_Common')
    CREATE INDEX IX_AssignmentReason_Common ON uAssignmentReasonTb(IsCommon, IsActive);
`;
    
    await sql.query(createIndexes);
    console.log('✅ 인덱스 생성 완료');

    // 5. 기존 테이블에 컬럼 추가 (체크해서 존재하지 않을 때만)
    console.log('🔄 5. 기존 uEmployeeAssignmentTb 테이블 확장 중...');
    const extendAssignmentTable = `
-- 발령 이력 테이블에 새로운 컬럼 추가
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'CategoryId')
    ALTER TABLE uEmployeeAssignmentTb ADD CategoryId INT;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'AssignmentTypeId')
    ALTER TABLE uEmployeeAssignmentTb ADD AssignmentTypeId INT;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'ReasonId')
    ALTER TABLE uEmployeeAssignmentTb ADD ReasonId INT;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'ApprovalStatus')
    ALTER TABLE uEmployeeAssignmentTb ADD ApprovalStatus NVARCHAR(20) DEFAULT 'APPROVED';

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'ApprovalComment')
    ALTER TABLE uEmployeeAssignmentTb ADD ApprovalComment NVARCHAR(500);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'DocumentPath')
    ALTER TABLE uEmployeeAssignmentTb ADD DocumentPath NVARCHAR(500);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'NotificationSent')
    ALTER TABLE uEmployeeAssignmentTb ADD NotificationSent BIT DEFAULT 0;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'OldSalary')
    ALTER TABLE uEmployeeAssignmentTb ADD OldSalary DECIMAL(15,2);

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uEmployeeAssignmentTb') AND name = 'NewSalary')
    ALTER TABLE uEmployeeAssignmentTb ADD NewSalary DECIMAL(15,2);
`;
    
    await sql.query(extendAssignmentTable);
    console.log('✅ 발령 이력 테이블 확장 완료');

    // 6. 외래키 제약조건 추가 (체크해서 존재하지 않을 때만)
    console.log('🔄 6. 외래키 제약조건 추가 중...');
    const addForeignKeys = `
-- 외래키 제약조건 추가
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_EmployeeAssignment_Category')
    ALTER TABLE uEmployeeAssignmentTb
    ADD CONSTRAINT FK_EmployeeAssignment_Category FOREIGN KEY (CategoryId) REFERENCES uAssignmentCategoryTb(CategoryId);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_EmployeeAssignment_Type')
    ALTER TABLE uEmployeeAssignmentTb
    ADD CONSTRAINT FK_EmployeeAssignment_Type FOREIGN KEY (AssignmentTypeId) REFERENCES uAssignmentTypeTb(AssignmentTypeId);

IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_EmployeeAssignment_Reason')
    ALTER TABLE uEmployeeAssignmentTb
    ADD CONSTRAINT FK_EmployeeAssignment_Reason FOREIGN KEY (ReasonId) REFERENCES uAssignmentReasonTb(ReasonId);
`;
    
    await sql.query(addForeignKeys);
    console.log('✅ 외래키 제약조건 추가 완료');

    console.log('\n🎉 인사발령 유형 시스템 생성 완료!');
    console.log('📋 생성된 테이블:');
    console.log('   - uAssignmentCategoryTb (발령 대분류)');
    console.log('   - uAssignmentTypeTb (발령 세부유형)'); 
    console.log('   - uAssignmentReasonTb (발령 사유)');
    console.log('🔧 확장된 테이블: uEmployeeAssignmentTb');

  } catch (error) {
    console.error('❌ 인사발령 유형 시스템 생성 실패:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
};

createAssignmentTypeSystem().catch(console.error);