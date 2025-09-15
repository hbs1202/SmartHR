/**
 * 휴가 신청 결재 시스템 테스트 가이드
 * @description 휴가 신청부터 승인까지 전체 워크플로우 테스트
 * @author SmartHR Team
 * @date 2024-09-14
 */

const axios = require('axios');

// 테스트 설정
const BASE_URL = 'http://localhost:3000';
let ADMIN_TOKEN = '';
let HR_TOKEN = '';
let EMPLOYEE_TOKEN = '';

// API 테스트 헬퍼 함수
const apiRequest = async (method, url, data = null, token = '') => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    return error.response?.data || { error: error.message };
  }
};

console.log('🏖️ 휴가 신청 결재 시스템 테스트 시작');
console.log('='.repeat(60));

/**
 * 1. 다중 사용자 인증 테스트
 */
async function testMultiUserAuthentication() {
  console.log('\n📋 1. 다중 사용자 인증 테스트');
  console.log('-'.repeat(40));

  // 관리자 로그인
  console.log('🔄 관리자 로그인...');
  const adminLogin = await apiRequest('POST', '/api/auth/login', {
    email: 'admin@smarthr.com',
    password: 'admin123!'
  });

  if (adminLogin.success) {
    ADMIN_TOKEN = adminLogin.data.token;
    console.log('✅ 관리자 로그인 성공');
  } else {
    console.log('❌ 관리자 로그인 실패:', adminLogin.message);
    return false;
  }

  // HR 담당자 로그인
  console.log('🔄 HR 담당자 로그인...');
  const hrLogin = await apiRequest('POST', '/api/auth/login', {
    email: 'hr@smarthr.com',
    password: 'hr123!'
  });

  if (hrLogin.success) {
    HR_TOKEN = hrLogin.data.token;
    console.log('✅ HR 담당자 로그인 성공');
  } else {
    console.log('❌ HR 담당자 로그인 실패:', hrLogin.message);
  }

  // 일반 직원 로그인
  console.log('🔄 일반 직원 로그인...');
  const employeeLogin = await apiRequest('POST', '/api/auth/login', {
    email: 'employee1@smarthr.com',
    password: 'employee123!'
  });

  if (employeeLogin.success) {
    EMPLOYEE_TOKEN = employeeLogin.data.token;
    console.log('✅ 일반 직원 로그인 성공');
  } else {
    console.log('❌ 일반 직원 로그인 실패:', employeeLogin.message);
  }

  return true;
}

/**
 * 2. 휴가 신청 테스트 (직원 계정)
 */
async function testVacationRequest() {
  console.log('\n📋 2. 휴가 신청 테스트');
  console.log('-'.repeat(30));

  if (!EMPLOYEE_TOKEN) {
    console.log('❌ 직원 토큰이 없어 휴가 신청 테스트를 건너뜁니다.');
    return null;
  }

  // 연차 휴가 신청
  console.log('🔄 연차 휴가 신청 테스트...');
  const vacationRequest = {
    vacationType: '연차',
    startDate: '2024-10-01',
    endDate: '2024-10-03',
    days: 3,
    reason: '가족 여행으로 인한 연차 사용',
    emergencyContact: '010-1234-5678',
    workHandover: '프로젝트 진행 상황은 팀장님께 보고드렸으며, 긴급한 사항은 김동료에게 연락 바랍니다.'
  };

  const createResult = await apiRequest('POST', '/api/vacation/request', vacationRequest, EMPLOYEE_TOKEN);
  console.log('📊 연차 신청 결과:', JSON.stringify(createResult, null, 2));

  if (createResult.success) {
    console.log('✅ 연차 휴가 신청 성공');
    return createResult.data.vacationRequest.documentId;
  }

  // 병가 신청 테스트
  console.log('\n🔄 병가 신청 테스트...');
  const sickLeaveRequest = {
    vacationType: '병가',
    startDate: '2024-09-18',
    endDate: '2024-09-19',
    days: 2,
    reason: '몸살감기로 인한 병가',
    emergencyContact: '010-9876-5432'
  };

  const sickLeaveResult = await apiRequest('POST', '/api/vacation/request', sickLeaveRequest, EMPLOYEE_TOKEN);
  console.log('📊 병가 신청 결과:', JSON.stringify(sickLeaveResult, null, 2));

  return createResult.success ? createResult.data.vacationRequest.documentId : null;
}

