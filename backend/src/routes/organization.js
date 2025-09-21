/**
 * 조직도 관리 API 라우터
 * @description 조직도 관련 모든 API 엔드포인트 관리
 * @author SmartHR Team
 * @date 2024-09-12
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// 조직도 조회 API
router.get('/tree', authenticateToken, require('../controllers/organization-controller').getOrganizationTree);

// 새로운 조직도 차트 API (계층구조 트리)
router.get('/chart', authenticateToken, require('../controllers/organizationController').getOrganizationChart);
router.get('/department/:deptId/hierarchy', authenticateToken, require('../controllers/organizationController').getDepartmentHierarchy);
router.get('/stats', authenticateToken, require('../controllers/organizationController').getOrganizationStats);

// 회사 관리 API
router.post('/companies', authenticateToken, require('../controllers/organization-controller').createCompany);
router.get('/companies', authenticateToken, require('../controllers/organization-controller').getCompanies);
router.get('/companies/:id', authenticateToken, require('../controllers/organization-controller').getCompanyById);
router.put('/companies/:id', authenticateToken, require('../controllers/organization-controller').updateCompany);
router.delete('/companies/:id', authenticateToken, require('../controllers/organization-controller').deleteCompany);

// 사업장 관리 API  
router.post('/subcompanies', authenticateToken, require('../controllers/organization-controller').createSubCompany);
router.get('/subcompanies', authenticateToken, require('../controllers/organization-controller').getSubCompanies);
router.get('/subcompanies/:id', authenticateToken, require('../controllers/organization-controller').getSubCompanyById);
router.put('/subcompanies/:id', authenticateToken, require('../controllers/organization-controller').updateSubCompany);
router.delete('/subcompanies/:id', authenticateToken, require('../controllers/organization-controller').deleteSubCompany);

// 부서 관리 API
router.post('/departments', authenticateToken, require('../controllers/organization-controller').createDepartment);
router.get('/departments', authenticateToken, require('../controllers/organization-controller').getDepartments);
router.get('/departments/:id', authenticateToken, require('../controllers/organization-controller').getDepartmentById);
router.put('/departments/:id', authenticateToken, require('../controllers/organization-controller').updateDepartment);
router.delete('/departments/:id', authenticateToken, require('../controllers/organization-controller').deleteDepartment);

// 직책 관리 API
router.post('/positions', authenticateToken, require('../controllers/organization-controller').createPosition);
router.get('/positions', authenticateToken, require('../controllers/organization-controller').getPositions);
router.get('/positions/:id', authenticateToken, require('../controllers/organization-controller').getPositionById);
router.put('/positions/:id', authenticateToken, require('../controllers/organization-controller').updatePosition);
router.delete('/positions/:id', authenticateToken, require('../controllers/organization-controller').deletePosition);

// 조직도 검색 API
router.get('/search', authenticateToken, require('../controllers/organization-controller').searchOrganization);

module.exports = router;