/**
 * 전자결재 기본 양식 마스터 데이터 삽입 스크립트
 * @description 휴가신청서, 발령신청서 등 기본 결재 양식 데이터 생성
 * @author SmartHR Team
 * @date 2024-09-14
 */

const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true,
    requestTimeout: 300000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const approvalFormsData = [
  // 1. 휴가 신청서
  {
    FormCode: 'VACATION',
    FormName: '휴가신청서',
    FormNameEng: 'Vacation Request Form',
    CategoryCode: 'HR',
    CategoryName: '인사',
    FormTemplate: JSON.stringify({
      fields: [
        { name: 'vacationType', label: '휴가 종류', type: 'select', required: true, options: ['연차', '병가', '경조휴가', '특별휴가'] },
        { name: 'startDate', label: '휴가 시작일', type: 'date', required: true },
        { name: 'endDate', label: '휴가 종료일', type: 'date', required: true },
        { name: 'days', label: '휴가 일수', type: 'number', required: true },
        { name: 'reason', label: '휴가 사유', type: 'textarea', required: true },
        { name: 'emergencyContact', label: '긴급 연락처', type: 'text', required: false },
        { name: 'workHandover', label: '업무 인수인계', type: 'textarea', required: false }
      ]
    }),
    RequiredFields: 'vacationType,startDate,endDate,days,reason',
    AutoApprovalLine: 'DEPT_MANAGER,HR_TEAM,HR_MANAGER',
    MaxApprovalLevel: 3,
    DisplayOrder: 1,
    Description: '직원의 연차, 병가, 경조휴가 등 각종 휴가 신청을 위한 양식'
  },
  
  // 2. 발령 신청서
  {
    FormCode: 'ASSIGNMENT',
    FormName: '발령신청서',
    FormNameEng: 'Assignment Request Form',
    CategoryCode: 'HR',
    CategoryName: '인사',
    FormTemplate: JSON.stringify({
      fields: [
        { name: 'employeeId', label: '대상 직원', type: 'employee-select', required: true },
        { name: 'assignmentType', label: '발령 유형', type: 'select', required: true, options: ['부서이동', '직책변경', '승진', '파견'] },
        { name: 'effectiveDate', label: '발령 일자', type: 'date', required: true },
        { name: 'newCompanyId', label: '신규 회사', type: 'company-select', required: false },
        { name: 'newSubCompanyId', label: '신규 사업장', type: 'subcompany-select', required: false },
        { name: 'newDeptId', label: '신규 부서', type: 'dept-select', required: false },
        { name: 'newPosId', label: '신규 직책', type: 'position-select', required: false },
        { name: 'assignmentReason', label: '발령 사유', type: 'textarea', required: true },
        { name: 'salaryChange', label: '급여 변경 여부', type: 'checkbox', required: false },
        { name: 'newSalary', label: '신규 급여', type: 'number', required: false }
      ]
    }),
    RequiredFields: 'employeeId,assignmentType,effectiveDate,assignmentReason',
    AutoApprovalLine: 'HR_MANAGER,EXECUTIVE,CEO',
    MaxApprovalLevel: 3,
    DisplayOrder: 2,
    Description: '직원의 부서이동, 승진, 직책변경 등 인사발령을 위한 신청서'
  },
  
  // 3. 지출 결의서
  {
    FormCode: 'EXPENSE',
    FormName: '지출결의서',
    FormNameEng: 'Expense Request Form',
    CategoryCode: 'FINANCE',
    CategoryName: '재무',
    FormTemplate: JSON.stringify({
      fields: [
        { name: 'expenseType', label: '지출 유형', type: 'select', required: true, options: ['업무용품', '출장비', '교육비', '회식비', '기타'] },
        { name: 'amount', label: '신청 금액', type: 'number', required: true },
        { name: 'expenseDate', label: '지출 예정일', type: 'date', required: true },
        { name: 'vendor', label: '거래처/업체', type: 'text', required: true },
        { name: 'purpose', label: '지출 목적', type: 'textarea', required: true },
        { name: 'details', label: '세부 내역', type: 'textarea', required: false },
        { name: 'budgetCode', label: '예산 코드', type: 'text', required: false }
      ]
    }),
    RequiredFields: 'expenseType,amount,expenseDate,vendor,purpose',
    AutoApprovalLine: 'TEAM_MANAGER,FINANCE_TEAM,FINANCE_MANAGER',
    MaxApprovalLevel: 3,
    DisplayOrder: 3,
    Description: '업무 관련 지출 및 경비 신청을 위한 결의서'
  },
  
  // 4. 구매 신청서
  {
    FormCode: 'PURCHASE',
    FormName: '구매신청서',
    FormNameEng: 'Purchase Request Form',
    CategoryCode: 'FINANCE',
    CategoryName: '재무',
    FormTemplate: JSON.stringify({
      fields: [
        { name: 'itemName', label: '구매 품목', type: 'text', required: true },
        { name: 'quantity', label: '수량', type: 'number', required: true },
        { name: 'unitPrice', label: '단가', type: 'number', required: true },
        { name: 'totalAmount', label: '총 금액', type: 'number', required: true },
        { name: 'vendor', label: '공급업체', type: 'text', required: true },
        { name: 'requiredDate', label: '필요 일자', type: 'date', required: true },
        { name: 'purpose', label: '구매 목적', type: 'textarea', required: true },
        { name: 'specifications', label: '상세 사양', type: 'textarea', required: false }
      ]
    }),
    RequiredFields: 'itemName,quantity,unitPrice,totalAmount,vendor,requiredDate,purpose',
    AutoApprovalLine: 'TEAM_MANAGER,FINANCE_TEAM,FINANCE_MANAGER',
    MaxApprovalLevel: 3,
    DisplayOrder: 4,
    Description: '업무용 물품 및 장비 구매를 위한 신청서'
  },
  
  // 5. 출장 신청서
  {
    FormCode: 'BUSINESS_TRIP',
    FormName: '출장신청서',
    FormNameEng: 'Business Trip Request Form',
    CategoryCode: 'HR',
    CategoryName: '인사',
    FormTemplate: JSON.stringify({
      fields: [
        { name: 'destination', label: '출장지', type: 'text', required: true },
        { name: 'startDate', label: '출장 시작일', type: 'date', required: true },
        { name: 'endDate', label: '출장 종료일', type: 'date', required: true },
        { name: 'days', label: '출장 일수', type: 'number', required: true },
        { name: 'purpose', label: '출장 목적', type: 'textarea', required: true },
        { name: 'transportation', label: '교통수단', type: 'select', required: true, options: ['기차', '버스', '항공', '자차', '기타'] },
        { name: 'estimatedCost', label: '예상 비용', type: 'number', required: false },
        { name: 'accommodation', label: '숙박 여부', type: 'checkbox', required: false }
      ]
    }),
    RequiredFields: 'destination,startDate,endDate,days,purpose,transportation',
    AutoApprovalLine: 'DEPT_MANAGER,HR_TEAM',
    MaxApprovalLevel: 2,
    DisplayOrder: 5,
    Description: '업무상 출장 및 외근을 위한 신청서'
  },
  
  // 6. 교육 신청서
  {
    FormCode: 'TRAINING',
    FormName: '교육신청서',
    FormNameEng: 'Training Request Form',
    CategoryCode: 'HR',
    CategoryName: '인사',
    FormTemplate: JSON.stringify({
      fields: [
        { name: 'trainingName', label: '교육명', type: 'text', required: true },
        { name: 'trainingType', label: '교육 유형', type: 'select', required: true, options: ['사내교육', '사외교육', '온라인교육', '세미나', '컨퍼런스'] },
        { name: 'provider', label: '교육 기관', type: 'text', required: true },
        { name: 'startDate', label: '교육 시작일', type: 'date', required: true },
        { name: 'endDate', label: '교육 종료일', type: 'date', required: true },
        { name: 'cost', label: '교육 비용', type: 'number', required: true },
        { name: 'purpose', label: '교육 목적', type: 'textarea', required: true },
        { name: 'expectedOutcome', label: '기대 효과', type: 'textarea', required: false }
      ]
    }),
    RequiredFields: 'trainingName,trainingType,provider,startDate,endDate,cost,purpose',
    AutoApprovalLine: 'DEPT_MANAGER,HR_TEAM,HR_MANAGER',
    MaxApprovalLevel: 3,
    DisplayOrder: 6,
    Description: '직원의 역량 개발을 위한 교육 참가 신청서'
  }
];

