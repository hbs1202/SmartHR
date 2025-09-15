/**
 * 발령 관리 API 컨트롤러
 * @description 부서 이동, 직책 변경, 승진 등 발령 관련 API
 * @author SmartHR Team
 * @date 2024-09-13
 */

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { executeStoredProcedureWithNamedParams } = require('../database/dbHelper');

/**
 * 종합 발령 API
 * @route POST /api/assignments/:employeeId/transfer
 * @description 직원의 종합 발령 처리 (회사/사업장/부서/직책 변경) 및 발령 이력 생성
 * @access Private (admin, manager만 가능)
 */
router.post('/:employeeId/transfer', authenticateToken, authorizeRoles(['admin', 'manager']), async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const { employeeId } = req.params;
    const { 
      newCompanyId,
      newSubCompanyId, 
      newDeptId,
      newPosId,
      assignmentDate,
      assignmentReason,
      // 발령 유형 관련 파라미터 추가
      categoryId,
      assignmentTypeId,
      reasonId,
      approvalStatus,
      approvalComment,
      documentPath,
      oldSalary,
      newSalary
    } = req.body;

    // 2. 필수 파라미터 검증
    if (!employeeId || isNaN(parseInt(employeeId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 직원 ID입니다.'
      });
    }

    // 3. 변경할 조직 정보가 하나 이상 있는지 검증
    const hasChanges = newCompanyId || newSubCompanyId || newDeptId || newPosId;
    if (!hasChanges) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '변경할 조직 정보를 하나 이상 입력해주세요. (회사, 사업장, 부서, 직책 중 하나 이상)'
      });
    }

    // 4. 입력된 ID들의 유효성 검증
    if (newCompanyId && isNaN(parseInt(newCompanyId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 회사 ID입니다.'
      });
    }
    
    if (newSubCompanyId && isNaN(parseInt(newSubCompanyId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 사업장 ID입니다.'
      });
    }
    
    if (newDeptId && isNaN(parseInt(newDeptId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 부서 ID입니다.'
      });
    }
    
    if (newPosId && isNaN(parseInt(newPosId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 직책 ID입니다.'
      });
    }

    // 5. 발령 유형 관련 파라미터 검증
    if (categoryId && isNaN(parseInt(categoryId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 발령 대분류 ID입니다.'
      });
    }
    
    if (assignmentTypeId && isNaN(parseInt(assignmentTypeId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 발령 세부유형 ID입니다.'
      });
    }
    
    if (reasonId && isNaN(parseInt(reasonId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 발령 사유 ID입니다.'
      });
    }

    // 6. 급여 정보 검증
    if (oldSalary && (isNaN(parseFloat(oldSalary)) || parseFloat(oldSalary) < 0)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 이전 급여 정보입니다.'
      });
    }
    
    if (newSalary && (isNaN(parseFloat(newSalary)) || parseFloat(newSalary) < 0)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 새 급여 정보입니다.'
      });
    }

    // 7. 발령 일자 검증 (선택사항)
    let effectiveDate = null;
    if (assignmentDate) {
      effectiveDate = new Date(assignmentDate);
      if (isNaN(effectiveDate.getTime())) {
        return res.status(400).json({
          success: false,
          data: null,
          message: '올바른 발령 일자 형식을 입력해주세요. (YYYY-MM-DD)'
        });
      }
    }

    // 8. 발령 유형 판별 및 로깅
    const changeTypes = [];
    if (newCompanyId) changeTypes.push('회사');
    if (newSubCompanyId) changeTypes.push('사업장');
    if (newDeptId) changeTypes.push('부서');
    if (newPosId) changeTypes.push('직책');

    console.log('🔄 종합 발령 요청 (발령유형 지원):', {
      employeeId: parseInt(employeeId),
      changeTypes: changeTypes.join(', '),
      newCompanyId: newCompanyId ? parseInt(newCompanyId) : null,
      newSubCompanyId: newSubCompanyId ? parseInt(newSubCompanyId) : null,
      newDeptId: newDeptId ? parseInt(newDeptId) : null,
      newPosId: newPosId ? parseInt(newPosId) : null,
      assignmentDate: effectiveDate,
      assignmentReason,
      // 발령 유형 정보
      categoryId: categoryId ? parseInt(categoryId) : null,
      assignmentTypeId: assignmentTypeId ? parseInt(assignmentTypeId) : null,
      reasonId: reasonId ? parseInt(reasonId) : null,
      approvalStatus: approvalStatus || 'APPROVED',
      oldSalary: oldSalary ? parseFloat(oldSalary) : null,
      newSalary: newSalary ? parseFloat(newSalary) : null,
      requestUser: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 9. Stored Procedure 호출 (확장된 파라미터 포함)
    const spParams = {
      EmployeeId: parseInt(employeeId),
      NewCompanyId: newCompanyId ? parseInt(newCompanyId) : null,
      NewSubCompanyId: newSubCompanyId ? parseInt(newSubCompanyId) : null,
      NewDeptId: newDeptId ? parseInt(newDeptId) : null,
      NewPosId: newPosId ? parseInt(newPosId) : null,
      AssignmentDate: effectiveDate,
      AssignmentReason: assignmentReason || null,
      AssignedBy: req.user.employeeId,
      
      // 발령 유형 관련 파라미터 추가
      CategoryId: categoryId ? parseInt(categoryId) : null,
      AssignmentTypeId: assignmentTypeId ? parseInt(assignmentTypeId) : null,
      ReasonId: reasonId ? parseInt(reasonId) : null,
      ApprovalStatus: approvalStatus || 'APPROVED',
      ApprovalComment: approvalComment || null,
      DocumentPath: documentPath || null,
      OldSalary: oldSalary ? parseFloat(oldSalary) : null,
      NewSalary: newSalary ? parseFloat(newSalary) : null
    };

    const result = await executeStoredProcedureWithNamedParams('x_AssignEmployee', spParams);

    // 8. 결과 처리 및 응답
    if (result.ResultCode === 0) {
      console.log('✅ 종합 발령 성공:', {
        employeeId: parseInt(employeeId),
        assignmentId: result.data[0]?.AssignmentId,
        assignmentType: result.data[0]?.AssignmentType,
        changeCount: result.data[0]?.ChangeCount,
        employeeName: result.data[0]?.FullName,
        message: result.Message,
        timestamp: new Date().toISOString()
      });

      // 성공 응답 (종합 발령 정보 및 발령 유형 포함)
      res.status(201).json({
        success: true,
        data: {
          assignmentId: result.data[0]?.AssignmentId,
          employeeId: result.data[0]?.EmployeeId,
          employeeCode: result.data[0]?.EmployeeCode,
          employeeName: result.data[0]?.FullName,
          assignmentType: result.data[0]?.AssignmentType,
          changeCount: result.data[0]?.ChangeCount,
          newCompany: result.data[0]?.NewCompanyName,
          newSubCompany: result.data[0]?.NewSubCompanyName,
          newDepartment: result.data[0]?.NewDeptName,
          newPosition: result.data[0]?.NewPosName,
          assignmentDate: result.data[0]?.AssignmentDate,
          // 발령 유형 정보 추가
          assignmentCategory: {
            categoryId: result.data[0]?.CategoryId,
            categoryName: result.data[0]?.CategoryName
          },
          assignmentTypeInfo: {
            assignmentTypeId: result.data[0]?.AssignmentTypeId,
            typeName: result.data[0]?.TypeName
          },
          assignmentReason: {
            reasonId: result.data[0]?.ReasonId,
            reasonText: result.data[0]?.ReasonText
          },
          approvalInfo: {
            approvalStatus: result.data[0]?.ApprovalStatus,
            approvalComment: result.data[0]?.ApprovalComment
          },
          salaryChange: {
            oldSalary: result.data[0]?.OldSalary,
            newSalary: result.data[0]?.NewSalary,
            hasChange: result.data[0]?.OldSalary !== result.data[0]?.NewSalary
          },
          processedAt: new Date().toISOString()
        },
        message: result.Message || '종합 발령이 성공적으로 처리되었습니다.'
      });
    } else {
      console.warn('🚫 종합 발령 실패:', {
        employeeId: parseInt(employeeId),
        changeTypes: changeTypes.join(', '),
        reason: result.Message,
        timestamp: new Date().toISOString()
      });

      // 비즈니스 로직 오류 응답
      res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '종합 발령 처리 중 오류가 발생했습니다.'
      });
    }

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 종합 발령 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      employeeId: req.params.employeeId,
      changeTypes: changeTypes.join(', '),
      requestBody: req.body,
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
 * 직원 발령 이력 조회 API
 * @route GET /api/assignments/:employeeId/history
 * @description 특정 직원의 발령 이력 전체 조회
 * @access Private (본인, admin, manager만 가능)
 */
