/**
 * x_AssignEmployee - 부서 이동 SP 생성 스크립트
 * @description 직원의 부서 이동을 처리하고 발령 이력을 자동 생성하는 SP
 * @author SmartHR Team
 * @date 2024-09-13
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

const createAssignEmployeeStoredProcedure = async () => {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('\n📋 x_AssignEmployee SP 생성 중...');
    
    const assignEmployeeSP = `
-- =============================================
-- x_AssignEmployee - 직원 부서 이동 및 발령 이력 생성
-- =============================================
CREATE OR ALTER PROCEDURE x_AssignEmployee
    @EmployeeId INT,                    -- 이동할 직원 ID
    @NewCompanyId INT = NULL,           -- 새 회사 ID (선택사항, NULL이면 현재 회사 유지)
    @NewSubCompanyId INT = NULL,        -- 새 사업장 ID (선택사항, NULL이면 현재 사업장 유지)
    @NewDeptId INT,                     -- 새 부서 ID (필수)
    @NewPosId INT = NULL,               -- 새 직책 ID (선택사항, NULL이면 현재 직책 유지)
    @AssignmentDate DATETIME = NULL,    -- 발령 일자 (NULL이면 오늘)
    @AssignmentReason NVARCHAR(500) = NULL,  -- 발령 사유
    @AssignedBy INT,                    -- 발령 처리자 ID
    @ResultCode INT OUTPUT,             -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT       -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    -- 변수 선언
    DECLARE @CurrentCompanyId INT;
    DECLARE @CurrentSubCompanyId INT;
    DECLARE @CurrentDeptId INT;
    DECLARE @CurrentPosId INT;
    DECLARE @IsActive BIT;
    DECLARE @EmployeeCode NVARCHAR(20);
    DECLARE @FullName NVARCHAR(100);
    
    -- 새 조직 정보 유효성 검증용 변수
    DECLARE @NewCompanyName NVARCHAR(100);
    DECLARE @NewSubCompanyName NVARCHAR(100);
    DECLARE @NewDeptName NVARCHAR(50);
    DECLARE @NewPosName NVARCHAR(50);
    
    -- 발령 일자 기본값 설정
    IF @AssignmentDate IS NULL
        SET @AssignmentDate = GETDATE();

    BEGIN TRY
        -- 1. 입력값 검증
        IF @EmployeeId IS NULL OR @EmployeeId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않은 직원 ID입니다.';
            RETURN;
        END

        IF @NewDeptId IS NULL OR @NewDeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '새 부서 ID를 입력해주세요.';
            RETURN;
        END

        IF @AssignedBy IS NULL OR @AssignedBy <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '발령 처리자 정보가 필요합니다.';
            RETURN;
        END

        -- 2. 현재 직원 정보 조회
        SELECT 
            @CurrentCompanyId = CompanyId,
            @CurrentSubCompanyId = SubCompanyId,
            @CurrentDeptId = DeptId,
            @CurrentPosId = PosId,
            @IsActive = IsActive,
            @EmployeeCode = EmployeeCode,
            @FullName = FullName
        FROM uEmployeeTb 
        WHERE EmployeeId = @EmployeeId;

        -- 3. 직원 존재 여부 확인
        IF @EmployeeCode IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 직원입니다.';
            RETURN;
        END

        -- 4. 활성 직원 확인
        IF @IsActive = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '비활성화된 직원은 부서 이동할 수 없습니다.';
            RETURN;
        END

        -- 5. 새 조직 정보 설정 (NULL인 경우 현재 값 유지)
        SET @NewCompanyId = ISNULL(@NewCompanyId, @CurrentCompanyId);
        SET @NewSubCompanyId = ISNULL(@NewSubCompanyId, @CurrentSubCompanyId);
        SET @NewPosId = ISNULL(@NewPosId, @CurrentPosId);

        -- 6. 동일한 부서로의 이동 체크
        IF @NewCompanyId = @CurrentCompanyId 
           AND @NewSubCompanyId = @CurrentSubCompanyId 
           AND @NewDeptId = @CurrentDeptId 
           AND @NewPosId = @CurrentPosId
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '현재 부서/직책과 동일합니다. 변경할 내용이 없습니다.';
            RETURN;
        END

        -- 7. 새 회사 유효성 검증
        SELECT @NewCompanyName = CompanyName
        FROM uCompanyTb 
        WHERE CompanyId = @NewCompanyId AND IsActive = 1;

        IF @NewCompanyName IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 회사입니다.';
            RETURN;
        END

        -- 8. 새 사업장 유효성 검증
        SELECT @NewSubCompanyName = SubCompanyName
        FROM uSubCompanyTb 
        WHERE SubCompanyId = @NewSubCompanyId 
          AND CompanyId = @NewCompanyId 
          AND IsActive = 1;

        IF @NewSubCompanyName IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 사업장입니다.';
            RETURN;
        END

        -- 9. 새 부서 유효성 검증
        SELECT @NewDeptName = DeptName
        FROM uDeptTb 
        WHERE DeptId = @NewDeptId 
          AND SubCompanyId = @NewSubCompanyId 
          AND IsActive = 1;

        IF @NewDeptName IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 해당 사업장에 속하지 않는 부서입니다.';
            RETURN;
        END

        -- 10. 새 직책 유효성 검증
        SELECT @NewPosName = PosName
        FROM uPositionTb 
        WHERE PosId = @NewPosId AND IsActive = 1;

        IF @NewPosName IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 직책입니다.';
            RETURN;
        END

        -- 11. 트랜잭션 시작
        BEGIN TRANSACTION;

        -- 12. 직원 정보 업데이트
        UPDATE uEmployeeTb 
        SET CompanyId = @NewCompanyId,
            SubCompanyId = @NewSubCompanyId,
            DeptId = @NewDeptId,
            PosId = @NewPosId,
            UpdatedAt = GETDATE(),
            UpdatedBy = @AssignedBy
        WHERE EmployeeId = @EmployeeId;

        -- 13. 발령 이력 생성
        INSERT INTO uEmployeeAssignmentTb (
            EmployeeId, 
            PreviousCompanyId,
            PreviousSubCompanyId,
            PreviousDeptId,
            PreviousPosId,
            NewCompanyId, 
            NewSubCompanyId, 
            NewDeptId, 
            NewPosId,
            EffectiveDate,
            AssignmentType,
            AssignmentReason,
            ApprovedBy,
            ApprovedAt,
            IsActive,
            CreatedBy,
            CreatedAt
        ) VALUES (
            @EmployeeId,
            @CurrentCompanyId,
            @CurrentSubCompanyId,
            @CurrentDeptId,
            @CurrentPosId,
            @NewCompanyId,
            @NewSubCompanyId,
            @NewDeptId,
            @NewPosId,
            @AssignmentDate,
            N'부서이동',
            ISNULL(@AssignmentReason, N'부서 이동'),
            @AssignedBy,
            GETDATE(),
            1,
            @AssignedBy,
            GETDATE()
        );

        -- 14. 트랜잭션 커밋
        COMMIT TRANSACTION;

        -- 15. 성공 결과 반환
        SELECT 
            @EmployeeId AS EmployeeId,
            @EmployeeCode AS EmployeeCode,
            @FullName AS FullName,
            @NewCompanyName AS NewCompanyName,
            @NewSubCompanyName AS NewSubCompanyName,
            @NewDeptName AS NewDeptName,
            @NewPosName AS NewPosName,
            @AssignmentDate AS AssignmentDate,
            SCOPE_IDENTITY() AS AssignmentId;

        SET @ResultCode = 0;
        SET @Message = @FullName + N'님이 ' + @NewDeptName + N' 부서로 이동되었습니다.';

    END TRY
    BEGIN CATCH
        -- 트랜잭션 롤백
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- 에러 처리
        SET @ResultCode = -1;
        SET @Message = '부서 이동 처리 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        -- 에러 로깅
        PRINT '=== x_AssignEmployee 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'EmployeeId: ' + CAST(@EmployeeId AS NVARCHAR(10));
        PRINT 'NewDeptId: ' + CAST(@NewDeptId AS NVARCHAR(10));
        PRINT '====================================';

    END CATCH
END
`;

    await sql.query(assignEmployeeSP);
    console.log('✅ x_AssignEmployee SP 생성 완료');

    // SP 생성 확인
    console.log('\n📋 생성된 SP 확인...');
    const checkQuery = `
      SELECT name 
      FROM sys.objects 
      WHERE type = 'P' 
      AND name = 'x_AssignEmployee'
    `;
    
    const result = await sql.query(checkQuery);
    
    if (result.recordset.length > 0) {
      console.log('✅ x_AssignEmployee SP가 성공적으로 생성되었습니다.');
    } else {
      console.log('❌ x_AssignEmployee SP 생성을 확인할 수 없습니다.');
    }

    console.log('\n🎉 부서 이동 SP 생성 작업 완료!');

  } catch (error) {
    console.error('❌ SP 생성 실패:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
};

createAssignEmployeeStoredProcedure().catch(console.error);