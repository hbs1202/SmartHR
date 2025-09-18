import api from './api';

// 부서 인터페이스
export interface Department {
  deptId: number;
  subCompanyId: number;
  subCompanyName: string;
  companyId: number;
  companyName: string;
  deptCode: string;
  deptName: string;
  parentDeptId?: number;
  parentDeptName?: string;
  deptLevel: number;
  deptType: string;
  managerEmployeeId?: number;
  viceManagerEmployeeId?: number;
  costCenter?: string;
  budget?: number;
  employeeCount: number;
  phoneNumber?: string;
  extension?: string;
  email?: string;
  location?: string;
  establishDate?: string;
  closeDate?: string;
  purpose?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 부서 생성 요청 인터페이스
export interface DepartmentCreateRequest {
  subCompanyId: number;
  deptCode: string;
  deptName: string;
  parentDeptId?: number | null;
  establishDate?: string | null;
}

// 부서 수정 요청 인터페이스
export interface DepartmentUpdateRequest {
  deptCode: string;
  deptName: string;
  parentDeptId?: number | null;
  establishDate?: string | null;
}

// 부서 목록 조회 파라미터
export interface GetDepartmentsParams {
  companyId?: number;
  subCompanyId?: number;
  page?: number;
  limit?: number;
  isActive?: boolean;
  search?: string;
}

// 부서 목록 응답 인터페이스
export interface DepartmentsResponse {
  departments: Department[];
  pagination: {
    currentPage: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// API 응답 인터페이스
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

// 부서 서비스 클래스
class DepartmentService {
  private baseUrl = '/api/organization/departments';

  /**
   * 부서 목록 조회
   */
  async getDepartments(params: GetDepartmentsParams = {}): Promise<DepartmentsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.companyId) queryParams.append('companyId', params.companyId.toString());
      if (params.subCompanyId) queryParams.append('subCompanyId', params.subCompanyId.toString());
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
      if (params.search) queryParams.append('search', params.search);

      const response = await api.get<ApiResponse<DepartmentsResponse>>(
        `${this.baseUrl}?${queryParams.toString()}`
      );

      console.log('부서 목록 API 응답:', response.data);

      // response.data가 이미 실제 데이터 구조 {departments, pagination}
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('부서 목록을 불러오는데 실패했습니다.');
    }
  }

  /**
   * 부서 상세 조회
   */
  async getDepartmentById(deptId: number): Promise<Department> {
    try {
      const response = await api.get<ApiResponse<Department>>(`${this.baseUrl}/${deptId}`);

      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || '부서 정보를 불러오는데 실패했습니다.');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('부서 정보를 불러오는데 실패했습니다.');
    }
  }

  /**
   * 부서 등록
   */
  async createDepartment(departmentData: DepartmentCreateRequest): Promise<Department> {
    try {
      const response = await api.post<ApiResponse<Department>>(this.baseUrl, departmentData);

      console.log('부서 등록 API 응답:', response.data);

      // 응답이 성공인 경우 데이터 반환 (실제 응답 구조에 맞게 수정)
      if (response.data.success) {
        // response.data가 전체 응답이므로 Department 정보를 추출해야 함
        return response.data as any; // 임시로 any 사용
      } else {
        throw new Error(response.data.message || '부서 등록에 실패했습니다.');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('부서 등록에 실패했습니다.');
    }
  }

  /**
   * 부서 수정
   */
  async updateDepartment(deptId: number, departmentData: DepartmentUpdateRequest): Promise<Department> {
    try {
      const response = await api.put<ApiResponse<Department>>(`${this.baseUrl}/${deptId}`, departmentData);

      console.log('부서 수정 API 응답:', response.data);

      // 응답이 성공인 경우 데이터 반환 (실제 응답 구조에 맞게 수정)
      if (response.data.success) {
        // response.data가 전체 응답이므로 Department 정보를 추출해야 함
        return response.data as any; // 임시로 any 사용
      } else {
        throw new Error(response.data.message || '부서 수정에 실패했습니다.');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('부서 수정에 실패했습니다.');
    }
  }

  /**
   * 부서 삭제
   */
  async deleteDepartment(deptId: number): Promise<void> {
    try {
      const response = await api.delete<ApiResponse<void>>(`${this.baseUrl}/${deptId}`);

      if (!response.data.success) {
        throw new Error(response.data.message || '부서 삭제에 실패했습니다.');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('부서 삭제에 실패했습니다.');
    }
  }

  /**
   * 특정 사업장의 부서 목록 조회 (상위부서 선택용)
   */
  async getDepartmentsBySubCompany(subCompanyId: number): Promise<Department[]> {
    try {
      const data = await this.getDepartments({ subCompanyId, limit: 1000 });
      return data.departments;
    } catch (error) {
      throw error;
    }
  }
}

// 부서 서비스 인스턴스 생성 및 내보내기
export const departmentService = new DepartmentService();

export default departmentService;