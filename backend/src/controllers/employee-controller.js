/**
 * 직원 관리 API 컨트롤러
 * @description 직원 정보 CRUD 및 발령 관리 시스템
 * @author SmartHR Team
 * @date 2024-09-13
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { authenticateToken } = require('../middleware/auth');
const { executeStoredProcedureWithNamedParams } = require('../database/dbHelper');

/**
 * 직원 등록 API
 * @route POST /api/employees
 * @description 새로운 직원을 등록하고 발령 이력을 생성
 * @access Private (JWT 토큰 필요, admin/manager 권한)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    // 1. 권한 확인 (admin 또는 manager만 가능)
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        data: null,
        message: '직원 등록 권한이 없습니다.'
      });
    }

    // 2. 요청 데이터 추출 및 검증
    const {
      companyId,
      subCompanyId, 
      deptId,
      posId,
      employeeCode,
      password,
      email,
      firstName,
      lastName,
      nameEng,
      gender,
      birthDate,
      phoneNumber,
      hireDate,
      employmentType,
      currentSalary,
      userRole
    } = req.body;

    // 3. 필수 파라미터 검증
    if (!companyId || !subCompanyId || !deptId || !posId || 
        !employeeCode || !password || !email || !firstName || !lastName || !hireDate) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '필수 입력 항목이 누락되었습니다. (회사, 사업장, 부서, 직책, 직원코드, 비밀번호, 이메일, 이름, 입사일)'
      });
    }

    // 4. 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 이메일 주소를 입력해주세요.'
      });
    }

    // 5. 비밀번호 해싱
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    console.log('🔄 직원 등록 시도:', { 
      employeeCode, 
      email, 
      createdBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 6. Stored Procedure 호출
    const spParams = {
      CompanyId: companyId,
      SubCompanyId: subCompanyId,
      DeptId: deptId,
      PosId: posId,
      EmployeeCode: employeeCode,
      Password: hashedPassword,
      Email: email,
      FirstName: firstName,
      LastName: lastName,
      NameEng: nameEng || null,
      Gender: gender || null,
      BirthDate: birthDate || null,
      PhoneNumber: phoneNumber || null,
      HireDate: hireDate,
      EmploymentType: employmentType || '정규직',
      CurrentSalary: currentSalary || null,
      UserRole: userRole || 'employee',
      CreatedBy: req.user.employeeId
    };

    const result = await executeStoredProcedureWithNamedParams('x_CreateEmployee', spParams);

    // 7. SP 실행 결과 확인
    if (result.ResultCode !== 0) {
      console.warn('🚫 직원 등록 실패:', { 
        employeeCode, 
        email,
        reason: result.Message,
        timestamp: new Date().toISOString() 
      });

      return res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직원 등록에 실패했습니다.'
      });
    }

    // 8. 성공 시 새로 생성된 직원 정보 조회
    const newEmployeeData = result.data && result.data.length > 0 ? result.data[0] : null;

    console.log('✅ 직원 등록 성공:', { 
      employeeId: newEmployeeData?.NewEmployeeId || 'unknown',
      employeeCode,
      email,
      createdBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 9. 성공 응답
    res.status(201).json({
      success: true,
      data: {
        employeeId: newEmployeeData?.NewEmployeeId,
        employeeCode: employeeCode,
        email: email,
        fullName: `${firstName} ${lastName}`,
        hireDate: hireDate,
        message: '직원이 성공적으로 등록되었습니다.'
      },
      message: result.Message || '직원이 성공적으로 등록되었습니다.'
    });

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 직원 등록 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body ? {
        employeeCode: req.body.employeeCode,
        email: req.body.email
      } : null, // 비밀번호는 로깅하지 않음
      user: req.user,
      timestamp: new Date().toISOString()
    });

    // 시스템 오류 응답
    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

/**
 * 직원 목록 조회 API
 * @route GET /api/employees
 * @description 직원 목록을 페이징 및 검색 기능과 함께 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 1. 쿼리 파라미터 추출
    const {
      page = 1,
      limit = 10,
      searchTerm = '',
      companyId = '',
      subCompanyId = '',
      deptId = '',
      posId = '',
      userRole = '',
      isActive = ''
    } = req.query;

    // 2. 페이징 파라미터 검증
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '페이지 번호는 1 이상, 페이지 크기는 1~100 사이여야 합니다.'
      });
    }

    console.log('🔄 직원 목록 조회 시도:', { 
      page: pageNum, 
      limit: limitNum, 
      searchTerm,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 3. Stored Procedure 호출
    const spParams = {
      Page: pageNum,
      PageSize: limitNum,
      CompanyId: companyId ? parseInt(companyId) : null,
      SubCompanyId: subCompanyId ? parseInt(subCompanyId) : null,
      DeptId: deptId ? parseInt(deptId) : null,
      PosId: posId ? parseInt(posId) : null,
      IsActive: isActive !== '' ? (isActive === 'true') : null,
      SearchKeyword: searchTerm || null,
      UserRole: userRole || null,
      EmploymentType: null // 현재는 사용하지 않음
    };

    // x_GetEmployees는 Output 파라미터를 사용하지 않으므로 직접 호출
    console.log('🔄 x_GetEmployees 직접 호출 시도...');
    
    let result;
    try {
      const sql = require('mssql');
      const dbConfig = require('../../config/database');
      
      // 연결 풀 생성 또는 기존 풀 사용
      let pool;
      if (sql.globalConnection && sql.globalConnection.connected) {
        pool = sql.globalConnection;
      } else {
        pool = await sql.connect(dbConfig.dbConfig);
      }
      
      const request = pool.request();
      
      // 파라미터 설정
      request.input('Page', sql.Int, spParams.Page);
      request.input('PageSize', sql.Int, spParams.PageSize);
      request.input('CompanyId', sql.Int, spParams.CompanyId);
      request.input('SubCompanyId', sql.Int, spParams.SubCompanyId);
      request.input('DeptId', sql.Int, spParams.DeptId);
      request.input('PosId', sql.Int, spParams.PosId);
      request.input('IsActive', sql.Bit, spParams.IsActive);
      request.input('SearchKeyword', sql.NVarChar(100), spParams.SearchKeyword);
      request.input('UserRole', sql.NVarChar(50), spParams.UserRole);
      request.input('EmploymentType', sql.NVarChar(50), spParams.EmploymentType);
      
      console.log('🔄 x_GetEmployees 실행 중...');
      const spResult = await request.execute('x_GetEmployees');
      
      result = {
        ResultCode: 0,
        Message: '성공',
        data: spResult.recordset
      };
      
      console.log('✅ x_GetEmployees 직접 호출 성공:', { 
        recordCount: spResult.recordset.length 
      });
      
    } catch (directCallError) {
      console.error('❌ x_GetEmployees 직접 호출 실패:', directCallError.message);
      
      // 실패 시 다른 방법으로 데이터 조회 시도
      console.log('🔄 대안 방법으로 직원 목록 조회 시도...');
      
      const sql = require('mssql');
      const dbConfig = require('../../config/database');
      
      const pool = await sql.connect(dbConfig.dbConfig);
      const queryResult = await pool.request().query(`
        SELECT TOP ${limitNum}
          EmployeeId, EmployeeCode, Email, FullName, UserRole, 
          EmployeeActive AS IsActive, HireDate, EmploymentType,
          CreatedAt, CompanyName, SubCompanyName, DeptName, PosName
        FROM uEmployeeDetailView
        ORDER BY EmployeeId
      `);
      
      result = {
        ResultCode: 0,
        Message: '대안 방법으로 조회 성공',
        data: queryResult.recordset
      };
      
      console.log('✅ 대안 방법으로 직원 목록 조회 성공:', { 
        recordCount: queryResult.recordset.length 
      });
    }

    // 4. SP 실행 결과 확인
    if (result.ResultCode !== 0) {
      console.warn('🚫 직원 목록 조회 실패:', { 
        reason: result.Message,
        requestedBy: req.user.employeeId,
        timestamp: new Date().toISOString() 
      });

      return res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직원 목록 조회에 실패했습니다.'
      });
    }

    // 5. 응답 데이터 구성
    const employees = result.data || [];
    
    // SP에서 TotalCount를 반환하지 않을 수 있으므로 안전하게 처리
    const totalCount = employees.length > 0 && employees[0].TotalCount ? employees[0].TotalCount : employees.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    console.log('✅ 직원 목록 조회 성공:', { 
      totalCount,
      currentPage: pageNum,
      totalPages,
      returnedCount: employees.length,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 6. 성공 응답 (안전하게 필드 접근)
    res.json({
      success: true,
      data: {
        employees: employees.map(emp => ({
          employeeId: emp.EmployeeId || emp.employeeId,
          employeeCode: emp.EmployeeCode || emp.employeeCode,
          email: emp.Email || emp.email,
          fullName: emp.FullName || emp.fullName,
          nameEng: emp.NameEng || emp.nameEng,
          gender: emp.Gender || emp.gender,
          phoneNumber: emp.PhoneNumber || emp.phoneNumber,
          hireDate: emp.HireDate || emp.hireDate,
          employmentType: emp.EmploymentType || emp.employmentType,
          currentSalary: emp.CurrentSalary || emp.currentSalary,
          userRole: emp.UserRole || emp.userRole,
          isActive: emp.IsActive !== undefined ? emp.IsActive : (emp.isActive !== undefined ? emp.isActive : true),
          lastLoginAt: emp.LastLoginAt || emp.lastLoginAt,
          // 조직 정보
          companyName: emp.CompanyName || emp.companyName,
          subCompanyName: emp.SubCompanyName || emp.subCompanyName,
          deptName: emp.DeptName || emp.deptName,
          posName: emp.PosName || emp.posName,
          // 메타 정보
          createdAt: emp.CreatedAt || emp.createdAt,
          updatedAt: emp.UpdatedAt || emp.updatedAt
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount,
          pageSize: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      },
      message: '직원 목록 조회가 완료되었습니다.'
    });

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 직원 목록 조회 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      queryParams: req.query,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    // 시스템 오류 응답
    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

/**
 * 직원 상세 조회 API
 * @route GET /api/employees/:id
 * @description 특정 직원의 상세 정보를 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    // 1. 직원 ID 파라미터 추출 및 검증
    const employeeId = parseInt(req.params.id);
    
    if (!employeeId || employeeId < 1) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 직원 ID를 입력해주세요.'
      });
    }

    // 2. 권한 확인 (본인 또는 admin/manager만 조회 가능)
    if (req.user.employeeId !== employeeId && 
        req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        data: null,
        message: '해당 직원 정보를 조회할 권한이 없습니다.'
      });
    }

    console.log('🔄 직원 상세 조회 시도:', { 
      targetEmployeeId: employeeId,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 3. Stored Procedure 호출
    const spParams = {
      EmployeeId: employeeId
    };

    const result = await executeStoredProcedureWithNamedParams('x_GetEmployeeById', spParams);

    // 4. SP 실행 결과 확인
    if (result.ResultCode !== 0) {
      console.warn('🚫 직원 상세 조회 실패:', { 
        employeeId,
        reason: result.Message,
        requestedBy: req.user.employeeId,
        timestamp: new Date().toISOString() 
      });

      return res.status(404).json({
        success: false,
        data: null,
        message: result.Message || '직원 정보를 찾을 수 없습니다.'
      });
    }

    // 5. 데이터 확인
    if (!result.data || result.data.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '직원 정보를 찾을 수 없습니다.'
      });
    }

    const employeeData = result.data[0];

    console.log('✅ 직원 상세 조회 성공:', { 
      employeeId,
      employeeCode: employeeData.EmployeeCode,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 6. 성공 응답 (비밀번호 제외)
    res.json({
      success: true,
      data: {
        employeeId: employeeData.EmployeeId,
        employeeCode: employeeData.EmployeeCode,
        email: employeeData.Email,
        fullName: employeeData.FullName,
        nameEng: employeeData.NameEng,
        gender: employeeData.Gender,
        birthDate: employeeData.BirthDate,
        phoneNumber: employeeData.PhoneNumber,
        hireDate: employeeData.HireDate,
        employmentType: employeeData.EmploymentType,
        currentSalary: employeeData.CurrentSalary,
        userRole: employeeData.UserRole,
        isActive: employeeData.IsActive,
        lastLoginAt: employeeData.LastLoginAt,
        // 조직 정보
        companyId: employeeData.CompanyId,
        subCompanyId: employeeData.SubCompanyId,
        deptId: employeeData.DeptId,
        posId: employeeData.PosId,
        // 메타 정보
        createdAt: employeeData.CreatedAt,
        updatedAt: employeeData.UpdatedAt
      },
      message: '직원 상세 정보 조회가 완료되었습니다.'
    });

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 직원 상세 조회 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      employeeId: req.params.id,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    // 시스템 오류 응답
    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

/**
 * 직원 정보 수정 API
 * @route PUT /api/employees/:id
 * @description 직원 정보를 수정 (조직 정보 제외)
 * @access Private (JWT 토큰 필요, 본인 또는 admin/manager)
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    // 1. 직원 ID 파라미터 추출 및 검증
    const employeeId = parseInt(req.params.id);
    
    if (!employeeId || employeeId < 1) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 직원 ID를 입력해주세요.'
      });
    }

    // 2. 권한 확인 (본인 또는 admin/manager만 수정 가능)
    if (req.user.employeeId !== employeeId && 
        req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        data: null,
        message: '해당 직원 정보를 수정할 권한이 없습니다.'
      });
    }

    // 3. 요청 데이터 추출
    const {
      firstName,
      lastName,
      nameEng,
      gender,
      birthDate,
      phoneNumber,
      employmentType,
      currentSalary,
      userRole  // admin만 수정 가능
    } = req.body;

    // 4. 업데이트할 데이터가 있는지 확인
    if (!firstName && !lastName && !nameEng && !gender && 
        !birthDate && !phoneNumber && !employmentType && 
        !currentSalary && !userRole) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '수정할 정보를 입력해주세요.'
      });
    }

    // 5. userRole 수정은 admin만 가능
    if (userRole && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: '사용자 권한 변경은 관리자만 가능합니다.'
      });
    }

    console.log('🔄 직원 정보 수정 시도:', { 
      targetEmployeeId: employeeId,
      updatedBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 6. x_UpdateEmployee 호출
    const spParams = {
      EmployeeId: employeeId,
      FirstName: firstName || null,
      LastName: lastName || null,
      NameEng: nameEng || null,
      Gender: gender || null,
      BirthDate: birthDate ? new Date(birthDate) : null,
      PhoneNumber: phoneNumber || null,
      EmploymentType: employmentType || null,
      CurrentSalary: currentSalary ? parseFloat(currentSalary) : null,
      UserRole: userRole || null,
      UpdatedBy: req.user.employeeId
    };

    const result = await executeStoredProcedureWithNamedParams('x_UpdateEmployee', spParams);

    // 7. SP 실행 결과 확인
    if (result.ResultCode !== 0) {
      console.warn('🚫 직원 정보 수정 실패:', { 
        employeeId,
        reason: result.Message,
        updatedBy: req.user.employeeId,
        timestamp: new Date().toISOString() 
      });

      return res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직원 정보 수정에 실패했습니다.'
      });
    }

    console.log('✅ 직원 정보 수정 성공:', { 
      employeeId,
      updatedBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 8. 성공 응답
    res.json({
      success: true,
      data: result.data && result.data.length > 0 ? result.data[0] : { employeeId },
      message: result.Message || '직원 정보가 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 직원 정보 수정 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      employeeId: req.params.id,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    // 시스템 오류 응답
    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

/**
 * 직원 삭제 API (소프트 삭제)
 * @route DELETE /api/employees/:id
 * @description 직원을 비활성화 (소프트 삭제)
 * @access Private (JWT 토큰 필요, admin만 가능)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // 1. 권한 확인 (admin만 가능)
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        data: null,
        message: '직원 삭제 권한이 없습니다. 관리자만 가능합니다.'
      });
    }

    // 2. 직원 ID 파라미터 추출 및 검증
    const employeeId = parseInt(req.params.id);
    
    if (!employeeId || employeeId < 1) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 직원 ID를 입력해주세요.'
      });
    }

    // 3. 본인 삭제 방지
    if (req.user.employeeId === employeeId) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '본인 계정은 삭제할 수 없습니다.'
      });
    }

    console.log('🔄 직원 삭제 시도:', { 
      targetEmployeeId: employeeId,
      deletedBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 4. 삭제 사유 추출 (선택적)
    const { deleteReason } = req.body;

    // 5. x_DeleteEmployee 호출
    const spParams = {
      EmployeeId: employeeId,
      DeletedBy: req.user.employeeId,
      DeleteReason: deleteReason || null
    };

    const result = await executeStoredProcedureWithNamedParams('x_DeleteEmployee', spParams);

    // 6. SP 실행 결과 확인
    if (result.ResultCode !== 0) {
      console.warn('🚫 직원 삭제 실패:', { 
        employeeId,
        reason: result.Message,
        deletedBy: req.user.employeeId,
        timestamp: new Date().toISOString() 
      });

      return res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직원 삭제에 실패했습니다.'
      });
    }

    console.log('✅ 직원 삭제 성공:', { 
      employeeId,
      deletedBy: req.user.employeeId,
      timestamp: new Date().toISOString() 
    });

    // 7. 성공 응답
    res.json({
      success: true,
      data: result.data && result.data.length > 0 ? result.data[0] : { employeeId },
      message: result.Message || '직원이 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 직원 삭제 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      employeeId: req.params.id,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    // 시스템 오류 응답
    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

module.exports = router;