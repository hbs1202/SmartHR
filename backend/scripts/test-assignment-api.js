/**
 * 부서 이동 API 테스트 스크립트
 * @description 부서 이동 API와 발령 이력 조회 API를 종합 테스트
 * @author SmartHR Team
 * @date 2024-09-13
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// 테스트 계정 정보
const TEST_ACCOUNTS = {
  admin: { email: 'admin@smarthr.com', password: 'admin123!' },
  manager: { email: 'hr@smarthr.com', password: 'admin123!' },
  employee: { email: 'employee1@smarthr.com', password: 'employee123!' }
};

/**
 * 로그인 함수
 */
const login = async (email, password) => {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password
    });
    return response.data.data.accessToken;
  } catch (error) {
    console.error('❌ 로그인 실패:', error.response?.data?.message || error.message);
    throw error;
  }
};

/**
 * 부서 이동 API 테스트
 */
const testDepartmentTransfer = async (token, employeeId, transferData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/assignments/${employeeId}/transfer`,
      transferData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * 발령 이력 조회 API 테스트
 */
const testAssignmentHistory = async (token, employeeId, params = {}) => {
  try {
    const queryParams = new URLSearchParams(params);
    const response = await axios.get(
      `${BASE_URL}/api/assignments/${employeeId}/history?${queryParams}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw {
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * 조직도 정보 조회 (부서 ID 확인용)
 */
const getOrganizationInfo = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/organization/tree`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data.data;
  } catch (error) {
    console.error('조직도 조회 실패:', error.response?.data?.message || error.message);
    return [];
  }
};

/**
 * 직원 목록 조회 (직원 ID 확인용)
 */
const getEmployees = async (token) => {
  try {
    const response = await axios.get(`${BASE_URL}/api/employees?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data.data.employees;
  } catch (error) {
    console.error('직원 목록 조회 실패:', error.response?.data?.message || error.message);
    return [];
  }
};

/**
 * 메인 테스트 함수
 */
