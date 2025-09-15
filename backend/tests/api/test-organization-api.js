/**
 * 조직도 API 테스트 스크립트
 * @description 조직도 관련 API들의 기능을 테스트
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

async function testOrganizationAPI() {
  try {
    console.log('🧪 조직도 API 테스트 시작...\n');
    
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
    
    // 2. 조직도 조회 테스트
    console.log('\n📌 2. 조직도 계층구조 조회 테스트');
    try {
      const response = await axios.get(`${BASE_URL}/api/organization/tree`, { headers });
      console.log('✅ 조직도 조회 성공');
      console.log('📊 응답 구조:');
      console.log(`  - 성공 여부: ${response.data.success}`);
      console.log(`  - 메시지: ${response.data.message}`);
      console.log(`  - 총 개수: ${response.data.data?.totalCount || 0}`);
      
      if (response.data.data?.tree && response.data.data.tree.length > 0) {
        console.log('🏗️ 조직도 구조:');
        
        const printTree = (node, depth = 0) => {
          const indent = '  '.repeat(depth);
          const typeIcon = {
            'company': '🏢',
            'worksite': '🏬', 
            'department': '📁',
            'position': '👔'
          }[node.type] || '📋';
          
          console.log(`${indent}${typeIcon} ${node.name} (${node.code}) - ${node.type}`);
          
          if (node.children && node.children.length > 0) {
            node.children.forEach(child => printTree(child, depth + 1));
          }
        };
        
        response.data.data.tree.forEach(company => printTree(company));
      }
    } catch (error) {
      console.log('❌ 조직도 조회 실패:', error.response?.data?.message || error.message);
      console.log('📋 응답 상태:', error.response?.status);
      console.log('📋 응답 데이터:', JSON.stringify(error.response?.data, null, 2));
    }
    
    // 3. 회사 등록 테스트
    console.log('\n📌 3. 회사 등록 테스트');
    try {
      const newCompanyData = {
        companyCode: 'TEST001',
        companyName: '테스트 회사',
        companyNameEng: 'Test Company',
        businessNumber: '999-88-77666',
        ceoName: '김테스트',
        establishDate: '2024-01-01',
        address: '서울특별시 테스트구 테스트로 999',
        phoneNumber: '02-9999-8888',
        email: 'test@testcompany.com',
        industry: '테스트업'
      };
      
      const response = await axios.post(`${BASE_URL}/api/organization/companies`, newCompanyData, { headers });
      console.log('✅ 회사 등록 성공');
      console.log('📊 등록 결과:');
      console.log(`  - 회사 ID: ${response.data.data?.companyId}`);
      console.log(`  - 회사 코드: ${response.data.data?.companyCode}`);
      console.log(`  - 회사명: ${response.data.data?.companyName}`);
      console.log(`  - 메시지: ${response.data.message}`);
    } catch (error) {
      console.log('❌ 회사 등록 실패:', error.response?.data?.message || error.message);
      console.log('📋 응답 상태:', error.response?.status);
      
      // 중복 오류인 경우 정상으로 처리
      if (error.response?.data?.message?.includes('이미 존재')) {
        console.log('ℹ️ 이미 등록된 회사 코드입니다. (정상)');
      }
    }
    
    // 4. 인증 없이 접근 테스트
    console.log('\n📌 4. 인증 없이 접근 테스트');
    try {
      const response = await axios.get(`${BASE_URL}/api/organization/tree`);
      console.log('❌ 인증 없이 접근이 허용되었습니다. (보안 문제)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ 인증 없이 접근이 차단되었습니다. (정상)');
        console.log(`  - 응답 메시지: ${error.response.data?.message}`);
      } else {
        console.log('❓ 예상과 다른 오류:', error.message);
      }
    }
    
    console.log('\n🏁 조직도 API 테스트 완료!');
    
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

testOrganizationAPI();