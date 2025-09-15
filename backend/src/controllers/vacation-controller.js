/**
 * 휴가 신청 결재 시스템 API 컨트롤러
 * @description 휴가 신청, 승인, 반려, 잔여휴가 관리 등 통합 휴가 관리 API
 * @author SmartHR Team
 * @date 2024-09-14
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const sql = require('mssql');

// DB 연결 설정
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
    requestTimeout: 30000
  }
};

/**
 * 휴가 신청 API (결재 연동)
 * @route POST /api/vacation/request
 * @description 휴가 신청서를 생성하고 자동으로 결재 프로세스를 시작
 * @access Private (JWT 토큰 필요)
 */
router.post('/request', authenticateToken, async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const {
      vacationType,
      startDate,
      endDate,
      days,
      reason,
      emergencyContact,
      workHandover
    } = req.body;
    const requesterId = req.user.employeeId;

    // 2. 필수 파라미터 검증
    if (!vacationType || !startDate || !endDate || !days || !reason) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '필수 입력 항목이 누락되었습니다. (vacationType, startDate, endDate, days, reason)'
      });
    }

    // 3. 날짜 검증
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    const today = new Date();

    if (startDateTime < today) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '휴가 시작일은 오늘 이후여야 합니다.'
      });
    }

    if (endDateTime < startDateTime) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '휴가 종료일은 시작일 이후여야 합니다.'
      });
    }

    // 4. 휴가 일수 검증
    if (days <= 0 || days > 365) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '휴가 일수는 1일 이상 365일 이하여야 합니다.'
      });
    }

    // 5. 휴가 유형별 검증
    const validVacationTypes = ['연차', '병가', '경조휴가', '특별휴가'];
    if (!validVacationTypes.includes(vacationType)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 휴가 유형입니다. (연차, 병가, 경조휴가, 특별휴가)'
      });
    }

    // 6. 잔여 연차 확인 (연차인 경우)
    if (vacationType === '연차') {
      const remainingResult = await checkRemainingVacation(requesterId, days);
      if (!remainingResult.success) {
        return res.status(400).json({
          success: false,
          data: null,
          message: remainingResult.message
        });
      }
    }

    // 7. 휴가신청서 문서 생성
    const vacationContent = JSON.stringify({
      vacationType,
      startDate,
      endDate,
      days,
      reason,
      emergencyContact: emergencyContact || '',
      workHandover: workHandover || ''
    });

    const documentTitle = `${vacationType} 신청 (${startDate} ~ ${endDate})`;

    // 8. 결재 문서 생성 API 호출
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    // 휴가신청서 Form ID (마스터 데이터에서 VACATION 양식)
    const VACATION_FORM_ID = 1;

    request.input('FormId', sql.Int, VACATION_FORM_ID);
    request.input('Title', sql.NVarChar(200), documentTitle);
    request.input('Content', sql.NText, vacationContent);
    request.input('RequesterId', sql.Int, requesterId);
    request.input('ApprovalLineJson', sql.NText, null); // 자동 결재선 사용

    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));
    request.output('DocumentId', sql.Int);

    const result = await request.execute('SP_CreateApprovalDocument');

    // 9. 결과 처리 및 응답
    if (result.output.ResultCode === 0) {
      // 성공 응답
      res.json({
        success: true,
        data: {
          vacationRequest: {
            documentId: result.output.DocumentId,
            vacationType,
            startDate,
            endDate,
            days,
            reason,
            status: 'PENDING',
            createdAt: new Date().toISOString()
          },
          approvalProcess: {
            status: 'STARTED',
            message: result.output.Message
          }
        },
        message: '휴가 신청이 완료되었습니다. 결재 진행 상황은 마이페이지에서 확인하실 수 있습니다.'
      });
    } else {
      // 비즈니스 로직 오류
      res.status(400).json({
        success: false,
        data: null,
        message: result.output.Message || '휴가 신청 처리 중 오류가 발생했습니다.'
      });
    }

    await pool.close();

  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[휴가 신청] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
      userId: req.user?.employeeId,
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
 * 잔여 연차 확인 함수
 */