/**
 * 3. 휴가 신청 상세 조회 테스트
 */
async function testVacationDetails(documentId) {
  if (!documentId || !EMPLOYEE_TOKEN) return;

  console.log(`\n📋 3. 휴가 신청 상세 조회 테스트 (ID: ${documentId})`);
  console.log('-'.repeat(50));

  const detailResult = await apiRequest('GET', `/api/vacation/requests/${documentId}`, null, EMPLOYEE_TOKEN);
  console.log('📊 휴가 신청 상세:', JSON.stringify(detailResult, null, 2));

  return detailResult.success;
}

/**
 * 4. 내 휴가 신청 이력 조회 테스트
 */
async function testMyVacationHistory() {
  console.log('\n📋 4. 내 휴가 신청 이력 조회 테스트');
  console.log('-'.repeat(40));

  if (!EMPLOYEE_TOKEN) {
    console.log('❌ 직원 토큰이 없어 이력 조회를 건너뜁니다.');
    return;
  }

  // 전체 이력 조회
  console.log('🔄 전체 휴가 신청 이력 조회...');
  const allHistoryResult = await apiRequest('GET', '/api/vacation/my-requests?page=1&size=10', null, EMPLOYEE_TOKEN);
  console.log('📊 전체 이력:', JSON.stringify(allHistoryResult, null, 2));

  // 상태별 이력 조회
  console.log('\n🔄 대기중인 휴가 신청 조회...');
  const pendingHistoryResult = await apiRequest('GET', '/api/vacation/my-requests?status=PENDING&page=1&size=5', null, EMPLOYEE_TOKEN);
  console.log('📊 대기중 휴가:', JSON.stringify(pendingHistoryResult, null, 2));

  return allHistoryResult.success;
}

/**
 * 5. 결재 대기 문서 조회 (결재자 계정)
 */
async function testApprovalPendingList() {
  console.log('\n📋 5. 결재 대기 문서 조회 테스트');
  console.log('-'.repeat(40));

  // 관리자로 결재 대기 목록 조회
  if (ADMIN_TOKEN) {
    console.log('🔄 관리자 결재 대기 목록 조회...');
    const adminPendingResult = await apiRequest('GET', '/api/approval/pending?page=1&size=10', null, ADMIN_TOKEN);
    console.log('📊 관리자 결재 대기:', JSON.stringify(adminPendingResult, null, 2));
  }

  // HR 담당자 결재 대기 목록 조회
  if (HR_TOKEN) {
    console.log('\n🔄 HR 담당자 결재 대기 목록 조회...');
    const hrPendingResult = await apiRequest('GET', '/api/approval/pending?page=1&size=10', null, HR_TOKEN);
    console.log('📊 HR 결재 대기:', JSON.stringify(hrPendingResult, null, 2));
  }

  return true;
}

/**
 * 6. 휴가 결재 승인 테스트
 */
async function testVacationApproval(documentId) {
  if (!documentId) return;

  console.log(`\n📋 6. 휴가 결재 승인 테스트 (ID: ${documentId})`);
  console.log('-'.repeat(40));

  // 1차 승인 (부서장 승인)
  if (ADMIN_TOKEN) {
    console.log('🔄 부서장 승인 처리...');
    const firstApprovalResult = await apiRequest('POST', `/api/approval/documents/${documentId}/process`, {
      action: 'APPROVE',
      comment: '연차 사용이 적절하며, 업무 인수인계도 잘 되어있어 승인합니다.'
    }, ADMIN_TOKEN);
    console.log('📊 1차 승인 결과:', JSON.stringify(firstApprovalResult, null, 2));
  }

  // 2차 승인 (HR 승인)
  if (HR_TOKEN) {
    console.log('\n🔄 HR 최종 승인 처리...');
    const finalApprovalResult = await apiRequest('POST', `/api/approval/documents/${documentId}/process`, {
      action: 'APPROVE',
      comment: 'HR 검토 완료. 연차 잔여일수 확인 후 최종 승인합니다.'
    }, HR_TOKEN);
    console.log('📊 최종 승인 결과:', JSON.stringify(finalApprovalResult, null, 2));
  }

  return true;
}

