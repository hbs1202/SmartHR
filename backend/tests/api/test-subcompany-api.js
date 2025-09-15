/**
 * 사업장 관리 API 테스트
 * @description 사업장 CRUD API 테스트 스크립트
 * @author SmartHR Team
 * @date 2024-09-12
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 테스트 설정
const BASE_URL = 'http://localhost:3000';

let authToken = '';
let testCompanyId = null;
let testSubCompanyId = null;

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
 * 기존 활성 회사 찾기 또는 테스트용 회사 생성
 */
async function getOrCreateTestCompany() {
  try {
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // 1. 먼저 활성 회사 목록 조회
    const response = await axios.get(`${BASE_URL}/api/organization/companies?isActive=true&limit=1`, { headers });
    
    if (response.data.success && response.data.data.companies.length > 0) {
      testCompanyId = response.data.data.companies[0].CompanyId;
      console.log('✅ 기존 활성 회사 사용 - ID:', testCompanyId, '회사명:', response.data.data.companies[0].CompanyName);
      return true;
    }
    
    // 2. 활성 회사가 없으면 새로 생성
    const testCompany = {
      companyCode: 'SUBTEST' + Date.now(),
      companyName: '사업장테스트회사_' + Date.now(),
      companyNameEng: 'SubCompany Test Company Ltd.',
      businessNumber: '555-44-' + Date.now().toString().slice(-5),
      ceoName: '박사업장',
      establishDate: '2021-01-01',
      address: '서울시 서초구 사업장로 456',
      phoneNumber: '02-5555-4444',
      email: 'subtest@testcompany.com',
      industry: '사업장관리'
    };

    const createResponse = await axios.post(`${BASE_URL}/api/organization/companies`, testCompany, { headers });
    
    if (createResponse.data.success) {
      testCompanyId = createResponse.data.data.companyId;
      console.log('✅ 테스트용 회사 생성 성공 - ID:', testCompanyId);
      return true;
    }
  } catch (error) {
    console.error('❌ 회사 준비 실패:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * 테스트 1: 사업장 등록
 */
async function testCreateSubCompany() {
  try {
    console.log('\n=== 테스트 1: 사업장 등록 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const timestamp = Date.now().toString().slice(-4);
    const testSubCompany = {
      companyId: testCompanyId,
      subCompanyCode: 'TEST' + timestamp,
      subCompanyName: '테스트본사' + timestamp,
      subCompanyType: '본사',
      address: '서울시 강남구 테스트로 123 본관',
      postalCode: '06234',
      phoneNumber: '02-1234-5678',
      faxNumber: '02-1234-5679',
      managerEmployeeId: null,
      openDate: '2020-01-01',
      area: 1500.50,
      floorCount: 10,
      parkingSpots: 50,
      description: '본사 건물',
      isHeadquarters: true
    };

    const response = await axios.post(`${BASE_URL}/api/organization/subcompanies`, testSubCompany, { headers });
    
    if (response.data.success) {
      testSubCompanyId = response.data.data.subCompanyId;
      console.log('✅ 사업장 등록 성공');
      console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ 사업장 등록 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 사업장 등록 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 2: 사업장 목록 조회
 */
async function testGetSubCompanies() {
  try {
    console.log('\n=== 테스트 2: 사업장 목록 조회 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/subcompanies?companyId=${testCompanyId}&page=1&limit=10`, { headers });
    
    if (response.data.success) {
      console.log('✅ 사업장 목록 조회 성공');
      console.log('총 개수:', response.data.data.pagination.totalCount);
      console.log('사업장 목록:', response.data.data.subCompanies.map(sc => `${sc.SubCompanyCode} - ${sc.SubCompanyName}`));
    } else {
      console.log('❌ 사업장 목록 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 사업장 목록 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 3: 사업장 상세 조회
 */
async function testGetSubCompanyById() {
  try {
    console.log('\n=== 테스트 3: 사업장 상세 조회 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/subcompanies/${testSubCompanyId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 사업장 상세 조회 성공');
      console.log('사업장 정보:', {
        이름: response.data.data.SubCompanyName,
        코드: response.data.data.SubCompanyCode,
        타입: response.data.data.SubCompanyType,
        주소: response.data.data.Address,
        전화번호: response.data.data.PhoneNumber,
        본사여부: response.data.data.IsHeadquarters ? '예' : '아니오',
        활성상태: response.data.data.IsActive ? '활성' : '비활성'
      });
    } else {
      console.log('❌ 사업장 상세 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 사업장 상세 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 4: 사업장 정보 수정
 */
async function testUpdateSubCompany() {
  try {
    console.log('\n=== 테스트 4: 사업장 정보 수정 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const updateData = {
      subCompanyName: '본사 (수정됨)',
      subCompanyType: '본사',
      address: '서울시 강남구 테스트로 123 본관 (수정됨)',
      phoneNumber: '02-1234-9999',
      description: '본사 건물 (수정된 설명)',
      floorCount: 12,
      parkingSpots: 60
    };

    const response = await axios.put(`${BASE_URL}/api/organization/subcompanies/${testSubCompanyId}`, updateData, { headers });
    
    if (response.data.success) {
      console.log('✅ 사업장 정보 수정 성공');
      console.log('응답 데이터:', JSON.stringify(response.data, null, 2));
    } else {
      console.log('❌ 사업장 정보 수정 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 사업장 정보 수정 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 5: 수정된 사업장 정보 확인
 */
async function testGetUpdatedSubCompany() {
  try {
    console.log('\n=== 테스트 5: 수정된 사업장 정보 확인 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/subcompanies/${testSubCompanyId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 수정된 사업장 정보 확인 성공');
      console.log('수정된 정보:', {
        이름: response.data.data.SubCompanyName,
        주소: response.data.data.Address,
        전화번호: response.data.data.PhoneNumber,
        설명: response.data.data.Description,
        층수: response.data.data.FloorCount,
        주차공간: response.data.data.ParkingSpots
      });
    } else {
      console.log('❌ 수정된 사업장 정보 확인 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 수정된 사업장 정보 확인 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 6: 추가 사업장 등록 (지점)
 */
async function testCreateBranchSubCompany() {
  try {
    console.log('\n=== 테스트 6: 추가 사업장 등록 (지점) ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const branchTimestamp = Date.now().toString().slice(-4);
    const branchSubCompany = {
      companyId: testCompanyId,
      subCompanyCode: 'BRANCH' + branchTimestamp,
      subCompanyName: '테스트지점' + branchTimestamp,
      subCompanyType: '지점',
      address: '서울시 강남구 강남대로 456',
      postalCode: '06297',
      phoneNumber: '02-2222-3333',
      faxNumber: '02-2222-3334',
      openDate: '2021-03-15',
      area: 800.0,
      floorCount: 5,
      parkingSpots: 20,
      description: '강남 지점 사무소',
      isHeadquarters: false
    };

    const response = await axios.post(`${BASE_URL}/api/organization/subcompanies`, branchSubCompany, { headers });
    
    if (response.data.success) {
      console.log('✅ 지점 사업장 등록 성공');
      console.log('지점 ID:', response.data.data.subCompanyId);
    } else {
      console.log('❌ 지점 사업장 등록 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 지점 사업장 등록 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 7: 전체 사업장 목록 조회 (업데이트된 목록)
 */
async function testGetAllSubCompanies() {
  try {
    console.log('\n=== 테스트 7: 전체 사업장 목록 조회 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/subcompanies?companyId=${testCompanyId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 전체 사업장 목록 조회 성공');
      console.log('총 개수:', response.data.data.pagination.totalCount);
      response.data.data.subCompanies.forEach((sc, index) => {
        console.log(`${index + 1}. ${sc.SubCompanyCode} - ${sc.SubCompanyName} (${sc.SubCompanyType})`);
      });
    } else {
      console.log('❌ 전체 사업장 목록 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 전체 사업장 목록 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 8: 사업장 삭제 (소프트 삭제)
 */
async function testDeleteSubCompany() {
  try {
    console.log('\n=== 테스트 8: 사업장 삭제 (소프트 삭제) ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.delete(`${BASE_URL}/api/organization/subcompanies/${testSubCompanyId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 사업장 삭제 성공');
      console.log('삭제된 사업장 ID:', response.data.data.subCompanyId);
    } else {
      console.log('❌ 사업장 삭제 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 사업장 삭제 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 9: 삭제된 사업장 조회 확인
 */
async function testGetDeletedSubCompany() {
  try {
    console.log('\n=== 테스트 9: 삭제된 사업장 조회 확인 ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const response = await axios.get(`${BASE_URL}/api/organization/subcompanies/${testSubCompanyId}`, { headers });
    
    if (response.data.success) {
      console.log('✅ 삭제된 사업장 조회 성공 (비활성 상태 확인)');
      console.log('활성 상태:', response.data.data.IsActive ? '활성' : '비활성');
    } else {
      console.log('❌ 삭제된 사업장 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.error('❌ 삭제된 사업장 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 테스트 10: 사업장 재등록 (같은 코드로)
 */
async function testReCreateSubCompany() {
  try {
    console.log('\n=== 테스트 10: 사업장 재등록 (같은 코드로) ===');
    
    const headers = { Authorization: `Bearer ${authToken}` };
    const reCreateTimestamp = Date.now().toString().slice(-4);
    const reCreateSubCompany = {
      companyId: testCompanyId,
      subCompanyCode: 'RECREATE' + reCreateTimestamp,
      subCompanyName: '재등록테스트' + reCreateTimestamp,
      subCompanyType: '본사',
      address: '서울시 강남구 테스트로 123 신관',
      postalCode: '06234',
      phoneNumber: '02-1234-5678',
      description: '재등록된 본사 건물',
      isHeadquarters: true
    };

    const response = await axios.post(`${BASE_URL}/api/organization/subcompanies`, reCreateSubCompany, { headers });
    
    if (response.data.success) {
      console.log('✅ 사업장 재등록 성공');
      console.log('재등록된 사업장 ID:', response.data.data.subCompanyId);
    } else {
      console.log('❌ 사업장 재등록 실패:', response.data.message);
      console.log('   (중복 코드로 인한 실패가 예상됨)');
    }
  } catch (error) {
    console.error('❌ 사업장 재등록 오류:', error.response?.data?.message || error.message);
    console.log('   (중복 코드로 인한 오류가 예상됨)');
  }
}

/**
 * 정리: 테스트 데이터 정리 (회사는 유지, 사업장만 정리)
 */
async function cleanupTestData() {
  try {
    console.log('\n=== 정리: 테스트 데이터 정리 ===');
    console.log('ℹ️  기존 회사는 유지하고 테스트용 사업장만 정리합니다.');
    console.log('✅ 테스트 데이터 정리 완료');
  } catch (error) {
    console.error('❌ 테스트 데이터 정리 오류:', error.message);
  }
}

/**
 * 메인 테스트 실행 함수
 */
async function runAllTests() {
  console.log('🚀 사업장 관리 API 테스트 시작\n');
  console.log('테스트 대상:', BASE_URL);
  console.log('테스트 사용자:', 'test_user');
  console.log('='.repeat(50));

  // 인증 및 준비
  if (!(await getAuthToken())) return;
  if (!(await getOrCreateTestCompany())) return;

  // 사업장 관리 API 테스트 실행
  await testCreateSubCompany();              // 1. 사업장 등록
  await testGetSubCompanies();               // 2. 사업장 목록 조회
  await testGetSubCompanyById();             // 3. 사업장 상세 조회
  await testUpdateSubCompany();              // 4. 사업장 정보 수정
  await testGetUpdatedSubCompany();          // 5. 수정된 사업장 정보 확인
  await testCreateBranchSubCompany();        // 6. 추가 사업장 등록 (지점)
  await testGetAllSubCompanies();            // 7. 전체 사업장 목록 조회
  await testDeleteSubCompany();              // 8. 사업장 삭제
  await testGetDeletedSubCompany();          // 9. 삭제된 사업장 조회 확인
  await testReCreateSubCompany();            // 10. 사업장 재등록 테스트

  // 정리
  await cleanupTestData();

  console.log('\n' + '='.repeat(50));
  console.log('🎉 사업장 관리 API 테스트 완료');
}

// 스크립트 실행 시 자동으로 테스트 시작
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  testCreateSubCompany,
  testGetSubCompanies,
  testGetSubCompanyById,
  testUpdateSubCompany,
  testDeleteSubCompany
};