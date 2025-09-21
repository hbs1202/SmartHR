# 🔧 한글 인코딩 문제 해결 가이드

> **작성일**: 2025-01-19
> **작성자**: SmartHR Team
> **목적**: SQL Server 한글 인코딩 문제 해결 및 예방

---

## 📋 문제 상황

### 발생한 문제
- **증상**: SQL Server에 Stored Procedure 배포 시 한글 문자가 깨져서 표시됨
- **발생 시점**: SP 파일을 데이터베이스에 배포할 때
- **원인**: 파일 인코딩과 Node.js 파일 읽기 인코딩 불일치

### 오류 예시
```
❌ 한글이 깨져서 나타나는 경우:
'직원 목록 조회' → '???? ?? ??'
'성공적으로 처리되었습니다' → '?????? ???????'
```

---

## ✅ 해결 방법

### 1. Node.js에서 UTF-8 인코딩으로 파일 읽기

**핵심 포인트**: `fs.readFileSync()` 함수에 `'utf8'` 옵션 지정

```javascript
// ❌ 잘못된 방법 (인코딩 미지정)
const sqlContent = fs.readFileSync(spFilePath);

// ✅ 올바른 방법 (UTF-8 명시)
const sqlContent = fs.readFileSync(spFilePath, 'utf8');
```

### 2. 완전한 배포 스크립트 예시

```javascript
/**
 * 한글 지원 SP 배포 스크립트
 */
const fs = require('fs');
const path = require('path');
const { executeQuery } = require('./src/database/dbHelper');

async function deployStoredProcedure() {
  try {
    console.log('🚀 SP 배포를 시작합니다...');

    // 1. UTF-8 인코딩으로 파일 읽기 (핵심!)
    const spFilePath = path.join(__dirname, 'sql', 'procedures', 'SP_Employee_Complete.sql');
    const sqlContent = fs.readFileSync(spFilePath, 'utf8');

    console.log('✅ SP 파일을 UTF-8로 읽기 완료');

    // 2. GO 구문으로 배치 분할
    const sqlBatches = sqlContent
      .split(/\r?\nGO\r?\n|\r?\nGO\r?\s*$/)
      .filter(batch => batch.trim().length > 0)
      .map(batch => batch.trim());

    // 3. 각 배치를 순차적으로 실행
    for (let i = 0; i < sqlBatches.length; i++) {
      const batch = sqlBatches[i];
      if (batch.trim().length === 0) continue;

      console.log(`⚡ 배치 ${i + 1}/${sqlBatches.length} 실행 중...`);

      const result = await executeQuery(batch);

      console.log(`✅ 배치 ${i + 1} 완료 (${result.executionTime}ms)`);
    }

    console.log('🎉 모든 SP 배포가 성공적으로 완료되었습니다!');

  } catch (error) {
    console.error('❌ SP 배포 중 오류:', error.message);
  }
}
```

### 3. 데이터베이스 연결 설정 확인

`dbHelper.js`에서 SQL Server 연결 시 UTF-8 지원 확인:

```javascript
// SET 명령으로 인코딩 설정
await request.query('SET QUOTED_IDENTIFIER ON; SET ANSI_NULLS ON; SET ANSI_PADDING ON;');
```

---

## 🔍 문제 진단 방법

### 1. 테이블 구조 확인
```javascript
// 테이블 컬럼 정보 조회로 한글 출력 테스트
const result = await executeQuery(`
  SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_NAME = 'uEmployeeTb'
  ORDER BY ORDINAL_POSITION
`);

// 결과에서 한글이 정상 출력되는지 확인
console.log(result.data);
```

### 2. SP 내 한글 테스트
```sql
-- SP 내에서 한글 리터럴 테스트
SELECT N'직원 목록 조회 테스트' AS TestMessage;
```

---

## 📝 중요 체크리스트

### 파일 작성 시
- [ ] SQL 파일을 UTF-8 인코딩으로 저장
- [ ] BOM(Byte Order Mark) 없이 저장
- [ ] 한글 문자열에 `N'문자열'` 형식 사용

### Node.js 코드 작성 시
- [ ] `fs.readFileSync(파일경로, 'utf8')` 사용
- [ ] SQL 배치를 GO로 적절히 분할
- [ ] 에러 발생 시 디버깅 정보 출력

### 데이터베이스 설정
- [ ] SQL Server 데이터베이스 collation이 한글 지원하는지 확인
- [ ] 테이블 컬럼이 `NVARCHAR` 타입으로 생성되었는지 확인

---

## 🚫 주의사항

### 하지 말아야 할 것들
1. **인코딩 옵션 누락**: `fs.readFileSync(파일)` ← UTF-8 옵션 없음
2. **VARCHAR 사용**: 한글에는 `NVARCHAR` 사용 필수
3. **문자열 앞 N 누락**: `'한글'` → `N'한글'`
4. **BOM 포함 저장**: 일부 에디터에서 BOM 포함하여 저장 시 문제 발생

### 권장사항
1. **VS Code 사용 시**: 우측 하단에서 인코딩을 "UTF-8" 확인
2. **Git 설정**: `git config core.autocrlf false` (줄바꿈 문자 보존)
3. **SQL 파일 검증**: 배포 전 한글 문자가 올바르게 표시되는지 확인

---

## 🎯 성공 확인 방법

### 1. 배포 로그 확인
```
✅ SP 파일을 UTF-8로 읽기 완료
🎉 모든 SP 배포가 성공적으로 완료되었습니다!
```

### 2. 데이터베이스에서 확인
```sql
-- 생성된 SP 목록 확인
SELECT name, create_date, modify_date
FROM sys.objects
WHERE type = 'P' AND name LIKE 'x_%Employee%'
ORDER BY name;

-- SP 실행 테스트
EXEC x_GetEmployees @Page=1, @PageSize=5;
```

### 3. 한글 출력 테스트
- SP 실행 결과에서 한글 메시지가 정상 출력되는지 확인
- 에러 메시지도 한글로 정상 표시되는지 확인

---

## 📞 문제 발생 시 대응

### 여전히 한글이 깨지는 경우
1. **파일 인코딩 재확인**: UTF-8 without BOM으로 저장
2. **데이터베이스 Collation 확인**: Korean_Wansung_CI_AS 등 한글 지원
3. **Node.js 버전 확인**: 최신 LTS 버전 사용 권장

### 디버깅 코드 추가
```javascript
// 파일 내용 미리보기로 한글 확인
console.log('📄 파일 크기:', sqlContent.length, 'characters');
console.log('🔍 첫 200자:', sqlContent.substring(0, 200));
```

---

**✨ 이 가이드를 따르면 SQL Server에서 한글이 정상적으로 처리됩니다!**