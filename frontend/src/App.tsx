/**
 * 메인 애플리케이션 컴포넌트
 * @description React Router를 이용한 라우팅 및 전체 애플리케이션 구조
 * @author SmartHR Team
 * @date 2024-09-16
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import 'antd/dist/reset.css';

// 컴포넌트 import
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';

// 페이지 import
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CompanyList from './pages/CompanyList';
import CompanyRegister from './pages/CompanyRegister';
import SubCompanyList from './pages/SubCompanyList';
import DepartmentList from './pages/DepartmentList';
import EmployeeList from './pages/EmployeeList';
import OrganizationChart from './pages/OrganizationChart';

function App() {
  return (
    <ConfigProvider locale={koKR}>
      <Router>
        <Routes>
          {/* 퍼블릭 라우트 */}
          <Route path="/login" element={<Login />} />

          {/* 보호된 라우트 */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            {/* 메인 레이아웃 내부 라우트 */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* 직원 관리 */}
            <Route path="employees" element={<EmployeeList />} />
            <Route path="employees/:id" element={<div>직원 상세 페이지 (개발 예정)</div>} />

            {/* 조직 관리 */}
            <Route path="organization" element={<div>조직 관리 페이지 (개발 예정)</div>} />
            <Route path="organization/company" element={<CompanyList />} />
            <Route path="organization/company/register" element={<CompanyRegister />} />
            <Route path="organization/workplace" element={<SubCompanyList />} />
            <Route path="organization/department" element={<DepartmentList />} />
            <Route path="organization/chart" element={<OrganizationChart />} />

            {/* 발령 관리 */}
            <Route path="assignments" element={<div>발령 관리 페이지 (개발 예정)</div>} />
            <Route path="assignments/:id" element={<div>발령 상세 페이지 (개발 예정)</div>} />

            {/* 휴가 관리 */}
            <Route path="vacation" element={<div>휴가 관리 페이지 (개발 예정)</div>} />

            {/* 전자결재 */}
            <Route path="approval" element={<div>전자결재 페이지 (개발 예정)</div>} />
            <Route path="approval/:id" element={<div>결재 상세 페이지 (개발 예정)</div>} />

            {/* 개인 설정 */}
            <Route path="profile" element={<div>내 정보 페이지 (개발 예정)</div>} />
            <Route path="settings" element={<div>설정 페이지 (개발 예정)</div>} />

            {/* 기본 라우트 */}
            <Route path="" element={<Navigate to="/dashboard" replace />} />

            {/* 404 페이지 */}
            <Route path="*" element={<div>페이지를 찾을 수 없습니다.</div>} />
          </Route>
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
