/**
 * 전자결재 시스템 API 테스트 가이드 및 시나리오
 * @description 결재 생성, 승인, 반려, 조회 등 전체 프로세스 테스트
 * @author SmartHR Team
 * @date 2024-09-14
 */

const axios = require('axios');

// 테스트 설정
const BASE_URL = 'http://localhost:3001';
let JWT_TOKEN = ''; // 로그인 후 토큰 저장용

// API 테스트 헬퍼 함수
const apiRequest = async (method, url, data = null, token = JWT_TOKEN) => {
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

console.log('🔄 전자결재 시스템 API 테스트 가이드');
console.log('='.repeat(60));

/**
 * 1. 인증 테스트 (JWT 토큰 발급)
 */
async function testAuthentication() {
  console.log('\n📋 1. 인증 테스트');
  console.log('-'.repeat(30));

  // 관리자 로그인
  console.log('🔄 관리자 로그인 테스트...');
  const loginResult = await apiRequest('POST', '/api/auth/login', {
    email: 'admin@smarthr.com',
    password: 'admin123!'
  });

  if (loginResult.success && loginResult.data && loginResult.data.accessToken) {
    JWT_TOKEN = loginResult.data.accessToken;
    console.log('✅ 관리자 로그인 성공');
    console.log('📌 JWT 토큰:', JWT_TOKEN.substring(0, 50) + '...');
    return true;
  } else {
    console.log('❌ 관리자 로그인 실패:', loginResult.message || loginResult.error || '알 수 없는 오류');
    console.log('📊 로그인 응답:', JSON.stringify(loginResult, null, 2));
    return false;
  }
}

/**
 * 2. 결재 양식 목록 조회 테스트
 */
async function testGetApprovalForms() {
  console.log('\n📋 2. 결재 양식 목록 조회 테스트');
  console.log('-'.repeat(40));

  // 전체 양식 목록 조회
  console.log('🔄 전체 결재 양식 목록 조회...');
  const formsResult = await apiRequest('GET', '/api/approval/forms');
  console.log('📊 양식 목록 결과:', JSON.stringify(formsResult, null, 2));

  // 카테고리별 양식 조회
  console.log('\n🔄 인사 카테고리 양식 조회...');
  const hrFormsResult = await apiRequest('GET', '/api/approval/forms?category=HR');
  console.log('📊 인사 양식 결과:', JSON.stringify(hrFormsResult, null, 2));

  return formsResult.success;
}

/**
 * 3. 결재 문서 생성 테스트
 */
async function testCreateApprovalDocument() {
  console.log('\n📋 3. 결재 문서 생성 테스트');
  console.log('-'.repeat(40));

  // 휴가신청서 생성 테스트
  console.log('🔄 휴가신청서 생성 테스트...');
  const vacationRequest = {
    formId: 1, // 휴가신청서 Form ID (마스터 데이터에서 확인)
    title: '2024년 연차휴가 신청',
    content: JSON.stringify({
      vacationType: '연차',
      startDate: '2024-09-20',
      endDate: '2024-09-22',
      days: 3,
      reason: '개인 사유로 인한 연차 사용',
      emergencyContact: '010-1234-5678',
      workHandover: '업무는 팀원들과 공유하였으며, 긴급한 사항은 팀장에게 연락 바랍니다.'
    })
  };

  const createResult = await apiRequest('POST', '/api/approval/documents', vacationRequest);
  console.log('📊 문서 생성 결과:', JSON.stringify(createResult, null, 2));

  if (createResult.success) {
    console.log('✅ 휴가신청서 생성 성공');
    return createResult.data.documentId;
  } else {
    console.log('❌ 휴가신청서 생성 실패:', createResult.message);
    return null;
  }
}

/**
 * 4. 지출결의서 생성 테스트
 */
async function testCreateExpenseDocument() {
  console.log('\n🔄 지출결의서 생성 테스트...');
  const expenseRequest = {
    formId: 3, // 지출결의서 Form ID
    title: '업무용품 구매 지출 결의',
    content: JSON.stringify({
      expenseType: '업무용품',
      amount: 150000,
      expenseDate: '2024-09-25',
      vendor: '오피스디포',
      purpose: '개발팀 업무용 모니터 구매',
      details: 'LG 27인치 모니터 1대, HDMI 케이블 1개',
      budgetCode: 'IT-2024-Q3'
    })
  };

  const createResult = await apiRequest('POST', '/api/approval/documents', expenseRequest);
  console.log('📊 지출결의서 생성 결과:', JSON.stringify(createResult, null, 2));

  return createResult.success ? createResult.data.documentId : null;
}

/**
 * 5. 문서 상세 조회 테스트
 */
async function testGetDocumentDetails(documentId) {
  if (!documentId) return;

  console.log(`\n📋 5. 문서 상세 조회 테스트 (ID: ${documentId})`);
  console.log('-'.repeat(50));

  const detailResult = await apiRequest('GET', `/api/approval/documents/${documentId}`);
  console.log('📊 문서 상세 결과:', JSON.stringify(detailResult, null, 2));

  return detailResult.success;
}

/**
 * 6. 결재 대기 문서 목록 조회 테스트
 */
async function testGetPendingDocuments() {
  console.log('\n📋 6. 결재 대기 문서 목록 조회 테스트');
  console.log('-'.repeat(40));

  const pendingResult = await apiRequest('GET', '/api/approval/pending?page=1&size=10');
  console.log('📊 결재 대기 목록:', JSON.stringify(pendingResult, null, 2));

  return pendingResult.success;
}

/**
 * 7. 내가 신청한 문서 목록 조회 테스트
 */
async function testGetMyDocuments() {
  console.log('\n📋 7. 내가 신청한 문서 목록 조회 테스트');
  console.log('-'.repeat(40));

  // 전체 문서 조회
  const allDocsResult = await apiRequest('GET', '/api/approval/my-documents?page=1&size=10');
  console.log('📊 내 문서 전체 목록:', JSON.stringify(allDocsResult, null, 2));

  // 상태별 문서 조회
  const draftDocsResult = await apiRequest('GET', '/api/approval/my-documents?status=DRAFT&page=1&size=5');
  console.log('📊 내 임시저장 문서:', JSON.stringify(draftDocsResult, null, 2));

  return allDocsResult.success;
}

/**
 * 8. 결재 처리 테스트 (승인/반려)
 */
async function testProcessApproval(documentId) {
  if (!documentId) return;

  console.log(`\n📋 8. 결재 처리 테스트 (ID: ${documentId})`);
  console.log('-'.repeat(40));

  // 승인 처리 테스트
  console.log('🔄 결재 승인 테스트...');
  const approveResult = await apiRequest('POST', `/api/approval/documents/${documentId}/process`, {
    action: 'APPROVE',
    comment: '휴가 신청이 적절하며 승인합니다.'
  });
  console.log('📊 승인 처리 결과:', JSON.stringify(approveResult, null, 2));

  return approveResult.success;
}

/**
 * 9. 반려 처리 테스트
 */
async function testRejectApproval(documentId) {
  if (!documentId) return;

  console.log(`\n📋 9. 결재 반려 테스트 (ID: ${documentId})`);
  console.log('-'.repeat(40));

  const rejectResult = await apiRequest('POST', `/api/approval/documents/${documentId}/process`, {
    action: 'REJECT',
    comment: '휴가 기간이 업무상 중요한 시기와 겹치므로 일정 조정 후 재신청 바랍니다.'
  });
  console.log('📊 반려 처리 결과:', JSON.stringify(rejectResult, null, 2));

  return rejectResult.success;
}

/**
 * 10. 오류 시나리오 테스트
 */
async function testErrorScenarios() {
  console.log('\n📋 10. 오류 시나리오 테스트');
  console.log('-'.repeat(30));

  // 잘못된 양식 ID로 문서 생성
  console.log('🔄 잘못된 양식 ID 테스트...');
  const invalidFormResult = await apiRequest('POST', '/api/approval/documents', {
    formId: 9999,
    title: '존재하지 않는 양식',
    content: '{"test": "data"}'
  });
  console.log('📊 잘못된 양식 결과:', JSON.stringify(invalidFormResult, null, 2));

  // 존재하지 않는 문서 조회
  console.log('🔄 존재하지 않는 문서 조회 테스트...');
  const notFoundResult = await apiRequest('GET', '/api/approval/documents/99999');
  console.log('📊 존재하지 않는 문서 결과:', JSON.stringify(notFoundResult, null, 2));

  // 잘못된 액션으로 결재 처리
  console.log('🔄 잘못된 액션 테스트...');
  const invalidActionResult = await apiRequest('POST', '/api/approval/documents/1/process', {
    action: 'INVALID_ACTION',
    comment: '잘못된 액션 테스트'
  });
  console.log('📊 잘못된 액션 결과:', JSON.stringify(invalidActionResult, null, 2));

  // 권한 없는 결재 처리 (다른 사용자로 로그인 필요)
  console.log('🔄 권한 없는 결재 처리는 다른 사용자 계정이 필요합니다.');
}

/**
 * 메인 테스트 실행 함수
 */
async function runAllTests() {
  console.log('🚀 전자결재 시스템 API 테스트 시작');
  console.log(new Date().toLocaleString());

  try {
    // 1. 인증
    const authSuccess = await testAuthentication();
    if (!authSuccess) {
      console.log('❌ 인증 실패로 테스트 중단');
      return;
    }

    // 2. 양식 목록 조회
    await testGetApprovalForms();

    // 3. 문서 생성
    const vacationDocId = await testCreateApprovalDocument();
    const expenseDocId = await testCreateExpenseDocument();

    // 4. 문서 상세 조회
    await testGetDocumentDetails(vacationDocId);

    // 5. 목록 조회
    await testGetPendingDocuments();
    await testGetMyDocuments();

    // 6. 결재 처리 (승인)
    if (vacationDocId) {
      await testProcessApproval(vacationDocId);
    }

    // 7. 결재 처리 (반려) - 두 번째 문서로 테스트
    if (expenseDocId) {
      await testRejectApproval(expenseDocId);
    }

    // 8. 오류 시나리오
    await testErrorScenarios();

    console.log('\n✅ 모든 테스트가 완료되었습니다!');

  } catch (error) {
    console.error('❌ 테스트 실행 중 오류 발생:', error.message);
  }
}

/**
 * Postman/Thunder Client용 테스트 가이드 출력
 */
function printPostmanGuide() {
  console.log('\n\n📝 Postman/Thunder Client 테스트 가이드');
  console.log('='.repeat(60));
  
  console.log('\n🔐 1. 인증 (JWT 토큰 발급)');
  console.log('POST http://localhost:3000/api/auth/login');
  console.log('Content-Type: application/json');
  console.log(JSON.stringify({
    email: 'admin@smarthr.com',
    password: 'admin123!'
  }, null, 2));
  
  console.log('\n📋 2. 결재 양식 목록 조회');
  console.log('GET http://localhost:3000/api/approval/forms');
  console.log('Authorization: Bearer [JWT_TOKEN]');
  
  console.log('\n📝 3. 휴가신청서 생성');
  console.log('POST http://localhost:3000/api/approval/documents');
  console.log('Authorization: Bearer [JWT_TOKEN]');
  console.log('Content-Type: application/json');
  console.log(JSON.stringify({
    formId: 1,
    title: '2024년 연차휴가 신청',
    content: JSON.stringify({
      vacationType: '연차',
      startDate: '2024-09-20',
      endDate: '2024-09-22',
      days: 3,
      reason: '개인 사유로 인한 연차 사용'
    })
  }, null, 2));
  
  console.log('\n📊 4. 문서 상세 조회');
  console.log('GET http://localhost:3000/api/approval/documents/{documentId}');
  console.log('Authorization: Bearer [JWT_TOKEN]');
  
  console.log('\n📋 5. 결재 대기 목록');
  console.log('GET http://localhost:3000/api/approval/pending?page=1&size=10');
  console.log('Authorization: Bearer [JWT_TOKEN]');
  
  console.log('\n📄 6. 내 문서 목록');
  console.log('GET http://localhost:3000/api/approval/my-documents?page=1&size=10');
  console.log('Authorization: Bearer [JWT_TOKEN]');
  
  console.log('\n✅ 7. 결재 승인');
  console.log('POST http://localhost:3000/api/approval/documents/{documentId}/process');
  console.log('Authorization: Bearer [JWT_TOKEN]');
  console.log('Content-Type: application/json');
  console.log(JSON.stringify({
    action: 'APPROVE',
    comment: '승인합니다.'
  }, null, 2));
  
  console.log('\n❌ 8. 결재 반려');
  console.log('POST http://localhost:3000/api/approval/documents/{documentId}/process');
  console.log('Authorization: Bearer [JWT_TOKEN]');
  console.log('Content-Type: application/json');
  console.log(JSON.stringify({
    action: 'REJECT',
    comment: '추가 검토 필요'
  }, null, 2));

  console.log('\n💡 중요 참고사항:');
  console.log('• JWT 토큰은 로그인 후 받은 토큰을 사용하세요');
  console.log('• documentId는 문서 생성 후 받은 ID를 사용하세요');
  console.log('• formId는 결재 양식 목록에서 확인하세요');
  console.log('• 모든 API는 JWT 인증이 필요합니다');
}

// 스크립트 실행 모드 확인
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--guide')) {
    printPostmanGuide();
  } else {
    runAllTests();
  }
}

module.exports = { 
  runAllTests, 
  printPostmanGuide,
  testAuthentication,
  testGetApprovalForms,
  testCreateApprovalDocument,
  testGetDocumentDetails,
  testProcessApproval
};