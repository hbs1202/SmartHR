import api from './api';

// 부서 인터페이스
export interface Department {
  DeptId: number;
  SubCompanyId: number;
  SubCompanyName: string;
  CompanyId: number;
  CompanyName: string;
  DeptCode: string;
  DeptName: string;
  ParentDeptId?: number;
  ParentDeptName?: string;
  DeptLevel: number;
  DeptType: string;
  ManagerEmployeeId?: number;
  ViceManagerEmployeeId?: number;
  CostCenter?: string;
  Budget?: number;
  EmployeeCount: number;
  PhoneNumber?: string;
  Extension?: string;
  Email?: string;
  Location?: string;
  EstablishDate?: string;
  CloseDate?: string;
  Purpose?: string;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
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

      const response = await api.get(
        `${this.baseUrl}?${queryParams.toString()}`
      );

      console.log('부서 목록 API 응답:', response);

      // API 서비스에서 이미 response.data를 반환하므로 직접 접근
      if (response.success && response.data) {
        return response.data as DepartmentsResponse;
      } else {
        throw new Error(response.message || '부서 목록 조회 실패');
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
      }
      throw new Error('부서 목록을 불러오는데 실패했습니다.');
    }
  }

  /**
   * 부서 상세 조회
   */
  async getDepartmentById(deptId: number): Promise<Department> {
    try {
      const response = await api.get(`${this.baseUrl}/${deptId}`);

      if (response.success && response.data) {
        return response.data as Department;
      } else {
        throw new Error(response.message || '부서 조회 실패');
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
      }
      throw new Error('부서 정보를 불러오는데 실패했습니다.');
    }
  }

  /**
   * 부서 등록
   */
  async createDepartment(departmentData: DepartmentCreateRequest): Promise<Department> {
    try {
      const response = await api.post(this.baseUrl, departmentData);

      console.log('부서 등록 API 응답:', response);

      if (response.success && response.data) {
        return response.data as Department;
      } else {
        throw new Error(response.message || '부서 등록 실패');
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
      }
      throw new Error('부서 등록에 실패했습니다.');
    }
  }

  /**
   * 부서 수정
   */
  async updateDepartment(deptId: number, departmentData: DepartmentUpdateRequest): Promise<Department> {
    try {
      const response = await api.put(`${this.baseUrl}/${deptId}`, departmentData);

      console.log('부서 수정 API 응답:', response);

      if (response.success && response.data) {
        return response.data as Department;
      } else {
        throw new Error(response.message || '부서 수정 실패');
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
      }
      throw new Error('부서 수정에 실패했습니다.');
    }
  }

  /**
   * 부서 삭제
   */
  async deleteDepartment(deptId: number): Promise<void> {
    try {
      const response = await api.delete(`${this.baseUrl}/${deptId}`);

      console.log('부서 삭제 API 응답:', response);

      if (!response.success) {
        throw new Error(response.message || '부서 삭제 실패');
      }
      // 삭제 성공 시 void 반환
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          throw new Error(axiosError.response.data.message);
        }
      }
      throw new Error('부서 삭제에 실패했습니다.');
    }
  }

  /**
   * 특정 사업장의 부서 목록 조회 (상위부서 선택용)
   */
  async getDepartmentsBySubCompany(subCompanyId: number): Promise<Department[]> {
    const data = await this.getDepartments({ subCompanyId, limit: 1000 });
    return data.departments;
  }
}

// 부서 서비스 인스턴스 생성 및 내보내기
export const departmentService = new DepartmentService();

export default departmentService;