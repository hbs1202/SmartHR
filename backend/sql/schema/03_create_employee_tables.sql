-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-13
-- 설명: 직원 관리 테이블 생성 스크립트
-- 수정이력: 
-- =============================================

USE hr_system;
GO

-- 1. 직원 기본 정보 테이블 (uEmployeeTb)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uEmployeeTb' AND xtype='U')
BEGIN
    CREATE TABLE uEmployeeTb (
        EmployeeId INT IDENTITY(1,1) PRIMARY KEY,
        CompanyId INT NOT NULL,
        SubCompanyId INT NOT NULL,
        DeptId INT NOT NULL,
        PosId INT NOT NULL,
        
        -- 로그인 정보
        EmployeeCode NVARCHAR(20) NOT NULL UNIQUE, -- 사번 (로그인 ID로도 사용)
        Password NVARCHAR(255) NOT NULL, -- bcrypt 해시된 비밀번호
        Email NVARCHAR(255) NOT NULL UNIQUE, -- 이메일 (로그인 ID로도 사용)
        
        -- 개인 기본 정보
        FirstName NVARCHAR(50) NOT NULL, -- 이름
        LastName NVARCHAR(50) NOT NULL, -- 성
        FullName AS (LastName + FirstName) PERSISTED, -- 전체 이름 (계산 컬럼)
        NameEng NVARCHAR(100) NULL, -- 영문명
        
        -- 개인 신상 정보
        Gender NCHAR(1) CHECK (Gender IN ('M', 'F')) NULL, -- 성별 (M: 남성, F: 여성)
        BirthDate DATE NULL, -- 생년월일
        MaritalStatus NVARCHAR(20) NULL, -- 결혼상태 (미혼, 기혼, 이혼, 사별)
        Nationality NVARCHAR(50) DEFAULT '대한민국', -- 국적
        
        -- 신분증 정보
        IdNumber NVARCHAR(50) NULL, -- 주민등록번호 (암호화 필요)
        PassportNumber NVARCHAR(50) NULL, -- 여권번호
        DriverLicense NVARCHAR(50) NULL, -- 운전면허번호
        
        -- 연락처 정보
        PhoneNumber NVARCHAR(20) NULL, -- 휴대폰번호
        HomePhoneNumber NVARCHAR(20) NULL, -- 집전화번호
        EmergencyContact NVARCHAR(100) NULL, -- 비상연락처 이름
        EmergencyPhone NVARCHAR(20) NULL, -- 비상연락처 번호
        EmergencyRelation NVARCHAR(50) NULL, -- 비상연락처 관계
        
        -- 주소 정보
        HomeAddress NVARCHAR(500) NULL, -- 자택 주소
        HomePostalCode NVARCHAR(10) NULL, -- 우편번호
        CurrentAddress NVARCHAR(500) NULL, -- 현거주지 (자택과 다른 경우)
        CurrentPostalCode NVARCHAR(10) NULL, -- 현거주지 우편번호
        
        -- 학력 정보
        Education NVARCHAR(50) NULL, -- 최종학력 (고졸, 전문대졸, 대졸, 석사, 박사)
        University NVARCHAR(200) NULL, -- 출신대학
        Major NVARCHAR(100) NULL, -- 전공
        GraduationDate DATE NULL, -- 졸업일
        
        -- 재직 정보
        HireDate DATE NOT NULL, -- 입사일
        RetireDate DATE NULL, -- 퇴사일
        EmploymentType NVARCHAR(50) NOT NULL DEFAULT '정규직', -- 고용형태 (정규직, 계약직, 인턴, 파견)
        WorkType NVARCHAR(50) NOT NULL DEFAULT '풀타임', -- 근무형태 (풀타임, 파트타임, 시간제)
        ProbationEndDate DATE NULL, -- 수습기간 종료일
        
        -- 급여 정보
        BaseSalary DECIMAL(15,2) NULL, -- 기본급
        CurrentSalary DECIMAL(15,2) NULL, -- 현재 급여
        SalaryGrade NVARCHAR(20) NULL, -- 호봉
        PayType NVARCHAR(20) DEFAULT '월급', -- 급여 형태 (월급, 연봉, 시급, 일급)
        BankAccount NVARCHAR(50) NULL, -- 급여 계좌번호
        BankName NVARCHAR(100) NULL, -- 은행명
        AccountHolder NVARCHAR(100) NULL, -- 예금주명
        
        -- 근무 시간 정보
        WorkStartTime TIME NULL, -- 근무 시작시간
        WorkEndTime TIME NULL, -- 근무 종료시간
        LunchStartTime TIME NULL, -- 점심시간 시작
        LunchEndTime TIME NULL, -- 점심시간 종료
        WeeklyWorkHours DECIMAL(5,2) NULL, -- 주당 근무시간
        
        -- 자격증 및 기술
        Licenses NVARCHAR(1000) NULL, -- 보유 자격증 (JSON 형태로 저장)
        Skills NVARCHAR(1000) NULL, -- 보유 기술 (JSON 형태로 저장)
        Languages NVARCHAR(500) NULL, -- 외국어 능력 (JSON 형태로 저장)
        
        -- 사진 및 파일
        ProfileImageUrl NVARCHAR(500) NULL, -- 프로필 사진 URL
        ResumeFileUrl NVARCHAR(500) NULL, -- 이력서 파일 URL
        ContractFileUrl NVARCHAR(500) NULL, -- 계약서 파일 URL
        
        -- 권한 정보
        UserRole NVARCHAR(50) NOT NULL DEFAULT 'employee', -- 사용자 역할 (admin, manager, employee)
        SystemPermissions NVARCHAR(1000) NULL, -- 시스템 권한 (JSON 형태)
        LastLoginAt DATETIME NULL, -- 마지막 로그인 시간
        LoginFailCount INT DEFAULT 0, -- 로그인 실패 횟수
        AccountLocked BIT DEFAULT 0, -- 계정 잠금 여부
        AccountLockedAt DATETIME NULL, -- 계정 잠금 시간
        PasswordChangedAt DATETIME NULL, -- 비밀번호 변경 시간
        PasswordExpireAt DATETIME NULL, -- 비밀번호 만료 시간
        
        -- 메모 및 기타
        InternalNotes NVARCHAR(2000) NULL, -- 내부 메모 (관리자용)
        SpecialNotes NVARCHAR(1000) NULL, -- 특이사항
        PersonalityType NVARCHAR(50) NULL, -- 성격 유형 (MBTI 등)
        BloodType NCHAR(3) NULL, -- 혈액형
        
        -- 시스템 정보
        IsActive BIT NOT NULL DEFAULT 1, -- 활성 상태
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        CreatedBy INT NULL,
        UpdatedBy INT NULL,
        
        -- 외래키 제약조건
        CONSTRAINT FK_uEmployeeTb_uCompanyTb
            FOREIGN KEY (CompanyId) REFERENCES uCompanyTb(CompanyId),
        CONSTRAINT FK_uEmployeeTb_uSubCompanyTb
            FOREIGN KEY (SubCompanyId) REFERENCES uSubCompanyTb(SubCompanyId),
        CONSTRAINT FK_uEmployeeTb_uDeptTb
            FOREIGN KEY (DeptId) REFERENCES uDeptTb(DeptId),
        CONSTRAINT FK_uEmployeeTb_uPositionTb
            FOREIGN KEY (PosId) REFERENCES uPositionTb(PosId),
            
        -- 인덱스
        INDEX IX_uEmployeeTb_Code (EmployeeCode),
        INDEX IX_uEmployeeTb_Email (Email),
        INDEX IX_uEmployeeTb_FullName (FullName),
        INDEX IX_uEmployeeTb_Company (CompanyId),
        INDEX IX_uEmployeeTb_SubCompany (SubCompanyId),
        INDEX IX_uEmployeeTb_Department (DeptId),
        INDEX IX_uEmployeeTb_Position (PosId),
        INDEX IX_uEmployeeTb_HireDate (HireDate),
        INDEX IX_uEmployeeTb_EmploymentType (EmploymentType),
        INDEX IX_uEmployeeTb_UserRole (UserRole),
        INDEX IX_uEmployeeTb_Active (IsActive),
        INDEX IX_uEmployeeTb_Login (EmployeeCode, Email, IsActive)
    );
    
    PRINT '✅ uEmployeeTb 테이블이 생성되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ uEmployeeTb 테이블이 이미 존재합니다.';
