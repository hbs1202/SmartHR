-- =============================================
-- 인사발령 유형 관리 테이블 생성 스크립트
-- @description 인사발령의 세분화된 유형과 사유를 관리하기 위한 테이블
-- @author SmartHR Team  
-- @date 2024-09-14
-- =============================================

-- 1. 발령 대분류 테이블 (입사, 승진, 이동, 파견, 휴직, 퇴직)
CREATE TABLE uAssignmentCategoryTb (
    CategoryId INT IDENTITY(1,1) NOT NULL,
    CategoryCode NVARCHAR(50) NOT NULL,           -- RECRUITMENT, PROMOTION, TRANSFER, DISPATCH, LEAVE, RESIGNATION
    CategoryName NVARCHAR(50) NOT NULL,           -- 입사, 승진, 이동, 파견, 휴직, 퇴직
    CategoryNameEng NVARCHAR(50),                 -- 영문명
    DisplayOrder INT NOT NULL DEFAULT 1,         -- 표시 순서
    Description NVARCHAR(200),                    -- 설명
    IsActive BIT NOT NULL DEFAULT 1,              -- 활성 여부
    CreatedBy INT NOT NULL,                       -- 생성자 ID
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedBy INT,                                -- 수정자 ID
    UpdatedAt DATETIME,                           -- 수정일
    
    CONSTRAINT PK_uAssignmentCategoryTb PRIMARY KEY (CategoryId),
    CONSTRAINT UQ_AssignmentCategory_Code UNIQUE (CategoryCode),
    CONSTRAINT UQ_AssignmentCategory_Name UNIQUE (CategoryName)
);

-- 2. 발령 세부유형 테이블 (신입채용, 경력채용, 정규승진, 특별승진 등)
CREATE TABLE uAssignmentTypeTb (
    AssignmentTypeId INT IDENTITY(1,1) NOT NULL,
    CategoryId INT NOT NULL,                      -- 발령 대분류 ID
    TypeCode NVARCHAR(50) NOT NULL,               -- NEW_GRAD_HIRE, EXPERIENCED_HIRE, REGULAR_PROMOTION 등
    TypeName NVARCHAR(50) NOT NULL,               -- 채용(신입), 채용(경력), 승진(정규) 등
    TypeNameEng NVARCHAR(50),                     -- 영문명
    DisplayOrder INT NOT NULL DEFAULT 1,         -- 표시 순서
    Description NVARCHAR(200),                    -- 설명
    
    -- 발령 특성 설정
    RequiresApproval BIT NOT NULL DEFAULT 1,     -- 승인 필요 여부
    RequiresEffectiveDate BIT NOT NULL DEFAULT 1, -- 발령일 필수 여부
    RequiresReason BIT NOT NULL DEFAULT 1,       -- 발령사유 필수 여부
    RequiresDocument BIT NOT NULL DEFAULT 0,     -- 첨부문서 필요 여부
    
    -- 조직변경 허용 범위
    AllowsCompanyChange BIT NOT NULL DEFAULT 0,  -- 회사 변경 허용
    AllowsBranchChange BIT NOT NULL DEFAULT 0,   -- 사업장 변경 허용
    AllowsDeptChange BIT NOT NULL DEFAULT 1,     -- 부서 변경 허용
    AllowsPositionChange BIT NOT NULL DEFAULT 0, -- 직책 변경 허용
    AllowsSalaryChange BIT NOT NULL DEFAULT 0,   -- 급여 변경 허용
    
    -- 시스템 처리 옵션
    AutoCalculateSalary BIT NOT NULL DEFAULT 0,  -- 급여 자동 계산 여부
    SendNotification BIT NOT NULL DEFAULT 1,     -- 알림 발송 여부
    RecordHistory BIT NOT NULL DEFAULT 1,        -- 이력 기록 여부
    
    IsActive BIT NOT NULL DEFAULT 1,              -- 활성 여부
    CreatedBy INT NOT NULL,                       -- 생성자 ID
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedBy INT,                                -- 수정자 ID
    UpdatedAt DATETIME,                           -- 수정일
    
    CONSTRAINT PK_uAssignmentTypeTb PRIMARY KEY (AssignmentTypeId),
    CONSTRAINT FK_AssignmentType_Category FOREIGN KEY (CategoryId) REFERENCES uAssignmentCategoryTb(CategoryId),
    CONSTRAINT UQ_AssignmentType_Code UNIQUE (TypeCode),
    CONSTRAINT UQ_AssignmentType_Name UNIQUE (TypeName)
);

