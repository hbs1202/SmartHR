/**
 * 대시보드 페이지
 * @description 메인 대시보드 화면
 * @author SmartHR Team
 * @date 2024-09-16
 */

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Alert,
  Table,
  Tag,
  Button,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  FileDoneOutlined,
  CalendarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import authService from '../services/authService';

const { Title, Text } = Typography;

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const userInfo = authService.getUserInfo();

  useEffect(() => {
    // 대시보드 데이터 로딩 시뮬레이션
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // 통계 데이터 (실제로는 API에서 가져와야 함)
  const statsData = [
    {
      title: '전체 직원',
      value: 245,
      icon: <UserOutlined />,
      color: '#1890ff',
      change: 12,
      changeType: 'up' as const,
    },
    {
      title: '부서',
      value: 8,
      icon: <TeamOutlined />,
      color: '#52c41a',
      change: 2,
      changeType: 'up' as const,
    },
    {
      title: '이번 달 발령',
      value: 15,
      icon: <FileDoneOutlined />,
      color: '#faad14',
      change: 3,
      changeType: 'down' as const,
    },
    {
      title: '대기 중인 휴가 신청',
      value: 7,
      icon: <CalendarOutlined />,
      color: '#f5222d',
      change: 1,
      changeType: 'up' as const,
    },
  ];

  // 최근 활동 데이터 (실제로는 API에서 가져와야 함)
  const recentActivities = [
    {
      key: '1',
      type: '휴가 신청',
      employee: '김철수',
      department: '개발팀',
      date: '2024-09-16',
      status: 'pending',
    },
    {
      key: '2',
      type: '발령',
      employee: '이영희',
      department: '영업팀 → 마케팅팀',
      date: '2024-09-15',
      status: 'completed',
    },
    {
      key: '3',
      type: '휴가 신청',
      employee: '박민수',
      department: '인사팀',
      date: '2024-09-14',
      status: 'approved',
    },
    {
      key: '4',
      type: '발령',
      employee: '최수진',
      department: '개발팀',
      date: '2024-09-13',
      status: 'pending',
    },
  ];

  const activityColumns = [
    {
      title: '유형',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === '휴가 신청' ? 'blue' : 'green'}>{type}</Tag>
      ),
    },
    {
      title: '직원',
      dataIndex: 'employee',
      key: 'employee',
    },
    {
      title: '부서/내용',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '날짜',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          pending: { color: 'orange', text: '대기중' },
          approved: { color: 'green', text: '승인됨' },
          completed: { color: 'blue', text: '완료됨' },
          rejected: { color: 'red', text: '거부됨' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* 헤더 */}
      <div>
        <Title level={2}>대시보드</Title>
        <Text type="secondary">
          안녕하세요, {userInfo?.fullName}님! SmartHR 인사관리 시스템에 오신 것을 환영합니다.
        </Text>
      </div>

      {/* 알림 */}
      <Alert
        message="시스템 공지"
        description="새로운 휴가 정책이 2024년 10월 1일부터 적용됩니다. 자세한 내용은 공지사항을 확인해주세요."
        type="info"
        showIcon
        closable
      />

      {/* 통계 카드 */}
      <Row gutter={[16, 16]}>
        {statsData.map((stat, index) => (
          <Col xs={24} sm={12} lg={6} key={index}>
            <Card loading={loading}>
              <Statistic
                title={stat.title}
                value={stat.value}
                prefix={stat.icon}
                valueStyle={{ color: stat.color }}
                suffix={
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {stat.changeType === 'up' ? (
                      <ArrowUpOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <ArrowDownOutlined style={{ color: '#f5222d' }} />
                    )}
                    <span style={{ marginLeft: '4px' }}>
                      {stat.change}
                    </span>
                  </div>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 최근 활동과 빠른 액션 */}
      <Row gutter={[16, 16]}>
        {/* 최근 활동 */}
        <Col xs={24} lg={16}>
          <Card
            title="최근 활동"
            extra={
              <Button type="link" size="small">
                전체 보기
              </Button>
            }
            loading={loading}
          >
            <Table
              columns={activityColumns}
              dataSource={recentActivities}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* 빠른 액션 */}
        <Col xs={24} lg={8}>
          <Card title="빠른 액션" loading={loading}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button type="primary" block icon={<UserOutlined />}>
                직원 등록
              </Button>
              <Button block icon={<FileDoneOutlined />}>
                발령 처리
              </Button>
              <Button block icon={<CalendarOutlined />}>
                휴가 승인
              </Button>
              <Button block icon={<TeamOutlined />}>
                조직도 관리
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default Dashboard;