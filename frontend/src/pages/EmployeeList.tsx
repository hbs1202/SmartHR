import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  Space,
  Typography,
  Row,
  Col,
  message,
  Tag,
  Avatar,
  Statistic,
  Divider,
  Tooltip
} from 'antd';
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BankOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getEmployees,
  getEmployeeStats,
  searchEmployees,
  getEmployeeById,
  type Employee,
  type EmployeeListParams,
  type EmployeeListResponse,
  type EmployeeStats,
  getEmployeeStatusText,
  getEmployeeStatusColor,
  getUserRoleText,
  getUserRoleColor,
  formatEmployeeName,
  calculateCareerYears
} from '../services/employeeService';
import { getCompanies, type Company } from '../services/companyService';
import { getWorkplacesByCompany, type SubCompany } from '../services/subCompanyService';
import departmentService, { type Department } from '../services/departmentService';
import type { ApiResponse } from '../types/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const EmployeeList: React.FC = () => {
  // 상태 관리
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: number[]) => `${range[0]}-${range[1]} / 총 ${total}명`,
  });

  // 필터 상태
  const [filters, setFilters] = useState<EmployeeListParams>({
    page: 1,
    limit: 10,
    isActive: true
  });
  const [searchTerm, setSearchTerm] = useState<string>('');

  // 테이블 컬럼 정의
  const columns: ColumnsType<Employee> = [
    {
      title: '직원',
      key: 'employee',
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar size="large" icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>
              {formatEmployeeName(record)}
            </div>
            <Text type="secondary">{record.employeeCode}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '조직',
      key: 'organization',
      width: 300,
      render: (_, record) => (
        <div>
          <div>{record.companyName}</div>
          <Text type="secondary">{record.deptName} - {record.posName}</Text>
        </div>
      ),
    },
    {
      title: '권한',
      dataIndex: 'userRole',
      key: 'userRole',
      width: 100,
      render: (userRole) => (
        <Tag color={getUserRoleColor(userRole)}>
          {getUserRoleText(userRole)}
        </Tag>
      ),
    },
    {
      title: '근속년수',
      key: 'careerYears',
      width: 100,
      render: (_, record) => (
        <span>{calculateCareerYears(record.hireDate, record.retireDate)}년</span>
      ),
    },
    {
      title: '입사일',
      dataIndex: 'hireDate',
      key: 'hireDate',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString('ko-KR'),
    },
    {
      title: '상태',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Tag color={getEmployeeStatusColor(record)}>
          {getEmployeeStatusText(record)}
        </Tag>
      ),
    },
    {
      title: '액션',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Space>
          <Tooltip title="상세 보기">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewEmployee(record.employeeId)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // 직원 목록 조회
  const fetchEmployees = useCallback(async (customFilters?: EmployeeListParams) => {
    setLoading(true);
    const currentFilters = customFilters || filters;
    try {
      const response: ApiResponse<EmployeeListResponse> = await getEmployees(currentFilters);

      if (response.success && response.data) {
        // API 응답 구조에 따라 데이터 처리
        if (response.data.employees) {
          // 정상적인 응답 구조
          setEmployees(response.data.employees);
          setPagination(prev => ({
            ...prev,
            current: response.data.pagination?.currentPage || filters.page || 1,
            total: response.data.pagination?.totalCount || 0,
          }));
        } else if (Array.isArray(response.data)) {
          // 직접 배열로 반환되는 경우
          const employees = response.data as Employee[];
          setEmployees(employees);
          setPagination(prev => ({
            ...prev,
            current: filters.page || 1,
            total: employees.length,
          }));
        }
      }
    } catch (error) {
      console.error('직원 목록 조회 실패:', error);
      message.error('직원 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 직원 통계 조회
  const fetchEmployeeStats = useCallback(async () => {
    try {
      const response = await getEmployeeStats(filters.companyId, filters.subCompanyId, filters.deptId);

      if (response.success && response.data) {
        setStats(response.data.stats || response.data);
      }
    } catch (error) {
      console.error('직원 통계 조회 실패:', error);
      // 통계는 선택사항이므로 에러 메시지 표시하지 않음
    }
  }, [filters.companyId, filters.subCompanyId, filters.deptId]);

  // 회사 목록 조회
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await getCompanies();
      console.log('🔍 fetchCompanies response:', response);
      console.log('🔍 response.data.companies:', response.data?.companies);
      console.log('🔍 첫 번째 회사:', response.data?.companies?.[0]);

      if (response.data && response.data.companies && Array.isArray(response.data.companies)) {
        console.log('🔍 회사 목록 설정 중...', response.data.companies.length, '개');
        setCompanies(response.data.companies);
        console.log('🔍 setCompanies 완료');
      } else {
        console.log('🔍 조건 실패:', { success: response.success, hasData: !!response.data, hasCompanies: !!response.data?.companies, isArray: Array.isArray(response.data?.companies) });
      }
    } catch (error) {
      console.error('회사 목록 조회 실패:', error);
    }
  }, []);

  // 사업장 목록 조회 (특정 회사의 사업장)
  const fetchSubCompanies = useCallback(async (companyId: number) => {
    try {
      console.log('🔍 사업장 목록 조회 요청:', companyId);
      const response = await getWorkplacesByCompany(companyId);
      console.log('🔍 사업장 목록 응답:', response);

      if (response.success && response.data && response.data.subCompanies && Array.isArray(response.data.subCompanies)) {
        console.log('🔍 사업장 목록 설정 중...', response.data.subCompanies.length, '개');
        setSubCompanies(response.data.subCompanies);
      } else {
        console.log('🔍 사업장 없음, 빈 배열로 설정');
        setSubCompanies([]);
      }
    } catch (error) {
      console.error('사업장 목록 조회 실패:', error);
      setSubCompanies([]);
    }
  }, []);

  // 부서 목록 조회 (전체)
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await departmentService.getDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('부서 목록 조회 실패:', error);
    }
  }, []);

  // 사업장별 부서 목록 조회
  const fetchDepartmentsBySubCompany = useCallback(async (subCompanyId: number) => {
    try {
      console.log('🔍 사업장별 부서 목록 조회:', subCompanyId);
      const response = await departmentService.getDepartments({ subCompanyId });
      console.log('🔍 사업장별 부서 응답:', response);
      setDepartments(response.departments || []);
    } catch (error) {
      console.error('사업장별 부서 목록 조회 실패:', error);
      setDepartments([]);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    fetchEmployees();
    fetchEmployeeStats();
    fetchCompanies();
    fetchDepartments();
  }, [fetchEmployees, fetchEmployeeStats, fetchCompanies, fetchDepartments]);

  // companies 상태 변경 감지
  useEffect(() => {
    console.log('🔍 companies 상태 업데이트:', companies);
  }, [companies]);

  // 필터 변경 처리
  const handleFilterChange = (key: keyof EmployeeListParams, value: number | string | boolean | undefined) => {
    const newFilters = { ...filters, [key]: value, page: 1 };

    // 회사 변경 시 사업장과 부서 초기화 및 사업장 목록 로드
    if (key === 'companyId') {
      newFilters.subCompanyId = undefined;
      newFilters.deptId = undefined;
      setSubCompanies([]);
      setDepartments([]);

      if (value && typeof value === 'number') {
        fetchSubCompanies(value);
      }
    }

    // 사업장 변경 시 부서 초기화 및 부서 목록 로드
    if (key === 'subCompanyId') {
      newFilters.deptId = undefined;
      setDepartments([]);

      if (value && typeof value === 'number') {
        fetchDepartmentsBySubCompany(value);
      }
    }

    setFilters(newFilters);

    // 새 필터로 즉시 데이터 다시 로드
    fetchEmployees(newFilters);
    fetchEmployeeStats();
  };

  // 테이블 변경 처리 (페이징, 정렬 등)
  const handleTableChange = (page: number, pageSize?: number) => {
    const newFilters = {
      ...filters,
      page,
      limit: pageSize || filters.limit
    };
    setFilters(newFilters);

    // 새 필터로 즉시 데이터 다시 로드
    fetchEmployees(newFilters);
  };

  // 검색 처리
  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      // 빈 검색어면 일반 목록 조회
      setSearchTerm('');
      fetchEmployees();
      return;
    }

    setLoading(true);
    try {
      const response = await searchEmployees({
        q: value.trim(),
        maxResults: 50,
        companyId: filters.companyId,
        deptId: filters.deptId
      });

      if (response.success && response.data) {
        setEmployees(response.data.employees || []);
        setSearchTerm(value.trim());
        setPagination(prev => ({
          ...prev,
          current: 1,
          total: (response.data.employees || []).length,
        }));
      }
    } catch (error) {
      console.error('직원 검색 실패:', error);
      message.error('직원 검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 직원 상세 보기
  const handleViewEmployee = async (employeeId: number) => {
    try {
      const response = await getEmployeeById(employeeId, {
        includeSalary: true,
        includePersonalInfo: true
      });

      if (response.success && response.data) {
        // 상세 정보 모달 또는 페이지로 이동
        message.info(`${response.data.employee.fullName} 직원의 상세 정보를 확인합니다.`);
        console.log('직원 상세 정보:', response.data.employee);
      }
    } catch (error) {
      console.error('직원 상세 조회 실패:', error);
      message.error('직원 상세 정보를 불러오는데 실패했습니다.');
    }
  };

  // 새로고침
  const handleRefresh = () => {
    setSearchTerm('');
    setFilters({ ...filters, page: 1 });
    fetchEmployees();
    fetchEmployeeStats();
  };

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>직원 관리</Title>

      {/* 통계 카드 */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="총 직원수"
                value={stats.TotalEmployees}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="재직 직원"
                value={stats.ActiveEmployees}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="비활성 직원"
                value={stats.InactiveEmployees}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="평균 근속년수"
                value={stats.AvgCareerYears}
                suffix="년"
                prefix={<BankOutlined />}
                precision={1}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 필터 및 검색 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={5}>
            <Search
              placeholder="직원명, 이메일, 직원코드로 검색"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={3}>
            <Select
              placeholder="회사 선택"
              allowClear
              style={{ width: '100%' }}
              value={filters.companyId}
              onChange={(value) => handleFilterChange('companyId', value)}
            >
              {companies.map(company => (
                <Option key={company.CompanyId} value={company.CompanyId}>
                  {company.CompanyName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="사업장 선택"
              allowClear
              style={{ width: '100%' }}
              value={filters.subCompanyId}
              onChange={(value) => handleFilterChange('subCompanyId', value)}
              disabled={!filters.companyId}
            >
              {subCompanies.map(subCompany => (
                <Option key={subCompany.SubCompanyId} value={subCompany.SubCompanyId}>
                  {subCompany.SubCompanyName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="부서 선택"
              allowClear
              style={{ width: '100%' }}
              value={filters.deptId}
              onChange={(value) => handleFilterChange('deptId', value)}
              disabled={!filters.subCompanyId}
            >
              {departments.map(dept => (
                <Option key={dept.DeptId} value={dept.DeptId}>
                  {dept.DeptName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="권한"
              allowClear
              style={{ width: '100%' }}
              value={filters.userRole}
              onChange={(value) => handleFilterChange('userRole', value)}
            >
              <Option value="admin">관리자</Option>
              <Option value="manager">매니저</Option>
              <Option value="employee">직원</Option>
            </Select>
          </Col>
          <Col span={2}>
            <Select
              placeholder="상태"
              style={{ width: '100%' }}
              value={filters.isActive}
              onChange={(value) => handleFilterChange('isActive', value)}
            >
              <Option value={true}>재직</Option>
              <Option value={false}>전체</Option>
            </Select>
          </Col>
          <Col span={2}>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              새로고침
            </Button>
          </Col>
        </Row>

        {searchTerm && (
          <>
            <Divider />
            <Text type="secondary">
              '{searchTerm}' 검색 결과 ({employees.length}명)
            </Text>
          </>
        )}
      </Card>

      {/* 직원 목록 테이블 */}
      <Card>
        <Table
          columns={columns}
          dataSource={employees}
          rowKey="employeeId"
          loading={loading}
          pagination={{
            ...pagination,
            onChange: handleTableChange,
            onShowSizeChange: handleTableChange,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default EmployeeList;