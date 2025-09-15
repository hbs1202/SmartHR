/**
 * 인사발령 유형 기초 데이터 입력 스크립트
 * @description 발령 분류, 유형, 사유 마스터 데이터 입력
 * @author SmartHR Team
 * @date 2024-09-14
 */

const sql = require('mssql');
require('dotenv').config();

// 데이터베이스 연결 설정
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
};

const insertMasterData = async () => {
  try {
    console.log('🔄 데이터베이스 연결 중...');
    await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('\n📋 인사발령 유형 기초 데이터 입력 중...');
    
    // 1. 발령 대분류 데이터 입력
    console.log('🔄 1. 발령 대분류 데이터 입력 중...');
    const insertCategories = `
-- 발령 대분류 데이터 입력
IF NOT EXISTS (SELECT * FROM uAssignmentCategoryTb WHERE CategoryCode = 'RECRUITMENT')
INSERT INTO uAssignmentCategoryTb (CategoryCode, CategoryName, CategoryNameEng, DisplayOrder, Description, CreatedBy) VALUES
('RECRUITMENT', '입사', 'Recruitment', 1, '신규 입사, 복직, 재입사 등', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentCategoryTb WHERE CategoryCode = 'PROMOTION')
INSERT INTO uAssignmentCategoryTb (CategoryCode, CategoryName, CategoryNameEng, DisplayOrder, Description, CreatedBy) VALUES
('PROMOTION', '승진', 'Promotion', 2, '정규승진, 특별승진, 승격 등', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentCategoryTb WHERE CategoryCode = 'TRANSFER')
INSERT INTO uAssignmentCategoryTb (CategoryCode, CategoryName, CategoryNameEng, DisplayOrder, Description, CreatedBy) VALUES
('TRANSFER', '이동', 'Transfer', 3, '부서이동, 사업장이동, 전사이동 등', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentCategoryTb WHERE CategoryCode = 'DISPATCH')
INSERT INTO uAssignmentCategoryTb (CategoryCode, CategoryName, CategoryNameEng, DisplayOrder, Description, CreatedBy) VALUES
('DISPATCH', '파견', 'Dispatch', 4, '사내파견, 사외파견, 해외파견 등', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentCategoryTb WHERE CategoryCode = 'LEAVE')
INSERT INTO uAssignmentCategoryTb (CategoryCode, CategoryName, CategoryNameEng, DisplayOrder, Description, CreatedBy) VALUES
('LEAVE', '휴직', 'Leave', 5, '육아휴직, 병가휴직, 연수휴직 등', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentCategoryTb WHERE CategoryCode = 'RESIGNATION')
INSERT INTO uAssignmentCategoryTb (CategoryCode, CategoryName, CategoryNameEng, DisplayOrder, Description, CreatedBy) VALUES
('RESIGNATION', '퇴직', 'Resignation', 6, '자진퇴사, 권고사직, 정년퇴직 등', 1);
`;
    
    await sql.query(insertCategories);
    console.log('✅ 발령 대분류 데이터 입력 완료 (6개)');

    // 2. 발령 세부유형 데이터 입력
    console.log('🔄 2. 발령 세부유형 데이터 입력 중...');
    
    // 입사 관련 유형
    const insertRecruitmentTypes = `
-- 입사 관련 발령 유형
DECLARE @RecruitmentCategoryId INT = (SELECT CategoryId FROM uAssignmentCategoryTb WHERE CategoryCode = 'RECRUITMENT');

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'NEW_GRAD_HIRE')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsDeptChange, AllowsPositionChange, AllowsSalaryChange, AutoCalculateSalary, CreatedBy) VALUES
(@RecruitmentCategoryId, 'NEW_GRAD_HIRE', '채용(신입)', 'New Graduate Hire', 1, '신입사원 채용', 1, 1, 1, 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'EXPERIENCED_HIRE')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsDeptChange, AllowsPositionChange, AllowsSalaryChange, AutoCalculateSalary, CreatedBy) VALUES
(@RecruitmentCategoryId, 'EXPERIENCED_HIRE', '채용(경력)', 'Experienced Hire', 2, '경력직 채용', 1, 1, 1, 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'RETURN_FROM_LEAVE')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsDeptChange, AllowsPositionChange, CreatedBy) VALUES
(@RecruitmentCategoryId, 'RETURN_FROM_LEAVE', '복직', 'Return from Leave', 3, '휴직 후 복직', 1, 1, 1, 0, 0, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'REHIRE')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsDeptChange, AllowsPositionChange, AllowsSalaryChange, CreatedBy) VALUES
(@RecruitmentCategoryId, 'REHIRE', '재입사', 'Rehire', 4, '퇴직 후 재입사', 1, 1, 1, 1, 1, 1, 1);
`;
    
    await sql.query(insertRecruitmentTypes);
    console.log('✅ 입사 관련 유형 입력 완료 (4개)');

    // 승진 관련 유형
    const insertPromotionTypes = `
-- 승진 관련 발령 유형
DECLARE @PromotionCategoryId INT = (SELECT CategoryId FROM uAssignmentCategoryTb WHERE CategoryCode = 'PROMOTION');

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'REGULAR_PROMOTION')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsPositionChange, AllowsSalaryChange, AutoCalculateSalary, CreatedBy) VALUES
(@PromotionCategoryId, 'REGULAR_PROMOTION', '승진(정규)', 'Regular Promotion', 1, '정기 승진심사를 통한 승진', 1, 1, 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'SPECIAL_PROMOTION')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsPositionChange, AllowsSalaryChange, AutoCalculateSalary, CreatedBy) VALUES
(@PromotionCategoryId, 'SPECIAL_PROMOTION', '승진(특별)', 'Special Promotion', 2, '특별 공로에 의한 승진', 1, 1, 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'GRADE_UP')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsSalaryChange, AutoCalculateSalary, CreatedBy) VALUES
(@PromotionCategoryId, 'GRADE_UP', '승격', 'Grade Up', 3, '직급 상승', 1, 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'POSITION_ADJUSTMENT')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsPositionChange, CreatedBy) VALUES
(@PromotionCategoryId, 'POSITION_ADJUSTMENT', '직급조정', 'Position Adjustment', 4, '직급 조정', 1, 1, 1, 1, 1);
`;
    
    await sql.query(insertPromotionTypes);
    console.log('✅ 승진 관련 유형 입력 완료 (4개)');

    // 이동 관련 유형
    const insertTransferTypes = `
-- 이동 관련 발령 유형
DECLARE @TransferCategoryId INT = (SELECT CategoryId FROM uAssignmentCategoryTb WHERE CategoryCode = 'TRANSFER');

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'DEPT_TRANSFER')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsDeptChange, CreatedBy) VALUES
(@TransferCategoryId, 'DEPT_TRANSFER', '부서이동', 'Department Transfer', 1, '같은 사업장 내 부서 이동', 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'BRANCH_TRANSFER')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsBranchChange, AllowsDeptChange, CreatedBy) VALUES
(@TransferCategoryId, 'BRANCH_TRANSFER', '사업장이동', 'Branch Transfer', 2, '다른 사업장으로 이동', 1, 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'COMPANY_TRANSFER')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsCompanyChange, AllowsBranchChange, AllowsDeptChange, CreatedBy) VALUES
(@TransferCategoryId, 'COMPANY_TRANSFER', '전사이동', 'Company Transfer', 3, '계열사 또는 다른 회사로 이동', 1, 1, 1, 1, 1, 1, 1);

IF NOT EXISTS (SELECT * FROM uAssignmentTypeTb WHERE TypeCode = 'CONCURRENT_ASSIGNMENT')
INSERT INTO uAssignmentTypeTb (CategoryId, TypeCode, TypeName, TypeNameEng, DisplayOrder, Description, RequiresApproval, RequiresEffectiveDate, RequiresReason, AllowsDeptChange, AllowsPositionChange, CreatedBy) VALUES
(@TransferCategoryId, 'CONCURRENT_ASSIGNMENT', '겸직발령', 'Concurrent Assignment', 4, '기존 직무와 병행하는 겸직', 1, 1, 1, 1, 1, 1);
`;
    
    await sql.query(insertTransferTypes);
    console.log('✅ 이동 관련 유형 입력 완료 (4개)');

    // 3. 공통 발령 사유 데이터 입력
    console.log('🔄 3. 공통 발령 사유 데이터 입력 중...');
    const insertCommonReasons = `
-- 공통 발령 사유 (모든 발령 유형에 적용 가능)
IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'ORG_RESTRUCTURE')
INSERT INTO uAssignmentReasonTb (ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, IsCommon, Description, CreatedBy) VALUES
('ORG_RESTRUCTURE', '조직 개편', 'Organizational Restructuring', 1, 1, '회사 조직 개편에 따른 발령', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'BUSINESS_NEED')
INSERT INTO uAssignmentReasonTb (ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, IsCommon, Description, CreatedBy) VALUES
('BUSINESS_NEED', '업무상 필요', 'Business Requirement', 2, 1, '업무상 필요에 의한 발령', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'PERFORMANCE_EXCELLENT')
INSERT INTO uAssignmentReasonTb (ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, IsCommon, Description, CreatedBy) VALUES
('PERFORMANCE_EXCELLENT', '성과 우수', 'Excellent Performance', 3, 1, '우수한 성과에 따른 발령', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'EMPLOYEE_REQUEST')
INSERT INTO uAssignmentReasonTb (ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, IsCommon, Description, CreatedBy) VALUES
('EMPLOYEE_REQUEST', '본인 희망', 'Employee Request', 4, 1, '직원 본인의 희망에 의한 발령', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'SKILL_DEVELOPMENT')
INSERT INTO uAssignmentReasonTb (ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, IsCommon, Description, CreatedBy) VALUES
('SKILL_DEVELOPMENT', '역량 개발', 'Skill Development', 5, 1, '직무 역량 개발을 위한 발령', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'PROJECT_ASSIGNMENT')
INSERT INTO uAssignmentReasonTb (ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, IsCommon, Description, CreatedBy) VALUES
('PROJECT_ASSIGNMENT', '프로젝트 투입', 'Project Assignment', 6, 1, '특정 프로젝트 수행을 위한 발령', 1);
`;
    
    await sql.query(insertCommonReasons);
    console.log('✅ 공통 발령 사유 입력 완료 (6개)');

    // 4. 특정 유형별 사유 입력
    console.log('🔄 4. 특정 유형별 발령 사유 입력 중...');
    const insertSpecificReasons = `
-- 채용 관련 사유
DECLARE @RecruitmentCategoryId INT = (SELECT CategoryId FROM uAssignmentCategoryTb WHERE CategoryCode = 'RECRUITMENT');

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'NEW_POSITION_CREATED')
INSERT INTO uAssignmentReasonTb (CategoryId, ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, Description, CreatedBy) VALUES
(@RecruitmentCategoryId, 'NEW_POSITION_CREATED', '신규 직무 신설', 'New Position Created', 1, '새로운 직무 신설에 따른 채용', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'REPLACEMENT_HIRE')
INSERT INTO uAssignmentReasonTb (CategoryId, ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, Description, CreatedBy) VALUES
(@RecruitmentCategoryId, 'REPLACEMENT_HIRE', '결원 충원', 'Replacement Hire', 2, '퇴직자 결원 충원을 위한 채용', 1);

-- 승진 관련 사유
DECLARE @PromotionCategoryId INT = (SELECT CategoryId FROM uAssignmentCategoryTb WHERE CategoryCode = 'PROMOTION');

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'ANNUAL_PROMOTION')
INSERT INTO uAssignmentReasonTb (CategoryId, ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, Description, CreatedBy) VALUES
(@PromotionCategoryId, 'ANNUAL_PROMOTION', '정기 승진', 'Annual Promotion', 1, '연례 승진심사를 통한 승진', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'SPECIAL_ACHIEVEMENT')
INSERT INTO uAssignmentReasonTb (CategoryId, ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, Description, CreatedBy) VALUES
(@PromotionCategoryId, 'SPECIAL_ACHIEVEMENT', '특별 공로', 'Special Achievement', 2, '특별한 공로에 의한 승진', 1);

-- 이동 관련 사유  
DECLARE @TransferCategoryId INT = (SELECT CategoryId FROM uAssignmentCategoryTb WHERE CategoryCode = 'TRANSFER');

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'WORKLOAD_BALANCING')
INSERT INTO uAssignmentReasonTb (CategoryId, ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, Description, CreatedBy) VALUES
(@TransferCategoryId, 'WORKLOAD_BALANCING', '업무량 조절', 'Workload Balancing', 1, '부서간 업무량 균형을 위한 이동', 1);

IF NOT EXISTS (SELECT * FROM uAssignmentReasonTb WHERE ReasonCode = 'CAREER_DEVELOPMENT')
INSERT INTO uAssignmentReasonTb (CategoryId, ReasonCode, ReasonText, ReasonTextEng, DisplayOrder, Description, CreatedBy) VALUES
(@TransferCategoryId, 'CAREER_DEVELOPMENT', '경력 개발', 'Career Development', 2, '다양한 경력 쌓기를 위한 이동', 1);
`;
    
    await sql.query(insertSpecificReasons);
    console.log('✅ 특정 유형별 발령 사유 입력 완료 (6개)');

    // 5. 입력 결과 확인
    console.log('\n📊 입력 결과 확인...');
    const checkResult = `
SELECT 
    '대분류' AS 구분,
    COUNT(*) AS 개수
FROM uAssignmentCategoryTb WHERE IsActive = 1

UNION ALL

SELECT 
    '세부유형' AS 구분,
    COUNT(*) AS 개수
FROM uAssignmentTypeTb WHERE IsActive = 1

UNION ALL

SELECT 
    '발령사유' AS 구분,
    COUNT(*) AS 개수  
FROM uAssignmentReasonTb WHERE IsActive = 1

ORDER BY 구분;
`;
    
    const result = await sql.query(checkResult);
    
    console.log('✅ 기초 데이터 입력 완료:');
    result.recordset.forEach(row => {
      console.log(`   ${row.구분}: ${row.개수}개`);
    });

    console.log('\n🎉 인사발령 유형 기초 데이터 입력 완료!');
    console.log('\n📋 입력된 데이터 요약:');
    console.log('   📂 발령 대분류: 6개 (입사, 승진, 이동, 파견, 휴직, 퇴직)');
    console.log('   🏷️ 발령 세부유형: 12개');
    console.log('   💬 발령 사유: 12개 (공통 6개 + 특정유형 6개)');

  } catch (error) {
    console.error('❌ 기초 데이터 입력 실패:', error.message);
    console.error('상세 오류:', error);
  } finally {
    await sql.close();
    console.log('🔌 데이터베이스 연결 종료');
  }
};

insertMasterData().catch(console.error);