router.get('/:employeeId/history', authenticateToken, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { page = 1, limit = 10, assignmentType } = req.query;

    // 1. 파라미터 검증
    if (!employeeId || isNaN(parseInt(employeeId))) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 직원 ID입니다.'
      });
    }

    const targetEmployeeId = parseInt(employeeId);

    // 2. 본인 또는 관리자 권한 확인
    const canAccess = req.user.employeeId === targetEmployeeId || 
                     ['admin', 'manager'].includes(req.user.role);

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        data: null,
        message: '해당 직원의 발령 이력을 조회할 권한이 없습니다.'
      });
    }

    console.log('🔄 발령 이력 조회 요청:', {
      employeeId: targetEmployeeId,
      page: parseInt(page),
      limit: parseInt(limit),
      assignmentType: assignmentType || null,
      requestUser: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 3. 발령 이력 조회 쿼리 (임시로 직접 쿼리 사용, 나중에 SP로 변경 예정)
    const pool = await sql.connect();
    const request = pool.request();

    let whereClause = 'WHERE ea.EmployeeId = @EmployeeId AND ea.IsActive = 1';
    const params = { EmployeeId: targetEmployeeId };

    if (assignmentType) {
      whereClause += ' AND ea.AssignmentType = @AssignmentType';
      params.AssignmentType = assignmentType;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 파라미터 바인딩
    Object.keys(params).forEach(key => {
      request.input(key, params[key]);
    });
    request.input('Offset', offset);
    request.input('Limit', parseInt(limit));

    const query = `
      SELECT 
        ea.AssignmentId,
        ea.EmployeeId,
        e.EmployeeCode,
        e.FullName AS EmployeeName,
        
        -- 이전 조직 정보
        pc.CompanyName AS PreviousCompanyName,
        ps.SubCompanyName AS PreviousSubCompanyName,
        pd.DeptName AS PreviousDeptName,
        pp.PosName AS PreviousPosName,
        
        -- 새 조직 정보
        nc.CompanyName AS NewCompanyName,
        ns.SubCompanyName AS NewSubCompanyName,
        nd.DeptName AS NewDeptName,
        np.PosName AS NewPosName,
        
        ea.AssignmentType,
        ea.AssignmentReason,
        ea.EffectiveDate,
        ea.PreviousSalary,
        ea.NewSalary,
        ea.ApprovedBy,
        approver.FullName AS ApproverName,
        ea.ApprovedAt,
        ea.CreatedAt
        
      FROM uEmployeeAssignmentTb ea
      INNER JOIN uEmployeeTb e ON ea.EmployeeId = e.EmployeeId
      
      -- 이전 조직 정보 조인
      LEFT JOIN uCompanyTb pc ON ea.PreviousCompanyId = pc.CompanyId
      LEFT JOIN uSubCompanyTb ps ON ea.PreviousSubCompanyId = ps.SubCompanyId
      LEFT JOIN uDeptTb pd ON ea.PreviousDeptId = pd.DeptId
      LEFT JOIN uPositionTb pp ON ea.PreviousPosId = pp.PosId
      
      -- 새 조직 정보 조인
      LEFT JOIN uCompanyTb nc ON ea.NewCompanyId = nc.CompanyId
      LEFT JOIN uSubCompanyTb ns ON ea.NewSubCompanyId = ns.SubCompanyId
      LEFT JOIN uDeptTb nd ON ea.NewDeptId = nd.DeptId
      LEFT JOIN uPositionTb np ON ea.NewPosId = np.PosId
      
      -- 승인자 정보 조인
      LEFT JOIN uEmployeeTb approver ON ea.ApprovedBy = approver.EmployeeId
      
      ${whereClause}
      ORDER BY ea.EffectiveDate DESC, ea.CreatedAt DESC
      OFFSET @Offset ROWS
      FETCH NEXT @Limit ROWS ONLY
    `;

    const result = await request.query(query);

    // 4. 총 개수 조회
    const countRequest = pool.request();
    Object.keys(params).forEach(key => {
      countRequest.input(key, params[key]);
    });

    const countQuery = `
      SELECT COUNT(*) as TotalCount
      FROM uEmployeeAssignmentTb ea
      ${whereClause}
    `;

    const countResult = await countRequest.query(countQuery);
    const totalCount = countResult.recordset[0].TotalCount;

    console.log('✅ 발령 이력 조회 성공:', {
      employeeId: targetEmployeeId,
      count: result.recordset.length,
      totalCount,
      timestamp: new Date().toISOString()
    });

    // 5. 성공 응답
    res.json({
      success: true,
      data: {
        assignments: result.recordset,
        pagination: {
          currentPage: parseInt(page),
          pageSize: parseInt(limit),
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit))
        }
      },
      message: '발령 이력 조회가 완료되었습니다.'
    });

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 발령 이력 조회 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      employeeId: req.params.employeeId,
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

module.exports = router;