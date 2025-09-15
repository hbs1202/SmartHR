/**
 * 발령 관리 라우터
 * @description 부서 이동, 직책 변경, 승진 등 발령 관련 라우팅
 * @author SmartHR Team
 * @date 2024-09-13
 */

const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment-controller');
const assignmentMasterController = require('../controllers/assignment-master-controller');

// 발령 관리 API 라우트 연결
router.use('/', assignmentController);

// 발령 마스터 데이터 API 라우트 연결
router.use('/', assignmentMasterController);

module.exports = router;