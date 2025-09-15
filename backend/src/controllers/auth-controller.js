/**
 * 인증 API 컨트롤러
 * @description JWT 기반 인증 시스템 (로그인, 토큰 갱신, 비밀번호 변경)
 * @author SmartHR Team
 * @date 2024-09-13
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { executeStoredProcedureWithNamedParams } = require('../database/dbHelper');

/**
 * 로그인 API
 * @route POST /api/auth/login
 * @description 이메일과 비밀번호로 로그인 및 JWT 토큰 발급
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    // 1. 요청 데이터 추출 및 검증
    const { email, password } = req.body;

    // 2. 필수 파라미터 검증
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '이메일과 비밀번호를 모두 입력해주세요.'
      });
    }

    // 3. 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '유효한 이메일 주소를 입력해주세요.'
      });
    }

    // 4. 비밀번호 길이 검증
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        data: null,
        message: '비밀번호는 최소 6자 이상이어야 합니다.'
      });
    }

    console.log('🔄 로그인 시도:', { email: email, timestamp: new Date().toISOString() });

    // 5. Stored Procedure 호출하여 사용자 정보 조회
    const spParams = {
      Email: email,
      Password: password // SP에서는 비밀번호 검증용으로만 사용
    };

    const result = await executeStoredProcedureWithNamedParams('SP_AuthLogin', spParams);

    // 6. SP 실행 결과 확인
    if (result.ResultCode !== 0) {
      console.warn('🚫 로그인 실패:', { 
        email: email, 
        reason: result.Message,
        timestamp: new Date().toISOString() 
      });

      return res.status(401).json({
        success: false,
        data: null,
        message: result.Message || '로그인에 실패했습니다.'
      });
    }

    // 7. 사용자 데이터 확인
    if (!result.data || result.data.length === 0) {
      return res.status(401).json({
        success: false,
        data: null,
        message: '사용자 정보를 찾을 수 없습니다.'
      });
    }

    const userData = result.data[0];

    // 8. bcrypt로 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, userData.HashedPassword);
    
    if (!isPasswordValid) {
      console.warn('🚫 비밀번호 불일치:', { 
        email: email,
        timestamp: new Date().toISOString() 
      });

      // TODO: 로그인 실패 카운트 증가 (x_IncrementLoginFailCount)
      
      return res.status(401).json({
        success: false,
        data: null,
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 9. JWT 토큰 생성
    const tokenPayload = {
      employeeId: userData.EmployeeId,
      employeeCode: userData.EmployeeCode,
      email: userData.Email,
      role: userData.UserRole,
      departmentId: userData.DeptId,
      companyId: userData.CompanyId
    };

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'SmartHR',
        subject: 'access'
      }
    );

    // 10. Refresh Token 생성 (더 긴 만료 시간)
    const refreshToken = jwt.sign(
      { employeeId: userData.EmployeeId },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'SmartHR',
        subject: 'refresh'
      }
    );

    // 11. 응답 데이터 구성
    const responseData = {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      user: {
        employeeId: userData.EmployeeId,
        employeeCode: userData.EmployeeCode,
        email: userData.Email,
        fullName: userData.FullName,
        role: userData.UserRole,
        departmentId: userData.DeptId,
        companyId: userData.CompanyId,
        lastLoginAt: userData.LastLoginAt
      }
    };

    console.log('✅ 로그인 성공:', { 
      employeeId: userData.EmployeeId,
      employeeCode: userData.EmployeeCode,
      email: userData.Email,
      timestamp: new Date().toISOString() 
    });

    // 12. 성공 응답
    res.json({
      success: true,
      data: responseData,
      message: '로그인이 성공적으로 완료되었습니다.'
    });

  } catch (error) {
    // 시스템 오류 로깅
    console.error('❌ 로그인 API 오류 발생:', {
      error: error.message,
      stack: error.stack,
      requestBody: req.body ? { email: req.body.email } : null, // 비밀번호는 로깅하지 않음
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
 * 토큰 갱신 API
 * @route POST /api/auth/refresh
 * @description Refresh Token으로 새로운 Access Token 발급
 * @access Public (Refresh Token 필요)
 */
