/**
 * 사업장 관리 API 서비스
 * @description 사업장 등록, 조회, 수정, 삭제 관련 API 통신
 * @author SmartHR Team
 * @date 2024-09-17
 */

import api from './api';
import type { ApiResponse } from '../types/api';

// 사업장 등록 요청 타입
export interface SubCompanyCreateRequest {
  companyId: number;
  subCompanyCode: string;
  subCompanyName: string;
  businessNumber?: string;
  ceoName?: string;
  industry?: string;
  businessType?: string;
  subCompanyType?: string;
  address?: string;
  addressDetail?: string;
  postalCode?: string;
  phoneNumber?: string;
  faxNumber?: string;
  email?: string;
  managerEmployeeId?: number;
  openDate?: string;
  area?: number;
  floorCount?: number;
  parkingSpots?: number;
  description?: string;
  isHeadquarters?: boolean;
}

// 사업장 정보 타입 (API 응답 구조에 맞게 PascalCase 사용)
export interface SubCompany {
  SubCompanyId: number;
  CompanyId: number;
  SubCompanyCode: string;
  SubCompanyName: string;
  BusinessNumber?: string;
  CeoName?: string;
  Industry?: string;
  BusinessType?: string;
  SubCompanyType?: string;
  Address?: string;
  AddressDetail?: string;
  PostalCode?: string;
  PhoneNumber?: string;
  FaxNumber?: string;
  Email?: string;
  ManagerEmployeeId?: number;
  OpenDate?: string;
  Area?: number;
  FloorCount?: number;
  ParkingSpots?: number;
  Description?: string;
  IsHeadquarters: boolean;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
  CompanyName?: string;
  CompanyCode?: string;
}

// 사업장 목록 응답 타입
export interface SubCompanyListResponse {
  subCompanies: SubCompany[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// 사업장 등록 응답 타입
export interface SubCompanyCreateResponse {
  subCompanyId: number;
  subCompanyCode: string;
  subCompanyName: string;
}

// 사업장 목록 조회 파라미터
export interface SubCompanyListParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

/**
 * 사업장 등록
 * @param data 사업장 등록 데이터
 * @returns 등록된 사업장 정보
 */
export const createWorkplace = async (data: SubCompanyCreateRequest): Promise<ApiResponse<SubCompanyCreateResponse>> => {
  try {
    console.log('사업장 등록 요청:', data);

    const response = await api.post('/api/organization/subcompanies', data);

    console.log('사업장 등록 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('사업장 등록 오류:', error);
    throw error;
  }
};

/**
 * 회사별 사업장 목록 조회
 * @param companyId 회사 ID
 * @param params 조회 파라미터
 * @returns 사업장 목록 및 페이징 정보
 */
export const getWorkplacesByCompany = async (companyId: number, params: SubCompanyListParams = {}): Promise<ApiResponse<SubCompanyListResponse>> => {
  try {
    console.log('사업장 목록 조회 요청:', { companyId, params });

    // 백엔드 API는 쿼리 파라미터로 companyId를 받음
    const queryParams = { ...params, companyId };
    const response = await api.get('/api/organization/subcompanies', { params: queryParams });

    console.log('사업장 목록 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('사업장 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 사업장 상세 조회
 * @param workplaceId 사업장 ID
 * @returns 사업장 상세 정보
 */
export const getWorkplaceById = async (workplaceId: number): Promise<ApiResponse<SubCompany>> => {
  try {
    console.log('사업장 상세 조회 요청:', workplaceId);

    const response = await api.get(`/api/organization/subcompanies/${workplaceId}`);

    console.log('사업장 상세 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('사업장 상세 조회 오류:', error);
    throw error;
  }
};

/**
 * 사업장 정보 수정
 * @param workplaceId 사업장 ID
 * @param data 수정할 사업장 데이터
 * @returns 수정된 사업장 정보
 */
export const updateWorkplace = async (
  workplaceId: number,
  data: Partial<SubCompanyCreateRequest>
): Promise<ApiResponse<SubCompany>> => {
  try {
    console.log('사업장 정보 수정 요청:', { workplaceId, data });

    const response = await api.put(`/api/organization/subcompanies/${workplaceId}`, data);

    console.log('사업장 정보 수정 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('사업장 정보 수정 오류:', error);
    throw error;
  }
};

/**
 * 사업장 삭제 (소프트 삭제)
 * @param workplaceId 사업장 ID
 * @returns 삭제 결과
 */
export const deleteWorkplace = async (workplaceId: number): Promise<ApiResponse<{ workplaceId: number; deletedAt: string }>> => {
  try {
    console.log('사업장 삭제 요청:', workplaceId);

    const response = await api.delete(`/api/organization/subcompanies/${workplaceId}`);

    console.log('사업장 삭제 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('사업장 삭제 오류:', error);
    throw error;
  }
};

/**
 * 폼 유효성 검증
 * @param data 검증할 사업장 데이터
 * @returns 검증 결과
 */
export const validateWorkplaceForm = (data: SubCompanyCreateRequest): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 필수 필드 검증
  if (!data.companyId || data.companyId <= 0) {
    errors.push('회사를 선택해주세요.');
  }

  if (!data.subCompanyCode || data.subCompanyCode.trim().length < 2) {
    errors.push('사업장 코드는 최소 2자 이상 입력해주세요.');
  }

  if (!data.subCompanyName || data.subCompanyName.trim().length < 2) {
    errors.push('사업장명은 최소 2자 이상 입력해주세요.');
  }


  // 전화번호 형식 검증 (선택 입력 시)
  if (data.phoneNumber && !isValidPhoneNumber(data.phoneNumber)) {
    errors.push('전화번호 형식이 올바르지 않습니다. (000-0000-0000)');
  }

  // 팩스번호 형식 검증 (선택 입력 시)
  if (data.faxNumber && !isValidPhoneNumber(data.faxNumber)) {
    errors.push('팩스번호 형식이 올바르지 않습니다. (000-0000-0000)');
  }

  // 우편번호 형식 검증 (선택 입력 시)
  if (data.postalCode && !isValidPostalCode(data.postalCode)) {
    errors.push('우편번호는 5자리 숫자여야 합니다.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * 사업자등록번호 형식 검증
 * @param businessNumber 사업자등록번호
 * @returns 유효성 여부
 */
export const isValidBusinessNumber = (businessNumber: string): boolean => {
  const regex = /^\d{3}-\d{2}-\d{5}$/;
  return regex.test(businessNumber);
};

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
  const regex = /^\d{2,3}-\d{3,4}-\d{4}$/;
  return regex.test(phoneNumber);
};

/**
 * 우편번호 형식 검증
 * @param postalCode 우편번호
 * @returns 유효성 여부
 */
export const isValidPostalCode = (postalCode: string): boolean => {
  const regex = /^\d{5}$/;
  return regex.test(postalCode);
};

/**
 * 자동 포맷팅 함수들
 */

/**
 * 사업자등록번호 자동 포맷팅
 * @param value 입력값
 * @returns 포맷팅된 값
 */
export const formatBusinessNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
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
  if (numbers.length <= 11) return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;

  // 서울지역 02번호 처리
  if (numbers.startsWith('02')) {
    if (numbers.length <= 6) return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
  }

  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
};