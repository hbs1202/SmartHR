-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-12
-- 설명: 조직도 테이블 생성 스크립트 (회사-사업장-부서-직책)
-- 수정이력: 
-- =============================================

USE hr_system;
GO

-- 1. 회사 테이블 (uCompanyTb)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uCompanyTb' AND xtype='U')
BEGIN
    CREATE TABLE uCompanyTb (
        CompanyId INT IDENTITY(1,1) PRIMARY KEY,
        CompanyCode NVARCHAR(20) NOT NULL UNIQUE,
        CompanyName NVARCHAR(200) NOT NULL,
        CompanyNameEng NVARCHAR(200) NULL, -- 영문 회사명
        BusinessNumber NVARCHAR(20) NULL, -- 사업자등록번호
        CeoName NVARCHAR(100) NULL, -- 대표자명
        EstablishDate DATE NULL, -- 설립일
        Address NVARCHAR(500) NULL, -- 본사 주소
        PhoneNumber NVARCHAR(20) NULL, -- 대표 전화번호
        FaxNumber NVARCHAR(20) NULL, -- 팩스번호
        Website NVARCHAR(200) NULL, -- 홈페이지
        Email NVARCHAR(255) NULL, -- 대표 이메일
        Industry NVARCHAR(100) NULL, -- 업종
        CompanyType NVARCHAR(50) DEFAULT '주식회사', -- 회사형태 (주식회사, 유한회사 등)
        EmployeeCount INT DEFAULT 0, -- 총 직원수
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        CreatedBy INT NULL,
        UpdatedBy INT NULL,
        
        -- 인덱스
        INDEX IX_uCompanyTb_Code (CompanyCode),
        INDEX IX_uCompanyTb_BusinessNumber (BusinessNumber)
    );
    
    PRINT '✅ uCompanyTb 테이블이 생성되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ uCompanyTb 테이블이 이미 존재합니다.';
END
GO

-- 2. 사업장 테이블 (uSubCompanyTb)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uSubCompanyTb' AND xtype='U')
BEGIN
    CREATE TABLE uSubCompanyTb (
        SubCompanyId INT IDENTITY(1,1) PRIMARY KEY,
        CompanyId INT NOT NULL,
        SubCompanyCode NVARCHAR(20) NOT NULL UNIQUE,
        SubCompanyName NVARCHAR(200) NOT NULL,
        SubCompanyType NVARCHAR(50) NOT NULL DEFAULT '본사', -- 본사, 지사, 공장, 지점 등
        Address NVARCHAR(500) NULL, -- 사업장 주소
        PostalCode NVARCHAR(10) NULL, -- 우편번호
        PhoneNumber NVARCHAR(20) NULL, -- 사업장 전화번호
        FaxNumber NVARCHAR(20) NULL, -- 팩스번호
        ManagerEmployeeId INT NULL, -- 사업장 책임자
        OpenDate DATE NULL, -- 개소일
        CloseDate DATE NULL, -- 폐소일
        Area DECIMAL(10,2) NULL, -- 면적 (평방미터)
        FloorCount INT NULL, -- 층수
        ParkingSpots INT NULL, -- 주차 대수
        Description NVARCHAR(1000) NULL, -- 사업장 설명
        IsHeadquarters BIT NOT NULL DEFAULT 0, -- 본사 여부
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        CreatedBy INT NULL,
        UpdatedBy INT NULL,
        
        -- 외래키 제약조건
        CONSTRAINT FK_uSubCompanyTb_uCompanyTb
            FOREIGN KEY (CompanyId) REFERENCES uCompanyTb(CompanyId),
            
        -- 인덱스
        INDEX IX_uSubCompanyTb_Company (CompanyId),
        INDEX IX_uSubCompanyTb_Code (SubCompanyCode),
        INDEX IX_uSubCompanyTb_Type (SubCompanyType)
    );
    
    PRINT '✅ uSubCompanyTb 테이블이 생성되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ uSubCompanyTb 테이블이 이미 존재합니다.';
END
GO

