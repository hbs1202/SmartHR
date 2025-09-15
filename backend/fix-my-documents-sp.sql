DROP PROCEDURE IF EXISTS SP_GetMyDocumentList;
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
                    (SELECT e.FullName 
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
END;
GO