END
GO

-- 2. 직원 발령 이력 테이블 (uEmployeeAssignmentTb) - 부서/직책 변경 이력
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='uEmployeeAssignmentTb' AND xtype='U')
BEGIN
    CREATE TABLE uEmployeeAssignmentTb (
        AssignmentId INT IDENTITY(1,1) PRIMARY KEY,
        EmployeeId INT NOT NULL,
        
        -- 발령 전 정보
        PreviousCompanyId INT NULL,
        PreviousSubCompanyId INT NULL,
        PreviousDeptId INT NULL,
        PreviousPosId INT NULL,
        
        -- 발령 후 정보
        NewCompanyId INT NOT NULL,
        NewSubCompanyId INT NOT NULL,
        NewDeptId INT NOT NULL,
        NewPosId INT NOT NULL,
        
        -- 발령 정보
        AssignmentType NVARCHAR(50) NOT NULL, -- 발령 유형 (신규채용, 부서이동, 승진, 강등, 전출, 전입, 퇴사)
        AssignmentReason NVARCHAR(200) NULL, -- 발령 사유
        EffectiveDate DATE NOT NULL, -- 발령 시행일
        AssignmentOrder NVARCHAR(100) NULL, -- 발령 명령번호
        
        -- 급여 변경 정보
        PreviousSalary DECIMAL(15,2) NULL,
        NewSalary DECIMAL(15,2) NULL,
        SalaryChangeReason NVARCHAR(200) NULL,
        
        -- 승인 정보
        ApprovedBy INT NULL, -- 승인자
        ApprovedAt DATETIME NULL, -- 승인일시
        ApprovalComments NVARCHAR(500) NULL, -- 승인 의견
        
        -- 문서 정보
        AssignmentDocumentUrl NVARCHAR(500) NULL, -- 발령장 문서 URL
        
        -- 시스템 정보
        IsActive BIT NOT NULL DEFAULT 1,
        CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
        UpdatedAt DATETIME NULL,
        CreatedBy INT NOT NULL,
        UpdatedBy INT NULL,
        
        -- 외래키 제약조건
        CONSTRAINT FK_uEmployeeAssignmentTb_Employee
            FOREIGN KEY (EmployeeId) REFERENCES uEmployeeTb(EmployeeId),
        CONSTRAINT FK_uEmployeeAssignmentTb_ApprovedBy
            FOREIGN KEY (ApprovedBy) REFERENCES uEmployeeTb(EmployeeId),
        CONSTRAINT FK_uEmployeeAssignmentTb_CreatedBy
            FOREIGN KEY (CreatedBy) REFERENCES uEmployeeTb(EmployeeId),
            
        -- 인덱스
        INDEX IX_uEmployeeAssignmentTb_Employee (EmployeeId),
        INDEX IX_uEmployeeAssignmentTb_Type (AssignmentType),
        INDEX IX_uEmployeeAssignmentTb_Date (EffectiveDate),
        INDEX IX_uEmployeeAssignmentTb_Active (IsActive),
        INDEX IX_uEmployeeAssignmentTb_Timeline (EmployeeId, EffectiveDate)
    );
    
    PRINT '✅ uEmployeeAssignmentTb 테이블이 생성되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ uEmployeeAssignmentTb 테이블이 이미 존재합니다.';
