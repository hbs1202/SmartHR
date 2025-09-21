/**
 * 회사 관리 API 서비스
 * @description 회사 등록, 조회, 수정, 삭제 관련 API 통신
 * @author SmartHR Team
 * @date 2024-09-17
 */

import api from './api';
import type { ApiResponse } from '../types/api';

// 회사 등록 요청 타입
export interface CompanyCreateRequest {
  companyCode: string;
  companyName: string;
  businessNumber?: string;
  corporateNumber?: string;
  ceoName?: string;
  establishDate?: string;
  industry?: string;
  businessType?: string;
  postalCode?: string;
  address?: string;
  addressDetail?: string;
  phoneNumber?: string;
  faxNumber?: string;
  email?: string;
  isActive?: boolean;
}

// 회사 정보 타입 (API 응답 구조에 맞게 PascalCase 사용)
export interface Company {
  CompanyId: number;
  CompanyCode: string;
  CompanyName: string;
  BusinessNumber?: string;
  CorporateNumber?: string;
  CeoName?: string;
  EstablishDate?: string;
  Industry?: string;
  BusinessType?: string;
  PostalCode?: string;
  Address?: string;
  AddressDetail?: string;
  PhoneNumber?: string;
  FaxNumber?: string;
  Email?: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
}

// 회사 목록 응답 타입
export interface CompanyListResponse {
  companies: Company[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

// 회사 등록 응답 타입
export interface CompanyCreateResponse {
  companyId: number;
  companyCode: string;
  companyName: string;
}

// 회사 목록 조회 파라미터
export interface CompanyListParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

/**
 * 회사 등록
 * @param data 회사 등록 데이터
 * @returns 등록된 회사 정보
 */
export const createCompany = async (data: CompanyCreateRequest): Promise<ApiResponse<CompanyCreateResponse>> => {
  try {
    console.log('회사 등록 요청:', data);

    const response = await api.post('/api/organization/companies', data);

    console.log('회사 등록 응답:', response);
    return response as ApiResponse<CompanyCreateResponse>;
  } catch (error: unknown) {
    console.error('회사 등록 오류:', error);
    throw error;
  }
};

/**
 * 회사 목록 조회
 * @param params 조회 파라미터
 * @returns 회사 목록 및 페이징 정보
 */
export const getCompanies = async (params: CompanyListParams = {}): Promise<ApiResponse<CompanyListResponse>> => {
  try {
    console.log('회사 목록 조회 요청:', params);

    const response = await api.get('/api/organization/companies', { params });

    console.log('회사 목록 조회 응답:', response);
    return response as ApiResponse<CompanyListResponse>;
  } catch (error: unknown) {
    console.error('회사 목록 조회 오류:', error);
    throw error;
  }
};

/**
 * 회사 상세 조회
 * @param companyId 회사 ID
 * @returns 회사 상세 정보
 */
export const getCompanyById = async (companyId: number): Promise<ApiResponse<Company>> => {
  try {
    console.log('회사 상세 조회 요청:', companyId);

    const response = await api.get(`/api/organization/companies/${companyId}`);

    console.log('회사 상세 조회 응답:', response);
    return response as ApiResponse<Company>;
  } catch (error: unknown) {
    console.error('회사 상세 조회 오류:', error);
    throw error;
  }
};

/**
 * 회사 정보 수정
 * @param companyId 회사 ID
 * @param data 수정할 회사 데이터
 * @returns 수정된 회사 정보
 */
export const updateCompany = async (
  companyId: number,
  data: Partial<CompanyCreateRequest>
): Promise<ApiResponse<Company>> => {
  try {
    console.log('회사 정보 수정 요청:', { companyId, data });

    const response = await api.put(`/api/organization/companies/${companyId}`, data);

    console.log('회사 정보 수정 응답:', response);
    return response as ApiResponse<Company>;
  } catch (error: unknown) {
    console.error('회사 정보 수정 오류:', error);
    throw error;
  }
};

/**
 * 회사 삭제 (소프트 삭제)
 * @param companyId 회사 ID
 * @returns 삭제 결과
 */
export const deleteCompany = async (companyId: number): Promise<ApiResponse<{ companyId: number; deletedAt: string }>> => {
  try {
    console.log('회사 삭제 요청:', companyId);

    const response = await api.delete(`/api/organization/companies/${companyId}`);

    console.log('회사 삭제 응답:', response);
    return response as ApiResponse<{ companyId: number; deletedAt: string }>;
  } catch (error: unknown) {
    console.error('회사 삭제 오류:', error);
    throw error;
  }
};

/**
 * 폼 유효성 검증
 * @param data 검증할 회사 데이터
 * @returns 검증 결과
 */
export const validateCompanyForm = (data: CompanyCreateRequest): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // 필수 필드 검증
  if (!data.companyCode || data.companyCode.trim().length < 2) {
    errors.push('회사 코드는 최소 2자 이상 입력해주세요.');
  }

  if (!data.companyName || data.companyName.trim().length < 2) {
    errors.push('회사명은 최소 2자 이상 입력해주세요.');
  }

  // 사업자등록번호 형식 검증 (선택 입력 시)
  if (data.businessNumber && !isValidBusinessNumber(data.businessNumber)) {
    errors.push('사업자등록번호 형식이 올바르지 않습니다. (000-00-00000)');
  }

  // 법인번호 형식 검증 (선택 입력 시)
  if (data.corporateNumber && !isValidCorporateNumber(data.corporateNumber)) {
    errors.push('법인번호 형식이 올바르지 않습니다. (000000-0000000)');
  }

  // 이메일 형식 검증 (선택 입력 시)
  if (data.email && !isValidEmail(data.email)) {
    errors.push('이메일 형식이 올바르지 않습니다.');
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
 * 법인번호 형식 검증
 * @param corporateNumber 법인번호
 * @returns 유효성 여부
 */
export const isValidCorporateNumber = (corporateNumber: string): boolean => {
  const regex = /^\d{6}-\d{7}$/;
  return regex.test(corporateNumber);
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
 * 법인번호 자동 포맷팅
 * @param value 입력값
 * @returns 포맷팅된 값
 */
export const formatCorporateNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 6) return numbers;
  return `${numbers.slice(0, 6)}-${numbers.slice(6, 13)}`;
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