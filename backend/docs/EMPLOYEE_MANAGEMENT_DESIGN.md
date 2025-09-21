# 🎯 직원관리 시스템 설계서

> **작성일**: 2025-01-19
> **작성자**: SmartHR Team
> **상태**: 설계 완료, 개발 준비 완료
> **다음 단계**: Stored Procedure 개발부터 시작

---

## 📋 1. 시스템 개요

### 주요 기능
- **직원 정보 관리**: 등록, 수정, 조회, 삭제
- **발령 관리**: 부서이동, 직책변경, 승진/강등
- **권한 관리**: 역할별 접근 제어
- **이력 관리**: 변경 이력 추적
- **검색 & 필터링**: 다양한 조건으로 검색

### 권한별 기능
- **Admin**: 모든 직원 관리, 발령 승인, 시스템 설정
- **Manager**: 본인 부서 직원 조회/관리, 발령 신청
- **Employee**: 본인 정보 조회/수정

---

## 🗂️ 2. 데이터베이스 설계

### 기존 테이블 활용
```sql
-- 이미 구축된 테이블들
uEmployeeTb          -- 직원 기본 정보 (✅ 생성 완료)
uEmployeeAssignmentTb -- 발령 이력 (✅ 생성 완료)
uCompanyTb          -- 회사 정보 (✅ 생성 완료)
uSubCompanyTb       -- 사업장 정보 (✅ 생성 완료)
uDeptTb             -- 부서 정보 (✅ 생성 완료)
uPositionTb         -- 직책 정보 (✅ 생성 완료)
uEmployeeDetailView -- 직원 상세 뷰 (✅ 생성 완료)
```

### 주요 필드 구조
```sql
-- uEmployeeTb 주요 필드
EmployeeId, CompanyId, SubCompanyId, DeptId, PosId
EmployeeCode, Password, Email
FirstName, LastName, FullName (계산컬럼)
Gender, BirthDate, PhoneNumber
HireDate, RetireDate, EmploymentType
CurrentSalary, UserRole
IsActive, CreatedAt, UpdatedAt
```

---

## 🔧 3. API 설계

### 엔드포인트 구조
```
/api/employees
├── GET    /                    # 직원 목록 조회 (페이징, 필터, 검색)
├── GET    /:id                 # 특정 직원 상세 조회
├── POST   /                    # 직원 신규 등록
├── PUT    /:id                 # 직원 정보 수정
├── DELETE /:id                 # 직원 삭제 (비활성화)
├── GET    /:id/assignments     # 발령 이력 조회
├── POST   /:id/assignments     # 발령 신청/처리
├── GET    /search              # 직원 검색
├── GET    /stats               # 직원 통계
└── POST   /bulk-import         # 대량 등록 (Excel/CSV)
```

### 표준 응답 포맷
```javascript
{
  "success": boolean,
  "data": any,
  "message": string
}
```

### 주요 API 응답 예시
```javascript
// GET /api/employees (목록 조회)
{
  "success": true,
  "data": {
    "employees": [
      {
        "employeeId": 1,
        "employeeCode": "EMP001",
        "fullName": "홍길동",
        "email": "hong@company.com",
        "phoneNumber": "010-1234-5678",
        "hireDate": "2023-01-15",
        "employmentType": "정규직",
        "organization": {
          "companyName": "스마트HR",
          "subCompanyName": "본사",
          "deptName": "개발팀",
          "posName": "선임연구원"
        },
        "isActive": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 10,
      "totalCount": 95,
      "pageSize": 10
    }
  },
  "message": "직원 목록을 성공적으로 조회했습니다."
}

// GET /api/employees/:id (상세 조회)
{
  "success": true,
  "data": {
    "employee": {
      "employeeId": 1,
      "employeeCode": "EMP001",
      "email": "hong@company.com",
      "fullName": "홍길동",
      "firstName": "길동",
      "lastName": "홍",
      "nameEng": "Hong Gil Dong",
      "gender": "M",
      "birthDate": "1990-05-15",
      "phoneNumber": "010-1234-5678",
      "homeAddress": "서울시 강남구...",
      "hireDate": "2023-01-15",
      "employmentType": "정규직",
      "currentSalary": 5000000,
      "organization": {
        "companyName": "스마트HR",
        "subCompanyName": "본사",
        "deptName": "개발팀",
        "posName": "선임연구원"
      },
      "userRole": "employee",
      "isActive": true
    }
  },
  "message": "직원 정보를 성공적으로 조회했습니다."
}
```

---

## 🎨 4. 프론트엔드 설계

