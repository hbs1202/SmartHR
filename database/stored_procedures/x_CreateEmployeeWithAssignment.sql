/**
 * 직원 등록 및 발령 이력 생성 통합 Stored Procedure
 * @description 새로운 직원을 등록하고 입사 발령 이력을 자동으로 생성
 * @author SmartHR Team
 * @date 2025-09-22
 * @version 1.0
 */

-- SP가 이미 존재하면 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'x_CreateEmployeeWithAssignment')
    DROP PROCEDURE x_CreateEmployeeWithAssignment;
GO

CREATE PROCEDURE x_CreateEmployeeWithAssignment
    -- 직원 기본 정보
    @CompanyId INT,
    @SubCompanyId INT,
    @DeptId INT,
    @PosId INT,
    @EmployeeCode NVARCHAR(50),
    @Password NVARCHAR(255),
    @Email NVARCHAR(100),
    @FullName NVARCHAR(100),
    @NameEng NVARCHAR(100) = NULL,
    @Gender CHAR(1) = NULL,
    @BirthDate DATE = NULL,
    @PhoneNumber NVARCHAR(20) = NULL,
    @HireDate DATE,
    @EmploymentType NVARCHAR(20) = N'정규직',
    @CurrentSalary DECIMAL(15,2) = NULL,
    @UserRole NVARCHAR(20) = 'employee',
    @CreatedBy INT,

    -- 발령 관련 정보
    @AssignmentReason NVARCHAR(200) = N'신규 채용',
    @ApprovalStatus NVARCHAR(20) = 'APPROVED'