-- 3. 부서 테이블 (uDeptTb) - 기존 테이블 수정
IF EXISTS (SELECT * FROM sysobjects WHERE name='uDeptTb' AND xtype='U')
BEGIN
    -- 기존 uDeptTb 테이블 백업 및 재생성
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uDeptTb_Backup' AND xtype='U')
    BEGIN
        -- 기존 데이터가 있다면 백업
        SELECT * INTO uDeptTb_Backup FROM uDeptTb WHERE 1=0; -- 구조만 복사
        PRINT '📋 기존 uDeptTb 테이블 구조 백업 완료';
    END
    
    -- 기존 테이블 삭제 (외래키 제약조건 때문에)
    DROP TABLE uDeptTb;
    PRINT '🗑️ 기존 uDeptTb 테이블 삭제 완료';
END

-- 새로운 uDeptTb 테이블 생성
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uDeptTb' AND xtype='U')
BEGIN
    CREATE TABLE uDeptTb (
        DeptId INT IDENTITY(1,1) PRIMARY KEY,
        SubCompanyId INT NOT NULL,
        DeptCode NVARCHAR(20) NOT NULL UNIQUE,
        DeptName NVARCHAR(200) NOT NULL,
        DeptNameEng NVARCHAR(200) NULL, -- 영문 부서명
        ParentDeptId INT NULL, -- 상위 부서 (부서 내 팀 구조)
        DeptLevel INT NOT NULL DEFAULT 1, -- 부서 레벨 (1: 본부, 2: 부서, 3: 팀)
        DeptType NVARCHAR(50) NOT NULL DEFAULT '일반부서', -- 일반부서, 지원부서, 영업부서 등
        ManagerEmployeeId INT NULL, -- 부서장
        ViceManagerEmployeeId INT NULL, -- 부부서장
        CostCenter NVARCHAR(20) NULL, -- 비용센터 코드
        Budget DECIMAL(15,2) NULL, -- 부서 예산
        EmployeeCount INT DEFAULT 0, -- 부서 직원수
        PhoneNumber NVARCHAR(20) NULL, -- 부서 대표 전화번호
        Extension NVARCHAR(10) NULL, -- 내선번호
        Email NVARCHAR(255) NULL, -- 부서 이메일
        Location NVARCHAR(200) NULL, -- 부서 위치 (층, 호실)
        EstablishDate DATE NULL, -- 부서 신설일
        CloseDate DATE NULL, -- 부서 폐지일
        Purpose NVARCHAR(1000) NULL, -- 부서 목적/역할
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        CreatedBy INT NULL,
        UpdatedBy INT NULL,
        
        -- 외래키 제약조건
        CONSTRAINT FK_uDeptTb_uSubCompanyTb
            FOREIGN KEY (SubCompanyId) REFERENCES uSubCompanyTb(SubCompanyId),
        CONSTRAINT FK_uDeptTb_Parent
            FOREIGN KEY (ParentDeptId) REFERENCES uDeptTb(DeptId),
            
        -- 인덱스
        INDEX IX_uDeptTb_SubCompany (SubCompanyId),
        INDEX IX_uDeptTb_Code (DeptCode),
        INDEX IX_uDeptTb_Parent (ParentDeptId),
        INDEX IX_uDeptTb_Level (DeptLevel),
        INDEX IX_uDeptTb_Type (DeptType)
    );
    
    PRINT '✅ uDeptTb 테이블이 재생성되었습니다.';
END
GO

-- 4. 직책 테이블 (uPositionTb) - 기존 테이블 수정
IF EXISTS (SELECT * FROM sysobjects WHERE name='uPositionTb' AND xtype='U')
BEGIN
    -- 기존 uPositionTb 테이블 백업
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uPositionTb_Backup' AND xtype='U')
    BEGIN
        SELECT * INTO uPositionTb_Backup FROM uPositionTb WHERE 1=0;
        PRINT '📋 기존 uPositionTb 테이블 구조 백업 완료';
    END
    
    DROP TABLE uPositionTb;
    PRINT '🗑️ 기존 uPositionTb 테이블 삭제 완료';
END

