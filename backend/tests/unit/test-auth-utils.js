/**
 * 인증 유틸리티 테스트 스크립트
 * @description JWT, bcrypt 기능 테스트
 * @author SmartHR Team
 * @date 2024-09-12
 */

require('dotenv').config();
const { 
  generateToken, 
  generateRefreshToken,
  verifyToken, 
  checkTokenExpiration,
  createTokenPayload
} = require('../src/utils/jwt');

const { 
  hashPassword, 
  comparePassword, 
  validatePasswordStrength,
  generateTemporaryPassword
} = require('../src/utils/bcrypt');

/**
 * JWT 토큰 관련 기능 테스트
 */
const testJWTFunctions = async () => {
  console.log('==========================================');
  console.log('🔐 JWT 토큰 기능 테스트');
  console.log('==========================================');
  
  try {
    // 1. 토큰 페이로드 생성 테스트
    console.log('1️⃣ 토큰 페이로드 생성 테스트...');
    const userData = {
      employeeId: 1,
      employeeCode: 'EMP001',
      email: 'test@smarthr.com',
      role: 'employee',
      departmentId: 1,
      firstName: '홍길동',
      lastName: '홍'
    };
    
    const payload = createTokenPayload(userData);
    console.log('✅ 토큰 페이로드 생성 성공:', payload);
    
    // 2. 액세스 토큰 생성 테스트
    console.log('\n2️⃣ 액세스 토큰 생성 테스트...');
    const accessToken = generateToken(payload, '1h');
    console.log('✅ 액세스 토큰 생성 성공');
    console.log('📝 토큰:', accessToken.substring(0, 50) + '...');
    
    // 3. 리프레시 토큰 생성 테스트
    console.log('\n3️⃣ 리프레시 토큰 생성 테스트...');
    const refreshToken = generateRefreshToken(payload);
    console.log('✅ 리프레시 토큰 생성 성공');
    console.log('📝 토큰:', refreshToken.substring(0, 50) + '...');
    
    // 4. 토큰 검증 테스트
    console.log('\n4️⃣ 토큰 검증 테스트...');
    const decoded = verifyToken(accessToken);
    console.log('✅ 토큰 검증 성공');
    console.log('📊 디코딩된 정보:', {
      employeeId: decoded.employeeId,
      employeeCode: decoded.employeeCode,
      email: decoded.email,
      exp: new Date(decoded.exp * 1000).toLocaleString()
    });
    
    // 5. 토큰 만료 확인 테스트
    console.log('\n5️⃣ 토큰 만료 확인 테스트...');
    const expirationInfo = checkTokenExpiration(accessToken);
    console.log('✅ 토큰 만료 확인 성공');
    console.log('📊 만료 정보:', {
      isValid: expirationInfo.isValid,
      timeUntilExpiry: Math.floor(expirationInfo.timeUntilExpiry / 60) + '분',
      expirationDate: expirationInfo.expirationDate?.toLocaleString()
    });
    
  } catch (error) {
    console.error('❌ JWT 기능 테스트 실패:', error.message);
  }
};

/**
 * bcrypt 비밀번호 관련 기능 테스트
 */