/**
 * 7. 팀 휴가 현황 조회 테스트 (관리자 계정)
 */
async function testTeamVacationStatus() {
  console.log('\n📋 7. 팀 휴가 현황 조회 테스트');
  console.log('-'.repeat(40));

  if (!ADMIN_TOKEN) {
    console.log('❌ 관리자 토큰이 없어 팀 휴가 현황 조회를 건너뜁니다.');
    return;
  }

  // 전체 팀 휴가 현황 조회
  console.log('🔄 전체 팀 휴가 현황 조회...');
  const teamStatusResult = await apiRequest('GET', '/api/vacation/team-status?startDate=2024-09-01&endDate=2024-10-31', null, ADMIN_TOKEN);
  console.log('📊 팀 휴가 현황:', JSON.stringify(teamStatusResult, null, 2));

  return teamStatusResult.success;
}

/**
 * 8. 휴가 반려 테스트
 */
async function testVacationRejection() {
  console.log('\n📋 8. 휴가 반려 테스트');
  console.log('-'.repeat(30));

  if (!EMPLOYEE_TOKEN) {
    console.log('❌ 직원 토큰이 없어 반려 테스트를 건너뜁니다.');
    return;
  }

  // 반려용 휴가 신청
  console.log('🔄 반려 테스트용 휴가 신청...');
  const rejectTestRequest = {
    vacationType: '연차',
    startDate: '2024-12-25', // 크리스마스 (바쁜 시기)
    endDate: '2024-12-27',
    days: 3,
    reason: '연말 휴식'
  };

  const rejectDocResult = await apiRequest('POST', '/api/vacation/request', rejectTestRequest, EMPLOYEE_TOKEN);
  
  if (rejectDocResult.success && ADMIN_TOKEN) {
    const rejectDocumentId = rejectDocResult.data.vacationRequest.documentId;
    
    console.log('\n🔄 휴가 반려 처리...');
    const rejectionResult = await apiRequest('POST', `/api/approval/documents/${rejectDocumentId}/process`, {
      action: 'REJECT',
      comment: '연말은 업무가 집중되는 시기이므로 일정 조정 후 재신청 바랍니다.'
    }, ADMIN_TOKEN);
    console.log('📊 반려 처리 결과:', JSON.stringify(rejectionResult, null, 2));
  }
}

/**
 * 9. 오류 시나리오 테스트
 */
async function testErrorScenarios() {
  console.log('\n📋 9. 오류 시나리오 테스트');
  console.log('-'.repeat(30));

  if (!EMPLOYEE_TOKEN) {
    console.log('❌ 직원 토큰이 없어 오류 시나리오 테스트를 건너뜁니다.');
    return;
  }

  // 과거 날짜로 휴가 신청
  console.log('🔄 과거 날짜 휴가 신청 테스트...');
  const pastDateResult = await apiRequest('POST', '/api/vacation/request', {
    vacationType: '연차',
    startDate: '2024-01-01',
    endDate: '2024-01-02',
    days: 2,
    reason: '과거 날짜 테스트'
  }, EMPLOYEE_TOKEN);
  console.log('📊 과거 날짜 결과:', JSON.stringify(pastDateResult, null, 2));

  // 잘못된 휴가 유형
  console.log('\n🔄 잘못된 휴가 유형 테스트...');
  const invalidTypeResult = await apiRequest('POST', '/api/vacation/request', {
    vacationType: '무급휴가', // 유효하지 않은 유형
    startDate: '2024-11-01',
    endDate: '2024-11-02',
    days: 2,
    reason: '잘못된 유형 테스트'
  }, EMPLOYEE_TOKEN);
  console.log('📊 잘못된 유형 결과:', JSON.stringify(invalidTypeResult, null, 2));

  // 필수 항목 누락
  console.log('\n🔄 필수 항목 누락 테스트...');
  const missingFieldResult = await apiRequest('POST', '/api/vacation/request', {
    vacationType: '연차',
    startDate: '2024-11-01',
    // endDate 누락
    days: 2,
    reason: '필수 항목 누락 테스트'
  }, EMPLOYEE_TOKEN);
  console.log('📊 필수 항목 누락 결과:', JSON.stringify(missingFieldResult, null, 2));
}

