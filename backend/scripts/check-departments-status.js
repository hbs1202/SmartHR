/**
 * 부서 상태 확인 스크립트
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function checkDepartments() {
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

    console.log('🔍 부서 상태 확인 중...');

    // 활성 부서 조회
    const activeResponse = await apiClient.get('/departments?isActive=true&pageSize=50');
    console.log('\n=== 활성 부서 목록 ===');
    if (activeResponse.data.success && activeResponse.data.data.length > 0) {
      activeResponse.data.data.forEach((dept, index) => {
        console.log(`${index + 1}. ID: ${dept.DeptId}, 이름: ${dept.DeptName}, 코드: ${dept.DeptCode}`);
      });
    } else {
      console.log('❌ 활성 부서가 없습니다.');
    }

    // 비활성 부서 조회
    const inactiveResponse = await apiClient.get('/departments?isActive=false&pageSize=50');
    console.log('\n=== 비활성 부서 목록 ===');
    if (inactiveResponse.data.success && inactiveResponse.data.data.length > 0) {
      inactiveResponse.data.data.forEach((dept, index) => {
        console.log(`${index + 1}. ID: ${dept.DeptId}, 이름: ${dept.DeptName}, 코드: ${dept.DeptCode}`);
      });
    } else {
      console.log('❌ 비활성 부서가 없습니다.');
    }

  } catch (error) {
    console.error('❌ 부서 상태 확인 실패:', error.response?.data?.message || error.message);
  }
}

checkDepartments();