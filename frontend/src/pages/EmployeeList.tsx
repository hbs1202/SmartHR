import React, { useState, useEffect, useCallback } from "react";
import type { Dayjs } from "dayjs";
import {
  Card,
  Table,
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  Row,
  Col,
  message,
  Tag,
  Avatar,
  Tooltip,
  Modal,
  Form,
  DatePicker,
  Pagination,
} from "antd";
import {
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import {
  getEmployees,
  searchEmployees,
  getEmployeeById,
  createEmployee,
  type Employee,
  type EmployeeListParams,
  type EmployeeListResponse,
  type EmployeeCreateRequest,
  getEmployeeStatusText,
  getEmployeeStatusColor,
  getUserRoleText,
  getUserRoleColor,
  formatEmployeeName,
  calculateCareerYears,
} from "../services/employeeService";
import { getCompanies, type Company } from "../services/companyService";
import {
  getWorkplacesByCompany,
  type SubCompany,
} from "../services/subCompanyService";
import departmentService, {
  type Department,
} from "../services/departmentService";
import type { ApiResponse } from "../types/api";

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

// 임시 Position 타입 정의 (향후 positionService.ts에서 import 예정)
interface Position {
  PosId: number;
  PosName: string;
  PosCode: string;
  IsActive: boolean;
}

// 직원 등록 폼 데이터 타입
interface EmployeeFormData extends Omit<EmployeeCreateRequest, "hireDate"> {
  hireDate?: Dayjs; // dayjs 객체 처리용
}

const EmployeeList: React.FC = () => {
  // 상태 관리
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 9,
    total: 0,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: number[]) =>
      `${range[0]}-${range[1]} / 총 ${total}명`,
  });

  // 필터 상태
  const [filters, setFilters] = useState<EmployeeListParams>({
    page: 1,
    limit: 9,
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState<string>("");

  // 직원 등록 모달 상태
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeModalLoading, setEmployeeModalLoading] = useState(false);
  const [employeeForm] = Form.useForm<EmployeeFormData>();

  // 테이블 컬럼 정의
  const columns: ColumnsType<Employee> = [
    {
      title: "직원",
      key: "employee",
      width: 200,
      render: (_, record) => (
        <Space>
          <Avatar size="large" icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: "bold" }}>
              {formatEmployeeName(record)}
            </div>
            <Text type="secondary">{record.employeeCode}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "이메일",
      dataIndex: "email",
      key: "email",
      width: 200,
    },
    {
      title: "조직",
      key: "organization",
      width: 300,
      render: (_, record) => (
        <div>
          <div>{record.companyName}</div>
          <Text type="secondary">
            {record.deptName} - {record.posName}
          </Text>
        </div>
      ),
    },
    {
      title: "권한",
      dataIndex: "userRole",
      key: "userRole",
      width: 100,
      render: (userRole) => (
        <Tag color={getUserRoleColor(userRole)}>
          {getUserRoleText(userRole)}
        </Tag>
      ),
    },
    {
      title: "근속년수",
      key: "careerYears",
      width: 100,
      render: (_, record) => (
        <span>
          {calculateCareerYears(record.hireDate, record.retireDate)}년
        </span>
      ),
    },
    {
      title: "입사일",
      dataIndex: "hireDate",
      key: "hireDate",
      width: 120,
      render: (date) => new Date(date).toLocaleDateString("ko-KR"),
    },
    {
      title: "상태",
      key: "status",
      width: 100,
      render: (_, record) => (
        <Tag color={getEmployeeStatusColor(record)}>
          {getEmployeeStatusText(record)}
        </Tag>
      ),
    },
    {
      title: "액션",
      key: "action",
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
  const fetchEmployees = useCallback(
    async (customFilters?: EmployeeListParams) => {
      setLoading(true);
      const currentFilters = customFilters || filters;
      try {
        const response: ApiResponse<EmployeeListResponse> = await getEmployees(
          currentFilters
        );

        if (response.success && response.data) {
          console.log("📊 API 응답 전체:", response);
          console.log("📊 employees 길이:", response.data.employees?.length);
          console.log("📊 페이지네이션 정보:", response.data.pagination);
          console.log("📊 현재 필터:", currentFilters);

          // API 응답 구조에 따라 데이터 처리
          if (response.data.employees && response.data.pagination) {
            // 정상적인 응답 구조 - 페이지네이션 정보 포함
            setEmployees(response.data.employees);
            setPagination((prev) => ({
              ...prev,
              current: response.data.pagination.currentPage,
              total: response.data.pagination.totalCount,
              pageSize: response.data.pagination.pageSize,
            }));
          } else if (response.data.employees) {
            // employees는 있지만 pagination이 없는 경우
            setEmployees(response.data.employees);
            setPagination((prev) => ({
              ...prev,
              current: filters.page || 1,
              total: response.data.employees.length,
            }));
          } else if (Array.isArray(response.data)) {
            // 직접 배열로 반환되는 경우
            const employees = response.data as Employee[];
            setEmployees(employees);
            setPagination((prev) => ({
              ...prev,
              current: filters.page || 1,
              total: employees.length,
            }));
          }
        }
      } catch (error) {
        console.error("직원 목록 조회 실패:", error);
        message.error("직원 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // 회사 목록 조회
  const fetchCompanies = useCallback(async () => {
    try {
      const response = await getCompanies();
      console.log("🔍 fetchCompanies response:", response);
      console.log("🔍 response.data.companies:", response.data?.companies);
      console.log("🔍 첫 번째 회사:", response.data?.companies?.[0]);

      if (
        response.data &&
        response.data.companies &&
        Array.isArray(response.data.companies)
      ) {
        console.log(
          "🔍 회사 목록 설정 중...",
          response.data.companies.length,
          "개"
        );
        setCompanies(response.data.companies);
        console.log("🔍 setCompanies 완료");
      } else {
        console.log("🔍 조건 실패:", {
          success: response.success,
          hasData: !!response.data,
          hasCompanies: !!response.data?.companies,
          isArray: Array.isArray(response.data?.companies),
        });
      }
    } catch (error) {
      console.error("회사 목록 조회 실패:", error);
    }
  }, []);

  // 사업장 목록 조회 (특정 회사의 사업장)
  const fetchSubCompanies = useCallback(async (companyId: number) => {
    try {
      console.log("🔍 사업장 목록 조회 요청:", companyId);
      const response = await getWorkplacesByCompany(companyId);
      console.log("🔍 사업장 목록 응답:", response);

      if (
        response.success &&
        response.data &&
        response.data.subCompanies &&
        Array.isArray(response.data.subCompanies)
      ) {
        console.log(
          "🔍 사업장 목록 설정 중...",
          response.data.subCompanies.length,
          "개"
        );
        setSubCompanies(response.data.subCompanies);
      } else {
        console.log("🔍 사업장 없음, 빈 배열로 설정");
        setSubCompanies([]);
      }
    } catch (error) {
      console.error("사업장 목록 조회 실패:", error);
      setSubCompanies([]);
    }
  }, []);

  // 부서 목록 조회 (전체)
  const fetchDepartments = useCallback(async () => {
    try {
      const response = await departmentService.getDepartments();
      setDepartments(response.departments || []);
    } catch (error) {
      console.error("부서 목록 조회 실패:", error);
    }
  }, []);

  // 직책 목록 조회 (임시 구현 - 향후 positionService로 대체 예정)
  const fetchPositions = useCallback(async () => {
    try {
      // 임시 직책 데이터 (실제 서비스에서는 API 호출)
      const tempPositions: Position[] = [
        { PosId: 1, PosName: "사원", PosCode: "EMP", IsActive: true },
        { PosId: 2, PosName: "주임", PosCode: "ASS", IsActive: true },
        { PosId: 3, PosName: "대리", PosCode: "ASM", IsActive: true },
        { PosId: 4, PosName: "과장", PosCode: "MGR", IsActive: true },
        { PosId: 5, PosName: "차장", PosCode: "DMG", IsActive: true },
        { PosId: 6, PosName: "부장", PosCode: "DPT", IsActive: true },
        { PosId: 7, PosName: "이사", PosCode: "DIR", IsActive: true },
        { PosId: 8, PosName: "전무", PosCode: "EVP", IsActive: true },
        { PosId: 9, PosName: "상무", PosCode: "SVP", IsActive: true },
        { PosId: 10, PosName: "대표", PosCode: "CEO", IsActive: true },
      ];
      setPositions(tempPositions);
    } catch (error) {
      console.error("직책 목록 조회 실패:", error);
      setPositions([]);
    }
  }, []);

  // 사업장별 부서 목록 조회
  const fetchDepartmentsBySubCompany = useCallback(
    async (subCompanyId: number) => {
      try {
        console.log("🔍 사업장별 부서 목록 조회:", subCompanyId);
        const response = await departmentService.getDepartments({
          subCompanyId,
        });
        console.log("🔍 사업장별 부서 응답:", response);
        setDepartments(response.departments || []);
      } catch (error) {
        console.error("사업장별 부서 목록 조회 실패:", error);
        setDepartments([]);
      }
    },
    []
  );

  // 초기 데이터 로드
  useEffect(() => {
    fetchEmployees();
    fetchCompanies();
    fetchDepartments();
    fetchPositions();
  }, [fetchEmployees, fetchCompanies, fetchDepartments, fetchPositions]);

  // companies 상태 변경 감지
  useEffect(() => {
    console.log("🔍 companies 상태 업데이트:", companies);
  }, [companies]);

  // 필터 변경 처리
  const handleFilterChange = (
    key: keyof EmployeeListParams,
    value: number | string | boolean | undefined
  ) => {
    const newFilters = { ...filters, [key]: value, page: 1 };

    // 회사 변경 시 사업장과 부서 초기화 및 사업장 목록 로드
    if (key === "companyId") {
      newFilters.subCompanyId = undefined;
      newFilters.deptId = undefined;
      setSubCompanies([]);
      setDepartments([]);

      if (value && typeof value === "number") {
        fetchSubCompanies(value);
      }
    }

    // 사업장 변경 시 부서 초기화 및 부서 목록 로드
    if (key === "subCompanyId") {
      newFilters.deptId = undefined;
      setDepartments([]);

      if (value && typeof value === "number") {
        fetchDepartmentsBySubCompany(value);
      }
    }

    setFilters(newFilters);

    // 새 필터로 즉시 데이터 다시 로드
    fetchEmployees(newFilters);
  };

  // 테이블 변경 처리 (페이징, 정렬 등)
  const handleTableChange = (page: number, pageSize?: number) => {
    const newFilters = {
      ...filters,
      page,
      limit: pageSize || 9, // 기본값을 9로 설정
    };
    setFilters(newFilters);

    // 새 필터로 즉시 데이터 다시 로드
    fetchEmployees(newFilters);
  };

  // 검색 처리
  const handleSearch = async (value: string) => {
    if (!value.trim()) {
      // 빈 검색어면 일반 목록 조회
      setSearchTerm("");
      fetchEmployees();
      return;
    }

    setLoading(true);
    try {
      const response = await searchEmployees({
        q: value.trim(),
        maxResults: 50,
        companyId: filters.companyId,
        deptId: filters.deptId,
      });

      if (response.success && response.data) {
        setEmployees(response.data.employees || []);
        setSearchTerm(value.trim());
        setPagination((prev) => ({
          ...prev,
          current: 1,
          total: (response.data.employees || []).length,
        }));
      }
    } catch (error) {
      console.error("직원 검색 실패:", error);
      message.error("직원 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 직원 상세 보기
  const handleViewEmployee = async (employeeId: number) => {
    try {
      const response = await getEmployeeById(employeeId, {
        includeSalary: true,
        includePersonalInfo: true,
      });

      if (response.success && response.data) {
        // 상세 정보 모달 또는 페이지로 이동
        message.info(
          `${response.data.employee.fullName} 직원의 상세 정보를 확인합니다.`
        );
        console.log("직원 상세 정보:", response.data.employee);
      }
    } catch (error) {
      console.error("직원 상세 조회 실패:", error);
      message.error("직원 상세 정보를 불러오는데 실패했습니다.");
    }
  };

  // 새로고침
  const handleRefresh = () => {
    setSearchTerm("");
    setFilters({ ...filters, page: 1, limit: 9 });
    fetchEmployees();
  };

  // 직원 등록 모달 열기
  const handleAddEmployee = () => {
    setIsEmployeeModalOpen(true);
    employeeForm.resetFields();
  };

  // 직원 등록 모달 닫기
  const handleEmployeeModalClose = () => {
    setIsEmployeeModalOpen(false);
    employeeForm.resetFields();
  };

  // 폼 필드 동적 필터링 처리
  const [filteredSubCompanies, setFilteredSubCompanies] = useState<
    SubCompany[]
  >([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>(
    []
  );

  // 회사 선택 시 사업장 필터링
  const handleCompanyChange = async (companyId: number) => {
    employeeForm.setFieldsValue({
      subCompanyId: undefined,
      deptId: undefined,
      posId: undefined,
    });

    if (companyId) {
      try {
        const response = await getWorkplacesByCompany(companyId);
        if (response.success && response.data && response.data.subCompanies) {
          setFilteredSubCompanies(response.data.subCompanies);
        } else {
          setFilteredSubCompanies([]);
        }
      } catch (error) {
        console.error("사업장 목록 조회 실패:", error);
        setFilteredSubCompanies([]);
      }
    } else {
      setFilteredSubCompanies([]);
    }
    setFilteredDepartments([]);
  };

  // 사업장 선택 시 부서 필터링
  const handleSubCompanyChange = async (subCompanyId: number) => {
    employeeForm.setFieldsValue({
      deptId: undefined,
      posId: undefined,
    });

    if (subCompanyId) {
      try {
        const response = await departmentService.getDepartments({
          subCompanyId,
        });
        setFilteredDepartments(response.departments || []);
      } catch (error) {
        console.error("사업장별 부서 목록 조회 실패:", error);
        setFilteredDepartments([]);
      }
    } else {
      setFilteredDepartments([]);
    }
  };

  // 부서 선택 시 처리 (필요에 따라 직책 필터링 가능)
  const handleDepartmentChange = () => {
    employeeForm.setFieldsValue({ posId: undefined });
    // 필요에 따라 부서별 직책 필터링 로직 추가 가능
  };

  // 다음 우편번호 검색
  const handleAddressSearch = () => {
    const windowWithDaum = window as typeof window & {
      daum: {
        Postcode: new (options: {
          oncomplete: (data: {
            userSelectedType: string;
            roadAddress: string;
            jibunAddress: string;
            zonecode: string;
            bname: string;
            buildingName: string;
            apartment: string;
          }) => void;
        }) => { open: () => void };
      };
    };
    new windowWithDaum.daum.Postcode({
      oncomplete: function (data) {
        // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분
        let addr = ""; // 주소 변수
        let extraAddr = ""; // 참고항목 변수

        // 사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다
        if (data.userSelectedType === "R") {
          // 사용자가 도로명 주소를 선택했을 경우
          addr = data.roadAddress;
        } else {
          // 사용자가 지번 주소를 선택했을 경우(J)
          addr = data.jibunAddress;
        }

        // 사용자가 선택한 주소가 도로명 타입일때 참고항목을 조합한다
        if (data.userSelectedType === "R") {
          // 법정동명이 있을 경우 추가한다. (법정리는 제외)
          // 법정동의 경우 마지막 문자가 "동/로/가"로 끝난다
          if (data.bname !== "" && /[동|로|가]$/g.test(data.bname)) {
            extraAddr += data.bname;
          }
          // 건물명이 있고, 공동주택일 경우 추가한다
          if (data.buildingName !== "" && data.apartment === "Y") {
            extraAddr +=
              extraAddr !== "" ? ", " + data.buildingName : data.buildingName;
          }
          // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다
          if (extraAddr !== "") {
            extraAddr = " (" + extraAddr + ")";
          }
        }

        // 우편번호와 주소 정보를 폼에 설정
        employeeForm.setFieldValue("postalCode", data.zonecode);
        employeeForm.setFieldValue("address", addr + extraAddr);

        // 상세주소 입력란으로 포커스 이동
        // 약간의 딜레이 후 상세주소 필드로 포커스 이동
        setTimeout(() => {
          const detailAddressInput = document.querySelector(
            'input[placeholder="456호"]'
          ) as HTMLInputElement;
          if (detailAddressInput) {
            detailAddressInput.focus();
          }
        }, 100);

        message.success("주소가 설정되었습니다.");
      },
    }).open();
  };

  // 직원 등록 처리
  const handleEmployeeSubmit = async (values: EmployeeFormData) => {
    try {
      setEmployeeModalLoading(true);

      // 필수 필드 검증
      if (!values.fullName) {
        message.error("사원명을 입력해주세요.");
        return;
      }

      if (!values.password) {
        message.error("임시비밀번호를 입력해주세요.");
        return;
      }

      if (!values.email || !values.employeeCode) {
        message.error("이메일과 직원 코드를 입력해주세요.");
        return;
      }

      if (
        !values.companyId ||
        !values.subCompanyId ||
        !values.deptId ||
        !values.posId
      ) {
        message.error("회사, 사업장, 부서, 직책을 모두 선택해주세요.");
        return;
      }

      if (!values.hireDate) {
        message.error("입사일을 선택해주세요.");
        return;
      }

      if (!values.salary || values.salary <= 0) {
        message.error("올바른 급여를 입력해주세요.");
        return;
      }

      // 날짜 변환 처리
      const formData: EmployeeCreateRequest = {
        ...values,
        hireDate: values.hireDate!.format("YYYY-MM-DD"), // 이미 유효성 검증을 통과했으므로 안전
      };

      console.log("🔄 직원 등록 요청:", formData);
      console.log("📋 필수 필드 확인:", {
        fullName: formData.fullName,
        password: formData.password,
        email: formData.email,
        employeeCode: formData.employeeCode,
        hireDate: formData.hireDate,
        companyId: formData.companyId,
        subCompanyId: formData.subCompanyId,
        deptId: formData.deptId,
        posId: formData.posId,
      });

      const response = await createEmployee(formData);

      if (response.success) {
        message.success(
          `${formData.fullName} 직원이 등록되었습니다. ` +
            `입사 발령도 자동으로 생성되었습니다.`
        );
        handleEmployeeModalClose();
        // 직원 목록 새로고침
        fetchEmployees();
      } else {
        message.error(response.message || "직원 등록에 실패했습니다.");
      }
    } catch (error: unknown) {
      console.error("직원 등록 오류:", error);
      const axiosError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        "직원 등록 중 오류가 발생했습니다.";
      message.error(errorMessage);
    } finally {
      setEmployeeModalLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100%",
        maxHeight: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
        width: "100%",
      }}
    >
      <Card
        style={{
          width: "100%",
          height: "100%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
        bodyStyle={{
          padding: 0,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            backgroundColor: "rgb(41, 57, 85)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "6px 6px 0 0",
            borderBottom: "2px solid rgba(255, 255, 255, 0.3)",
            flexShrink: 0,
            height: "40px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Row justify="start" align="middle">
            <Col>
              <Title
                level={3}
                style={{ margin: 0, color: "white", fontSize: "20px" }}
              >
                🏢 사원 관리
              </Title>
            </Col>
          </Row>
        </div>
        {/* 필터 및 검색 */}
        <Row
          gutter={12}
          align="middle"
          style={{
            padding: "8px 16px",
            flexShrink: 0, // 이 영역은 축소되지 않도록 함
            height: "56px", // 고정 높이
            backgroundColor: "#fafafa",
            borderBottom: "1px solid #f0f0f0",
          }}
          justify="space-between"
        >
          <Col span={3}>
            <Select
              placeholder="회사 선택"
              allowClear
              style={{ width: "100%" }}
              value={filters.companyId}
              onChange={(value) => handleFilterChange("companyId", value)}
            >
              {companies.map((company) => (
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
              style={{ width: "100%" }}
              value={filters.subCompanyId}
              onChange={(value) => handleFilterChange("subCompanyId", value)}
              disabled={!filters.companyId}
            >
              {subCompanies.map((subCompany) => (
                <Option
                  key={subCompany.SubCompanyId}
                  value={subCompany.SubCompanyId}
                >
                  {subCompany.SubCompanyName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={3}>
            <Select
              placeholder="부서 선택"
              allowClear
              style={{ width: "100%" }}
              value={filters.deptId}
              onChange={(value) => handleFilterChange("deptId", value)}
              disabled={!filters.subCompanyId}
            >
              {departments.map((dept) => (
                <Option key={dept.DeptId} value={dept.DeptId}>
                  {dept.DeptName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Search
              placeholder="직원명, 이메일, 직원코드로 검색"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              style={{ width: "100%" }}
            />
          </Col>
          <Col span={2}>
            <Select
              placeholder="권한"
              allowClear
              style={{ width: "100%" }}
              value={filters.userRole}
              onChange={(value) => handleFilterChange("userRole", value)}
            >
              <Option value="admin">관리자</Option>
              <Option value="manager">매니저</Option>
              <Option value="employee">직원</Option>
            </Select>
          </Col>
          <Col span={2}>
            <Select
              placeholder="재직"
              style={{ width: "100%" }}
              value={filters.isActive}
              onChange={(value) => handleFilterChange("isActive", value)}
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
              style={{ width: "100%" }}
            >
              새로고침
            </Button>
          </Col>
          <Col span={2}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddEmployee}
              >
                직원 등록
              </Button>
            </div>
          </Col>
        </Row>

        {searchTerm && (
          <div style={{ padding: "8px 16px", backgroundColor: "#f8f9fa" }}>
            <Text type="secondary">
              '{searchTerm}' 검색 결과 ({employees.length}명)
            </Text>
          </div>
        )}

        {/* 직원 목록 테이블 */}
        <style>{`
          .custom-dark-table .ant-table-container {
            border: 1px solid #d9d9d9 !important;
            border-bottom: none !important;
            border-radius: 8px 8px 0 0 !important;
            overflow: hidden !important;
          }
          .custom-dark-table .ant-table {
            border: none !important;
            border-radius: 8px 8px 0 0 !important;
            width: 100% !important;
          }
          .custom-dark-table .ant-table-thead {
            border-top-left-radius: 8px !important;
            border-top-right-radius: 8px !important;
          }
          .custom-dark-table .ant-table-thead > tr > th {
            background-color: rgb(41, 57, 85) !important;
            color: white !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
            border-top: none !important;
          }
          .custom-dark-table .ant-table-thead > tr:first-child > th:first-child {
            border-top-left-radius: 7px !important;
          }
          .custom-dark-table .ant-table-thead > tr:first-child > th:last-child {
            border-top-right-radius: 7px !important;
          }
          .custom-dark-table .ant-table-thead > tr > th::before {
            display: none !important;
          }
          .custom-dark-table .ant-table-body {
            overflow-y: auto !important;
            overflow-x: auto !important;
            max-height: 600px !important;
          }
          .custom-dark-table .ant-table-container {
            height: 100% !important;
            max-height: 650px !important;
          }
          .custom-dark-table .ant-table-tbody > tr > td {
            padding: 8px !important;
          }
          .custom-dark-table .ant-table-thead > tr > th {
            padding: 12px 8px !important;
          }

          /* 스크롤바 스타일링 */
          .custom-dark-table .ant-table-body::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .custom-dark-table .ant-table-body::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .custom-dark-table .ant-table-body::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
          }
          .custom-dark-table .ant-table-body::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
          }

        `}</style>
        {/* 테이블 및 페이지네이션 컨테이너 */}
        <div
          style={{
            flex: 1,
            margin: "8px 16px 16px 16px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minHeight: 0,
            border: "1px solid #f0f0f0",
            borderRadius: "6px",
          }}
        >
          {/* 테이블 영역 */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <Table
              columns={columns}
              dataSource={employees}
              rowKey="employeeId"
              loading={loading}
              pagination={false}
              scroll={{
                x: 1200,
                y: 600, // 높이 증가로 1-2줄 더 표시
              }}
              className="custom-dark-table"
              size="small"
              style={{ height: "100%" }}
            />
          </div>
          {/* 페이지네이션 영역 */}
          <div
            style={{
              padding: "12px 16px",
              backgroundColor: "#fafafa",
              flexShrink: 0,
              height: "48px",
              borderTop: "1px solid #f0f0f0",
              borderRadius: "0 0 6px 6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Pagination
              {...pagination}
              onChange={handleTableChange}
              onShowSizeChange={handleTableChange}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} / 총 ${total}명`
              }
              pageSizeOptions={["9", "18", "27", "36"]}
              size="small"
            />
          </div>
        </div>

        {/* 직원 등록 모달 */}
        <Modal
          title={
            <div
              style={{
                backgroundColor: "rgb(41, 57, 85)",
                color: "white",
                padding: "12px 16px",
                margin: "-24px -24px 24px -24px",
                borderRadius: "6px 6px 0 0",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              {"🏢 직원 등록"}
            </div>
          }
          open={isEmployeeModalOpen}
          onCancel={handleEmployeeModalClose}
          footer={null}
          destroyOnClose
          width={800}
          style={{ top: 20 }}
        >
          <Form
            form={employeeForm}
            layout="vertical"
            onFinish={handleEmployeeSubmit}
            scrollToFirstError
          >
            {/* 기본 정보 섹션 */}
            <Title level={5} style={{ marginBottom: 4 }}>
              기본 정보
            </Title>

            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="employeeCode"
                  label="사원코드"
                  rules={[
                    { required: true, message: "사원코드를 입력해주세요." },
                    {
                      pattern: /^[A-Za-z0-9]+$/,
                      message: "영문과 숫자만 입력 가능합니다.",
                    },
                  ]}
                >
                  <Input placeholder="EMP001" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="fullName"
                  label="사원명"
                  rules={[
                    { required: true, message: "사원명을 입력해주세요." },
                    {
                      min: 2,
                      max: 20,
                      message: "사원명은 2~20자 이내로 입력해주세요.",
                    },
                  ]}
                >
                  <Input placeholder="홍길동" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="password"
                  label="임시비밀번호"
                  rules={[
                    { required: true, message: "임시비밀번호를 입력해주세요." },
                    {
                      min: 6,
                      max: 20,
                      message: "비밀번호는 6~20자 이내로 입력해주세요.",
                    },
                  ]}
                >
                  <Input.Password placeholder="******" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="socialSecurityNumber"
                  label="주민등록번호"
                  rules={[
                    { required: true, message: "주민등록번호를 입력해주세요." },
                    {
                      pattern: /^\d{6}-\d{7}$/,
                      message:
                        "올바른 주민등록번호 형식이 아닙니다. (000000-0000000)",
                    },
                  ]}
                >
                  <Input placeholder="000000-0000000" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="postalCode"
                  label="우편번호"
                  rules={[
                    { required: true, message: "우편번호를 입력해주세요." },
                    {
                      pattern: /^\d{5}$/,
                      message: "우편번호는 5자리 숫자여야 합니다.",
                    },
                  ]}
                >
                  <Search
                    placeholder="12345"
                    maxLength={5}
                    enterButton={<SearchOutlined />}
                    onSearch={handleAddressSearch}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="address"
                  label="주소"
                  rules={[{ required: true, message: "주소를 입력해주세요." }]}
                >
                  <Input placeholder="서울특별시 강남구 테헤란로 123" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="addressDetail" label="상세주소">
                  <Input placeholder="456호" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="phoneNumber"
                  label="전화번호"
                  rules={[
                    {
                      pattern: /^[0-9-+().\s]+$/,
                      message: "올바른 전화번호 형식이 아닙니다.",
                    },
                  ]}
                >
                  <Input placeholder="02-1234-5678" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="mobileNumber"
                  label="핸드폰번호"
                  rules={[
                    { required: true, message: "핸드폰번호를 입력해주세요." },
                    {
                      pattern: /^010-\d{4}-\d{4}$/,
                      message:
                        "올바른 핸드폰번호 형식이 아닙니다. (010-0000-0000)",
                    },
                  ]}
                >
                  <Input placeholder="010-1234-5678" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="email"
                  label="이메일"
                  rules={[
                    { required: true, message: "이메일을 입력해주세요." },
                    {
                      type: "email",
                      message: "올바른 이메일 형식이 아닙니다.",
                    },
                  ]}
                >
                  <Input placeholder="hong@company.com" />
                </Form.Item>
              </Col>
            </Row>

            {/* 조직 정보 섹션 */}
            <Title level={5} style={{ marginTop: 4, marginBottom: 4 }}>
              조직 정보
            </Title>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="hireDate"
                  label="입사일"
                  rules={[
                    { required: true, message: "입사일을 선택해주세요." },
                  ]}
                >
                  <DatePicker
                    style={{ width: "100%" }}
                    placeholder="입사일 선택"
                    format="YYYY-MM-DD"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="companyId"
                  label="회사"
                  rules={[{ required: true, message: "회사를 선택해주세요." }]}
                >
                  <Select
                    placeholder="회사 선택"
                    showSearch
                    optionFilterProp="children"
                    onChange={handleCompanyChange}
                    filterOption={(input, option) =>
                      String(option?.children || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {companies.map((company) => (
                      <Option key={company.CompanyId} value={company.CompanyId}>
                        {company.CompanyName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="subCompanyId"
                  label="사업장"
                  rules={[
                    { required: true, message: "사업장을 선택해주세요." },
                  ]}
                >
                  <Select
                    placeholder="사업장 선택"
                    showSearch
                    optionFilterProp="children"
                    onChange={handleSubCompanyChange}
                    filterOption={(input, option) =>
                      String(option?.children || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {filteredSubCompanies.map((subCompany) => (
                      <Option
                        key={subCompany.SubCompanyId}
                        value={subCompany.SubCompanyId}
                      >
                        {subCompany.SubCompanyName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={6}>
                <Form.Item
                  name="deptId"
                  label="부서"
                  rules={[{ required: true, message: "부서를 선택해주세요." }]}
                >
                  <Select
                    placeholder="부서 선택"
                    showSearch
                    optionFilterProp="children"
                    onChange={handleDepartmentChange}
                    filterOption={(input, option) =>
                      String(option?.children || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {filteredDepartments.map((dept) => (
                      <Option key={dept.DeptId} value={dept.DeptId}>
                        {dept.DeptName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="posId"
                  label="직책"
                  rules={[{ required: true, message: "직책을 선택해주세요." }]}
                >
                  <Select
                    placeholder="직책 선택"
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      String(option?.children || "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  >
                    {positions.map((position) => (
                      <Option key={position.PosId} value={position.PosId}>
                        {position.PosName}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="salaryType"
                  label="급여 유형"
                  rules={[
                    { required: true, message: "급여 유형을 선택해주세요." },
                  ]}
                >
                  <Select placeholder="급여 유형 선택">
                    <Option value="월급">월급</Option>
                    <Option value="연봉">연봉</Option>
                    <Option value="시급">시급</Option>
                    <Option value="일급">일급</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  name="salary"
                  label="기본급 (원)"
                  rules={[
                    { required: true, message: "기본급을 입력해주세요." },
                    {
                      type: "number",
                      min: 0,
                      message: "0 이상의 숫자를 입력해주세요.",
                    },
                  ]}
                >
                  <InputNumber
                    style={{ width: "100%" }}
                    placeholder="3000000"
                    formatter={(value) =>
                      `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) =>
                      Number(value?.replace(/[^\d]/g, "") || 0)
                    }
                    controls={false}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* 추가 정보 섹션 */}
            <Title level={5} style={{ marginTop: 4, marginBottom: 4 }}>
              추가 정보
            </Title>

            <Form.Item
              name="notes"
              label="비고"
              rules={[
                { max: 500, message: "비고는 500자 이내로 입력해주세요." },
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder="특이사항이나 추가 정보를 입력하세요."
                showCount
                maxLength={500}
              />
            </Form.Item>

            {/* 버튼 영역 */}
            <Form.Item
              style={{ marginTop: 32, marginBottom: 0, textAlign: "right" }}
            >
              <Space>
                <Button onClick={handleEmployeeModalClose}>취소</Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={employeeModalLoading}
                  icon={<PlusOutlined />}
                >
                  직원 등록
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default EmployeeList;
