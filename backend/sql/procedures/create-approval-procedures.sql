/**
 * 전자결재 시스템 Stored Procedure 생성 스크립트
 * @description 결재 문서 생성, 승인, 반려, 위임 등 핵심 결재 프로세스 처리
 * @author SmartHR Team
 * @date 2024-09-14
 */

USE [hr_system];
GO

-- =============================================
-- 1. 결재 문서 생성 SP
-- =============================================
IF OBJECT_ID('SP_CreateApprovalDocument', 'P') IS NOT NULL
    DROP PROCEDURE SP_CreateApprovalDocument;
GO

CREATE PROCEDURE SP_CreateApprovalDocument
    @FormId INT,                    -- 결재 양식 ID
    @Title NVARCHAR(200),           -- 문서 제목
    @Content NTEXT,                 -- 문서 내용 (JSON 형태)
    @RequesterId INT,               -- 신청자 ID
    @ApprovalLineJson NTEXT = NULL, -- 사용자 지정 결재선 (JSON 배열)
    @ResultCode INT OUTPUT,         -- 결과 코드 (0: 성공, -1: 실패)
    @Message NVARCHAR(500) OUTPUT,  -- 결과 메시지
    @DocumentId INT OUTPUT          -- 생성된 문서 ID
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @DocumentNo NVARCHAR(50);
    DECLARE @AutoApprovalLine NVARCHAR(500);
    DECLARE @MaxLevel INT;
    DECLARE @CurrentDate DATETIME = GETDATE();
    DECLARE @YearMonth NVARCHAR(6) = FORMAT(@CurrentDate, 'yyyyMM');
    DECLARE @SeqNumber INT;
    
    BEGIN TRY
        -- 1. 입력값 검증
        IF @FormId IS NULL OR @RequesterId IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '필수 파라미터가 누락되었습니다.';
            RETURN;
        END
        
        -- 2. 결재 양식 정보 조회
        SELECT @AutoApprovalLine = AutoApprovalLine, @MaxLevel = MaxApprovalLevel
        FROM uApprovalFormTb 
        WHERE FormId = @FormId AND IsActive = 1;
        
        IF @AutoApprovalLine IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 결재 양식입니다.';
            RETURN;
        END
        
        -- 3. 문서 번호 자동 생성
        EXEC SP_GenerateDocumentNumber 
            @FormId = @FormId,
            @YearMonth = @YearMonth,
            @DocumentNo = @DocumentNo OUTPUT;
        
        -- 4. 신청자의 부서 정보 조회
        DECLARE @RequesterDeptId INT;
        SELECT @RequesterDeptId = DeptId 
        FROM uEmployeeTb 
        WHERE EmployeeId = @RequesterId AND IsActive = 1;
        
        -- 디버깅 로그
        PRINT '=== SP_CreateApprovalDocument 디버깅 ===';
        PRINT 'RequesterId: ' + CAST(@RequesterId AS NVARCHAR(10));
        PRINT 'RequesterDeptId: ' + ISNULL(CAST(@RequesterDeptId AS NVARCHAR(10)), 'NULL');
        
        IF @RequesterDeptId IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '신청자 정보를 찾을 수 없습니다. (RequesterId: ' + CAST(@RequesterId AS NVARCHAR(10)) + ')';
            RETURN;
        END
        
        -- 5. 결재 문서 생성
        INSERT INTO uApprovalDocumentTb (
            DocumentNo, FormId, Title, Content, RequesterId, RequesterDeptId,
            CurrentStatus, CurrentLevel, TotalLevel,
            CreatedAt
        ) VALUES (
            @DocumentNo, @FormId, @Title, @Content, @RequesterId, @RequesterDeptId,
            'DRAFT', 0, @MaxLevel,
            @CurrentDate
        );
        
        SET @DocumentId = SCOPE_IDENTITY();
        
        -- 5. 결재선 생성 (사용자 지정 우선, 없으면 자동 결재선)
        IF @ApprovalLineJson IS NOT NULL AND @ApprovalLineJson != ''
        BEGIN
            -- 사용자 지정 결재선 처리
            EXEC SP_CreateCustomApprovalLine 
                @DocumentId = @DocumentId,
                @ApprovalLineJson = @ApprovalLineJson,
                @ResultCode = @ResultCode OUTPUT,
                @Message = @Message OUTPUT;
        END
        ELSE
        BEGIN
            -- 자동 결재선 생성
            EXEC SP_CreateAutoApprovalLine 
                @DocumentId = @DocumentId,
                @RequesterId = @RequesterId,
                @AutoApprovalLine = @AutoApprovalLine,
                @ResultCode = @ResultCode OUTPUT,
                @Message = @Message OUTPUT;
        END
        
        -- 결재선 생성 실패 시 롤백
        IF @ResultCode = -1
        BEGIN
            DELETE FROM uApprovalDocumentTb WHERE DocumentId = @DocumentId;
            RETURN;
        END
        
        -- 6. 결재 히스토리 생성 (작성)
        INSERT INTO uApprovalHistoryTb (
            DocumentId, LineId, ActionType, ActionBy,
            ActionDate, Comment, NewStatus
        ) VALUES (
            @DocumentId, NULL, 'DRAFT', @RequesterId,
            @CurrentDate, '결재 문서 작성', 'DRAFT'
        );
        
        SET @ResultCode = 0;
        SET @Message = '결재 문서가 성공적으로 생성되었습니다. (문서번호: ' + @DocumentNo + ')';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '문서 생성 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        -- 에러 로깅
        PRINT '=== SP_CreateApprovalDocument 오류 ===';
        PRINT 'Error: ' + ERROR_MESSAGE();
        PRINT 'FormId: ' + CAST(@FormId AS NVARCHAR);
        PRINT 'RequesterId: ' + CAST(@RequesterId AS NVARCHAR);
    END CATCH
