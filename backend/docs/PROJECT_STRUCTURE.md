# 프로젝트 구조

SmartHR 백엔드 프로젝트의 폴더 구조와 파일 설명입니다.

## 📁 전체 디렉토리 구조

```
/backend
├── app.js                      # 메인 서버 파일 (Express 애플리케이션)
├── package.json               # Node.js 패키지 설정 파일
├── package-lock.json          # 패키지 버전 잠금 파일
├── .env                       # 환경 변수 파일 (개발용)
├── .env.example              # 환경 변수 템플릿 파일
├── .gitignore                # Git 제외 파일 목록
├── CLAUDE.md                 # Claude Code 개발 가이드 (간소화 버전)
├── PROJECT_STATUS.md         # 프로젝트 진행 현황
│
├── /config                   # 설정 파일 디렉토리
│   └── database.js           # MS SQL Server 연결 설정
│
├── /docs                     # 문서 디렉토리
│   ├── API_GUIDE.md          # API 개발 가이드
│   ├── DATABASE_GUIDE.md     # 데이터베이스 가이드
│   ├── CODING_STANDARDS.md   # 코딩 표준
│   └── PROJECT_STRUCTURE.md  # 프로젝트 구조 (현재 문서)
│
├── /src                      # 소스 코드 디렉토리
│   ├── /controllers          # API 컨트롤러 (계획됨)
│   ├── /services             # 비즈니스 로직 (계획됨)
│   ├── /routes               # 라우터 (계획됨)
│   ├── /middleware           # 미들웨어
│   │   └── auth.js           # JWT 인증 미들웨어
│   ├── /database             # 데이터베이스 관련
│   │   └── dbHelper.js       # DB 헬퍼 함수 (SP 실행, 트랜잭션 등)
│   └── /utils                # 유틸리티 함수
│       ├── jwt.js            # JWT 토큰 생성/검증
│       └── bcrypt.js         # 비밀번호 암호화
│
├── /sql                      # SQL 스크립트 디렉토리
│   ├── /procedures           # Stored Procedures
│   │   └── SP_Organization_Management.sql  # 조직도 관리 SP
│   └── /schema               # 테이블 스키마
│       └── 02_create_organization_tables.sql  # 조직도 테이블 생성
│
└── /tests                    # 테스트 디렉토리
    ├── README.md             # 테스트 가이드
    ├── TEST_RESULTS.md       # 테스트 결과 문서
    ├── test-db-connection.js # DB 연결 테스트
    ├── test-auth-utils.js    # 인증 유틸리티 테스트
    ├── /unit                 # 단위 테스트 (계획됨)
    ├── /integration          # 통합 테스트 (계획됨)
    └── /api                  # API 테스트 (계획됨)
```

## 📄 주요 파일 설명

### 루트 레벨 파일

#### app.js
- **목적**: Express 애플리케이션의 메인 진입점
- **내용**: 
  - 서버 설정 및 미들웨어 구성
  - 라우터 연결
  - 전역 에러 처리
  - Graceful Shutdown 처리
- **중요도**: ⭐⭐⭐⭐⭐

#### package.json
- **목적**: Node.js 프로젝트 설정 및 의존성 관리
- **주요 의존성**:
  - `express`: 웹 프레임워크
  - `mssql`: MS SQL Server 연결
  - `jsonwebtoken`: JWT 토큰 처리
  - `bcryptjs`: 비밀번호 암호화
  - `cors`: CORS 처리
  - `helmet`: 보안 헤더
  - `morgan`: HTTP 요청 로깅

#### .env.example
- **목적**: 환경 변수 템플릿
- **설정 항목**:
  ```
  DB_SERVER=localhost
  DB_DATABASE=hr_system
  DB_USER=sa
  DB_PASSWORD=your_password
  JWT_SECRET=your_jwt_secret
  JWT_EXPIRES_IN=24h
  PORT=3000
  ```

### config/ 디렉토리

#### database.js
- **목적**: MS SQL Server 연결 풀 설정
- **기능**:
  - Connection Pool 초기화
  - 연결 상태 관리
  - 에러 처리 및 재연결
  - Graceful Shutdown 지원

### docs/ 디렉토리

#### API_GUIDE.md
- **목적**: API 개발을 위한 상세 가이드
- **내용**:
  - API 컨트롤러 템플릿
  - 라우팅 구조
  - 에러 처리 가이드
  - 인증 미들웨어
  - 테스트 가이드

#### DATABASE_GUIDE.md
- **목적**: 데이터베이스 연동 가이드
- **내용**:
  - Stored Procedure 템플릿
  - DB 헬퍼 함수
  - 트랜잭션 처리
  - 성능 최적화

#### CODING_STANDARDS.md
- **목적**: 코딩 표준 및 개발 규칙
- **내용**:
  - 네이밍 규칙
  - 코드 구조
  - 주석 규칙
  - 품질 체크리스트

### src/ 디렉토리

#### /middleware
현재 완성된 미들웨어:

**auth.js**
- JWT 토큰 검증
- 권한별 접근 제어
- 본인 데이터 접근 권한 확인

#### /database
**dbHelper.js**
- Stored Procedure 실행
- 트랜잭션 처리
- 에러 처리 및 로깅
- 연결 풀 관리