const runAssignmentTests = async () => {
  console.log('🚀 부서 이동 API 테스트 시작');
  console.log('==================================================');

  try {
    // 1. 서버 연결 확인
    console.log('✅ 서버 연결 확인 중...');
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ 서버 연결 확인 완료');

    // 2. 관리자 로그인
    console.log('\n🔑 관리자 로그인 중...');
    const adminToken = await login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    console.log('✅ 관리자 로그인 성공');

    // 3. 직원 목록 조회 (테스트 대상 직원 확인)
    console.log('\n📋 직원 목록 조회 중...');
    const employees = await getEmployees(adminToken);
    console.log(`✅ 직원 목록 조회 성공: ${employees.length}명`);
    
    if (employees.length === 0) {
      throw new Error('테스트할 직원이 없습니다.');
    }

    // 테스트 대상 직원 (첫 번째 employee 권한 직원)
    console.log('📋 직원 데이터 상세:');
    employees.forEach(emp => {
      console.log(`   - ${emp.fullName} (ID: ${emp.employeeId}) - ${emp.userRole}`);
    });
    
    const targetEmployee = employees.find(emp => emp.userRole === 'employee' && emp.isActive === true);
    if (!targetEmployee) {
      throw new Error('활성 상태인 employee 권한의 직원이 없습니다.');
    }

    console.log(`🎯 테스트 대상 직원: ${targetEmployee.fullName} (ID: ${targetEmployee.employeeId})`);

    // 4. 간단한 부서 이동 테스트 (하드코딩된 부서 ID 사용)
    console.log('\n🔄 시나리오 1: 정상적인 부서 이동 테스트');
    
    // 현재 직원이 인사팀(2)에 있다면 경영지원팀(3)으로, 아니면 인사팀(2)으로 이동
    const currentDeptId = 2; // 인사팀
    const newDeptId = 3;     // 경영지원팀
    const transferData = {
      newDeptId: newDeptId,
      newSubCompanyId: 1, // 본사
      assignmentReason: '조직 재편에 따른 부서 이동',
      assignmentDate: new Date().toISOString().split('T')[0]
    };

    try {
      const transferResult = await testDepartmentTransfer(adminToken, targetEmployee.employeeId, transferData);
      console.log('✅ 부서 이동 성공');
      console.log(`   👤 직원: ${transferResult.data.employeeName}`);
      console.log(`   🏢 새 부서: ${transferResult.data.newDepartment}`);
      console.log(`   📅 발령일: ${new Date(transferResult.data.assignmentDate).toLocaleDateString()}`);
      console.log(`   🆔 발령 ID: ${transferResult.data.assignmentId}`);
    } catch (error) {
      console.error('❌ 부서 이동 실패:', error.message);
    }

    // 시나리오 2: 발령 이력 조회 테스트
    console.log('\n🔄 시나리오 2: 발령 이력 조회 테스트');
    try {
      const historyResult = await testAssignmentHistory(adminToken, targetEmployee.employeeId, {
        page: 1,
        limit: 5
      });
      
      console.log('✅ 발령 이력 조회 성공');
      console.log(`   📊 총 발령 건수: ${historyResult.data.pagination.totalCount}건`);
      console.log('   📋 최근 발령 이력:');
      
      historyResult.data.assignments.slice(0, 3).forEach((assignment, index) => {
        console.log(`     ${index + 1}. ${assignment.AssignmentType} - ${assignment.NewDeptName} (${new Date(assignment.EffectiveDate).toLocaleDateString()})`);
      });
    } catch (error) {
      console.error('❌ 발령 이력 조회 실패:', error.message);
    }

    // 시나리오 3: 권한 테스트 (일반 직원이 부서 이동 시도)
    console.log('\n🔄 시나리오 3: 권한 제어 테스트');
    try {
      const employeeToken = await login(TEST_ACCOUNTS.employee.email, TEST_ACCOUNTS.employee.password);
      
      // 일반 직원이 다른 직원의 부서 이동 시도
      await testDepartmentTransfer(employeeToken, targetEmployee.employeeId, transferData);
      console.log('❌ 권한 제어 실패: 일반 직원이 부서 이동을 성공함');
    } catch (error) {
      if (error.status === 403) {
        console.log('✅ 권한 제어 성공: 일반 직원의 부서 이동이 올바르게 차단됨');
      } else {
        console.log('⚠️ 권한 제어 확인 불가:', error.message);
      }
    }

    // 시나리오 4: 잘못된 데이터로 부서 이동 시도
    console.log('\n🔄 시나리오 4: 유효성 검증 테스트');
    try {
      const invalidTransferData = {
        newDeptId: 99999, // 존재하지 않는 부서 ID
        assignmentReason: '유효성 검증 테스트'
      };
      
      await testDepartmentTransfer(adminToken, targetEmployee.employeeId, invalidTransferData);
      console.log('❌ 유효성 검증 실패: 잘못된 부서 ID로 이동 성공함');
    } catch (error) {
      if (error.status === 400) {
        console.log('✅ 유효성 검증 성공: 잘못된 데이터가 올바르게 차단됨');
        console.log(`   📝 메시지: ${error.message}`);
      } else {
        console.log('⚠️ 유효성 검증 확인 불가:', error.message);
      }
    }

    // 시나리오 5: 본인 발령 이력 조회 (직원 권한)
    console.log('\n🔄 시나리오 5: 본인 발령 이력 조회 테스트');
    try {
      const employeeToken = await login(TEST_ACCOUNTS.employee.email, TEST_ACCOUNTS.employee.password);
      const employeeData = employees.find(emp => emp.email === TEST_ACCOUNTS.employee.email);
      
      const myHistoryResult = await testAssignmentHistory(employeeToken, employeeData.employeeId);
      console.log('✅ 본인 발령 이력 조회 성공');
      console.log(`   📊 본인 발령 건수: ${myHistoryResult.data.pagination.totalCount}건`);
    } catch (error) {
      console.log('⚠️ 본인 발령 이력 조회 실패:', error.message);
    }

    console.log('\n==================================================');
    console.log('🏁 부서 이동 API 테스트 완료');

  } catch (error) {
    console.error('\n❌ 테스트 실행 중 오류 발생:', error.message);
    console.error('상세 오류:', error.response?.data || error);
  }
};

// 테스트 실행
runAssignmentTests().catch(console.error);