END
GO

-- =============================================
-- 2. 문서 번호 자동 생성 함수
-- =============================================
IF OBJECT_ID('SP_GenerateDocumentNumber', 'P') IS NOT NULL
    DROP PROCEDURE SP_GenerateDocumentNumber;
GO

CREATE PROCEDURE SP_GenerateDocumentNumber
    @FormId INT,
    @YearMonth NVARCHAR(6),
    @DocumentNo NVARCHAR(50) OUTPUT
AS
BEGIN
    DECLARE @FormCode NVARCHAR(20);
    DECLARE @SeqNumber INT;
    DECLARE @SeqString NVARCHAR(4);
    
    -- 양식 코드 조회
    SELECT @FormCode = FormCode FROM uApprovalFormTb WHERE FormId = @FormId;
    
    -- 해당 월의 최대 일련번호 조회
    SELECT @SeqNumber = ISNULL(MAX(CAST(RIGHT(DocumentNo, 4) AS INT)), 0) + 1
    FROM uApprovalDocumentTb d
    INNER JOIN uApprovalFormTb f ON d.FormId = f.FormId
    WHERE f.FormCode = @FormCode 
    AND LEFT(d.DocumentNo, 6) = @YearMonth;
    
    -- 4자리 일련번호 생성 (0001, 0002, ...)
    SET @SeqString = RIGHT('0000' + CAST(@SeqNumber AS NVARCHAR), 4);
    
    -- 문서번호 생성: YYYYMM-FormCode-0001
    SET @DocumentNo = @YearMonth + '-' + @FormCode + '-' + @SeqString;
END
GO

-- =============================================
-- 3. 자동 결재선 생성 SP
-- =============================================
IF OBJECT_ID('SP_CreateAutoApprovalLine', 'P') IS NOT NULL
    DROP PROCEDURE SP_CreateAutoApprovalLine;
GO

