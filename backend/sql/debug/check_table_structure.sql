-- uSubCompanyTb 테이블 구조 상세 확인
USE hr_system;
GO

-- 1. 테이블 정보
SELECT
    TABLE_NAME,
    TABLE_SCHEMA,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME = 'uSubCompanyTb';

-- 2. 컬럼 정보
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'uSubCompanyTb'
ORDER BY ORDINAL_POSITION;

-- 3. 인덱스 정보
SELECT
    i.name AS IndexName,
    i.type_desc AS IndexType,
    i.is_unique,
    i.is_primary_key,
    i.filter_definition,
    col.name AS ColumnName
FROM sys.indexes i
    INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
    INNER JOIN sys.tables t ON i.object_id = t.object_id
WHERE t.name = 'uSubCompanyTb'
ORDER BY i.name, ic.key_ordinal;

-- 4. Computed Columns 확인
SELECT
    name AS ColumnName,
    definition AS ComputedDefinition,
    is_persisted
FROM sys.computed_columns
WHERE object_id = OBJECT_ID('uSubCompanyTb');

-- 5. Check Constraints 확인
SELECT
    cc.name AS ConstraintName,
    cc.definition AS ConstraintDefinition
FROM sys.check_constraints cc
    INNER JOIN sys.tables t ON cc.parent_object_id = t.object_id
WHERE t.name = 'uSubCompanyTb';

-- 6. 현재 연결의 SET 옵션 확인
SELECT
    'QUOTED_IDENTIFIER' AS OptionName,
    CASE
        WHEN @@OPTIONS & 256 = 256 THEN 'ON'
        ELSE 'OFF'
    END AS CurrentSetting
UNION ALL
SELECT
    'ANSI_NULLS',
    CASE
        WHEN @@OPTIONS & 32 = 32 THEN 'ON'
        ELSE 'OFF'
    END
UNION ALL
SELECT
    'ANSI_PADDING',
    CASE
        WHEN @@OPTIONS & 16 = 16 THEN 'ON'
        ELSE 'OFF'
    END;