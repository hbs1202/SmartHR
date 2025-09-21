/**
 * 메인 레이아웃 컴포넌트
 * @description 애플리케이션의 전체 레이아웃을 담당하는 컴포넌트
 * @author SmartHR Team
 * @date 2024-09-16
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
} from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DashboardOutlined,
  TeamOutlined,
  BankOutlined,
  FileDoneOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import authService from '../../services/authService';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);

  // 화면 크기 감지
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 페이지 변경 시 서브메뉴 자동 열기
  useEffect(() => {
    const newOpenKeys = getOpenKeys();
    setOpenKeys(newOpenKeys);
  }, [location.pathname]);

  // 현재 로그인한 사용자 정보
  const userInfo = authService.getUserInfo();

  /**
   * 로그아웃 처리
   */
  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('❌ 로그아웃 오류:', error);
      // 오류가 발생해도 로그인 페이지로 이동
      navigate('/login', { replace: true });
    }
  };

  /**
   * 사용자 메뉴 아이템
   */
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '내 정보',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '설정',
      onClick: () => navigate('/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '로그아웃',
      onClick: handleLogout,
    },
  ];

  /**
   * 사이드바 메뉴 아이템
   */
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '대시보드',
    },
    {
      key: '/employees',
      icon: <TeamOutlined />,
      label: '직원 관리',
    },
    {
      key: '/organization',
      icon: <BankOutlined />,
      label: '조직 관리',
      children: [
        {
          key: '/organization/company',
          label: '회사 등록',
        },
        {
          key: '/organization/workplace',
          label: '사업장 관리',
        },
        {
          key: '/organization/department',
          label: '부서 등록',
        },
        {
          key: '/organization/chart',
          label: '조직도',
        },
      ],
    },
    {
      key: '/assignments',
      icon: <FileDoneOutlined />,
      label: '발령 관리',
    },
    {
      key: '/vacation',
      icon: <CalendarOutlined />,
      label: '휴가 관리',
    },
    {
      key: '/approval',
      icon: <FileTextOutlined />,
      label: '전자결재',
    },
  ];

  /**
   * 메뉴 클릭 처리
   */
  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  /**
   * 서브메뉴 열기/닫기 처리
   */
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys);
  };

  /**
   * 현재 경로를 기반으로 선택된 메뉴 키 계산
   */
  const getSelectedKeys = () => {
    const pathname = location.pathname;

    // 정확한 경로 매칭 (서브메뉴 포함)
    for (const item of menuItems) {
      if (item.key === pathname) {
        return [item.key];
      }
      // 서브메뉴 확인
      if (item.children) {
        const subMatch = item.children.find(child => child.key === pathname);
        if (subMatch) {
          return [subMatch.key];
        }
      }
    }

    // 부분 경로 매칭 (예: /employees/123 → /employees)
    const partialMatch = menuItems.find(item =>
      item.key !== '/' && pathname.startsWith(item.key)
    );
    if (partialMatch) {
      return [partialMatch.key];
    }

    // 기본값
    return ['/dashboard'];
  };

  /**
   * 현재 경로를 기반으로 열린 서브메뉴 키 계산
   */
  const getOpenKeys = () => {
    const pathname = location.pathname;

    // 서브메뉴가 열려야 하는 부모 메뉴 찾기
    for (const item of menuItems) {
      if (item.children) {
        const hasActiveChild = item.children.some(child => pathname.startsWith(child.key));
        if (hasActiveChild) {
          return [item.key];
        }
      }
    }

    return [];
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 모바일 백드롭 */}
      {isMobile && !collapsed && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 999,
          }}
          onClick={() => setCollapsed(true)}
        />
      )}

      {/* 사이드바 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        breakpoint="lg"
        collapsedWidth={isMobile ? 0 : 80}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: isMobile ? 'fixed' : 'relative',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: isMobile ? 1000 : 'auto',
        }}
      >
        {/* 로고 */}
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.2)',
            margin: '16px',
            borderRadius: '6px',
          }}
        >
          <Text
            style={{
              color: 'white',
              fontSize: collapsed ? '16px' : '20px',
              fontWeight: 'bold',
            }}
          >
            {collapsed ? 'HR' : 'SmartHR'}
          </Text>
        </div>

        {/* 메뉴 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          openKeys={openKeys}
          onOpenChange={handleOpenChange}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      {/* 메인 레이아웃 */}
      <Layout>
        {/* 헤더 */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {/* 메뉴 토글 버튼 */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />

          {/* 사용자 정보 */}
          <Space>
            <Text type="secondary">안녕하세요,</Text>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                />
                <Text strong>{userInfo?.fullName || '사용자'}</Text>
                <Badge
                  dot
                  status="success"
                  title="온라인"
                />
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 컨텐츠 영역 */}
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            borderRadius: '6px',
            overflow: 'auto',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;