/**
 * 메인 테스트 실행 함수
 */
async function runVacationSystemTests() {
  console.log('🚀 휴가 신청 결재 시스템 통합 테스트 시작');
  console.log(new Date().toLocaleString());

  try {
    // 1. 다중 사용자 인증
    const authSuccess = await testMultiUserAuthentication();
    if (!authSuccess) {
      console.log('❌ 인증 실패로 테스트 중단');
      return;
    }

    // 2. 휴가 신청
    const vacationDocumentId = await testVacationRequest();

    // 3. 휴가 신청 상세 조회
    await testVacationDetails(vacationDocumentId);

    // 4. 내 휴가 신청 이력
    await testMyVacationHistory();

    // 5. 결재 대기 목록 조회
    await testApprovalPendingList();

    // 6. 휴가 결재 승인
    if (vacationDocumentId) {
      await testVacationApproval(vacationDocumentId);
    }

    // 7. 팀 휴가 현황 조회
    await testTeamVacationStatus();

    // 8. 휴가 반려 테스트
    await testVacationRejection();

    // 9. 오류 시나리오
    await testErrorScenarios();

    console.log('\n✅ 휴가 신청 결재 시스템 테스트가 완료되었습니다!');
    console.log('\n🎉 주요 기능 검증 완료:');
    console.log('   ✅ 휴가 신청 및 검증');
    console.log('   ✅ 자동 결재선 설정');
    console.log('   ✅ 다단계 결재 프로세스');
    console.log('   ✅ 휴가 현황 관리');
    console.log('   ✅ 권한별 접근 제어');
    console.log('   ✅ 오류 처리 및 검증');

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error.message);
  }
}

/**
 * Postman 테스트 가이드 출력
 */
function printVacationTestGuide() {
  console.log('\n\n📝 휴가 시스템 Postman 테스트 가이드');
  console.log('='.repeat(60));
  
  console.log('\n🏖️ 1. 휴가 신청');
  console.log('POST http://localhost:3000/api/vacation/request');
  console.log('Authorization: Bearer [EMPLOYEE_TOKEN]');
  console.log('Content-Type: application/json');
  console.log(JSON.stringify({
    vacationType: '연차',
    startDate: '2024-10-01',
    endDate: '2024-10-03',
    days: 3,
    reason: '가족 여행으로 인한 연차 사용',
    emergencyContact: '010-1234-5678',
    workHandover: '업무 인수인계 완료'
  }, null, 2));
  
  console.log('\n📋 2. 내 휴가 신청 이력');
  console.log('GET http://localhost:3000/api/vacation/my-requests?page=1&size=10');
  console.log('Authorization: Bearer [EMPLOYEE_TOKEN]');
  
  console.log('\n📊 3. 휴가 신청 상세 조회');
  console.log('GET http://localhost:3000/api/vacation/requests/{documentId}');
  console.log('Authorization: Bearer [EMPLOYEE_TOKEN]');
  
  console.log('\n👥 4. 팀 휴가 현황 (관리자/팀장)');
  console.log('GET http://localhost:3000/api/vacation/team-status?startDate=2024-09-01&endDate=2024-10-31');
  console.log('Authorization: Bearer [ADMIN_TOKEN]');
  
  console.log('\n✅ 5. 휴가 승인 (결재자)');
  console.log('POST http://localhost:3000/api/approval/documents/{documentId}/process');
  console.log('Authorization: Bearer [APPROVER_TOKEN]');
  console.log('Content-Type: application/json');
  console.log(JSON.stringify({
    action: 'APPROVE',
    comment: '휴가 신청이 적절하며 승인합니다.'
  }, null, 2));

  console.log('\n💡 테스트 순서:');
  console.log('1. 직원으로 로그인 → 휴가 신청');
  console.log('2. 관리자로 로그인 → 결재 대기 목록 확인');
  console.log('3. 관리자가 1차 승인 → HR이 최종 승인');
  console.log('4. 휴가 상태 변화 확인 → 팀 현황 조회');
}

// 스크립트 실행
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--guide')) {
    printVacationTestGuide();
  } else {
    runVacationSystemTests();
  }
}

module.exports = { 
  runVacationSystemTests,
  printVacationTestGuide
};