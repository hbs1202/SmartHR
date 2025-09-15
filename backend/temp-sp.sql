DROP PROCEDURE IF EXISTS SP_CreateApprovalDocument;
GO

CREATE PROCEDURE SP_CreateApprovalDocument
    @FormId INT,
    @Title NVARCHAR(200),
    @Content NTEXT,
    @RequesterId INT,
    @ApprovalLineJson NTEXT = NULL,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT,
    @DocumentId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- 신청자의 부서 정보 조회
        DECLARE @RequesterDeptId INT;
        SELECT @RequesterDeptId = DeptId 
        FROM uEmployeeTb 
        WHERE EmployeeId = @RequesterId AND IsActive = 1;
        
        IF @RequesterDeptId IS NULL
        BEGIN
            SET @ResultCode = -1;
            SET @Message = '신청자 정보를 찾을 수 없습니다.';
            RETURN;
        END
        
        -- 문서 생성
        INSERT INTO uApprovalDocumentTb (
            DocumentNo, FormId, Title, Content, RequesterId, RequesterDeptId,
            CurrentStatus, CurrentLevel, TotalLevel, CreatedAt
        ) VALUES (
            'TEMP-' + CAST(NEWID() AS NVARCHAR(36)), @FormId, @Title, @Content, @RequesterId, @RequesterDeptId,
            'DRAFT', 0, 1, GETDATE()
        );
        
        SET @DocumentId = SCOPE_IDENTITY();
        SET @ResultCode = 0;
        SET @Message = '결재 문서가 성공적으로 생성되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '문서 생성 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END;
GO