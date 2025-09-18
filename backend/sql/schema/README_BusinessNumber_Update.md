# 사업장 BusinessNumber 필드 추가 가이드

## 개요
uSubCompanyTb 테이블에 BusinessNumber(사업자등록번호) 필드를 추가하고, 관련 Stored Procedure를 업데이트합니다.

## 실행 순서

### 1. 데이터베이스 스키마 업데이트
```sql
-- SQL Server Management Studio에서 다음 파일 실행
-- 파일: add_business_number_to_subcompany.sql
```

### 2. Stored Procedures 업데이트
```sql
-- SQL Server Management Studio에서 다음 파일 실행
-- 파일: SP_SubCompanyManagement_v2.sql
```

## 변경 내용

### 1. uSubCompanyTb 테이블
- **추가된 필드**: `BusinessNumber NVARCHAR(20) NULL`
- **추가된 인덱스**: `UK_uSubCompanyTb_BusinessNumber` (유니크 인덱스)

### 2. Stored Procedures 업데이트
- **x_CreateSubCompany**: @BusinessNumber 매개변수 추가
- **x_UpdateSubCompany**: @BusinessNumber 매개변수 추가
- **x_GetSubCompanies**: BusinessNumber 필드 반환 추가
- **x_GetSubCompanyById**: BusinessNumber 필드 반환 추가

### 3. 삭제된 파일들
- `create_workplace_table.sql` (uWorkplaceTb 관련)
- `workplace_procedures.sql` (uWorkplaceTb 관련)

## 실행 후 확인사항

### 1. 테이블 스키마 확인
```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'uSubCompanyTb'
AND COLUMN_NAME = 'BusinessNumber';
```

### 2. 인덱스 확인
```sql
SELECT name, is_unique
FROM sys.indexes
WHERE object_id = OBJECT_ID('uSubCompanyTb')
AND name = 'UK_uSubCompanyTb_BusinessNumber';
```

### 3. Stored Procedure 확인
```sql
-- x_CreateSubCompany 매개변수 확인
EXEC sp_help 'x_CreateSubCompany';

-- x_UpdateSubCompany 매개변수 확인
EXEC sp_help 'x_UpdateSubCompany';
```

## 주의사항
- 기존 데이터에는 BusinessNumber가 NULL로 설정됩니다.
- 새로운 사업장 등록 시 BusinessNumber를 입력할 수 있습니다.
- BusinessNumber는 유니크 값이므로 중복되지 않아야 합니다.

## 롤백 방법 (필요시)
```sql
-- BusinessNumber 필드 제거
ALTER TABLE uSubCompanyTb DROP COLUMN BusinessNumber;

-- 이전 버전 SP 복원 (백업에서)
-- 또는 x_SubCompanyManagement.sql 실행
```