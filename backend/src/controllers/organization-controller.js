/**
 * 조직도 관리 API 컨트롤러
 * @description 조직도 관련 모든 비즈니스 로직 처리
 * @author SmartHR Team
 * @date 2024-09-12
 */

const { executeStoredProcedure, executeStoredProcedureWithNamedParams } = require('../database/dbHelper');

/**
 * 조직도 계층구조 조회
 * @route GET /api/organization/tree
 * @description 전체 조직도를 계층구조로 반환
 * @access Private (JWT 토큰 필요)
 */
const getOrganizationTree = async (req, res) => {
  try {
    // 1. 쿼리 파라미터 추출
    const { companyId, subCompanyId, includeInactive = false } = req.query;

    console.log('조직도 조회 요청:', {
      companyId: companyId || 'all',
      subCompanyId: subCompanyId || 'all', 
      includeInactive: includeInactive === 'true',
      requestUser: req.user?.userId
    });

    // 2. x_GetOrganizationTree 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetOrganizationTree', {
      CompanyId: companyId ? parseInt(companyId) : null,
      SubCompanyId: subCompanyId ? parseInt(subCompanyId) : null, 
      IncludeInactive: includeInactive === 'true' ? 1 : 0
    });

    // 3. 결과 처리
    if (result.ResultCode === 0) {
      // 디버깅을 위한 로깅
      console.log('SP 결과 데이터 샘플:', JSON.stringify(result.data?.slice(0, 2), null, 2));
      
      // 계층구조 데이터 가공
      const organizationData = buildOrganizationTree(result.data || []);
      
      res.json({
        success: true,
        data: {
          tree: organizationData,
          totalCount: result.data?.length || 0
        },
        message: '조직도를 성공적으로 조회했습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '조직도 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('조직도 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 조직도 데이터를 계층구조로 변환
 * @param {Array} data - SP 결과 데이터
 * @returns {Array} 계층구조 조직도 데이터
 */
const buildOrganizationTree = (data) => {
  if (!data || data.length === 0) return [];

  // 모든 노드를 ID로 매핑
  const nodesMap = {};
  const rootNodes = [];
  
  // 노드 변환 및 매핑
  data.forEach(row => {
    const node = {
      id: row.Id,
      type: row.NodeType.toLowerCase(),
      code: row.Code,
      name: row.Name,
      level: row.Level,
      isActive: row.IsActive,
      employeeCount: row.EmployeeCount || 0,
      parentId: row.ParentId,
      children: []
    };
    
    nodesMap[row.Id] = node;
    
    // 최상위 노드 (parentId가 null인 노드)
    if (row.ParentId === null) {
      rootNodes.push(node);
    }
  });
  
  // 자식 관계 설정
  Object.values(nodesMap).forEach(node => {
    if (node.parentId !== null && nodesMap[node.parentId]) {
      nodesMap[node.parentId].children.push(node);
    }
  });
  
  return rootNodes;
};

/**
 * 회사 등록
 * @route POST /api/organization/companies
 * @description 새로운 회사를 등록
 * @access Private (JWT 토큰 필요)
 */
const createCompany = async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const {
      companyCode,
      companyName,
      companyNameEng,
      businessNumber,
      corporateNumber,
      ceoName,
      establishDate,
      postalCode,
      address,
      addressDetail,
      phoneNumber,
      faxNumber,
      email,
      industry,
      businessType,
      isActive = true  // 기본값을 활성으로 설정
    } = req.body;

    // 2. 필수 파라미터 검증
    if (!companyCode || !companyName) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '회사 코드와 회사명은 필수 입력 항목입니다.'
      });
    }

    console.log('회사 등록 요청:', {
      companyCode,
      companyName,
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 3. x_CreateCompany SP 호출
    const result = await executeStoredProcedureWithNamedParams('x_CreateCompany', {
      CompanyCode: companyCode,
      CompanyName: companyName,
      CompanyNameEng: companyNameEng,
      BusinessNumber: businessNumber,
      CorporateNumber: corporateNumber,
      CeoName: ceoName,
      EstablishDate: establishDate ? new Date(establishDate) : null,
      PostalCode: postalCode,
      Address: address,
      AddressDetail: addressDetail,
      PhoneNumber: phoneNumber,
      FaxNumber: faxNumber,
      Email: email,
      Industry: industry,
      BusinessType: businessType,
      IsActive: isActive ? 1 : 0,  // boolean을 bit로 변환
      CreatedBy: req.user?.userId || 1
    });

    // 4. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.status(201).json({
        success: true,
        data: {
          companyId: result.data?.[0]?.CompanyId,
          companyCode: companyCode,
          companyName: companyName
        },
        message: result.Message || '회사가 성공적으로 등록되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '회사 등록 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('회사 등록 API 오류:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 회사 목록 조회
 * @route GET /api/organization/companies
 * @description 등록된 회사 목록을 조회
 * @access Private (JWT 토큰 필요)
 */
const getCompanies = async (req, res) => {
  try {
    // 1. 쿼리 파라미터 추출
    const { page = 1, limit = 20, isActive = null, search = null } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    console.log('회사 목록 조회 요청:', {
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: isActive,
      search: search,
      requestUser: req.user?.userId
    });

    // 2. x_GetCompanies 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetCompanies', {
      PageNumber: parseInt(page),
      PageSize: parseInt(limit),
      IsActive: isActive !== null ? (isActive === 'true' ? 1 : 0) : null,
      SearchKeyword: search,
      Offset: offset
    });

    // 3. 결과 처리
    if (result.ResultCode === 0) {
      res.json({
        success: true,
        data: {
          companies: result.data || [],
          pagination: {
            currentPage: parseInt(page),
            pageSize: parseInt(limit),
            totalCount: result.data?.[0]?.TotalCount || 0,
            totalPages: Math.ceil((result.data?.[0]?.TotalCount || 0) / parseInt(limit))
          }
        },
        message: '회사 목록을 성공적으로 조회했습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '회사 목록 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('회사 목록 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 회사 상세 정보 조회
 * @route GET /api/organization/companies/:companyId
 * @description 특정 회사의 상세 정보를 조회
 * @access Private (JWT 토큰 필요)
 */
const getCompanyById = async (req, res) => {
  try {
    // 1. 경로 파라미터 추출 및 검증
    const { id: companyId } = req.params;

    if (!companyId || isNaN(parseInt(companyId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 회사 ID를 입력해주세요.'
      });
    }

    console.log('회사 상세 조회 요청:', {
      companyId: parseInt(companyId),
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 2. x_GetCompanyById 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetCompanyById', {
      CompanyId: parseInt(companyId)
    });

    // 3. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      if (result.data && result.data.length > 0) {
        res.json({
          success: true,
          data: result.data[0],
          message: '회사 정보를 성공적으로 조회했습니다.'
        });
      } else {
        res.status(404).json({
          success: false,
          data: null,
          message: '해당 회사를 찾을 수 없습니다.'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '회사 정보 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('회사 상세 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      companyId: req.params.id,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 회사 정보 수정
 * @route PUT /api/organization/companies/:companyId
 * @description 기존 회사의 정보를 수정
 * @access Private (JWT 토큰 필요)
 */
const updateCompany = async (req, res) => {
  try {
    // 1. 경로 파라미터 및 요청 데이터 추출
    const { id: companyId } = req.params;
    const {
      companyCode,
      companyName,
      companyNameEng,
      businessNumber,
      corporateNumber,
      ceoName,
      establishDate,
      postalCode,
      address,
      addressDetail,
      phoneNumber,
      faxNumber,
      email,
      industry,
      businessType,
      isActive
    } = req.body;

    // 2. 필수 파라미터 검증
    if (!companyId || isNaN(parseInt(companyId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 회사 ID를 입력해주세요.'
      });
    }

    if (!companyName) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '회사명은 필수 입력 항목입니다.'
      });
    }

    console.log('회사 정보 수정 요청:', {
      companyId: parseInt(companyId),
      companyName,
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 3. x_UpdateCompany 호출
    const result = await executeStoredProcedureWithNamedParams('x_UpdateCompany', {
      CompanyId: parseInt(companyId),
      CompanyCode: companyCode,
      CompanyName: companyName,
      CompanyNameEng: companyNameEng,
      BusinessNumber: businessNumber,
      CorporateNumber: corporateNumber,
      CeoName: ceoName,
      EstablishDate: establishDate ? new Date(establishDate) : null,
      PostalCode: postalCode,
      Address: address,
      AddressDetail: addressDetail,
      PhoneNumber: phoneNumber,
      FaxNumber: faxNumber,
      Email: email,
      Industry: industry,
      BusinessType: businessType,
      IsActive: isActive !== undefined ? (isActive ? 1 : 0) : null,  // boolean을 bit로 변환
      UpdatedBy: req.user?.userId || 1
    });

    // 4. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.json({
        success: true,
        data: {
          companyId: parseInt(companyId),
          companyName: companyName
        },
        message: result.Message || '회사 정보가 성공적으로 수정되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '회사 정보 수정 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('회사 정보 수정 API 오류:', {
      error: error.message,
      stack: error.stack,
      companyId: req.params.id,
      requestBody: req.body,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 회사 삭제 (소프트 삭제)
 * @route DELETE /api/organization/companies/:companyId
 * @description 회사를 비활성화 (IsActive = false)
 * @access Private (JWT 토큰 필요)
 */
const deleteCompany = async (req, res) => {
  try {
    // 1. 경로 파라미터 추출 및 검증
    const { id: companyId } = req.params;

    if (!companyId || isNaN(parseInt(companyId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 회사 ID를 입력해주세요.'
      });
    }

    console.log('회사 삭제 요청:', {
      companyId: parseInt(companyId),
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 2. x_DeleteCompany 호출 (소프트 삭제)
    const result = await executeStoredProcedureWithNamedParams('x_DeleteCompany', {
      CompanyId: parseInt(companyId),
      DeletedBy: req.user?.userId || 1
    });

    // 3. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.json({
        success: true,
        data: {
          companyId: parseInt(companyId),
          deletedAt: new Date().toISOString()
        },
        message: result.Message || '회사가 성공적으로 삭제되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '회사 삭제 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('회사 삭제 API 오류:', {
      error: error.message,
      stack: error.stack,
      companyId: req.params.id,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

// 사업장 관리 함수들
/**
 * 사업장 등록
 * @route POST /api/organization/subcompanies
 * @description 새로운 사업장을 등록
 * @access Private (JWT 토큰 필요)
 */
const createSubCompany = async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const {
      companyId,
      subCompanyCode,
      subCompanyName,
      businessNumber,
      ceoName,
      industry,
      businessType,
      subCompanyType,
      address,
      addressDetail,
      postalCode,
      phoneNumber,
      faxNumber,
      email,
      managerEmployeeId,
      openDate,
      area,
      floorCount,
      parkingSpots,
      description,
      isHeadquarters
    } = req.body;

    // 2. 필수 파라미터 검증
    if (!companyId || !subCompanyCode || !subCompanyName) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '회사 ID, 사업장 코드, 사업장명은 필수 입력 항목입니다.'
      });
    }

    console.log('사업장 등록 요청:', {
      companyId,
      subCompanyCode,
      subCompanyName,
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 3. x_CreateSubCompany 호출
    const result = await executeStoredProcedureWithNamedParams('x_CreateSubCompany', {
      CompanyId: parseInt(companyId),
      SubCompanyCode: subCompanyCode,
      SubCompanyName: subCompanyName,
      BusinessNumber: businessNumber,
      CeoName: ceoName,
      Industry: industry,
      BusinessType: businessType,
      SubCompanyType: subCompanyType || '일반사업장',
      Address: address,
      AddressDetail: addressDetail,
      PostalCode: postalCode,
      PhoneNumber: phoneNumber,
      FaxNumber: faxNumber,
      Email: email,
      ManagerEmployeeId: managerEmployeeId ? parseInt(managerEmployeeId) : null,
      OpenDate: openDate ? new Date(openDate) : null,
      Area: area ? parseFloat(area) : null,
      FloorCount: floorCount ? parseInt(floorCount) : null,
      ParkingSpots: parkingSpots ? parseInt(parkingSpots) : null,
      Description: description,
      IsHeadquarters: isHeadquarters ? 1 : 0,
      CreatedBy: req.user?.userId || 1
    });

    // 4. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.status(201).json({
        success: true,
        data: {
          subCompanyId: result.data?.[0]?.SubCompanyId,
          subCompanyCode: subCompanyCode,
          subCompanyName: subCompanyName
        },
        message: result.Message || '사업장이 성공적으로 등록되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '사업장 등록 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('사업장 등록 API 오류:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 사업장 목록 조회
 * @route GET /api/organization/subcompanies
 * @description 등록된 사업장 목록을 조회 (회사별 필터링 가능)
 * @access Private (JWT 토큰 필요)
 */
const getSubCompanies = async (req, res) => {
  try {
    // 1. 쿼리 파라미터 추출
    const { 
      companyId = null, 
      page = 1, 
      limit = 20, 
      isActive = null, 
      search = null 
    } = req.query;

    console.log('사업장 목록 조회 요청:', {
      companyId: companyId ? parseInt(companyId) : null,
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: isActive,
      search: search,
      requestUser: req.user?.userId
    });

    // 2. x_GetSubCompanies 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetSubCompanies', {
      CompanyId: companyId ? parseInt(companyId) : null,
      PageNumber: parseInt(page),
      PageSize: parseInt(limit),
      IsActive: isActive !== null ? (isActive === 'true' ? 1 : 0) : null,
      SearchKeyword: search
    });

    // 3. 결과 처리
    if (result.ResultCode === 0) {
      res.json({
        success: true,
        data: {
          subCompanies: result.data || [],
          pagination: {
            currentPage: parseInt(page),
            pageSize: parseInt(limit),
            totalCount: result.data?.[0]?.TotalCount || 0,
            totalPages: Math.ceil((result.data?.[0]?.TotalCount || 0) / parseInt(limit))
          }
        },
        message: '사업장 목록을 성공적으로 조회했습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '사업장 목록 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('사업장 목록 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 사업장 상세 정보 조회
 * @route GET /api/organization/subcompanies/:subCompanyId
 * @description 특정 사업장의 상세 정보를 조회
 * @access Private (JWT 토큰 필요)
 */
const getSubCompanyById = async (req, res) => {
  try {
    // 1. 경로 파라미터 추출 및 검증
    const { id: subCompanyId } = req.params;

    if (!subCompanyId || isNaN(parseInt(subCompanyId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 사업장 ID를 입력해주세요.'
      });
    }

    console.log('사업장 상세 조회 요청:', {
      subCompanyId: parseInt(subCompanyId),
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 2. x_GetSubCompanyById 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetSubCompanyById', {
      SubCompanyId: parseInt(subCompanyId)
    });

    // 3. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      if (result.data && result.data.length > 0) {
        res.json({
          success: true,
          data: result.data[0],
          message: '사업장 정보를 성공적으로 조회했습니다.'
        });
      } else {
        res.status(404).json({
          success: false,
          data: null,
          message: '해당 사업장을 찾을 수 없습니다.'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '사업장 정보 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('사업장 상세 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      subCompanyId: req.params.id,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 사업장 정보 수정
 * @route PUT /api/organization/subcompanies/:subCompanyId
 * @description 기존 사업장의 정보를 수정
 * @access Private (JWT 토큰 필요)
 */
const updateSubCompany = async (req, res) => {
  try {
    // 1. 경로 파라미터 및 요청 데이터 추출
    const { id: subCompanyId } = req.params;
    const {
      subCompanyName,
      businessNumber,
      ceoName,
      industry,
      businessType,
      subCompanyType,
      address,
      addressDetail,
      postalCode,
      phoneNumber,
      faxNumber,
      email,
      managerEmployeeId,
      openDate,
      area,
      floorCount,
      parkingSpots,
      description,
      isHeadquarters,
      isActive
    } = req.body;

    // 2. 필수 파라미터 검증
    if (!subCompanyId || isNaN(parseInt(subCompanyId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 사업장 ID를 입력해주세요.'
      });
    }

    if (!subCompanyName) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '사업장명은 필수 입력 항목입니다.'
      });
    }

    console.log('사업장 정보 수정 요청:', {
      subCompanyId: parseInt(subCompanyId),
      subCompanyName,
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 3. x_UpdateSubCompany 호출
    const result = await executeStoredProcedureWithNamedParams('x_UpdateSubCompany', {
      SubCompanyId: parseInt(subCompanyId),
      SubCompanyName: subCompanyName,
      BusinessNumber: businessNumber,
      CeoName: ceoName,
      Industry: industry,
      BusinessType: businessType,
      SubCompanyType: subCompanyType,
      Address: address,
      AddressDetail: addressDetail,
      PostalCode: postalCode,
      PhoneNumber: phoneNumber,
      FaxNumber: faxNumber,
      Email: email,
      ManagerEmployeeId: managerEmployeeId ? parseInt(managerEmployeeId) : null,
      OpenDate: openDate ? new Date(openDate) : null,
      Area: area ? parseFloat(area) : null,
      FloorCount: floorCount ? parseInt(floorCount) : null,
      ParkingSpots: parkingSpots ? parseInt(parkingSpots) : null,
      Description: description,
      IsHeadquarters: isHeadquarters !== undefined ? (isHeadquarters ? 1 : 0) : null,
      IsActive: isActive !== undefined ? (isActive ? 1 : 0) : null,
      UpdatedBy: req.user?.userId || 1
    });

    // 4. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.json({
        success: true,
        data: {
          subCompanyId: parseInt(subCompanyId),
          subCompanyName: subCompanyName
        },
        message: result.Message || '사업장 정보가 성공적으로 수정되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '사업장 정보 수정 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('사업장 정보 수정 API 오류:', {
      error: error.message,
      stack: error.stack,
      subCompanyId: req.params.id,
      requestBody: req.body,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 사업장 삭제 (소프트 삭제)
 * @route DELETE /api/organization/subcompanies/:subCompanyId
 * @description 사업장을 비활성화 (IsActive = false)
 * @access Private (JWT 토큰 필요)
 */
const deleteSubCompany = async (req, res) => {
  try {
    // 1. 경로 파라미터 추출 및 검증
    const { id: subCompanyId } = req.params;

    if (!subCompanyId || isNaN(parseInt(subCompanyId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 사업장 ID를 입력해주세요.'
      });
    }

    console.log('사업장 삭제 요청:', {
      subCompanyId: parseInt(subCompanyId),
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 2. x_DeleteSubCompany 호출 (소프트 삭제)
    const result = await executeStoredProcedureWithNamedParams('x_DeleteSubCompany', {
      SubCompanyId: parseInt(subCompanyId),
      DeletedBy: req.user?.userId || 1
    });

    // 3. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.json({
        success: true,
        data: {
          subCompanyId: parseInt(subCompanyId),
          deletedAt: new Date().toISOString()
        },
        message: result.Message || '사업장이 성공적으로 삭제되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '사업장 삭제 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('사업장 삭제 API 오류:', {
      error: error.message,
      stack: error.stack,
      subCompanyId: req.params.id,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

// 부서 관리 함수들
/**
 * 부서 등록
 * @route POST /api/organization/departments
 * @description 새로운 부서를 등록
 * @access Private (JWT 토큰 필요)
 */
const createDepartment = async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증 (간단한 5개 필드)
    const {
      subCompanyId,
      deptCode,
      deptName,
      parentDeptId,
      establishDate
    } = req.body;

    // 2. 필수 파라미터 검증
    if (!subCompanyId || !deptCode || !deptName) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '사업장 ID, 부서 코드, 부서명은 필수 입력 항목입니다.'
      });
    }

    console.log('부서 등록 요청:', {
      subCompanyId,
      deptCode,
      deptName,
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 3. x_CreateDepartment 호출 (간단한 5개 필드)
    const result = await executeStoredProcedureWithNamedParams('x_CreateDepartment', {
      SubCompanyId: parseInt(subCompanyId),
      DeptCode: deptCode,
      DeptName: deptName,
      ParentDeptId: parentDeptId ? parseInt(parentDeptId) : null,
      EstablishDate: establishDate ? new Date(establishDate) : null,
      CreatedBy: req.user?.userId || 1
    });

    // 4. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.status(201).json({
        success: true,
        data: {
          deptId: result.data?.[0]?.DeptId,
          deptCode: deptCode,
          deptName: deptName
        },
        message: result.Message || '부서가 성공적으로 등록되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '부서 등록 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('부서 등록 API 오류:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 부서 목록 조회
 * @route GET /api/organization/departments
 * @description 등록된 부서 목록을 조회 (사업장별 필터링 가능)
 * @access Private (JWT 토큰 필요)
 */
const getDepartments = async (req, res) => {
  try {
    // 1. 쿼리 파라미터 추출
    const {
      companyId = null,
      subCompanyId = null,
      parentDeptId = null,
      page = 1,
      limit = 20,
      isActive = null,
      search = null
    } = req.query;

    console.log('부서 목록 조회 요청:', {
      companyId: companyId ? parseInt(companyId) : null,
      subCompanyId: subCompanyId ? parseInt(subCompanyId) : null,
      page: parseInt(page),
      limit: parseInt(limit),
      isActive: isActive,
      search: search,
      requestUser: req.user?.userId
    });

    // 2. x_GetDepartments 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetDepartments', {
      CompanyId: companyId ? parseInt(companyId) : null,
      SubCompanyId: subCompanyId ? parseInt(subCompanyId) : null,
      PageNumber: parseInt(page),
      PageSize: parseInt(limit),
      IsActive: isActive !== null ? (isActive === 'true' ? 1 : 0) : null,
      SearchKeyword: search
    });

    // 3. 결과 처리
    if (result.ResultCode === 0) {
      console.log('📊 부서 조회 결과:', {
        resultCode: result.ResultCode,
        dataLength: result.data?.length || 0,
        firstItem: result.data?.[0],
        totalCount: result.data?.[0]?.TotalCount || 0
      });

      res.json({
        success: true,
        data: {
          departments: result.data || [],
          pagination: {
            currentPage: parseInt(page),
            pageSize: parseInt(limit),
            totalCount: result.data?.[0]?.TotalCount || 0,
            totalPages: Math.ceil((result.data?.[0]?.TotalCount || 0) / parseInt(limit))
          }
        },
        message: '부서 목록을 성공적으로 조회했습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '부서 목록 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('부서 목록 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      query: req.query,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 부서 상세 정보 조회
 * @route GET /api/organization/departments/:deptId
 * @description 특정 부서의 상세 정보를 조회
 * @access Private (JWT 토큰 필요)
 */
const getDepartmentById = async (req, res) => {
  try {
    // 1. 경로 파라미터 추출 및 검증
    const { id: deptId } = req.params;

    if (!deptId || isNaN(parseInt(deptId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 부서 ID를 입력해주세요.'
      });
    }

    console.log('부서 상세 조회 요청:', {
      deptId: parseInt(deptId),
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 2. x_GetDepartmentById 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetDepartmentById', {
      DeptId: parseInt(deptId)
    });

    // 3. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      if (result.data && result.data.length > 0) {
        res.json({
          success: true,
          data: result.data[0],
          message: '부서 정보를 성공적으로 조회했습니다.'
        });
      } else {
        res.status(404).json({
          success: false,
          data: null,
          message: '해당 부서를 찾을 수 없습니다.'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '부서 정보 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('부서 상세 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      deptId: req.params.id,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 부서 정보 수정
 * @route PUT /api/organization/departments/:deptId
 * @description 기존 부서의 정보를 수정
 * @access Private (JWT 토큰 필요)
 */
const updateDepartment = async (req, res) => {
  try {
    // 1. 경로 파라미터 및 요청 데이터 추출
    const { id: deptId } = req.params;
    const {
      deptName,
      deptNameEng,
      deptType,
      managerEmployeeId,
      viceManagerEmployeeId,
      costCenter,
      budget,
      phoneNumber,
      extension,
      email,
      location,
      establishDate,
      closeDate,
      purpose,
      isActive
    } = req.body;

    // 2. 필수 파라미터 검증
    if (!deptId || isNaN(parseInt(deptId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 부서 ID를 입력해주세요.'
      });
    }

    if (!deptName) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '부서명은 필수 입력 항목입니다.'
      });
    }

    console.log('부서 정보 수정 요청:', {
      deptId: parseInt(deptId),
      deptName,
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 3. x_UpdateDepartment 호출
    const result = await executeStoredProcedureWithNamedParams('x_UpdateDepartment', {
      DeptId: parseInt(deptId),
      DeptName: deptName,
      DeptNameEng: deptNameEng,
      DeptType: deptType,
      ManagerEmployeeId: managerEmployeeId ? parseInt(managerEmployeeId) : null,
      ViceManagerEmployeeId: viceManagerEmployeeId ? parseInt(viceManagerEmployeeId) : null,
      CostCenter: costCenter,
      Budget: budget ? parseFloat(budget) : null,
      PhoneNumber: phoneNumber,
      Extension: extension,
      Email: email,
      Location: location,
      EstablishDate: establishDate ? new Date(establishDate) : null,
      CloseDate: closeDate ? new Date(closeDate) : null,
      Purpose: purpose,
      IsActive: isActive !== undefined ? (isActive ? 1 : 0) : null,
      UpdatedBy: req.user?.userId || 1
    });

    // 4. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.json({
        success: true,
        data: {
          deptId: parseInt(deptId),
          deptName: deptName
        },
        message: result.Message || '부서 정보가 성공적으로 수정되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '부서 정보 수정 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('부서 정보 수정 API 오류:', {
      error: error.message,
      stack: error.stack,
      deptId: req.params.id,
      requestBody: req.body,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 부서 삭제 (소프트 삭제)
 * @route DELETE /api/organization/departments/:deptId
 * @description 부서를 비활성화 (IsActive = false)
 * @access Private (JWT 토큰 필요)
 */
const deleteDepartment = async (req, res) => {
  try {
    // 1. 경로 파라미터 추출 및 검증
    const { id: deptId } = req.params;

    if (!deptId || isNaN(parseInt(deptId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 부서 ID를 입력해주세요.'
      });
    }

    console.log('부서 삭제 요청:', {
      deptId: parseInt(deptId),
      requestUser: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    // 2. x_DeleteDepartment 호출 (소프트 삭제)
    const result = await executeStoredProcedureWithNamedParams('x_DeleteDepartment', {
      DeptId: parseInt(deptId),
      DeletedBy: req.user?.userId || 1
    });

    // 3. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      res.json({
        success: true,
        data: {
          deptId: parseInt(deptId),
          deletedAt: new Date().toISOString()
        },
        message: result.Message || '부서가 성공적으로 삭제되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '부서 삭제 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('부서 삭제 API 오류:', {
      error: error.message,
      stack: error.stack,
      deptId: req.params.id,
      user: req.user?.userId,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

// ========== 직책 관리 함수들 ==========

/**
 * 직책 등록
 * @route POST /api/organization/positions
 * @description 새로운 직책을 등록합니다
 * @access Private (JWT 토큰 필요)
 */
const createPosition = async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const {
      deptId,
      posCode,
      posName,
      posNameEng,
      posLevel = 1,
      posGrade,
      jobTitle,
      jobCategory,
      minSalary,
      maxSalary,
      baseSalary,
      allowanceAmount,
      isManagerPosition = false,
      requiredExperience,
      requiredEducation,
      requiredSkills,
      jobDescription,
      responsibilities,
      reportingTo,
      maxHeadcount
    } = req.body;

    console.log('직책 등록 요청:', {
      deptId,
      posCode,
      posName,
      posLevel,
      requestUser: req.user?.userId
    });

    // 2. 필수 파라미터 검증
    if (!deptId || !posCode || !posName) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '부서 ID, 직책 코드, 직책명은 필수 입력 항목입니다.'
      });
    }

    // 3. 데이터 타입 검증
    if (deptId <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 부서 ID입니다.'
      });
    }

    if (posCode.trim().length < 2) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '직책 코드는 최소 2자 이상이어야 합니다.'
      });
    }

    if (posName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '직책명은 최소 2자 이상이어야 합니다.'
      });
    }

    // 4. x_CreatePosition 호출
    const result = await executeStoredProcedureWithNamedParams('x_CreatePosition', {
      DeptId: deptId,
      PosCode: posCode.trim(),
      PosName: posName.trim(),
      PosNameEng: posNameEng?.trim() || null,
      PosLevel: posLevel,
      PosGrade: posGrade?.trim() || null,
      JobTitle: jobTitle?.trim() || null,
      JobCategory: jobCategory?.trim() || null,
      MinSalary: minSalary || null,
      MaxSalary: maxSalary || null,
      BaseSalary: baseSalary || null,
      AllowanceAmount: allowanceAmount || null,
      IsManagerPosition: isManagerPosition,
      RequiredExperience: requiredExperience || null,
      RequiredEducation: requiredEducation?.trim() || null,
      RequiredSkills: requiredSkills?.trim() || null,
      JobDescription: jobDescription?.trim() || null,
      Responsibilities: responsibilities?.trim() || null,
      ReportingTo: reportingTo || null,
      MaxHeadcount: maxHeadcount || null,
      CreatedBy: req.user?.userId || null
    });

    // 5. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      console.log('직책 등록 성공:', result.data?.[0]);
      
      res.status(201).json({
        success: true,
        data: result.data?.[0] || { message: '직책이 성공적으로 등록되었습니다.' },
        message: result.Message || '직책이 성공적으로 등록되었습니다.'
      });
    } else {
      console.log('직책 등록 실패:', result.Message);
      
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직책 등록 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('직책 등록 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 직책 목록 조회
 * @route GET /api/organization/positions
 * @description 직책 목록을 페이징하여 조회합니다
 * @access Private (JWT 토큰 필요)
 */
const getPositions = async (req, res) => {
  try {
    // 1. 쿼리 파라미터 추출
    const {
      deptId,
      isActive = 'true',
      page = 1,
      pageSize = 10,
      searchKeyword
    } = req.query;

    console.log('직책 목록 조회 요청:', {
      deptId: deptId || 'all',
      isActive,
      page,
      pageSize,
      searchKeyword: searchKeyword || 'none',
      requestUser: req.user?.userId
    });

    // 2. 파라미터 검증
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);

    if (pageNum < 1 || pageSizeNum < 1 || pageSizeNum > 100) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 페이지 정보입니다. (page ≥ 1, pageSize: 1-100)'
      });
    }

    // 3. x_GetPositions 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetPositions', {
      DeptId: deptId ? parseInt(deptId) : null,
      IsActive: isActive === 'true',
      Page: pageNum,
      PageSize: pageSizeNum,
      SearchKeyword: searchKeyword?.trim() || null
    });

    // 4. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      console.log(`직책 목록 조회 성공: ${result.data?.length || 0}건`);
      
      res.json({
        success: true,
        data: result.data || [],
        message: result.Message || '직책 목록 조회가 성공적으로 완료되었습니다.'
      });
    } else {
      console.log('직책 목록 조회 실패:', result.Message);
      
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직책 목록 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('직책 목록 조회 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      queryParams: req.query,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 직책 상세 조회
 * @route GET /api/organization/positions/:id
 * @description 특정 직책의 상세 정보를 조회합니다
 * @access Private (JWT 토큰 필요)
 */
const getPositionById = async (req, res) => {
  try {
    // 1. 파라미터 추출 및 검증
    const { id } = req.params;
    const posId = parseInt(id);

    console.log('직책 상세 조회 요청:', {
      posId,
      requestUser: req.user?.userId
    });

    if (!posId || posId <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 직책 ID입니다.'
      });
    }

    // 2. x_GetPositionById 호출
    const result = await executeStoredProcedureWithNamedParams('x_GetPositionById', {
      PosId: posId
    });

    // 3. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      if (result.data && result.data.length > 0) {
        console.log('직책 상세 조회 성공:', result.data[0].PosName);
        
        res.json({
          success: true,
          data: result.data[0],
          message: result.Message || '직책 상세 조회가 성공적으로 완료되었습니다.'
        });
      } else {
        res.status(404).json({
          success: false,
          data: null,
          message: '존재하지 않는 직책입니다.'
        });
      }
    } else {
      console.log('직책 상세 조회 실패:', result.Message);
      
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직책 상세 조회 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('직책 상세 조회 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      posId: req.params.id,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 직책 정보 수정
 * @route PUT /api/organization/positions/:id
 * @description 직책 정보를 수정합니다
 * @access Private (JWT 토큰 필요)
 */
const updatePosition = async (req, res) => {
  try {
    // 1. 파라미터 및 요청 데이터 추출
    const { id } = req.params;
    const posId = parseInt(id);

    console.log('직책 정보 수정 요청:', {
      posId,
      requestUser: req.user?.userId
    });

    if (!posId || posId <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 직책 ID입니다.'
      });
    }

    const {
      deptId,
      posCode,
      posName,
      posNameEng,
      posLevel,
      posGrade,
      jobTitle,
      jobCategory,
      minSalary,
      maxSalary,
      baseSalary,
      allowanceAmount,
      isManagerPosition,
      requiredExperience,
      requiredEducation,
      requiredSkills,
      jobDescription,
      responsibilities,
      reportingTo,
      maxHeadcount
    } = req.body;

    // 2. 입력값 검증 (수정할 값이 있는 경우만)
    if (posCode && posCode.trim().length < 2) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '직책 코드는 최소 2자 이상이어야 합니다.'
      });
    }

    if (posName && posName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '직책명은 최소 2자 이상이어야 합니다.'
      });
    }

    // 3. x_UpdatePosition 호출
    const result = await executeStoredProcedureWithNamedParams('x_UpdatePosition', {
      PosId: posId,
      DeptId: deptId || null,
      PosCode: posCode?.trim() || null,
      PosName: posName?.trim() || null,
      PosNameEng: posNameEng?.trim() || null,
      PosLevel: posLevel || null,
      PosGrade: posGrade?.trim() || null,
      JobTitle: jobTitle?.trim() || null,
      JobCategory: jobCategory?.trim() || null,
      MinSalary: minSalary || null,
      MaxSalary: maxSalary || null,
      BaseSalary: baseSalary || null,
      AllowanceAmount: allowanceAmount || null,
      IsManagerPosition: isManagerPosition !== undefined ? isManagerPosition : null,
      RequiredExperience: requiredExperience || null,
      RequiredEducation: requiredEducation?.trim() || null,
      RequiredSkills: requiredSkills?.trim() || null,
      JobDescription: jobDescription?.trim() || null,
      Responsibilities: responsibilities?.trim() || null,
      ReportingTo: reportingTo || null,
      MaxHeadcount: maxHeadcount || null,
      UpdatedBy: req.user?.userId || null
    });

    // 4. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      console.log('직책 정보 수정 성공:', result.data?.[0]);
      
      res.json({
        success: true,
        data: result.data?.[0] || { message: '직책 정보가 성공적으로 수정되었습니다.' },
        message: result.Message || '직책 정보가 성공적으로 수정되었습니다.'
      });
    } else {
      console.log('직책 정보 수정 실패:', result.Message);
      
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직책 정보 수정 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('직책 정보 수정 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      posId: req.params.id,
      requestBody: req.body,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

/**
 * 직책 삭제
 * @route DELETE /api/organization/positions/:id
 * @description 직책을 삭제합니다 (Soft Delete)
 * @access Private (JWT 토큰 필요)
 */
const deletePosition = async (req, res) => {
  try {
    // 1. 파라미터 추출 및 검증
    const { id } = req.params;
    const posId = parseInt(id);

    console.log('직책 삭제 요청:', {
      posId,
      requestUser: req.user?.userId
    });

    if (!posId || posId <= 0) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 직책 ID입니다.'
      });
    }

    // 2. x_DeletePosition 호출
    const result = await executeStoredProcedureWithNamedParams('x_DeletePosition', {
      PosId: posId,
      UpdatedBy: req.user?.userId || null
    });

    // 3. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      console.log('직책 삭제 성공:', result.data?.[0]);
      
      res.json({
        success: true,
        data: result.data?.[0] || { message: '직책이 성공적으로 삭제되었습니다.' },
        message: result.Message || '직책이 성공적으로 삭제되었습니다.'
      });
    } else {
      console.log('직책 삭제 실패:', result.Message);
      
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '직책 삭제 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    console.error('직책 삭제 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      posId: req.params.id,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    });
  }
};

const searchOrganization = async (req, res) => {
  res.status(501).json({
    success: false,
    data: null,
    message: '아직 구현되지 않은 API입니다.'
  });
};

module.exports = {
  getOrganizationTree,
  createCompany,
  getCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  createSubCompany,
  getSubCompanies,
  getSubCompanyById,
  updateSubCompany,
  deleteSubCompany,
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  createPosition,
  getPositions,
  getPositionById,
  updatePosition,
  deletePosition,
  searchOrganization
};