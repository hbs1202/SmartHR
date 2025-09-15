/**
 * 데이터베이스 헬퍼 함수
 * @description Stored Procedure 실행 및 DB 연결 관리
 * @author SmartHR Team
 * @date 2024-09-12
 */

const sql = require('mssql');
const { dbConfig } = require('../../config/database');

// 연결 풀 인스턴스
let pool = null;

/**
 * 데이터베이스 연결 풀 초기화
 * @returns {Promise<Object>} 연결 풀 객체
 */
const initializePool = async () => {
  try {
    if (!pool) {
      console.log('🔄 데이터베이스 연결 풀을 초기화하는 중...');
      pool = await sql.connect(dbConfig);
      console.log('✅ 데이터베이스 연결 풀이 성공적으로 초기화되었습니다.');
    }
    return pool;
  } catch (error) {
    console.error('❌ 데이터베이스 연결 풀 초기화 실패:', error);
    throw error;
  }
};

/**
 * 연결 풀 상태 확인
 * @returns {boolean} 연결 상태
 */
const isPoolConnected = () => {
  return pool && pool.connected;
};

/**
 * 이름있는 파라미터로 Stored Procedure 실행
 * @param {string} procedureName - SP 이름
 * @param {Object} inputParams - 입력 파라미터 객체 {paramName: value}
 * @param {Object} outputParams - 출력 파라미터 정의 {paramName: sqlType}
 * @returns {Promise<Object>} 실행 결과
 */
const executeStoredProcedureWithNamedParams = async (procedureName, inputParams = {}, outputParams = {}) => {
  let request = null;
  
  try {
    // 연결 풀 확인 및 초기화
    if (!isPoolConnected()) {
      await initializePool();
    }

    request = pool.request();
    console.log(`🔄 Stored Procedure 실행 중: ${procedureName}`);
    
    // Input 파라미터 추가
    Object.entries(inputParams).forEach(([paramName, paramValue]) => {
      // 파라미터 타입 자동 감지 및 추가
      if (paramValue === null || paramValue === undefined) {
        request.input(paramName, sql.NVarChar, paramValue);
      } else if (typeof paramValue === 'string') {
        request.input(paramName, sql.NVarChar, paramValue);
      } else if (typeof paramValue === 'number') {
        if (Number.isInteger(paramValue)) {
          request.input(paramName, sql.Int, paramValue);
        } else {
          request.input(paramName, sql.Decimal(15, 2), paramValue);
        }
      } else if (typeof paramValue === 'boolean') {
        request.input(paramName, sql.Bit, paramValue ? 1 : 0);
      } else if (paramValue instanceof Date) {
        request.input(paramName, sql.DateTime, paramValue);
      } else {
        // 기본적으로 문자열로 처리
        request.input(paramName, sql.NVarChar, String(paramValue));
      }
    });

    // 기본 Output 파라미터 추가
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));
    
    // 추가 Output 파라미터
    Object.entries(outputParams).forEach(([paramName, sqlType]) => {
      request.output(paramName, sqlType);
    });

    // SP 실행
    const result = await request.execute(procedureName);
    
    console.log(`✅ SP 실행 완료: ${procedureName}`);
    
    return {
      ResultCode: result.output.ResultCode,
      Message: result.output.Message,
      data: result.recordset,
      output: result.output,
      returnValue: result.returnValue
    };

  } catch (error) {
    console.error(`❌ SP 실행 오류 [${procedureName}]:`, {
      error: error.message,
      procedure: procedureName,
      inputParams: inputParams,
      timestamp: new Date().toISOString()
    });
    
    throw new Error(`데이터베이스 오류가 발생했습니다: ${error.message}`);
  }
};

/**
 * Stored Procedure 실행 헬퍼 함수 (기존 호환성 유지)
 * @param {string} procedureName - SP 이름
 * @param {Array} parameters - 파라미터 배열
 * @param {Object} outputParams - Output 파라미터 정의 (선택사항)
 * @returns {Promise<Object>} 실행 결과
 */