### 페이지 구조
```
/employees
├── /list              # 직원 목록 (메인)
├── /detail/:id        # 직원 상세 정보
├── /register          # 직원 등록
├── /edit/:id          # 직원 정보 수정
├── /assignments       # 발령 관리
└── /bulk-import       # 대량 등록
```

### 주요 컴포넌트

#### 1. EmployeeList (직원 목록)
```jsx
<EmployeeList>
  <SearchFilter />     // 검색 & 필터
  <EmployeeTable />    // 직원 테이블 (페이징)
  <BulkActions />      // 대량 작업
  <ExportButton />     // Excel 내보내기
</EmployeeList>
```

#### 2. EmployeeDetail (직원 상세)
```jsx
<EmployeeDetail>
  <PersonalInfo />     // 개인 정보
  <WorkInfo />         // 근무 정보
  <ContactInfo />      // 연락처 정보
  <AssignmentHistory />// 발령 이력
  <ActionButtons />    // 수정/발령 버튼
</EmployeeDetail>
```

#### 3. EmployeeForm (등록/수정)
```jsx
<EmployeeForm>
  <BasicInfoTab />     // 기본 정보
  <ContactTab />       // 연락처 정보
  <WorkTab />          // 근무 정보
  <AdditionalTab />    // 추가 정보
  <SubmitButtons />    // 저장/취소
</EmployeeForm>
```

### UI/UX 특징
- **Ant Design** 컴포넌트 활용
- **반응형 디자인** (모바일 지원)
- **실시간 검색** (debounce 적용)
- **무한 스크롤** 또는 **페이징**
- **Excel 가져오기/내보내기**
- **권한별 UI 제어**

---

## 🔐 5. 보안 및 권한 설계

### 권한 매트릭스
| 기능 | Admin | Manager | Employee |
|------|-------|---------|----------|
| 전체 직원 목록 조회 | ✅ | ❌ | ❌ |
| 본인 부서 직원 조회 | ✅ | ✅ | ❌ |
| 본인 정보 조회 | ✅ | ✅ | ✅ |
| 직원 등록 | ✅ | ❌ | ❌ |
| 직원 정보 수정 | ✅ | 부분 | 본인만 |
| 발령 처리 | ✅ | 신청만 | ❌ |
| 급여 정보 조회 | ✅ | ❌ | 본인만 |

### 데이터 보호
- **개인정보 마스킹**: 주민번호, 계좌번호 등
- **접근 로그**: 민감 정보 접근 기록
- **암호화**: 개인식별정보 DB 암호화
- **세션 관리**: JWT 토큰 만료 처리

---

## 📱 6. 주요 화면 설계

### 6.1 직원 목록 화면
```
┌─────────────────────────────────────────────────┐
│ 🔍 [검색창] [부서선택] [직책선택] [재직상태] [검색] │
├─────────────────────────────────────────────────┤
│ [+ 직원등록] [📊 통계] [📤 내보내기] [📥 가져오기]  │
├─────────────────────────────────────────────────┤
│ □ 사번  │ 이름    │ 부서    │ 직책  │ 입사일  │ 상태 │
│ □ EMP001│ 홍길동  │ 개발팀  │ 과장  │ 23.01.15│ 재직 │
│ □ EMP002│ 김영희  │ 인사팀  │ 대리  │ 22.03.01│ 재직 │
│ ... [페이징: 1 2 3 4 5 >]                      │
└─────────────────────────────────────────────────┘
```

### 6.2 직원 상세 화면
```
┌─────────────────────────────────────────────────┐
│ 👤 홍길동 (EMP001) [수정] [발령] [비활성화]      │
├─────────────────────────────────────────────────┤
│ 📋 기본정보    📞 연락처    💼 근무정보    📈 이력 │
├─────────────────────────────────────────────────┤
│ 이름: 홍길동        │ 휴대폰: 010-1234-5678     │
│ 사번: EMP001        │ 이메일: hong@company.com  │
│ 부서: 개발팀        │ 입사일: 2023-01-15        │
│ 직책: 과장          │ 고용형태: 정규직          │
└─────────────────────────────────────────────────┘
```

### 6.3 직원 등록/수정 화면
```
┌─────────────────────────────────────────────────┐
│ 📝 직원 등록                              [X]   │
├─────────────────────────────────────────────────┤
│ ○ 기본정보 ○ 연락처 ○ 근무정보 ○ 추가정보     │
├─────────────────────────────────────────────────┤
│ 성명*: [홍길동    ]  영문명: [Hong Gil Dong]   │
│ 사번*: [EMP001   ]  이메일*: [hong@company.com]│
│ 부서*: [개발팀 ▼ ]  직책*: [과장 ▼]           │
│ 입사일*: [2023-01-15] 고용형태: [정규직 ▼]     │
│ ... 기타 필드들                               │
├─────────────────────────────────────────────────┤
│                           [취소] [임시저장] [저장]│
└─────────────────────────────────────────────────┘
```

