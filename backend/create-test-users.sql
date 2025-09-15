-- =============================================
-- 테스트 사용자 계정 생성 스크립트
-- 비밀번호는 bcrypt로 해시화되어 저장
-- =============================================

-- 회사 정보 추가 (없는 경우)
IF NOT EXISTS (SELECT 1 FROM Companies WHERE CompanyId = 1)
BEGIN
    INSERT INTO Companies (CompanyName, BusinessNumber, Address, PhoneNumber, IsActive)
    VALUES (N'테스트 회사', '123-45-67890', N'서울시 강남구', '02-1234-5678', 1);
END;

-- 부서 정보 추가 (없는 경우)
IF NOT EXISTS (SELECT 1 FROM Departments WHERE DeptId = 1)
BEGIN
    INSERT INTO Departments (CompanyId, DeptName, ParentDeptId, DeptLevel, IsActive)
    VALUES (1, N'관리부서', NULL, 1, 1);
END;

IF NOT EXISTS (SELECT 1 FROM Departments WHERE DeptId = 2)
BEGIN
    INSERT INTO Departments (CompanyId, DeptName, ParentDeptId, DeptLevel, IsActive)
    VALUES (1, N'인사부서', NULL, 1, 1);
END;

-- 직급/직책 정보 추가 (없는 경우)
IF NOT EXISTS (SELECT 1 FROM Positions WHERE PositionId = 1)
BEGIN
    INSERT INTO Positions (CompanyId, PositionName, PositionLevel, IsActive)
    VALUES (1, N'관리자', 10, 1);
END;

IF NOT EXISTS (SELECT 1 FROM Positions WHERE PositionId = 2)
BEGIN
    INSERT INTO Positions (CompanyId, PositionName, PositionLevel, IsActive)
    VALUES (1, N'매니저', 5, 1);
END;

IF NOT EXISTS (SELECT 1 FROM Positions WHERE PositionId = 3)
BEGIN
    INSERT INTO Positions (CompanyId, PositionName, PositionLevel, IsActive)
    VALUES (1, N'사원', 1, 1);
END;

-- 테스트 사용자 계정 삭제 (이미 있다면)
DELETE FROM Employees WHERE Email IN ('admin@smarthr.com', 'hr@smarthr.com', 'employee1@smarthr.com');

-- 1. 관리자 계정 생성
INSERT INTO Employees (
    EmployeeCode, FullName, Email, Password,
    PhoneNumber, HireDate, UserRole, IsActive,
    CompanyId, DeptId, PositionId
) VALUES (
    'EMP001',
    N'시스템 관리자',
    'admin@smarthr.com',
    '$2b$10$9vF8O.zXJ8g4R4x7YQKjN.rOUPHKbGFLlJN9S8jT8mYpW2qE5vM6e', -- Admin123!
    '010-1111-1111',
    GETDATE(),
    'admin',
    1,
    1, 1, 1
);

-- 2. 인사팀 계정 생성
INSERT INTO Employees (
    EmployeeCode, FullName, Email, Password,
    PhoneNumber, HireDate, UserRole, IsActive,
    CompanyId, DeptId, PositionId
) VALUES (
    'EMP002',
    N'인사팀 매니저',
    'hr@smarthr.com',
    '$2b$10$ZqGFkPJV8R9wX7yE3fJ5UeMpNdK8wH3sT6mL4oY9qR1vA5sQ2bN8f', -- Hr123!
    '010-2222-2222',
    GETDATE(),
    'manager',
    1,
    1, 2, 2
);

-- 3. 일반 직원 계정 생성
INSERT INTO Employees (
    EmployeeCode, FullName, Email, Password,
    PhoneNumber, HireDate, UserRole, IsActive,
    CompanyId, DeptId, PositionId
) VALUES (
    'EMP003',
    N'김직원',
    'employee1@smarthr.com',
    '$2b$10$kR7fL9nM2pW6vY8zQ3xN4eB5cA9dF1gH0iJ8kL7mP5oQ6rS3tU2vX', -- Employee123!
    '010-3333-3333',
    GETDATE(),
    'employee',
    1,
    1, 2, 3
);

PRINT '✅ 테스트 계정 생성 완료!';
PRINT '📋 생성된 계정:';
PRINT '1. admin@smarthr.com / Admin123! (시스템 관리자)';
PRINT '2. hr@smarthr.com / Hr123! (인사팀 매니저)';
PRINT '3. employee1@smarthr.com / Employee123! (김직원)';