/**
 * 인증 API 테스트 스크립트
 */

const axios = require('axios');

// 서버 설정
const BASE_URL = 'http://localhost:3000';

// 테스트용 계정 정보
const testAccounts = [
  {
    email: 'admin@smarthr.com',
    password: 'admin123!',
    description: '시스템 관리자'
  },
  {
    email: 'hr@smarthr.com',
    password: 'admin123!',
    description: '인사팀 관리자'
  },
  {
    email: 'employee1@smarthr.com',
    password: 'employee123!',
    description: '테스트 직원1'
  },
  {
    email: 'employee2@smarthr.com',
    password: 'employee123!',
    description: '테스트 직원2'
  }
];

/**
 * 로그인 테스트
 */
async function testLogin(account) {
  try {
    console.log(`\n🔄 로그인 테스트: ${account.description} (${account.email})`);
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: account.email,
      password: account.password
    });

    if (response.data.success) {
      console.log('✅ 로그인 성공');
      console.log(`   👤 사용자: ${response.data.data.user.fullName}`);
      console.log(`   🏢 역할: ${response.data.data.user.role}`);
      console.log(`   🔑 토큰: ${response.data.data.accessToken.substring(0, 20)}...`);
      
      return response.data.data.accessToken;
    } else {
      console.log('❌ 로그인 실패:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 로그인 오류:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 사용자 정보 조회 테스트
 */
async function testGetMe(token) {
  try {
    console.log('\n🔄 사용자 정보 조회 테스트');
    
    const response = await axios.get(`${BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('✅ 사용자 정보 조회 성공');
      console.log(`   👤 ID: ${response.data.data.employeeId}`);
      console.log(`   📧 이메일: ${response.data.data.email}`);
      console.log(`   🏢 역할: ${response.data.data.role}`);
    } else {
      console.log('❌ 사용자 정보 조회 실패:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 사용자 정보 조회 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 토큰 갱신 테스트
 */
async function testRefreshToken(refreshToken) {
  try {
    console.log('\n🔄 토큰 갱신 테스트');
    
    const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
      refreshToken: refreshToken
    });

    if (response.data.success) {
      console.log('✅ 토큰 갱신 성공');
      console.log(`   🔑 새 토큰: ${response.data.data.accessToken.substring(0, 20)}...`);
      return response.data.data.accessToken;
    } else {
      console.log('❌ 토큰 갱신 실패:', response.data.message);
      return null;
    }
  } catch (error) {
    console.log('❌ 토큰 갱신 오류:', error.response?.data?.message || error.message);
    return null;
  }
}

/**
 * 로그아웃 테스트
 */
async function testLogout(token) {
  try {
    console.log('\n🔄 로그아웃 테스트');
    
    const response = await axios.post(`${BASE_URL}/api/auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      console.log('✅ 로그아웃 성공');
      console.log(`   📝 메시지: ${response.data.message}`);
    } else {
      console.log('❌ 로그아웃 실패:', response.data.message);
    }
  } catch (error) {
    console.log('❌ 로그아웃 오류:', error.response?.data?.message || error.message);
  }
}

/**
 * 잘못된 로그인 테스트
 */
async function testInvalidLogin() {
  try {
    console.log('\n🔄 잘못된 로그인 테스트');
    
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@smarthr.com',
      password: 'wrongpassword'
    });

    console.log('❌ 예상과 다른 결과:', response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ 잘못된 로그인 올바르게 차단됨');
      console.log(`   📝 메시지: ${error.response.data.message}`);
    } else {
      console.log('❌ 예상과 다른 오류:', error.response?.data?.message || error.message);
    }
  }
}

/**
 * 전체 테스트 실행
 */
async function runAllTests() {
  console.log('🚀 인증 API 테스트 시작');
  console.log('='.repeat(50));

  // 서버 연결 확인
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ 서버 연결 확인 완료');
  } catch (error) {
    console.log('❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
    return;
  }

  // 1. 첫 번째 계정으로 전체 플로우 테스트
  const firstAccount = testAccounts[0];
  let token = await testLogin(firstAccount);
  
  if (token) {
    // 로그인 응답에서 refreshToken 추출 (실제로는 로그인 응답에 포함되어야 함)
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: firstAccount.email,
      password: firstAccount.password
    });
    
    const refreshToken = loginResponse.data.data.refreshToken;
    
    await testGetMe(token);
    
    if (refreshToken) {
      token = await testRefreshToken(refreshToken);
    }
    
    await testLogout(token);
  }

  // 2. 다른 계정들로 간단 로그인 테스트
  for (let i = 1; i < testAccounts.length; i++) {
    const account = testAccounts[i];
    await testLogin(account);
  }

  // 3. 잘못된 로그인 테스트
  await testInvalidLogin();

  console.log('\n' + '='.repeat(50));
  console.log('🏁 인증 API 테스트 완료');
}

// 테스트 실행
runAllTests().catch(console.error);