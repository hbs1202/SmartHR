# API Service 상세 가이드

SmartHR 프론트엔드의 핵심 HTTP 클라이언트 서비스에 대한 완전한 가이드입니다.

## 📋 목차

- [개요](#개요)
- [설치 및 설정](#설치-및-설정)
- [기본 사용법](#기본-사용법)
- [고급 기능](#고급-기능)
- [에러 처리](#에러-처리)
- [보안 고려사항](#보안-고려사항)
- [성능 최적화](#성능-최적화)
- [문제 해결](#문제-해결)

## 📖 개요

`ApiService`는 SmartHR 프론트엔드에서 모든 HTTP 통신을 담당하는 핵심 클래스입니다. Axios 기반으로 구축되어 있으며, 인증, 에러 처리, 타입 안전성을 자동으로 처리합니다.

### 핵심 특징

- ✅ **타입 안전성**: TypeScript와 완전 통합, `unknown` 타입으로 런타임 안전성 확보
- 🔐 **자동 인증**: JWT 토큰 자동 관리 및 갱신
- 🛡️ **에러 처리**: 통합된 에러 처리 및 로깅
- 🌍 **환경 설정**: 개발/운영 환경 자동 구분
- 📊 **로깅**: 개발 환경에서 상세 요청/응답 로깅
- ⚡ **인터셉터**: 요청/응답 자동 처리

## 🚀 설치 및 설정

### 환경 변수 설정

`.env` 파일에 다음 설정을 추가하세요:

```bash
# 개발 환경 (.env.development)
VITE_API_URL=http://localhost:5000

# 운영 환경 (.env.production)
VITE_API_URL=https://api.smarthr.com
```

### 기본 설정

```typescript
// 싱글톤 인스턴스로 자동 초기화됨
import apiService from './services/api';

// 설정 확인
console.log('API URL:', apiService.baseURL);
```

## 💻 기본 사용법

### GET 요청

```typescript
import apiService from '../services/api';
import type { User, Company } from '../types/api';

// 기본 GET 요청
const response = await apiService.get('/users');
console.log(response.data); // unknown 타입

// 타입 지정
const users = await apiService.get<User[]>('/users');
console.log(users.data); // User[] 타입

// 쿼리 파라미터
const companies = await apiService.get<Company[]>('/companies', {
  params: {
    page: 1,
    limit: 10,
    isActive: true
  }
});
```

### POST 요청

```typescript
// 기본 POST
const loginResponse = await apiService.post('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

// 타입 지정
interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

const login = await apiService.post<LoginResponse>('/auth/login', {
  email: 'user@example.com',
  password: 'password123'
});

// 회사 등록
const newCompany = await apiService.post<Company>('/companies', {
  companyCode: 'COMP001',
  companyName: '테스트 회사',
  businessNumber: '123-45-67890'
});
```

### PUT 요청

```typescript
// 회사 정보 수정
const updatedCompany = await apiService.put<Company>(`/companies/${companyId}`, {
  companyName: '수정된 회사명',
  phoneNumber: '02-1234-5678'
});
```

### DELETE 요청

```typescript
// 회사 삭제 (소프트 삭제)
const deleteResult = await apiService.delete(`/companies/${companyId}`);
console.log('삭제 완료:', deleteResult.success);
```

## 🔧 고급 기능

### 파일 업로드

```typescript
// FormData를 사용한 파일 업로드
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', 'profile');

  const result = await apiService.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (progressEvent) => {
      const percent = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`업로드 진행률: ${percent}%`);
    }
  });

  return result;
};
```

### 커스텀 헤더

```typescript
// 특별한 헤더가 필요한 경우
const response = await apiService.get('/special-endpoint', {
  headers: {
    'X-Custom-Header': 'custom-value',
    'Accept-Language': 'ko-KR'
  }
});
```

### 타임아웃 설정

```typescript
// 개별 요청 타임아웃 설정 (기본: 10초)
const response = await apiService.get('/slow-endpoint', {
  timeout: 30000 // 30초
});
```

### 응답 인터셉터 활용

```typescript
// 응답 데이터 전처리 예시
const getCompaniesWithProcessing = async () => {
  const response = await apiService.get<{companies: Company[]}>('/companies');

  // 데이터 후처리
  const processedCompanies = response.data.companies.map(company => ({
    ...company,
    displayName: `${company.CompanyCode} - ${company.CompanyName}`
  }));

  return processedCompanies;
};
```

## ⚠️ 에러 처리

### 기본 에러 처리

```typescript
try {
  const users = await apiService.get<User[]>('/users');
  console.log('사용자 목록:', users.data);
} catch (error: unknown) {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { message?: string }
      }
    };

    switch (axiosError.response?.status) {
      case 401:
        console.error('인증 오류: 로그인이 필요합니다');
        // 자동 로그아웃 처리됨
        break;
      case 403:
        console.error('권한 오류: 접근 권한이 없습니다');
        break;
      case 404:
        console.error('리소스를 찾을 수 없습니다');
        break;
      case 500:
        console.error('서버 오류가 발생했습니다');
        break;
      default:
        console.error('알 수 없는 오류:', axiosError.response?.data?.message);
    }
  } else {
    console.error('네트워크 오류 또는 요청 실패');
  }
}
```

### 서비스별 에러 처리 패턴

```typescript
// companyService.ts 스타일
export const getCompanies = async (params: CompanyListParams = {}) => {
  try {
    const response = await apiService.get<CompanyListResponse>('/companies', { params });
    return response;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      if (axiosError.response?.data?.message) {
        throw new Error(axiosError.response.data.message);
      }
    }
    throw new Error('회사 목록을 불러오는데 실패했습니다.');
  }
};
```

## 🔒 보안 고려사항

### 토큰 관리

```typescript
// 토큰 수동 설정 (일반적으로 자동 처리됨)
apiService.setTokens('access-token', 'refresh-token');

// 토큰 확인
const accessToken = apiService.getAccessToken();
const refreshToken = apiService.getRefreshToken();

// 인증 상태 확인
const isLoggedIn = apiService.isAuthenticated();

// 토큰 제거 (로그아웃)
apiService.clearTokens();
```

### 자동 토큰 갱신

API 서비스는 401 에러를 감지하면 자동으로 리프레시 토큰을 사용해 새 액세스 토큰을 발급받습니다:

```typescript
// 자동 처리되는 흐름:
// 1. API 요청 → 401 에러 발생
// 2. 리프레시 토큰으로 새 액세스 토큰 요청
// 3. 새 토큰으로 원래 요청 재시도
// 4. 리프레시 실패 시 자동 로그아웃
```

### CSRF 보호

```typescript
// CSRF 토큰이 필요한 경우
const response = await apiService.post('/sensitive-action', data, {
  headers: {
    'X-CSRF-TOKEN': getCsrfToken() // 별도 함수에서 토큰 획득
  }
});
```

## ⚡ 성능 최적화

### 요청 취소

```typescript
// AbortController를 사용한 요청 취소
const controller = new AbortController();

const fetchData = async () => {
  try {
    const response = await apiService.get('/data', {
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('요청이 취소되었습니다');
    } else {
      throw error;
    }
  }
};

// 5초 후 요청 취소
setTimeout(() => controller.abort(), 5000);
```

### 병렬 요청

```typescript
// 여러 요청을 병렬로 실행
const fetchDashboardData = async () => {
  const [users, companies, departments] = await Promise.all([
    apiService.get<User[]>('/users'),
    apiService.get<Company[]>('/companies'),
    apiService.get<Department[]>('/departments')
  ]);

  return {
    users: users.data,
    companies: companies.data,
    departments: departments.data
  };
};
```

### 응답 캐싱

```typescript
// 간단한 캐싱 구현 예시
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5분

const getCachedData = async <T>(url: string): Promise<T> => {
  const cached = cache.get(url);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.data as T;
  }

  const response = await apiService.get<T>(url);
  cache.set(url, { data: response.data, timestamp: now });

  return response.data;
};
```

## 🔧 문제 해결

### 일반적인 문제들

#### 1. CORS 오류

```bash
# 백엔드에서 CORS 설정 필요
Access to fetch at 'http://localhost:5000' from origin 'http://localhost:5173'
has been blocked by CORS policy
```

**해결방법:**
- 백엔드에서 적절한 CORS 헤더 설정
- 개발 시 프록시 설정 사용

#### 2. 토큰 만료

```bash
# 401 Unauthorized 에러
Token expired or invalid
```

**해결방법:**
- 자동 토큰 갱신 로직이 작동하는지 확인
- 리프레시 토큰 유효성 검사
- 필요시 다시 로그인

#### 3. 네트워크 타임아웃

```bash
# 요청 시간 초과
timeout of 10000ms exceeded
```

**해결방법:**
```typescript
// 타임아웃 증가
const response = await apiService.get('/slow-endpoint', {
  timeout: 30000
});
```

#### 4. 타입 오류

```typescript
// 잘못된 사용법
const response = await apiService.get('/users');
response.data.forEach(user => console.log(user.name)); // 오류: unknown 타입

// 올바른 사용법
const response = await apiService.get<User[]>('/users');
response.data?.forEach(user => console.log(user.name)); // 안전한 접근
```

### 디버깅 팁

#### 1. 개발 환경 로깅 활용

```typescript
// 개발 환경에서는 모든 요청/응답이 자동 로깅됨
// 브라우저 콘솔에서 확인 가능:
// 🚀 API 요청: { method: 'GET', url: '/users', timestamp: '...' }
// ✅ API 응답: { status: 200, success: true, timestamp: '...' }
```

#### 2. 네트워크 탭 확인

브라우저 개발자 도구의 Network 탭에서:
- 요청 헤더에 Authorization 토큰 포함 여부
- 응답 상태 코드 및 에러 메시지
- 요청/응답 시간

#### 3. 에러 상세 정보

```typescript
// 상세 에러 정보 출력
try {
  await apiService.get('/endpoint');
} catch (error) {
  console.error('상세 에러 정보:', {
    error,
    message: error?.message,
    response: error?.response,
    config: error?.config
  });
}
```

## 📚 API 응답 형식

### 표준 응답 구조

```typescript
interface ApiResponse<T> {
  success: boolean;    // 성공/실패 여부
  data?: T;           // 실제 데이터 (성공 시)
  message?: string;   // 사용자에게 표시할 메시지
  error?: string;     // 에러 메시지 (실패 시)
}

// 성공 응답 예시
{
  "success": true,
  "data": {
    "CompanyId": 1,
    "CompanyName": "테스트 회사",
    "CompanyCode": "TEST001"
  },
  "message": "회사가 성공적으로 등록되었습니다."
}

// 에러 응답 예시
{
  "success": false,
  "error": "회사 코드가 이미 존재합니다.",
  "message": "동일한 회사 코드로 등록된 회사가 있습니다."
}
```

## 🔗 관련 문서

- [타입 정의 (types/api.ts)](../src/types/api.ts)
- [인증 서비스 (authService.ts)](../src/services/authService.ts)
- [회사 서비스 (companyService.ts)](../src/services/companyService.ts)
- [부서 서비스 (departmentService.ts)](../src/services/departmentService.ts)

---

**API Service Guide v1.4.0**
*SmartHR Frontend Team - 2024년 9월*

마지막 업데이트: 타입 안전성 완전 확보 및 `unknown` 타입 적용