const executeStoredProcedure = async (procedureName, parameters = [], outputParams = {}) => {
  let request = null;
  
  try {
    // 연결 풀 확인 및 초기화
    if (!isPoolConnected()) {
      await initializePool();
    }

    request = pool.request();
    
    // Input 파라미터 추가
    parameters.forEach((param, index) => {
      const paramName = `param${index + 1}`;
      
      // 파라미터 타입 자동 감지
      if (param === null || param === undefined) {
        request.input(paramName, sql.NVarChar, param);
      } else if (typeof param === 'string') {
        request.input(paramName, sql.NVarChar, param);
      } else if (typeof param === 'number') {
        if (Number.isInteger(param)) {
          request.input(paramName, sql.Int, param);
        } else {
          request.input(paramName, sql.Float, param);
        }
      } else if (param instanceof Date) {
        request.input(paramName, sql.DateTime, param);
      } else if (typeof param === 'boolean') {
        request.input(paramName, sql.Bit, param);
      } else {
        request.input(paramName, sql.NVarChar, JSON.stringify(param));
      }
    });
    
    // 기본 Output 파라미터 추가
    request.output('ResultCode', sql.Int);
    request.output('Message', sql.NVarChar(500));
    
    // 추가 Output 파라미터가 있으면 추가
    Object.entries(outputParams).forEach(([name, type]) => {
      request.output(name, type);
    });
    
    // SP 실행
    console.log(`🔄 Stored Procedure 실행 중: ${procedureName}`);
    const startTime = Date.now();
    const result = await request.execute(procedureName);
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ SP 실행 완료: ${procedureName} (${executionTime}ms)`);
    
    // 결과 반환
    const response = {
      ResultCode: result.output.ResultCode || 0,
      Message: result.output.Message || '성공적으로 처리되었습니다.',
      data: result.recordset,
      executionTime,
      rowsAffected: result.rowsAffected
    };
    
    // 추가 Output 파라미터가 있으면 포함
    Object.keys(outputParams).forEach(name => {
      response[name] = result.output[name];
    });
    
    return response;
    
  } catch (error) {
    console.error(`❌ SP 실행 오류 [${procedureName}]:`, {
      error: error.message,
      procedure: procedureName,
      parameters: parameters,
      timestamp: new Date().toISOString()
    });
    
    // SQL Server 특정 오류 처리
    if (error.number) {
      switch (error.number) {
        case 2: // Timeout
          throw new Error('데이터베이스 연결 시간이 초과되었습니다.');
        case 18456: // Login failed
          throw new Error('데이터베이스 인증에 실패했습니다.');
        case 208: // Invalid object name
          throw new Error(`Stored Procedure '${procedureName}'을(를) 찾을 수 없습니다.`);
        default:
          throw new Error(`데이터베이스 오류가 발생했습니다: ${error.message}`);
      }
    }
    
    throw error;
  }
};

/**
 * 단순 쿼리 실행 (개발/디버깅 용도)
 * @param {string} query - SQL 쿼리
 * @returns {Promise<Object>} 쿼리 결과
 */
const executeQuery = async (query) => {
  let request = null;
  
  try {
    // 연결 풀 확인 및 초기화
    if (!isPoolConnected()) {
      await initializePool();
    }

    request = pool.request();
    
    console.log('🔄 쿼리 실행 중...');
    const startTime = Date.now();
    const result = await request.query(query);
    const executionTime = Date.now() - startTime;
    
    console.log(`✅ 쿼리 실행 완료 (${executionTime}ms)`);
    
    return {
      data: result.recordset,
      executionTime,
      rowsAffected: result.rowsAffected
    };
    
  } catch (error) {
    console.error('❌ 쿼리 실행 오류:', {
      error: error.message,
      query: query,
      timestamp: new Date().toISOString()
    });
    
    throw error;
  }
};

/**
 * 트랜잭션 실행
 * @param {Function} transactionCallback - 트랜잭션 내에서 실행할 함수
 * @returns {Promise<Object>} 트랜잭션 결과
 */
const executeTransaction = async (transactionCallback) => {
  let transaction = null;
  
  try {
    // 연결 풀 확인 및 초기화
    if (!isPoolConnected()) {
      await initializePool();
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    console.log('🔄 트랜잭션 시작');
    
    const result = await transactionCallback(transaction);
    
    await transaction.commit();
    console.log('✅ 트랜잭션 커밋 완료');
    
    return result;
    
  } catch (error) {
    console.error('❌ 트랜잭션 오류:', error);
    
    if (transaction) {
      try {
        await transaction.rollback();
        console.log('🔄 트랜잭션 롤백 완료');
      } catch (rollbackError) {
        console.error('❌ 트랜잭션 롤백 오류:', rollbackError);
      }
    }
    
    throw error;
  }
};

/**
 * 연결 풀 종료
 */
const closePool = async () => {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log('✅ 데이터베이스 연결 풀이 종료되었습니다.');
    }
  } catch (error) {
    console.error('❌ 연결 풀 종료 오류:', error);
  }
};

// Graceful shutdown 시 연결 풀 정리
process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);

module.exports = {
  initializePool,
  isPoolConnected,
  executeStoredProcedure,
  executeStoredProcedureWithNamedParams,
  executeQuery,
  executeTransaction,
  closePool
};