END
GO

-- 3. 직원 상세 정보 뷰 (uEmployeeDetailView) 생성
IF EXISTS (SELECT * FROM sys.views WHERE name = 'uEmployeeDetailView')
BEGIN
    DROP VIEW uEmployeeDetailView;
    PRINT '🗑️ 기존 uEmployeeDetailView 삭제 완료';
END
GO

CREATE VIEW uEmployeeDetailView AS
SELECT 
    e.EmployeeId,
    e.EmployeeCode,
    e.Email,
    e.FullName,
    e.FirstName,
    e.LastName,
    e.NameEng,
    e.Gender,
    e.BirthDate,
    CASE 
        WHEN e.BirthDate IS NOT NULL 
        THEN DATEDIFF(YEAR, e.BirthDate, GETDATE()) 
        ELSE NULL 
    END AS Age,
    e.PhoneNumber,
    e.HireDate,
    CASE 
        WHEN e.RetireDate IS NULL 
        THEN DATEDIFF(YEAR, e.HireDate, GETDATE()) 
        ELSE DATEDIFF(YEAR, e.HireDate, e.RetireDate) 
    END AS CareerYears,
    e.EmploymentType,
    e.UserRole,
    e.CurrentSalary,
    e.IsActive AS EmployeeActive,
    
    -- 조직 정보
    c.CompanyId,
    c.CompanyName,
    c.CompanyCode,
    ws.SubCompanyId,
    ws.SubCompanyName,
    ws.SubCompanyCode,
    d.DeptId,
    d.DeptName,
    d.DeptCode,
    d.DeptLevel,
    p.PosId,
    p.PosName,
    p.PosCode,
    p.PosLevel,
    p.PosGrade,
    p.JobTitle,
    
    -- 조직 경로
    c.CompanyName + ' > ' + ws.SubCompanyName + ' > ' + d.DeptName + ' > ' + p.PosName AS OrganizationPath,
    
    -- 재직 상태
    CASE 
        WHEN e.RetireDate IS NOT NULL THEN '퇴사'
        WHEN e.ProbationEndDate IS NOT NULL AND e.ProbationEndDate > GETDATE() THEN '수습'
        WHEN e.IsActive = 1 THEN '재직'
        ELSE '비활성'
    END AS EmploymentStatus,
    
    -- 시스템 정보
    e.LastLoginAt,
    e.CreatedAt,
    e.UpdatedAt
    
