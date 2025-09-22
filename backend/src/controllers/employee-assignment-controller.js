/**
 * 직원 발령 이력 관리 API 컨트롤러
 * @description 직원별 발령 이력 조회 및 관리
 * @author SmartHR Team
 * @date 2025-01-19
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { executeStoredProcedureWithNamedParams } = require('../database/dbHelper');

/**
 * 직원 발령 이력 조회 API
 * @route GET /api/employees/:id/assignments
 * @description 특정 직원의 발령 이력 조회
 * @access Private (JWT 토큰 필요, 본인/admin/manager만 가능)
 */
router.get('/:id/assignments', authenticateToken, async (req, res) => {
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
        message: '해당 직원의 발령 이력을 조회할 권한이 없습니다.'
      });
    }

    // 3. 쿼리 파라미터 추출
    const { page = 1, limit = 10, assignmentType } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '페이지 번호는 1 이상, 페이지 크기는 1~100 사이여야 합니다.'
      });
    }

    console.log('🔄 직원 발령 이력 조회 시도:', {
      employeeId,
      page: pageNum,
      limit: limitNum,
      assignmentType: assignmentType || 'all',
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 4. 발령 이력 조회 SP 호출
    const spParams = {
      EmployeeId: employeeId,
      Page: pageNum,
      PageSize: limitNum,
      AssignmentType: assignmentType || null,
      RequestingUserId: req.user.employeeId,
      RequestingUserRole: req.user.role
    };

    const result = await executeStoredProcedureWithNamedParams('x_GetEmployeeAssignments', spParams);

    // 5. SP 실행 결과 확인
    if (result.ResultCode !== 0) {
      console.warn('🚫 직원 발령 이력 조회 실패:', {
        employeeId,
        reason: result.Message,
        requestedBy: req.user.employeeId,
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({
        success: false,
        data: null,
        message: result.Message || '발령 이력 조회에 실패했습니다.'
      });
    }

    // 6. 데이터 처리
    const assignments = result.data || [];
    const totalCount = result.totalCount || assignments.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    console.log('✅ 직원 발령 이력 조회 성공:', {
      employeeId,
      assignmentCount: assignments.length,
      totalCount,
      requestedBy: req.user.employeeId,
      timestamp: new Date().toISOString()
    });

    // 7. 성공 응답
    res.json({
      success: true,
      data: {
        assignments: assignments.map(assignment => ({
          assignmentId: assignment.AssignmentId,
          assignmentType: assignment.AssignmentType,
          effectiveDate: assignment.EffectiveDate,
          assignmentReason: assignment.AssignmentReason,
          // 이전 조직 정보
          previousCompany: assignment.PreviousCompanyName,
          previousSubCompany: assignment.PreviousSubCompanyName,
          previousDept: assignment.PreviousDeptName,
          previousPos: assignment.PreviousPosName,
          // 새 조직 정보
          newCompany: assignment.NewCompanyName,
          newSubCompany: assignment.NewSubCompanyName,
          newDept: assignment.NewDeptName,
          newPos: assignment.NewPosName,
          // 급여 정보
          previousSalary: assignment.PreviousSalary,
          newSalary: assignment.NewSalary,
          // 승인 정보
          approvedBy: assignment.ApprovedBy,
          approverName: assignment.ApproverName,
          approvedAt: assignment.ApprovedAt,
          createdAt: assignment.CreatedAt
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
      message: '발령 이력 조회가 완료되었습니다.'
    });

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 직원 발령 이력 조회 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      employeeId: req.params.id,
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