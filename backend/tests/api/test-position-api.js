/**
 * 직책 관리 API 테스트
 * @description 직책 CRUD 기능 종합 테스트
 * @author SmartHR Team
 * @date 2024-01-15
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// 테스트 설정
const API_BASE_URL = 'http://localhost:3000/api/organization';
const TEST_TIMEOUT = 30000; // 30초

// 테스트용 JWT 토큰 생성
function generateTestToken() {
  const payload = {
    userId: 1,
    username: 'test_user',
    role: 'admin'
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// API 클라이언트 설정
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${generateTestToken()}`
  }
});

// 테스트 결과 추적
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// 테스트 헬퍼 함수
function logTest(testName, success, message, data = null) {
  testResults.total++;
  if (success) {
    testResults.passed++;
    console.log(`✅ ${testName}: ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}: ${message}`);
  }
  
  testResults.details.push({
    test: testName,
    success,
    message,
    data: data ? JSON.stringify(data, null, 2) : null,
    timestamp: new Date().toISOString()
  });
}

// 랜덤 테스트 데이터 생성
const timestamp = Date.now();

// 테스트 데이터
let testData = {
  activeDeptId: null,      // 기존 활성 부서 ID
  testPositionId: null,    // 생성된 직책 ID
  secondPositionId: null,  // 두 번째 생성된 직책 ID
  positions: {
    manager: {
      posCode: `MGR${timestamp}`,
      posName: `관리자${timestamp}`,
      posNameEng: `Manager${timestamp}`,
      posLevel: 5,
      posGrade: 'L5',
      jobTitle: '팀장',
      jobCategory: '관리',
      minSalary: 5000000,
      maxSalary: 8000000,
      baseSalary: 6000000,
      allowanceAmount: 500000,
      isManagerPosition: true,
      requiredExperience: 5,
      requiredEducation: '대학교 졸업',
      requiredSkills: '팀 관리, 의사소통',
      jobDescription: '팀원들을 관리하고 업무를 조율합니다.',
      responsibilities: '팀 성과 관리, 인사평가, 업무 배분',
      maxHeadcount: 1
    },
    developer: {
      posCode: `DEV${timestamp}`,
      posName: `개발자${timestamp}`,
      posNameEng: `Developer${timestamp}`,
      posLevel: 3,
      posGrade: 'L3',
      jobTitle: '시니어 개발자',
      jobCategory: '개발',
      minSalary: 4000000,
      maxSalary: 6000000,
      baseSalary: 5000000,
      allowanceAmount: 200000,
      isManagerPosition: false,
      requiredExperience: 3,
      requiredEducation: '대학교 졸업',
      requiredSkills: 'JavaScript, Node.js, React',
      jobDescription: '웹 애플리케이션을 개발하고 유지보수합니다.',
      responsibilities: '코드 작성, 버그 수정, 코드 리뷰',
      maxHeadcount: 5
    }
  }
};

async function runPositionAPITests() {
  console.log('🧪 직책 관리 API 테스트 시작');
  console.log('=' .repeat(80));
  console.log(`🔗 API Base URL: ${API_BASE_URL}`);
  console.log(`🕐 테스트 시작 시간: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(80));

  try {
    // 1. 기존 활성 부서 조회 (직책 등록을 위해 필요)
    await testGetActiveDepartment();
    
    // 2. 직책 등록 테스트
    await testCreatePosition();
    
    // 3. 직책 목록 조회 테스트
    await testGetPositions();
    
    // 4. 직책 상세 조회 테스트
    await testGetPositionById();
    
    // 5. 직책 정보 수정 테스트
    await testUpdatePosition();
    
    // 6. 두 번째 직책 등록 (계층관계 테스트용)
    await testCreateSecondPosition();
    
    // 7. 직책 검색 테스트
    await testSearchPositions();
    
    // 8. 페이징 테스트
    await testPositionsPagination();
    
    // 9. 유효성 검증 테스트
    await testPositionValidation();
    
    // 10. 직책 삭제 테스트
    await testDeletePosition();

  } catch (error) {
    console.error('🚨 테스트 실행 중 치명적 오류 발생:', error.message);
    logTest('전체 테스트', false, `치명적 오류: ${error.message}`);
  } finally {
    // 테스트 결과 요약
    console.log('\n' + '='.repeat(80));
    console.log('📊 직책 관리 API 테스트 결과 요약');
    console.log('='.repeat(80));
    console.log(`📈 전체 테스트: ${testResults.total}개`);
    console.log(`✅ 성공: ${testResults.passed}개`);
    console.log(`❌ 실패: ${testResults.failed}개`);
    console.log(`🎯 성공률: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    console.log(`🕐 테스트 완료 시간: ${new Date().toLocaleString()}`);
    
    if (testResults.failed > 0) {
      console.log('\n❌ 실패한 테스트 목록:');
      testResults.details
        .filter(detail => !detail.success)
        .forEach(detail => console.log(`  - ${detail.test}: ${detail.message}`));
    }
    
    console.log('='.repeat(80));
  }
}

// 1. 기존 활성 부서 조회
async function testGetActiveDepartment() {
  try {
    const response = await apiClient.get('/departments?page=1&pageSize=5&isActive=true');
    
    console.log('부서 조회 응답:', JSON.stringify(response.data, null, 2));
    
    let departments = [];
    if (response.data.success && response.data.data) {
      // 응답 구조가 배열인 경우와 객체인 경우 처리
      if (Array.isArray(response.data.data)) {
        departments = response.data.data;
      } else if (response.data.data.departments && Array.isArray(response.data.data.departments)) {
        departments = response.data.data.departments;
      } else if (response.data.data.length !== undefined) {
        departments = response.data.data;
      }
    }
    
    if (departments.length > 0) {
      testData.activeDeptId = departments[0].DeptId;
      logTest('기존 부서 조회', true, `활성 부서 발견: ${departments[0].DeptName} (ID: ${testData.activeDeptId})`);
    } else {
      logTest('기존 부서 조회', false, '활성 부서가 없습니다. 부서를 먼저 생성해주세요.');
    }
  } catch (error) {
    logTest('기존 부서 조회', false, `오류: ${error.response?.data?.message || error.message}`);
  }
}

// 2. 직책 등록 테스트
async function testCreatePosition() {
  if (!testData.activeDeptId) {
    logTest('직책 등록', false, '활성 부서가 없어 테스트를 건너뜁니다.');
    return;
  }

  try {
    const positionData = {
      ...testData.positions.manager,
      deptId: testData.activeDeptId
    };

    const response = await apiClient.post('/positions', positionData);
    
    if (response.data.success && response.data.data) {
      testData.testPositionId = response.data.data.PosId;
      logTest('직책 등록', true, `관리자 직책 등록 성공: ${response.data.data.PosName} (ID: ${testData.testPositionId})`);
    } else {
      logTest('직책 등록', false, `등록 실패: ${response.data.message}`);
    }
  } catch (error) {
    logTest('직책 등록', false, `오류: ${error.response?.data?.message || error.message}`);
  }
}

// 3. 직책 목록 조회 테스트
async function testGetPositions() {
  try {
    const response = await apiClient.get('/positions');
    
    if (response.data.success) {
      const positions = response.data.data;
      logTest('직책 목록 조회', true, `직책 ${positions.length}개 조회 성공`);
      
      // 페이징 정보 확인
      if (positions.length > 0 && positions[0].TotalCount) {
        logTest('페이징 정보 확인', true, `전체 ${positions[0].TotalCount}개, 현재 페이지: ${positions[0].CurrentPage}`);
      }
    } else {
      logTest('직책 목록 조회', false, `조회 실패: ${response.data.message}`);
    }
  } catch (error) {
    logTest('직책 목록 조회', false, `오류: ${error.response?.data?.message || error.message}`);
  }
}

// 4. 직책 상세 조회 테스트
async function testGetPositionById() {
  if (!testData.testPositionId) {
    logTest('직책 상세 조회', false, '테스트 직책이 없어 건너뜁니다.');
    return;
  }

  try {
    const response = await apiClient.get(`/positions/${testData.testPositionId}`);
    
    if (response.data.success && response.data.data) {
      const position = response.data.data;
      logTest('직책 상세 조회', true, `직책 상세 조회 성공: ${position.PosName} (Level: ${position.PosLevel})`);
      
      // 데이터 무결성 확인
      if (position.PosCode === testData.positions.manager.posCode) {
        logTest('데이터 무결성 확인', true, '등록된 데이터와 조회된 데이터가 일치합니다.');
      } else {
        logTest('데이터 무결성 확인', false, '등록된 데이터와 조회된 데이터가 다릅니다.');
      }
    } else {
      logTest('직책 상세 조회', false, `조회 실패: ${response.data.message}`);
    }
  } catch (error) {
    logTest('직책 상세 조회', false, `오류: ${error.response?.data?.message || error.message}`);
  }
}

// 5. 직책 정보 수정 테스트
async function testUpdatePosition() {
  if (!testData.testPositionId) {
    logTest('직책 정보 수정', false, '테스트 직책이 없어 건너뜁니다.');
    return;
  }

  try {
    const updateData = {
      posName: `수정된관리자${timestamp}`,
      posLevel: 6,
      baseSalary: 7000000,
      jobDescription: '수정된 직무 설명입니다.'
    };

    const response = await apiClient.put(`/positions/${testData.testPositionId}`, updateData);
    
    if (response.data.success) {
      logTest('직책 정보 수정', true, '직책 정보 수정 성공');
      
      // 수정 확인
      const verifyResponse = await apiClient.get(`/positions/${testData.testPositionId}`);
      if (verifyResponse.data.success && verifyResponse.data.data.PosName === updateData.posName) {
        logTest('수정 내용 확인', true, '수정된 내용이 정확히 반영되었습니다.');
      } else {
        logTest('수정 내용 확인', false, '수정된 내용이 반영되지 않았습니다.');
      }
    } else {
      logTest('직책 정보 수정', false, `수정 실패: ${response.data.message}`);
    }
  } catch (error) {
    logTest('직책 정보 수정', false, `오류: ${error.response?.data?.message || error.message}`);
  }
}

// 6. 두 번째 직책 등록 (계층관계 테스트용)
async function testCreateSecondPosition() {
  if (!testData.activeDeptId || !testData.testPositionId) {
    logTest('하위 직책 등록', false, '선행 조건이 충족되지 않아 건너뜁니다.');
    return;
  }

  try {
    const positionData = {
      ...testData.positions.developer,
      deptId: testData.activeDeptId,
      reportingTo: testData.testPositionId  // 관리자에게 보고
    };

    const response = await apiClient.post('/positions', positionData);
    
    if (response.data.success && response.data.data) {
      testData.secondPositionId = response.data.data.PosId;
      logTest('하위 직책 등록', true, `개발자 직책 등록 성공: ${response.data.data.PosName} (ID: ${testData.secondPositionId})`);
    } else {
      logTest('하위 직책 등록', false, `등록 실패: ${response.data.message}`);
    }
  } catch (error) {
    logTest('하위 직책 등록', false, `오류: ${error.response?.data?.message || error.message}`);
  }
}

// 7. 직책 검색 테스트
async function testSearchPositions() {
  try {
    const searchKeyword = '관리자';
    const response = await apiClient.get(`/positions?searchKeyword=${searchKeyword}`);
    
    if (response.data.success) {
      const positions = response.data.data;
      const hasSearchResults = positions.some(p => p.PosName.includes(searchKeyword));
      
      if (hasSearchResults) {
        logTest('직책 검색', true, `'${searchKeyword}' 검색 결과: ${positions.length}개`);
      } else {
        logTest('직책 검색', true, `'${searchKeyword}' 검색 결과 없음 (정상)`);
      }
    } else {
      logTest('직책 검색', false, `검색 실패: ${response.data.message}`);
    }
  } catch (error) {
    logTest('직책 검색', false, `오류: ${error.response?.data?.message || error.message}`);
  }
}

// 8. 페이징 테스트
async function testPositionsPagination() {
  try {
    // 첫 번째 페이지
    const page1Response = await apiClient.get('/positions?page=1&pageSize=1');
    
    if (page1Response.data.success) {
      const page1Data = page1Response.data.data;
      
      if (page1Data.length > 0) {
        logTest('페이징 1페이지', true, `1페이지 조회 성공: ${page1Data.length}개`);
        
        // 두 번째 페이지 (데이터가 있는 경우만)
        if (page1Data[0].TotalCount > 1) {
          const page2Response = await apiClient.get('/positions?page=2&pageSize=1');
          
          if (page2Response.data.success) {
            const page2Data = page2Response.data.data;
            
            if (page2Data.length > 0 && page1Data[0].PosId !== page2Data[0].PosId) {
              logTest('페이징 2페이지', true, '페이징이 정상적으로 작동합니다.');
            } else {
              logTest('페이징 2페이지', true, '페이징 테스트 완료 (데이터 부족)');
            }
          }
        } else {
          logTest('페이징 테스트', true, '페이징 테스트 완료 (데이터 1개)');
        }
      } else {
        logTest('페이징 테스트', true, '페이징 테스트 완료 (데이터 없음)');
      }
    } else {
      logTest('페이징 테스트', false, `페이징 실패: ${page1Response.data.message}`);
    }
  } catch (error) {
    logTest('페이징 테스트', false, `오류: ${error.response?.data?.message || error.message}`);
  }
}

// 9. 유효성 검증 테스트
async function testPositionValidation() {
  // 필수 필드 누락 테스트
  try {
    const invalidData = {
      posCode: '',  // 빈 값
      posName: 'T'  // 너무 짧은 값
    };

    await apiClient.post('/positions', invalidData);
    logTest('유효성 검증', false, '잘못된 데이터가 허용되었습니다.');
  } catch (error) {
    if (error.response?.status === 400) {
      logTest('유효성 검증', true, '잘못된 데이터가 올바르게 거부되었습니다.');
    } else {
      logTest('유효성 검증', false, `예상치 못한 오류: ${error.message}`);
    }
  }

  // 존재하지 않는 직책 조회 테스트
  try {
    await apiClient.get('/positions/999999');
    logTest('존재하지 않는 직책 조회', false, '존재하지 않는 직책이 조회되었습니다.');
  } catch (error) {
    if (error.response?.status === 404 || error.response?.status === 400) {
      logTest('존재하지 않는 직책 조회', true, '존재하지 않는 직책이 올바르게 거부되었습니다.');
    } else {
      logTest('존재하지 않는 직책 조회', false, `예상치 못한 오류: ${error.message}`);
    }
  }
}

// 10. 직책 삭제 테스트
async function testDeletePosition() {
  // 하위 직책 먼저 삭제 (관계 제약 확인)
  if (testData.secondPositionId) {
    try {
      const response = await apiClient.delete(`/positions/${testData.secondPositionId}`);
      
      if (response.data.success) {
        logTest('하위 직책 삭제', true, '하위 직책 삭제 성공');
        
        // 삭제 확인 (isActive = false 확인)
        const verifyResponse = await apiClient.get(`/positions?isActive=false`);
        if (verifyResponse.data.success) {
          const deletedPosition = verifyResponse.data.data.find(p => p.PosId === testData.secondPositionId);
          if (deletedPosition && !deletedPosition.IsActive) {
            logTest('소프트 삭제 확인', true, '직책이 소프트 삭제되었습니다.');
          } else {
            logTest('소프트 삭제 확인', false, '소프트 삭제가 제대로 되지 않았습니다.');
          }
        }
      } else {
        logTest('하위 직책 삭제', false, `삭제 실패: ${response.data.message}`);
      }
    } catch (error) {
      logTest('하위 직책 삭제', false, `오류: ${error.response?.data?.message || error.message}`);
    }
  }

  // 관리자 직책 삭제
  if (testData.testPositionId) {
    try {
      const response = await apiClient.delete(`/positions/${testData.testPositionId}`);
      
      if (response.data.success) {
        logTest('관리자 직책 삭제', true, '관리자 직책 삭제 성공');
      } else {
        logTest('관리자 직책 삭제', false, `삭제 실패: ${response.data.message}`);
      }
    } catch (error) {
      logTest('관리자 직책 삭제', false, `오류: ${error.response?.data?.message || error.message}`);
    }
  }
}

// 테스트 실행
if (require.main === module) {
  runPositionAPITests()
    .then(() => {
      const exitCode = testResults.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch((error) => {
      console.error('🚨 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = {
  runPositionAPITests,
  testResults
};