CREATE PROCEDURE SP_CreateAutoApprovalLine
    @DocumentId INT,
    @RequesterId INT,
    @AutoApprovalLine NVARCHAR(500),
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ApproverLevel INT = 1;
    DECLARE @ApproverRole NVARCHAR(50);
    DECLARE @ApprovalRoles TABLE (
        Level INT,
        Role NVARCHAR(50)
    );
    
    BEGIN TRY
        -- 결재선 파싱 (DEPT_MANAGER,HR_TEAM,HR_MANAGER)
        DECLARE @RoleIndex INT = 1;
        DECLARE @RoleList NVARCHAR(500) = @AutoApprovalLine + ',';
        
        WHILE CHARINDEX(',', @RoleList) > 0
        BEGIN
            SET @ApproverRole = LTRIM(RTRIM(SUBSTRING(@RoleList, 1, CHARINDEX(',', @RoleList) - 1)));
            
            INSERT INTO @ApprovalRoles (Level, Role) VALUES (@ApproverLevel, @ApproverRole);
            
            SET @RoleList = SUBSTRING(@RoleList, CHARINDEX(',', @RoleList) + 1, LEN(@RoleList));
            SET @ApproverLevel = @ApproverLevel + 1;
        END
        
        -- 각 레벨별 결재자 결정 및 결재선 생성
        DECLARE role_cursor CURSOR FOR
        SELECT Level, Role FROM @ApprovalRoles ORDER BY Level;
        
        OPEN role_cursor;
        FETCH NEXT FROM role_cursor INTO @ApproverLevel, @ApproverRole;
        
        WHILE @@FETCH_STATUS = 0
        BEGIN
            DECLARE @ApproverId INT;
            
            -- 역할별 결재자 결정 로직
            IF @ApproverRole = 'DEPT_MANAGER'
            BEGIN
                -- 신청자의 부서장 찾기
                SELECT TOP 1 @ApproverId = e.EmployeeId
                FROM uEmployeeTb e
                INNER JOIN uEmployeeTb requester ON requester.DeptId = e.DeptId
                INNER JOIN uPositionTb p ON e.PosId = p.PosId
                WHERE requester.EmployeeId = @RequesterId
                AND p.IsManagerPosition = 1
                AND e.EmployeeId != @RequesterId
                ORDER BY p.PosLevel DESC;
            END
            ELSE IF @ApproverRole = 'HR_TEAM'
            BEGIN
                -- HR팀 담당자 찾기
                SELECT TOP 1 @ApproverId = e.EmployeeId
                FROM uEmployeeTb e
                INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
                WHERE d.DeptCode = 'HR'
                AND e.IsActive = 1
                ORDER BY e.EmployeeId;
            END
            ELSE IF @ApproverRole = 'HR_MANAGER'
            BEGIN
                -- HR팀장 찾기
                SELECT TOP 1 @ApproverId = e.EmployeeId
                FROM uEmployeeTb e
                INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
                INNER JOIN uPositionTb p ON e.PosId = p.PosId
                WHERE d.DeptCode = 'HR'
                AND p.IsManagerPosition = 1
                AND e.IsActive = 1
                ORDER BY p.PosLevel DESC;
            END
            
            -- 결재자가 찾아지면 결재선에 추가
            IF @ApproverId IS NOT NULL
            BEGIN
                INSERT INTO uApprovalLineTb (
                    DocumentId, ApproverEmployeeId, ApprovalLevel, ApprovalType,
                    ApprovalStatus, CreatedAt
                ) VALUES (
                    @DocumentId, @ApproverId, @ApproverLevel, 'APPROVE',
                    'PENDING', GETDATE()
                );
                
                SET @ApproverId = NULL; -- 초기화
            END
            
            FETCH NEXT FROM role_cursor INTO @ApproverLevel, @ApproverRole;
        END
        
        CLOSE role_cursor;
        DEALLOCATE role_cursor;
        
        SET @ResultCode = 0;
        SET @Message = '자동 결재선이 생성되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '결재선 생성 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================
-- 4. 결재 처리 SP (승인/반려)
-- =============================================
IF OBJECT_ID('SP_ProcessApproval', 'P') IS NOT NULL
    DROP PROCEDURE SP_ProcessApproval;
GO

