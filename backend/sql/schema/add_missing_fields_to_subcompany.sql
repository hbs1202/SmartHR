-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2025-01-18
-- 설명: uSubCompanyTb 테이블에 누락된 필드들 추가
-- =============================================

USE hr_system;
GO

-- uSubCompanyTb에 대표자 필드 추가
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uSubCompanyTb') AND name = 'CeoName')
BEGIN
    ALTER TABLE uSubCompanyTb
    ADD CeoName NVARCHAR(100) NULL;

    PRINT '✅ uSubCompanyTb 테이블에 CeoName 필드가 추가되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ CeoName 필드가 이미 존재합니다.';
END
GO

-- uSubCompanyTb에 업종 필드 추가
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uSubCompanyTb') AND name = 'Industry')
BEGIN
    ALTER TABLE uSubCompanyTb
    ADD Industry NVARCHAR(200) NULL;

    PRINT '✅ uSubCompanyTb 테이블에 Industry 필드가 추가되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ Industry 필드가 이미 존재합니다.';
END
GO

-- uSubCompanyTb에 업태 필드 추가
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uSubCompanyTb') AND name = 'BusinessType')
BEGIN
    ALTER TABLE uSubCompanyTb
    ADD BusinessType NVARCHAR(200) NULL;

    PRINT '✅ uSubCompanyTb 테이블에 BusinessType 필드가 추가되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ BusinessType 필드가 이미 존재합니다.';
END
GO

-- uSubCompanyTb에 상세주소 필드 추가
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uSubCompanyTb') AND name = 'AddressDetail')
BEGIN
    ALTER TABLE uSubCompanyTb
    ADD AddressDetail NVARCHAR(500) NULL;

    PRINT '✅ uSubCompanyTb 테이블에 AddressDetail 필드가 추가되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ AddressDetail 필드가 이미 존재합니다.';
END
GO

-- uSubCompanyTb에 이메일 필드 추가
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('uSubCompanyTb') AND name = 'Email')
BEGIN
    ALTER TABLE uSubCompanyTb
    ADD Email NVARCHAR(200) NULL;

    PRINT '✅ uSubCompanyTb 테이블에 Email 필드가 추가되었습니다.';
END
ELSE
BEGIN
    PRINT '⚠️ Email 필드가 이미 존재합니다.';
END
GO

PRINT '==========================================';
PRINT '✅ uSubCompanyTb 누락 필드 추가 완료';
PRINT '==========================================';