-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-13
-- 설명: 직원 간단 조회 Stored Procedures
-- =============================================

-- 직원 ID로 간단 조회 SP
CREATE OR ALTER PROCEDURE SP_GetEmployeeById
    @EmployeeId INT,                -- 직원 ID
    @ResultCode INT OUTPUT,         -- 결과 코드
    @Message NVARCHAR(500) OUTPUT   -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않은 직원 ID입니다.';
            RETURN;
        END

        -- 2. 직원 정보 조회
        SELECT 
            EmployeeId,
            EmployeeCode,
            Email,
            FullName,
            UserRole,
            DeptId,
            CompanyId,
            IsActive,
            LastLoginAt,
            CreatedAt
        FROM uEmployeeTb 
        WHERE EmployeeId = @EmployeeId;

        -- 3. 결과 확인
        IF @@ROWCOUNT = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 직원입니다.';
            RETURN;
        END

        -- 4. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '직원 정보 조회 성공';

    END TRY
    BEGIN CATCH
        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '직원 정보 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

    END CATCH
END