CREATE PROCEDURE SP_ProcessApproval
    @DocumentId INT,        -- 문서 ID
    @ApproverId INT,        -- 결재자 ID
    @Action NVARCHAR(20),   -- 액션 (APPROVE, REJECT)
    @Comment NTEXT = NULL,  -- 결재 의견
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @CurrentLevel INT;
    DECLARE @TotalLevel INT;
    DECLARE @CurrentStatus NVARCHAR(20);
    DECLARE @NextLevel INT;
    DECLARE @IsLastApprover BIT = 0;
    
    BEGIN TRY
        -- 1. 문서 정보 조회
        SELECT @CurrentLevel = CurrentLevel, @TotalLevel = TotalLevel, @CurrentStatus = CurrentStatus
        FROM uApprovalDocumentTb 
        WHERE DocumentId = @DocumentId;
        
        -- 2. 문서 존재 여부 확인
        IF @CurrentLevel IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '존재하지 않는 문서입니다.';
            RETURN;
        END
        
        -- 3. 결재 가능 상태 확인
        IF @CurrentStatus NOT IN ('PENDING', 'IN_PROGRESS')
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '결재 처리할 수 없는 문서 상태입니다.';
            RETURN;
        END
        
        -- 4. 결재 권한 확인
        IF NOT EXISTS (
            SELECT 1 FROM uApprovalLineTb 
            WHERE DocumentId = @DocumentId 
            AND ApproverEmployeeId = @ApproverId 
            AND ApprovalLevel = @CurrentLevel + 1
            AND ApprovalStatus = 'PENDING'
        )
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '결재 권한이 없습니다.';
            RETURN;
        END
        
        -- 5. 결재 처리
        SET @NextLevel = @CurrentLevel + 1;
        
        -- 결재선 업데이트
        UPDATE uApprovalLineTb 
        SET ApprovalStatus = @Action,
            ApprovalDate = GETDATE(),
            ApprovalComment = @Comment,
            ActualApproverEmployeeId = @ApproverId
        WHERE DocumentId = @DocumentId 
        AND ApproverEmployeeId = @ApproverId 
        AND ApprovalLevel = @NextLevel;
        
        -- 결재 히스토리 생성
        INSERT INTO uApprovalHistoryTb (
            DocumentId, LineId, ActionType, ActionBy,
            ActionDate, Comment, NewStatus
        ) VALUES (
            @DocumentId, NULL, @Action, @ApproverId,
            GETDATE(), @Comment, @Action
        );
        
        -- 6. 문서 상태 업데이트
        IF @Action = 'REJECT'
        BEGIN
            -- 반려 처리
            UPDATE uApprovalDocumentTb 
            SET CurrentStatus = 'REJECTED',
                ProcessedAt = GETDATE()
            WHERE DocumentId = @DocumentId;
            
            SET @Message = '문서가 반려되었습니다.';
        END
        ELSE IF @Action = 'APPROVE'
        BEGIN
            -- 승인 처리
            IF @NextLevel >= @TotalLevel
            BEGIN
                -- 최종 승인
                UPDATE uApprovalDocumentTb 
                SET CurrentStatus = 'APPROVED',
                    CurrentLevel = @NextLevel,
                    ProcessedAt = GETDATE()
                WHERE DocumentId = @DocumentId;
                
                SET @Message = '문서가 최종 승인되었습니다.';
            END
            ELSE
            BEGIN
                -- 중간 승인
                UPDATE uApprovalDocumentTb 
                SET CurrentStatus = 'IN_PROGRESS',
                    CurrentLevel = @NextLevel
                WHERE DocumentId = @DocumentId;
                
                SET @Message = '문서가 승인되어 다음 결재자에게 전달되었습니다.';
            END
        END
        
        SET @ResultCode = 0;
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '결재 처리 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
        
        PRINT '=== SP_ProcessApproval 오류 ===';
        PRINT 'Error: ' + ERROR_MESSAGE();
        PRINT 'DocumentId: ' + CAST(@DocumentId AS NVARCHAR);
        PRINT 'ApproverId: ' + CAST(@ApproverId AS NVARCHAR);
    END CATCH
END
GO

-- =============================================
-- 5. 결재 문서 조회 SP
-- =============================================
IF OBJECT_ID('SP_GetApprovalDocument', 'P') IS NOT NULL
    DROP PROCEDURE SP_GetApprovalDocument;
GO