AS
BEGIN
    SET NOCOUNT ON;

    -- 변수 선언
    DECLARE @NewEmployeeId INT;
    DECLARE @NewAssignmentId INT;
    DECLARE @ResultCode INT = 0;
    DECLARE @Message NVARCHAR(500) = N'성공';
    DECLARE @ErrorMessage NVARCHAR(500);

    -- 트랜잭션 시작
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. 직원코드 중복 검증
        IF EXISTS (SELECT 1 FROM uEmployeeTb WHERE EmployeeCode = @EmployeeCode)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = N'이미 존재하는 직원코드입니다.';
            RAISERROR(@Message, 16, 1);
        END

        -- 2. 이메일 중복 검증
        IF EXISTS (SELECT 1 FROM uEmployeeTb WHERE Email = @Email)
        BEGIN
            SET @ResultCode = -2;
            SET @Message = N'이미 존재하는 이메일입니다.';
            RAISERROR(@Message, 16, 1);
        END

        -- 3. 조직 정보 유효성 검증
        IF NOT EXISTS (SELECT 1 FROM uCompanyTb WHERE CompanyId = @CompanyId)
        BEGIN
            SET @ResultCode = -3;
            SET @Message = N'존재하지 않는 회사입니다.';
            RAISERROR(@Message, 16, 1);
        END

        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId AND CompanyId = @CompanyId)
        BEGIN
            SET @ResultCode = -4;
            SET @Message = N'존재하지 않는 사업장이거나 회사와 일치하지 않습니다.';
            RAISERROR(@Message, 16, 1);
        END

        IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @DeptId AND SubCompanyId = @SubCompanyId)
        BEGIN
            SET @ResultCode = -5;
            SET @Message = N'존재하지 않는 부서이거나 사업장과 일치하지 않습니다.';
            RAISERROR(@Message, 16, 1);
        END

        IF NOT EXISTS (SELECT 1 FROM uPositionTb WHERE PosId = @PosId)
        BEGIN
            SET @ResultCode = -6;
            SET @Message = N'존재하지 않는 직책입니다.';
            RAISERROR(@Message, 16, 1);
        END

        -- 4. 직원 등록 (FullName을 FirstName, LastName으로 분리)
        DECLARE @FirstNamePart NVARCHAR(50);
        DECLARE @LastNamePart NVARCHAR(50);

        -- FullName을 성과 이름으로 분리 (첫 글자는 성, 나머지는 이름)
        SET @LastNamePart = LEFT(@FullName, 1);
        SET @FirstNamePart = SUBSTRING(@FullName, 2, LEN(@FullName) - 1);

        INSERT INTO uEmployeeTb (
            CompanyId,
            SubCompanyId,
            DeptId,
            PosId,
            EmployeeCode,
            Password,
            Email,
            FirstName,
            LastName,
            NameEng,
            Gender,
            BirthDate,
            PhoneNumber,
            HireDate,
            EmploymentType,
            CurrentSalary,
            UserRole,
            IsActive,
            CreatedBy,
            CreatedAt,
            UpdatedAt
        ) VALUES (
            @CompanyId,
            @SubCompanyId,
            @DeptId,
            @PosId,
            @EmployeeCode,
            @Password,
            @Email,
            @FirstNamePart,
            @LastNamePart,
            @NameEng,
            @Gender,
            @BirthDate,
            @PhoneNumber,
            @HireDate,
            @EmploymentType,
            @CurrentSalary,
            @UserRole,
            1, -- IsActive = true
            @CreatedBy,
            GETDATE(),
            GETDATE()
        );

        -- 새로 생성된 직원 ID 가져오기
        SET @NewEmployeeId = SCOPE_IDENTITY();

        -- 5. 입사 발령 이력 생성
        INSERT INTO uEmployeeAssignmentTb (
            EmployeeId,
            AssignmentType,
            EffectiveDate,
            AssignmentReason,
            -- 이전 조직 정보 (입사시에는 NULL)
            PreviousCompanyId,
            PreviousSubCompanyId,
            PreviousDeptId,
            PreviousPosId,
            PreviousSalary,
            -- 새 조직 정보
            NewCompanyId,
            NewSubCompanyId,
            NewDeptId,
            NewPosId,
            NewSalary,
            -- 승인 정보
            ApprovedBy,
            ApprovedAt,
            CreatedBy,
            CreatedAt,
            UpdatedAt
        ) VALUES (
            @NewEmployeeId,
            'HIRING', -- 입사 발령
            @HireDate,
            @AssignmentReason,
            -- 이전 조직 정보 (입사시에는 NULL)
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            -- 새 조직 정보
            @CompanyId,
            @SubCompanyId,
            @DeptId,
            @PosId,
            @CurrentSalary,
            -- 승인 정보 (입사 발령은 자동 승인)
            @CreatedBy,
            GETDATE(),
            @CreatedBy,
            GETDATE(),
            GETDATE()
        );

        -- 새로 생성된 발령 ID 가져오기
        SET @NewAssignmentId = SCOPE_IDENTITY();

        -- 트랜잭션 커밋
        COMMIT TRANSACTION;

        -- 6. 성공 결과 반환 (조직 정보 포함)
        SELECT
            @ResultCode AS ResultCode,
            @Message AS Message,
            @NewEmployeeId AS EmployeeId,
            @NewAssignmentId AS AssignmentId,
            c.CompanyName AS CompanyName,
            sc.SubCompanyName AS SubCompanyName,
            d.DeptName AS DeptName,
            p.PosName AS PosName
        FROM uEmployeeTb e
            LEFT JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
            LEFT JOIN uSubCompanyTb sc ON e.SubCompanyId = sc.SubCompanyId
            LEFT JOIN uDeptTb d ON e.DeptId = d.DeptId
            LEFT JOIN uPositionTb p ON e.PosId = p.PosId
        WHERE e.EmployeeId = @NewEmployeeId;

    END TRY
    BEGIN CATCH
        -- 트랜잭션 롤백
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;

        -- 오류 정보 수집
        SET @ErrorMessage = ERROR_MESSAGE();
        SET @ResultCode = ERROR_NUMBER();

        -- 오류 결과 반환
        SELECT
            @ResultCode AS ResultCode,
            @ErrorMessage AS Message,
            NULL AS EmployeeId,
            NULL AS AssignmentId,
            NULL AS CompanyName,
            NULL AS SubCompanyName,
            NULL AS DeptName,
            NULL AS PosName;
    END CATCH
END;
GO

-- 권한 부여
GRANT EXECUTE ON x_CreateEmployeeWithAssignment TO [hr_user];
GO

PRINT 'x_CreateEmployeeWithAssignment 프로시저가 성공적으로 생성되었습니다.';