async function insertApprovalFormsMasterData() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('📋 전자결재 기본 양식 마스터 데이터 삽입 시작...');
    
    // 기존 데이터 확인
    const existingForms = await pool.request().query(`
      SELECT FormCode FROM uApprovalFormTb WHERE IsActive = 1
    `);
    
    const existingFormCodes = existingForms.recordset.map(row => row.FormCode);
    console.log('📊 기존 양식 개수:', existingFormCodes.length);

    let insertCount = 0;
    let skipCount = 0;

    for (const formData of approvalFormsData) {
      if (existingFormCodes.includes(formData.FormCode)) {
        console.log(`⏭️  양식 건너뜀: ${formData.FormCode} (이미 존재)`);
        skipCount++;
        continue;
      }

      const request = pool.request();
      
      // 파라미터 설정
      Object.keys(formData).forEach(key => {
        if (key === 'FormTemplate') {
          request.input(key, sql.NText, formData[key]);
        } else if (typeof formData[key] === 'number') {
          request.input(key, sql.Int, formData[key]);
        } else {
          request.input(key, sql.NVarChar, formData[key]);
        }
      });

      const insertQuery = `
        INSERT INTO uApprovalFormTb (
          FormCode, FormName, FormNameEng, CategoryCode, CategoryName, 
          FormTemplate, RequiredFields, AutoApprovalLine, MaxApprovalLevel, 
          DisplayOrder, Description, IsActive, CreatedAt
        ) VALUES (
          @FormCode, @FormName, @FormNameEng, @CategoryCode, @CategoryName,
          @FormTemplate, @RequiredFields, @AutoApprovalLine, @MaxApprovalLevel,
          @DisplayOrder, @Description, 1, GETDATE()
        )
      `;

      await request.query(insertQuery);
      console.log(`✅ 양식 생성: ${formData.FormCode} - ${formData.FormName}`);
      insertCount++;
    }

    // 생성된 양식 확인
    const finalResult = await pool.request().query(`
      SELECT 
        FormId, FormCode, FormName, CategoryName, DisplayOrder, IsActive,
        CreatedAt
      FROM uApprovalFormTb 
      WHERE IsActive = 1
      ORDER BY DisplayOrder, FormCode
    `);

    console.log('');
    console.log('🎉 전자결재 기본 양식 마스터 데이터 생성이 완료되었습니다!');
    console.log('');
    console.log('📊 처리 결과:');
    console.log(`   - 신규 생성: ${insertCount}개`);
    console.log(`   - 기존 유지: ${skipCount}개`);
    console.log(`   - 총 양식: ${finalResult.recordset.length}개`);
    console.log('');
    console.log('📋 생성된 결재 양식 목록:');
    
    finalResult.recordset.forEach((form, index) => {
      console.log(`   ${index + 1}. ${form.FormCode} - ${form.FormName} (${form.CategoryName})`);
    });

    console.log('');
    console.log('📝 양식별 상세 정보:');
    console.log('   • 휴가신청서: 연차, 병가, 경조휴가 등 휴가 신청');
    console.log('   • 발령신청서: 부서이동, 승진, 직책변경 등 인사발령');
    console.log('   • 지출결의서: 업무 관련 지출 및 경비 신청');
    console.log('   • 구매신청서: 업무용 물품 및 장비 구매');
    console.log('   • 출장신청서: 업무상 출장 및 외근 신청');
    console.log('   • 교육신청서: 직원 역량 개발 교육 참가');

  } catch (error) {
    console.error('❌ 마스터 데이터 삽입 중 오류 발생:', error.message);
    console.error('전체 오류:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  insertApprovalFormsMasterData();
}

module.exports = { insertApprovalFormsMasterData };