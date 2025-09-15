/**
 * 발령 유형별 테스트 시나리오 스크립트
 * @description 마스터 데이터 조회 API와 종합 발령 API의 발령 유형 기능 테스트
 * @author SmartHR Team
 * @date 2024-09-14
 */

const express = require('express');
const app = express();

// 환경설정
app.use(express.json());

// 기본 테스트 설정
const BASE_URL = 'http://localhost:3000';
const TEST_JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // 실제 JWT 토큰으로 교체 필요

console.log('📋 인사발령 시스템 테스트 시나리오 가이드');
console.log('='.repeat(60));

// 테스트 시나리오 1: 마스터 데이터 조회 API 테스트
console.log('\n🔍 테스트 시나리오 1: 마스터 데이터 조회 API');
console.log('-'.repeat(40));

console.log('\n1-1. 발령 대분류 목록 조회');
console.log('GET ' + BASE_URL + '/api/assignments/master/categories');
console.log('Headers:');
console.log('  Authorization: Bearer ' + TEST_JWT_TOKEN);
console.log('  Content-Type: application/json');
console.log('\n예상 응답:');
console.log(`{
  "success": true,
  "data": {
    "categories": [
      {
        "CategoryId": 1,
        "CategoryCode": "RECRUIT",
        "CategoryName": "입사",
        "CategoryNameEng": "Recruitment",
        "DisplayOrder": 1,
        "Description": "신규 입사 관련 발령",
        "IsActive": true
      },
      {
        "CategoryId": 2,
        "CategoryCode": "PROMOTION",
        "CategoryName": "승진",
        "CategoryNameEng": "Promotion",
        "DisplayOrder": 2,
        "Description": "승진 관련 발령",
        "IsActive": true
      }
      // ... 추가 대분류
    ]
  },
  "message": "발령 대분류 목록 조회가 완료되었습니다."
}`);

console.log('\n1-2. 발령 세부유형 목록 조회 (전체)');
console.log('GET ' + BASE_URL + '/api/assignments/master/types');
console.log('Headers: 동일');
console.log('\n예상 응답:');
console.log(`{
  "success": true,
  "data": {
    "types": [
      {
        "AssignmentTypeId": 1,
        "CategoryId": 1,
        "CategoryName": "입사",
        "TypeCode": "NEW_GRAD",
        "TypeName": "채용(신입)",
        "RequiresApproval": true,
        "RequiresEffectiveDate": true,
        "AllowsBranchChange": true,
        "AllowsDeptChange": true,
        "AllowsPositionChange": true,
        "AllowsSalaryChange": true
      }
      // ... 추가 세부유형
    ]
  },
  "message": "발령 세부유형 목록 조회가 완료되었습니다."
}`);

console.log('\n1-3. 특정 대분류의 세부유형 조회');
console.log('GET ' + BASE_URL + '/api/assignments/master/types?categoryId=1');
console.log('Headers: 동일');

console.log('\n1-4. 발령 사유 목록 조회');
console.log('GET ' + BASE_URL + '/api/assignments/master/reasons');
console.log('Headers: 동일');

console.log('\n1-5. 특정 유형의 발령 사유 조회');
console.log('GET ' + BASE_URL + '/api/assignments/master/reasons?assignmentTypeId=1');
console.log('Headers: 동일');

console.log('\n1-6. 발령 유형 상세 정보 조회');
console.log('GET ' + BASE_URL + '/api/assignments/master/types/1');
console.log('Headers: 동일');

// 테스트 시나리오 2: 발령 유형 포함 종합 발령 API 테스트
console.log('\n\n🚀 테스트 시나리오 2: 발령 유형 포함 종합 발령 API');
console.log('-'.repeat(50));

console.log('\n2-1. 신입 채용 발령 (입사)');
console.log('POST ' + BASE_URL + '/api/assignments/:employeeId');
console.log('Headers: 동일');
console.log('Body:');
console.log(`{
  "newCompanyId": 1,
  "newSubCompanyId": 1,
  "newDeptId": 3,
  "newPosId": 1,
  "assignmentDate": "2024-09-15",
  "assignmentReason": "2024년 하반기 신입사원 채용",
  
  // 발령 유형 정보
  "categoryId": 1,              // 입사
  "assignmentTypeId": 1,        // 채용(신입)
  "reasonId": 1,                // 신규 채용
  "approvalStatus": "APPROVED",
  "approvalComment": "인사위원회 승인 완료",
  "newSalary": 3500000.00
}`);

console.log('\n2-2. 경력직 채용 발령');
console.log('POST ' + BASE_URL + '/api/assignments/:employeeId');
console.log('Body:');
console.log(`{
  "newCompanyId": 1,
  "newSubCompanyId": 2,
  "newDeptId": 5,
  "newPosId": 3,
  "assignmentDate": "2024-09-20",
  "assignmentReason": "마케팅팀 전문인력 확충",
  
  // 발령 유형 정보
  "categoryId": 1,              // 입사
  "assignmentTypeId": 2,        // 채용(경력)
  "reasonId": 2,                // 결원 충원
  "approvalStatus": "APPROVED",
  "newSalary": 4800000.00
}`);

console.log('\n2-3. 정규 승진 발령');
console.log('Body:');
console.log(`{
  "newPosId": 4,                // 직책만 변경
  "assignmentDate": "2024-10-01",
  "assignmentReason": "2024년 정기 승진",
  
  // 발령 유형 정보
  "categoryId": 2,              // 승진
  "assignmentTypeId": 3,        // 승진(정규)
  "reasonId": 3,                // 정기 승진
  "approvalStatus": "APPROVED",
  "oldSalary": 3500000.00,
  "newSalary": 4200000.00
}`);

