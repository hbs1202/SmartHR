/**
 * 회사등록 페이지
 * @description 새로운 회사를 등록하는 페이지 컴포넌트
 * @author SmartHR Team
 * @date 2024-09-17
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Row,
  Col,
  DatePicker,
  Space,
  Divider,
  Typography,
  message,
  Select,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  createCompany,
  validateCompanyForm,
  formatBusinessNumber,
  formatCorporateNumber,
  formatPhoneNumber,
  type CompanyCreateRequest,
} from '../services/companyService';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

const CompanyRegister: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 업종 옵션
  const industryOptions = [
    '제조업',
    'IT서비스업',
    '소프트웨어개발업',
    '건설업',
    '도소매업',
    '음식점업',
    '숙박업',
    '운수업',
    '금융업',
    '부동산업',
    '전문서비스업',
    '교육서비스업',
    '보건업',
    '사회복지서비스업',
    '문화예술업',
    '기타서비스업',
  ];

  /**
   * 폼 제출 처리
   * @param values 폼 데이터
   */
  const handleSubmit = async (values: CompanyCreateRequest) => {
    try {
      setLoading(true);

      // 날짜 포맷팅
      const formData: CompanyCreateRequest = {
        ...values,
        establishDate: values.establishDate ? dayjs(values.establishDate).format('YYYY-MM-DD') : undefined,
      };

      // 폼 유효성 검증
      const validation = validateCompanyForm(formData);
      if (!validation.isValid) {
        message.error(validation.errors.join('\n'));
        return;
      }

      console.log('회사 등록 데이터:', formData);

      // 회사 등록 API 호출
      const response = await createCompany(formData);

      console.log('API 응답 전체:', response);
      console.log('response.success:', response?.success);
      console.log('response 타입:', typeof response);

      // 성공 조건을 더 유연하게 처리
      if (response && (response.success === true || String(response.success) === 'true' || !('success' in response))) {
        message.success('회사가 성공적으로 등록되었습니다.');
        console.log('등록된 회사:', response.data || response);

        // 회사 목록 페이지로 이동
        navigate('/organization/company');
      } else {
        console.log('실패 처리됨 - response.success:', response?.success);
        message.error(response?.message || '회사 등록에 실패했습니다.');
      }
    } catch (error: unknown) {
      console.error('회사 등록 오류:', error);

      // 서버에서 반환한 구체적인 에러 메시지 사용
      const axiosError = error as { response?: { data?: { message?: string }; status?: number }; message?: string };

      if (axiosError.response?.data?.message) {
        message.error(axiosError.response.data.message);
      } else if (axiosError.response?.status === 400) {
        message.error('입력 정보를 확인해주세요.');
      } else if (axiosError.response?.status === 409) {
        message.error('이미 존재하는 회사 정보입니다.');
      } else if (axiosError.message) {
        message.error(axiosError.message);
      } else {
        message.error('회사 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 취소 버튼 클릭 처리
   */
  const handleCancel = () => {
    navigate('/organization/company');
  };

  /**
   * 사업자등록번호 입력 포맷팅
   */
  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatBusinessNumber(e.target.value);
    form.setFieldValue('businessNumber', formatted);
  };

  /**
   * 법인번호 입력 포맷팅
   */
  const handleCorporateNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCorporateNumber(e.target.value);
    form.setFieldValue('corporateNumber', formatted);
  };

  /**
   * 전화번호 입력 포맷팅
   */
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    form.setFieldValue('phoneNumber', formatted);
  };

  /**
   * 팩스번호 입력 포맷팅
   */
  const handleFaxNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    form.setFieldValue('faxNumber', formatted);
  };

  /**
   * 주소 검색 (다음/카카오 주소 API 연동 예정)
   */
  const handleAddressSearch = () => {
    // TODO: 다음/카카오 주소 API 연동
    message.info('주소 검색 기능은 추후 구현 예정입니다.');
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        style={{ maxWidth: '800px', margin: '0 auto' }}
        title={
          <Space>
            <Title level={3} style={{ margin: 0 }}>
              🏢 회사 등록
            </Title>
          </Space>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          autoComplete="off"
          size="large"
        >
          {/* 기본 정보 */}
          <Title level={4}>📋 기본 정보</Title>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="회사 코드"
                name="companyCode"
                rules={[
                  { required: true, message: '회사 코드를 입력해주세요.' },
                  { min: 2, message: '회사 코드는 최소 2자 이상이어야 합니다.' },
                  { max: 20, message: '회사 코드는 최대 20자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="예: SMART001" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="회사명"
                name="companyName"
                rules={[
                  { required: true, message: '회사명을 입력해주세요.' },
                  { min: 2, message: '회사명은 최소 2자 이상이어야 합니다.' },
                  { max: 100, message: '회사명은 최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="예: 스마트에이치알(주)" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 사업자 정보 */}
          <Title level={4}>🏢 사업자 정보</Title>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="사업자등록번호"
                name="businessNumber"
                rules={[
                  {
                    pattern: /^\d{3}-\d{2}-\d{5}$/,
                    message: '사업자등록번호 형식이 올바르지 않습니다. (000-00-00000)',
                  },
                ]}
              >
                <Input
                  placeholder="000-00-00000"
                  maxLength={12}
                  onChange={handleBusinessNumberChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="법인번호"
                name="corporateNumber"
                rules={[
                  {
                    pattern: /^\d{6}-\d{7}$/,
                    message: '법인번호 형식이 올바르지 않습니다. (000000-0000000)',
                  },
                ]}
              >
                <Input
                  placeholder="000000-0000000"
                  maxLength={14}
                  onChange={handleCorporateNumberChange}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="대표자명"
                name="ceoName"
                rules={[
                  { max: 50, message: '대표자명은 최대 50자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="예: 홍길동" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="설립일"
                name="establishDate"
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="설립일 선택"
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="업종"
                name="industry"
                rules={[
                  { max: 50, message: '업종은 최대 50자까지 입력 가능합니다.' },
                ]}
              >
                <Select
                  placeholder="업종 선택"
                  showSearch
                  allowClear
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {industryOptions.map((industry) => (
                    <Option key={industry} value={industry}>
                      {industry}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="업태"
                name="businessType"
                rules={[
                  { max: 50, message: '업태는 최대 50자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="예: 소프트웨어 개발" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 주소 정보 */}
          <Title level={4}>📍 주소 정보</Title>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
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
                  placeholder="00000"
                  maxLength={5}
                  addonAfter={
                    <Button
                      type="text"
                      icon={<SearchOutlined />}
                      onClick={handleAddressSearch}
                      style={{ border: 'none', padding: '0 8px' }}
                    >
                      주소검색
                    </Button>
                  }
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="주소"
                name="address"
                rules={[
                  { max: 200, message: '주소는 최대 200자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="예: 서울특별시 강남구 테헤란로 123" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item
                label="상세주소"
                name="addressDetail"
                rules={[
                  { max: 100, message: '상세주소는 최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="예: 스마트빌딩 10층 1001호" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 연락처 정보 */}
          <Title level={4}>📞 연락처 정보</Title>
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                label="전화번호"
                name="phoneNumber"
                rules={[
                  {
                    pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
                    message: '전화번호 형식이 올바르지 않습니다. (000-0000-0000)',
                  },
                ]}
              >
                <Input
                  placeholder="02-0000-0000"
                  maxLength={13}
                  onChange={handlePhoneNumberChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="팩스번호"
                name="faxNumber"
                rules={[
                  {
                    pattern: /^\d{2,3}-\d{3,4}-\d{4}$/,
                    message: '팩스번호 형식이 올바르지 않습니다. (000-0000-0000)',
                  },
                ]}
              >
                <Input
                  placeholder="02-0000-0000"
                  maxLength={13}
                  onChange={handleFaxNumberChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label="이메일"
                name="email"
                rules={[
                  { type: 'email', message: '유효한 이메일 주소를 입력해주세요.' },
                  { max: 100, message: '이메일은 최대 100자까지 입력 가능합니다.' },
                ]}
              >
                <Input placeholder="info@company.com" />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* 버튼 영역 */}
          <Row justify="center" gutter={16}>
            <Col>
              <Button
                size="large"
                icon={<CloseOutlined />}
                onClick={handleCancel}
              >
                취소
              </Button>
            </Col>
            <Col>
              <Button
                type="primary"
                size="large"
                htmlType="submit"
                loading={loading}
                icon={<SaveOutlined />}
              >
                {loading ? '등록 중...' : '등록하기'}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default CompanyRegister;