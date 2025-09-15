# Scripts 폴더

이 폴더에는 SmartHR 프로젝트의 **일회성 초기 설정 스크립트**들이 들어있습니다.

## 📁 스크립트 목록

### 🗄️ 데이터베이스 초기화 스크립트

#### `create-employee-tables.js`
- **목적**: 직원 관리 테이블 및 뷰 생성
- **생성 테이블**: 
  - `uEmployeeTb` (직원 기본 정보)
  - `uEmployeeAssignmentTb` (발령 이력)  
  - `uEmployeeDetailView` (직원 상세 뷰)
- **실행 조건**: 직원 테이블이 존재하지 않을 때
- **실행 방법**: `node scripts/create-employee-tables.js`

#### `create-employee-procedures.js`
- **목적**: 직원 관리 Stored Procedures 생성
- **생성 SP**:
  - `x_CreateEmployee` (직원 등록)
  - `SP_GetEmployees` (직원 목록 조회)
  - 기타 직원 관리용 SP
- **실행 조건**: 직원 관리 SP가 존재하지 않을 때  
- **실행 방법**: `node scripts/create-employee-procedures.js`

### 👥 초기 데이터 생성 스크립트

#### `create-initial-employees.js`
- **목적**: 초기 관리자 계정 및 테스트 직원 데이터 생성
- **생성 계정**:
  - 시스템 관리자: `admin@smarthr.com` / `admin123!`
  - 인사팀 관리자: `hr@smarthr.com` / `admin123!`  
  - 테스트 직원1: `employee1@smarthr.com` / `employee123!`
  - 테스트 직원2: `employee2@smarthr.com` / `employee123!`
- **특징**: bcrypt 비밀번호 해싱 적용
- **실행 조건**: 직원 데이터가 없을 때
- **실행 방법**: `node scripts/create-initial-employees.js`

### 🗄️ 조직도 관리 스크립트

#### `deploy-company-sp.js`
- **목적**: 회사 관리 Stored Procedures 배포
- **실행 방법**: `node scripts/deploy-company-sp.js`

#### `deploy-subcompany-sp.js`
- **목적**: 사업장 관리 Stored Procedures 배포
- **실행 방법**: `node scripts/deploy-subcompany-sp.js`

#### `deploy-department-sp.js`
- **목적**: 부서 관리 Stored Procedures 배포
- **실행 방법**: `node scripts/deploy-department-sp.js`

#### `deploy-position-sp.js`
- **목적**: 직책 관리 Stored Procedures 배포
- **실행 방법**: `node scripts/deploy-position-sp.js`

#### `update-sp.js`
- **목적**: 기존 Stored Procedures 업데이트
- **실행 방법**: `node scripts/update-sp.js`

### 🧪 테스트 및 검증 스크립트

#### `create-test-department.js`
- **목적**: 테스트용 부서 생성
- **용도**: 직책 API 테스트를 위한 임시 부서 데이터 생성
- **실행 조건**: 테스트 시 필요할 때
- **실행 방법**: `node scripts/create-test-department.js`

#### `verify-employee-organization.js`
- **목적**: 직원-조직도 연결 관계 검증
- **기능**: 외래키 제약조건, 데이터 무결성, 조직별 인원 현황 확인
- **실행 방법**: `node scripts/verify-employee-organization.js`

### 🔍 데이터 분석 및 디버깅 스크립트

#### `check-subcompany-table.js`
- **목적**: 사업장 테이블 상태 확인
- **실행 방법**: `node scripts/check-subcompany-table.js`

#### `check-department-table.js`
- **목적**: 부서 테이블 상태 확인
- **실행 방법**: `node scripts/check-department-table.js`

#### `check-departments-status.js`
- **목적**: 부서 전체 상태 분석
- **실행 방법**: `node scripts/check-departments-status.js`

#### `check-position-table.js`
- **목적**: 직책 테이블 상태 확인
- **실행 방법**: `node scripts/check-position-table.js`

#### `analyze-position-table.js`
- **목적**: 직책 테이블 상세 분석
- **실행 방법**: `node scripts/analyze-position-table.js`

#### `debug-position-sp.js`
- **목적**: 직책 관련 SP 디버깅
- **실행 방법**: `node scripts/debug-position-sp.js`

## ⚠️ 주의사항

1. **일회성 실행**: 이 스크립트들은 초기 설정용으로 한 번만 실행하면 됩니다.
2. **실행 순서**: 다음 순서로 실행해야 합니다:
   ```bash
   # 1. 테이블 생성
   node scripts/create-employee-tables.js
   
   # 2. SP 생성  
   node scripts/create-employee-procedures.js
   
   # 3. 초기 데이터 생성
   node scripts/create-initial-employees.js
   ```
3. **중복 실행**: 대부분의 스크립트는 중복 실행해도 안전하도록 설계되어 있습니다.
4. **환경 설정**: `.env` 파일이 올바르게 설정되어 있어야 합니다.

## 🗂️ 새로운 환경 구축 시

새로운 개발 환경이나 서버에 SmartHR을 설치할 때는 다음 순서로 실행하세요:

1. 조직도 테이블/SP 생성 (기존 sql 파일들)
2. `create-employee-tables.js` 실행
3. `create-employee-procedures.js` 실행  
4. `create-initial-employees.js` 실행

이렇게 하면 완전한 SmartHR 시스템이 구축됩니다.

---

**📅 최종 업데이트**: 2024-09-13  
**📊 상태**: 모든 스크립트 정리 완료 (17개 스크립트 파일 관리)  
**📁 전체 스크립트 수**: 17개 (초기화 4개, 조직도 관리 5개, 테스트/검증 2개, 디버깅/분석 6개)