const testBcryptFunctions = async () => {
  console.log('\n==========================================');
  console.log('🔒 bcrypt 비밀번호 기능 테스트');
  console.log('==========================================');
  
  try {
    const testPassword = 'TestPassword123!';
    
    // 1. 비밀번호 강도 검증 테스트
    console.log('1️⃣ 비밀번호 강도 검증 테스트...');
    const strengthResult = validatePasswordStrength(testPassword);
    console.log('✅ 비밀번호 강도 검증 성공');
    console.log('📊 검증 결과:', {
      isValid: strengthResult.isValid,
      score: strengthResult.score,
      strength: strengthResult.strength,
      requirements: strengthResult.requirements
    });
    
    // 2. 비밀번호 해싱 테스트
    console.log('\n2️⃣ 비밀번호 해싱 테스트...');
    const hashedPassword = await hashPassword(testPassword);
    console.log('✅ 비밀번호 해싱 성공');
    console.log('📝 해시:', hashedPassword.substring(0, 30) + '...');
    
    // 3. 비밀번호 검증 테스트 (올바른 비밀번호)
    console.log('\n3️⃣ 비밀번호 검증 테스트 (올바른 비밀번호)...');
    const isValidPassword = await comparePassword(testPassword, hashedPassword);
    console.log('✅ 비밀번호 검증 성공:', isValidPassword ? '일치' : '불일치');
    
    // 4. 비밀번호 검증 테스트 (잘못된 비밀번호)
    console.log('\n4️⃣ 비밀번호 검증 테스트 (잘못된 비밀번호)...');
    const isInvalidPassword = await comparePassword('WrongPassword123!', hashedPassword);
    console.log('✅ 잘못된 비밀번호 검증:', isInvalidPassword ? '일치' : '불일치');
    
    // 5. 임시 비밀번호 생성 테스트
    console.log('\n5️⃣ 임시 비밀번호 생성 테스트...');
    const tempPassword = generateTemporaryPassword(12);
    console.log('✅ 임시 비밀번호 생성 성공');
    console.log('📝 임시 비밀번호:', tempPassword);
    
    // 생성된 임시 비밀번호 강도 확인
    const tempStrength = validatePasswordStrength(tempPassword);
    console.log('📊 임시 비밀번호 강도:', {
      isValid: tempStrength.isValid,
      score: tempStrength.score,
      strength: tempStrength.strength
    });
    
  } catch (error) {
    console.error('❌ bcrypt 기능 테스트 실패:', error.message);
  }
};

/**
 * 전체 인증 시스템 통합 테스트
 */
const testIntegratedAuth = async () => {
  console.log('\n==========================================');
  console.log('🔄 통합 인증 시스템 테스트');
  console.log('==========================================');
  
  try {
    // 회원가입 시나리오 시뮬레이션
    console.log('1️⃣ 회원가입 시나리오 시뮬레이션...');
    
    const newUser = {
      employeeId: 999,
      employeeCode: 'TEST999',
      email: 'test999@smarthr.com',
      role: 'employee',
      departmentId: 1,
      firstName: '테스트',
      lastName: '사용자'
    };
    
    const plainPassword = 'NewUser2024!';
    
    // 비밀번호 강도 확인
    const strength = validatePasswordStrength(plainPassword);
    if (!strength.isValid) {
      console.log('❌ 비밀번호 강도 부족:', strength.feedback);
      return;
    }
    
    // 비밀번호 해싱
    const hashedPassword = await hashPassword(plainPassword);
    console.log('✅ 사용자 비밀번호 해싱 완료');
    
    // 토큰 생성
    const payload = createTokenPayload(newUser);
    const accessToken = generateToken(payload, '15m');
    const refreshToken = generateRefreshToken(payload);
    
    console.log('✅ 회원가입 프로세스 완료');
    
    // 로그인 시나리오 시뮬레이션
    console.log('\n2️⃣ 로그인 시나리오 시뮬레이션...');
    
    // 비밀번호 검증
    const isPasswordValid = await comparePassword(plainPassword, hashedPassword);
    if (!isPasswordValid) {
      console.log('❌ 비밀번호 불일치');
      return;
    }
    
    // 토큰 검증
    const decodedToken = verifyToken(accessToken);
    console.log('✅ 로그인 인증 성공');
    console.log('📊 인증된 사용자:', {
      employeeId: decodedToken.employeeId,
      employeeCode: decodedToken.employeeCode,
      email: decodedToken.email
    });
    
    console.log('\n✅ 통합 인증 시스템 테스트 완료');
    
  } catch (error) {
    console.error('❌ 통합 인증 시스템 테스트 실패:', error.message);
  }
};

/**
 * 전체 테스트 실행
 */
const runAllTests = async () => {
  console.log('🚀 SmartHR 인증 유틸리티 테스트 시작\n');
  
  await testJWTFunctions();
  await testBcryptFunctions();
  await testIntegratedAuth();
  
  console.log('\n==========================================');
  console.log('🎉 모든 인증 유틸리티 테스트 완료');
  console.log('==========================================');
  
  process.exit(0);
};

// 테스트 실행
runAllTests();