/**
 * JWT 유틸리티 함수
 * @description JWT 토큰 생성, 검증, 디코딩 유틸리티
 * @author SmartHR Team
 * @date 2024-09-12
 */

const jwt = require('jsonwebtoken');

/**
 * JWT 토큰 생성
 * @param {Object} payload - 토큰에 포함할 데이터
 * @param {string} expiresIn - 만료시간 (기본: process.env.JWT_EXPIRES_IN)
 * @returns {string} JWT 토큰
 */
const generateToken = (payload, expiresIn = null) => {
  try {
    const options = {
      expiresIn: expiresIn || process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'SmartHR-System'
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, options);
    
    console.log('JWT 토큰 생성 완료:', {
      employeeId: payload.employeeId,
      employeeCode: payload.employeeCode,
      expiresIn: options.expiresIn,
      timestamp: new Date().toISOString()
    });
    
    return token;
    
  } catch (error) {
    console.error('JWT 토큰 생성 오류:', error);
    throw new Error('토큰 생성에 실패했습니다.');
  }
};

/**
 * 리프레시 토큰 생성
 * @param {Object} payload - 토큰에 포함할 데이터
 * @returns {string} 리프레시 토큰
 */
const generateRefreshToken = (payload) => {
  try {
    const options = {
      expiresIn: '7d', // 7일
      issuer: 'SmartHR-System'
    };
    
    // 리프레시 토큰에는 최소한의 정보만 포함
    const refreshPayload = {
      employeeId: payload.employeeId,
      tokenType: 'refresh'
    };
    
    const refreshToken = jwt.sign(refreshPayload, process.env.JWT_SECRET, options);
    
    console.log('리프레시 토큰 생성 완료:', {
      employeeId: payload.employeeId,
      timestamp: new Date().toISOString()
    });
    
    return refreshToken;
    
  } catch (error) {
    console.error('리프레시 토큰 생성 오류:', error);
    throw new Error('리프레시 토큰 생성에 실패했습니다.');
  }
};

/**
 * JWT 토큰 검증
 * @param {string} token - 검증할 토큰
 * @returns {Object} 디코딩된 토큰 데이터
 */
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    console.log('JWT 토큰 검증 성공:', {
      employeeId: decoded.employeeId,
      timestamp: new Date().toISOString()
    });
    
    return decoded;
    
  } catch (error) {
    console.error('JWT 토큰 검증 실패:', {
      error: error.message,
      token: token.substring(0, 20) + '...',
      timestamp: new Date().toISOString()
    });
    
    if (error.name === 'TokenExpiredError') {
      throw new Error('토큰이 만료되었습니다.');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('유효하지 않은 토큰입니다.');
    } else {
      throw new Error('토큰 검증에 실패했습니다.');
    }
  }
};

/**
 * JWT 토큰 디코딩 (검증 없이)
 * @param {string} token - 디코딩할 토큰
 * @returns {Object} 디코딩된 토큰 데이터
 */
const decodeToken = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    return decoded;
  } catch (error) {
    console.error('JWT 토큰 디코딩 오류:', error);
    return null;
  }
};

/**
 * 토큰 만료 시간 확인
 * @param {string} token - 확인할 토큰
 * @returns {Object} 만료 정보
 */
const checkTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);
    
    if (!decoded || !decoded.payload.exp) {
      return {
        isValid: false,
        message: '토큰이 유효하지 않습니다.'
      };
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = decoded.payload.exp;
    const timeUntilExpiry = expirationTime - currentTime;
    
    if (timeUntilExpiry <= 0) {
      return {
        isValid: false,
        isExpired: true,
        message: '토큰이 만료되었습니다.'
      };
    }
    
    return {
      isValid: true,
      isExpired: false,
      timeUntilExpiry: timeUntilExpiry,
      expirationDate: new Date(expirationTime * 1000),
      message: '토큰이 유효합니다.'
    };
    
  } catch (error) {
    console.error('토큰 만료 시간 확인 오류:', error);
    return {
      isValid: false,
      message: '토큰 검증 중 오류가 발생했습니다.'
    };
  }
};

/**
 * 토큰에서 사용자 ID 추출
 * @param {string} token - JWT 토큰
 * @returns {number|null} 사용자 ID
 */
const extractEmployeeId = (token) => {
  try {
    const decoded = decodeToken(token);
    return decoded?.payload?.employeeId || null;
  } catch (error) {
    console.error('사용자 ID 추출 오류:', error);
    return null;
  }
};

/**
 * 토큰 갱신이 필요한지 확인
 * @param {string} token - 확인할 토큰
 * @param {number} refreshThreshold - 갱신 임계값 (초, 기본: 3600 = 1시간)
 * @returns {boolean} 갱신 필요 여부
 */
const shouldRefreshToken = (token, refreshThreshold = 3600) => {
  try {
    const expirationInfo = checkTokenExpiration(token);
    
    if (!expirationInfo.isValid) {
      return false; // 유효하지 않은 토큰은 갱신 불가
    }
    
    return expirationInfo.timeUntilExpiry <= refreshThreshold;
    
  } catch (error) {
    console.error('토큰 갱신 필요성 확인 오류:', error);
    return false;
  }
};

/**
 * 표준 토큰 페이로드 생성
 * @param {Object} userData - 사용자 데이터
 * @returns {Object} 토큰 페이로드
 */
const createTokenPayload = (userData) => {
  return {
    employeeId: userData.employeeId,
    employeeCode: userData.employeeCode,
    email: userData.email,
    role: userData.role,
    departmentId: userData.departmentId,
    firstName: userData.firstName,
    lastName: userData.lastName
  };
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  decodeToken,
  checkTokenExpiration,
  extractEmployeeId,
  shouldRefreshToken,
  createTokenPayload
};