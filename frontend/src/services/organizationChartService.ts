/**
 * 조직도 서비스
 * @description 조직도 계층구조 조회, 부서별 하위 조직, 통계 정보 API 통신
 * @author SmartHR Team
 * @date 2024-09-19
 */

import api from './api';
import type { ApiResponse } from '../types/api';

// 조직도 노드 타입 정의
export interface OrganizationNode {
  NodeType: 'company' | 'subcompany' | 'department' | 'employee';
  NodeId: string;
  NodeName: string;
  NodeCode: string;
  ParentId?: string;
  Level: number;
  DisplayName: string;
  MemberCount: number;
  IsActive: boolean;
  NodePath: string;
  CreatedAt: string;
  CompanyId: number;
  SubCompanyId?: number;
  DeptId?: number;
  PosId?: number;
  children?: OrganizationNode[];
}

// 조직도 응답 타입
export interface OrganizationChartResponse {
  tree: OrganizationNode[];
  flatData: OrganizationNode[];
  summary: {
    totalNodes: number;
    companies: number;
    subCompanies: number;
    departments: number;
    employees: number;
  };
}

// 부서 계층구조 타입
export interface DepartmentHierarchy {
  DeptId: number;
  DeptName: string;
  DeptCode: string;
  DeptLevel: number;
  ParentDeptId?: number;
  Depth: number;
  DeptPath: string;
  EmployeeCount: number;
  IsActive: boolean;
  Positions: Position[];
}

// 직책 타입
export interface Position {
  PosId: number;
  PosName: string;
  PosCode: string;
  PosGrade?: string;
  CurrentHeadcount: number;
  MaxHeadcount?: number;
}

// 조직도 통계 타입
export interface OrganizationStats {
  TotalCompanies: number;
  TotalSubCompanies: number;
  TotalDepartments: number;
  TotalPositions: number;
  TotalEmployees: number;
  TopDepartmentsBySize: Array<{
    DeptName: string;
    EmployeeCount: number;
  }>;
}

// 조직도 조회 파라미터
export interface OrganizationChartParams {
  companyId?: number;
  subCompanyId?: number;
  includeInactive?: boolean;
}

/**
 * 전체 조직도 계층구조 조회
 * @param params 조회 파라미터
 * @returns 조직도 트리 데이터
 */
