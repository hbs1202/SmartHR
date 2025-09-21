/**
 * 사업장 목록 페이지
 * @description 회사별 등록된 사업장 목록을 조회하는 페이지 컴포넌트
 * @author SmartHR Team
 * @date 2024-09-17
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Card,
  Row,
  Col,
  Input,
  Space,
  Typography,
  message,
  Select,
  Tag,
  Popconfirm,
  Tooltip,
  Pagination,
  Modal,
  Form,
  DatePicker,
  Breadcrumb,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  SaveOutlined,
  CloseOutlined,
  HomeOutlined,
  TeamOutlined,
  BankOutlined,
} from '@ant-design/icons';
import {
  getCompanies,
  type Company,
} from '../services/companyService';
import {
  getWorkplacesByCompany,
  deleteWorkplace,
  createWorkplace,
  updateWorkplace,
  validateWorkplaceForm,
  formatPhoneNumber,
  formatBusinessNumber,
  type SubCompany,
  type SubCompanyListParams,
  type SubCompanyCreateRequest,
} from '../services/subCompanyService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const SubCompanyList: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingSubCompany, setEditingSubCompany] = useState<SubCompany | null>(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  // 검색 필터 상태
  const [filters, setFilters] = useState<SubCompanyListParams>({
    page: 1,
    limit: 10,
    isActive: true,
    search: '',
  });

  /**
   * 회사 목록 조회
   */
  const fetchCompanies = useCallback(async () => {
    try {
      setCompanyLoading(true);
      const response = await getCompanies({ isActive: true });

      if (response && 'companies' in response) {
        const directResponse = response as unknown as { companies: Company[]; pagination: { currentPage: number; pageSize: number; totalCount: number } };
        setCompanies(directResponse.companies);
      } else if (response && response.success && response.data) {
        const data = response.data as { companies: Company[]; pagination: { currentPage: number; pageSize: number; totalCount: number } };
        setCompanies(data.companies);
      } else {
        message.error('회사 목록 조회에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('회사 목록 조회 오류:', error);
      message.error('회사 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setCompanyLoading(false);
    }
  }, []);

  /**
   * 사업장 목록 조회
   */
  const fetchSubCompanies = useCallback(async (companyId: number, params: SubCompanyListParams = filters) => {
    try {
      setLoading(true);

      const response = await getWorkplacesByCompany(companyId, params);

      console.log('사업장 API 전체 응답:', response);

      // response에 직접 subCompanies와 pagination이 있는 경우 처리
      if (response && 'subCompanies' in response) {
        const directResponse = response as unknown as { subCompanies: SubCompany[]; pagination: { currentPage: number; pageSize: number; totalCount: number } };
        console.log('subCompanies 데이터:', directResponse.subCompanies);
        setSubCompanies(directResponse.subCompanies);
        setPagination({
          current: directResponse.pagination.currentPage,
          pageSize: directResponse.pagination.pageSize,
          total: directResponse.pagination.totalCount,
        });
      } else if (response && response.success && response.data) {
        // 기존 구조 지원
        const data = response.data as { subCompanies: SubCompany[]; pagination: { currentPage: number; pageSize: number; totalCount: number } };
        console.log('subCompanies 데이터:', data.subCompanies);
        setSubCompanies(data.subCompanies);
        setPagination({
          current: data.pagination.currentPage,
          pageSize: data.pagination.pageSize,
          total: data.pagination.totalCount,
        });
      } else {
        console.log('조건 실패 - response:', response);
        message.error('사업장 목록 조회에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('사업장 목록 조회 오류:', error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.message || axiosError.message || '사업장 목록 조회 중 오류가 발생했습니다.';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * 윈도우 리사이즈 감지
   */
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /**
   * 컴포넌트 마운트 시 회사 목록 로드
   */
  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  /**
   * 선택된 회사 변경 시 사업장 목록 조회
   */
  useEffect(() => {
    if (selectedCompanyId) {
      fetchSubCompanies(selectedCompanyId);
    } else {
      setSubCompanies([]);
    }
  }, [selectedCompanyId, fetchSubCompanies]);

  /**
   * 컴포넌트 언마운트 시 body 클래스 정리
   */
  useEffect(() => {
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  /**
   * 회사 선택 처리
   */
  const handleCompanyChange = (companyId: number) => {
    setSelectedCompanyId(companyId);

    // 필터 초기화
    const newFilters = {
      page: 1,
      limit: 10,
      isActive: true,
      search: '',
    };
    setFilters(newFilters);
  };

  /**
   * 페이지 변경 처리
   */
  const handleTableChange = (page: number, pageSize?: number) => {
    const newFilters = {
      ...filters,
      page,
      limit: pageSize || filters.limit,
    };
    setFilters(newFilters);
    if (selectedCompanyId) {
      fetchSubCompanies(selectedCompanyId, newFilters);
    }
  };

  /**
   * 검색 처리
   */
  const handleSearch = (value: string) => {
    const newFilters = {
      ...filters,
      search: value,
      page: 1,
    };
    setFilters(newFilters);
    if (selectedCompanyId) {
      fetchSubCompanies(selectedCompanyId, newFilters);
    }
  };

  /**
   * 활성 상태 필터 변경
   */
  const handleActiveFilterChange = (value: boolean | undefined) => {
    const newFilters = {
      ...filters,
      isActive: value,
      page: 1,
    };
    setFilters(newFilters);
    if (selectedCompanyId) {
      fetchSubCompanies(selectedCompanyId, newFilters);
    }
  };

  /**
   * 새로고침
   */
  const handleRefresh = () => {
    if (selectedCompanyId) {
      fetchSubCompanies(selectedCompanyId, filters);
    }
  };

  /**
   * 사업장 등록 모달 열기
   */
  const handleAdd = () => {
    if (!selectedCompanyId) {
      message.warning('사업장을 등록할 회사를 먼저 선택해주세요.');
      return;
    }
    setIsModalOpen(true);
    form.resetFields();
    // 선택된 회사 ID를 폼에 설정
    form.setFieldValue('companyId', selectedCompanyId);
    // 모달 열릴 때 body 스크롤 방지
    document.body.classList.add('modal-open');
  };

  /**
   * 모달 닫기
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingSubCompany(null);
    form.resetFields();
    // 모달 닫힐 때 body 스크롤 복원
    document.body.classList.remove('modal-open');
  };

  /**
   * 사업장 등록/수정 처리
   */
  const handleModalSubmit = async (values: SubCompanyCreateRequest) => {
    try {
      setModalLoading(true);

      // 폼 유효성 검증
      const validation = validateWorkplaceForm(values);
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          message.error(error);
        });
        return;
      }

      // 날짜 변환 처리 (시간대 문제 해결)
      const processedValues = {
        ...values,
        openDate: values.openDate ? (typeof values.openDate === 'string' ? values.openDate : values.openDate.format('YYYY-MM-DD')) : null
      };

      let response;

      if (isEditMode && editingSubCompany) {
        // 사업장 수정 API 호출
        response = await updateWorkplace(editingSubCompany.SubCompanyId, processedValues);
      } else {
        // 사업장 등록 API 호출
        response = await createWorkplace(processedValues);
      }

      console.log('API 응답 전체:', response);
      console.log('response.success:', response?.success);
      console.log('response 타입:', typeof response);

      // 성공 조건을 더 유연하게 처리
      if (response && (response.success === true || String(response.success) === 'true' || !('success' in response))) {
        if (isEditMode) {
          message.success('사업장 정보가 성공적으로 수정되었습니다.');
        } else {
          message.success('사업장이 성공적으로 등록되었습니다.');
        }
        handleModalClose();
        // 목록 새로고침
        if (selectedCompanyId) {
          fetchSubCompanies(selectedCompanyId, filters);
        }
      } else {
        console.log('실패 처리됨 - response.success:', response?.success);
        const errorMessage = isEditMode
          ? (response?.message || '사업장 수정에 실패했습니다.')
          : (response?.message || '사업장 등록에 실패했습니다.');
        message.error(errorMessage);
      }
    } catch (error: unknown) {
      console.error('사업장 등록 오류:', error);

      // 서버에서 반환한 구체적인 에러 메시지 사용
      const axiosError = error as { response?: { data?: { message?: string }; status?: number }; message?: string };

      if (axiosError.response?.data?.message) {
        message.error(axiosError.response.data.message);
      } else if (axiosError.response?.status === 400) {
        message.error('입력 정보를 확인해주세요.');
      } else if (axiosError.response?.status === 409) {
        message.error('이미 존재하는 사업장 정보입니다.');
      } else if (axiosError.message) {
        message.error(axiosError.message);
      } else {
        message.error('사업장 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setModalLoading(false);
    }
  };

  /**
   * 다음 우편번호 검색
   */
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
      oncomplete: function(data) {
        // 팝업에서 검색결과 항목을 클릭했을때 실행할 코드를 작성하는 부분
        let addr = ''; // 주소 변수
        let extraAddr = ''; // 참고항목 변수

        // 사용자가 선택한 주소 타입에 따라 해당 주소 값을 가져온다
        if (data.userSelectedType === 'R') { // 사용자가 도로명 주소를 선택했을 경우
          addr = data.roadAddress;
        } else { // 사용자가 지번 주소를 선택했을 경우(J)
          addr = data.jibunAddress;
        }

        // 사용자가 선택한 주소가 도로명 타입일때 참고항목을 조합한다
        if(data.userSelectedType === 'R'){
          // 법정동명이 있을 경우 추가한다. (법정리는 제외)
          // 법정동의 경우 마지막 문자가 "동/로/가"로 끝난다
          if(data.bname !== '' && /[동|로|가]$/g.test(data.bname)){
            extraAddr += data.bname;
          }
          // 건물명이 있고, 공동주택일 경우 추가한다
          if(data.buildingName !== '' && data.apartment === 'Y'){
            extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
          }
          // 표시할 참고항목이 있을 경우, 괄호까지 추가한 최종 문자열을 만든다
          if(extraAddr !== ''){
            extraAddr = ' (' + extraAddr + ')';
          }
        }

        // 우편번호와 주소 정보를 폼에 설정
        form.setFieldValue('postalCode', data.zonecode);
        form.setFieldValue('address', addr + extraAddr);

        // 상세주소 입력란으로 포커스 이동
        // 약간의 딜레이 후 상세주소 필드로 포커스 이동
        setTimeout(() => {
          const detailAddressInput = document.querySelector('input[placeholder="예: 456호"]') as HTMLInputElement;
          if (detailAddressInput) {
            detailAddressInput.focus();
          }
        }, 100);

        message.success('주소가 설정되었습니다.');
      }
    }).open();
  };

  /**
   * 사업장 수정
   */
  const handleEdit = (subCompany: SubCompany) => {
    setIsEditMode(true);
    setEditingSubCompany(subCompany);

    // 폼에 기존 데이터 설정 (camelCase로 변환)
    form.setFieldsValue({
      companyId: subCompany.CompanyId,
      subCompanyCode: subCompany.SubCompanyCode,
      subCompanyName: subCompany.SubCompanyName,
      businessNumber: subCompany.BusinessNumber,
      ceoName: subCompany.CeoName,
      industry: subCompany.Industry,
      businessType: subCompany.BusinessType,
      subCompanyType: subCompany.SubCompanyType,
      address: subCompany.Address,
      addressDetail: subCompany.AddressDetail,
      postalCode: subCompany.PostalCode,
      phoneNumber: subCompany.PhoneNumber,
      faxNumber: subCompany.FaxNumber,
      email: subCompany.Email,
      managerEmployeeId: subCompany.ManagerEmployeeId,
      openDate: subCompany.OpenDate ? dayjs(subCompany.OpenDate) : null,
      area: subCompany.Area,
      floorCount: subCompany.FloorCount,
      parkingSpots: subCompany.ParkingSpots,
      description: subCompany.Description,
      isHeadquarters: subCompany.IsHeadquarters,
    });

    setIsModalOpen(true);
  };

  /**
   * 사업장 삭제
   */
  const handleDelete = async (subCompany: SubCompany) => {
    try {
      const response = await deleteWorkplace(subCompany.SubCompanyId);

      console.log('삭제 API 응답:', response);

      // 유연한 성공 조건 처리 (회사 등록과 동일한 패턴)
      if (response && (response.success === true || String(response.success) === 'true' || !('success' in response))) {
        message.success(`${subCompany.SubCompanyName}이(가) 성공적으로 삭제되었습니다.`);
        // 목록 새로고침
        if (selectedCompanyId) {
          fetchSubCompanies(selectedCompanyId, filters);
        }
      } else {
        console.log('삭제 실패 처리됨 - response.success:', response?.success);
        message.error(response?.message || '사업장 삭제에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('사업장 삭제 오류:', error);
      const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage = axiosError.response?.data?.message || axiosError.message || '사업장 삭제 중 오류가 발생했습니다.';
      message.error(errorMessage);
    }
  };

  /**
   * 테이블 컬럼 정의
   */
  const columns: ColumnsType<SubCompany> = [
    {
      title: '사업장 코드',
      dataIndex: 'SubCompanyCode',
      key: 'SubCompanyCode',
      width: 120,
      render: (code: string) => <Text strong>{code}</Text>,
    },
    {
      title: '사업장명',
      dataIndex: 'SubCompanyName',
      key: 'SubCompanyName',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: '사업장 유형',
      dataIndex: 'SubCompanyType',
      key: 'SubCompanyType',
      width: 120,
      render: (type: string) => type || '-',
    },
    {
      title: '주소',
      dataIndex: 'Address',
      key: 'Address',
      width: 200,
      render: (address: string) => address || '-',
    },
    {
      title: '매니저 ID',
      dataIndex: 'ManagerEmployeeId',
      key: 'ManagerEmployeeId',
      width: 120,
      render: (id: number) => id || '-',
    },
    {
      title: '전화번호',
      dataIndex: 'PhoneNumber',
      key: 'PhoneNumber',
      width: 140,
      render: (phone: string) => phone || '-',
    },
    {
      title: '상태',
      dataIndex: 'IsActive',
      key: 'IsActive',
      width: 80,
      align: 'center',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? '활성' : '비활성'}
        </Tag>
      ),
    },
    {
      title: '등록일',
      dataIndex: 'CreatedAt',
      key: 'CreatedAt',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '작업',
      key: 'actions',
      width: 100,
      align: 'center',
      render: (_, record: SubCompany) => (
        <Space size="small">
          <Tooltip title="수정">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="삭제">
            <Popconfirm
              title="사업장 삭제"
              description={`'${record.SubCompanyName}'을(를) 정말 삭제하시겠습니까?`}
              onConfirm={() => handleDelete(record)}
              okText="삭제"
              cancelText="취소"
              okType="danger"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '12px', width: '100%', maxWidth: '100%', height: `${windowHeight - 64}px`, overflow: 'auto', boxSizing: 'border-box' }}>
      {/* 경로 표시 (Breadcrumb) */}
      <Breadcrumb
        style={{ marginBottom: '16px' }}
        items={[
          {
            href: '#',
            title: (
              <Space>
                <HomeOutlined />
                <span>홈</span>
              </Space>
            ),
          },
          {
            href: '#',
            title: (
              <Space>
                <TeamOutlined />
                <span>조직관리</span>
              </Space>
            ),
          },
          {
            title: (
              <Space>
                <BankOutlined />
                <span>사업장 관리</span>
              </Space>
            ),
          },
        ]}
      />

      <style>{`
        body, html {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          height: 100vh !important;
          overflow-y: hidden !important;
        }
        .ant-layout {
          overflow-x: hidden !important;
          max-width: 100vw !important;
          height: 100vh !important;
          overflow-y: hidden !important;
        }
        .ant-layout-content {
          height: calc(100vh - 64px) !important;
          overflow-y: hidden !important;
        }
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
          overflow-x: auto !important;
        }
        .custom-dark-table .ant-table-tbody > tr > td {
          padding: 8px !important;
        }
        .custom-dark-table .ant-table-thead > tr > th {
          padding: 12px 8px !important;
        }
      `}</style>

      {/* 회사 선택 카드 */}
      <Card
        style={{
          marginBottom: '16px',
          maxHeight: selectedCompanyId ? `${windowHeight - 160}px` : 'auto',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        bodyStyle={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          overflow: 'hidden'
        }}
      >
        <div style={{
          backgroundColor: 'rgb(41, 57, 85)',
          color: 'white',
          padding: '12px 20px 8px 20px',
          margin: '-24px -24px 16px -24px',
          borderRadius: '6px 6px 0 0',
          borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
        }}>
          <Title level={4} style={{ margin: 0, color: 'white', fontSize: '16px' }}>
            🏭 사업장 관리
          </Title>
        </div>

        <Row gutter={24} align="middle" justify="space-between" style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={8} md={6} style={{ minWidth: '350px' }}>
            <Space align="center" style={{ width: '100%' }}>
              <Text strong style={{ fontSize: '14px', color: '#333', whiteSpace: 'nowrap' }}>회사선택:</Text>
              <Select
                placeholder="회사를 선택하세요"
                style={{ width: '350px' }}
                size="large"
                loading={companyLoading}
                value={selectedCompanyId}
                onChange={handleCompanyChange}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {companies.map(company => (
                  <Option key={company.CompanyId} value={company.CompanyId}>
                    [{company.CompanyCode}] {company.CompanyName}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>

          {selectedCompanyId && (
            <Col>
              <Row gutter={16} align="middle">
                <Col>
                  <Search
                    placeholder="사업장명, 사업장코드, 대표자명으로 검색"
                    allowClear
                    enterButton={<SearchOutlined />}
                    size="large"
                    onSearch={handleSearch}
                    style={{ width: '400px' }}
                  />
                </Col>
                <Col>
                  <Select
                    placeholder="상태"
                    allowClear
                    size="large"
                    style={{ width: '140px' }}
                    onChange={handleActiveFilterChange}
                    value={filters.isActive}
                  >
                    <Option value={true}>활성</Option>
                    <Option value={false}>비활성</Option>
                  </Select>
                </Col>
                <Col>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    size="large"
                    style={{ width: '130px' }}
                  >
                    새로고침
                  </Button>
                </Col>
                <Col>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    size="large"
                  >
                    사업장 등록
                  </Button>
                </Col>
              </Row>
            </Col>
          )}
        </Row>


        {selectedCompanyId && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            marginTop: '16px',
            minHeight: subCompanies.length > 0 ? 'auto' : '300px'
          }}>
            {/* 테이블 영역 */}
            <Table
              columns={columns}
              dataSource={subCompanies}
              rowKey="SubCompanyId"
              loading={loading}
              pagination={false}
              size="small"
              scroll={{
                x: 'max-content',
                y: subCompanies.length > 0
                  ? Math.min(subCompanies.length * 47 + 55, windowHeight - 520) // 47px per row + 55px header, much larger buffer for pagination
                  : 200 // minimum height when no data
              }}
              style={{
                backgroundColor: 'rgb(41, 57, 85)',
                color: 'white',
                width: '100%'
              }}
              className="custom-dark-table"
            />

            {/* 페이지네이션 - Card 내부 하단 */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              display: 'flex',
              justifyContent: 'flex-end',
              flexShrink: 0,
              borderTop: '1px solid #f0f0f0',
              backgroundColor: '#fff',
              minHeight: '60px',
              alignItems: 'center'
            }}>
              <Pagination
                current={pagination.current}
                pageSize={pagination.pageSize}
                total={pagination.total}
                showSizeChanger={true}
                showQuickJumper={true}
                showTotal={(total, range) =>
                  `${range[0]}-${range[1]} / 총 ${total}건`
                }
                onChange={handleTableChange}
                onShowSizeChange={handleTableChange}
                size="default"
              />
            </div>
          </div>
        )}
        {!selectedCompanyId && (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <BankOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Text style={{ fontSize: '16px', color: '#999' }}>
              회사를 먼저 선택해주세요.
            </Text>
          </div>
        )}
      </Card>

      {/* 사업장등록 모달 */}
      <style>{`
        .ant-modal-close {
          color: white !important;
        }
        .ant-modal-close:hover {
          color: rgba(255, 255, 255, 0.8) !important;
        }
        .ant-modal-close .ant-modal-close-x {
          color: white !important;
        }
        .ant-modal-root {
          overflow: hidden !important;
        }
        body.modal-open {
          overflow: hidden !important;
          padding-right: 0 !important;
        }
        .ant-layout {
          min-height: 100vh !important;
          overflow-x: hidden !important;
        }
      `}</style>
      <Modal
        title={
          <div style={{
            backgroundColor: 'rgb(41, 57, 85)',
            color: 'white',
            padding: '12px 16px',
            margin: '-24px -24px 24px -24px',
            borderRadius: '6px 6px 0 0',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            {isEditMode ? '🏭 사업장 수정' : '🏭 사업장 등록'}
          </div>
        }
        open={isModalOpen}
        onCancel={handleModalClose}
        footer={null}
        width="90%"
        style={{ maxWidth: '1000px' }}
        destroyOnHidden
        getContainer={false}
        mask={true}
        maskClosable={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleModalSubmit}
          scrollToFirstError
        >
          {/* 숨겨진 회사 ID 필드 */}
          <Form.Item name="companyId" style={{ display: 'none' }}>
            <Input type="hidden" />
          </Form.Item>

          {/* 첫 번째 줄: 사업장코드, 사업장명, 사업자등록번호 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="사업장 코드"
                name="subCompanyCode"
                rules={[
                  { required: true, message: '사업장 코드를 입력해주세요.' },
                  { min: 2, message: '사업장 코드는 최소 2자 이상이어야 합니다.' },
                ]}
              >
                <Input placeholder="예: SC001" maxLength={20} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="사업장명"
                name="subCompanyName"
                rules={[
                  { required: true, message: '사업장명을 입력해주세요.' },
                  { min: 2, message: '사업장명은 최소 2자 이상이어야 합니다.' },
                ]}
              >
                <Input placeholder="예: 본사 사업장" maxLength={200} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="사업자등록번호"
                name="businessNumber"
                rules={[
                  {
                    pattern: /^\d{3}-\d{2}-\d{5}$/,
                    message: '올바른 사업자등록번호 형식이 아닙니다. (000-00-00000)',
                  },
                ]}
              >
                <Input
                  placeholder="123-45-67890"
                  maxLength={12}
                  onChange={(e) => {
                    const formatted = formatBusinessNumber(e.target.value);
                    form.setFieldValue('businessNumber', formatted);
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 두 번째 줄: 사업장유형, 대표자, 설립일 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="사업장 유형"
                name="subCompanyType"
              >
                <Input placeholder="예: 지점, 지사, 영업소" maxLength={100} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="대표자명" name="ceoName">
                <Input placeholder="홍길동" maxLength={50} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item label="설립일" name="openDate">
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="설립일을 선택하세요"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* 세 번째 줄: 업종, 업태 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item label="업종" name="industry">
                <Input placeholder="예: IT서비스업" maxLength={50} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="업태" name="businessType">
                <Input placeholder="예: 소프트웨어 개발" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item
                label="우편번호"
                name="postalCode"
                rules={[
                  {
                    pattern: /^\d{5}$/,
                    message: '우편번호는 5자리 숫자여야 합니다.',
                  },
                ]}
              >
                <Input
                  placeholder="12345"
                  maxLength={5}
                  addonAfter={
                    <Button
                      size="small"
                      icon={<SearchOutlined />}
                      onClick={handleAddressSearch}
                      style={{
                        backgroundColor: 'rgb(41, 57, 85)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      조회
                    </Button>
                  }
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item label="주소" name="address">
                <Input placeholder="예: 서울특별시 강남구 테헤란로 123" maxLength={200} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item label="상세주소" name="addressDetail">
                <Input placeholder="예: 456호" maxLength={100} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="전화번호"
                name="phoneNumber"
                rules={[
                  {
                    pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
                    message: '올바른 전화번호 형식이 아닙니다. (000-0000-0000)',
                  },
                ]}
              >
                <Input
                  placeholder="02-1234-5678"
                  maxLength={13}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    form.setFieldValue('phoneNumber', formatted);
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="팩스번호"
                name="faxNumber"
                rules={[
                  {
                    pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
                    message: '올바른 팩스번호 형식이 아닙니다. (000-0000-0000)',
                  },
                ]}
              >
                <Input
                  placeholder="02-1234-5679"
                  maxLength={13}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    form.setFieldValue('faxNumber', formatted);
                  }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="이메일"
                name="email"
                rules={[
                  {
                    type: 'email',
                    message: '올바른 이메일 형식이 아닙니다.',
                  },
                ]}
              >
                <Input placeholder="workplace@example.com" maxLength={100} />
              </Form.Item>
            </Col>
          </Row>

          {/* 버튼 */}
          <Row justify="end" style={{ marginTop: '24px' }}>
            <Space>
              <Button onClick={handleModalClose} icon={<CloseOutlined />}>
                취소
              </Button>
              <Button
                htmlType="submit"
                loading={modalLoading}
                icon={<SaveOutlined />}
                style={{
                  backgroundColor: 'rgb(41, 57, 85)',
                  color: 'white',
                  border: 'none'
                }}
              >
                {isEditMode ? '수정' : '등록'}
              </Button>
            </Space>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SubCompanyList;