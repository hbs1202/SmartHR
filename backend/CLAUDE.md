# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🌏 언어 및 소통 규칙

- **모든 응답과 설명은 한국어로 작성**
- 모든 코드에 한국어 주석 반드시 포함 (함수 설명, 파라미터 설명, 로직 설명)
- JSDoc 형식 사용 권장

## 🏗️ 프로젝트 개요

### 기술 스택
- **Backend**: Node.js + Express
- **Database**: MS SQL Server
- **인증**: JWT + bcrypt
- **패키지**: mssql, jsonwebtoken, cors, helmet, morgan

### 필수 구현 규칙
- 새로운 작업 진행 시 반드시 물어보고 진행하기
- 모든 API에 try-catch 필수 적용
- JWT 토큰 검증 미들웨어 적용 (auth API 제외)
- **Stored Procedure 호출 방식만 사용** (직접 SQL 쿼리 작성 금지)
- 비밀번호 bcrypt 해싱 필수 (saltRounds: 10)
- 프로젝트 변경되면 PROJECT_STATUS.md 변경

### ⭐ 중요 개발 알림
- **직원 관리 시스템 개발 시 발령 관리 시스템 통합 필수**
  - 발령 관리 = 부서 이동, 직책 변경, 승진/강등 관리
  - 발령을 통한 부서 조직도 변경 기능 포함
  - 발령 이력 관리 및 추적 기능 필수
  - 자세한 내용은 PROJECT_STATUS.md의 "향후 개발 계획" 참조

### 표준 응답 포맷 (절대 변경 금지)
```javascript
{
  "success": boolean,
  "data": any,
  "message": string
}
```

## 📚 상세 문서 참조

프로젝트의 상세한 개발 가이드는 다음 문서들을 참조하세요:

### 필수 참조 문서
- **[API 개발 가이드](./docs/API_GUIDE.md)** - API 컨트롤러 템플릿, 라우팅, 에러 처리
- **[데이터베이스 가이드](./docs/DATABASE_GUIDE.md)** - SP 템플릿, DB 헬퍼 함수, 트랜잭션 처리
- **[코딩 표준](./docs/CODING_STANDARDS.md)** - 네이밍 규칙, 주석 규칙, 품질 체크리스트

### 프로젝트 정보
- **[프로젝트 진행 현황](./PROJECT_STATUS.md)** - 현재 상태 및 다음 작업
- **[프로젝트 구조](./docs/PROJECT_STRUCTURE.md)** - 폴더 구조 및 파일 설명

## ⚠️ 절대 금지 사항

- 영어 주석이나 설명 사용 금지
- 응답 포맷 임의 변경 금지
- try-catch 에러 처리 생략 금지
- 직접 SQL 쿼리 작성 금지 (SP만 사용)
- JWT 인증 생략 금지 (auth API 제외)
- 비밀번호 평문 저장 금지 (bcrypt 해싱 필수)
- 에러 로깅 생략 금지
- 입력값 검증 생략 금지

## 🔧 환경 설정

```javascript
// .env 파일 필수 항목
DB_SERVER=localhost
DB_DATABASE=hr_system
DB_USER=sa
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
PORT=3000
```

## 📝 Claude Code 소통 방식

### 작업 완료 시 반드시 포함할 내용
- 구현된 기능 설명 (한국어)
- 테스트 방법 안내
- Postman 테스트 예시
- 다음 작업 제안
- 주의사항이나 참고사항

### 질문이나 확인이 필요한 경우
- 구현 중 다음 사항을 확인하고 싶습니다:
  1. [질문 내용]
  2. [대안 제시]
- 어떤 방향으로 진행할까요?

### 에러나 문제 발생 시 보고 형식
- 다음 문제가 발생했습니다:
  1. 오류 내용: [구체적인 오류]
  2. 발생 위치: [파일명 및 라인]
  3. 해결 방안: [제안사항]

---

## ⚠️ 중요! PROJECT_STATUS.md 업데이트 규칙

**작업 완료 시 반드시 PROJECT_STATUS.md 업데이트하기!**

### 언제 업데이트 하나요?
- 새로운 API 개발 완료
- 새로운 SP 생성/배포 완료  
- 주요 기능 구현 완료
- 테스트 완료
- Phase 단계 완료

### 무엇을 업데이트 하나요?
1. **현재 상태** 섹션 (맨 위)
2. **완료된 작업** 섹션에 새로운 항목 추가
3. **다음 단계** 섹션에서 완료된 항목 체크 ([ ] → [x])
4. **현재 상태** 섹션의 API/SP/테이블 개수 업데이트
5. **프로젝트 완료율** 업데이트

### 업데이트 체크리스트
- [ ] 마지막 업데이트 날짜 변경
- [ ] 현재 상태 문구 변경
- [ ] 새로운 완료 항목 추가 (섹션 14, 15, 16...)
- [ ] API 엔드포인트 목록 업데이트
- [ ] 프로젝트 완료율 및 통계 업데이트

### 기록 누락 방지 방법
```bash
# 작업 시작 전 현재 상태 확인
cat PROJECT_STATUS.md | grep "현재 상태"

# 작업 완료 후 반드시 업데이트
# "잊었다면 지금이라도 바로 업데이트!"
```

---

**📋 상세한 개발 가이드는 docs/ 폴더의 각 문서를 참조하세요.**