export const getOrganizationChart = async (params: OrganizationChartParams = {}): Promise<ApiResponse<OrganizationChartResponse>> => {
  try {
    console.log('조직도 조회 요청:', params);

    const response = await api.get<OrganizationChartResponse>('/api/organization/chart', { params });

    console.log('조직도 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('조직도 조회 오류:', error);
    throw error;
  }
};

/**
 * 특정 부서의 하위 조직 계층구조 조회
 * @param deptId 부서 ID
 * @returns 부서 계층구조 데이터
 */
export const getDepartmentHierarchy = async (deptId: number): Promise<ApiResponse<DepartmentHierarchy[]>> => {
  try {
    console.log('부서 계층구조 조회 요청:', deptId);

    const response = await api.get<DepartmentHierarchy[]>(`/api/organization/department/${deptId}/hierarchy`);

    console.log('부서 계층구조 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('부서 계층구조 조회 오류:', error);
    throw error;
  }
};

/**
 * 조직도 통계 정보 조회
 * @param companyId 회사 ID (선택적)
 * @returns 조직도 통계 데이터
 */
export const getOrganizationStats = async (companyId?: number): Promise<ApiResponse<OrganizationStats>> => {
  try {
    console.log('조직도 통계 조회 요청:', companyId);

    const params = companyId ? { companyId } : {};
    const response = await api.get<OrganizationStats>('/api/organization/stats', { params });

    console.log('조직도 통계 조회 응답:', response);
    return response;
  } catch (error: unknown) {
    console.error('조직도 통계 조회 오류:', error);
    throw error;
  }
};

/**
 * 조직도 노드 검색
 * @param searchTerm 검색어
 * @param nodeType 노드 타입 필터 (선택적)
 * @returns 검색 결과
 */
export const searchOrganizationNodes = (
  nodes: OrganizationNode[],
  searchTerm: string,
  nodeType?: OrganizationNode['NodeType']
): OrganizationNode[] => {
  if (!searchTerm.trim()) return nodes;

  const searchLower = searchTerm.toLowerCase();

  const searchInNode = (node: OrganizationNode): OrganizationNode | null => {
    const matches =
      node.NodeName.toLowerCase().includes(searchLower) ||
      node.NodeCode.toLowerCase().includes(searchLower) ||
      node.DisplayName.toLowerCase().includes(searchLower);

    if (nodeType && node.NodeType !== nodeType) {
      // 타입 필터가 있고 일치하지 않으면 자식만 검색
      const matchingChildren = node.children?.map(child => searchInNode(child)).filter(Boolean) || [];
      return matchingChildren.length > 0 ? { ...node, children: matchingChildren } : null;
    }

    if (matches) {
      return node;
    }

    // 자식 노드에서 검색
    const matchingChildren = node.children?.map(child => searchInNode(child)).filter(Boolean) || [];
    return matchingChildren.length > 0 ? { ...node, children: matchingChildren } : null;
  };

  return nodes.map(node => searchInNode(node)).filter(Boolean) as OrganizationNode[];
};

/**
 * 조직도 노드 경로 생성
 * @param node 조직도 노드
 * @returns 경로 문자열
 */
export const getNodePath = (node: OrganizationNode): string => {
  const pathParts = [];

  if (node.NodeType === 'company') {
    pathParts.push(node.NodeName);
  } else if (node.NodeType === 'subcompany') {
    pathParts.push(node.NodeName);
  } else if (node.NodeType === 'department') {
    pathParts.push(node.NodeName);
  } else if (node.NodeType === 'position') {
    pathParts.push(node.NodeName);
  }

  return pathParts.join(' > ');
};

/**
 * 조직도 노드 타입별 아이콘 반환
 * @param nodeType 노드 타입
 * @returns 아이콘 이름
 */
export const getNodeIcon = (nodeType: OrganizationNode['NodeType']): string => {
  switch (nodeType) {
    case 'company':
      return 'bank';
    case 'subcompany':
      return 'shop';
    case 'department':
      return 'team';
    case 'employee':
      return 'user';
    default:
      return 'file';
  }
};

/**
 * 조직도 노드 타입별 색상 반환
 * @param nodeType 노드 타입
 * @returns 색상 코드
 */
export const getNodeColor = (nodeType: OrganizationNode['NodeType']): string => {
  switch (nodeType) {
    case 'company':
      return '#1890ff'; // 파란색
    case 'subcompany':
      return '#52c41a'; // 초록색
    case 'department':
      return '#fa8c16'; // 주황색
    case 'employee':
      return '#722ed1'; // 보라색
    default:
      return '#d9d9d9'; // 회색
  }
};

/**
 * 플랫 데이터를 트리 구조로 변환
 * @param flatData 플랫 형태의 조직도 데이터
 * @returns 트리 구조 데이터
 */
export const buildTreeFromFlat = (flatData: OrganizationNode[]): OrganizationNode[] => {
  const nodeMap = new Map<string, OrganizationNode>();
  const tree: OrganizationNode[] = [];

  // 1단계: 모든 노드를 Map에 저장
  flatData.forEach(item => {
    nodeMap.set(item.NodeId, {
      ...item,
      children: []
    });
  });

  // 2단계: 부모-자식 관계 설정
  flatData.forEach(item => {
    const node = nodeMap.get(item.NodeId);
    if (!node) return;

    if (item.ParentId && nodeMap.has(item.ParentId)) {
      // 부모가 있는 경우
      const parent = nodeMap.get(item.ParentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      // 루트 노드인 경우
      tree.push(node);
    }
  });

  return tree;
};