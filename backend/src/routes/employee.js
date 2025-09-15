/**
 * 직원 관리 API 라우터
 * @description 직원 관리 관련 라우팅 설정
 * @author SmartHR Team
 * @date 2024-09-13
 */

const express = require('express');
const router = express.Router();

// 직원 관리 컨트롤러 로드
const employeeController = require('../controllers/employee-controller');

// 직원 관리 API 라우트 설정
router.use('/employees', employeeController);

module.exports = router;