console.log('\n2-4. 부서 이동 발령');
console.log('Body:');
console.log(`{
  "newDeptId": 7,               // 부서만 변경
  "assignmentDate": "2024-09-25",
  "assignmentReason": "업무 효율성 제고",
  
  // 발령 유형 정보
  "categoryId": 3,              // 이동
  "assignmentTypeId": 5,        // 부서이동
  "reasonId": 4,                // 조직 개편
  "approvalStatus": "PENDING",
  "approvalComment": "부서장 승인 대기"
}`);

console.log('\n2-5. 종합 발령 (회사+부서+직책 동시 변경)');
console.log('Body:');
console.log(`{
  "newCompanyId": 2,
  "newSubCompanyId": 3,
  "newDeptId": 9,
  "newPosId": 5,
  "assignmentDate": "2024-10-15",
  "assignmentReason": "자회사 확장에 따른 핵심인력 파견",
  
  // 발령 유형 정보
  "categoryId": 4,              // 파견
  "assignmentTypeId": 7,        // 관계사 파견
  "reasonId": 6,                // 사업 확장
  "approvalStatus": "APPROVED",
  "oldSalary": 4200000.00,
  "newSalary": 4500000.00,
  "documentPath": "/docs/assignment/2024/파견발령서_001.pdf"
}`);

console.log('\n2-6. 휴직 발령');
console.log('Body:');
console.log(`{
  "assignmentDate": "2024-11-01",
  "assignmentReason": "출산휴가 시작",
  
  // 발령 유형 정보
  "categoryId": 5,              // 휴직
  "assignmentTypeId": 9,        // 출산휴직
  "reasonId": 8,                // 출산/육아
  "approvalStatus": "APPROVED",
  "approvalComment": "출산예정일: 2024-11-15",
  "oldSalary": 3800000.00,
  "newSalary": 0.00
}`);

// 테스트 시나리오 3: 예상 응답 형식
console.log('\n\n📄 테스트 시나리오 3: 예상 응답 형식');
console.log('-'.repeat(40));

console.log('\n3-1. 성공 응답 예시');
console.log(`{
  "success": true,
  "data": {
    "assignmentId": 15,
    "employeeId": 123,
    "employeeCode": "EMP001",
    "employeeName": "김직원",
    "assignmentType": "부서이동+직책승진",
    "changeCount": 2,
    "newCompany": "스마트HR(주)",
    "newSubCompany": "본사",
    "newDepartment": "개발팀",
    "newPosition": "선임연구원",
    "assignmentDate": "2024-09-25T00:00:00.000Z",
    
    // 발령 유형 정보
    "assignmentCategory": {
      "categoryId": 2,
      "categoryName": "승진"
    },
    "assignmentTypeInfo": {
      "assignmentTypeId": 3,
      "typeName": "승진(정규)"
    },
    "assignmentReason": {
      "reasonId": 3,
      "reasonText": "정기 승진"
    },
    "approvalInfo": {
      "approvalStatus": "APPROVED",
      "approvalComment": "인사위원회 승인 완료"
    },
    "salaryChange": {
      "oldSalary": 3500000.00,
      "newSalary": 4200000.00,
      "hasChange": true
    },
    "processedAt": "2024-09-14T10:30:25.123Z"
  },
  "message": "종합 발령이 성공적으로 처리되었습니다."
}`);

console.log('\n3-2. 실패 응답 예시');
console.log(`{
  "success": false,
  "data": null,
  "message": "해당 발령 유형을 찾을 수 없습니다."
}`);

// 테스트 시나리오 4: 데이터 검증 테스트
console.log('\n\n🔍 테스트 시나리오 4: 데이터 검증 테스트');
console.log('-'.repeat(40));

console.log('\n4-1. 잘못된 발령 유형 ID 테스트');
console.log('Body: { "categoryId": 999, "assignmentTypeId": 999, "reasonId": 999 }');
console.log('예상 응답: "유효하지 않은 발령 유형입니다."');

console.log('\n4-2. 발령 유형과 대분류 불일치 테스트');
console.log('Body: { "categoryId": 1, "assignmentTypeId": 3 }'); // 입사 + 승진(정규) 조합
console.log('예상 응답: "발령 유형과 대분류가 일치하지 않습니다."');

console.log('\n4-3. 필수 파라미터 누락 테스트');
console.log('Body: { "assignmentTypeId": 1 }'); // categoryId 누락
console.log('예상 응답: "필수 입력 항목이 누락되었습니다."');

console.log('\n4-4. 급여 정보 검증 테스트');
console.log('Body: { "oldSalary": "invalid", "newSalary": -1000 }');
console.log('예상 응답: "올바른 급여 금액을 입력해주세요."');

// 테스트 가이드
console.log('\n\n📝 테스트 실행 가이드');
console.log('='.repeat(50));
console.log('1. 서버 실행: npm run dev');
console.log('2. JWT 토큰 발급: POST /api/auth/login');
console.log('3. 위 토큰을 TEST_JWT_TOKEN 변수에 설정');
console.log('4. Postman, Thunder Client, 또는 curl로 API 테스트');
console.log('5. 각 시나리오별 예상 응답과 실제 응답 비교');
console.log('\n✅ 모든 테스트가 통과하면 발령 유형 기능이 정상 작동');

console.log('\n\n🚨 주의사항');
console.log('-'.repeat(20));
console.log('• 실제 테스트 시 유효한 employeeId 사용');
console.log('• companyId, deptId, posId는 실제 존재하는 ID 사용');
console.log('• JWT 토큰은 유효한 사용자 토큰으로 교체');
console.log('• 테스트 후 데이터 정리 권장');

console.log('\n발령 유형별 테스트 시나리오 가이드가 완성되었습니다! 🎉');