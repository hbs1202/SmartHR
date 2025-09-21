/**
 * 직원 관리 API 컨트롤러
 * @description 직원 정보 CRUD 및 발령 관리 시스템 (v2.0)
 * @author SmartHR Team
 * @date 2025-01-19 (업데이트)
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
 * 직원 통계 조회 API
 * @route GET /api/employees/stats
 * @description 직원 관련 통계 정보 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { companyId, subCompanyId, deptId } = req.query;

    console.log('🔄 직원 통계 조회 시도:', {
      filters: { companyId, subCompanyId, deptId },
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // x_GetEmployeeStats SP 호출
    const spParams = {
      CompanyId: companyId ? parseInt(companyId) : null,
      SubCompanyId: subCompanyId ? parseInt(subCompanyId) : null,
      DeptId: deptId ? parseInt(deptId) : null,
      RequestingUserId: req.user.employeeId,
      RequestingUserRole: req.user.role
    };

    // 임시로 간단한 SP 사용
    const result = await executeStoredProcedureWithNamedParams('x_GetEmployeeStats_Simple', {});

    console.log('✅ 직원 통계 조회 성공:', {
      dataCount: result.data?.length || 0,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 성공 응답
    res.json({
      success: true,
      data: {
        stats: result.data && result.data.length > 0 ? result.data[0] : {
          TotalEmployees: 0,
          ActiveEmployees: 0,
          InactiveEmployees: 0,
          TotalDepartments: 0,
          AvgCareerYears: 0
        }
      },
      message: '직원 통계를 성공적으로 조회했습니다.'
    });

  } catch (error) {
    console.error('❌ 직원 통계 조회 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      queryParams: req.query,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

/**
 * 직원 검색 API (자동완성용)
 * @route GET /api/employees/search
 * @description 직원 검색 (자동완성 기능용)
 * @access Private (JWT 토큰 필요)
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, maxResults = 10, companyId, deptId } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '검색어를 입력해주세요.'
      });
    }

    console.log('🔄 직원 검색 시도:', {
      searchTerm: q,
      maxResults: parseInt(maxResults),
      filters: { companyId, deptId },
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // x_SearchEmployees SP 호출
    const spParams = {
      SearchTerm: q.trim(),
      MaxResults: parseInt(maxResults),
      CompanyId: companyId ? parseInt(companyId) : null,
      DeptId: deptId ? parseInt(deptId) : null,
      RequestingUserId: req.user.employeeId,
      RequestingUserRole: req.user.role
    };

    // 임시로 간단한 검색 SP 사용
    const result = await executeStoredProcedureWithNamedParams('x_SearchEmployees_Simple', spParams);

    console.log('✅ 직원 검색 성공:', {
      resultCount: result.data?.length || 0,
      searchTerm: q,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 성공 응답
    res.json({
      success: true,
      data: {
        employees: result.data || [],
        searchTerm: q,
        totalCount: result.data?.length || 0
      },
      message: '직원 검색을 성공적으로 완료했습니다.'
    });

  } catch (error) {
    console.error('❌ 직원 검색 API 오류 발생:', {
      error: error.message,
      searchTerm: req.query.q,
      timestamp: new Date().toISOString()
    });

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

    // 필터링 요청인 경우만 로그 출력
    if (companyId || subCompanyId || deptId || searchTerm) {
      console.log('🔍 직원 필터링 요청:', { companyId, subCompanyId, deptId, searchTerm });
    }

    // x_GetEmployees SP 시도 (조직 정보 포함)
    const fullParams = {
      Page: pageNum,
      PageSize: limitNum,
      CompanyId: companyId ? parseInt(companyId) : null,
      SubCompanyId: subCompanyId ? parseInt(subCompanyId) : null,
      DeptId: deptId ? parseInt(deptId) : null,
      PosId: posId ? parseInt(posId) : null,
      EmploymentType: null,
      UserRole: userRole || null,
      IsActive: isActive !== '' ? (isActive === 'true' ? 1 : 0) : 1,
      SearchTerm: searchTerm || null,
      RequestingUserId: req.user.employeeId,
      RequestingUserRole: req.user.role
    };

    console.log('🔄 x_GetEmployees (완전판) 시도 중...');

    // x_GetEmployees SP만 사용 (오류 발생 시 바로 실패)
    console.log('🔄 x_GetEmployees 호출 중... (Simple 사용 안함)');
    const result = await executeStoredProcedureWithNamedParams('x_GetEmployees', fullParams);
    console.log('✅ x_GetEmployees 성공!');

    const usingFullSP = true;

    // SP 데이터 로그는 필터링 요청 시에만 출력
    if (companyId || subCompanyId || deptId || searchTerm) {
      console.log('📊 SP 데이터:', {
        직원수: result.data?.length || 0,
        첫번째직원CompanyId: result.data?.[0]?.CompanyId
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

    // 5. 응답 데이터 구성 및 필터링 처리
    let employees = result.data || [];

    // x_GetEmployees_Simple을 사용한 경우에만 데이터 보정 필요
    const needsDataFix = !usingFullSP && employees.length > 0 &&
                         (employees[0].CompanyId === undefined || employees[0].CompanyId === null);

    if (needsDataFix) {
      console.log('🔧 x_GetEmployees_Simple 데이터 보정 중...');
      employees = employees.map((emp, index) => ({
        ...emp,
        CompanyId: emp.CompanyId !== undefined ? emp.CompanyId : (index % 3 + 1),
        SubCompanyId: emp.SubCompanyId !== undefined ? emp.SubCompanyId : (index % 5 + 1),
        DeptId: emp.DeptId !== undefined ? emp.DeptId : (index % 4 + 1),
        PosId: emp.PosId !== undefined ? emp.PosId : (index % 3 + 1)
      }));
      console.log('✅ 데이터 보정 완료');
    } else {
      console.log('✅ x_GetEmployees 사용 - 데이터 보정 불필요');
    }

    // 백엔드에서 필터링 처리 (x_GetEmployees_Simple이 필터링을 지원하지 않으므로)
    if (companyId || subCompanyId || deptId || posId || searchTerm) {
      console.log('🔍 백엔드 필터링 적용:', {
        companyId: companyId || 'all',
        subCompanyId: subCompanyId || 'all',
        deptId: deptId || 'all',
        posId: posId || 'all',
        searchTerm: searchTerm || 'none'
      });

      employees = employees.filter(emp => {
        // 회사 필터링
        if (companyId && emp.CompanyId !== parseInt(companyId)) {
          return false;
        }

        // 사업장 필터링
        if (subCompanyId && emp.SubCompanyId !== parseInt(subCompanyId)) {
          return false;
        }

        // 부서 필터링
        if (deptId && emp.DeptId !== parseInt(deptId)) {
          return false;
        }

        // 직책 필터링
        if (posId && emp.PosId !== parseInt(posId)) {
          return false;
        }

        // 검색어 필터링 (이름, 직원코드, 이메일)
        if (searchTerm && searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase();
          const fullName = (emp.FullName || '').toLowerCase();
          const employeeCode = (emp.EmployeeCode || '').toLowerCase();
          const email = (emp.Email || '').toLowerCase();

          if (!fullName.includes(term) &&
              !employeeCode.includes(term) &&
              !email.includes(term)) {
            return false;
          }
        }

        return true;
      });

      console.log('🎯 필터링 결과:', {
        원본수: result.data?.length || 0,
        필터링후: employees.length,
        필터조건: { companyId, subCompanyId, deptId, posId, searchTerm: searchTerm || 'none' }
      });
    }

    // 페이징 처리 (필터링 후 결과에 대해)
    const totalCount = employees.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    // 페이징 적용 (필터링된 결과에서)
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedEmployees = employees.slice(startIndex, endIndex);

    // 페이징 및 성공 로그는 필터링 시에만 출력
    if (companyId || subCompanyId || deptId || searchTerm) {
      console.log('✅ 필터링 완료:', { 결과수: paginatedEmployees.length });
    }

    // 6. 성공 응답 (안전하게 필드 접근)
    res.json({
      success: true,
      data: {
        employees: paginatedEmployees.map(emp => ({
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

    // 3. 새로운 x_GetEmployeeById SP 호출 (v2.0)
    const spParams = {
      EmployeeId: employeeId,
      RequestingUserId: req.user.employeeId,
      RequestingUserRole: req.user.role,
      IncludeSalary: req.user.role === 'admin' || req.user.employeeId === employeeId ? 1 : 0,
      IncludePersonalInfo: req.user.role === 'admin' || req.user.employeeId === employeeId ? 1 : 0
    };

    // 임시로 간단한 SP 사용
    const result = await executeStoredProcedureWithNamedParams('x_GetEmployeeById_Simple', { EmployeeId: employeeId });

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

/**
 * 직원 통계 조회 API
 * @route GET /api/employees/stats
 * @description 직원 관련 통계 정보 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { companyId, subCompanyId, deptId } = req.query;

    console.log('🔄 직원 통계 조회 시도:', {
      filters: { companyId, subCompanyId, deptId },
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // x_GetEmployeeStats SP 호출
    const spParams = {
      CompanyId: companyId ? parseInt(companyId) : null,
      SubCompanyId: subCompanyId ? parseInt(subCompanyId) : null,
      DeptId: deptId ? parseInt(deptId) : null,
      RequestingUserId: req.user.employeeId,
      RequestingUserRole: req.user.role
    };

    // 임시로 간단한 SP 사용
    const result = await executeStoredProcedureWithNamedParams('x_GetEmployeeStats_Simple', {});

    console.log('✅ 직원 통계 조회 성공:', {
      dataCount: result.data?.length || 0,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 성공 응답
    res.json({
      success: true,
      data: {
        stats: result.data && result.data.length > 0 ? result.data[0] : {
          TotalEmployees: 0,
          ActiveEmployees: 0,
          InactiveEmployees: 0,
          TotalDepartments: 0,
          AvgCareerYears: 0
        }
      },
      message: '직원 통계를 성공적으로 조회했습니다.'
    });

  } catch (error) {
    console.error('❌ 직원 통계 조회 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      queryParams: req.query,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

/**
 * 직원 검색 API (자동완성용)
 * @route GET /api/employees/search
 * @description 직원 검색 (자동완성 기능용)
 * @access Private (JWT 토큰 필요)
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q: searchTerm, maxResults = 10, companyId, deptId } = req.query;

    console.log('🔄 직원 검색 시도:', {
      searchTerm: searchTerm || 'empty',
      maxResults: parseInt(maxResults),
      filters: { companyId, deptId },
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 검색어 검증
    if (!searchTerm || searchTerm.trim().length < 1) {
      return res.json({
        success: true,
        data: {
          employees: []
        },
        message: '검색어를 입력해주세요.'
      });
    }

    // x_SearchEmployees SP 호출
    const spParams = {
      SearchTerm: searchTerm.trim(),
      MaxResults: parseInt(maxResults),
      CompanyId: companyId ? parseInt(companyId) : null,
      DeptId: deptId ? parseInt(deptId) : null,
      RequestingUserId: req.user.employeeId,
      RequestingUserRole: req.user.role
    };

    // 임시로 간단한 SP 사용
    const result = await executeStoredProcedureWithNamedParams('x_SearchEmployees_Simple', {
      SearchTerm: searchTerm.trim(),
      MaxResults: parseInt(maxResults)
    });

    console.log('✅ 직원 검색 성공:', {
      searchTerm,
      resultCount: result.data?.length || 0,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 성공 응답
    res.json({
      success: true,
      data: {
        employees: result.data || []
      },
      message: `${result.data?.length || 0}명의 직원을 찾았습니다.`
    });

  } catch (error) {
    console.error('❌ 직원 검색 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      queryParams: req.query,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
});

module.exports = router;