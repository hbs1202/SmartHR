-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-01-15
-- 설명: 직책 관리 Stored Procedure 모음
-- 기능: 직책 등록, 조회, 수정, 삭제, 목록 조회
-- 테이블: uPositionTb
-- 수정이력:
-- =============================================

-- 1. 직책 목록 조회 SP
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'SP_GetPositions')
    DROP PROCEDURE SP_GetPositions
GO

CREATE PROCEDURE SP_GetPositions
    @DeptId INT = NULL,           -- 부서 ID 필터 (선택적)
    @IsActive BIT = 1,            -- 활성 상태 필터
    @Page INT = 1,                -- 페이지 번호
    @PageSize INT = 10,           -- 페이지 크기
    @SearchKeyword NVARCHAR(100) = NULL,  -- 검색 키워드
    @ResultCode INT OUTPUT,       -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    DECLARE @TotalCount INT = 0;

    BEGIN TRY
        -- 전체 카운트 조회
        SELECT @TotalCount = COUNT(*)
        FROM uPositionTb p
        WHERE (@DeptId IS NULL OR p.DeptId = @DeptId)
          AND p.IsActive = @IsActive
          AND (@SearchKeyword IS NULL 
               OR p.PosName LIKE '%' + @SearchKeyword + '%' 
               OR p.PosCode LIKE '%' + @SearchKeyword + '%'
               OR p.JobTitle LIKE '%' + @SearchKeyword + '%');

        -- 페이징된 데이터 조회
        SELECT 
            p.PosId,
            p.DeptId,
            d.DeptName,
            p.PosCode,
            p.PosName,
            p.PosNameEng,
            p.PosLevel,
            p.PosGrade,
            p.JobTitle,
            p.JobCategory,
            p.MinSalary,
            p.MaxSalary,
            p.BaseSalary,
            p.AllowanceAmount,
            p.IsManagerPosition,
            p.RequiredExperience,
            p.RequiredEducation,
            p.RequiredSkills,
            p.JobDescription,
            p.Responsibilities,
            p.ReportingTo,
            p.MaxHeadcount,
            p.CurrentHeadcount,
            p.IsActive,
            p.CreatedAt,
            p.UpdatedAt,
            @TotalCount AS TotalCount,
            @Page AS CurrentPage,
            @PageSize AS PageSize,
            CEILING(CAST(@TotalCount AS FLOAT) / @PageSize) AS TotalPages
        FROM uPositionTb p
        LEFT JOIN uDeptTb d ON p.DeptId = d.DeptId
        WHERE (@DeptId IS NULL OR p.DeptId = @DeptId)
          AND p.IsActive = @IsActive
          AND (@SearchKeyword IS NULL 
               OR p.PosName LIKE '%' + @SearchKeyword + '%' 
               OR p.PosCode LIKE '%' + @SearchKeyword + '%'
               OR p.JobTitle LIKE '%' + @SearchKeyword + '%')
        ORDER BY p.PosLevel, p.PosName
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY;

        SET @ResultCode = 0;
        SET @Message = '직책 목록 조회가 성공적으로 완료되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '직책 목록 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        PRINT '=== SP_GetPositions 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT '==============================';

    END CATCH
END
GO

-- 2. 직책 상세 조회 SP
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'SP_GetPositionById')
    DROP PROCEDURE SP_GetPositionById
GO

