-- x_CreateDepartment 저장 프로시저
USE hr_system;
GO

-- 기존 프로시저 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_CreateDepartment')
    DROP PROCEDURE x_CreateDepartment;
GO

-- QUOTED_IDENTIFIER 설정
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE PROCEDURE x_CreateDepartment
    @SubCompanyId INT,
    @DeptCode NVARCHAR(20),
    @DeptName NVARCHAR(200),
    @ParentDeptId INT = NULL,
    @EstablishDate DATE = NULL,
    @CreatedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        -- 파라미터 검증
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END

        IF @DeptCode IS NULL OR LTRIM(RTRIM(@DeptCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '부서 코드는 필수 입력 항목입니다.';
            RETURN;
        END

        IF @DeptName IS NULL OR LTRIM(RTRIM(@DeptName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '부서명은 필수 입력 항목입니다.';
            RETURN;
        END

        -- 사업장 존재 여부 확인
        IF NOT EXISTS (SELECT 1 FROM uSubCompanyTb WHERE SubCompanyId = @SubCompanyId AND IsActive = 1)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않거나 비활성화된 사업장입니다.';
            RETURN;
        END

        -- 부서 코드 중복 체크
        IF EXISTS (SELECT 1 FROM uDeptTb WHERE DeptCode = @DeptCode)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 부서 코드입니다.';
            RETURN;
        END

        -- 상위 부서 유효성 검증
        DECLARE @DeptLevel INT = 1;
        IF @ParentDeptId IS NOT NULL
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @ParentDeptId AND SubCompanyId = @SubCompanyId AND IsActive = 1)
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '유효하지 않은 상위 부서입니다.';
                RETURN;
            END

            -- 상위 부서의 레벨 + 1로 설정
            SELECT @DeptLevel = DeptLevel + 1 FROM uDeptTb WHERE DeptId = @ParentDeptId;
        END

        -- 신설일 기본값 설정
        IF @EstablishDate IS NULL
            SET @EstablishDate = CAST(GETDATE() AS DATE);

        -- 부서 정보 삽입
        INSERT INTO uDeptTb (
            SubCompanyId, DeptCode, DeptName, ParentDeptId, DeptLevel,
            DeptType, EstablishDate, IsActive, CreatedAt, CreatedBy
        )
        VALUES (
            @SubCompanyId, @DeptCode, @DeptName, @ParentDeptId, @DeptLevel,
            '일반부서', @EstablishDate, 1, GETDATE(), @CreatedBy
        );

        DECLARE @NewDeptId INT = SCOPE_IDENTITY();
        SELECT @NewDeptId AS DeptId;

        SET @ResultCode = 0;
        SET @Message = '부서가 성공적으로 등록되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '부서 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

PRINT '✅ x_CreateDepartment 저장 프로시저 생성 완료!';