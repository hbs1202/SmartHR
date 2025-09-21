/**
 * 간단한 로그인 테스트
 */

const axios = require('axios');

async function testLogin() {
  try {
    console.log('로그인 테스트 시작...');

    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testadmin@smarthr.com',
      password: 'admin123'
    });

    console.log('응답 상태:', response.status);
    console.log('응답 데이터:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('로그인 오류:', error.response?.data || error.message);
  }
}

testLogin();