CREATE PROCEDURE SP_GetPositionById
    @PosId INT,                   -- 직책 ID
    @ResultCode INT OUTPUT,       -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Count INT = 0;

    BEGIN TRY
        -- 직책 존재 여부 확인
        SELECT @Count = COUNT(*)
        FROM uPositionTb
        WHERE PosId = @PosId;

        IF @Count = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 직책입니다.';
            RETURN;
        END

        -- 직책 상세 정보 조회
        SELECT 
            p.PosId,
            p.DeptId,
            d.DeptName,
            d.DeptCode,
            p.PosCode,
            p.PosName,
            p.PosNameEng,
            p.PosLevel,
            p.PosGrade,
            p.JobTitle,
            p.JobCategory,
            p.MinSalary,
            p.MaxSalary,
            p.BaseSalary,
            p.AllowanceAmount,
            p.IsManagerPosition,
            p.RequiredExperience,
            p.RequiredEducation,
            p.RequiredSkills,
            p.JobDescription,
            p.Responsibilities,
            p.ReportingTo,
            rp.PosName AS ReportingToName,
            p.MaxHeadcount,
            p.CurrentHeadcount,
            p.IsActive,
            p.CreatedAt,
            p.UpdatedAt,
            p.CreatedBy,
            p.UpdatedBy
        FROM uPositionTb p
        LEFT JOIN uDeptTb d ON p.DeptId = d.DeptId
        LEFT JOIN uPositionTb rp ON p.ReportingTo = rp.PosId
        WHERE p.PosId = @PosId;

        SET @ResultCode = 0;
        SET @Message = '직책 상세 조회가 성공적으로 완료되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '직책 상세 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        PRINT '=== SP_GetPositionById 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'Input PosId: ' + CAST(@PosId AS NVARCHAR(10));
        PRINT '====================================';

    END CATCH
END
GO

-- 3. 직책 등록 SP
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'SP_CreatePosition')
    DROP PROCEDURE SP_CreatePosition
GO