CREATE PROCEDURE SP_GetApprovalDocument
    @DocumentId INT,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- 문서 기본 정보 조회
        SELECT 
            d.DocumentId,
            d.DocumentNo,
            d.Title,
            d.Content,
            d.CurrentStatus,
            d.CurrentLevel,
            d.TotalLevel,
            d.CreatedAt,
            d.ProcessedAt,
            
            -- 양식 정보
            f.FormCode,
            f.FormName,
            f.FormNameEng,
            f.CategoryName,
            
            -- 신청자 정보
            e.EmployeeCode AS RequesterCode,
            e.FirstName + ' ' + e.LastName AS RequesterName,
            pos.PosName AS RequesterPosition,
            dept.DeptName AS RequesterDepartment
            
        FROM uApprovalDocumentTb d
        INNER JOIN uApprovalFormTb f ON d.FormId = f.FormId
        INNER JOIN uEmployeeTb e ON d.RequesterId = e.EmployeeId
        INNER JOIN uPositionTb pos ON e.PosId = pos.PosId
        INNER JOIN uDeptTb dept ON e.DeptId = dept.DeptId
        WHERE d.DocumentId = @DocumentId;
        
        -- 결재선 정보 조회
        SELECT 
            al.ApprovalLevel,
            al.ApprovalType,
            al.ApprovalStatus,
            al.ApprovalDate,
            al.ApprovalComment,
            
            -- 결재자 정보
            e.EmployeeCode AS ApproverCode,
            e.FirstName + ' ' + e.LastName AS ApproverName,
            pos.PosName AS ApproverPosition,
            dept.DeptName AS ApproverDepartment
            
        FROM uApprovalLineTb al
        INNER JOIN uEmployeeTb e ON al.ApproverEmployeeId = e.EmployeeId
        INNER JOIN uPositionTb pos ON e.PosId = pos.PosId
        INNER JOIN uDeptTb dept ON e.DeptId = dept.DeptId
        WHERE al.DocumentId = @DocumentId
        ORDER BY al.ApprovalLevel;
        
        -- 결재 히스토리 조회
        SELECT 
            ISNULL(ah.LineId, 0) AS ApprovalLevel,
            ah.ActionType,
            ah.ActionDate,
            ah.Comment,
            
            -- 처리자 정보
            e.EmployeeCode,
            e.FirstName + ' ' + e.LastName AS EmployeeName,
            pos.PosName,
            dept.DeptName
            
        FROM uApprovalHistoryTb ah
        INNER JOIN uEmployeeTb e ON ah.ActionBy = e.EmployeeId
        INNER JOIN uPositionTb pos ON e.PosId = pos.PosId
        INNER JOIN uDeptTb dept ON e.DeptId = dept.DeptId
        WHERE ah.DocumentId = @DocumentId
        ORDER BY ah.ActionDate DESC;
        
        -- 첨부파일 조회
        SELECT 
            AttachmentId,
            OriginalFileName,
            StoredFileName,
            FileSize,
            FileExtension,
            UploadedAt
        FROM uApprovalAttachmentTb
        WHERE DocumentId = @DocumentId
        ORDER BY UploadedAt;
        
        SET @ResultCode = 0;
        SET @Message = '문서 조회가 완료되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '문서 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================
-- 6. 결재 대기 문서 목록 조회 SP
-- =============================================
IF OBJECT_ID('SP_GetPendingApprovalList', 'P') IS NOT NULL
    DROP PROCEDURE SP_GetPendingApprovalList;
GO