---

## 🔄 7. 개발 진행 계획

### ✅ 완료된 작업
- [x] 시스템 설계 및 요구사항 분석
- [x] 데이터베이스 스키마 (uEmployeeTb, uEmployeeAssignmentTb 등)
- [x] 조직도 시스템 (회사 > 사업장 > 부서 > 사원 구조)

### 📋 다음 진행 단계

#### 1단계: Stored Procedure 개발 (1-2일)
```sql
-- 개발할 SP 목록
x_GetEmployees        -- 직원 목록 조회 (페이징, 필터, 검색)
x_GetEmployeeById     -- 직원 상세 조회
x_CreateEmployee      -- 직원 등록
x_UpdateEmployee      -- 직원 정보 수정
x_DeleteEmployee      -- 직원 삭제 (비활성화)
x_GetEmployeeStats    -- 직원 통계
x_SearchEmployees     -- 직원 검색
```

#### 2단계: 백엔드 API 개발 (2-3일)
```javascript
// 개발할 파일 목록
/src/controllers/employee-controller.js
/src/routes/employee.js
/src/middleware/employee-auth.js (권한 처리)
```

#### 3단계: 프론트엔드 개발 (3-4일)
```javascript
// 개발할 파일 목록
/src/services/employeeService.ts
/src/pages/EmployeeList.tsx
/src/pages/EmployeeDetail.tsx
/src/pages/EmployeeForm.tsx
/src/components/EmployeeTable.tsx
/src/components/EmployeeSearch.tsx
```

#### 4단계: 발령 시스템 통합 (2일)
- 발령 신청/승인 워크플로우
- 조직도 연동

#### 5단계: 권한 및 보안 적용 (1일)
- 권한별 데이터 접근 제어
- 개인정보 마스킹

#### 6단계: 테스트 & 배포 (1일)
- API 테스트
- UI 테스트
- 성능 최적화

---

## 💡 8. 기술적 고려사항

### 성능 최적화
- **페이징**: 대용량 데이터 처리
- **인덱싱**: 검색 성능 향상 (이미 구현됨)
- **캐싱**: 조직도 정보 캐시
- **지연 로딩**: 상세 정보 필요시 로드

### 사용성 개선
- **자동완성**: 검색시 실시간 추천
- **단축키**: 자주 사용하는 기능
- **즐겨찾기**: 자주 조회하는 직원
- **최근 조회**: 최근 본 직원 이력

### 확장성
- **다국어 지원**: i18n 적용 준비
- **API 버전 관리**: v1, v2 등
- **모바일 앱**: API 재사용 가능
- **외부 연동**: 급여, 출퇴근 시스템

---

## 🚀 9. 개발 시작 가이드

### 현재 환경
- **백엔드**: http://localhost:5000 (실행 중)
- **프론트엔드**: http://localhost:5173 (실행 중)
- **데이터베이스**: hr_system DB 연결됨

### 개발 시작 명령어
```bash
# 백엔드 시작
cd "D:\Web\SmartHR\backend" && npm start

# 프론트엔드 시작
cd "D:\Web\SmartHR\frontend" && npm run dev
```

### 다음 세션에서 시작할 작업
1. **우선순위 1**: Stored Procedure 개발 (x_GetEmployees부터)
2. **파일 위치**: `D:\Web\SmartHR\backend\sql\procedures\SP_Employee_Management.sql`
3. **참고 문서**: 이 문서 (`EMPLOYEE_MANAGEMENT_DESIGN.md`)

---

## 📞 개발 중 참고사항

### 기존 패턴 따르기
- **프로젝트 가이드**: `CLAUDE.md` 참조
- **API 가이드**: `docs/API_GUIDE.md` 참조
- **데이터베이스 가이드**: `docs/DATABASE_GUIDE.md` 참조
- **코딩 표준**: `docs/CODING_STANDARDS.md` 참조

### 프로젝트 상태 업데이트
- 작업 완료시 `PROJECT_STATUS.md` 업데이트 필수
- 완료된 작업은 체크박스로 표시
- API 엔드포인트 추가시 목록 업데이트

---

**📄 이 문서는 직원관리 시스템 개발의 완전한 설계 가이드입니다.**
**다음 세션에서 이 문서를 참조하여 Stored Procedure 개발부터 시작하세요.**