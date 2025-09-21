/**
 * 직원 관리 API 테스트 스크립트
 * @description 새로 개발된 직원 관리 API들을 테스트
 * @author SmartHR Team
 * @date 2025-01-19
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
let authToken = null;

// 색상 콘솔 출력
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 ${msg}${colors.reset}`)
};

// 1. 로그인하여 토큰 획득
async function login() {
  try {
    log.test('로그인 테스트 시작...');

    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'testadmin@smarthr.com',
      password: 'admin123'
    });

    if (response.data.success) {
      authToken = response.data.data.accessToken;
      log.success(`로그인 성공! 토큰 획득: ${authToken.substring(0, 20)}...`);
      return true;
    } else {
      log.error(`로그인 실패: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    log.error(`로그인 오류: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// 2. 직원 목록 조회 테스트
async function testGetEmployees() {
  try {
    log.test('직원 목록 조회 테스트...');

    const response = await axios.get(`${BASE_URL}/api/employees`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        page: 1,
        limit: 5,
        isActive: true
      }
    });

    if (response.data.success) {
      const { employees, pagination } = response.data.data;
      log.success(`직원 목록 조회 성공!`);
      log.info(`- 총 직원 수: ${pagination.totalCount}`);
      log.info(`- 조회된 직원 수: ${employees.length}`);

      if (employees.length > 0) {
        log.info(`- 첫 번째 직원: ${employees[0].fullName || employees[0].FullName} (${employees[0].employeeCode || employees[0].EmployeeCode})`);
      }

      return employees;
    } else {
      log.error(`직원 목록 조회 실패: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`직원 목록 조회 오류: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 3. 직원 상세 조회 테스트
async function testGetEmployeeById(employeeId) {
  try {
    log.test(`직원 상세 조회 테스트 (ID: ${employeeId})...`);

    const response = await axios.get(`${BASE_URL}/api/employees/${employeeId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        includeSalary: true,
        includePersonalInfo: true
      }
    });

    if (response.data.success) {
      const employee = response.data.data.employee;
      log.success(`직원 상세 조회 성공!`);
      log.info(`- 이름: ${employee.fullName || employee.FullName}`);
      log.info(`- 이메일: ${employee.email || employee.Email}`);
      log.info(`- 부서: ${employee.deptName || employee.DeptName || 'N/A'}`);
      log.info(`- 직책: ${employee.posName || employee.PosName || 'N/A'}`);

      return employee;
    } else {
      log.error(`직원 상세 조회 실패: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`직원 상세 조회 오류: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 4. 직원 통계 조회 테스트
async function testGetEmployeeStats() {
  try {
    log.test('직원 통계 조회 테스트...');

    const response = await axios.get(`${BASE_URL}/api/employees/stats`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      const stats = response.data.data.stats;
      log.success(`직원 통계 조회 성공!`);
      log.info(`- 총 직원 수: ${stats.TotalEmployees || 0}`);
      log.info(`- 활성 직원 수: ${stats.ActiveEmployees || 0}`);
      log.info(`- 비활성 직원 수: ${stats.InactiveEmployees || 0}`);
      log.info(`- 총 부서 수: ${stats.TotalDepartments || 0}`);
      log.info(`- 평균 근속년수: ${stats.AvgCareerYears || 0}년`);

      return stats;
    } else {
      log.error(`직원 통계 조회 실패: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`직원 통계 조회 오류: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 5. 직원 검색 테스트
async function testSearchEmployees() {
  try {
    log.test('직원 검색 테스트...');

    const response = await axios.get(`${BASE_URL}/api/employees/search`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: {
        q: 'admin',
        maxResults: 5
      }
    });

    if (response.data.success) {
      const employees = response.data.data.employees;
      log.success(`직원 검색 성공!`);
      log.info(`- 검색 결과: ${employees.length}명`);

      employees.forEach((emp, index) => {
        log.info(`  ${index + 1}. ${emp.FullName || emp.fullName} (${emp.EmployeeCode || emp.employeeCode})`);
      });

      return employees;
    } else {
      log.error(`직원 검색 실패: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`직원 검색 오류: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 6. 직원 등록 테스트 (선택적)
async function testCreateEmployee() {
  try {
    log.test('직원 등록 테스트...');

    const newEmployee = {
      companyId: 1,
      subCompanyId: 1,
      deptId: 1,
      posId: 1,
      employeeCode: `TEST${Date.now()}`,
      password: 'test123',
      email: `test${Date.now()}@smarthr.com`,
      firstName: '테스트',
      lastName: '직원',
      nameEng: 'Test Employee',
      gender: 'M',
      phoneNumber: '010-1234-5678',
      hireDate: new Date().toISOString().split('T')[0],
      employmentType: '정규직',
      userRole: 'employee'
    };

    const response = await axios.post(`${BASE_URL}/api/employees`, newEmployee, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (response.data.success) {
      log.success(`직원 등록 성공!`);
      log.info(`- 직원코드: ${newEmployee.employeeCode}`);
      log.info(`- 이메일: ${newEmployee.email}`);

      return response.data.data;
    } else {
      log.error(`직원 등록 실패: ${response.data.message}`);
      return null;
    }
  } catch (error) {
    log.error(`직원 등록 오류: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// 메인 테스트 실행
async function runTests() {
  console.log('\n🚀 직원 관리 API 테스트 시작\n');

  // 1. 로그인
  const loginSuccess = await login();
  if (!loginSuccess) {
    log.error('로그인에 실패하여 테스트를 중단합니다.');
    return;
  }

  console.log('\n' + '='.repeat(50));

  // 2. 직원 목록 조회
  const employees = await testGetEmployees();

  console.log('\n' + '='.repeat(50));

  // 3. 직원 상세 조회 (첫 번째 직원)
  if (employees && employees.length > 0) {
    const firstEmployeeId = employees[0].employeeId || employees[0].EmployeeId;
    await testGetEmployeeById(firstEmployeeId);
  }

  console.log('\n' + '='.repeat(50));

  // 4. 직원 통계 조회
  await testGetEmployeeStats();

  console.log('\n' + '='.repeat(50));

  // 5. 직원 검색
  await testSearchEmployees();

  console.log('\n' + '='.repeat(50));

  // 6. 직원 등록 (옵션)
  log.warning('직원 등록 테스트는 실제 데이터를 생성하므로 주석 처리됨');
  // await testCreateEmployee();

  console.log('\n🎉 모든 테스트가 완료되었습니다!\n');
}

// 테스트 실행
runTests().catch(error => {
  log.error(`테스트 실행 중 오류: ${error.message}`);
  process.exit(1);
});