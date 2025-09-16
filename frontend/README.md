# SmartHR 프론트엔드

## 📋 프로젝트 개요

SmartHR 인사관리 시스템의 프론트엔드 애플리케이션입니다.

### 기술 스택
- **프레임워크**: React 19 + TypeScript
- **빌드 도구**: Vite
- **UI 라이브러리**: Ant Design 5.x
- **상태 관리**: Redux Toolkit
- **라우팅**: React Router v7
- **HTTP 클라이언트**: Axios
- **스타일링**: Ant Design + CSS

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 내용을 추가:
```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=SmartHR
VITE_APP_VERSION=1.0.0
VITE_DEV_MODE=true
```

### 3. 개발 서버 실행
```bash
npm run dev
```

애플리케이션이 `http://localhost:5173`에서 실행됩니다.

### 4. 빌드
```bash
npm run build
```

## 📁 프로젝트 구조

```
src/
├── components/           # 재사용 가능한 컴포넌트
│   ├── Layout/          # 레이아웃 컴포넌트
│   └── ProtectedRoute.tsx
├── pages/               # 페이지 컴포넌트
│   ├── Login.tsx
│   └── Dashboard.tsx
├── services/            # API 서비스
│   ├── api.ts          # HTTP 클라이언트
│   └── authService.ts   # 인증 서비스
├── store/               # Redux 상태 관리
│   ├── index.ts        # 스토어 설정
│   ├── hooks.ts        # 타입 지정된 hooks
│   └── slices/         # Redux slices
├── types/               # TypeScript 타입 정의
│   └── api.ts
├── App.tsx             # 메인 앱 컴포넌트
└── main.tsx            # 진입점
```

## 🔧 주요 기능

### ✅ 완료된 기능
- [x] 프로젝트 초기 설정 (Vite + React + TypeScript)
- [x] Ant Design UI 라이브러리 연동
- [x] Redux Toolkit 상태 관리 설정
- [x] React Router 라우팅 설정
- [x] JWT 기반 인증 시스템
- [x] Axios HTTP 클라이언트 및 인터셉터
- [x] 로그인 페이지
- [x] 보호된 라우트 (ProtectedRoute)
- [x] 메인 레이아웃 (사이드바, 헤더)
- [x] 대시보드 페이지

### 📝 계획된 기능
- [ ] 직원 관리 페이지
- [ ] 조직도 관리 페이지
- [ ] 발령 관리 페이지
- [ ] 휴가 관리 페이지
- [ ] 전자결재 페이지
- [ ] 사용자 설정 페이지

## 🔑 인증 시스템

### JWT 토큰 관리
- 액세스 토큰과 리프레시 토큰 자동 관리
- 토큰 만료 시 자동 갱신
- 로그아웃 시 토큰 정리

### 보호된 라우트
- 인증이 필요한 페이지 자동 보호
- 미인증 시 로그인 페이지로 리다이렉트

## 🎨 UI/UX

### Ant Design 테마
- 한국어 로케일 설정
- 반응형 디자인
- 일관된 디자인 시스템

### 레이아웃
- 접을 수 있는 사이드바
- 사용자 정보 표시 헤더
- 브레드크럼 네비게이션

## 📡 API 연동

### 백엔드 API 엔드포인트
- `POST /api/auth/login` - 로그인
- `POST /api/auth/logout` - 로그아웃
- `POST /api/auth/refresh` - 토큰 갱신
- `GET /api/auth/me` - 사용자 정보 조회

### HTTP 클라이언트 설정
- 자동 토큰 헤더 추가
- 응답/요청 인터셉터
- 에러 처리 및 로깅

## 🛠 개발 도구

### 사용 가능한 스크립트
```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
npm run lint     # ESLint 검사
```

### 개발 환경 설정
- TypeScript 엄격 모드
- ESLint 코드 품질 검사
- Hot Module Replacement (HMR)

## 🌐 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `VITE_API_URL` | 백엔드 API URL | `http://localhost:3000` |
| `VITE_APP_NAME` | 애플리케이션 이름 | `SmartHR` |
| `VITE_APP_VERSION` | 버전 | `1.0.0` |
| `VITE_DEV_MODE` | 개발 모드 플래그 | `true` |

## 🔍 테스트

### 로그인 테스트
1. 개발 서버 실행 후 `http://localhost:5173` 접속
2. 로그인 페이지에서 테스트 계정으로 로그인
3. 대시보드 페이지 확인

### 백엔드 연동 확인
- 백엔드 서버가 `http://localhost:3000`에서 실행 중이어야 함
- CORS 설정이 올바르게 되어 있어야 함

## 📞 지원

프로젝트 관련 문의나 이슈는 SmartHR 개발팀에 문의해주세요.

---

**SmartHR Team** | 2024-09-16