# 🚀 다음 세션 시작 가이드

> **작성일**: 2025-01-19
> **상태**: 직원관리 시스템 개발 준비 완료
> **다음 작업**: Stored Procedure 개발부터 시작

---

## ⚡ 빠른 시작

### 1. 서버 실행
```bash
# 백엔드 서버 시작
cd "D:\Web\SmartHR\backend" && npm start

# 프론트엔드 서버 시작
cd "D:\Web\SmartHR\frontend" && npm run dev
```

### 2. 접속 주소
- **프론트엔드**: http://localhost:5173
- **백엔드**: http://localhost:5000

---

## 📋 현재 완료된 작업

### ✅ 조직도 시스템
- **구조 변경**: 회사 > 사업장 > 부서 > **사원** (직책 정보 포함)
- **Stored Procedure**: `sp_organization_chart.sql` 수정 완료
- **프론트엔드**: 사원 노드에 직책 표시 완료

### ✅ 직원관리 시스템 설계
- **설계 문서**: `backend/docs/EMPLOYEE_MANAGEMENT_DESIGN.md` 완성
- **데이터베이스**: 기존 `uEmployeeTb` 테이블 활용 (이미 구축됨)
- **API 설계**: `/api/employees` 엔드포인트 설계 완료
- **UI 설계**: 화면 구조 및 컴포넌트 설계 완료

---

## 🎯 다음 작업 (우선순위순)

### 1단계: Stored Procedure 개발
```sql
-- 개발할 파일: backend/sql/procedures/SP_Employee_Management.sql
x_GetEmployees        -- 직원 목록 조회 (페이징, 필터, 검색)
x_GetEmployeeById     -- 직원 상세 조회
x_CreateEmployee      -- 직원 등록
x_UpdateEmployee      -- 직원 정보 수정
x_DeleteEmployee      -- 직원 삭제 (비활성화)
x_GetEmployeeStats    -- 직원 통계
```

### 2단계: 백엔드 API 개발
```javascript
// 개발할 파일들
/src/controllers/employee-controller.js
/src/routes/employee.js
/src/middleware/employee-auth.js
```

### 3단계: 프론트엔드 개발
```javascript
// 개발할 파일들
/src/services/employeeService.ts
/src/pages/EmployeeList.tsx
/src/pages/EmployeeDetail.tsx
/src/pages/EmployeeForm.tsx
```

---

## 📖 주요 참고 문서

### 필수 문서
1. **설계 문서**: `backend/docs/EMPLOYEE_MANAGEMENT_DESIGN.md`
2. **프로젝트 가이드**: `backend/CLAUDE.md`
3. **진행 현황**: `backend/PROJECT_STATUS.md`

### 개발 가이드
- **API 가이드**: `backend/docs/API_GUIDE.md`
- **데이터베이스 가이드**: `backend/docs/DATABASE_GUIDE.md`
- **코딩 표준**: `backend/docs/CODING_STANDARDS.md`

---

## 🏗️ 프로젝트 구조

### 기존 파일 구조
```
SmartHR/
├── backend/
│   ├── sql/procedures/SP_Employee_Management.sql (개발 필요)
│   ├── src/controllers/employee-controller.js (개발 필요)
│   ├── src/routes/employee.js (개발 필요)
│   └── docs/EMPLOYEE_MANAGEMENT_DESIGN.md (✅ 완성)
└── frontend/
    ├── src/services/employeeService.ts (개발 필요)
    ├── src/pages/EmployeeList.tsx (개발 필요)
    └── src/pages/EmployeeDetail.tsx (개발 필요)
```

---

## 💡 개발 시 주의사항

### 필수 규칙
- ✅ **Stored Procedure만 사용** (직접 SQL 금지)
- ✅ **한국어 주석** 필수
- ✅ **JWT 인증** 적용
- ✅ **권한별 접근 제어** 구현
- ✅ **표준 응답 포맷** 사용: `{success, data, message}`

### 개발 패턴
- 기존 `organization-controller.js` 패턴 참조
- 기존 `departmentService.ts` 패턴 참조
- Ant Design 컴포넌트 활용

---

## 🎬 시작 명령어

```bash
# Claude Code에서 다음과 같이 시작하세요:
"직원관리 시스템 개발을 시작하겠습니다.
EMPLOYEE_MANAGEMENT_DESIGN.md 문서를 확인하고
Stored Procedure부터 개발해주세요."
```

---

**📄 이 가이드를 참조하여 언제든지 개발을 재시작할 수 있습니다!**