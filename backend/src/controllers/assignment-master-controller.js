/**
 * 인사발령 마스터 데이터 API 컨트롤러
 * @description 발령 대분류, 세부유형, 사유 조회 API
 * @author SmartHR Team
 * @date 2024-09-14
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { authenticateToken } = require('../middleware/auth');

/**
 * 발령 대분류 목록 조회 API
 * @route GET /api/assignments/master/categories
 * @description 입사, 승진, 이동, 파견, 휴직, 퇴직 등 발령 대분류 조회
 * @access Private (인증 필요)
 */
router.get('/master/categories', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 발령 대분류 목록 조회 요청:', {
      requestUser: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    const pool = await sql.connect();
    const request = pool.request();

    const query = `
      SELECT 
        CategoryId,
        CategoryCode,
        CategoryName,
        CategoryNameEng,
        DisplayOrder,
        Description,
        IsActive
      FROM uAssignmentCategoryTb 
      WHERE IsActive = 1
      ORDER BY DisplayOrder, CategoryName
    `;

    const result = await request.query(query);

    console.log('✅ 발령 대분류 조회 성공:', {
      count: result.recordset.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        categories: result.recordset
      },
      message: '발령 대분류 목록 조회가 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ 발령 대분류 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * 발령 세부유형 목록 조회 API
 * @route GET /api/assignments/master/types
 * @description 특정 대분류에 속하는 세부유형 조회 또는 전체 조회
 * @access Private (인증 필요)
 * @query categoryId - 발령 대분류 ID (선택사항)
 */
router.get('/master/types', authenticateToken, async (req, res) => {
  try {
    const { categoryId } = req.query;

    console.log('🔄 발령 세부유형 목록 조회 요청:', {
      categoryId: categoryId || 'all',
      requestUser: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    const pool = await sql.connect();
    const request = pool.request();

    let whereClause = 'WHERE at.IsActive = 1';
    if (categoryId) {
      request.input('CategoryId', parseInt(categoryId));
      whereClause += ' AND at.CategoryId = @CategoryId';
    }

    const query = `
      SELECT 
        at.AssignmentTypeId,
        at.CategoryId,
        ac.CategoryName,
        ac.CategoryCode,
        at.TypeCode,
        at.TypeName,
        at.TypeNameEng,
        at.DisplayOrder,
        at.Description,
        at.RequiresApproval,
        at.RequiresEffectiveDate,
        at.RequiresReason,
        at.RequiresDocument,
        at.AllowsCompanyChange,
        at.AllowsBranchChange,
        at.AllowsDeptChange,
        at.AllowsPositionChange,
        at.AllowsSalaryChange,
        at.AutoCalculateSalary,
        at.SendNotification,
        at.RecordHistory,
        at.IsActive
      FROM uAssignmentTypeTb at
      INNER JOIN uAssignmentCategoryTb ac ON at.CategoryId = ac.CategoryId
      ${whereClause}
      ORDER BY ac.DisplayOrder, at.DisplayOrder, at.TypeName
    `;

    const result = await request.query(query);

    console.log('✅ 발령 세부유형 조회 성공:', {
      categoryId: categoryId || 'all',
      count: result.recordset.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        types: result.recordset,
        filter: {
          categoryId: categoryId ? parseInt(categoryId) : null
        }
      },
      message: '발령 세부유형 목록 조회가 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ 발령 세부유형 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      queryParams: req.query,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * 발령 사유 목록 조회 API
 * @route GET /api/assignments/master/reasons
 * @description 공통 사유 또는 특정 유형별 사유 조회
 * @access Private (인증 필요)
 * @query categoryId - 발령 대분류 ID (선택사항)
 * @query assignmentTypeId - 발령 세부유형 ID (선택사항)
 * @query includeCommon - 공통 사유 포함 여부 (기본값: true)
 */
router.get('/master/reasons', authenticateToken, async (req, res) => {
  try {
    const { categoryId, assignmentTypeId, includeCommon = 'true' } = req.query;

    console.log('🔄 발령 사유 목록 조회 요청:', {
      categoryId: categoryId || null,
      assignmentTypeId: assignmentTypeId || null,
      includeCommon: includeCommon,
      requestUser: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    const pool = await sql.connect();
    const request = pool.request();

    let whereClause = 'WHERE ar.IsActive = 1';
    let joinClause = '';

    // 공통 사유 포함 조건
    if (includeCommon === 'true') {
      whereClause += ' AND (ar.IsCommon = 1';
    } else {
      whereClause += ' AND (ar.IsCommon = 0';
    }

    // 특정 유형별 사유 필터링
    if (assignmentTypeId) {
      request.input('AssignmentTypeId', parseInt(assignmentTypeId));
      whereClause += ' OR ar.AssignmentTypeId = @AssignmentTypeId';
    } else if (categoryId) {
      request.input('CategoryId', parseInt(categoryId));
      whereClause += ' OR ar.CategoryId = @CategoryId';
    }

    whereClause += ')';

    // JOIN 절 구성
    joinClause = `
      LEFT JOIN uAssignmentCategoryTb ac ON ar.CategoryId = ac.CategoryId
      LEFT JOIN uAssignmentTypeTb at ON ar.AssignmentTypeId = at.AssignmentTypeId
    `;

    const query = `
      SELECT 
        ar.ReasonId,
        ar.CategoryId,
        ac.CategoryName,
        ar.AssignmentTypeId,
        at.TypeName,
        ar.ReasonCode,
        ar.ReasonText,
        ar.ReasonTextEng,
        ar.DisplayOrder,
        ar.IsCommon,
        ar.Description,
        ar.IsActive
      FROM uAssignmentReasonTb ar
      ${joinClause}
      ${whereClause}
      ORDER BY ar.IsCommon DESC, ar.DisplayOrder, ar.ReasonText
    `;

    const result = await request.query(query);

    console.log('✅ 발령 사유 조회 성공:', {
      categoryId: categoryId || null,
      assignmentTypeId: assignmentTypeId || null,
      count: result.recordset.length,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        reasons: result.recordset,
        filter: {
          categoryId: categoryId ? parseInt(categoryId) : null,
          assignmentTypeId: assignmentTypeId ? parseInt(assignmentTypeId) : null,
          includeCommon: includeCommon === 'true'
        }
      },
      message: '발령 사유 목록 조회가 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ 발령 사유 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      queryParams: req.query,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

/**
 * 발령 유형 상세 정보 조회 API
 * @route GET /api/assignments/master/types/:typeId
 * @description 특정 발령 유형의 상세 정보 및 허용 규칙 조회
 * @access Private (인증 필요)
 */
router.get('/master/types/:typeId', authenticateToken, async (req, res) => {
  try {
    const { typeId } = req.params;

    console.log('🔄 발령 유형 상세 정보 조회 요청:', {
      typeId: parseInt(typeId),
      requestUser: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    if (!typeId || isNaN(parseInt(typeId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 발령 유형 ID입니다.'
      });
    }

    const pool = await sql.connect();
    const request = pool.request();
    request.input('TypeId', parseInt(typeId));

    const query = `
      SELECT 
        at.AssignmentTypeId,
        at.CategoryId,
        ac.CategoryName,
        ac.CategoryCode,
        at.TypeCode,
        at.TypeName,
        at.TypeNameEng,
        at.DisplayOrder,
        at.Description,
        at.RequiresApproval,
        at.RequiresEffectiveDate,
        at.RequiresReason,
        at.RequiresDocument,
        at.AllowsCompanyChange,
        at.AllowsBranchChange,
        at.AllowsDeptChange,
        at.AllowsPositionChange,
        at.AllowsSalaryChange,
        at.AutoCalculateSalary,
        at.SendNotification,
        at.RecordHistory,
        at.IsActive,
        at.CreatedAt,
        at.UpdatedAt
      FROM uAssignmentTypeTb at
      INNER JOIN uAssignmentCategoryTb ac ON at.CategoryId = ac.CategoryId
      WHERE at.AssignmentTypeId = @TypeId AND at.IsActive = 1
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        data: null,
        message: '해당 발령 유형을 찾을 수 없습니다.'
      });
    }

    console.log('✅ 발령 유형 상세 정보 조회 성공:', {
      typeId: parseInt(typeId),
      typeName: result.recordset[0].TypeName,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        assignmentType: result.recordset[0]
      },
      message: '발령 유형 상세 정보 조회가 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ 발령 유형 상세 정보 조회 API 오류:', {
      error: error.message,
      stack: error.stack,
      typeId: req.params.typeId,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
});

module.exports = router;