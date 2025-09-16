/**
 * 로그인 페이지
 * @description 사용자 인증을 위한 로그인 페이지 컴포넌트
 * @author SmartHR Team
 * @date 2024-09-16
 */

import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Alert,
  Row,
  Col,
  Space,
  Divider,
} from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import authService from '../services/authService';
import type { LoginRequest } from '../types/api';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 이미 로그인된 사용자는 대시보드로 리다이렉트
  if (authService.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  /**
   * 로그인 폼 제출 처리
   * @param values 폼 데이터
   */
  const handleLogin = async (values: LoginRequest) => {
    try {
      setLoading(true);
      setError(null);

      // 폼 데이터 검증
      const validation = authService.validateLoginForm(values);

      if (!validation.isValid) {
        setError(validation.errors.join(' '));
        return;
      }

      // 로그인 요청
      const response = await authService.login(values);

      if (response.success) {
        console.log('✅ 로그인 성공:', response.data.user);

        // 성공 시 대시보드로 이동
        navigate('/dashboard', { replace: true });
      } else {
        setError(response.message || '로그인에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('❌ 로그인 오류:', error);

      // 에러 메시지 설정
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.message) {
        setError(error.message);
      } else {
        setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 폼 필드 변경 시 에러 메시지 제거
   */
  const handleFieldChange = () => {
    if (error) {
      setError(null);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f2f5',
        padding: '20px',
      }}
    >
      <Row justify="center" style={{ width: '100%', maxWidth: '1200px' }}>
        <Col xs={20} sm={16} md={12} lg={10} xl={8} xxl={6}>
          <Card
            style={{
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              maxWidth: '450px',
              margin: '0 auto',
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* 헤더 */}
              <div style={{ textAlign: 'center' }}>
                <Title level={2} style={{ marginBottom: '8px', color: '#1890ff' }}>
                  SmartHR
                </Title>
                <Text type="secondary">인사관리 시스템</Text>
              </div>

              <Divider />

              {/* 에러 메시지 */}
              {error && (
                <Alert
                  message={error}
                  type="error"
                  showIcon
                  closable
                  onClose={() => setError(null)}
                />
              )}

              {/* 로그인 폼 */}
              <Form
                form={form}
                name="login"
                layout="vertical"
                onFinish={handleLogin}
                onFieldsChange={handleFieldChange}
                autoComplete="off"
                size="large"
              >
                <Form.Item
                  label="이메일"
                  name="email"
                  rules={[
                    { required: true, message: '이메일을 입력해주세요.' },
                    { type: 'email', message: '유효한 이메일 주소를 입력해주세요.' },
                  ]}
                >
                  <Input
                    prefix={<UserOutlined />}
                    placeholder="이메일을 입력하세요"
                    autoComplete="email"
                  />
                </Form.Item>

                <Form.Item
                  label="비밀번호"
                  name="password"
                  rules={[
                    { required: true, message: '비밀번호를 입력해주세요.' },
                    { min: 6, message: '비밀번호는 최소 6자 이상이어야 합니다.' },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder="비밀번호를 입력하세요"
                    autoComplete="current-password"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: '16px' }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<LoginOutlined />}
                    block
                    style={{ height: '45px', fontSize: '16px' }}
                  >
                    {loading ? '로그인 중...' : '로그인'}
                  </Button>
                </Form.Item>
              </Form>

              {/* 추가 정보 */}
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  SmartHR 인사관리 시스템 v1.0.0
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Login;