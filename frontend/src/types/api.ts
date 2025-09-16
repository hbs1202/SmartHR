/**
 * API 타입 정의
 * @description 백엔드 API와 일치하는 타입 정의
 * @author SmartHR Team
 * @date 2024-09-16
 */

// 표준 API 응답 포맷
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

// 인증 관련 타입
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: string;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
}

export interface User {
  employeeId: number;
  employeeCode: string;
  email: string;
  fullName: string;
  role: string;
  departmentId: number;
  companyId: number;
  lastLoginAt?: string;
}

// 직원 관련 타입
export interface Employee {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  hireDate: string;
  departmentId: number;
  positionId: number;
  rankId: number;
  status: string;
  isActive: boolean;
}

// 조직도 관련 타입
export interface Department {
  deptId: number;
  deptCode: string;
  deptName: string;
  parentDeptId?: number;
  deptLevel: number;
  deptOrder: number;
  managerId?: number;
  isActive: boolean;
}

// 발령 관련 타입
export interface Assignment {
  assignmentId: number;
  employeeId: number;
  assignmentType: string;
  fromDeptId?: number;
  toDeptId?: number;
  fromPositionId?: number;
  toPositionId?: number;
  fromRankId?: number;
  toRankId?: number;
  effectiveDate: string;
  reason: string;
  status: string;
  createdBy: number;
  createdAt: string;
}

// 휴가 관련 타입
export interface Vacation {
  vacationId: number;
  employeeId: number;
  vacationType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
  approvalId?: number;
  createdAt: string;
}

// 전자결재 관련 타입
export interface Approval {
  approvalId: number;
  requesterId: number;
  approvalType: string;
  title: string;
  content: string;
  status: string;
  currentStepId?: number;
  createdAt: string;
  completedAt?: string;
}

export interface ApprovalStep {
  stepId: number;
  approvalId: number;
  approverId: number;
  stepOrder: number;
  status: string;
  comment?: string;
  processedAt?: string;
}

// 공통 타입
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}