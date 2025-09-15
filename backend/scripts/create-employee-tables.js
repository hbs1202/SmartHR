/**
 * 직원 테이블 생성 스크립트
 */

const sql = require('mssql');
require('dotenv').config();

// 데이터베이스 설정
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
    requestTimeout: 30000,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function createEmployeeTables() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 1. 직원 기본 정보 테이블 생성
    console.log('🔄 직원 기본 정보 테이블 생성 중...');
    
    // 테이블 존재 확인
    const checkTableResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM sysobjects WHERE name='uEmployeeTb' AND xtype='U'
    `);
    
    if (checkTableResult.recordset[0].count === 0) {
      const createEmployeeTableQuery = `
        CREATE TABLE uEmployeeTb (
            EmployeeId INT IDENTITY(1,1) PRIMARY KEY,
            CompanyId INT NOT NULL,
            SubCompanyId INT NOT NULL,
            DeptId INT NOT NULL,
            PosId INT NOT NULL,
            
            -- 로그인 정보
            EmployeeCode NVARCHAR(20) NOT NULL UNIQUE,
            Password NVARCHAR(255) NOT NULL,
            Email NVARCHAR(255) NOT NULL UNIQUE,
            
            -- 개인 기본 정보
            FirstName NVARCHAR(50) NOT NULL,
            LastName NVARCHAR(50) NOT NULL,
            FullName AS (LastName + FirstName) PERSISTED,
            NameEng NVARCHAR(100) NULL,
            
            -- 개인 신상 정보
            Gender NCHAR(1) CHECK (Gender IN ('M', 'F')) NULL,
            BirthDate DATE NULL,
            PhoneNumber NVARCHAR(20) NULL,
            
            -- 재직 정보
            HireDate DATE NOT NULL,
            RetireDate DATE NULL,
            EmploymentType NVARCHAR(50) NOT NULL DEFAULT N'정규직',
            
            -- 급여 정보
            CurrentSalary DECIMAL(15,2) NULL,
            
            -- 권한 정보
            UserRole NVARCHAR(50) NOT NULL DEFAULT 'employee',
            LastLoginAt DATETIME NULL,
            LoginFailCount INT DEFAULT 0,
            AccountLocked BIT DEFAULT 0,
            PasswordChangedAt DATETIME NULL,
            
            -- 시스템 정보
            IsActive BIT NOT NULL DEFAULT 1,
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
                FOREIGN KEY (PosId) REFERENCES uPositionTb(PosId)
        )`;
        
      await pool.request().query(createEmployeeTableQuery);
      
      // 인덱스 생성
      const createIndexQueries = [
        `CREATE INDEX IX_uEmployeeTb_Code ON uEmployeeTb (EmployeeCode)`,
        `CREATE INDEX IX_uEmployeeTb_Email ON uEmployeeTb (Email)`,
        `CREATE INDEX IX_uEmployeeTb_FullName ON uEmployeeTb (FullName)`,
        `CREATE INDEX IX_uEmployeeTb_Company ON uEmployeeTb (CompanyId)`,
        `CREATE INDEX IX_uEmployeeTb_Department ON uEmployeeTb (DeptId)`,
        `CREATE INDEX IX_uEmployeeTb_Position ON uEmployeeTb (PosId)`,
        `CREATE INDEX IX_uEmployeeTb_UserRole ON uEmployeeTb (UserRole)`,
        `CREATE INDEX IX_uEmployeeTb_Active ON uEmployeeTb (IsActive)`
      ];
      
      for (const query of createIndexQueries) {
        await pool.request().query(query);
      }
      
      console.log('✅ uEmployeeTb 테이블이 생성되었습니다.');
    } else {
      console.log('⚠️ uEmployeeTb 테이블이 이미 존재합니다.');
    }

    console.log('✅ 직원 기본 정보 테이블 생성 완료');

    // 2. 직원 발령 이력 테이블 생성
    console.log('🔄 직원 발령 이력 테이블 생성 중...');
    
    // 테이블 존재 확인
    const checkAssignmentTableResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM sysobjects WHERE name='uEmployeeAssignmentTb' AND xtype='U'
    `);
    
    if (checkAssignmentTableResult.recordset[0].count === 0) {
      const createAssignmentTableQuery = `
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
            AssignmentType NVARCHAR(50) NOT NULL,
            AssignmentReason NVARCHAR(200) NULL,
            EffectiveDate DATE NOT NULL,
            
            -- 급여 변경 정보
            PreviousSalary DECIMAL(15,2) NULL,
            NewSalary DECIMAL(15,2) NULL,
            
            -- 승인 정보
            ApprovedBy INT NULL,
            ApprovedAt DATETIME NULL,
            
            -- 시스템 정보
            IsActive BIT NOT NULL DEFAULT 1,
            CreatedAt DATETIME NOT NULL DEFAULT GETDATE(),
            UpdatedAt DATETIME NULL,
            CreatedBy INT NOT NULL,
            UpdatedBy INT NULL,
            
            -- 외래키 제약조건
            CONSTRAINT FK_uEmployeeAssignmentTb_Employee
                FOREIGN KEY (EmployeeId) REFERENCES uEmployeeTb(EmployeeId)
        )`;
        
      await pool.request().query(createAssignmentTableQuery);
      
      // 인덱스 생성
      const createAssignmentIndexQueries = [
        `CREATE INDEX IX_uEmployeeAssignmentTb_Employee ON uEmployeeAssignmentTb (EmployeeId)`,
        `CREATE INDEX IX_uEmployeeAssignmentTb_Type ON uEmployeeAssignmentTb (AssignmentType)`,
        `CREATE INDEX IX_uEmployeeAssignmentTb_Date ON uEmployeeAssignmentTb (EffectiveDate)`,
        `CREATE INDEX IX_uEmployeeAssignmentTb_Active ON uEmployeeAssignmentTb (IsActive)`
      ];
      
      for (const query of createAssignmentIndexQueries) {
        await pool.request().query(query);
      }
      
      console.log('✅ uEmployeeAssignmentTb 테이블이 생성되었습니다.');
    } else {
      console.log('⚠️ uEmployeeAssignmentTb 테이블이 이미 존재합니다.');
    }

    console.log('✅ 직원 발령 이력 테이블 생성 완료');

    // 3. 뷰 생성
    console.log('🔄 직원 상세 뷰 생성 중...');
    
    // 기존 뷰 삭제
    const checkViewResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM sys.views WHERE name = 'uEmployeeDetailView'
    `);
    
    if (checkViewResult.recordset[0].count > 0) {
      await pool.request().query(`DROP VIEW uEmployeeDetailView`);
    }
    
    const createViewQuery = `
    CREATE VIEW uEmployeeDetailView AS
    SELECT 
        e.EmployeeId,
        e.EmployeeCode,
        e.Email,
        e.FullName,
        e.FirstName,
        e.LastName,
        e.Gender,
        e.BirthDate,
        e.PhoneNumber,
        e.HireDate,
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
        p.PosId,
        p.PosName,
        p.PosCode,
        p.PosGrade,
        
        -- 조직 경로
        c.CompanyName + ' > ' + ws.SubCompanyName + ' > ' + d.DeptName + ' > ' + p.PosName AS OrganizationPath,
        
        -- 재직 상태
        CASE 
            WHEN e.RetireDate IS NOT NULL THEN N'퇴사'
            WHEN e.IsActive = 1 THEN N'재직'
            ELSE N'비활성'
        END AS EmploymentStatus,
        
        -- 시스템 정보
        e.LastLoginAt,
        e.CreatedAt,
        e.UpdatedAt
        
    FROM uEmployeeTb e
        INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
        INNER JOIN uSubCompanyTb ws ON e.SubCompanyId = ws.SubCompanyId  
        INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
        INNER JOIN uPositionTb p ON e.PosId = p.PosId`;

    await pool.request().query(createViewQuery);
    console.log('✅ 직원 상세 뷰 생성 완료');

    // 테이블 생성 확인
    const result = await pool.request().query(`
      SELECT TABLE_NAME as '테이블명'
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME IN ('uEmployeeTb', 'uEmployeeAssignmentTb')
      ORDER BY TABLE_NAME
    `);

    console.log('📋 생성된 테이블 목록:');
    result.recordset.forEach(row => {
      console.log(`  ✅ ${row['테이블명']}`);
    });

    const viewResult = await pool.request().query(`
      SELECT TABLE_NAME as '뷰명'
      FROM INFORMATION_SCHEMA.VIEWS 
      WHERE TABLE_NAME = 'uEmployeeDetailView'
    `);

    console.log('📋 생성된 뷰 목록:');
    viewResult.recordset.forEach(row => {
      console.log(`  ✅ ${row['뷰명']}`);
    });

    console.log('✅ 직원 테이블 생성이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 직원 테이블 생성 실패:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔄 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
createEmployeeTables();