-- 새로운 uPositionTb 테이블 생성
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uPositionTb' AND xtype='U')
BEGIN
    CREATE TABLE uPositionTb (
        PosId INT IDENTITY(1,1) PRIMARY KEY,
        DeptId INT NOT NULL,
        PosCode NVARCHAR(20) NOT NULL UNIQUE,
        PosName NVARCHAR(200) NOT NULL,
        PosNameEng NVARCHAR(200) NULL, -- 영문 직책명
        PosLevel INT NOT NULL DEFAULT 1, -- 직책 레벨 (1: 사원, 2: 대리, 3: 과장, 4: 차장, 5: 부장)
        PosGrade NVARCHAR(20) NULL, -- 직급 (사원, 주임, 대리, 과장, 차장, 부장, 이사)
        JobTitle NVARCHAR(200) NULL, -- 직무명 (개발자, 디자이너, 기획자 등)
        JobCategory NVARCHAR(100) NULL, -- 직무 분야 (IT, 영업, 마케팅, 인사, 재무 등)
        MinSalary DECIMAL(15,2) NULL, -- 최소 급여
        MaxSalary DECIMAL(15,2) NULL, -- 최대 급여
        BaseSalary DECIMAL(15,2) NULL, -- 기본 급여
        AllowanceAmount DECIMAL(15,2) NULL, -- 직책 수당
        IsManagerPosition BIT NOT NULL DEFAULT 0, -- 관리직 여부
        RequiredExperience INT NULL, -- 필요 경력 (년)
        RequiredEducation NVARCHAR(100) NULL, -- 필요 학력
        RequiredSkills NVARCHAR(1000) NULL, -- 필요 기술/자격
        JobDescription NVARCHAR(2000) NULL, -- 직무 설명
        Responsibilities NVARCHAR(2000) NULL, -- 주요 업무
        ReportingTo INT NULL, -- 보고 상위 직책
        MaxHeadcount INT NULL, -- 최대 정원
        CurrentHeadcount INT DEFAULT 0, -- 현재 인원
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        CreatedBy INT NULL,
        UpdatedBy INT NULL,
        
        -- 외래키 제약조건
        CONSTRAINT FK_uPositionTb_uDeptTb
            FOREIGN KEY (DeptId) REFERENCES uDeptTb(DeptId),
        CONSTRAINT FK_uPositionTb_ReportingTo
            FOREIGN KEY (ReportingTo) REFERENCES uPositionTb(PosId),
            
        -- 인덱스
        INDEX IX_uPositionTb_Department (DeptId),
        INDEX IX_uPositionTb_Code (PosCode),
        INDEX IX_uPositionTb_Level (PosLevel),
        INDEX IX_uPositionTb_Grade (PosGrade),
        INDEX IX_uPositionTb_Category (JobCategory),
        INDEX IX_uPositionTb_ReportingTo (ReportingTo)
    );
    
    PRINT '✅ uPositionTb 테이블이 재생성되었습니다.';
END
GO

-- 5. 조직도 뷰 (uOrganizationView) 생성
IF EXISTS (SELECT * FROM sys.views WHERE name = 'uOrganizationView')
BEGIN
    DROP VIEW uOrganizationView;
    PRINT '🗑️ 기존 uOrganizationView 삭제 완료';
END
GO

CREATE VIEW uOrganizationView AS
SELECT 
    c.CompanyId,
    c.CompanyName,
    c.CompanyCode,
    ws.SubCompanyId,
    ws.SubCompanyName,
    ws.SubCompanyCode,
    ws.SubCompanyType,
    d.DeptId,
    d.DeptName,
    d.DeptCode,
    d.DeptLevel,
    d.DeptType,
    p.PosId,
    p.PosName,
    p.PosCode,
    p.PosLevel,
    p.PosGrade,
    p.JobTitle,
    p.JobCategory,
    -- 계층 경로
    c.CompanyName + ' > ' + ws.SubCompanyName + ' > ' + d.DeptName + ' > ' + p.PosName AS FullPath,
    -- 활성 상태
    CASE 
        WHEN c.IsActive = 1 AND ws.IsActive = 1 AND d.IsActive = 1 AND p.IsActive = 1 
        THEN 1 ELSE 0 
    END AS IsActiveAll,
    -- 현재 인원/정원
    p.CurrentHeadcount,
    p.MaxHeadcount,
    CASE 
        WHEN p.MaxHeadcount > 0 
        THEN CAST(p.CurrentHeadcount AS FLOAT) / p.MaxHeadcount * 100
        ELSE 0 
    END AS OccupancyRate
