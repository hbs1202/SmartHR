/**
 * 초기 관리자 계정 및 테스트 직원 데이터 생성 스크립트
 */

const sql = require('mssql');
const bcrypt = require('bcryptjs');
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

async function createInitialEmployees() {
  let pool;
  
  try {
    console.log('🔄 데이터베이스 연결 중...');
    pool = await sql.connect(dbConfig);
    console.log('✅ 데이터베이스 연결 성공');

    // 조직도 데이터 조회 (직원 배치용)
    console.log('🔄 조직도 정보 조회 중...');
    
    const orgResult = await pool.request().query(`
      SELECT 
        c.CompanyId, c.CompanyName,
        s.SubCompanyId, s.SubCompanyName,
        d.DeptId, d.DeptName,
        p.PosId, p.PosName, p.PosGrade
      FROM uCompanyTb c
      INNER JOIN uSubCompanyTb s ON c.CompanyId = s.CompanyId
      INNER JOIN uDeptTb d ON s.SubCompanyId = d.SubCompanyId
      INNER JOIN uPositionTb p ON d.DeptId = p.DeptId
      WHERE c.IsActive = 1 AND s.IsActive = 1 AND d.IsActive = 1 AND p.IsActive = 1
      ORDER BY c.CompanyId, s.SubCompanyId, d.DeptId, p.PosId
    `);

    if (orgResult.recordset.length === 0) {
      console.error('❌ 활성 조직도 데이터가 없습니다. 먼저 조직도를 생성해주세요.');
      return;
    }

    console.log('📋 사용 가능한 조직도:');
    orgResult.recordset.forEach((org, index) => {
      console.log(`  ${index + 1}. ${org.CompanyName} > ${org.SubCompanyName} > ${org.DeptName} > ${org.PosName} (${org.PosGrade})`);
    });

    // 관리자용 직책 찾기 (부장급 이상)
    const adminPosition = orgResult.recordset.find(org => 
      org.PosGrade && (org.PosGrade.includes('부장') || org.PosGrade.includes('이사') || org.PosGrade.includes('대표'))
    ) || orgResult.recordset[0]; // 없으면 첫 번째 직책 사용

    // 일반 직원용 직책 찾기 (사원급)
    const employeePosition = orgResult.recordset.find(org => 
      org.PosGrade && (org.PosGrade.includes('사원') || org.PosGrade.includes('주임') || org.PosGrade.includes('대리'))
    ) || orgResult.recordset[orgResult.recordset.length - 1]; // 없으면 마지막 직책 사용

    console.log('\n🎯 직책 선택:');
    console.log(`  관리자용: ${adminPosition.CompanyName} > ${adminPosition.DeptName} > ${adminPosition.PosName}`);
    console.log(`  직원용: ${employeePosition.CompanyName} > ${employeePosition.DeptName} > ${employeePosition.PosName}`);

    // 비밀번호 해시 생성
    console.log('\n🔐 비밀번호 해시 생성 중...');
    const adminPassword = await bcrypt.hash('admin123!', 10);
    const employeePassword = await bcrypt.hash('employee123!', 10);
    console.log('✅ 비밀번호 해시 생성 완료');

    // 직원 데이터 정의
    const employeesToCreate = [
      {
        name: '시스템 관리자',
        employeeCode: 'ADMIN001',
        email: 'admin@smarthr.com',
        firstName: '관리자',
        lastName: '시스템',
        password: adminPassword,
        userRole: 'admin',
        position: adminPosition,
        salary: 8000000
      },
      {
        name: '인사팀 관리자',
        employeeCode: 'HR001',
        email: 'hr@smarthr.com', 
        firstName: '영희',
        lastName: '김',
        password: adminPassword,
        userRole: 'manager',
        position: adminPosition,
        salary: 6000000
      },
      {
        name: '테스트 직원 1',
        employeeCode: 'EMP001',
        email: 'employee1@smarthr.com',
        firstName: '철수',
        lastName: '이',
        password: employeePassword,
        userRole: 'employee',
        position: employeePosition,
        salary: 3500000
      },
      {
        name: '테스트 직원 2',
        employeeCode: 'EMP002',
        email: 'employee2@smarthr.com',
        firstName: '민지',
        lastName: '박',
        password: employeePassword,
        userRole: 'employee',
        position: employeePosition,
        salary: 3200000
      }
    ];

    console.log('\n👥 직원 계정 생성 중...');

    for (const emp of employeesToCreate) {
      try {
        // 기존 직원 존재 확인
        const existingResult = await pool.request()
          .input('EmployeeCode', sql.NVarChar(20), emp.employeeCode)
          .input('Email', sql.NVarChar(255), emp.email)
          .query(`
            SELECT COUNT(*) as count 
            FROM uEmployeeTb 
            WHERE EmployeeCode = @EmployeeCode OR Email = @Email
          `);

        if (existingResult.recordset[0].count > 0) {
          console.log(`⚠️ ${emp.name} (${emp.employeeCode}) - 이미 존재함`);
          continue;
        }

        // 직원 생성 SP 호출
        const result = await pool.request()
          .input('CompanyId', sql.Int, emp.position.CompanyId)
          .input('SubCompanyId', sql.Int, emp.position.SubCompanyId)
          .input('DeptId', sql.Int, emp.position.DeptId)
          .input('PosId', sql.Int, emp.position.PosId)
          .input('EmployeeCode', sql.NVarChar(20), emp.employeeCode)
          .input('Password', sql.NVarChar(255), emp.password)
          .input('Email', sql.NVarChar(255), emp.email)
          .input('FirstName', sql.NVarChar(50), emp.firstName)
          .input('LastName', sql.NVarChar(50), emp.lastName)
          .input('NameEng', sql.NVarChar(100), null)
          .input('Gender', sql.NChar(1), null)
          .input('BirthDate', sql.Date, null)
          .input('PhoneNumber', sql.NVarChar(20), null)
          .input('HireDate', sql.Date, new Date())
          .input('EmploymentType', sql.NVarChar(50), '정규직')
          .input('CurrentSalary', sql.Decimal(15, 2), emp.salary)
          .input('UserRole', sql.NVarChar(50), emp.userRole)
          .input('CreatedBy', sql.Int, 1)
          .output('ResultCode', sql.Int)
          .output('Message', sql.NVarChar(500))
          .execute('x_CreateEmployee');

        const resultCode = result.output.ResultCode;
        const message = result.output.Message;

        if (resultCode === 0) {
          console.log(`✅ ${emp.name} (${emp.employeeCode}) - 생성 성공`);
          console.log(`   📧 이메일: ${emp.email}`);
          console.log(`   🏢 조직: ${emp.position.DeptName} > ${emp.position.PosName}`);
          console.log(`   💰 급여: ${emp.salary.toLocaleString()}원`);
          console.log(`   👤 역할: ${emp.userRole}`);
        } else {
          console.log(`❌ ${emp.name} (${emp.employeeCode}) - 생성 실패: ${message}`);
        }

      } catch (error) {
        console.error(`❌ ${emp.name} 생성 중 오류:`, error.message);
      }
    }

    // 생성된 직원 목록 확인
    console.log('\n📋 생성된 직원 목록 확인...');
    const employeesResult = await pool.request().query(`
      SELECT 
        e.EmployeeId,
        e.EmployeeCode,
        e.Email,
        e.FullName,
        e.UserRole,
        e.CurrentSalary,
        e.HireDate,
        e.IsActive,
        d.DeptName,
        p.PosName,
        p.PosGrade
      FROM uEmployeeTb e
      INNER JOIN uDeptTb d ON e.DeptId = d.DeptId
      INNER JOIN uPositionTb p ON e.PosId = p.PosId
      ORDER BY e.UserRole DESC, e.CreatedAt
    `);

    console.log('\n🎉 최종 직원 목록:');
    employeesResult.recordset.forEach((emp, index) => {
      const status = emp.IsActive ? '✅ 활성' : '❌ 비활성';
      const salary = emp.CurrentSalary ? `${emp.CurrentSalary.toLocaleString()}원` : '미설정';
      console.log(`  ${index + 1}. ${emp.FullName} (${emp.EmployeeCode})`);
      console.log(`     📧 ${emp.Email}`);
      console.log(`     👤 ${emp.UserRole} | 💰 ${salary} | ${status}`);
      console.log(`     🏢 ${emp.DeptName} > ${emp.PosName} (${emp.PosGrade})`);
      console.log('');
    });

    console.log('✅ 초기 직원 데이터 생성이 완료되었습니다!');
    console.log('\n🔑 로그인 정보:');
    console.log('  시스템 관리자: admin@smarthr.com / admin123!');
    console.log('  인사팀 관리자: hr@smarthr.com / admin123!');
    console.log('  테스트 직원1: employee1@smarthr.com / employee123!');
    console.log('  테스트 직원2: employee2@smarthr.com / employee123!');
    
  } catch (error) {
    console.error('❌ 초기 직원 데이터 생성 실패:', error.message);
    throw error;
  } finally {
    if (pool) {
      await pool.close();
      console.log('🔄 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
createInitialEmployees();