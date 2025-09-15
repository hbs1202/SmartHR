/**
 * bcrypt 암호화 유틸리티
 * @description 비밀번호 해싱 및 검증 유틸리티
 * @author SmartHR Team
 * @date 2024-09-12
 */

const bcrypt = require('bcryptjs');

// 환경변수에서 salt rounds 가져오기 (기본값: 10)
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;

/**
 * 비밀번호 해싱
 * @param {string} password - 평문 비밀번호
 * @returns {Promise<string>} 해싱된 비밀번호
 */
const hashPassword = async (password) => {
  try {
    if (!password) {
      throw new Error('비밀번호가 제공되지 않았습니다.');
    }
    
    console.log('🔄 비밀번호 해싱 시작...');
    const startTime = Date.now();
    
    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const hashingTime = Date.now() - startTime;
    console.log(`✅ 비밀번호 해싱 완료 (${hashingTime}ms)`);
    
    return hashedPassword;
    
  } catch (error) {
    console.error('❌ 비밀번호 해싱 오류:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    throw new Error('비밀번호 해싱에 실패했습니다.');
  }
};

/**
 * 비밀번호 검증
 * @param {string} password - 평문 비밀번호
 * @param {string} hashedPassword - 해싱된 비밀번호
 * @returns {Promise<boolean>} 검증 결과
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    if (!password || !hashedPassword) {
      console.warn('⚠️ 비밀번호 또는 해싱된 비밀번호가 제공되지 않았습니다.');
      return false;
    }
    
    console.log('🔄 비밀번호 검증 시작...');
    const startTime = Date.now();
    
    // 비밀번호 비교
    const isMatch = await bcrypt.compare(password, hashedPassword);
    
    const verifyTime = Date.now() - startTime;
    console.log(`✅ 비밀번호 검증 완료: ${isMatch ? '일치' : '불일치'} (${verifyTime}ms)`);
    
    return isMatch;
    
  } catch (error) {
    console.error('❌ 비밀번호 검증 오류:', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    // 보안상 false 반환
    return false;
  }
};

/**
 * 비밀번호 강도 검증
 * @param {string} password - 평문 비밀번호
 * @returns {Object} 검증 결과
 */
const validatePasswordStrength = (password) => {
  try {
    const result = {
      isValid: false,
      score: 0,
      feedback: [],
      requirements: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false
      }
    };
    
    if (!password) {
      result.feedback.push('비밀번호를 입력해주세요.');
      return result;
    }
    
    // 최소 길이 검증 (8자 이상)
    if (password.length >= 8) {
      result.requirements.minLength = true;
      result.score += 20;
    } else {
      result.feedback.push('비밀번호는 최소 8자 이상이어야 합니다.');
    }
    
    // 대문자 포함 검증
    if (/[A-Z]/.test(password)) {
      result.requirements.hasUppercase = true;
      result.score += 20;
    } else {
      result.feedback.push('대문자를 최소 1개 이상 포함해야 합니다.');
    }
    
    // 소문자 포함 검증
    if (/[a-z]/.test(password)) {
      result.requirements.hasLowercase = true;
      result.score += 20;
    } else {
      result.feedback.push('소문자를 최소 1개 이상 포함해야 합니다.');
    }
    
    // 숫자 포함 검증
    if (/[0-9]/.test(password)) {
      result.requirements.hasNumber = true;
      result.score += 20;
    } else {
      result.feedback.push('숫자를 최소 1개 이상 포함해야 합니다.');
    }
    
    // 특수문자 포함 검증
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
      result.requirements.hasSpecialChar = true;
      result.score += 20;
    } else {
      result.feedback.push('특수문자를 최소 1개 이상 포함해야 합니다.');
    }
    
    // 전체 검증 완료
    result.isValid = result.score === 100;
    
    // 점수별 피드백
    if (result.score >= 80) {
      result.strength = '강함';
    } else if (result.score >= 60) {
      result.strength = '보통';
    } else {
      result.strength = '약함';
    }
    
    return result;
    
  } catch (error) {
    console.error('비밀번호 강도 검증 오류:', error);
    
    return {
      isValid: false,
      score: 0,
      feedback: ['비밀번호 검증 중 오류가 발생했습니다.'],
      requirements: {
        minLength: false,
        hasUppercase: false,
        hasLowercase: false,
        hasNumber: false,
        hasSpecialChar: false
      }
    };
  }
};

/**
 * 임시 비밀번호 생성
 * @param {number} length - 비밀번호 길이 (기본: 12)
 * @returns {string} 생성된 임시 비밀번호
 */
const generateTemporaryPassword = (length = 12) => {
  try {
    const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
    const numberChars = '0123456789';
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    // 각 타입에서 최소 1개씩 선택
    let password = '';
    password += uppercaseChars[Math.floor(Math.random() * uppercaseChars.length)];
    password += lowercaseChars[Math.floor(Math.random() * lowercaseChars.length)];
    password += numberChars[Math.floor(Math.random() * numberChars.length)];
    password += specialChars[Math.floor(Math.random() * specialChars.length)];
    
    // 나머지 길이만큼 무작위 문자 추가
    const allChars = uppercaseChars + lowercaseChars + numberChars + specialChars;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // 문자 순서 섞기
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    console.log('✅ 임시 비밀번호 생성 완료');
    
    return password;
    
  } catch (error) {
    console.error('임시 비밀번호 생성 오류:', error);
    throw new Error('임시 비밀번호 생성에 실패했습니다.');
  }
};

/**
 * bcrypt 해시 검증 (해시가 유효한지 확인)
 * @param {string} hash - 검증할 해시
 * @returns {boolean} 유효한 bcrypt 해시 여부
 */
const isValidBcryptHash = (hash) => {
  try {
    // bcrypt 해시 패턴: $2a$, $2b$, $2x$, $2y$ 등으로 시작
    const bcryptPattern = /^\$2[abxy]?\$\d{2}\$.{53}$/;
    return bcryptPattern.test(hash);
  } catch (error) {
    console.error('bcrypt 해시 검증 오류:', error);
    return false;
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
  generateTemporaryPassword,
  isValidBcryptHash,
  SALT_ROUNDS
};