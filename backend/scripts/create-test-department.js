/**
 * 테스트용 부서 생성 스크립트
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function createTestDepartment() {
  try {
    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: 1, username: 'test_user', role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // API 클라이언트 생성
    const apiClient = axios.create({
      baseURL: 'http://localhost:3000/api/organization',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('🏢 테스트용 부서 생성 중...');

    // 1. 활성 사업장 조회
    console.log('1. 활성 사업장 조회 중...');
    const subcompanyResponse = await apiClient.get('/subcompanies?isActive=true&pageSize=1');
    
    console.log('사업장 응답:', JSON.stringify(subcompanyResponse.data, null, 2));
    
    if (!subcompanyResponse.data.success || !subcompanyResponse.data.data || !subcompanyResponse.data.data.subCompanies || subcompanyResponse.data.data.subCompanies.length === 0) {
      console.log('❌ 활성 사업장이 없습니다. 사업장을 먼저 생성해주세요.');
      return;
    }

    const subCompanyId = subcompanyResponse.data.data.subCompanies[0].SubCompanyId;
    console.log(`✅ 활성 사업장 발견: ${subcompanyResponse.data.data.subCompanies[0].SubCompanyName} (ID: ${subCompanyId})`);

    // 2. 테스트 부서 생성
    console.log('2. 테스트 부서 생성 중...');
    const timestamp = Date.now();
    const deptData = {
      subCompanyId: subCompanyId,
      deptCode: `TEST${timestamp}`,
      deptName: `테스트부서${timestamp}`,
      deptNameEng: `TestDept${timestamp}`,
      deptType: '본부',
      deptLevel: 1,
      parentDeptId: null,
      location: '본사 1층',
      purpose: '직책 API 테스트용 부서'
    };

    const createResponse = await apiClient.post('/departments', deptData);
    
    if (createResponse.data.success) {
      console.log(`✅ 테스트 부서 생성 성공: ${createResponse.data.data.deptName} (ID: ${createResponse.data.data.deptId})`);
      return createResponse.data.data.deptId;
    } else {
      console.log(`❌ 부서 생성 실패: ${createResponse.data.message}`);
    }

  } catch (error) {
    console.error('❌ 테스트 부서 생성 실패:', error.response?.data?.message || error.message);
  }
}

createTestDepartment();