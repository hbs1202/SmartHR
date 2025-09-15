/**
 * SmartHR 인사관리 시스템 메인 애플리케이션
 * @description Express 서버 설정 및 미들웨어 구성
 * @author SmartHR Team
 * @date 2024-09-12
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// 데이터베이스 설정 및 검증
const { validateConfig } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 데이터베이스 설정 검증
validateConfig();

/**
 * 보안 미들웨어 설정
 */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

/**
 * CORS 설정
 */
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3003'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

/**
 * Rate Limiting 설정
 */
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15분
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 요청 제한
  message: {
    success: false,
    data: null,
    message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

/**
 * 로깅 미들웨어
 */
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

/**
 * 요청 파싱 미들웨어
 */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * 루트 엔드포인트
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'SmartHR API Server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString()
    },
    message: 'SmartHR 인사관리 시스템 API 서버가 정상 작동 중입니다.'
  });
});

/**
 * 헬스체크 엔드포인트
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      version: process.version
    },
    message: '서버 상태가 정상입니다.'
  });
});

/**
 * API 라우터 등록
 */
// 인증 API
app.use('/api', require('./src/routes/auth'));

// 조직도 관리 API
app.use('/api/organization', require('./src/routes/organization'));

// 직원 관리 API
app.use('/api', require('./src/routes/employee'));

// 발령 관리 API
app.use('/api/assignments', require('./src/routes/assignments'));

// 전자결재 API
app.use('/api/approval', require('./src/controllers/approval-controller'));

// 휴가 관리 API (결재 연동)
app.use('/api/vacation', require('./src/controllers/vacation-controller'));

/**
 * 404 에러 처리
 */
app.use('*', (req, res) => {
  console.log(`🔍 404 오류: ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  console.log('🔍 Headers:', req.headers);

  res.status(404).json({
    success: false,
    data: null,
    message: '요청하신 API 엔드포인트를 찾을 수 없습니다.'
  });
});

/**
 * 전역 에러 처리 미들웨어
 */
app.use((err, req, res, next) => {
  console.error('전역 에러 발생:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // 개발 환경에서는 스택 트레이스 포함
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    data: null,
    message: err.message || '서버 내부 오류가 발생했습니다.',
    ...(isDevelopment && { stack: err.stack })
  });
});

/**
 * 서버 시작
 */
const server = app.listen(PORT, () => {
  console.log(`
  🚀 SmartHR API 서버가 시작되었습니다!
  
  📍 서버 주소: http://localhost:${PORT}
  🌍 환경: ${process.env.NODE_ENV || 'development'}
  📊 헬스체크: http://localhost:${PORT}/health
  
  ⚡ 서버가 준비되었습니다!
  `);
});

/**
 * Graceful shutdown 처리
 */
process.on('SIGTERM', () => {
  console.log('SIGTERM 신호를 받았습니다. 서버를 종료합니다...');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT 신호를 받았습니다. 서버를 종료합니다...');
  server.close(() => {
    console.log('서버가 정상적으로 종료되었습니다.');
    process.exit(0);
  });
});

module.exports = app;