async function checkRemainingVacation(employeeId, requestedDays) {
  try {
    // TODO: 실제로는 연차 관리 테이블에서 확인해야 함
    // 임시로 기본 연차 15일로 설정하고 사용한 연차를 계산
    const currentYear = new Date().getFullYear();
    
    // 임시 데이터 - 실제로는 DB에서 조회
    const totalAnnualLeave = 15; // 연간 기본 연차
    const usedAnnualLeave = 0;   // 올해 사용한 연차 (실제로는 DB 조회)
    const remainingLeave = totalAnnualLeave - usedAnnualLeave;

    if (requestedDays > remainingLeave) {
      return {
        success: false,
        message: `잔여 연차가 부족합니다. (잔여: ${remainingLeave}일, 신청: ${requestedDays}일)`
      };
    }

    return {
      success: true,
      remainingLeave,
      requestedDays
    };
  } catch (error) {
    return {
      success: false,
      message: '잔여 연차 확인 중 오류가 발생했습니다.'
    };
  }
}

/**
 * 내 휴가 신청 이력 조회 API
 * @route GET /api/vacation/my-requests
 * @description 현재 사용자가 신청한 휴가 이력 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const requesterId = req.user.employeeId;
    const { status, year, page = 1, size = 20 } = req.query;

    // 페이지네이션 파라미터 검증
    const pageNumber = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(size)));

    // 휴가신청서 Form ID
    const VACATION_FORM_ID = 1;

    const pool = await sql.connect(dbConfig);
    let query = `
      SELECT 
        d.DocumentId,
        d.DocumentNo,
        d.Title,
        d.Content,
        d.CurrentStatus,
        d.CurrentLevel,
        d.TotalLevel,
        d.CreatedAt,
        d.ProcessedAt,
        
        -- 현재 결재자 정보
        CASE 
          WHEN d.CurrentStatus = 'IN_PROGRESS' THEN 
            (SELECT e.FirstName + ' ' + e.LastName 
             FROM uApprovalLineTb al 
             INNER JOIN uEmployeeTb e ON al.ApproverEmployeeId = e.EmployeeId
             WHERE al.DocumentId = d.DocumentId 
             AND al.ApprovalLevel = d.CurrentLevel + 1)
          ELSE NULL
        END AS CurrentApproverName
        
      FROM uApprovalDocumentTb d
      WHERE d.RequesterId = @RequesterId
      AND d.FormId = @FormId
    `;

    const request = pool.request();
    request.input('RequesterId', sql.Int, requesterId);
    request.input('FormId', sql.Int, VACATION_FORM_ID);

    // 상태 필터링
    if (status) {
      query += ' AND d.CurrentStatus = @Status';
      request.input('Status', sql.NVarChar(20), status.toUpperCase());
    }

    // 연도 필터링
    if (year) {
      query += ' AND YEAR(d.CreatedAt) = @Year';
      request.input('Year', sql.Int, parseInt(year));
    }

    query += ` 
      ORDER BY d.CreatedAt DESC
      OFFSET @Offset ROWS
      FETCH NEXT @PageSize ROWS ONLY
    `;

    request.input('Offset', sql.Int, (pageNumber - 1) * pageSize);
    request.input('PageSize', sql.Int, pageSize);

    const result = await request.query(query);

    // 총 개수 조회
    let countQuery = `
      SELECT COUNT(*) AS TotalCount
      FROM uApprovalDocumentTb d
      WHERE d.RequesterId = @RequesterId
      AND d.FormId = @FormId
    `;

    const countRequest = pool.request();
    countRequest.input('RequesterId', sql.Int, requesterId);
    countRequest.input('FormId', sql.Int, VACATION_FORM_ID);

    if (status) {
      countQuery += ' AND d.CurrentStatus = @Status';
      countRequest.input('Status', sql.NVarChar(20), status.toUpperCase());
    }

    if (year) {
      countQuery += ' AND YEAR(d.CreatedAt) = @Year';
      countRequest.input('Year', sql.Int, parseInt(year));
    }

    const countResult = await countRequest.query(countQuery);
    const totalCount = countResult.recordset[0].TotalCount;

    // 응답 데이터 변환
    const vacationRequests = result.recordset.map(doc => {
      let vacationData = {};
      try {
        vacationData = JSON.parse(doc.Content || '{}');
      } catch (e) {
        vacationData = {};
      }

      return {
        documentId: doc.DocumentId,
        documentNo: doc.DocumentNo,
        vacationType: vacationData.vacationType,
        startDate: vacationData.startDate,
        endDate: vacationData.endDate,
        days: vacationData.days,
        reason: vacationData.reason,
        status: doc.CurrentStatus,
        currentLevel: doc.CurrentLevel,
        totalLevel: doc.TotalLevel,
        currentApproverName: doc.CurrentApproverName,
        createdAt: doc.CreatedAt,
        processedAt: doc.ProcessedAt
      };
    });

    // 성공 응답
    res.json({
      success: true,
      data: {
        requests: vacationRequests,
        pagination: {
          currentPage: pageNumber,
          pageSize: pageSize,
          totalCount: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNextPage: pageNumber * pageSize < totalCount,
          hasPreviousPage: pageNumber > 1
        },
        filters: {
          status: status?.toUpperCase() || 'ALL',
          year: year ? parseInt(year) : new Date().getFullYear()
        }
      },
      message: '휴가 신청 이력 조회가 완료되었습니다.'
    });

    await pool.close();

  } catch (error) {
    console.error(`[휴가 신청 이력 조회] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.employeeId,
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
 * 휴가 신청 상세 조회 API
 * @route GET /api/vacation/requests/:documentId
 * @description 휴가 신청서의 상세 정보 및 결재 현황 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/requests/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.employeeId;

    if (!documentId || isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 문서 ID입니다.'
      });
    }

    // 결재 문서 상세 조회 API 재사용
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    request.input('DocumentId', sql.Int, parseInt(documentId));
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    const result = await request.execute('SP_GetApprovalDocument');

    if (result.output.ResultCode === 0) {
      const documentInfo = result.recordsets[0] && result.recordsets[0][0] || null;
      const approvalLine = result.recordsets[1] || [];
      const approvalHistory = result.recordsets[2] || [];

      if (!documentInfo) {
        return res.status(404).json({
          success: false,
          data: null,
          message: '존재하지 않는 휴가 신청서입니다.'
        });
      }

      // 권한 검증 (본인 또는 결재자만 조회 가능)
      const isRequester = documentInfo.RequesterCode === req.user.employeeCode;
      const isApprover = approvalLine.some(line => line.ApproverCode === req.user.employeeCode);
      
      if (!isRequester && !isApprover) {
        return res.status(403).json({
          success: false,
          data: null,
          message: '휴가 신청서 조회 권한이 없습니다.'
        });
      }

      // 휴가 정보 파싱
      let vacationData = {};
      try {
        vacationData = JSON.parse(documentInfo.Content || '{}');
      } catch (e) {
        vacationData = {};
      }

      // 성공 응답
      res.json({
        success: true,
        data: {
          vacationRequest: {
            documentId: documentInfo.DocumentId,
            documentNo: documentInfo.DocumentNo,
            vacationType: vacationData.vacationType,
            startDate: vacationData.startDate,
            endDate: vacationData.endDate,
            days: vacationData.days,
            reason: vacationData.reason,
            emergencyContact: vacationData.emergencyContact,
            workHandover: vacationData.workHandover,
            status: documentInfo.CurrentStatus,
            currentLevel: documentInfo.CurrentLevel,
            totalLevel: documentInfo.TotalLevel,
            createdAt: documentInfo.CreatedAt,
            processedAt: documentInfo.ProcessedAt
          },
          requester: {
            employeeCode: documentInfo.RequesterCode,
            employeeName: documentInfo.RequesterName,
            position: documentInfo.RequesterPosition,
            department: documentInfo.RequesterDepartment
          },
          approvalProcess: {
            approvalLine: approvalLine.map(line => ({
              approvalLevel: line.ApprovalLevel,
              approvalType: line.ApprovalType,
              approvalStatus: line.ApprovalStatus,
              approvalDate: line.ApprovalDate,
              approvalComment: line.ApprovalComment,
              approver: {
                employeeCode: line.ApproverCode,
                employeeName: line.ApproverName,
                position: line.ApproverPosition,
                department: line.ApproverDepartment
              }
            })),
            history: approvalHistory.map(history => ({
              actionType: history.ActionType,
              actionDate: history.ActionDate,
              comment: history.Comment,
              employee: {
                employeeCode: history.EmployeeCode,
                employeeName: history.EmployeeName,
                position: history.PosName,
                department: history.DeptName
              }
            }))
          }
        },
        message: '휴가 신청서 조회가 완료되었습니다.'
      });
    } else {
      res.status(400).json({
        success: false,
        data: null,
        message: result.output.Message || '휴가 신청서 조회 중 오류가 발생했습니다.'
      });
    }

    await pool.close();

  } catch (error) {
    console.error(`[휴가 신청서 상세 조회] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      documentId: req.params.documentId,
      userId: req.user?.employeeId,
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
 * 팀 휴가 현황 조회 API (관리자/팀장용)
 * @route GET /api/vacation/team-status
 * @description 부서별 휴가 현황 및 일정 조회
 * @access Private (JWT 토큰 필요, 관리자/팀장 권한)
 */
