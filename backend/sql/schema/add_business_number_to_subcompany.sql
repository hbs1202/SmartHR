-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2025-01-18
-- 설명: uSubCompanyTb 테이블에 BusinessNumber 필드 추가
-- =============================================

USE hr_system;
GO

-- uSubCompanyTb에 BusinessNumber 필드 추가
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uSubCompanyTb') AND name = 'BusinessNumber')
BEGIN
    ALTER TABLE uSubCompanyTb
    ADD BusinessNumber NVARCHAR(20) NULL;

    PRINT '✅ uSubCompanyTb 테이블에 BusinessNumber 필드가 추가되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ BusinessNumber 필드가 이미 존재합니다.';
END
GO

-- BusinessNumber 필드에 인덱스 추가 (사업자등록번호는 유니크해야 함)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UK_uSubCompanyTb_BusinessNumber')
BEGIN
    CREATE UNIQUE INDEX UK_uSubCompanyTb_BusinessNumber
    ON uSubCompanyTb (BusinessNumber)
    WHERE BusinessNumber IS NOT NULL;

    PRINT '✅ BusinessNumber 필드에 유니크 인덱스가 추가되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ BusinessNumber 유니크 인덱스가 이미 존재합니다.';
END
GO

PRINT '==========================================';
PRINT '✅ uSubCompanyTb BusinessNumber 필드 추가 완료';
PRINT '==========================================';