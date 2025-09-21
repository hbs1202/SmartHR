-- x_UpdateDepartment 간단 버전 (5개 필드만 수정)
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

    BEGIN TRY
        -- 1. 부서 존재 여부 확인
        IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @DeptId)
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 부서입니다.';
            RETURN;
        END

        -- 2. 부서코드 중복 체크 (자기 자신 제외)
        IF EXISTS (SELECT 1 FROM uDeptTb WHERE DeptCode = @DeptCode AND DeptId != @DeptId)
        BEGIN
            SET @ResultCode = -2;
            SET @Message = '이미 사용 중인 부서코드입니다.';
            RETURN;
        END

        -- 3. 상위 부서 유효성 검증
        IF @ParentDeptId IS NOT NULL
        BEGIN
            -- 자기 자신을 상위 부서로 설정하는 것 방지
            IF @ParentDeptId = @DeptId
            BEGIN
                SET @ResultCode = -3;
                SET @Message = '자기 자신을 상위 부서로 설정할 수 없습니다.';
                RETURN;
            END

            -- 상위 부서 존재 여부 확인
            IF NOT EXISTS (SELECT 1 FROM uDeptTb WHERE DeptId = @ParentDeptId AND IsActive = 1)
            BEGIN
                SET @ResultCode = -4;
                SET @Message = '존재하지 않거나 비활성화된 상위 부서입니다.';
                RETURN;
            END
        END

        -- 4. 부서 정보 업데이트
        UPDATE uDeptTb
        SET
            DeptCode = @DeptCode,
            DeptName = @DeptName,
            ParentDeptId = @ParentDeptId,
            EstablishDate = @EstablishDate,
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE DeptId = @DeptId;

        -- 5. 성공 응답
        SET @ResultCode = 0;
        SET @Message = '부서 정보가 성공적으로 수정되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -99;
        SET @Message = '부서 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

PRINT '✅ x_UpdateDepartment 저장 프로시저 생성 완료!';