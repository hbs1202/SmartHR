/**
 * JWT 인증 미들웨어
 * @description JWT 토큰 검증 및 사용자 인증
 * @author SmartHR Team
 * @date 2024-09-12
 */

const jwt = require('jsonwebtoken');

/**
 * JWT 토큰 검증 미들웨어
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체  
 * @param {Function} next - 다음 미들웨어
 */
const authenticateToken = (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    // 토큰이 없는 경우
    if (!token) {
      return res.status(401).json({
        success: false,
        data: null,
        message: '인증 토큰이 필요합니다.'
      });
    }
    
    // JWT 토큰 검증
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT 토큰 검증 실패:', {
          error: err.message,
          token: token.substring(0, 20) + '...', // 보안을 위해 일부만 로깅
          timestamp: new Date().toISOString()
        });
        
        // 토큰 만료
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            data: null,
            message: '토큰이 만료되었습니다. 다시 로그인해주세요.'
          });
        }
        
        // 토큰 무효
        if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({
            success: false,
            data: null,
            message: '유효하지 않은 토큰입니다.'
          });
        }
        
        // 기타 JWT 오류
        return res.status(403).json({
          success: false,
          data: null,
          message: '토큰 검증에 실패했습니다.'
        });
      }
      
      // 검증된 사용자 정보를 요청 객체에 추가
      req.user = {
        employeeId: decoded.employeeId,
        employeeCode: decoded.employeeCode,
        email: decoded.email,
        role: decoded.role,
        departmentId: decoded.departmentId,
        iat: decoded.iat,
        exp: decoded.exp
      };
      
      console.log('JWT 토큰 검증 성공:', {
        employeeId: decoded.employeeId,
        employeeCode: decoded.employeeCode,
        timestamp: new Date().toISOString()
      });
      
      next();
    });
    
  } catch (error) {
    console.error('인증 미들웨어 오류:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    return res.status(500).json({
      success: false,
      data: null,
      message: '인증 처리 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 권한별 접근 제어 미들웨어
 * @param {Array} allowedRoles - 허용된 권한 배열
 * @returns {Function} 미들웨어 함수
 */
const authorizeRoles = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // 인증된 사용자 정보 확인
      if (!req.user) {
        return res.status(401).json({
          success: false,
          data: null,
          message: '인증이 필요합니다.'
        });
      }
      
      // 권한 확인
      const userRole = req.user.role;
      
      if (!allowedRoles.includes(userRole)) {
        console.warn('권한 없는 접근 시도:', {
          employeeId: req.user.employeeId,
          userRole: userRole,
          allowedRoles: allowedRoles,
          url: req.url,
          method: req.method,
          timestamp: new Date().toISOString()
        });
        
        return res.status(403).json({
          success: false,
          data: null,
          message: '이 기능에 대한 권한이 없습니다.'
        });
      }
      
      console.log('권한 검증 성공:', {
        employeeId: req.user.employeeId,
        userRole: userRole,
        url: req.url,
        timestamp: new Date().toISOString()
      });
      
      next();
      
    } catch (error) {
      console.error('권한 검증 오류:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({
        success: false,
        data: null,
        message: '권한 검증 중 오류가 발생했습니다.'
      });
    }
  };
};

/**
 * 본인 데이터 접근 권한 확인 미들웨어
 * @param {string} paramName - 확인할 파라미터명 (기본: 'employeeId')
 * @returns {Function} 미들웨어 함수
 */
const authorizeOwnData = (paramName = 'employeeId') => {
  return (req, res, next) => {
    try {
      // 인증된 사용자 정보 확인
      if (!req.user) {
        return res.status(401).json({
          success: false,
          data: null,
          message: '인증이 필요합니다.'
        });
      }
      
      // 관리자는 모든 데이터 접근 가능
      if (req.user.role === 'admin') {
        return next();
      }
      
      // 본인 데이터인지 확인
      const targetEmployeeId = req.params[paramName] || req.body[paramName];
      const currentEmployeeId = req.user.employeeId;
      
      if (parseInt(targetEmployeeId) !== parseInt(currentEmployeeId)) {
        console.warn('본인 데이터 외 접근 시도:', {
          currentEmployeeId: currentEmployeeId,
          targetEmployeeId: targetEmployeeId,
          url: req.url,
          method: req.method,
          timestamp: new Date().toISOString()
        });
        
        return res.status(403).json({
          success: false,
          data: null,
          message: '본인의 데이터만 접근할 수 있습니다.'
        });
      }
      
      next();
      
    } catch (error) {
      console.error('본인 데이터 접근 권한 검증 오류:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({
        success: false,
        data: null,
        message: '권한 검증 중 오류가 발생했습니다.'
      });
    }
  };
};

/**
 * 선택적 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
 * @param {Object} req - 요청 객체
 * @param {Object} res - 응답 객체
 * @param {Function} next - 다음 미들웨어
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // 토큰이 없으면 그냥 통과
    if (!token) {
      return next();
    }
    
    // 토큰이 있으면 검증
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = {
          employeeId: decoded.employeeId,
          employeeCode: decoded.employeeCode,
          email: decoded.email,
          role: decoded.role,
          departmentId: decoded.departmentId,
          iat: decoded.iat,
          exp: decoded.exp
        };
      }
      next(); // 오류가 있어도 통과
    });
    
  } catch (error) {
    console.error('선택적 인증 오류:', error);
    next(); // 오류가 있어도 통과
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authorizeOwnData,
  optionalAuth
};