-- =============================================
-- 사업장 관리 관련 Stored Procedures
-- 작성자: SmartHR Team
-- 작성일: 2024-09-12
-- 설명: 사업장 목록 조회, 상세 조회, 수정, 삭제 SP
-- =============================================

-- ===========================================
-- SP_GetSubCompanies: 사업장 목록 조회 (페이지네이션)
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_GetSubCompanies')
    DROP PROCEDURE SP_GetSubCompanies;
GO

CREATE PROCEDURE SP_GetSubCompanies
    @CompanyId INT = NULL,             -- 소속 회사 ID 필터
    @PageNumber INT = 1,               -- 페이지 번호
    @PageSize INT = 20,                -- 페이지 크기
    @IsActive BIT = NULL,              -- 활성 상태 필터
    @SearchKeyword NVARCHAR(100) = NULL,  -- 검색 키워드
    @Offset INT = 0,                   -- 오프셋
    @ResultCode INT OUTPUT,            -- 결과 코드
    @Message NVARCHAR(500) OUTPUT      -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- 파라미터 검증
        IF @PageNumber < 1 SET @PageNumber = 1;
        IF @PageSize < 1 SET @PageSize = 20;
        IF @PageSize > 100 SET @PageSize = 100; -- 최대 100개로 제한
        
        SET @Offset = (@PageNumber - 1) * @PageSize;
        
        -- 총 개수 조회 및 페이지네이션된 데이터 조회
        SELECT 
            sc.SubCompanyId,
            sc.CompanyId,
            c.CompanyName,
            c.CompanyCode,
            sc.SubCompanyCode,
            sc.SubCompanyName,
            sc.SubCompanyType,
            sc.Address,
            sc.PostalCode,
            sc.PhoneNumber,
            sc.FaxNumber,
            sc.ManagerEmployeeId,
            sc.OpenDate,
            sc.IsHeadquarters,
            sc.IsActive,
            sc.CreatedAt,
            sc.UpdatedAt,
            -- 총 개수 추가 (모든 행에 동일한 값)
            COUNT(*) OVER() AS TotalCount
        FROM uSubCompanyTb sc
        INNER JOIN uCompanyTb c ON sc.CompanyId = c.CompanyId
        WHERE 
            (@CompanyId IS NULL OR sc.CompanyId = @CompanyId)
            AND (@IsActive IS NULL OR sc.IsActive = @IsActive)
            AND (
                @SearchKeyword IS NULL 
                OR sc.SubCompanyName LIKE '%' + @SearchKeyword + '%'
                OR sc.SubCompanyCode LIKE '%' + @SearchKeyword + '%'
                OR sc.SubCompanyType LIKE '%' + @SearchKeyword + '%'
                OR c.CompanyName LIKE '%' + @SearchKeyword + '%'
            )
        ORDER BY sc.SubCompanyId DESC
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY;
        
        SET @ResultCode = 0;
        SET @Message = '사업장 목록을 성공적으로 조회했습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 목록 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        -- 에러 로깅
        PRINT '=== SP_GetSubCompanies 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'Error Line: ' + CAST(ERROR_LINE() AS NVARCHAR(10));
        PRINT '================================';
    END CATCH
END
GO

-- ===========================================
-- SP_GetSubCompanyById: 사업장 상세 정보 조회
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_GetSubCompanyById')
    DROP PROCEDURE SP_GetSubCompanyById;
GO

CREATE PROCEDURE SP_GetSubCompanyById
    @SubCompanyId INT,             -- 사업장 ID
    @ResultCode INT OUTPUT,        -- 결과 코드
    @Message NVARCHAR(500) OUTPUT  -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- 파라미터 검증
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END
        
        -- 사업장 정보 조회
        SELECT 
            sc.SubCompanyId,
            sc.CompanyId,
            c.CompanyName,
            c.CompanyCode,
            sc.SubCompanyCode,
            sc.SubCompanyName,
            sc.SubCompanyType,
            sc.Address,
            sc.PostalCode,
            sc.PhoneNumber,
            sc.FaxNumber,
            sc.ManagerEmployeeId,
            sc.OpenDate,
            sc.CloseDate,
            sc.Area,
            sc.FloorCount,
            sc.ParkingSpots,
            sc.Description,
            sc.IsHeadquarters,
            sc.IsActive,
            sc.CreatedAt,
            sc.UpdatedAt,
            sc.CreatedBy,
            sc.UpdatedBy,
            -- 추가 통계 정보
            (SELECT COUNT(*) FROM uDeptTb WHERE SubCompanyId = sc.SubCompanyId AND IsActive = 1) AS ActiveDeptCount,
            (SELECT COUNT(*) FROM uDeptTb WHERE SubCompanyId = sc.SubCompanyId) AS TotalDeptCount
        FROM uSubCompanyTb sc
        INNER JOIN uCompanyTb c ON sc.CompanyId = c.CompanyId
        WHERE sc.SubCompanyId = @SubCompanyId;
        
        -- 존재 여부 확인
        IF @@ROWCOUNT = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '해당 사업장을 찾을 수 없습니다.';
            RETURN;
        END
        
        SET @ResultCode = 0;
        SET @Message = '사업장 정보를 성공적으로 조회했습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 정보 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        -- 에러 로깅
        PRINT '=== SP_GetSubCompanyById 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'SubCompanyId: ' + CAST(@SubCompanyId AS NVARCHAR(10));
        PRINT '================================';
    END CATCH
