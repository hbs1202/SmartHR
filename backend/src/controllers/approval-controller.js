/**
 * 전자결재 시스템 API 컨트롤러
 * @description 결재 문서 생성, 승인, 반려, 조회 등 결재 프로세스 API
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
 * 결재 문서 생성 API
 * @route POST /api/approval/documents
 * @description 새로운 결재 문서를 생성하고 결재선을 자동으로 설정
 * @access Private (JWT 토큰 필요)
 */
router.post('/documents', authenticateToken, async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const { formId, title, content, approvalLineJson } = req.body;
    const requesterId = req.user.employeeId;

    // 2. 필수 파라미터 검증
    if (!formId || !title || !content) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '필수 입력 항목이 누락되었습니다. (formId, title, content)'
      });
    }

    // 3. 제목 길이 검증
    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '문서 제목은 200자를 초과할 수 없습니다.'
      });
    }

    // 4. SP_CreateApprovalDocument 호출
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    // 입력 파라미터 설정
    request.input('FormId', sql.Int, formId);
    request.input('Title', sql.NVarChar(200), title);
    request.input('Content', sql.NText, content);
    request.input('RequesterId', sql.Int, requesterId);
    request.input('ApprovalLineJson', sql.NText, approvalLineJson || null);

    // 출력 파라미터 설정
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));
    request.output('DocumentId', sql.Int);

    const result = await request.execute('SP_CreateApprovalDocument');

    // 5. 결과 처리 및 응답
    if (result.output.ResultCode === 0) {
      // 성공 응답
      res.json({
        success: true,
        data: {
          documentId: result.output.DocumentId,
          message: result.output.Message
        },
        message: '결재 문서가 성공적으로 생성되었습니다.'
      });
    } else {
      // 비즈니스 로직 오류 응답
      res.status(400).json({
        success: false,
        data: null,
        message: result.output.Message || '문서 생성 중 오류가 발생했습니다.'
      });
    }

    await pool.close();

  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[결재 문서 생성] API 오류 발생:`, {
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
 * 결재 처리 API (승인/반려)
 * @route POST /api/approval/documents/:documentId/process
 * @description 결재 문서를 승인하거나 반려 처리
 * @access Private (JWT 토큰 필요)
 */
router.post('/documents/:documentId/process', authenticateToken, async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const { documentId } = req.params;
    const { action, comment } = req.body;
    const approverId = req.user.employeeId;

    // 2. 필수 파라미터 검증
    if (!documentId || !action) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '필수 입력 항목이 누락되었습니다. (documentId, action)'
      });
    }

    // 3. 액션 값 검증
    if (!['APPROVE', 'REJECT'].includes(action.toUpperCase())) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 액션입니다. (APPROVE 또는 REJECT만 허용)'
      });
    }

    // 4. 의견 길이 검증
    if (comment && comment.length > 1000) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '결재 의견은 1000자를 초과할 수 없습니다.'
      });
    }

    // 5. SP_ProcessApproval 호출
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    // 입력 파라미터 설정
    request.input('DocumentId', sql.Int, parseInt(documentId));
    request.input('ApproverId', sql.Int, approverId);
    request.input('Action', sql.NVarChar(20), action.toUpperCase());
    request.input('Comment', sql.NText, comment || null);

    // 출력 파라미터 설정
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    const result = await request.execute('SP_ProcessApproval');

    // 6. 결과 처리 및 응답
    if (result.output.ResultCode === 0) {
      // 성공 응답
      res.json({
        success: true,
        data: {
          documentId: parseInt(documentId),
          action: action.toUpperCase(),
          processedBy: approverId,
          processedAt: new Date().toISOString(),
          comment: comment || null
        },
        message: result.output.Message
      });
    } else {
      // 비즈니스 로직 오류 응답
      res.status(400).json({
        success: false,
        data: null,
        message: result.output.Message || '결재 처리 중 오류가 발생했습니다.'
      });
    }

    await pool.close();

  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[결재 처리] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      documentId: req.params.documentId,
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
 * 결재 문서 상세 조회 API
 * @route GET /api/approval/documents/:documentId
 * @description 결재 문서의 상세 정보, 결재선, 히스토리 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const { documentId } = req.params;

    if (!documentId || isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 문서 ID입니다.'
      });
    }

    // 2. SP_GetApprovalDocument 호출
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    request.input('DocumentId', sql.Int, parseInt(documentId));
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    const result = await request.execute('SP_GetApprovalDocument');

    // 3. 결과 처리 및 응답
    if (result.output.ResultCode === 0) {
      // 결과셋 파싱
      const documentInfo = result.recordsets[0] && result.recordsets[0][0] || null;
      const approvalLine = result.recordsets[1] || [];
      const approvalHistory = result.recordsets[2] || [];
      const attachments = result.recordsets[3] || [];

      if (!documentInfo) {
        return res.status(404).json({
          success: false,
          data: null,
          message: '존재하지 않는 문서입니다.'
        });
      }

      // 성공 응답
      res.json({
        success: true,
        data: {
          document: {
            documentId: documentInfo.DocumentId,
            documentNo: documentInfo.DocumentNo,
            title: documentInfo.Title,
            content: documentInfo.Content,
            currentStatus: documentInfo.CurrentStatus,
            currentLevel: documentInfo.CurrentLevel,
            totalLevel: documentInfo.TotalLevel,
            createdAt: documentInfo.CreatedAt,
            processedAt: documentInfo.ProcessedAt,
            form: {
              formCode: documentInfo.FormCode,
              formName: documentInfo.FormName,
              formNameEng: documentInfo.FormNameEng,
              categoryName: documentInfo.CategoryName
            },
            requester: {
              employeeCode: documentInfo.RequesterCode,
              employeeName: documentInfo.RequesterName,
              position: documentInfo.RequesterPosition,
              department: documentInfo.RequesterDepartment
            }
          },
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
          approvalHistory: approvalHistory.map(history => ({
            approvalLevel: history.ApprovalLevel,
            actionType: history.ActionType,
            actionDate: history.ActionDate,
            comment: history.Comment,
            employee: {
              employeeCode: history.EmployeeCode,
              employeeName: history.EmployeeName,
              position: history.PosName,
              department: history.DeptName
            }
          })),
          attachments: attachments.map(attachment => ({
            attachmentId: attachment.AttachmentId,
            originalFileName: attachment.OriginalFileName,
            fileSize: attachment.FileSize,
            fileExtension: attachment.FileExtension,
            uploadedAt: attachment.UploadedAt
          }))
        },
        message: '문서 조회가 완료되었습니다.'
      });
    } else {
      // 비즈니스 로직 오류 응답
      res.status(400).json({
        success: false,
        data: null,
        message: result.output.Message || '문서 조회 중 오류가 발생했습니다.'
      });
    }

    await pool.close();

  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[결재 문서 조회] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      documentId: req.params.documentId,
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
 * 결재 대기 문서 목록 조회 API
 * @route GET /api/approval/pending
 * @description 현재 사용자가 결재해야 할 대기 중인 문서 목록
 * @access Private (JWT 토큰 필요)
 */
router.get('/pending', authenticateToken, async (req, res) => {
  try {
    // 1. 요청 데이터 추출
    const approverId = req.user.employeeId;
    const { page = 1, size = 20 } = req.query;

    // 2. 페이지네이션 파라미터 검증
    const pageNumber = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(size)));

    // 3. SP_GetPendingApprovalList 호출
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    request.input('ApproverId', sql.Int, approverId);
    request.input('PageSize', sql.Int, pageSize);
    request.input('PageNumber', sql.Int, pageNumber);
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    const result = await request.execute('SP_GetPendingApprovalList');

    // 4. 결과 처리 및 응답
    if (result.output.ResultCode === 0) {
      const documents = result.recordsets[0] || [];
      const totalCount = result.recordsets[1] && result.recordsets[1][0]?.TotalCount || 0;

      // 성공 응답
      res.json({
        success: true,
        data: {
          documents: documents.map(doc => ({
            documentId: doc.DocumentId,
            documentNo: doc.DocumentNo,
            title: doc.Title,
            currentStatus: doc.CurrentStatus,
            currentLevel: doc.CurrentLevel,
            totalLevel: doc.TotalLevel,
            createdAt: doc.CreatedAt,
            form: {
              formCode: doc.FormCode,
              formName: doc.FormName,
              categoryName: doc.CategoryName
            },
            requester: {
              employeeCode: doc.RequesterCode,
              employeeName: doc.RequesterName,
              position: doc.RequesterPosition,
              department: doc.RequesterDepartment
            },
            myApproval: {
              level: doc.MyApprovalLevel,
              status: doc.MyApprovalStatus
            }
          })),
          pagination: {
            currentPage: pageNumber,
            pageSize: pageSize,
            totalCount: totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            hasNextPage: pageNumber * pageSize < totalCount,
            hasPreviousPage: pageNumber > 1
          }
        },
        message: '결재 대기 목록 조회가 완료되었습니다.'
      });
    } else {
      // 비즈니스 로직 오류 응답
      res.status(400).json({
        success: false,
        data: null,
        message: result.output.Message || '목록 조회 중 오류가 발생했습니다.'
      });
    }

    await pool.close();

  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[결재 대기 목록 조회] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      query: req.query,
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
 * 내가 신청한 문서 목록 조회 API
 * @route GET /api/approval/my-documents
 * @description 현재 사용자가 신청한 문서 목록 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/my-documents', authenticateToken, async (req, res) => {
  try {
    // 1. 요청 데이터 추출
    const requesterId = req.user.employeeId;
    const { status, page = 1, size = 20 } = req.query;

    // 2. 파라미터 검증
    const pageNumber = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(size)));

    // 유효한 상태값 검증
    const validStatuses = ['DRAFT', 'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED'];
    if (status && !validStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효하지 않은 상태값입니다. (DRAFT, PENDING, IN_PROGRESS, APPROVED, REJECTED)'
      });
    }

    // 3. SP_GetMyDocumentList 호출
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    request.input('RequesterId', sql.Int, requesterId);
    request.input('Status', sql.NVarChar(20), status?.toUpperCase() || null);
    request.input('PageSize', sql.Int, pageSize);
    request.input('PageNumber', sql.Int, pageNumber);
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));

    const result = await request.execute('SP_GetMyDocumentList');

    // 4. 결과 처리 및 응답
    if (result.output.ResultCode === 0) {
      const documents = result.recordsets[0] || [];
      const totalCount = result.recordsets[1] && result.recordsets[1][0]?.TotalCount || 0;

      // 성공 응답
      res.json({
        success: true,
        data: {
          documents: documents.map(doc => ({
            documentId: doc.DocumentId,
            documentNo: doc.DocumentNo,
            title: doc.Title,
            currentStatus: doc.CurrentStatus,
            currentLevel: doc.CurrentLevel,
            totalLevel: doc.TotalLevel,
            createdAt: doc.CreatedAt,
            processedAt: doc.ProcessedAt,
            form: {
              formCode: doc.FormCode,
              formName: doc.FormName,
              categoryName: doc.CategoryName
            },
            currentApproverName: doc.CurrentApproverName
          })),
          pagination: {
            currentPage: pageNumber,
            pageSize: pageSize,
            totalCount: totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            hasNextPage: pageNumber * pageSize < totalCount,
            hasPreviousPage: pageNumber > 1
          },
          filter: {
            status: status?.toUpperCase() || 'ALL'
          }
        },
        message: '내 문서 목록 조회가 완료되었습니다.'
      });
    } else {
      // 비즈니스 로직 오류 응답
      res.status(400).json({
        success: false,
        data: null,
        message: result.output.Message || '목록 조회 중 오류가 발생했습니다.'
      });
    }

    await pool.close();

  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[내 문서 목록 조회] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      query: req.query,
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
 * 결재 양식 목록 조회 API
 * @route GET /api/approval/forms
 * @description 사용 가능한 결재 양식 목록 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/forms', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;

    // DB 조회
    const pool = await sql.connect(dbConfig);
    const request = pool.request();

    let whereClause = 'WHERE IsActive = 1';
    if (category) {
      request.input('CategoryCode', sql.NVarChar(30), category.toUpperCase());
      whereClause += ' AND CategoryCode = @CategoryCode';
    }

    const query = `
      SELECT 
        FormId,
        FormCode,
        FormName,
        FormNameEng,
        CategoryCode,
        CategoryName,
        FormTemplate,
        RequiredFields,
        MaxApprovalLevel,
        DisplayOrder,
        Description
      FROM uApprovalFormTb
      ${whereClause}
      ORDER BY DisplayOrder, FormCode
    `;

    const result = await request.query(query);

    // 성공 응답
    res.json({
      success: true,
      data: {
        forms: result.recordset.map(form => ({
          formId: form.FormId,
          formCode: form.FormCode,
          formName: form.FormName,
          formNameEng: form.FormNameEng,
          category: {
            code: form.CategoryCode,
            name: form.CategoryName
          },
          template: form.FormTemplate ? JSON.parse(form.FormTemplate) : null,
          requiredFields: form.RequiredFields ? form.RequiredFields.split(',') : [],
          maxApprovalLevel: form.MaxApprovalLevel,
          displayOrder: form.DisplayOrder,
          description: form.Description
        })),
        filter: {
          category: category?.toUpperCase() || 'ALL'
        }
      },
      message: '결재 양식 목록 조회가 완료되었습니다.'
    });

    await pool.close();

  } catch (error) {
    // 시스템 오류 로깅
    console.error(`[결재 양식 목록 조회] API 오류 발생:`, {
      error: error.message,
      stack: error.stack,
      query: req.query,
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

module.exports = router;