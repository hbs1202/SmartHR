-- x_UpdateDepartment 저장 프로시저
USE hr_system;
GO

-- 기존 프로시저 삭제
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'x_UpdateDepartment')
    DROP PROCEDURE x_UpdateDepartment;
GO

-- QUOTED_IDENTIFIER 설정
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

CREATE PROCEDURE x_UpdateDepartment
    @DeptId INT,
    @DeptCode NVARCHAR(20),
    @DeptName NVARCHAR(200),
    @ParentDeptId INT = NULL,
    @EstablishDate DATE = NULL,
    @UpdatedBy INT = 1,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET QUOTED_IDENTIFIER ON;

    BEGIN TRY
        -- 파라미터 검증
        IF @DeptId IS NULL OR @DeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 부서 ID를 입력해주세요.';
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

        -- 부서 존재 여부 확인
        DECLARE @SubCompanyId INT;
        SELECT @SubCompanyId = SubCompanyId
        FROM uDeptTb
        WHERE DeptId = @DeptId;

        IF @SubCompanyId IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '수정할 부서를 찾을 수 없습니다.';
            RETURN;
        END

        -- 부서 코드 중복 체크 (자기 자신 제외)
        IF EXISTS (SELECT 1 FROM uDeptTb WHERE DeptCode = @DeptCode AND DeptId != @DeptId)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 부서 코드입니다.';
            RETURN;
        END

        -- 상위 부서 유효성 검증
        DECLARE @DeptLevel INT = 1;
        IF @ParentDeptId IS NOT NULL
        BEGIN
            -- 자기 자신을 상위 부서로 설정하는 것 방지
            IF @ParentDeptId = @DeptId
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '자기 자신을 상위 부서로 설정할 수 없습니다.';
                RETURN;
            END

            -- 순환 참조 방지 (하위 부서를 상위 부서로 설정하는 것 방지)
            WITH DeptHierarchy AS (
                SELECT DeptId, ParentDeptId, 1 as Level
                FROM uDeptTb
                WHERE DeptId = @DeptId

                UNION ALL

                SELECT d.DeptId, d.ParentDeptId, dh.Level + 1
                FROM uDeptTb d
                INNER JOIN DeptHierarchy dh ON d.ParentDeptId = dh.DeptId
                WHERE dh.Level < 10 -- 무한루프 방지
            )
            SELECT @DeptLevel = COUNT(*)
            FROM DeptHierarchy
            WHERE DeptId = @ParentDeptId;

            IF @DeptLevel > 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '하위 부서를 상위 부서로 설정할 수 없습니다.';
                RETURN;
            END

            -- 상위 부서 유효성 확인
            IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @ParentDeptId AND SubCompanyId = @SubCompanyId AND IsActive = 1)
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '유효하지 않은 상위 부서입니다.';
                RETURN;
            END

            -- 상위 부서의 레벨 + 1로 설정
            SELECT @DeptLevel = DeptLevel + 1 FROM uDeptTb WHERE DeptId = @ParentDeptId;
        END

        -- 부서 정보 수정
        UPDATE uDeptTb
        SET
            DeptCode = @DeptCode,
            DeptName = @DeptName,
            ParentDeptId = @ParentDeptId,
            DeptLevel = @DeptLevel,
            EstablishDate = ISNULL(@EstablishDate, EstablishDate),
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE DeptId = @DeptId;

        SET @ResultCode = 0;
        SET @Message = '부서 정보가 성공적으로 수정되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '부서 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

PRINT '✅ x_UpdateDepartment 저장 프로시저 생성 완료!';