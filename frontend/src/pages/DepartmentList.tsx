import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Typography,
  Row,
  Col,
  message,
  Popconfirm
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { departmentService, type Department, type DepartmentCreateRequest } from '../services/departmentService';
import { getCompanies, type Company, type CompanyListResponse } from '../services/companyService';
import { getWorkplacesByCompany, type SubCompany, type SubCompanyListResponse } from '../services/subCompanyService';
import type { ApiResponse } from '../types/api';

const { Title } = Typography;
const { Option } = Select;

interface DepartmentFormData {
  subCompanyId: number;
  deptCode: string;
  deptName: string;
  parentDeptId?: number;
  establishDate?: string;
}

const DepartmentList: React.FC = () => {
  // 상태 관리
  const [departments, setDepartments] = useState<Department[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [availableParentDepts, setAvailableParentDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form] = Form.useForm();

  // 필터 상태
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedSubCompanyId, setSelectedSubCompanyId] = useState<number | null>(null);
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(true);

  // 페이지네이션
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // 초기 데이터 로드
  useEffect(() => {
    loadCompanies();
  }, []);

  // 회사 목록 로드
  const loadCompanies = async () => {
    try {
      const response = await getCompanies();
      console.log('getCompanies 응답 전체 구조:', response);
      console.log('response.data 구조:', response.data);

      // 안전한 데이터 접근 (실제 응답 구조에 맞게 수정)
      const companies = (response as ApiResponse<CompanyListResponse> & CompanyListResponse)?.companies || [];
      console.log('추출된 companies:', companies);
      setCompanies(companies);
    } catch (error) {
      console.error('회사 목록 로드 에러:', error);
      message.error('회사 목록을 불러오는데 실패했습니다.');
    }
  };

  // 사업장 목록 로드
  const loadSubCompanies = async (companyId: number) => {
    try {
      console.log('전달된 companyId:', companyId);
      const response = await getWorkplacesByCompany(companyId);
      console.log('getWorkplacesByCompany 응답 전체 구조:', response);
      console.log('response.data 구조:', response.data);

      // 안전한 데이터 접근 (실제 응답 구조에 맞게 수정)
      const subCompanies = (response as ApiResponse<SubCompanyListResponse> & SubCompanyListResponse)?.subCompanies || [];
      console.log('추출된 subCompanies:', subCompanies);
      setSubCompanies(subCompanies);
    } catch (error) {
      console.error('사업장 목록 로드 에러:', error);
      message.error('사업장 목록을 불러오는데 실패했습니다.');
    }
  };

  // 부서 목록 로드
  const loadDepartments = useCallback(async () => {
    if (!selectedSubCompanyId) return;

    setLoading(true);
    try {
      const data = await departmentService.getDepartments({
        companyId: selectedCompanyId || undefined,
        subCompanyId: selectedSubCompanyId,
        page: currentPage,
        limit: pageSize,
        isActive: isActiveFilter
      });

      setDepartments(data.departments || []);
      setTotal(data.pagination?.total || 0);

      // 상위 부서 선택용 리스트 (현재 사업장의 부서만)
      setAvailableParentDepts(data.departments || []);
    } catch (error) {
      console.error('부서 목록 로드 에러:', error);
      message.error('부서 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, selectedSubCompanyId, currentPage, pageSize, isActiveFilter]);

  // 회사 선택 시
  const handleCompanyChange = (companyId: number) => {
    setSelectedCompanyId(companyId);
    setSelectedSubCompanyId(null);
    setSubCompanies([]);
    setDepartments([]);
    loadSubCompanies(companyId);
  };

  // 사업장 선택 시
  const handleSubCompanyChange = (subCompanyId: number) => {
    setSelectedSubCompanyId(subCompanyId);
    setCurrentPage(1);
  };

  // 사업장 선택 후 부서 목록 로드
  useEffect(() => {
    if (selectedSubCompanyId) {
      loadDepartments();
    }
  }, [selectedSubCompanyId, loadDepartments]);

  // 활성/비활성 필터 변경
  const handleActiveFilterChange = (value: boolean | null) => {
    setIsActiveFilter(value);
    setCurrentPage(1);
  };

  // 부서 등록/수정 모달 열기
  const showModal = (dept?: Department) => {
    setEditingDept(dept || null);
    setIsModalVisible(true);

    if (dept) {
      // 수정 모드
      form.setFieldsValue({
        subCompanyId: dept.SubCompanyId,
        deptCode: dept.DeptCode,
        deptName: dept.DeptName,
        parentDeptId: dept.ParentDeptId,
        establishDate: dept.EstablishDate ? dayjs(dept.EstablishDate) : null
      });
    } else {
      // 등록 모드
      form.setFieldsValue({
        subCompanyId: selectedSubCompanyId,
        deptCode: '',
        deptName: '',
        parentDeptId: null,
        establishDate: null
      });
    }
  };

  // 모달 닫기
  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingDept(null);
    form.resetFields();
  };

  // 부서 등록/수정
  const handleSubmit = async (values: DepartmentFormData) => {
    try {
      const submitData: DepartmentCreateRequest = {
        subCompanyId: values.subCompanyId,
        deptCode: values.deptCode,
        deptName: values.deptName,
        parentDeptId: values.parentDeptId || null,
        establishDate: values.establishDate || null
      };

      if (editingDept) {
        // 수정
        await departmentService.updateDepartment(editingDept.DeptId, submitData);
        message.success('부서가 성공적으로 수정되었습니다.');
      } else {
        // 등록
        await departmentService.createDepartment(submitData);
        message.success('부서가 성공적으로 등록되었습니다.');
      }

      setIsModalVisible(false);
      form.resetFields();
      loadDepartments();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '부서 저장에 실패했습니다.';
      message.error(errorMessage);
    }
  };

  // 부서 삭제
  const handleDelete = async (deptId: number) => {
    try {
      await departmentService.deleteDepartment(deptId);
      message.success('부서가 성공적으로 삭제되었습니다.');
      loadDepartments();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '부서 삭제에 실패했습니다.';
      message.error(errorMessage);
    }
  };

  // 테이블 컬럼 정의
  const columns: ColumnsType<Department> = [
    {
      title: '부서코드',
      dataIndex: 'DeptCode',
      key: 'DeptCode',
      width: 120,
    },
    {
      title: '부서명',
      dataIndex: 'DeptName',
      key: 'DeptName',
      width: 300,
    },
    {
      title: '상위부서',
      dataIndex: 'ParentDeptName',
      key: 'ParentDeptName',
      width: 200,
      render: (text: string) => text || '-',
    },
    {
      title: '신설일',
      dataIndex: 'EstablishDate',
      key: 'EstablishDate',
      width: 120,
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD') : '-',
    },
    {
      title: '상태',
      dataIndex: 'IsActive',
      key: 'IsActive',
      width: 100,
      align: 'center',
      render: (isActive: boolean) => (
        <span style={{ color: isActive ? '#52c41a' : '#ff4d4f' }}>
          {isActive ? '활성' : '비활성'}
        </span>
      ),
    },
    {
      title: '작업',
      key: 'action',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => showModal(record)}
            size="small"
          />
          <Popconfirm
            title="이 부서를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.DeptId)}
            okText="삭제"
            cancelText="취소"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <Title level={2}>부서 관리</Title>

        {/* 필터 영역 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Select
              placeholder="회사 선택"
              style={{ width: '100%' }}
              value={selectedCompanyId}
              onChange={handleCompanyChange}
              allowClear
            >
              {companies.map((company, index) => (
                <Option key={company.CompanyId || `company-${index}`} value={company.CompanyId}>
                  {company.CompanyName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="사업장 선택"
              style={{ width: '100%' }}
              value={selectedSubCompanyId}
              onChange={handleSubCompanyChange}
              disabled={!selectedCompanyId}
              allowClear
            >
              {subCompanies.map((subCompany, index) => (
                <Option key={subCompany.SubCompanyId || `subcompany-${index}`} value={subCompany.SubCompanyId}>
                  {subCompany.SubCompanyName}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <Select
              placeholder="상태 선택"
              style={{ width: '100%' }}
              value={isActiveFilter}
              onChange={handleActiveFilterChange}
              allowClear
              disabled={!selectedSubCompanyId}
            >
              <Option value={true}>활성</Option>
              <Option value={false}>비활성</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => showModal()}
              disabled={!selectedSubCompanyId}
            >
              부서 등록
            </Button>
          </Col>
        </Row>

        {/* 테이블 */}
        <Table
          columns={columns}
          dataSource={departments}
          rowKey="DeptId"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}개`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 10);
            },
          }}
        />
      </Card>

      {/* 부서 등록/수정 모달 */}
      <Modal
        title={editingDept ? '부서 수정' : '부서 등록'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
        >
          <Form.Item
            name="subCompanyId"
            label="사업장"
            rules={[{ required: true, message: '사업장을 선택해주세요.' }]}
          >
            <Select placeholder="사업장 선택" disabled={!!editingDept}>
              {subCompanies.map((subCompany, index) => (
                <Option key={subCompany.SubCompanyId || `subcompany-${index}`} value={subCompany.SubCompanyId}>
                  {subCompany.SubCompanyName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="deptCode"
                label="부서코드"
                rules={[
                  { required: true, message: '부서코드를 입력해주세요.' },
                  { max: 20, message: '부서코드는 20자 이내로 입력해주세요.' }
                ]}
              >
                <Input placeholder="예: DEV001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="deptName"
                label="부서명"
                rules={[
                  { required: true, message: '부서명을 입력해주세요.' },
                  { max: 200, message: '부서명은 200자 이내로 입력해주세요.' }
                ]}
              >
                <Input placeholder="예: 개발팀" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="parentDeptId" label="상위부서">
                <Select placeholder="상위부서 선택 (선택사항)" allowClear>
                  {availableParentDepts
                    .filter(dept => !editingDept || dept.DeptId !== editingDept.DeptId)
                    .map((dept, index) => (
                      <Option key={dept.DeptId || `dept-${index}`} value={dept.DeptId}>
                        {dept.DeptName}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="establishDate" label="신설일">
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="신설일 선택 (선택사항)"
                  format="YYYY-MM-DD"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancel}>취소</Button>
              <Button type="primary" htmlType="submit">
                {editingDept ? '수정' : '등록'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DepartmentList;