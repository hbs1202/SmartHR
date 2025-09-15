/**
 * 직원 테이블과 조직도 연결 관계 검증 스크립트
 */

const sql = require('mssql');
require('dotenv').config();

// 데이터베이스 설정
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
    requestTimeout: 30000,
    connectionTimeout: 30000
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

async function verifyEmployeeOrganization() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    console.log('\n=== 직원-조직도 연결 관계 검증 ===\n');

    // 1. 직원별 조직도 정보 확인
    console.log('1️⃣ 직원별 조직도 정보 확인');
    const employeeOrgResult = await pool.request().query(`
      SELECT 
        e.EmployeeId,
        e.EmployeeCode,
        e.FullName,
        e.UserRole,
        c.CompanyName,
        s.SubCompanyName,
        d.DeptName,
        p.PosName,
        p.PosGrade,
        e.CurrentSalary,
        e.IsActive
      FROM uEmployeeTb e
      INNER JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
      INNER JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
      INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
      INNER JOIN uPositionTb p ON e.PosId = p.PosId
      ORDER BY e.UserRole DESC, e.EmployeeCode
    `);

    if (employeeOrgResult.recordset.length > 0) {
      employeeOrgResult.recordset.forEach((emp, index) => {
        const status = emp.IsActive ? '✅' : '❌';
        const salary = emp.CurrentSalary ? `${emp.CurrentSalary.toLocaleString()}원` : '미설정';
        console.log(`  ${index + 1}. ${emp.FullName} (${emp.EmployeeCode}) ${status}`);
        console.log(`     🏢 ${emp.CompanyName} > ${emp.SubCompanyName} > ${emp.DeptName} > ${emp.PosName} (${emp.PosGrade})`);
        console.log(`     👤 ${emp.UserRole} | 💰 ${salary}`);
        console.log('');
      });
    } else {
      console.log('❌ 직원 데이터가 없습니다.');
    }

    // 2. 외래키 제약조건 확인
    console.log('2️⃣ 외래키 제약조건 확인');
    const fkResult = await pool.request().query(`
      SELECT 
        OBJECT_NAME(parent_object_id) AS '테이블명',
        name AS '제약조건명',
        OBJECT_NAME(referenced_object_id) AS '참조테이블명'
      FROM sys.foreign_keys 
      WHERE parent_object_id = OBJECT_ID('uEmployeeTb')
      ORDER BY name
    `);

    if (fkResult.recordset.length > 0) {
      fkResult.recordset.forEach((fk, index) => {
        console.log(`  ${index + 1}. ${fk['제약조건명']}`);
        console.log(`     ${fk['테이블명']} → ${fk['참조테이블명']}`);
      });
    } else {
      console.log('❌ 외래키 제약조건이 없습니다.');
    }

    // 3. 조직도별 직원 수 확인
    console.log('\n3️⃣ 조직도별 직원 수 확인');
    const orgCountResult = await pool.request().query(`
      SELECT 
        c.CompanyName,
        s.SubCompanyName,
        d.DeptName,
        p.PosName,
        p.PosGrade,
        p.MaxHeadcount AS '정원',
        COUNT(e.EmployeeId) AS '현재인원',
        p.MaxHeadcount - COUNT(e.EmployeeId) AS '잔여정원'
      FROM uCompanyTb c
      INNER JOIN uSubCompanyTb s ON c.CompanyId = s.CompanyId
      INNER JOIN uDeptTb d ON s.SubCompanyId = d.SubCompanyId
      INNER JOIN uPositionTb p ON d.DeptId = p.DeptId
      LEFT JOIN uEmployeeTb e ON p.PosId = e.PosId AND e.IsActive = 1
      WHERE c.IsActive = 1 AND s.IsActive = 1 AND d.IsActive = 1 AND p.IsActive = 1
      GROUP BY c.CompanyName, s.SubCompanyName, d.DeptName, p.PosName, p.PosGrade, p.MaxHeadcount
      ORDER BY c.CompanyName, s.SubCompanyName, d.DeptName, p.PosName
    `);

    orgCountResult.recordset.forEach((org, index) => {
      const occupancyRate = org['정원'] > 0 ? Math.round((org['현재인원'] / org['정원']) * 100) : 0;
      const status = org['현재인원'] > 0 ? '👥' : '📭';
      console.log(`  ${index + 1}. ${org.CompanyName} > ${org.DeptName} > ${org.PosName} ${status}`);
      console.log(`     📊 ${org['현재인원']}명 / ${org['정원']}명 (${occupancyRate}%)`);
      if (org['잔여정원'] < 0) {
        console.log(`     ⚠️ 정원 초과: ${Math.abs(org['잔여정원'])}명`);
      }
    });

    // 4. 직원 발령 이력 확인
    console.log('\n4️⃣ 직원 발령 이력 확인');
    const assignmentResult = await pool.request().query(`
      SELECT 
        e.FullName,
        e.EmployeeCode,
        a.AssignmentType,
        a.AssignmentReason,
        a.EffectiveDate,
        d.DeptName,
        p.PosName,
        a.NewSalary,
        a.CreatedAt
      FROM uEmployeeAssignmentTb a
      INNER JOIN uEmployeeTb e ON a.EmployeeId = e.EmployeeId
      INNER JOIN uDeptTb d ON a.NewDeptId = d.DeptId
      INNER JOIN uPositionTb p ON a.NewPosId = p.PosId
      WHERE a.IsActive = 1
      ORDER BY a.CreatedAt DESC
    `);

    if (assignmentResult.recordset.length > 0) {
      assignmentResult.recordset.forEach((assignment, index) => {
        const salary = assignment.NewSalary ? `${assignment.NewSalary.toLocaleString()}원` : '미설정';
        console.log(`  ${index + 1}. ${assignment.FullName} (${assignment.EmployeeCode})`);
        console.log(`     📋 ${assignment.AssignmentType}: ${assignment.AssignmentReason}`);
        console.log(`     📅 시행일: ${assignment.EffectiveDate.toISOString().substring(0, 10)}`);
        console.log(`     🏢 ${assignment.DeptName} > ${assignment.PosName}`);
        console.log(`     💰 급여: ${salary}`);
        console.log('');
      });
    } else {
      console.log('❌ 발령 이력이 없습니다.');
    }

    // 5. 데이터 무결성 검증
    console.log('\n5️⃣ 데이터 무결성 검증');
    
    // 5-1. 고아 데이터 검사 (참조무결성 위반)
    const orphanResult = await pool.request().query(`
      SELECT 
        'uEmployeeTb' AS 테이블,
        '회사ID 불일치' AS 문제,
        COUNT(*) AS 건수
      FROM uEmployeeTb e
      LEFT JOIN uCompanyTb c ON e.CompanyId = c.CompanyId
      WHERE c.CompanyId IS NULL OR c.IsActive = 0
      
      UNION ALL
      
      SELECT 
        'uEmployeeTb' AS 테이블,
        '사업장ID 불일치' AS 문제,
        COUNT(*) AS 건수
      FROM uEmployeeTb e
      LEFT JOIN uSubCompanyTb s ON e.SubCompanyId = s.SubCompanyId
      WHERE s.SubCompanyId IS NULL OR s.IsActive = 0
      
      UNION ALL
      
      SELECT 
        'uEmployeeTb' AS 테이블,
        '부서ID 불일치' AS 문제,
        COUNT(*) AS 건수
      FROM uEmployeeTb e
      LEFT JOIN uDeptTb d ON e.DeptId = d.DeptId
      WHERE d.DeptId IS NULL OR d.IsActive = 0
      
      UNION ALL
      
      SELECT 
        'uEmployeeTb' AS 테이블,
        '직책ID 불일치' AS 문제,
        COUNT(*) AS 건수
      FROM uEmployeeTb e
      LEFT JOIN uPositionTb p ON e.PosId = p.PosId
      WHERE p.PosId IS NULL OR p.IsActive = 0
    `);

    let hasIntegrityIssues = false;
    orphanResult.recordset.forEach((issue, index) => {
      if (issue.건수 > 0) {
        hasIntegrityIssues = true;
        console.log(`  ❌ ${issue.테이블}: ${issue.문제} (${issue.건수}건)`);
      }
    });

    if (!hasIntegrityIssues) {
      console.log('  ✅ 데이터 무결성 검증 통과');
    }

    // 6. 요약 통계
    console.log('\n6️⃣ 요약 통계');
    const summaryResult = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM uEmployeeTb WHERE IsActive = 1) AS '활성직원수',
        (SELECT COUNT(*) FROM uEmployeeTb WHERE IsActive = 0) AS '비활성직원수',
        (SELECT COUNT(DISTINCT UserRole) FROM uEmployeeTb WHERE IsActive = 1) AS '역할종류수',
        (SELECT COUNT(*) FROM uEmployeeAssignmentTb WHERE IsActive = 1) AS '발령이력수',
        (SELECT COUNT(*) FROM uCompanyTb WHERE IsActive = 1) AS '활성회사수',
        (SELECT COUNT(*) FROM uSubCompanyTb WHERE IsActive = 1) AS '활성사업장수',
        (SELECT COUNT(*) FROM uDeptTb WHERE IsActive = 1) AS '활성부서수',
        (SELECT COUNT(*) FROM uPositionTb WHERE IsActive = 1) AS '활성직책수'
    `);

    const summary = summaryResult.recordset[0];
    console.log(`  👥 직원: ${summary['활성직원수']}명 활성, ${summary['비활성직원수']}명 비활성`);
    console.log(`  👤 역할: ${summary['역할종류수']}종류`);
    console.log(`  📋 발령 이력: ${summary['발령이력수']}건`);
    console.log(`  🏢 조직: 회사 ${summary['활성회사수']}개, 사업장 ${summary['활성사업장수']}개, 부서 ${summary['활성부서수']}개, 직책 ${summary['활성직책수']}개`);

    console.log('\n✅ 직원-조직도 연결 관계 검증이 완료되었습니다!');
    
  } catch (error) {
    console.error('❌ 검증 중 오류 발생:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔄 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
verifyEmployeeOrganization();