router.get('/team-status', authenticateToken, async (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    const userRole = req.user.role;
    const userDeptId = req.user.departmentId;

    // 권한 검증 (관리자이거나 부서 관리자)
    if (userRole !== 'admin' && userRole !== 'manager') {
      return res.status(403).json({
        success: false,
        data: null,
        message: '팀 휴가 현황 조회 권한이 없습니다.'
      });
    }

    // 관리자가 아닌 경우 자신의 부서만 조회 가능
    const targetDeptId = userRole === 'admin' ? departmentId : userDeptId;

    // 기간 설정 (기본값: 이번 달)
    const today = new Date();
    const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

    const queryStartDate = startDate || defaultStartDate;
    const queryEndDate = endDate || defaultEndDate;

    const pool = await sql.connect(dbConfig);
    let query = `
      SELECT 
        e.EmployeeId,
        e.EmployeeCode,
        e.FirstName + ' ' + e.LastName AS EmployeeName,
        pos.PosName,
        dept.DeptName,
        
        -- 문서 정보
        d.DocumentId,
        d.DocumentNo,
        d.CurrentStatus,
        
        -- 휴가 정보 (JSON에서 추출)
        JSON_VALUE(d.Content, '$.vacationType') AS VacationType,
        JSON_VALUE(d.Content, '$.startDate') AS StartDate,
        JSON_VALUE(d.Content, '$.endDate') AS EndDate,
        JSON_VALUE(d.Content, '$.days') AS Days,
        JSON_VALUE(d.Content, '$.reason') AS Reason,
        
        d.CreatedAt,
        d.ProcessedAt
        
      FROM uApprovalDocumentTb d
      INNER JOIN uEmployeeTb e ON d.RequesterId = e.EmployeeId
      INNER JOIN uPositionTb pos ON e.PosId = pos.PosId
      INNER JOIN uDeptTb dept ON e.DeptId = dept.DeptId
      WHERE d.FormId = 1  -- 휴가신청서
      AND (
        JSON_VALUE(d.Content, '$.startDate') BETWEEN @StartDate AND @EndDate
        OR JSON_VALUE(d.Content, '$.endDate') BETWEEN @StartDate AND @EndDate
      )
    `;

    const request = pool.request();
    request.input('StartDate', sql.Date, queryStartDate);
    request.input('EndDate', sql.Date, queryEndDate);

    // 부서 필터링
    if (targetDeptId) {
      query += ' AND e.DeptId = @DeptId';
      request.input('DeptId', sql.Int, parseInt(targetDeptId));
    }

    query += ' ORDER BY dept.DeptName, e.EmployeeCode, JSON_VALUE(d.Content, \'$.startDate\')';

    const result = await request.query(query);

    // 성공 응답
    res.json({
      success: true,
      data: {
        vacationSchedules: result.recordset.map(row => ({
          employee: {
            employeeId: row.EmployeeId,
            employeeCode: row.EmployeeCode,
            employeeName: row.EmployeeName,
            position: row.PosName,
            department: row.DeptName
          },
          vacation: {
            documentId: row.DocumentId,
            documentNo: row.DocumentNo,
            vacationType: row.VacationType,
            startDate: row.StartDate,
            endDate: row.EndDate,
            days: parseInt(row.Days || 0),
            reason: row.Reason,
            status: row.CurrentStatus,
            createdAt: row.CreatedAt,
            processedAt: row.ProcessedAt
          }
        })),
        period: {
          startDate: queryStartDate,
          endDate: queryEndDate
        },
        filter: {
          departmentId: targetDeptId || 'ALL'
        }
      },
      message: '팀 휴가 현황 조회가 완료되었습니다.'
    });

    await pool.close();

  } catch (error) {
    console.error(`[팀 휴가 현황 조회] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req.user?.employeeId,
      userRole: req.user?.role,
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