FROM uEmployeeTb e
    INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
    INNER JOIN uSubCompanyTb ws ON e.SubCompanyId = ws.SubCompanyId  
    INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
    INNER JOIN uPositionTb p ON e.PosId = p.PosId;
GO

PRINT '✅ uEmployeeDetailView 뷰가 생성되었습니다.';

-- 4. 조직도 관련 외래키 제약조건 업데이트 (직원 ID 참조)
-- 부서 관리자 외래키 업데이트
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_uDeptTb_Manager')
BEGIN
    ALTER TABLE uDeptTb DROP CONSTRAINT FK_uDeptTb_Manager;
    PRINT '🗑️ 기존 uDeptTb Manager 외래키 삭제';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_uDeptTb_ViceManager')
BEGIN
    ALTER TABLE uDeptTb DROP CONSTRAINT FK_uDeptTb_ViceManager;
    PRINT '🗑️ 기존 uDeptTb ViceManager 외래키 삭제';
END

IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_uSubCompanyTb_Manager')
BEGIN
    ALTER TABLE uSubCompanyTb DROP CONSTRAINT FK_uSubCompanyTb_Manager;
    PRINT '🗑️ 기존 uSubCompanyTb Manager 외래키 삭제';
END

-- 새로운 외래키 제약조건 추가
ALTER TABLE uDeptTb
ADD CONSTRAINT FK_uDeptTb_Manager
FOREIGN KEY (ManagerEmployeeId) REFERENCES uEmployeeTb(EmployeeId);

ALTER TABLE uDeptTb
ADD CONSTRAINT FK_uDeptTb_ViceManager
FOREIGN KEY (ViceManagerEmployeeId) REFERENCES uEmployeeTb(EmployeeId);

ALTER TABLE uSubCompanyTb
ADD CONSTRAINT FK_uSubCompanyTb_Manager
FOREIGN KEY (ManagerEmployeeId) REFERENCES uEmployeeTb(EmployeeId);

PRINT '✅ 조직도 관리자 외래키 제약조건 업데이트 완료';

PRINT '==========================================';
PRINT '📊 직원 관리 테이블 생성 완료 현황';
PRINT '==========================================';

SELECT 
    t.TABLE_NAME as '테이블명',
    CASE WHEN t.TABLE_NAME IN ('uEmployeeTb', 'uEmployeeAssignmentTb')
         THEN '✅ 생성됨'
         ELSE '❌ 누락됨' 
    END as '상태'
FROM INFORMATION_SCHEMA.TABLES t
WHERE t.TABLE_TYPE = 'BASE TABLE'
  AND t.TABLE_NAME IN ('uEmployeeTb', 'uEmployeeAssignmentTb')
ORDER BY t.TABLE_NAME;

SELECT 
    v.TABLE_NAME as '뷰명',
    CASE WHEN v.TABLE_NAME = 'uEmployeeDetailView'
         THEN '✅ 생성됨'
         ELSE '❌ 누락됨' 
    END as '상태'
FROM INFORMATION_SCHEMA.VIEWS v
WHERE v.TABLE_NAME = 'uEmployeeDetailView';

PRINT '==========================================';
PRINT '✅ 직원 관리 테이블 생성이 완료되었습니다.';
PRINT '==========================================';
GO