CREATE PROCEDURE SP_GetPendingApprovalList
    @ApproverId INT,        -- 결재자 ID
    @PageSize INT = 20,     -- 페이지 크기
    @PageNumber INT = 1,    -- 페이지 번호
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    
    BEGIN TRY
        -- 결재 대기 문서 목록
        SELECT 
            d.DocumentId,
            d.DocumentNo,
            d.Title,
            d.CurrentStatus,
            d.CurrentLevel,
            d.TotalLevel,
            d.CreatedAt,
            
            -- 양식 정보
            f.FormCode,
            f.FormName,
            f.CategoryName,
            
            -- 신청자 정보
            e.EmployeeCode AS RequesterCode,
            e.FirstName + ' ' + e.LastName AS RequesterName,
            pos.PosName AS RequesterPosition,
            dept.DeptName AS RequesterDepartment,
            
            -- 결재선 정보
            al.ApprovalLevel AS MyApprovalLevel,
            al.ApprovalStatus AS MyApprovalStatus
            
        FROM uApprovalDocumentTb d
        INNER JOIN uApprovalFormTb f ON d.FormId = f.FormId
        INNER JOIN uEmployeeTb e ON d.RequesterId = e.EmployeeId
        INNER JOIN uPositionTb pos ON e.PosId = pos.PosId
        INNER JOIN uDeptTb dept ON e.DeptId = dept.DeptId
        INNER JOIN uApprovalLineTb al ON d.DocumentId = al.DocumentId
        WHERE al.ApproverEmployeeId = @ApproverId
        AND al.ApprovalStatus = 'PENDING'
        AND d.CurrentStatus IN ('PENDING', 'IN_PROGRESS')
        AND al.ApprovalLevel = d.CurrentLevel + 1
        ORDER BY d.CreatedAt DESC
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY;
        
        -- 전체 개수
        SELECT COUNT(*) AS TotalCount
        FROM uApprovalDocumentTb d
        INNER JOIN uApprovalLineTb al ON d.DocumentId = al.DocumentId
        WHERE al.ApproverEmployeeId = @ApproverId
        AND al.ApprovalStatus = 'PENDING'
        AND d.CurrentStatus IN ('PENDING', 'IN_PROGRESS')
        AND al.ApprovalLevel = d.CurrentLevel + 1;
        
        SET @ResultCode = 0;
        SET @Message = '결재 대기 목록 조회가 완료되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '목록 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================
-- 7. 내가 신청한 문서 목록 조회 SP
-- =============================================
IF OBJECT_ID('SP_GetMyDocumentList', 'P') IS NOT NULL
    DROP PROCEDURE SP_GetMyDocumentList;
GO

CREATE PROCEDURE SP_GetMyDocumentList
    @RequesterId INT,       -- 신청자 ID
    @Status NVARCHAR(20) = NULL, -- 상태 필터 (선택)
    @PageSize INT = 20,     -- 페이지 크기
    @PageNumber INT = 1,    -- 페이지 번호
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Offset INT = (@PageNumber - 1) * @PageSize;
    DECLARE @WhereClause NVARCHAR(100) = '';
    
    IF @Status IS NOT NULL AND @Status != ''
        SET @WhereClause = ' AND d.CurrentStatus = ''' + @Status + '''';
    
    BEGIN TRY
        -- 내가 신청한 문서 목록
        DECLARE @SQL NVARCHAR(MAX) = '
        SELECT 
            d.DocumentId,
            d.DocumentNo,
            d.Title,
            d.CurrentStatus,
            d.CurrentLevel,
            d.TotalLevel,
            d.CreatedAt,
            d.ProcessedAt,
            
            -- 양식 정보
            f.FormCode,
            f.FormName,
            f.CategoryName,
            
            -- 현재 결재자 정보 (있는 경우)
            CASE 
                WHEN d.CurrentStatus = ''IN_PROGRESS'' THEN 
                    (SELECT e.FirstName + '' '' + e.LastName 
                     FROM uApprovalLineTb al 
                     INNER JOIN uEmployeeTb e ON al.ApproverEmployeeId = e.EmployeeId
                     WHERE al.DocumentId = d.DocumentId 
                     AND al.ApprovalLevel = d.CurrentLevel + 1)
                ELSE NULL
            END AS CurrentApproverName
            
        FROM uApprovalDocumentTb d
        INNER JOIN uApprovalFormTb f ON d.FormId = f.FormId
        WHERE d.RequesterId = @RequesterId' + @WhereClause + '
        ORDER BY d.CreatedAt DESC
        OFFSET @Offset ROWS
        FETCH NEXT @PageSize ROWS ONLY';
        
        EXEC sp_executesql @SQL, 
            N'@RequesterId INT, @Offset INT, @PageSize INT', 
            @RequesterId, @Offset, @PageSize;
        
        -- 전체 개수
        DECLARE @CountSQL NVARCHAR(MAX) = '
        SELECT COUNT(*) AS TotalCount
        FROM uApprovalDocumentTb d
        WHERE d.RequesterId = @RequesterId' + @WhereClause;
        
        EXEC sp_executesql @CountSQL, 
            N'@RequesterId INT', 
            @RequesterId;
        
        SET @ResultCode = 0;
        SET @Message = '문서 목록 조회가 완료되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '목록 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
GO

PRINT '전자결재 시스템 Stored Procedure 생성이 완료되었습니다.';