END
GO

-- ===========================================
-- SP_CreateSubCompany: 사업장 등록
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_CreateSubCompany')
    DROP PROCEDURE SP_CreateSubCompany;
GO

CREATE PROCEDURE SP_CreateSubCompany
    @CompanyId INT,                       -- 소속 회사 ID
    @SubCompanyCode NVARCHAR(50),         -- 사업장 코드
    @SubCompanyName NVARCHAR(100),        -- 사업장명
    @SubCompanyType NVARCHAR(50) = '일반사업장', -- 사업장 유형
    @Address NVARCHAR(500) = NULL,        -- 주소
    @PostalCode NVARCHAR(10) = NULL,      -- 우편번호
    @PhoneNumber NVARCHAR(20) = NULL,     -- 전화번호
    @FaxNumber NVARCHAR(20) = NULL,       -- 팩스번호
    @ManagerEmployeeId INT = NULL,        -- 관리자 직원 ID
    @OpenDate DATE = NULL,                -- 개업일
    @Area DECIMAL(10,2) = NULL,           -- 면적
    @FloorCount INT = NULL,               -- 층수
    @ParkingSpots INT = NULL,             -- 주차 공간
    @Description NVARCHAR(500) = NULL,    -- 설명
    @IsHeadquarters BIT = 0,              -- 본사 여부
    @CreatedBy INT = 1,                   -- 생성자
    @ResultCode INT OUTPUT,               -- 결과 코드
    @Message NVARCHAR(500) OUTPUT         -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ExistingCount INT = 0;
    DECLARE @CompanyCount INT = 0;
    DECLARE @BusinessNumberCount INT = 0;
    
    BEGIN TRY
        -- 1. 파라미터 검증
        IF @CompanyId IS NULL OR @CompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 회사 ID를 입력해주세요.';
            RETURN;
        END
        
        IF @SubCompanyCode IS NULL OR LTRIM(RTRIM(@SubCompanyCode)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '사업장 코드는 필수 입력 항목입니다.';
            RETURN;
        END
        
        IF @SubCompanyName IS NULL OR LTRIM(RTRIM(@SubCompanyName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '사업장명은 필수 입력 항목입니다.';
            RETURN;
        END
        
        -- 2. 회사 존재 여부 및 활성 상태 확인
        SELECT @CompanyCount = COUNT(*)
        FROM uCompanyTb
        WHERE CompanyId = @CompanyId AND IsActive = 1;
        
        IF @CompanyCount = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효하지 않거나 비활성화된 회사입니다.';
            RETURN;
        END
        
        -- 3. 사업장 코드 중복 체크
        SELECT @ExistingCount = COUNT(*)
        FROM uSubCompanyTb
        WHERE SubCompanyCode = @SubCompanyCode;
        
        IF @ExistingCount > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '이미 존재하는 사업장 코드입니다.';
            RETURN;
        END
        
        -- 4. 사업자등록번호 중복 체크 (입력된 경우만)
        IF @BusinessNumber IS NOT NULL AND LTRIM(RTRIM(@BusinessNumber)) != ''
        BEGIN
            SELECT @BusinessNumberCount = COUNT(*)
            FROM uSubCompanyTb
            WHERE BusinessNumber = @BusinessNumber;
            
            IF @BusinessNumberCount > 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '이미 등록된 사업자등록번호입니다.';
                RETURN;
            END
        END
        
        -- 5. 사업장 정보 삽입
        INSERT INTO uSubCompanyTb (
            CompanyId, SubCompanyCode, SubCompanyName, SubCompanyNameEng,
            BusinessNumber, ManagerName, Address, PhoneNumber, Email,
            IsActive, CreatedAt, CreatedBy
        )
        VALUES (
            @CompanyId, @SubCompanyCode, @SubCompanyName, @SubCompanyNameEng,
            @BusinessNumber, @ManagerName, @Address, @PhoneNumber, @Email,
            1, GETDATE(), @CreatedBy
        );
        
        -- 6. 생성된 ID 반환
        DECLARE @NewSubCompanyId INT = SCOPE_IDENTITY();
        
        SELECT @NewSubCompanyId AS SubCompanyId;
        
        -- 7. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '사업장이 성공적으로 등록되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 등록 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        -- 에러 로깅
        PRINT '=== SP_CreateSubCompany 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'CompanyId: ' + CAST(@CompanyId AS NVARCHAR(10));
        PRINT 'SubCompanyCode: ' + ISNULL(@SubCompanyCode, 'NULL');
        PRINT 'SubCompanyName: ' + ISNULL(@SubCompanyName, 'NULL');
        PRINT '================================';
    END CATCH
END
GO

-- ===========================================
-- SP_UpdateSubCompany: 사업장 정보 수정
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_UpdateSubCompany')
    DROP PROCEDURE SP_UpdateSubCompany;
GO

CREATE PROCEDURE SP_UpdateSubCompany
    @SubCompanyId INT,                    -- 사업장 ID
    @CompanyId INT = NULL,                -- 소속 회사 ID (변경 가능)
    @SubCompanyName NVARCHAR(100),        -- 사업장명
    @SubCompanyNameEng NVARCHAR(100) = NULL, -- 영문 사업장명
    @BusinessNumber NVARCHAR(20) = NULL,  -- 사업자등록번호
    @ManagerName NVARCHAR(50) = NULL,     -- 관리자명
    @Address NVARCHAR(500) = NULL,        -- 주소
    @PhoneNumber NVARCHAR(20) = NULL,     -- 전화번호
    @Email NVARCHAR(100) = NULL,          -- 이메일
    @IsActive BIT = NULL,                 -- 활성 상태
    @UpdatedBy INT = 1,                   -- 수정자
    @ResultCode INT OUTPUT,               -- 결과 코드
    @Message NVARCHAR(500) OUTPUT         -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ExistingCount INT = 0;
    DECLARE @CompanyCount INT = 0;
    DECLARE @BusinessNumberCount INT = 0;
    
    BEGIN TRY
        -- 1. 파라미터 검증
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END
        
        IF @SubCompanyName IS NULL OR LTRIM(RTRIM(@SubCompanyName)) = ''
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '사업장명은 필수 입력 항목입니다.';
            RETURN;
        END
        
        -- 2. 사업장 존재 여부 확인
        SELECT @ExistingCount = COUNT(*)
        FROM uSubCompanyTb
        WHERE SubCompanyId = @SubCompanyId;
        
        IF @ExistingCount = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '수정할 사업장을 찾을 수 없습니다.';
            RETURN;
        END
        
        -- 3. 회사 변경이 있는 경우 회사 존재 여부 확인
        IF @CompanyId IS NOT NULL
        BEGIN
            SELECT @CompanyCount = COUNT(*)
            FROM uCompanyTb
            WHERE CompanyId = @CompanyId AND IsActive = 1;
            
            IF @CompanyCount = 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '유효하지 않거나 비활성화된 회사입니다.';
                RETURN;
            END
        END
        
        -- 4. 사업자등록번호 중복 체크 (다른 사업장에서 사용 중인지)
        IF @BusinessNumber IS NOT NULL AND LTRIM(RTRIM(@BusinessNumber)) != ''
        BEGIN
            SELECT @BusinessNumberCount = COUNT(*)
            FROM uSubCompanyTb
            WHERE BusinessNumber = @BusinessNumber 
                AND SubCompanyId != @SubCompanyId;
            
            IF @BusinessNumberCount > 0
            BEGIN
                SET @ResultCode = -1;
                SET @Message = '이미 등록된 사업자등록번호입니다.';
                RETURN;
            END
        END
        
        -- 5. 사업장 정보 수정
        UPDATE uSubCompanyTb
        SET 
            CompanyId = CASE WHEN @CompanyId IS NOT NULL THEN @CompanyId ELSE CompanyId END,
            SubCompanyName = @SubCompanyName,
            SubCompanyNameEng = CASE WHEN @SubCompanyNameEng IS NOT NULL THEN @SubCompanyNameEng ELSE SubCompanyNameEng END,
            BusinessNumber = CASE WHEN @BusinessNumber IS NOT NULL THEN @BusinessNumber ELSE BusinessNumber END,
            ManagerName = CASE WHEN @ManagerName IS NOT NULL THEN @ManagerName ELSE ManagerName END,
            Address = CASE WHEN @Address IS NOT NULL THEN @Address ELSE Address END,
            PhoneNumber = CASE WHEN @PhoneNumber IS NOT NULL THEN @PhoneNumber ELSE PhoneNumber END,
            Email = CASE WHEN @Email IS NOT NULL THEN @Email ELSE Email END,
            IsActive = CASE WHEN @IsActive IS NOT NULL THEN @IsActive ELSE IsActive END,
            UpdatedAt = GETDATE(),
            UpdatedBy = @UpdatedBy
        WHERE SubCompanyId = @SubCompanyId;
        
        -- 6. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '사업장 정보가 성공적으로 수정되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 정보 수정 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        -- 에러 로깅
        PRINT '=== SP_UpdateSubCompany 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'SubCompanyId: ' + CAST(@SubCompanyId AS NVARCHAR(10));
        PRINT '================================';
    END CATCH
END
GO

-- ===========================================
-- SP_DeleteSubCompany: 사업장 삭제 (소프트 삭제)
-- ===========================================
IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_DeleteSubCompany')
    DROP PROCEDURE SP_DeleteSubCompany;
GO

CREATE PROCEDURE SP_DeleteSubCompany
    @SubCompanyId INT,             -- 사업장 ID
    @DeletedBy INT = 1,            -- 삭제자
    @ResultCode INT OUTPUT,        -- 결과 코드
    @Message NVARCHAR(500) OUTPUT  -- 결과 메시지
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ExistingCount INT = 0;
    DECLARE @DeptCount INT = 0;
    DECLARE @ActiveDeptCount INT = 0;
    
    BEGIN TRY
        -- 1. 파라미터 검증
        IF @SubCompanyId IS NULL OR @SubCompanyId <= 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '유효한 사업장 ID를 입력해주세요.';
            RETURN;
        END
        
        -- 2. 사업장 존재 여부 확인
        SELECT @ExistingCount = COUNT(*)
        FROM uSubCompanyTb
        WHERE SubCompanyId = @SubCompanyId;
        
        IF @ExistingCount = 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '삭제할 사업장을 찾을 수 없습니다.';
            RETURN;
        END
        
        -- 3. 하위 부서 존재 여부 확인
        SELECT 
            @DeptCount = COUNT(*),
            @ActiveDeptCount = SUM(CASE WHEN IsActive = 1 THEN 1 ELSE 0 END)
        FROM uDeptTb
        WHERE SubCompanyId = @SubCompanyId;
        
        -- 활성화된 하위 부서가 있으면 삭제 불가
        IF @ActiveDeptCount > 0
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '활성화된 하위 부서가 존재하여 사업장을 삭제할 수 없습니다. 먼저 하위 부서를 삭제해주세요.';
            RETURN;
        END
        
        -- 4. 사업장 소프트 삭제 (IsActive = 0)
        UPDATE uSubCompanyTb
        SET 
            IsActive = 0,
            UpdatedAt = GETDATE(),
            UpdatedBy = @DeletedBy
        WHERE SubCompanyId = @SubCompanyId;
        
        -- 5. 하위 부서도 함께 비활성화 (이미 비활성화된 것들)
        IF @DeptCount > 0
        BEGIN
            UPDATE uDeptTb
            SET 
                IsActive = 0,
                UpdatedAt = GETDATE(),
                UpdatedBy = @DeletedBy
            WHERE SubCompanyId = @SubCompanyId;
        END
        
        -- 6. 성공 처리
        SET @ResultCode = 0;
        SET @Message = '사업장이 성공적으로 삭제되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '사업장 삭제 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        -- 에러 로깅
        PRINT '=== SP_DeleteSubCompany 오류 발생 ===';
        PRINT 'Error Number: ' + CAST(ERROR_NUMBER() AS NVARCHAR(10));
        PRINT 'Error Message: ' + ERROR_MESSAGE();
        PRINT 'SubCompanyId: ' + CAST(@SubCompanyId AS NVARCHAR(10));
        PRINT '================================';
    END CATCH
END
GO

PRINT '사업장 관리 관련 Stored Procedures 생성 완료!';