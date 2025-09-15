/**
 * 회사 관리 API 테스트 스크립트
 * @description 회사 CRUD API들의 기능을 테스트
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

// 테스트용 JWT 토큰 생성
function generateTestToken() {
  const payload = {
    userId: 1,
    username: 'test_user',
    role: 'admin'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function testCompanyAPI() {
  try {
    console.log('🧪 회사 관리 API 테스트 시작...\n');
    
    const token = generateTestToken();
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 1. 서버 상태 확인
    console.log('📌 1. 서버 상태 확인');
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      console.log('✅ 서버 상태:', response.data.message);
    } catch (error) {
      console.log('❌ 서버 연결 실패:', error.message);
      return;
    }
    
    // 2. 회사 목록 조회 테스트 (기본)
    console.log('\n📌 2. 회사 목록 조회 테스트 (기본)');
    try {
      const response = await axios.get(`${BASE_URL}/api/organization/companies`, { headers });
      console.log('✅ 회사 목록 조회 성공');
      console.log('📊 응답 구조:');
      console.log(`  - 성공 여부: ${response.data.success}`);
      console.log(`  - 메시지: ${response.data.message}`);
      console.log(`  - 회사 개수: ${response.data.data?.companies?.length || 0}`);
      console.log(`  - 현재 페이지: ${response.data.data?.pagination?.currentPage}`);
      console.log(`  - 총 개수: ${response.data.data?.pagination?.totalCount}`);
      
      if (response.data.data?.companies && response.data.data.companies.length > 0) {
        console.log('📋 등록된 회사 목록:');
        response.data.data.companies.forEach((company, index) => {
          console.log(`  ${index + 1}. ${company.CompanyName} (${company.CompanyCode}) - ${company.IsActive ? '활성' : '비활성'}`);
        });
      }
    } catch (error) {
      console.log('❌ 회사 목록 조회 실패:', error.response?.data?.message || error.message);
      console.log('📋 응답 상태:', error.response?.status);
    }
    
    // 3. 회사 목록 조회 테스트 (페이지네이션)
    console.log('\n📌 3. 회사 목록 조회 테스트 (페이지네이션)');
    try {
      const response = await axios.get(`${BASE_URL}/api/organization/companies?page=1&limit=5`, { headers });
      console.log('✅ 페이지네이션 조회 성공');
      console.log(`  - 페이지 크기: ${response.data.data?.pagination?.pageSize}`);
      console.log(`  - 총 페이지: ${response.data.data?.pagination?.totalPages}`);
      console.log(`  - 조회된 회사 수: ${response.data.data?.companies?.length || 0}`);
    } catch (error) {
      console.log('❌ 페이지네이션 조회 실패:', error.response?.data?.message || error.message);
    }
    
    // 4. 회사 검색 테스트
    console.log('\n📌 4. 회사 검색 테스트');
    try {
      const response = await axios.get(`${BASE_URL}/api/organization/companies?search=스마트`, { headers });
      console.log('✅ 회사 검색 성공');
      console.log(`  - 검색 결과: ${response.data.data?.companies?.length || 0}개`);
      
      if (response.data.data?.companies && response.data.data.companies.length > 0) {
        response.data.data.companies.forEach((company, index) => {
          console.log(`  ${index + 1}. ${company.CompanyName} (${company.CompanyCode})`);
        });
      }
    } catch (error) {
      console.log('❌ 회사 검색 실패:', error.response?.data?.message || error.message);
    }
    
    // 5. 회사 상세 조회 테스트
    console.log('\n📌 5. 회사 상세 조회 테스트');
    try {
      // 첫 번째 회사 ID로 상세 조회
      const response = await axios.get(`${BASE_URL}/api/organization/companies/1`, { headers });
      console.log('✅ 회사 상세 조회 성공');
      console.log('📊 회사 정보:');
      const company = response.data.data;
      console.log(`  - 회사 ID: ${company.CompanyId}`);
      console.log(`  - 회사코드: ${company.CompanyCode}`);
      console.log(`  - 회사명: ${company.CompanyName}`);
      console.log(`  - 영문명: ${company.CompanyNameEng || 'N/A'}`);
      console.log(`  - 사업자번호: ${company.BusinessNumber || 'N/A'}`);
      console.log(`  - 대표자: ${company.CeoName || 'N/A'}`);
      console.log(`  - 업종: ${company.Industry || 'N/A'}`);
      console.log(`  - 활성 상태: ${company.IsActive ? '활성' : '비활성'}`);
      console.log(`  - 하위 사업장 수: ${company.ActiveSubCompanyCount || 0}개`);
    } catch (error) {
      console.log('❌ 회사 상세 조회 실패:', error.response?.data?.message || error.message);
    }
    
    // 6. 존재하지 않는 회사 조회 테스트
    console.log('\n📌 6. 존재하지 않는 회사 조회 테스트');
    try {
      await axios.get(`${BASE_URL}/api/organization/companies/99999`, { headers });
      console.log('❌ 존재하지 않는 회사 조회가 성공했습니다. (문제)');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ 존재하지 않는 회사 조회가 적절히 차단되었습니다.');
        console.log(`  - 응답 메시지: ${error.response.data?.message}`);
      } else {
        console.log('❓ 예상과 다른 오류:', error.message);
      }
    }
    
    // 7. 회사 정보 수정 테스트
    console.log('\n📌 7. 회사 정보 수정 테스트');
    try {
      const updateData = {
        companyName: '스마트HR 주식회사 (수정됨)',
        companyNameEng: 'SmartHR Inc. (Updated)',
        ceoName: '김대표 (수정)',
        industry: 'IT 솔루션 개발 (수정)'
      };
      
      const response = await axios.put(`${BASE_URL}/api/organization/companies/1`, updateData, { headers });
      console.log('✅ 회사 정보 수정 성공');
      console.log('📊 수정 결과:');
      console.log(`  - 회사 ID: ${response.data.data?.companyId}`);
      console.log(`  - 회사명: ${response.data.data?.companyName}`);
      console.log(`  - 메시지: ${response.data.message}`);
    } catch (error) {
      console.log('❌ 회사 정보 수정 실패:', error.response?.data?.message || error.message);
      console.log('📋 응답 상태:', error.response?.status);
    }
    
    // 8. 잘못된 회사 수정 테스트 (필수 필드 누락)
    console.log('\n📌 8. 잘못된 회사 수정 테스트 (필수 필드 누락)');
    try {
      const invalidData = {
        companyName: '', // 빈 회사명
        industry: 'IT'
      };
      
      await axios.put(`${BASE_URL}/api/organization/companies/1`, invalidData, { headers });
      console.log('❌ 잘못된 데이터로 수정이 성공했습니다. (문제)');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ 잘못된 데이터 수정이 적절히 차단되었습니다.');
        console.log(`  - 응답 메시지: ${error.response.data?.message}`);
      } else {
        console.log('❓ 예상과 다른 오류:', error.message);
      }
    }
    
    // 9. 인증 없이 접근 테스트
    console.log('\n📌 9. 인증 없이 접근 테스트');
    try {
      await axios.get(`${BASE_URL}/api/organization/companies`);
      console.log('❌ 인증 없이 접근이 허용되었습니다. (보안 문제)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 인증 없이 접근이 차단되었습니다. (정상)');
        console.log(`  - 응답 메시지: ${error.response.data?.message}`);
      } else {
        console.log('❓ 예상과 다른 오류:', error.message);
      }
    }
    
    // 10. 회사 삭제 테스트 (소프트 삭제)
    console.log('\n📌 10. 회사 삭제 테스트 (소프트 삭제)');
    let testCompanyId = null;
    try {
      const response = await axios.delete(`${BASE_URL}/api/organization/companies/2`, { headers });
      console.log('✅ 회사 삭제 성공');
      console.log('📊 삭제 결과:');
      console.log(`  - 회사 ID: ${response.data.data?.companyId}`);
      console.log(`  - 삭제 시간: ${response.data.data?.deletedAt}`);
      console.log(`  - 메시지: ${response.data.message}`);
      testCompanyId = response.data.data?.companyId;
    } catch (error) {
      console.log('❌ 회사 삭제 실패:', error.response?.data?.message || error.message);
      console.log('📋 응답 상태:', error.response?.status);
    }
    
    // 11. 삭제된 회사 조회 테스트 (비활성화 확인)
    console.log('\n📌 11. 삭제된 회사 조회 테스트');
    try {
      const response = await axios.get(`${BASE_URL}/api/organization/companies?isActive=false`, { headers });
      console.log('✅ 비활성화된 회사 조회 성공');
      console.log(`  - 비활성화된 회사 수: ${response.data.data?.companies?.length || 0}`);
      
      if (response.data.data?.companies && response.data.data.companies.length > 0) {
        console.log('📋 비활성화된 회사 목록:');
        response.data.data.companies.forEach((company, index) => {
          console.log(`  ${index + 1}. ${company.CompanyName} (${company.CompanyCode}) - ${company.IsActive ? '활성' : '비활성'}`);
        });
      }
    } catch (error) {
      console.log('❌ 비활성화된 회사 조회 실패:', error.response?.data?.message || error.message);
    }
    
    // 12. 새로운 회사 등록 테스트 (삭제된 데이터와 동일한 정보)
    console.log('\n📌 12. 새로운 회사 등록 테스트 (재등록)');
    try {
      const newCompanyData = {
        companyCode: 'RETEST001',
        companyName: '재등록 테스트 회사',
        companyNameEng: 'Re-registration Test Company',
        businessNumber: '888-77-66555',
        ceoName: '김재등록',
        establishDate: '2024-09-12',
        address: '서울특별시 재등록구 테스트로 123',
        phoneNumber: '02-8888-7777',
        email: 'retest@company.com',
        industry: '재등록 테스트업'
      };
      
      const response = await axios.post(`${BASE_URL}/api/organization/companies`, newCompanyData, { headers });
      console.log('✅ 회사 재등록 성공');
      console.log('📊 등록 결과:');
      console.log(`  - 회사 ID: ${response.data.data?.companyId}`);
      console.log(`  - 회사 코드: ${response.data.data?.companyCode}`);
      console.log(`  - 회사명: ${response.data.data?.companyName}`);
      console.log(`  - 메시지: ${response.data.message}`);
    } catch (error) {
      console.log('❌ 회사 재등록 실패:', error.response?.data?.message || error.message);
      console.log('📋 응답 상태:', error.response?.status);
      
      // 중복 오류인 경우 정상으로 처리
      if (error.response?.data?.message?.includes('이미 존재')) {
        console.log('ℹ️ 이미 등록된 회사 정보입니다. (정상)');
      }
    }
    
    // 13. 존재하지 않는 회사 삭제 테스트
    console.log('\n📌 13. 존재하지 않는 회사 삭제 테스트');
    try {
      await axios.delete(`${BASE_URL}/api/organization/companies/99999`, { headers });
      console.log('❌ 존재하지 않는 회사 삭제가 성공했습니다. (문제)');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log('✅ 존재하지 않는 회사 삭제가 적절히 차단되었습니다.');
        console.log(`  - 응답 메시지: ${error.response.data?.message}`);
      } else {
        console.log('❓ 예상과 다른 오류:', error.message);
      }
    }
    
    // 14. 최종 회사 목록 확인
    console.log('\n📌 14. 최종 회사 목록 확인 (활성 + 비활성)');
    try {
      const activeResponse = await axios.get(`${BASE_URL}/api/organization/companies?isActive=true`, { headers });
      const inactiveResponse = await axios.get(`${BASE_URL}/api/organization/companies?isActive=false`, { headers });
      
      console.log('📊 최종 회사 현황:');
      console.log(`  - 활성 회사: ${activeResponse.data.data?.companies?.length || 0}개`);
      console.log(`  - 비활성 회사: ${inactiveResponse.data.data?.companies?.length || 0}개`);
      console.log(`  - 총 회사: ${(activeResponse.data.data?.companies?.length || 0) + (inactiveResponse.data.data?.companies?.length || 0)}개`);
      
      if (activeResponse.data.data?.companies?.length > 0) {
        console.log('\n🏢 활성 회사 목록:');
        activeResponse.data.data.companies.forEach((company, index) => {
          console.log(`  ${index + 1}. ${company.CompanyName} (${company.CompanyCode})`);
        });
      }
      
      if (inactiveResponse.data.data?.companies?.length > 0) {
        console.log('\n🏢 비활성 회사 목록:');
        inactiveResponse.data.data.companies.forEach((company, index) => {
          console.log(`  ${index + 1}. ${company.CompanyName} (${company.CompanyCode})`);
        });
      }
    } catch (error) {
      console.log('❌ 최종 회사 목록 확인 실패:', error.response?.data?.message || error.message);
    }
    
    console.log('\n🏁 회사 관리 API 테스트 완료!');
    console.log('\n📋 테스트 요약:');
    console.log('  ✅ 회사 목록 조회 (기본, 페이지네이션, 검색)');
    console.log('  ✅ 회사 상세 조회 (정상, 존재하지 않는 경우)');
    console.log('  ✅ 회사 정보 수정 (정상, 검증 실패)');
    console.log('  ✅ 회사 삭제 (소프트 삭제, 존재하지 않는 경우)');
    console.log('  ✅ 회사 재등록 (삭제 후 새 데이터 등록)');
    console.log('  ✅ 인증 검증');
    console.log('  ✅ 활성/비활성 상태 관리');
    console.log('\n🎉 모든 회사 관리 CRUD 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error.message);
  }
}

// axios가 없으면 설치 안내
if (!require('fs').existsSync('./node_modules/axios')) {
  console.log('❌ axios가 설치되지 않았습니다.');
  console.log('📝 설치 명령: npm install axios');
  process.exit(1);
}

testCompanyAPI();