router.post('/refresh', async (req, res) => {
  try {
    // 1. Refresh Token 추출
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        data: null,
        message: 'Refresh Token이 필요합니다.'
      });
    }

    // 2. Refresh Token 검증
    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    
    jwt.verify(refreshToken, refreshSecret, async (err, decoded) => {
      if (err) {
        console.warn('🚫 Refresh Token 검증 실패:', {
          error: err.message,
          timestamp: new Date().toISOString()
        });

        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            data: null,
            message: 'Refresh Token이 만료되었습니다. 다시 로그인해주세요.'
          });
        }

        return res.status(403).json({
          success: false,
          data: null,
          message: '유효하지 않은 Refresh Token입니다.'
        });
      }

      try {
        // 3. 사용자 정보 재조회 (활성 상태 확인)
        const userResult = await executeStoredProcedureWithNamedParams('x_GetEmployeeById', {
          EmployeeId: decoded.employeeId
        });

        if (userResult.ResultCode !== 0 || !userResult.data || userResult.data.length === 0) {
          return res.status(401).json({
            success: false,
            data: null,
            message: '사용자 정보를 찾을 수 없습니다.'
          });
        }

        const userData = userResult.data[0];

        // 4. 계정 활성 상태 확인
        if (!userData.IsActive) {
          return res.status(401).json({
            success: false,
            data: null,
            message: '비활성화된 계정입니다.'
          });
        }

        // 5. 새로운 Access Token 생성
        const tokenPayload = {
          employeeId: userData.EmployeeId,
          employeeCode: userData.EmployeeCode,
          email: userData.Email,
          role: userData.UserRole,
          departmentId: userData.DeptId,
          companyId: userData.CompanyId
        };

        const newAccessToken = jwt.sign(
          tokenPayload,
          process.env.JWT_SECRET,
          { 
            expiresIn: process.env.JWT_EXPIRES_IN || '24h',
            issuer: 'SmartHR',
            subject: 'access'
          }
        );

        console.log('✅ 토큰 갱신 성공:', {
          employeeId: userData.EmployeeId,
          employeeCode: userData.EmployeeCode,
          timestamp: new Date().toISOString()
        });

        // 6. 성공 응답
        res.json({
          success: true,
          data: {
            accessToken: newAccessToken,
            tokenType: 'Bearer',
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
          },
          message: '토큰이 성공적으로 갱신되었습니다.'
        });

      } catch (tokenError) {
        console.error('❌ 토큰 갱신 중 오류:', tokenError);
        
        res.status(500).json({
          success: false,
          data: null,
          message: '토큰 갱신 중 오류가 발생했습니다.'
        });
      }
    });

  } catch (error) {
    console.error('❌ 토큰 갱신 API 오류:', {
      error: error.message,
      stack: error.stack,
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
 * 로그아웃 API
 * @route POST /api/auth/logout
 * @description 클라이언트 측 토큰 무효화 안내
 * @access Private (JWT 토큰 필요)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 로그아웃 요청:', {
      employeeId: req.user.employeeId,
      employeeCode: req.user.employeeCode,
      timestamp: new Date().toISOString()
    });

    // JWT는 stateless이므로 서버에서 토큰을 무효화할 수 없음
    // 클라이언트 측에서 토큰을 삭제하도록 안내
    res.json({
      success: true,
      data: null,
      message: '로그아웃이 완료되었습니다. 클라이언트에서 토큰을 삭제해주세요.'
    });

  } catch (error) {
    console.error('❌ 로그아웃 API 오류:', {
      error: error.message,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '로그아웃 처리 중 오류가 발생했습니다.'
    });
  }
});

/**
 * 사용자 정보 조회 API
 * @route GET /api/auth/me
 * @description 현재 로그인한 사용자의 정보 조회
 * @access Private (JWT 토큰 필요)
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // JWT에서 추출한 사용자 정보 반환
    const userInfo = {
      employeeId: req.user.employeeId,
      employeeCode: req.user.employeeCode,
      email: req.user.email,
      role: req.user.role,
      departmentId: req.user.departmentId,
      companyId: req.user.companyId,
      tokenIssuedAt: new Date(req.user.iat * 1000),
      tokenExpiresAt: new Date(req.user.exp * 1000)
    };

    res.json({
      success: true,
      data: userInfo,
      message: '사용자 정보 조회가 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ 사용자 정보 조회 API 오류:', {
      error: error.message,
      user: req.user,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      data: null,
      message: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
});

module.exports = router;