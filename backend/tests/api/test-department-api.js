/**
 * 부서 관리 API 테스트
 * @description 부서 CRUD API 테스트 스크립트
 * @author SmartHR Team
 * @date 2024-09-13
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 테스트 설정
const BASE_URL = 'http://localhost:3000';

let authToken = '';
let testSubCompanyId = null;
let testDeptId = null;
let parentDeptId = null;

/**
 * 테스트용 JWT 토큰 생성
 */
function generateTestToken() {
  const payload = {
    userId: 1,
    username: 'test_user',
    role: 'admin'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * 인증 토큰 획득
 */
async function getAuthToken() {
  try {
    authToken = generateTestToken();
    console.log('✅ 인증 토큰 생성 성공');
    return true;
  } catch (error) {
    console.error('❌ 인증 토큰 생성 실패:', error.message);
    return false;
  }
}

/**
 * 기존 활성 사업장 찾기
 */
async function getActiveSubCompany() {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    const response = await axios.get(`${BASE_URL}/api/organization/subcompanies?isActive=true&limit=1`, { headers });
    
    if (response.data.success && response.data.data.subCompanies.length > 0) {
      testSubCompanyId = response.data.data.subCompanies[0].SubCompanyId;
      console.log('✅ 기존 활성 사업장 사용 - ID:', testSubCompanyId, '사업장명:', response.data.data.subCompanies[0].SubCompanyName);
      return true;
    } else {
      console.error('❌ 활성 사업장을 찾을 수 없습니다.');
      return false;
    }
  } catch (error) {
    console.error('❌ 사업장 조회 실패:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 테스트 1: 부서 등록 (상위 부서)
 */
async function testCreateParentDepartment() {
  try {
    console.log('\n=== 테스트 1: 부서 등록 (상위 부서) ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const timestamp = Date.now().toString().slice(-4);
    const testDepartment = {
      subCompanyId: testSubCompanyId,
      deptCode: 'DEPT' + timestamp,
      deptName: '테스트부서' + timestamp,
      deptNameEng: 'Test Department ' + timestamp,
      deptType: '본부',
      costCenter: 'CC' + timestamp,
      budget: 1000000,
      phoneNumber: '02-1111-2222',
      extension: '1234',
      email: 'dept' + timestamp + '@company.com',
      location: '본사 3층',
      establishDate: '2024-01-01',
      purpose: '테스트 목적의 부서입니다'
    };

    const response = await axios.post(`${BASE_URL}/api/organization/departments`, testDepartment, { headers });
    
    if (response.data.success) {
      parentDeptId = response.data.data.deptId;
      console.log('✅ 상위 부서 등록 성공');
      console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ 상위 부서 등록 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 상위 부서 등록 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 2: 부서 등록 (하위 부서)
 */
async function testCreateChildDepartment() {
  try {
    console.log('\n=== 테스트 2: 부서 등록 (하위 부서) ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const timestamp = Date.now().toString().slice(-4);
    const childDepartment = {
      subCompanyId: testSubCompanyId,
      deptCode: 'CHILD' + timestamp,
      deptName: '하위부서' + timestamp,
      deptNameEng: 'Child Department ' + timestamp,
      parentDeptId: parentDeptId,
      deptType: '팀',
      costCenter: 'CC_CHILD' + timestamp,
      budget: 500000,
      phoneNumber: '02-2222-3333',
      extension: '2345',
      email: 'child' + timestamp + '@company.com',
      location: '본사 3층 A구역',
      establishDate: '2024-02-01',
      purpose: '상위 부서 산하 하위 부서입니다'
    };

    const response = await axios.post(`${BASE_URL}/api/organization/departments`, childDepartment, { headers });
    
    if (response.data.success) {
      testDeptId = response.data.data.deptId;
      console.log('✅ 하위 부서 등록 성공');
      console.log('하위 부서 ID:', testDeptId);
    } else {
      console.log('❌ 하위 부서 등록 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 하위 부서 등록 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 3: 부서 목록 조회
 */
async function testGetDepartments() {
  try {
    console.log('\n=== 테스트 3: 부서 목록 조회 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/departments?subCompanyId=${testSubCompanyId}&page=1&limit=10`, { headers });
    
    if (response.data.success) {
      console.log('✅ 부서 목록 조회 성공');
      console.log('총 개수:', response.data.data.pagination.totalCount);
      console.log('부서 목록:', response.data.data.departments.map(dept => `${dept.DeptCode} - ${dept.DeptName} (레벨: ${dept.DeptLevel})`));
    } else {
      console.log('❌ 부서 목록 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 부서 목록 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 4: 부서 상세 조회
 */
async function testGetDepartmentById() {
  try {
    console.log('\n=== 테스트 4: 부서 상세 조회 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/departments/${testDeptId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 부서 상세 조회 성공');
      console.log('부서 정보:', {
        이름: response.data.data.DeptName,
        코드: response.data.data.DeptCode,
        타입: response.data.data.DeptType,
        레벨: response.data.data.DeptLevel,
        상위부서: response.data.data.ParentDeptName || '없음',
        사업장: response.data.data.SubCompanyName,
        위치: response.data.data.Location,
        예산: response.data.data.Budget ? response.data.data.Budget.toLocaleString() + '원' : '미설정',
        활성상태: response.data.data.IsActive ? '활성' : '비활성'
      });
    } else {
      console.log('❌ 부서 상세 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 부서 상세 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 5: 부서 정보 수정
 */
async function testUpdateDepartment() {
  try {
    console.log('\n=== 테스트 5: 부서 정보 수정 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const updateData = {
      deptName: '하위부서 (수정됨)',
      deptType: '팀',
      budget: 750000,
      phoneNumber: '02-9999-8888',
      location: '본사 4층 B구역',
      purpose: '수정된 부서 목적입니다'
    };

    const response = await axios.put(`${BASE_URL}/api/organization/departments/${testDeptId}`, updateData, { headers });
    
    if (response.data.success) {
      console.log('✅ 부서 정보 수정 성공');
      console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ 부서 정보 수정 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 부서 정보 수정 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 6: 수정된 부서 정보 확인
 */
async function testGetUpdatedDepartment() {
  try {
    console.log('\n=== 테스트 6: 수정된 부서 정보 확인 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/departments/${testDeptId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 수정된 부서 정보 확인 성공');
      console.log('수정된 정보:', {
        이름: response.data.data.DeptName,
        예산: response.data.data.Budget ? response.data.data.Budget.toLocaleString() + '원' : '미설정',
        전화번호: response.data.data.PhoneNumber,
        위치: response.data.data.Location,
        목적: response.data.data.Purpose
      });
    } else {
      console.log('❌ 수정된 부서 정보 확인 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 수정된 부서 정보 확인 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 7: 계층구조 부서 목록 조회
 */
async function testGetDepartmentHierarchy() {
  try {
    console.log('\n=== 테스트 7: 계층구조 부서 목록 조회 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/departments?subCompanyId=${testSubCompanyId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 계층구조 부서 목록 조회 성공');
      console.log('총 부서 수:', response.data.data.pagination.totalCount);
      
      // 레벨별로 정렬해서 표시
      const departments = response.data.data.departments.sort((a, b) => a.DeptLevel - b.DeptLevel);
      departments.forEach((dept, index) => {
        const indent = '  '.repeat(dept.DeptLevel - 1);
        console.log(`${index + 1}. ${indent}${dept.DeptCode} - ${dept.DeptName} (레벨: ${dept.DeptLevel}, 타입: ${dept.DeptType})`);
      });
    } else {
      console.log('❌ 계층구조 부서 목록 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 계층구조 부서 목록 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 8: 하위 부서 삭제 (소프트 삭제)
 */
async function testDeleteChildDepartment() {
  try {
    console.log('\n=== 테스트 8: 하위 부서 삭제 (소프트 삭제) ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.delete(`${BASE_URL}/api/organization/departments/${testDeptId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 하위 부서 삭제 성공');
      console.log('삭제된 부서 ID:', response.data.data.deptId);
    } else {
      console.log('❌ 하위 부서 삭제 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 하위 부서 삭제 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 9: 삭제된 부서 조회 확인
 */
async function testGetDeletedDepartment() {
  try {
    console.log('\n=== 테스트 9: 삭제된 부서 조회 확인 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/departments/${testDeptId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 삭제된 부서 조회 성공 (비활성 상태 확인)');
      console.log('활성 상태:', response.data.data.IsActive ? '활성' : '비활성');
      console.log('폐쇄 날짜:', response.data.data.CloseDate ? new Date(response.data.data.CloseDate).toLocaleDateString('ko-KR') : '미설정');
    } else {
      console.log('❌ 삭제된 부서 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 삭제된 부서 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 10: 상위 부서 삭제 시도 (실패 예상)
 */
async function testDeleteParentDepartment() {
  try {
    console.log('\n=== 테스트 10: 상위 부서 삭제 시도 (실패 예상) ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.delete(`${BASE_URL}/api/organization/departments/${parentDeptId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 상위 부서 삭제 성공');
    } else {
      console.log('❌ 상위 부서 삭제 실패 (예상됨):', response.data.message);
      console.log('   (하위 부서가 있어서 삭제가 차단된 것이 정상)');
    }
  } catch (error) {
    console.error('❌ 상위 부서 삭제 오류 (예상됨):', error.response?.data?.message || error.message);
    console.log('   (하위 부서가 있어서 삭제가 차단된 것이 정상)');
  }
}

/**
 * 정리: 테스트 데이터 정리
 */
async function cleanupTestData() {
  try {
    console.log('\n=== 정리: 테스트 데이터 정리 ===');
    console.log('ℹ️  테스트용 부서는 비활성화 상태로 유지됩니다.');
    console.log('✅ 테스트 데이터 정리 완료');
  } catch (error) {
    console.error('❌ 테스트 데이터 정리 오류:', error.message);
  }
}

/**
 * 메인 테스트 실행 함수
 */
async function runAllTests() {
  console.log('🚀 부서 관리 API 테스트 시작\n');
  console.log('테스트 대상:', BASE_URL);
  console.log('테스트 사용자:', 'test_user');
  console.log('='.repeat(50));

  // 인증 및 준비
  if (!(await getAuthToken())) return;
  if (!(await getActiveSubCompany())) return;

  // 부서 관리 API 테스트 실행
  await testCreateParentDepartment();        // 1. 상위 부서 등록
  await testCreateChildDepartment();         // 2. 하위 부서 등록
  await testGetDepartments();                // 3. 부서 목록 조회
  await testGetDepartmentById();             // 4. 부서 상세 조회
  await testUpdateDepartment();              // 5. 부서 정보 수정
  await testGetUpdatedDepartment();          // 6. 수정된 부서 정보 확인
  await testGetDepartmentHierarchy();        // 7. 계층구조 부서 목록 조회
  await testDeleteChildDepartment();         // 8. 하위 부서 삭제
  await testGetDeletedDepartment();          // 9. 삭제된 부서 조회 확인
  await testDeleteParentDepartment();        // 10. 상위 부서 삭제 시도

  // 정리
  await cleanupTestData();

  console.log('\n' + '='.repeat(50));
  console.log('🎉 부서 관리 API 테스트 완료');
}

// 스크립트 실행 시 자동으로 테스트 시작
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testCreateParentDepartment,
  testCreateChildDepartment,
  testGetDepartments,
  testGetDepartmentById,
  testUpdateDepartment,
  testDeleteChildDepartment
};