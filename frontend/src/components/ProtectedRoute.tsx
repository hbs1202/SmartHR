/**
 * 보호된 라우트 컴포넌트
 * @description 인증이 필요한 페이지를 보호하는 라우트 래퍼
 * @author SmartHR Team
 * @date 2024-09-16
 */

import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import authService from '../services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  /**
   * 인증 상태 확인
   */
  const checkAuthentication = async () => {
    try {
      setIsLoading(true);

      // 기본 인증 상태 확인 (로컬 토큰 존재 여부)
      if (!authService.isAuthenticated()) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      // 서버에서 사용자 정보 재검증 (선택적)
      try {
        await authService.getCurrentUser();
        setIsAuthenticated(true);
      } catch (error) {
        console.warn('⚠️ 사용자 정보 재검증 실패, 로그아웃 처리');
        authService.logout();
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('❌ 인증 확인 오류:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 로딩 중일 때 스피너 표시
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" tip="인증 확인 중..." />
      </div>
    );
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // 인증된 경우 자식 컴포넌트 렌더링
  return <>{children}</>;
};

export default ProtectedRoute;