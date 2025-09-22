/**
 * 직원 관리 API 서비스
 * @description 직원 조회, 검색, 통계 관련 API 통신
 * @author SmartHR Team
 * @date 2025-09-20
 */

import api from './api';
import type { ApiResponse } from '../types/api';

// 직원 정보 타입 (API 응답 구조에 맞게 camelCase 사용)
export interface Employee {
  employeeId: number;
  employeeCode: string;
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  nameEng?: string;
  gender?: 'M' | 'F';
  birthDate?: string;
  phoneNumber?: string;
  hireDate: string;
  retireDate?: string;
  employmentType: string;
  currentSalary?: number;
  userRole: 'admin' | 'manager' | 'employee';
  isActive: boolean;

  // 조직 정보
  companyName: string;
  subCompanyName: string;
  deptName: string;
  posName: string;

  // 메타 정보
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;

  // 계산 필드 (페이징 정보용)
  totalCount?: number;
  currentPage?: number;
  pageSize?: number;
  totalPages?: number;
}

// 직원 목록 응답 타입
export interface EmployeeListResponse {
  employees: Employee[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// 직원 통계 타입
export interface EmployeeStats {
  TotalEmployees: number;
  ActiveEmployees: number;
  InactiveEmployees: number;
  TotalDepartments: number;
  AvgCareerYears: number;
}

// 직원 목록 조회 파라미터
export interface EmployeeListParams {
  page?: number;
  limit?: number;
  companyId?: number;
  subCompanyId?: number;
  deptId?: number;
  posId?: number;
  employmentType?: string;
  userRole?: string;
  isActive?: boolean;
  searchTerm?: string;
}

// 직원 상세 조회 파라미터
export interface EmployeeDetailParams {
  includeSalary?: boolean;
  includePersonalInfo?: boolean;
}

// 직원 검색 파라미터
export interface EmployeeSearchParams {
  q: string;
  maxResults?: number;
  companyId?: number;
  deptId?: number;
}

// 직원 등록 요청 타입
export interface EmployeeCreateRequest {
  fullName: string;          // 사원명 통합 필드
  email: string;
  employeeCode: string;
  password: string;          // 백엔드 필수 필드 추가
  phoneNumber?: string;
  mobileNumber: string;
  socialSecurityNumber: string;
  postalCode: string;
  address: string;
  addressDetail?: string;
  hireDate: string;
  companyId: number;
  subCompanyId: number;
  deptId: number;
  posId: number;
  salary: number;
  salaryType: string;
  notes?: string;
  assignmentReason?: string;
  categoryId?: number;
  assignmentTypeId?: number;
  reasonId?: number;
}

/**
 * 직원 목록 조회
 * @param params 조회 파라미터
 * @returns 직원 목록 및 페이징 정보
 */
export const getEmployees = async (params: EmployeeListParams = {}): Promise<ApiResponse<EmployeeListResponse>> => {
  try {
    console.log('직원 목록 조회 요청:', params);

    const response = await api.get<EmployeeListResponse>('/api/employees', { params });

    console.log('직원 목록 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('직원 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 직원 상세 조회
 * @param employeeId 직원 ID
 * @param params 조회 옵션
 * @returns 직원 상세 정보
 */
export const getEmployeeById = async (
  employeeId: number,
  params: EmployeeDetailParams = {}
): Promise<ApiResponse<{ employee: Employee }>> => {
  try {
    console.log('직원 상세 조회 요청:', { employeeId, params });

    const response = await api.get<{ employee: Employee }>(`/api/employees/${employeeId}`, { params });

    console.log('직원 상세 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('직원 상세 조회 오류:', error);
    throw error;
  }
};

/**
 * 직원 통계 조회
 * @param companyId 회사 ID (선택)
 * @param subCompanyId 하위회사 ID (선택)
 * @param deptId 부서 ID (선택)
 * @returns 직원 통계 정보
 */
export const getEmployeeStats = async (
  companyId?: number,
  subCompanyId?: number,
  deptId?: number
): Promise<ApiResponse<{ stats: EmployeeStats }>> => {
  try {
    const params = { companyId, subCompanyId, deptId };
    console.log('직원 통계 조회 요청:', params);

    const response = await api.get<{ stats: EmployeeStats }>('/api/employees/stats', { params });

    console.log('직원 통계 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('직원 통계 조회 오류:', error);
    throw error;
  }
};

/**
 * 직원 검색
 * @param params 검색 파라미터
 * @returns 검색된 직원 목록
 */
export const searchEmployees = async (params: EmployeeSearchParams): Promise<ApiResponse<{ employees: Employee[] }>> => {
  try {
    console.log('직원 검색 요청:', params);

    const response = await api.get<{ employees: Employee[] }>('/api/employees/search', { params });

    console.log('직원 검색 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('직원 검색 오류:', error);
    throw error;
  }
};

/**
 * 직원 등록 (발령 연동)
 * @param employeeData 직원 등록 데이터
 * @returns 등록된 직원 정보 및 발령 정보
 */
export const createEmployee = async (employeeData: EmployeeCreateRequest): Promise<ApiResponse<{
  employee: Employee;
  assignment?: any;
}>> => {
  try {
    console.log('🔄 직원 등록 요청:', employeeData);

    const response = await api.post<{ employee: Employee; assignment?: any }>('/api/employees', employeeData);

    console.log('✅ 직원 등록 성공:', response);
    return response;
  } catch (error: unknown) {
    console.error('❌ 직원 등록 오류:', error);
    throw error;
  }
};

/**
 * 현재 로그인한 사용자 정보 조회
 * @returns 현재 사용자 정보
 */
export const getCurrentUser = async (): Promise<ApiResponse<{ user: Employee }>> => {
  try {
    console.log('현재 사용자 정보 조회 요청');

    const response = await api.get<{ user: Employee }>('/api/auth/me');

    console.log('현재 사용자 정보 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('현재 사용자 정보 조회 오류:', error);
    throw error;
  }
};

/**
 * 유틸리티 함수들
 */

/**
 * 직원 상태 텍스트 반환
 * @param employee 직원 정보
 * @returns 상태 텍스트
 */
export const getEmployeeStatusText = (employee: Employee): string => {
  if (!employee.isActive) return '비활성';
  if (employee.retireDate) return '퇴사';
  return '재직';
};

/**
 * 직원 상태 색상 반환 (Ant Design 색상)
 * @param employee 직원 정보
 * @returns 상태 색상
 */
export const getEmployeeStatusColor = (employee: Employee): string => {
  if (!employee.isActive) return 'default';
  if (employee.retireDate) return 'error';
  return 'success';
};

/**
 * 근속년수 계산
 * @param hireDate 입사일
 * @param retireDate 퇴사일 (선택)
 * @returns 근속년수
 */
export const calculateCareerYears = (hireDate: string, retireDate?: string): number => {
  const startDate = new Date(hireDate);
  const endDate = retireDate ? new Date(retireDate) : new Date();

  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);

  return diffYears;
};

/**
 * 나이 계산
 * @param birthDate 생년월일
 * @returns 나이
 */
export const calculateAge = (birthDate?: string): number | null => {
  if (!birthDate) return null;

  const birth = new Date(birthDate);
  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

/**
 * 직원 권한 텍스트 반환
 * @param userRole 사용자 역할
 * @returns 권한 텍스트
 */
export const getUserRoleText = (userRole: string): string => {
  switch (userRole) {
    case 'admin': return '관리자';
    case 'manager': return '매니저';
    case 'employee': return '직원';
    default: return userRole;
  }
};

/**
 * 직원 권한 색상 반환
 * @param userRole 사용자 역할
 * @returns 권한 색상
 */
export const getUserRoleColor = (userRole: string): string => {
  switch (userRole) {
    case 'admin': return 'red';
    case 'manager': return 'blue';
    case 'employee': return 'green';
    default: return 'default';
  }
};

/**
 * 직원 이름 포맷팅
 * @param employee 직원 정보
 * @returns 포맷팅된 이름
 */
export const formatEmployeeName = (employee: Employee): string => {
  return employee.fullName || `${employee.lastName}${employee.firstName}`;
};

/**
 * 조직 경로 포맷팅
 * @param employee 직원 정보
 * @returns 조직 경로 문자열
 */
export const formatOrganizationPath = (employee: Employee): string => {
  return `${employee.companyName} > ${employee.subCompanyName} > ${employee.deptName} > ${employee.posName}`;
};

/**
 * 폼 유효성 검증 (향후 직원 등록/수정 시 사용)
 */

/**
 * 이메일 형식 검증
 * @param email 이메일
 * @returns 유효성 여부
 */
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * 전화번호 형식 검증
 * @param phoneNumber 전화번호
 * @returns 유효성 여부
 */
export const isValidPhoneNumber = (phoneNumber: string): boolean => {
  const regex = /^01[0-9]-\d{3,4}-\d{4}$/;
  return regex.test(phoneNumber);
};

/**
 * 전화번호 자동 포맷팅
 * @param value 입력값
 * @returns 포맷팅된 값
 */
export const formatPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};