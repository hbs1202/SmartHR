/**
 * 인증 서비스
 * @description 로그인, 로그아웃, 토큰 관리 등 인증 관련 기능
 * @author SmartHR Team
 * @date 2024-09-16
 */

import apiService from './api';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  User,
  ApiResponse
} from '../types/api';

class AuthService {
  /**
   * 로그인
   * @param credentials 로그인 정보 (이메일, 비밀번호)
   * @returns 로그인 결과 및 토큰 정보
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await apiService.post<LoginResponse>('/api/auth/login', credentials);

      if (response.success && response.data) {
        // 토큰 저장
        apiService.setTokens(response.data.accessToken, response.data.refreshToken);

        // 사용자 정보 저장
        this.setUserInfo(response.data.user);

        console.log('✅ 로그인 성공:', {
          email: credentials.email,
          employeeId: response.data.user.employeeId,
          timestamp: new Date().toISOString(),
        });
      }

      return response;
    } catch (error: unknown) {
      console.error('❌ 로그인 실패:', error);
      throw error;
    }
  }

  /**
   * 로그아웃
   * @returns 로그아웃 결과
   */
  async logout(): Promise<ApiResponse> {
    try {
      // 서버에 로그아웃 요청 (선택적)
      const response = await apiService.post('/api/auth/logout');

      // 로컬 데이터 정리
      this.clearAuthData();

      console.log('✅ 로그아웃 완료');

      return response;
    } catch (error: unknown) {
      console.error('❌ 로그아웃 중 오류:', error);

      // 서버 요청 실패해도 로컬 데이터는 정리
      this.clearAuthData();

      throw error;
    }
  }

  /**
   * 토큰 갱신
   * @returns 새로운 액세스 토큰
   */
  async refreshToken(): Promise<ApiResponse<RefreshTokenResponse>> {
    try {
      const refreshToken = apiService.getRefreshToken();

      if (!refreshToken) {
        throw new Error('리프레시 토큰이 없습니다.');
      }

      const response = await apiService.post<RefreshTokenResponse>('/api/auth/refresh', {
        refreshToken,
      });

      if (response.success && response.data) {
        // 새로운 액세스 토큰 저장
        localStorage.setItem('accessToken', response.data.accessToken);

        console.log('✅ 토큰 갱신 성공');
      }

      return response;
    } catch (error: unknown) {
      console.error('❌ 토큰 갱신 실패:', error);

      // 토큰 갱신 실패 시 로그아웃 처리
      this.clearAuthData();

      throw error;
    }
  }

  /**
   * 현재 사용자 정보 조회
   * @returns 사용자 정보
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      const response = await apiService.get<User>('/api/auth/me');

      if (response.success && response.data) {
        // 사용자 정보 업데이트
        this.setUserInfo(response.data);
      }

      return response;
    } catch (error: unknown) {
      console.error('❌ 사용자 정보 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 사용자 정보 저장
   * @param user 사용자 정보
   */
  private setUserInfo(user: User): void {
    localStorage.setItem('userInfo', JSON.stringify(user));
  }

  /**
   * 사용자 정보 가져오기
   * @returns 저장된 사용자 정보
   */
  getUserInfo(): User | null {
    try {
      const userInfo = localStorage.getItem('userInfo');
      return userInfo ? JSON.parse(userInfo) : null;
    } catch (error) {
      console.error('❌ 사용자 정보 파싱 오류:', error);
      return null;
    }
  }

  /**
   * 액세스 토큰 가져오기
   * @returns 액세스 토큰
   */
  getAccessToken(): string | null {
    return apiService.getAccessToken();
  }

  /**
   * 리프레시 토큰 가져오기
   * @returns 리프레시 토큰
   */
  getRefreshToken(): string | null {
    return apiService.getRefreshToken();
  }

  /**
   * 인증 데이터 모두 제거
   */
  private clearAuthData(): void {
    apiService.clearTokens();
    localStorage.removeItem('userInfo');
  }

  /**
   * 로그인 상태 확인
   * @returns 로그인 여부
   */
  isAuthenticated(): boolean {
    return apiService.isAuthenticated() && !!this.getUserInfo();
  }

  /**
   * 이메일 형식 검증
   * @param email 이메일 주소
   * @returns 유효성 여부
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 비밀번호 형식 검증
   * @param password 비밀번호
   * @returns 유효성 여부 및 오류 메시지
   */
  validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password) {
      return { isValid: false, message: '비밀번호를 입력해주세요.' };
    }

    if (password.length < 6) {
      return { isValid: false, message: '비밀번호는 최소 6자 이상이어야 합니다.' };
    }

    return { isValid: true };
  }

  /**
   * 로그인 폼 검증
   * @param credentials 로그인 정보
   * @returns 검증 결과
   */
  validateLoginForm(credentials: LoginRequest): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!credentials.email) {
      errors.push('이메일을 입력해주세요.');
    } else if (!this.validateEmail(credentials.email)) {
      errors.push('유효한 이메일 주소를 입력해주세요.');
    }

    const passwordValidation = this.validatePassword(credentials.password);
    if (!passwordValidation.isValid) {
      errors.push(passwordValidation.message!);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// 싱글톤 인스턴스 생성
const authService = new AuthService();

export default authService;