-- 3. 발령 사유 테이블 (조직개편, 성과우수, 업무필요, 본인희망 등)
CREATE TABLE uAssignmentReasonTb (
    ReasonId INT IDENTITY(1,1) NOT NULL,
    CategoryId INT,                               -- 발령 대분류 ID (NULL이면 공통사유)
    AssignmentTypeId INT,                         -- 발령 세부유형 ID (NULL이면 대분류 공통)
    ReasonCode NVARCHAR(50) NOT NULL,             -- ORG_RESTRUCTURE, PERFORMANCE_EXCELLENT 등
    ReasonText NVARCHAR(100) NOT NULL,            -- 조직 개편, 성과 우수, 업무상 필요 등
    ReasonTextEng NVARCHAR(100),                  -- 영문 사유
    DisplayOrder INT NOT NULL DEFAULT 1,         -- 표시 순서
    IsCommon BIT NOT NULL DEFAULT 0,              -- 공통 사유 여부
    Description NVARCHAR(200),                    -- 상세 설명
    IsActive BIT NOT NULL DEFAULT 1,              -- 활성 여부
    CreatedBy INT NOT NULL,                       -- 생성자 ID
    CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
    UpdatedBy INT,                                -- 수정자 ID
    UpdatedAt DATETIME,                           -- 수정일
    
    CONSTRAINT PK_uAssignmentReasonTb PRIMARY KEY (ReasonId),
    CONSTRAINT FK_AssignmentReason_Category FOREIGN KEY (CategoryId) REFERENCES uAssignmentCategoryTb(CategoryId),
    CONSTRAINT FK_AssignmentReason_Type FOREIGN KEY (AssignmentTypeId) REFERENCES uAssignmentTypeTb(AssignmentTypeId),
    CONSTRAINT UQ_AssignmentReason_Code UNIQUE (ReasonCode)
);

-- 4. 인덱스 생성
CREATE INDEX IX_AssignmentType_Category ON uAssignmentTypeTb(CategoryId, IsActive);
CREATE INDEX IX_AssignmentType_DisplayOrder ON uAssignmentTypeTb(DisplayOrder, IsActive);
CREATE INDEX IX_AssignmentReason_Type ON uAssignmentReasonTb(AssignmentTypeId, IsActive);
CREATE INDEX IX_AssignmentReason_Category ON uAssignmentReasonTb(CategoryId, IsActive);
CREATE INDEX IX_AssignmentReason_Common ON uAssignmentReasonTb(IsCommon, IsActive);

-- 5. 발령 이력 테이블에 새로운 컬럼 추가 (기존 테이블 확장)
ALTER TABLE uEmployeeAssignmentTb 
ADD CategoryId INT,                               -- 발령 대분류 ID
    AssignmentTypeId INT,                         -- 발령 세부유형 ID  
    ReasonId INT,                                 -- 발령 사유 ID
    ApprovalStatus NVARCHAR(20) DEFAULT 'PENDING',-- 승인 상태 (PENDING, APPROVED, REJECTED)
    ApprovalComment NVARCHAR(500),                -- 승인 의견
    DocumentPath NVARCHAR(500),                   -- 첨부문서 경로
    NotificationSent BIT DEFAULT 0,               -- 알림 발송 여부
    OldSalary DECIMAL(15,2),                      -- 이전 급여
    NewSalary DECIMAL(15,2);                      -- 새 급여

-- 6. 외래키 제약조건 추가
ALTER TABLE uEmployeeAssignmentTb
ADD CONSTRAINT FK_EmployeeAssignment_Category FOREIGN KEY (CategoryId) REFERENCES uAssignmentCategoryTb(CategoryId),
    CONSTRAINT FK_EmployeeAssignment_Type FOREIGN KEY (AssignmentTypeId) REFERENCES uAssignmentTypeTb(AssignmentTypeId),
    CONSTRAINT FK_EmployeeAssignment_Reason FOREIGN KEY (ReasonId) REFERENCES uAssignmentReasonTb(ReasonId);

-- 7. 인덱스 추가
CREATE INDEX IX_EmployeeAssignment_Category ON uEmployeeAssignmentTb(CategoryId, IsActive);
CREATE INDEX IX_EmployeeAssignment_Type ON uEmployeeAssignmentTb(AssignmentTypeId, IsActive);
CREATE INDEX IX_EmployeeAssignment_Status ON uEmployeeAssignmentTb(ApprovalStatus, IsActive);

PRINT '✅ 인사발령 유형 관리 테이블이 성공적으로 생성되었습니다.';
PRINT '📋 생성된 테이블: uAssignmentCategoryTb, uAssignmentTypeTb, uAssignmentReasonTb';
PRINT '🔧 확장된 테이블: uEmployeeAssignmentTb (새 컬럼 추가)';