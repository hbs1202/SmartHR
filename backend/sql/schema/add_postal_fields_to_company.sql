-- =============================================
-- 작성자: SmartHR Team
-- 작성일: 2024-09-17
-- 설명: uCompanyTb 테이블에 우편번호 및 상세주소 필드 추가
-- =============================================

USE hr_system;
GO

-- uCompanyTb 테이블에 우편번호 및 상세주소 필드 추가
BEGIN TRANSACTION;

BEGIN TRY
    -- PostalCode 필드 추가 (우편번호)
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'uCompanyTb' AND COLUMN_NAME = 'PostalCode'
    )
    BEGIN
        ALTER TABLE uCompanyTb ADD PostalCode NVARCHAR(10) NULL;
        PRINT 'PostalCode 필드가 추가되었습니다.';
    END
    ELSE
    BEGIN
        PRINT 'PostalCode 필드가 이미 존재합니다.';
    END

    -- AddressDetail 필드 추가 (상세주소)
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'uCompanyTb' AND COLUMN_NAME = 'AddressDetail'
    )
    BEGIN
        ALTER TABLE uCompanyTb ADD AddressDetail NVARCHAR(300) NULL;
        PRINT 'AddressDetail 필드가 추가되었습니다.';
    END
    ELSE
    BEGIN
        PRINT 'AddressDetail 필드가 이미 존재합니다.';
    END

    -- CorporateNumber 필드 추가 (법인번호)
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'uCompanyTb' AND COLUMN_NAME = 'CorporateNumber'
    )
    BEGIN
        ALTER TABLE uCompanyTb ADD CorporateNumber NVARCHAR(20) NULL;
        PRINT 'CorporateNumber 필드가 추가되었습니다.';
    END
    ELSE
    BEGIN
        PRINT 'CorporateNumber 필드가 이미 존재합니다.';
    END

    -- BusinessType 필드 추가 (업태)
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'uCompanyTb' AND COLUMN_NAME = 'BusinessType'
    )
    BEGIN
        ALTER TABLE uCompanyTb ADD BusinessType NVARCHAR(100) NULL;
        PRINT 'BusinessType 필드가 추가되었습니다.';
    END
    ELSE
    BEGIN
        PRINT 'BusinessType 필드가 이미 존재합니다.';
    END

    COMMIT TRANSACTION;
    PRINT '=== 모든 필드 추가 작업이 완료되었습니다. ===';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT '오류 발생: ' + ERROR_MESSAGE();
    THROW;
END CATCH;

-- 추가된 필드 확인
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'uCompanyTb'
    AND COLUMN_NAME IN ('PostalCode', 'AddressDetail', 'CorporateNumber', 'BusinessType')
ORDER BY COLUMN_NAME;

PRINT '=== uCompanyTb 테이블 구조 업데이트 완료 ===';