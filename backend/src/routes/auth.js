/**
 * 인증 라우터
 * @description 인증 관련 API 라우팅
 * @author SmartHR Team
 * @date 2024-09-13
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth-controller');

// 인증 컨트롤러의 모든 라우트를 /api/auth 경로에 마운트
router.use('/auth', authController);

module.exports = router;