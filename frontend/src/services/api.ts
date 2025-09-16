/**
 * API 서비스 클래스
 * @description Axios 기반 HTTP 클라이언트 및 인터셉터 설정
 * @author SmartHR Team
 * @date 2024-09-16
 */

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '../types/api';

class ApiService {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // 환경에 따른 API 베이스 URL 설정
    console.log('🔧 환경변수 확인:', {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      모든_환경변수: import.meta.env
    });
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('🚀 사용할 API URL:', this.baseURL);

    // Axios 인스턴스 생성
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10초 타임아웃
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 요청 인터셉터 설정
    this.setupRequestInterceptor();

    // 응답 인터셉터 설정
    this.setupResponseInterceptor();
  }

  /**
   * 요청 인터셉터 설정
   * @description JWT 토큰을 헤더에 자동 추가
   */
  private setupRequestInterceptor(): void {
    this.client.interceptors.request.use(
      (config) => {
        // 로컬 스토리지에서 액세스 토큰 가져오기
        const token = localStorage.getItem('accessToken');

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 요청 로깅 (개발 환경에서만)
        if (import.meta.env.DEV) {
          console.log('🚀 API 요청:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            data: config.data,
            timestamp: new Date().toISOString(),
          });
        }

        return config;
      },
      (error) => {
        console.error('❌ 요청 인터셉터 오류:', error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * 응답 인터셉터 설정
   * @description 토큰 만료 시 자동 갱신 및 에러 처리
   */
  private setupResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        // 응답 로깅 (개발 환경에서만)
        if (import.meta.env.DEV) {
          console.log('✅ API 응답:', {
            status: response.status,
            url: response.config.url,
            success: response.data.success,
            message: response.data.message,
            timestamp: new Date().toISOString(),
          });
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // 401 에러 (토큰 만료)이고 재시도하지 않은 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // 리프레시 토큰으로 새 액세스 토큰 발급
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
              const response = await this.client.post('/api/auth/refresh', {
                refreshToken,
              });

              if (response.data.success) {
                const newAccessToken = response.data.data.accessToken;
                localStorage.setItem('accessToken', newAccessToken);

                // 원래 요청 재시도
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return this.client(originalRequest);
              }
            }
          } catch (refreshError) {
            console.error('🔄 토큰 갱신 실패:', refreshError);

            // 토큰 갱신 실패 시 로그아웃 처리
            this.clearTokens();
            window.location.href = '/login';
          }
        }

        // 에러 로깅
        console.error('❌ API 에러:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
          timestamp: new Date().toISOString(),
        });

        return Promise.reject(error);
      }
    );
  }

  /**
   * GET 요청
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * POST 요청
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * PUT 요청
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * DELETE 요청
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  /**
   * 토큰 저장
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  /**
   * 토큰 제거
   */
  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }

  /**
   * 액세스 토큰 가져오기
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * 리프레시 토큰 가져오기
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * 로그인 상태 확인
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

// 싱글톤 인스턴스 생성
const apiService = new ApiService();

export default apiService;