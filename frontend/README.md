# SmartHR 프론트엔드 문서

인사관리 시스템 SmartHR의 프론트엔드 애플리케이션입니다.

## 📋 목차

- [개요](#개요)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [설치 및 실행](#설치-및-실행)
- [주요 컴포넌트](#주요-컴포넌트)
- [서비스 및 유틸리티](#서비스-및-유틸리티)
- [상태 관리](#상태-관리)
- [라우팅](#라우팅)
- [API 연동](#api-연동)
- [스타일링](#스타일링)
- [개발 가이드](#개발-가이드)

## 📖 개요

SmartHR은 현대적인 웹 기술을 사용하여 구축된 인사관리 시스템입니다. React와 TypeScript를 기반으로 하며, Ant Design을 사용하여 일관성 있는 UI/UX를 제공합니다.

### 주요 기능

- 👤 **사용자 인증**: JWT 토큰 기반 로그인/로그아웃
- 📊 **대시보드**: 인사 현황 한눈에 보기
- 👥 **직원 관리**: 직원 정보 조회 및 관리
- 🏢 **조직 관리**: 회사/사업장/부서 등록 및 관리
- 📋 **발령 관리**: 인사발령 처리
- 🏖️ **휴가 관리**: 휴가 신청 및 승인
- ✅ **전자결재**: 결재 프로세스 관리
- 📱 **반응형 웹**: PC와 모바일 모두 지원

## 🛠 기술 스택

### 핵심 기술
- **React 19.1.1**: 사용자 인터페이스 구축
- **TypeScript 5.8.3**: 타입 안전성 확보
- **Vite 7.1.2**: 빠른 개발 서버 및 빌드 도구

### UI/UX 라이브러리
- **Ant Design 5.27.3**: UI 컴포넌트 라이브러리
- **@ant-design/icons 6.0.2**: 아이콘 패키지

### 라우팅 및 상태 관리
- **React Router Dom 7.9.1**: 클라이언트 사이드 라우팅
- **Redux Toolkit 2.9.0**: 상태 관리
- **React Redux 9.2.0**: React-Redux 연동

### HTTP 클라이언트
- **Axios 1.12.2**: API 통신

### 개발 도구
- **ESLint**: 코드 품질 관리
- **TypeScript ESLint**: TypeScript 린팅

## 📁 프로젝트 구조

```
frontend/
├── public/                 # 정적 파일
├── src/
│   ├── components/         # 재사용 가능한 컴포넌트
│   │   ├── Layout/         # 레이아웃 컴포넌트
│   │   │   └── MainLayout.tsx
│   │   └── ProtectedRoute.tsx
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── Login.tsx       # 로그인 페이지
│   │   ├── Dashboard.tsx   # 대시보드 페이지
│   │   ├── CompanyList.tsx # 회사 목록 관리 페이지
│   │   ├── CompanyRegister.tsx # 회사 등록 페이지
│   │   ├── DepartmentList.tsx # 부서 목록 관리 페이지
│   │   └── SubCompanyList.tsx # 사업장 목록 관리 페이지
│   ├── services/           # API 서비스
│   │   ├── api.ts          # Axios 인스턴스 설정
│   │   ├── authService.ts  # 인증 관련 서비스
│   │   ├── companyService.ts # 회사 관리 서비스
│   │   ├── departmentService.ts # 부서 관리 서비스
│   │   └── subCompanyService.ts # 사업장 관리 서비스
│   ├── store/              # Redux 상태 관리
│   │   ├── index.ts        # 스토어 설정
│   │   ├── hooks.ts        # 타입 안전한 훅
│   │   └── slices/         # Redux 슬라이스
│   │       ├── authSlice.ts
│   │       └── uiSlice.ts
│   ├── types/              # TypeScript 타입 정의
│   │   └── api.ts
│   ├── App.tsx             # 메인 앱 컴포넌트
│   ├── main.tsx            # 앱 진입점
│   ├── index.css           # 전역 스타일
│   └── vite-env.d.ts       # Vite 타입 정의
├── package.json            # 프로젝트 설정
├── tsconfig.json           # TypeScript 설정
├── vite.config.ts          # Vite 설정
└── README.md               # 프로젝트 문서
```

## 🚀 설치 및 실행

### 필수 요구사항
- Node.js 18+
- npm 또는 yarn

### 설치
```bash
# 프로젝트 클론 (이미 있는 경우 생략)
cd frontend

# 의존성 설치
npm install
```

### 개발 서버 실행
```bash
# 개발 서버 시작 (포트: 5173)
npm run dev

# 브라우저에서 http://localhost:5173 접속
```

### 빌드
```bash
# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview
```

### 코드 품질 검사
```bash
# ESLint 실행
npm run lint
```

## 🧩 주요 컴포넌트

### CompanyList.tsx
회사 목록 관리를 위한 메인 페이지 컴포넌트입니다.

**주요 기능:**
- 📋 회사 목록 조회 및 표시 (Table 컴포넌트)
- 🔍 검색 및 필터링 (회사명, 활성상태)
- ➕ 회사 등록 모달 시스템 (페이지 이동 → 모달 방식)
- ✏️ 회사 수정 기능 (인라인 편집, 모든 필드 지원)
- 🗑️ 회사 삭제 기능 (확인 모달, 소프트 삭제)
- 📄 페이지네이션 (Card 내부)
- 🎨 다크 테마 적용 (RGB(41, 57, 85))
- 📱 반응형 디자인 지원
- 🧭 브레드크럼 네비게이션
- 🏠 다음 우편번호 검색 API 연동

**폼 필드 (확장):**
- 회사 기본 정보: 회사코드, 회사명, 사업자등록번호
- 회사 상세 정보: 법인번호, 대표자명, 설립일, 업태
- 주소 정보: 우편번호, 주소, 상세주소 (다음 API 연동)
- 연락처 정보: 전화번호, 팩스번호, 이메일

**레이아웃 최적화:**
- 첫 행: 회사코드(md=6) + 회사명(md=9) + 사업자등록번호(md=9)
- 자동 포맷팅: 사업자등록번호(000-00-00000), 법인번호(000000-0000000), 전화번호/팩스(02-0000-0000)

**기술적 특징:**
- TypeScript 완전 타입 안전성 (any 타입 제거)
- useCallback을 통한 성능 최적화
- React Hooks exhaustive-deps 규칙 준수
- ESLint 규칙 완전 준수 (no-explicit-any, no-unused-vars)
- 실시간 폼 유효성 검사 (정규식 기반)

### CompanyRegister.tsx
회사 등록을 위한 폼 컴포넌트입니다.

**주요 기능:**
- 📝 회사 기본정보 입력 (코드, 명칭)
- 🏢 사업자정보 입력 (사업자등록번호, 법인번호)
- 📍 주소정보 입력 + 다음 우편번호 검색 API
- 📞 연락처 정보 입력
- ✅ 실시간 폼 유효성 검사
- 🎨 3열 반응형 레이아웃 (xs=24, sm=8)
- 📱 모바일 최적화

**입력 필드 자동 포맷팅:**
- 사업자등록번호: 000-00-00000
- 법인번호: 000000-0000000
- 전화번호/팩스: 02-0000-0000
- 우편번호: 00000

**유효성 검사:**
- 정규식 기반 실시간 검증
- 서버 응답 오류 처리
- 사용자 친화적 에러 메시지

### DepartmentList.tsx
부서 목록 관리를 위한 메인 페이지 컴포넌트입니다.

**주요 기능:**
- 📋 부서 목록 조회 및 표시 (Table 컴포넌트)
- 🏢 회사/사업장 연계 선택 시스템
- 🔍 검색 및 필터링 (활성상태)
- ➕ 부서 등록 모달 시스템
- ✏️ 부서 수정 기능 (모달 방식)
- 🗑️ 부서 삭제 기능 (확인 모달)
- 📄 페이지네이션 지원
- 🌳 상위부서 계층 관리
- 📱 반응형 디자인 지원

**폼 필드 (5개 핵심 필드):**
- 사업장: 선택된 회사의 사업장 목록에서 선택
- 부서코드: 고유 부서 식별 코드 (중복 검증)
- 부서명: 부서 이름
- 상위부서: 같은 사업장 내 부서에서 선택 (순환 참조 방지)
- 신설일: 부서 설립 일자 (선택 사항)

**기술적 특징:**
- TypeScript 완전 타입 안전성
- API 응답 구조 일관성 확보
- 상위부서 선택 시 자기 자신 제외 로직
- 회사 → 사업장 → 부서 순차 선택 시스템
- 실시간 데이터 새로고침

### App.tsx
애플리케이션의 메인 컴포넌트로 라우팅과 전역 설정을 담당합니다.

**주요 기능:**
- React Router 설정
- Ant Design 한국어 로케일 설정
- 보호된 라우트와 퍼블릭 라우트 구분

### MainLayout.tsx
인증된 사용자를 위한 메인 레이아웃 컴포넌트입니다.

**주요 기능:**
- 반응형 사이드바 네비게이션
- 사용자 정보 및 드롭다운 메뉴
- 조직관리 서브메뉴 (회사등록/사업장등록/부서등록)
- 모바일 지원 (768px 이하 자동 감지)
- 메뉴 접기/펼치기 기능

**메뉴 구조:**
- 📊 대시보드
- 👥 직원 관리
- 🏢 조직 관리
  - 회사 등록
  - 사업장 등록
  - 부서 등록
- 📋 발령 관리
- 🏖️ 휴가 관리
- ✅ 전자결재

### Login.tsx
사용자 인증을 위한 로그인 페이지입니다.

**주요 기능:**
- 이메일/비밀번호 기반 인증
- 폼 유효성 검사
- 에러 메시지 표시
- 반응형 디자인
- 자동 로그인 상태 체크

### Dashboard.tsx
메인 대시보드 페이지로 인사 현황을 요약하여 보여줍니다.

**주요 기능:**
- 직원 수, 부서 수, 이번 달 발령, 다가 오는 휴가 통계
- 최근 활동 테이블
- 빠른 액세스 메뉴
- 시스템 공지사항

### ProtectedRoute.tsx
인증이 필요한 라우트를 보호하는 컴포넌트입니다.

**주요 기능:**
- JWT 토큰 검증
- 미인증 사용자 자동 리다이렉트
- 로딩 상태 관리

## 🔧 서비스 및 유틸리티

### companyService.ts
회사 관리 관련 모든 API 통신을 담당하는 서비스입니다.

**주요 메서드:**
```typescript
// 회사 등록 (확장된 필드 지원)
createCompany(data: CompanyCreateRequest): Promise<ApiResponse<CompanyCreateResponse>>

// 회사 목록 조회 (새 필드 포함)
getCompanies(params?: CompanyListParams): Promise<ApiResponse<CompanyListResponse>>

// 회사 상세 조회
getCompanyById(companyId: number): Promise<ApiResponse<Company>>

// 회사 정보 수정 (모든 필드 지원)
updateCompany(companyId: number, data: Partial<CompanyCreateRequest>): Promise<ApiResponse<Company>>

// 회사 삭제 (소프트 삭제)
deleteCompany(companyId: number): Promise<ApiResponse<{companyId: number; deletedAt: string}>>

// 폼 유효성 검증 (확장된 필드 검증)
validateCompanyForm(data: CompanyCreateRequest): {isValid: boolean; errors: string[]}
```

**확장된 필드 지원:**
- 기본 정보: companyCode, companyName, businessNumber
- 상세 정보: corporateNumber, ceoName, establishDate, industry, businessType
- 주소 정보: postalCode, address, addressDetail (다음 우편번호 API 연동)
- 연락처: phoneNumber, faxNumber, email

### departmentService.ts
부서 관리 관련 모든 API 통신을 담당하는 서비스입니다.

**주요 메서드:**
```typescript
// 부서 목록 조회 (페이징, 필터링 지원)
getDepartments(params?: GetDepartmentsParams): Promise<DepartmentsResponse>

// 부서 상세 조회
getDepartmentById(deptId: number): Promise<Department>

// 부서 등록 (5개 핵심 필드)
createDepartment(data: DepartmentCreateRequest): Promise<Department>

// 부서 수정 (5개 핵심 필드)
updateDepartment(deptId: number, data: DepartmentUpdateRequest): Promise<Department>

// 부서 삭제 (소프트 삭제)
deleteDepartment(deptId: number): Promise<void>

// 특정 사업장의 부서 목록 조회 (상위부서 선택용)
getDepartmentsBySubCompany(subCompanyId: number): Promise<Department[]>
```

**API 응답 구조 최적화:**
- 일관된 응답 처리: `response.data` 직접 사용
- 다른 서비스와 동일한 패턴 적용
- 에러 처리 통일화

**타입 정의:**
```typescript
interface Department {
  deptId: number;              // camelCase (실제 구현)
  subCompanyId: number;
  subCompanyName: string;
  companyId: number;
  companyName: string;
  deptCode: string;
  deptName: string;
  parentDeptId?: number;
  parentDeptName?: string;
  deptLevel: number;
  deptType: string;
  managerEmployeeId?: number;
  viceManagerEmployeeId?: number;
  costCenter?: string;
  budget?: number;
  employeeCount: number;
  phoneNumber?: string;
  extension?: string;
  email?: string;
  location?: string;
  establishDate?: string;
  closeDate?: string;
  purpose?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface DepartmentCreateRequest {
  subCompanyId: number;        // camelCase (요청 구조)
  deptCode: string;
  deptName: string;
  parentDeptId?: number | null;
  establishDate?: string | null;
}
```

**자동 포맷팅 함수:**
```typescript
// 사업자등록번호 포맷팅 (000-00-00000)
formatBusinessNumber(value: string): string

// 법인번호 포맷팅 (000000-0000000)
formatCorporateNumber(value: string): string

// 전화번호/팩스번호 포맷팅 (02-0000-0000)
formatPhoneNumber(value: string): string
```

**유효성 검증 함수:**
```typescript
// 각종 형식 검증
isValidBusinessNumber(businessNumber: string): boolean
isValidCorporateNumber(corporateNumber: string): boolean
isValidEmail(email: string): boolean
isValidPhoneNumber(phoneNumber: string): boolean
isValidPostalCode(postalCode: string): boolean
```

**타입 정의:**
```typescript
interface Company {
  CompanyId: number;           // PascalCase (API 응답 구조)
  CompanyCode: string;
  CompanyName: string;
  BusinessNumber?: string;
  CorporateNumber?: string;
  CeoName?: string;
  EstablishDate?: string;
  Industry?: string;
  BusinessType?: string;
  PostalCode?: string;
  Address?: string;
  AddressDetail?: string;
  PhoneNumber?: string;
  FaxNumber?: string;
  Email?: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
}

interface CompanyCreateRequest {
  companyCode: string;         // camelCase (요청 구조)
  companyName: string;
  businessNumber?: string;
  corporateNumber?: string;
  ceoName?: string;
  establishDate?: string;
  industry?: string;
  businessType?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  phoneNumber?: string;
  faxNumber?: string;
  email?: string;
  isActive?: boolean;
}
```

### authService.ts
사용자 인증 관련 모든 기능을 담당하는 서비스입니다.

**주요 메서드:**
```typescript
// 로그인
login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>>

// 로그아웃
logout(): Promise<void>

// 인증 상태 확인
isAuthenticated(): boolean

// 사용자 정보 조회
getUserInfo(): User | null

// 토큰 관리
getToken(): string | null
setToken(token: string): void
removeToken(): void

// 폼 유효성 검사
validateLoginForm(data: LoginRequest): ValidationResult
```

### api.ts
Axios 인스턴스 설정 및 HTTP 요청을 담당합니다.

**주요 기능:**
- 기본 API URL 설정 (환경변수 기반)
- 요청/응답 인터셉터
- 자동 JWT 토큰 헤더 추가
- 토큰 만료 시 자동 갱신
- 타입 안전성 완전 확보 (`unknown` 타입 사용)
- 에러 처리 및 로깅

**설정:**
```typescript
// 기본 URL (환경변수)
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000'

// 자동 헤더 추가
Authorization: Bearer {token}

// 타임아웃 설정
timeout: 10000ms

// 타입 안전성
async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>
async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>>
async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>>
async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>
```

## 🏪 상태 관리

Redux Toolkit을 사용하여 전역 상태를 관리합니다.

### authSlice.ts
사용자 인증 상태 관리

**상태:**
```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}
```

**액션:**
- `loginStart`: 로그인 시작
- `loginSuccess`: 로그인 성공
- `loginFailure`: 로그인 실패
- `logout`: 로그아웃
- `clearError`: 에러 메시지 클리어

### uiSlice.ts
UI 상태 관리

**상태:**
```typescript
interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  loading: boolean;
}
```

### 타입 안전한 훅
```typescript
// store/hooks.ts
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

## 🗺️ 라우팅

React Router Dom을 사용한 클라이언트 사이드 라우팅

### 라우트 구조
```typescript
// 퍼블릭 라우트
/login                    // 로그인 페이지

// 보호된 라우트 (인증 필요)
/dashboard                // 대시보드
/employees                // 직원 관리
/employees/:id            // 직원 상세
/organization             // 조직 관리
/organization/company     // 회사 등록
/organization/workplace   // 사업장 등록
/organization/department  // 부서 등록
/assignments              // 발령 관리
/assignments/:id          // 발령 상세
/vacation                 // 휴가 관리
/approval                 // 전자결재
/approval/:id             // 결재 상세
/profile                  // 내 정보
/settings                 // 설정
```

### 보호된 라우트
모든 보호된 라우트는 `ProtectedRoute` 컴포넌트로 래핑되어 인증 검사를 수행합니다.

## 🌐 API 연동

### 회사 관리 API
```typescript
POST   /api/organization/companies     // 회사 등록
GET    /api/organization/companies     // 회사 목록 조회 (페이징, 필터)
GET    /api/organization/companies/:id // 회사 상세 조회
PUT    /api/organization/companies/:id // 회사 정보 수정
DELETE /api/organization/companies/:id // 회사 삭제 (소프트 삭제)
```

### 부서 관리 API
```typescript
POST   /api/organization/departments     // 부서 등록
GET    /api/organization/departments     // 부서 목록 조회 (페이징, 필터)
GET    /api/organization/departments/:id // 부서 상세 조회
PUT    /api/organization/departments/:id // 부서 정보 수정
DELETE /api/organization/departments/:id // 부서 삭제 (소프트 삭제)

// 요청 파라미터 예시
GET /api/organization/departments?companyId=1&subCompanyId=1&page=1&limit=10&isActive=true

// 부서 등록 요청 Body 예시
{
  "subCompanyId": 1,
  "deptCode": "DEPT001",
  "deptName": "개발팀",
  "parentDeptId": null,
  "establishDate": "2024-01-01"
}
```

### 다음 우편번호 API 연동
```typescript
declare global {
  interface Window {
    daum: {
      Postcode: new (options: {
        oncomplete: (data: {
          address: string;
          zonecode: string;
          addressType: string;
          bname: string;
          buildingName: string;
        }) => void;
        onclose?: () => void;
        theme?: object;
      }) => {
        open: () => void;
      };
    };
  }
}

// 사용 예시
const openAddressSearch = () => {
  new window.daum.Postcode({
    oncomplete: (data) => {
      form.setFieldsValue({
        postalCode: data.zonecode,
        address: data.address,
      });
    }
  }).open();
};
```

### 인증 API
```typescript
POST /api/auth/login      // 로그인
POST /api/auth/logout     // 로그아웃
GET  /api/auth/me         // 현재 사용자 정보
```

### 에러 처리
- HTTP 상태 코드 기반 에러 분류
- 사용자 친화적 에러 메시지 표시
- 401 에러 시 자동 로그아웃
- 네트워크 에러 처리

### 응답 형식
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
```

## 🎨 스타일링

### Ant Design 테마
- 한국어 로케일 적용
- 일관된 디자인 시스템
- 반응형 그리드 시스템

### 전역 스타일 (index.css)
```css
/* 박스 사이징 설정 */
* { box-sizing: border-box; }

/* 폰트 설정 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', ...

/* 반응형 기본 설정 */
@media (max-width: 768px) {
  html, body { font-size: 12px; }
}

/* 커스텀 스크롤바 */
::-webkit-scrollbar { width: 6px; }
```

### 반응형 브레이크포인트
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🛠 개발 가이드

### 코딩 컨벤션
- **TypeScript**: 모든 컴포넌트와 함수에 타입 정의, `any` 타입 사용 완전 금지
- **타입 안전성**: `unknown` 타입 사용으로 런타임 안전성 확보
- **ESLint**: 코드 품질 검사 필수, React Hooks exhaustive-deps 규칙 준수
- **컴포넌트**: 함수형 컴포넌트 사용, useCallback을 통한 성능 최적화
- **Hooks**: React Hooks 패턴 준수, 의존성 배열 정확히 관리
- **API 응답**: PascalCase (API) vs camelCase (프론트엔드) 구분하여 타입 정의
- **에러 처리**: `unknown` 타입으로 안전한 에러 핸들링, 적절한 타입 가드 사용
- **Import/Export**: 사용하지 않는 import 제거, 깔끔한 의존성 관리

### 파일 명명 규칙
- **컴포넌트**: PascalCase (예: `MainLayout.tsx`)
- **서비스/유틸**: camelCase (예: `authService.ts`)
- **타입**: PascalCase (예: `ApiResponse`)

### 컴포넌트 구조
```typescript
/**
 * 컴포넌트 설명
 * @description 상세 설명
 * @author 작성자
 * @date 작성일
 */

import React from 'react';
// imports...

interface Props {
  // props 타입 정의
}

const ComponentName: React.FC<Props> = ({ props }) => {
  // 상태 관리
  // 이벤트 핸들러
  // 렌더링

  return (
    // JSX
  );
};

export default ComponentName;
```

### 상태 관리 패턴
- **로컬 상태**: `useState` 훅 사용
- **전역 상태**: Redux Toolkit 사용
- **서버 상태**: React Query 도입 고려

### 성능 최적화
- **코드 분할**: React.lazy() 사용
- **메모이제이션**: React.memo, useMemo, useCallback 활용
- **번들 최적화**: Vite의 트리 쉐이킹 활용

### 환경 변수
```bash
# .env.development
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=SmartHR Development

# .env.production
VITE_API_URL=https://api.smarthr.com
VITE_APP_TITLE=SmartHR
```

## 📝 향후 개발 계획

### 1단계 (완료)
- ✅ 기본 인증 시스템
- ✅ 메인 레이아웃 및 네비게이션
- ✅ 대시보드 기본 구조
- ✅ 반응형 디자인

### 2단계 (완료)
- ✅ 회사 관리 시스템 (CompanyList.tsx, CompanyRegister.tsx)
- ✅ 회사 등록 모달 시스템
- ✅ 다음 우편번호 검색 API 연동
- ✅ TypeScript 타입 안전성 완전 확보
- ✅ 다크 테마 적용 (RGB(41, 57, 85))
- ✅ 반응형 레이아웃 (3열 구성)
- ✅ ESLint 규칙 준수 (React Hooks, TypeScript)

### 2.5단계 (완료)
- ✅ 부서 관리 시스템 (DepartmentList.tsx, departmentService.ts)
- ✅ 부서 CRUD 기능 (등록, 수정, 삭제, 조회)
- ✅ 회사/사업장 연계 조회 시스템
- ✅ 상위부서 계층 관리
- ✅ API 응답 구조 일관성 확보

### 2.6단계 (진행 중)
- 🔄 직원 관리 기능 구현
- 🔄 상세 권한 관리

### 3단계 (예정)
- 📋 발령 관리 시스템
- 🏖️ 휴가 관리 시스템
- ✅ 전자결재 워크플로우

### 4단계 (예정)
- 📊 고급 분석 및 리포팅
- 🔔 실시간 알림 시스템
- 📱 모바일 앱 개발

## ✅ 품질 보증

### TypeScript 타입 안전성
- 회사 관리 모듈: 100% 타입 안전성 확보
- `any` 타입 완전 제거
- API 응답 구조와 일치하는 인터페이스 정의

### ESLint 규칙 준수
- React Hooks exhaustive-deps: ✅ 준수
- TypeScript no-explicit-any: ✅ 준수
- TypeScript no-unused-vars: ✅ 준수

### 성능 최적화
- useCallback 활용으로 불필요한 리렌더링 방지
- 모달 시스템으로 페이지 이동 없는 UX 제공
- 반응형 디자인으로 모든 디바이스 지원

## 🐛 알려진 이슈

### 해결된 이슈
- ✅ 회사 등록 성공 시 실패 메시지 표시 문제
- ✅ TypeScript `any` 타입 사용으로 인한 타입 안전성 문제 (전면 해결)
- ✅ React Hooks exhaustive-deps 경고
- ✅ 불필요한 import로 인한 ESLint 경고 (authService.ts RefreshTokenRequest 제거)
- ✅ Department 인터페이스 타입 불일치 문제 (PascalCase → camelCase 통일)
- ✅ DepartmentFormData establishDate 타입 불일치 (string → dayjs.Dayjs)
- ✅ api.ts 타입 안전성 강화 (`any` → `unknown` 전환)
- ✅ 모든 서비스 파일 에러 처리 통일 (`error: any` → `error: unknown`)
- ✅ 불필요한 try/catch 래퍼 제거 (departmentService.ts)

### 현재 이슈
현재 프론트엔드에서 알려진 주요 이슈는 없습니다. 모든 TypeScript 오류와 ESLint 경고가 해결되었습니다.

## 📞 지원 및 문의

개발 관련 문의사항이 있으시면 개발팀에 연락해 주세요.

---

**SmartHR Frontend v1.4.0** - 타입 안전성 완전 확보 및 코드 품질 개선
*Built with ❤️ by SmartHR Team*

### 최근 업데이트 (v1.4.0) - 2024년 9월
- ✅ **타입 안전성 완전 확보**: `any` 타입 전면 제거, `unknown` 타입으로 안전성 강화
- ✅ **API 서비스 개선**: api.ts 타입 제네릭 기본값 `unknown`으로 변경
- ✅ **에러 처리 통일화**: 모든 서비스 파일에서 `error: unknown` 사용, 적절한 타입 가드 적용
- ✅ **ESLint 경고 완전 제거**: 불필요한 import, 미사용 변수, 타입 관련 경고 해결
- ✅ **부서 관리 타입 정확성**: Department 인터페이스 실제 구현과 일치하도록 수정
- ✅ **DepartmentFormData 타입 개선**: establishDate dayjs.Dayjs 타입으로 정확성 확보
- ✅ **불필요한 코드 제거**: 중복 try/catch 래퍼, 미사용 import 정리
- ✅ **문서 업데이트**: README.md 최신 변경사항 반영 완료

### 이전 업데이트 (v1.3.0)
- ✅ 부서 관리 시스템 완전 구현 (DepartmentList.tsx)
- ✅ 부서 CRUD 기능 완전 개발 (등록, 수정, 삭제, 조회)
- ✅ 회사/사업장 연계 조회 시스템 구축
- ✅ 상위부서 계층 관리 및 순환 참조 방지
- ✅ departmentService.ts API 응답 구조 일관성 확보
- ✅ 5개 핵심 필드 집중 관리 (사업장, 부서코드, 부서명, 상위부서, 신설일)
- ✅ 모달 기반 등록/수정 시스템 구현
- ✅ 실시간 데이터 동기화 및 자동 새로고침