FROM uCompanyTb c
    INNER JOIN uSubCompanyTb ws ON c.CompanyId = ws.CompanyId
    INNER JOIN uDeptTb d ON ws.SubCompanyId = d.SubCompanyId
    INNER JOIN uPositionTb p ON d.DeptId = p.DeptId
WHERE c.IsActive = 1 
    AND ws.IsActive = 1 
    AND d.IsActive = 1 
    AND p.IsActive = 1;
GO

PRINT '✅ uOrganizationView 뷰가 생성되었습니다.';

-- 6. Employee 테이블에 새로운 외래키 제약조건 추가
IF EXISTS (SELECT * FROM sysobjects WHERE name='Employee' AND xtype='U')
BEGIN
    -- 기존 외래키 제약조건 삭제
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Employee_Department')
    BEGIN
        ALTER TABLE Employee DROP CONSTRAINT FK_Employee_Department;
        PRINT '🗑️ Employee 테이블의 기존 Department 외래키 제약조건 삭제';
    END
    
    IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Employee_Position')
    BEGIN
        ALTER TABLE Employee DROP CONSTRAINT FK_Employee_Position;
        PRINT '🗑️ Employee 테이블의 기존 Position 외래키 제약조건 삭제';
    END
    
    -- 새로운 외래키 제약조건 추가
    ALTER TABLE Employee
    ADD CONSTRAINT FK_Employee_uDeptTb
    FOREIGN KEY (DeptId) REFERENCES uDeptTb(DeptId);
    
    ALTER TABLE Employee
    ADD CONSTRAINT FK_Employee_uPositionTb
    FOREIGN KEY (PosId) REFERENCES uPositionTb(PosId);
    
    PRINT '✅ Employee 테이블에 새로운 외래키 제약조건 추가 완료';
END

-- Department와 Position 테이블의 ManagerEmployeeId 외래키 제약조건 추가
IF EXISTS (SELECT * FROM sysobjects WHERE name='Employee' AND xtype='U')
BEGIN
    -- uDeptTb 테이블의 Manager 외래키
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_uDeptTb_Manager')
    BEGIN
        ALTER TABLE uDeptTb
        ADD CONSTRAINT FK_uDeptTb_Manager
        FOREIGN KEY (ManagerEmployeeId) REFERENCES Employee(EmployeeId);
        
        PRINT '✅ uDeptTb 테이블에 Manager 외래키 추가';
    END
    
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_uDeptTb_ViceManager')
    BEGIN
        ALTER TABLE uDeptTb
        ADD CONSTRAINT FK_uDeptTb_ViceManager
        FOREIGN KEY (ViceManagerEmployeeId) REFERENCES Employee(EmployeeId);
        
        PRINT '✅ uDeptTb 테이블에 ViceManager 외래키 추가';
    END
    
    -- uSubCompanyTb 테이블의 Manager 외래키
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_uSubCompanyTb_Manager')
    BEGIN
        ALTER TABLE uSubCompanyTb
        ADD CONSTRAINT FK_uSubCompanyTb_Manager
        FOREIGN KEY (ManagerEmployeeId) REFERENCES Employee(EmployeeId);
        
        PRINT '✅ uSubCompanyTb 테이블에 Manager 외래키 추가';
    END
END

PRINT '==========================================';
PRINT '📊 조직도 테이블 생성 완료 현황';
PRINT '==========================================';

SELECT 
    t.TABLE_NAME as '테이블명',
    CASE WHEN t.TABLE_NAME IN ('uCompanyTb', 'uSubCompanyTb', 'uDeptTb', 'uPositionTb')
         THEN '✅ 생성됨'
         ELSE '❌ 누락됨' 
    END as '상태'
FROM INFORMATION_SCHEMA.TABLES t
WHERE t.TABLE_TYPE = 'BASE TABLE'
  AND t.TABLE_NAME IN ('uCompanyTb', 'uSubCompanyTb', 'uDeptTb', 'uPositionTb')
ORDER BY t.TABLE_NAME;

PRINT '==========================================';
PRINT '✅ 조직도 테이블 생성이 완료되었습니다.';
PRINT '==========================================';
GO