#### /utils
**jwt.js**
- JWT 토큰 생성
- 토큰 검증
- 토큰 갱신

**bcrypt.js**
- 비밀번호 해싱
- 비밀번호 검증
- Salt 라운드 관리

### sql/ 디렉토리

#### /procedures
**SP_Organization_Management.sql**
- 조직도 관리 관련 SP 모음
- 회사, 사업장, 부서, 직책 관리
- CRUD 작업 및 계층 구조 조회

#### /schema
**02_create_organization_tables.sql**
- Company (회사) 테이블
- WorkSite (사업장) 테이블  
- Department (부서) 테이블
- Position (직책) 테이블
- OrganizationView 뷰

### tests/ 디렉토리

#### 현재 구현된 테스트
- **test-db-connection.js**: 데이터베이스 연결 테스트
- **test-auth-utils.js**: JWT, bcrypt 유틸리티 테스트

#### 계획된 테스트 구조
- **/unit**: 개별 함수/모듈 단위 테스트
- **/integration**: 여러 모듈 간 연동 테스트
- **/api**: API 엔드포인트 E2E 테스트

## 🔄 개발 워크플로

### 1. 새로운 API 개발 시
```
1. sql/schema/ - 테이블 스키마 확인/생성
2. sql/procedures/ - Stored Procedure 작성
3. src/controllers/ - API 컨트롤러 작성
4. src/routes/ - 라우터 연결
5. tests/api/ - API 테스트 작성
6. 문서 업데이트
```

### 2. 데이터베이스 변경 시
```
1. sql/schema/ - 스키마 변경 스크립트 작성
2. sql/procedures/ - 관련 SP 수정
3. src/database/ - 헬퍼 함수 업데이트 (필요시)
4. 테스트 업데이트
5. 마이그레이션 문서 작성
```

### 3. 새로운 미들웨어 추가 시
```
1. src/middleware/ - 미들웨어 작성
2. app.js - 미들웨어 등록
3. 관련 API에 적용
4. 테스트 작성
5. 문서 업데이트
```

## 📦 의존성 관리

### 운영 의존성 (dependencies)
```json
{
  "express": "^4.18.2",           // 웹 프레임워크
  "mssql": "^10.0.1",            // MS SQL Server 드라이버
  "jsonwebtoken": "^9.0.2",      // JWT 토큰 처리
  "bcryptjs": "^2.4.3",          // 비밀번호 암호화
  "cors": "^2.8.5",              // CORS 처리
  "helmet": "^7.0.0",            // 보안 헤더
  "morgan": "^1.10.0",           // HTTP 로깅
  "dotenv": "^16.3.1",           // 환경 변수 로딩
  "express-rate-limit": "^6.10.0", // Rate Limiting
  "express-validator": "^7.0.1"   // 입력값 검증
}
```

### 개발 의존성 (devDependencies)
```json
{
  "nodemon": "^3.0.1",           // 개발 서버 자동 재시작
  "jest": "^29.6.2",             // 테스트 프레임워크
  "supertest": "^6.3.3"          // HTTP 테스트
}
```

## 🚀 서버 실행 방법

### 개발 환경
```bash
# 의존성 설치
npm install

# 환경 설정
cp .env.example .env
# .env 파일 수정

# 개발 모드 실행 (nodemon 사용)
npm run dev
```

### 프로덕션 환경
```bash
# 프로덕션 모드 실행
npm start
```

### 테스트 실행
```bash
# 전체 테스트 실행
npm test

# 특정 테스트 실행
npm run test:db        # DB 연결 테스트
npm run test:auth      # 인증 테스트
```

## 📝 환경 변수

### 필수 환경 변수
- `DB_SERVER`: MS SQL Server 주소
- `DB_DATABASE`: 데이터베이스 이름
- `DB_USER`: 데이터베이스 사용자
- `DB_PASSWORD`: 데이터베이스 비밀번호
- `JWT_SECRET`: JWT 비밀키

### 선택적 환경 변수
- `DB_PORT`: 데이터베이스 포트 (기본: 1433)
- `PORT`: 서버 포트 (기본: 3000)
- `NODE_ENV`: 실행 환경 (development/production)
- `JWT_EXPIRES_IN`: JWT 만료 시간 (기본: 24h)

## 🔒 보안 고려사항

### 파일 보안
- `.env` 파일은 `.gitignore`에 포함되어 Git 추적 제외
- 민감한 정보는 모두 환경 변수로 관리
- 로그 파일에 민감한 정보 노출 방지

### 코드 보안
- SQL Injection 방지 (Stored Procedure 사용)
- JWT 토큰 검증
- 비밀번호 암호화 (bcrypt)
- Rate Limiting 적용

## 📈 향후 확장 계획

### 단기 계획
- API 컨트롤러 구현 (src/controllers/)
- 비즈니스 로직 서비스 구현 (src/services/)
- 라우터 구현 (src/routes/)
- 직원 관리 테이블 및 SP

### 중기 계획
- 근태 관리 기능
- 휴가 관리 기능
- 파일 업로드 기능
- 알림 시스템

### 장기 계획
- 성능 모니터링
- 로그 분석 시스템
- 백업 및 복구
- 고가용성 구성