CREATE PROCEDURE SP_CreatePosition
    @DeptId INT,                  -- 부서 ID (필수)
    @PosCode NVARCHAR(20),        -- 직책 코드 (필수)
    @PosName NVARCHAR(200),       -- 직책명 (필수)
    @PosNameEng NVARCHAR(200) = NULL,     -- 영문 직책명
    @PosLevel INT = 1,            -- 직책 레벨
    @PosGrade NVARCHAR(20) = NULL,        -- 직급
    @JobTitle NVARCHAR(200) = NULL,       -- 직무명
    @JobCategory NVARCHAR(100) = NULL,    -- 직무 카테고리
    @MinSalary DECIMAL(15,2) = NULL,      -- 최소 급여
    @MaxSalary DECIMAL(15,2) = NULL,      -- 최대 급여
    @BaseSalary DECIMAL(15,2) = NULL,     -- 기본 급여
    @AllowanceAmount DECIMAL(15,2) = NULL, -- 수당
    @IsManagerPosition BIT = 0,           -- 관리자 직책 여부
    @RequiredExperience INT = NULL,       -- 필요 경력
    @RequiredEducation NVARCHAR(100) = NULL,  -- 필요 학력
    @RequiredSkills NVARCHAR(1000) = NULL,   -- 필요 기술
    @JobDescription NVARCHAR(2000) = NULL,   -- 직무 설명
    @Responsibilities NVARCHAR(2000) = NULL, -- 책임사항
    @ReportingTo INT = NULL,              -- 보고 대상 직책 ID
    @MaxHeadcount INT = NULL,             -- 최대 인원
    @CreatedBy INT = NULL,                -- 생성자 ID
    @ResultCode INT OUTPUT,               -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT         -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Count INT = 0;
    DECLARE @DeptCount INT = 0;
    DECLARE @NewPosId INT = 0;

    BEGIN TRY
        -- 1. 입력값 검증
        IF @DeptId IS NULL OR @DeptId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '부서 ID는 필수 입력 항목입니다.';
            RETURN;
        END

        IF @PosCode IS NULL OR LTRIM(RTRIM(@PosCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '직책 코드는 필수 입력 항목입니다.';
            RETURN;
        END

        IF @PosName IS NULL OR LTRIM(RTRIM(@PosName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '직책명은 필수 입력 항목입니다.';
            RETURN;
        END

        -- 2. 부서 존재 여부 확인
        SELECT @DeptCount = COUNT(*)
        FROM uDeptTb
        WHERE DeptId = @DeptId AND IsActive = 1;

        IF @DeptCount = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 부서입니다.';
            RETURN;
        END

        -- 3. 직책 코드 중복 확인 (같은 부서 내)
        SELECT @Count = COUNT(*)
        FROM uPositionTb
        WHERE DeptId = @DeptId AND PosCode = @PosCode AND IsActive = 1;

        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '해당 부서에 이미 존재하는 직책 코드입니다.';
            RETURN;
        END

        -- 4. 직책명 중복 확인 (같은 부서 내)
        SELECT @Count = COUNT(*)
        FROM uPositionTb
        WHERE DeptId = @DeptId AND PosName = @PosName AND IsActive = 1;

        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '해당 부서에 이미 존재하는 직책명입니다.';
            RETURN;
        END

        -- 5. 보고 대상 직책 유효성 확인
        IF @ReportingTo IS NOT NULL
        BEGIN
            SELECT @Count = COUNT(*)
            FROM uPositionTb
            WHERE PosId = @ReportingTo AND IsActive = 1;

            IF @Count = 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '존재하지 않는 보고 대상 직책입니다.';
                RETURN;
            END
        END

        -- 6. 직책 생성
        INSERT INTO uPositionTb (
            DeptId, PosCode, PosName, PosNameEng, PosLevel, PosGrade,
            JobTitle, JobCategory, MinSalary, MaxSalary, BaseSalary, AllowanceAmount,
            IsManagerPosition, RequiredExperience, RequiredEducation, RequiredSkills,
            JobDescription, Responsibilities, ReportingTo, MaxHeadcount, CurrentHeadcount,
            IsActive, CreatedAt, CreatedBy
        )
        VALUES (
            @DeptId, @PosCode, @PosName, @PosNameEng, @PosLevel, @PosGrade,
            @JobTitle, @JobCategory, @MinSalary, @MaxSalary, @BaseSalary, @AllowanceAmount,
            @IsManagerPosition, @RequiredExperience, @RequiredEducation, @RequiredSkills,
            @JobDescription, @Responsibilities, @ReportingTo, @MaxHeadcount, 0,
            1, GETDATE(), @CreatedBy
        );

        SET @NewPosId = SCOPE_IDENTITY();

        -- 7. 생성된 직책 정보 반환
        SELECT 
            PosId,
            DeptId,
            PosCode,
            PosName,
            PosLevel,
            IsActive,
            CreatedAt
        FROM uPositionTb 
        WHERE PosId = @NewPosId;

        SET @ResultCode = 0;
        SET @Message = '직책이 성공적으로 등록되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '직책 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        PRINT '=== SP_CreatePosition 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'Input DeptId: ' + CAST(@DeptId AS NVARCHAR(10));
        PRINT 'Input PosCode: ' + ISNULL(@PosCode, 'NULL');
        PRINT 'Input PosName: ' + ISNULL(@PosName, 'NULL');
        PRINT '===================================';

    END CATCH
END
GO

-- 4. 직책 정보 수정 SP
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'SP_UpdatePosition')
    DROP PROCEDURE SP_UpdatePosition
GO

CREATE PROCEDURE SP_UpdatePosition
    @PosId INT,                   -- 직책 ID (필수)
    @DeptId INT = NULL,           -- 부서 ID
    @PosCode NVARCHAR(20) = NULL, -- 직책 코드
    @PosName NVARCHAR(200) = NULL,-- 직책명
    @PosNameEng NVARCHAR(200) = NULL,     -- 영문 직책명
    @PosLevel INT = NULL,         -- 직책 레벨
    @PosGrade NVARCHAR(20) = NULL,        -- 직급
    @JobTitle NVARCHAR(200) = NULL,       -- 직무명
    @JobCategory NVARCHAR(100) = NULL,    -- 직무 카테고리
    @MinSalary DECIMAL(15,2) = NULL,      -- 최소 급여
    @MaxSalary DECIMAL(15,2) = NULL,      -- 최대 급여
    @BaseSalary DECIMAL(15,2) = NULL,     -- 기본 급여
    @AllowanceAmount DECIMAL(15,2) = NULL, -- 수당
    @IsManagerPosition BIT = NULL,        -- 관리자 직책 여부
    @RequiredExperience INT = NULL,       -- 필요 경력
    @RequiredEducation NVARCHAR(100) = NULL,  -- 필요 학력
    @RequiredSkills NVARCHAR(1000) = NULL,   -- 필요 기술
    @JobDescription NVARCHAR(2000) = NULL,   -- 직무 설명
    @Responsibilities NVARCHAR(2000) = NULL, -- 책임사항
    @ReportingTo INT = NULL,              -- 보고 대상 직책 ID
    @MaxHeadcount INT = NULL,             -- 최대 인원
    @UpdatedBy INT = NULL,                -- 수정자 ID
    @ResultCode INT OUTPUT,               -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT         -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Count INT = 0;
    DECLARE @CurrentDeptId INT = 0;

    BEGIN TRY
        -- 1. 직책 존재 여부 확인
        SELECT @Count = COUNT(*)
        FROM uPositionTb
        WHERE PosId = @PosId AND IsActive = 1;

        -- 현재 부서 ID 조회
        SELECT @CurrentDeptId = DeptId
        FROM uPositionTb
        WHERE PosId = @PosId AND IsActive = 1;

        IF @Count = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 비활성화된 직책입니다.';
            RETURN;
        END

        -- 2. 부서 변경 시 유효성 확인
        IF @DeptId IS NOT NULL AND @DeptId != @CurrentDeptId
        BEGIN
            SELECT @Count = COUNT(*)
            FROM uDeptTb
            WHERE DeptId = @DeptId AND IsActive = 1;

            IF @Count = 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '존재하지 않거나 비활성화된 부서입니다.';
                RETURN;
            END
        END

        -- 3. 직책 코드 중복 확인 (자신 제외)
        IF @PosCode IS NOT NULL
        BEGIN
            SELECT @Count = COUNT(*)
            FROM uPositionTb
            WHERE DeptId = ISNULL(@DeptId, @CurrentDeptId) 
              AND PosCode = @PosCode 
              AND PosId != @PosId 
              AND IsActive = 1;

            IF @Count > 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '해당 부서에 이미 존재하는 직책 코드입니다.';
                RETURN;
            END
        END

        -- 4. 직책명 중복 확인 (자신 제외)
        IF @PosName IS NOT NULL
        BEGIN
            SELECT @Count = COUNT(*)
            FROM uPositionTb
            WHERE DeptId = ISNULL(@DeptId, @CurrentDeptId) 
              AND PosName = @PosName 
              AND PosId != @PosId 
              AND IsActive = 1;

            IF @Count > 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '해당 부서에 이미 존재하는 직책명입니다.';
                RETURN;
            END
        END

        -- 5. 보고 대상 직책 유효성 확인
        IF @ReportingTo IS NOT NULL AND @ReportingTo != @PosId
        BEGIN
            SELECT @Count = COUNT(*)
            FROM uPositionTb
            WHERE PosId = @ReportingTo AND IsActive = 1;

            IF @Count = 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '존재하지 않는 보고 대상 직책입니다.';
                RETURN;
            END
        END

        -- 6. 직책 정보 업데이트
        UPDATE uPositionTb
        SET 
            DeptId = ISNULL(@DeptId, DeptId),
            PosCode = ISNULL(@PosCode, PosCode),
            PosName = ISNULL(@PosName, PosName),
            PosNameEng = ISNULL(@PosNameEng, PosNameEng),
            PosLevel = ISNULL(@PosLevel, PosLevel),
            PosGrade = ISNULL(@PosGrade, PosGrade),
            JobTitle = ISNULL(@JobTitle, JobTitle),
            JobCategory = ISNULL(@JobCategory, JobCategory),
            MinSalary = ISNULL(@MinSalary, MinSalary),
            MaxSalary = ISNULL(@MaxSalary, MaxSalary),
            BaseSalary = ISNULL(@BaseSalary, BaseSalary),
            AllowanceAmount = ISNULL(@AllowanceAmount, AllowanceAmount),
            IsManagerPosition = ISNULL(@IsManagerPosition, IsManagerPosition),
            RequiredExperience = ISNULL(@RequiredExperience, RequiredExperience),
            RequiredEducation = ISNULL(@RequiredEducation, RequiredEducation),
            RequiredSkills = ISNULL(@RequiredSkills, RequiredSkills),
            JobDescription = ISNULL(@JobDescription, JobDescription),
            Responsibilities = ISNULL(@Responsibilities, Responsibilities),
            ReportingTo = ISNULL(@ReportingTo, ReportingTo),
            MaxHeadcount = ISNULL(@MaxHeadcount, MaxHeadcount),
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE PosId = @PosId;

        -- 7. 수정된 직책 정보 반환
        SELECT 
            PosId,
            DeptId,
            PosCode,
            PosName,
            PosLevel,
            IsManagerPosition,
            UpdatedAt
        FROM uPositionTb 
        WHERE PosId = @PosId;

        SET @ResultCode = 0;
        SET @Message = '직책 정보가 성공적으로 수정되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '직책 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        PRINT '=== SP_UpdatePosition 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'Input PosId: ' + CAST(@PosId AS NVARCHAR(10));
        PRINT '===================================';

    END CATCH
END
GO

-- 5. 직책 삭제 SP (Soft Delete)
IF EXISTS (SELECT * FROM sys.objects WHERE type = 'P' AND name = 'SP_DeletePosition')
    DROP PROCEDURE SP_DeletePosition
GO

CREATE PROCEDURE SP_DeletePosition
    @PosId INT,                   -- 직책 ID (필수)
    @UpdatedBy INT = NULL,        -- 수정자 ID
    @ResultCode INT OUTPUT,       -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Count INT = 0;
    DECLARE @EmployeeCount INT = 0;

    BEGIN TRY
        -- 1. 직책 존재 여부 확인
        SELECT @Count = COUNT(*)
        FROM uPositionTb
        WHERE PosId = @PosId AND IsActive = 1;

        IF @Count = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않거나 이미 삭제된 직책입니다.';
            RETURN;
        END

        -- 2. 해당 직책을 사용하는 직원이 있는지 확인 (만약 직원 테이블이 있다면)
        -- 이 부분은 직원 테이블 구조에 따라 조정 필요
        /*
        SELECT @EmployeeCount = COUNT(*)
        FROM uEmployeeTb
        WHERE PositionId = @PosId AND IsActive = 1;

        IF @EmployeeCount > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '해당 직책을 사용하는 직원이 존재하여 삭제할 수 없습니다.';
            RETURN;
        END
        */

        -- 3. 하위 직책 (보고 받는 직책)이 있는지 확인
        SELECT @Count = COUNT(*)
        FROM uPositionTb
        WHERE ReportingTo = @PosId AND IsActive = 1;

        IF @Count > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '해당 직책에 보고하는 하위 직책이 존재하여 삭제할 수 없습니다.';
            RETURN;
        END

        -- 4. 직책 소프트 삭제 (IsActive = 0)
        UPDATE uPositionTb
        SET 
            IsActive = 0,
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE PosId = @PosId;

        -- 5. 삭제된 직책 정보 반환
        SELECT 
            PosId,
            DeptId,
            PosCode,
            PosName,
            IsActive,
            UpdatedAt
        FROM uPositionTb 
        WHERE PosId = @PosId;

        SET @ResultCode = 0;
        SET @Message = '직책이 성공적으로 삭제되었습니다.';

    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '직책 삭제 중 오류가 발생했습니다: ' + ERROR_MESSAGE();

        PRINT '=== SP_DeletePosition 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT 'Input PosId: ' + CAST(@PosId AS NVARCHAR(10));
        PRINT '==================================';

    END CATCH
END
GO