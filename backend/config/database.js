/**
 * 데이터베이스 설정 파일
 * @description MS SQL Server 연결 설정 및 구성
 * @author SmartHR Team
 * @date 2024-09-12
 */

require('dotenv').config();

/**
 * MS SQL Server 데이터베이스 연결 설정
 */
const dbConfig = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'hr_system',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true' || true, // SQL Azure의 경우 true
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true' || true, // 개발 환경에서 true
    enableArithAbort: true,
    requestTimeout: 30000, // 30초 타임아웃
    connectionTimeout: 30000, // 30초 연결 타임아웃
  },
  pool: {
    max: 10, // 최대 연결 수
    min: 0,  // 최소 연결 수
    idleTimeoutMillis: 30000 // 유휴 연결 타임아웃 (30초)
  }
};

/**
 * 데이터베이스 설정 검증
 */
const validateConfig = () => {
  const requiredFields = ['server', 'database', 'user', 'password'];
  const missingFields = requiredFields.filter(field => !dbConfig[field]);
  
  if (missingFields.length > 0) {
    console.error('❌ 데이터베이스 설정 오류: 다음 필수 필드가 누락되었습니다:', missingFields);
    process.exit(1);
  }
  
  console.log('✅ 데이터베이스 설정 검증 완료');
};

module.exports = {
  dbConfig,
  validateConfig
};