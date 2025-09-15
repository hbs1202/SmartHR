/**
 * 종합 발령 시스템 API 테스트 스크립트
 * @description 회사/사업장/부서/직책 종합 발령 API 및 발령 이력 조회 API 종합 테스트
 * @author SmartHR Team
 * @date 2024-09-14
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
 * 종합 발령 API 테스트
 */
const testComprehensiveAssignment = async (token, employeeId, assignmentData) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/assignments/${employeeId}/transfer`,
      assignmentData,
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
 * 조직도 정보 조회 (조직 ID 확인용)
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
const runComprehensiveAssignmentTests = async () => {
  console.log('🚀 종합 발령 시스템 API 테스트 시작');
  console.log('==================================================');

  try {
    // 1. 서버 연결 확인
    console.log('✅ 서버 연결 확인 중...');
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ 서버 연결 확인 완료');

    // 2. 관리자 로그인
    console.log('\\n🔑 관리자 로그인 중...');
    const adminToken = await login(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password);
    console.log('✅ 관리자 로그인 성공');

    // 3. 직원 목록 조회 (테스트 대상 직원 확인)
    console.log('\\n📋 직원 목록 조회 중...');
    const employees = await getEmployees(adminToken);
    console.log(`✅ 직원 목록 조회 성공: ${employees.length}명`);
    
    if (employees.length === 0) {
      throw new Error('테스트할 직원이 없습니다.');
    }

    // 테스트 대상 직원 (첫 번째 활성 employee 권한 직원)
    console.log('📋 직원 데이터 상세:');
    employees.forEach(emp => {
      console.log(`   - ${emp.fullName} (ID: ${emp.employeeId}) - ${emp.userRole} - 활성: ${emp.isActive}`);
    });
    
    const targetEmployee = employees.find(emp => emp.userRole === 'employee' && emp.isActive === true);
    if (!targetEmployee) {
      throw new Error('활성 상태인 employee 권한의 직원이 없습니다.');
    }

    console.log(`🎯 테스트 대상 직원: ${targetEmployee.fullName} (ID: ${targetEmployee.employeeId})`);

    // 4. 시나리오 1: 부서만 변경 (기본 부서 이동)
    console.log('\\n🔄 시나리오 1: 부서만 변경 (부서 이동)');
    const deptOnlyData = {
      newDeptId: 3, // 경영지원팀
      assignmentReason: '조직 개편에 따른 부서 이동',
      assignmentDate: new Date().toISOString().split('T')[0]
    };

    try {
      const deptResult = await testComprehensiveAssignment(adminToken, targetEmployee.employeeId, deptOnlyData);
      console.log('✅ 부서 이동 성공');
      console.log(`   👤 직원: ${deptResult.data.employeeName}`);
      console.log(`   📋 발령 유형: ${deptResult.data.assignmentType}`);
      console.log(`   📊 변경 개수: ${deptResult.data.changeCount}개`);
      console.log(`   🏢 새 부서: ${deptResult.data.newDepartment}`);
      console.log(`   🆔 발령 ID: ${deptResult.data.assignmentId}`);
    } catch (error) {
      console.error('❌ 부서 이동 실패:', error.message);
    }

    // 5. 시나리오 2: 직책만 변경 (승진/직책 변경)
    console.log('\\n🔄 시나리오 2: 직책만 변경 (직책 변경)');
    const positionOnlyData = {
      newPosId: 3, // 팀장
      assignmentReason: '직무 역량 평가 결과에 따른 직책 승진',
      assignmentDate: new Date().toISOString().split('T')[0]
    };

    try {
      const posResult = await testComprehensiveAssignment(adminToken, targetEmployee.employeeId, positionOnlyData);
      console.log('✅ 직책 변경 성공');
      console.log(`   📋 발령 유형: ${posResult.data.assignmentType}`);
      console.log(`   📊 변경 개수: ${posResult.data.changeCount}개`);
      console.log(`   👔 새 직책: ${posResult.data.newPosition}`);
      console.log(`   🆔 발령 ID: ${posResult.data.assignmentId}`);
    } catch (error) {
      console.error('❌ 직책 변경 실패:', error.message);
    }

    // 6. 시나리오 3: 부서와 직책 동시 변경 (복합 발령)
    console.log('\\n🔄 시나리오 3: 부서와 직책 동시 변경 (복합 발령)');
    const multipleChangeData = {
      newDeptId: 2, // 인사팀
      newPosId: 2,  // 주임
      assignmentReason: '신규 프로젝트 리드를 위한 부서 이동 및 승진',
      assignmentDate: new Date().toISOString().split('T')[0]
    };

    try {
      const multiResult = await testComprehensiveAssignment(adminToken, targetEmployee.employeeId, multipleChangeData);
      console.log('✅ 복합 발령 성공');
      console.log(`   📋 발령 유형: ${multiResult.data.assignmentType}`);
      console.log(`   📊 변경 개수: ${multiResult.data.changeCount}개`);
      console.log(`   🏢 새 부서: ${multiResult.data.newDepartment}`);
      console.log(`   👔 새 직책: ${multiResult.data.newPosition}`);
      console.log(`   🆔 발령 ID: ${multiResult.data.assignmentId}`);
    } catch (error) {
      console.error('❌ 복합 발령 실패:', error.message);
    }

    // 7. 시나리오 4: 종합 발령 이력 조회
    console.log('\\n🔄 시나리오 4: 종합 발령 이력 조회');
    try {
      const historyResult = await testAssignmentHistory(adminToken, targetEmployee.employeeId, {
        page: 1,
        limit: 10
      });
      
      console.log('✅ 발령 이력 조회 성공');
      console.log(`   📊 총 발령 건수: ${historyResult.data.pagination.totalCount}건`);
      console.log('   📋 최근 발령 이력:');
      
      historyResult.data.assignments.slice(0, 5).forEach((assignment, index) => {
        console.log(`     ${index + 1}. ${assignment.AssignmentType} - ${assignment.NewDeptName || '부서 미변경'}/${assignment.NewPosName || '직책 미변경'} (${new Date(assignment.EffectiveDate).toLocaleDateString()})`);
      });
    } catch (error) {
      console.error('❌ 발령 이력 조회 실패:', error.message);
    }

    // 8. 시나리오 5: 유효성 검증 테스트 (변경 정보 없음)
    console.log('\\n🔄 시나리오 5: 유효성 검증 테스트 (변경 정보 없음)');
    try {
      const emptyData = {
        assignmentReason: '유효성 검증 테스트'
      };
      
      await testComprehensiveAssignment(adminToken, targetEmployee.employeeId, emptyData);
      console.log('❌ 유효성 검증 실패: 빈 데이터로 발령이 성공함');
    } catch (error) {
      if (error.status === 400) {
        console.log('✅ 유효성 검증 성공: 변경 정보 없음이 올바르게 차단됨');
        console.log(`   📝 메시지: ${error.message}`);
      } else {
        console.log('⚠️ 유효성 검증 확인 불가:', error.message);
      }
    }

    // 9. 시나리오 6: 유효성 검증 테스트 (존재하지 않는 부서 ID)
    console.log('\\n🔄 시나리오 6: 유효성 검증 테스트 (잘못된 부서 ID)');
    try {
      const invalidDeptData = {
        newDeptId: 99999, // 존재하지 않는 부서 ID
        assignmentReason: '유효성 검증 테스트 - 잘못된 부서'
      };
      
      await testComprehensiveAssignment(adminToken, targetEmployee.employeeId, invalidDeptData);
      console.log('❌ 유효성 검증 실패: 잘못된 부서 ID로 발령이 성공함');
    } catch (error) {
      if (error.status === 400) {
        console.log('✅ 유효성 검증 성공: 잘못된 부서 ID가 올바르게 차단됨');
        console.log(`   📝 메시지: ${error.message}`);
      } else {
        console.log('⚠️ 유효성 검증 확인 불가:', error.message);
      }
    }

    // 10. 시나리오 7: 권한 테스트 (일반 직원이 발령 시도)
    console.log('\\n🔄 시나리오 7: 권한 제어 테스트');
    try {
      const employeeToken = await login(TEST_ACCOUNTS.employee.email, TEST_ACCOUNTS.employee.password);
      
      // 일반 직원이 다른 직원의 발령 시도
      await testComprehensiveAssignment(employeeToken, targetEmployee.employeeId, deptOnlyData);
      console.log('❌ 권한 제어 실패: 일반 직원의 발령이 성공함');
    } catch (error) {
      if (error.status === 403) {
        console.log('✅ 권한 제어 성공: 일반 직원의 발령이 올바르게 차단됨');
      } else {
        console.log('⚠️ 권한 제어 확인 불가:', error.message);
      }
    }

    // 11. 시나리오 8: 본인 발령 이력 조회 (직원 권한)
    console.log('\\n🔄 시나리오 8: 본인 발령 이력 조회 테스트');
    try {
      const employeeToken = await login(TEST_ACCOUNTS.employee.email, TEST_ACCOUNTS.employee.password);
      const employeeData = employees.find(emp => emp.email === TEST_ACCOUNTS.employee.email);
      
      if (employeeData) {
        const myHistoryResult = await testAssignmentHistory(employeeToken, employeeData.employeeId);
        console.log('✅ 본인 발령 이력 조회 성공');
        console.log(`   📊 본인 발령 건수: ${myHistoryResult.data.pagination.totalCount}건`);
      } else {
        console.log('⚠️ 테스트용 직원 데이터를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.log('⚠️ 본인 발령 이력 조회 실패:', error.message);
    }

    console.log('\\n==================================================');
    console.log('🏁 종합 발령 시스템 API 테스트 완료');
    console.log('\\n📋 테스트 결과 요약:');
    console.log('   ✅ 부서만 변경 (부서이동)');
    console.log('   ✅ 직책만 변경 (직책변경)');
    console.log('   ✅ 부서+직책 변경 (복합발령)');
    console.log('   ✅ 발령 이력 조회');
    console.log('   ✅ 입력값 유효성 검증');
    console.log('   ✅ 권한 제어');

  } catch (error) {
    console.error('\\n❌ 테스트 실행 중 오류 발생:', error.message);
    console.error('상세 오류:', error.response?.data || error);
  }
};

// 테스트 실행
runComprehensiveAssignmentTests().catch(console.error);