/**
 * 조직도 관리 컨트롤러
 * @description 조직도 계층구조 조회, 부서별 하위 조직 조회, 통계 정보 제공
 * @author SmartHR Team
 * @date 2024-09-19
 */

const { executeStoredProcedureWithNamedParams } = require('../database/dbHelper');

/**
 * 전체 조직도 계층구조 조회
 * @route GET /api/organization/chart
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getOrganizationChart = async (req, res) => {
    try {
        const { companyId, subCompanyId, includeInactive = false } = req.query;

        console.log('조직도 조회 요청:', {
            companyId: companyId || 'ALL',
            subCompanyId: subCompanyId || 'ALL',
            includeInactive,
            userId: req.user?.userId
        });

        // Stored Procedure 실행
        const result = await executeStoredProcedureWithNamedParams('x_GetOrganizationChart', {
            CompanyId: companyId ? parseInt(companyId) : null,
            SubCompanyId: subCompanyId ? parseInt(subCompanyId) : null,
            IncludeInactive: includeInactive === 'true' ? 1 : 0
        });

        if (result.ResultCode !== 0) {
            console.error('조직도 조회 DB 오류:', result.Message);
            return res.status(500).json({
                success: false,
                message: result.Message || '조직도 데이터 조회 중 오류가 발생했습니다.'
            });
        }

        const organizationData = result.data || [];

        // 계층구조 트리 생성
        const organizationTree = buildOrganizationTree(organizationData);

        console.log('조직도 조회 성공:', {
            totalNodes: organizationData.length,
            treeNodes: organizationTree.length,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: {
                tree: organizationTree,
                flatData: organizationData,
                summary: {
                    totalNodes: organizationData.length,
                    companies: organizationData.filter(item => item.NodeType === 'company').length,
                    subCompanies: organizationData.filter(item => item.NodeType === 'subcompany').length,
                    departments: organizationData.filter(item => item.NodeType === 'department').length,
                    employees: organizationData.filter(item => item.NodeType === 'employee').length,
                    positions: organizationData.filter(item => item.NodeType === 'position').length
                }
            },
            message: '조직도를 성공적으로 조회했습니다.'
        });

    } catch (error) {
        console.error('조직도 조회 컨트롤러 오류:', error);
        res.status(500).json({
            success: false,
            message: '조직도 조회 중 서버 오류가 발생했습니다.',
            error: error.message
        });
    }
};

/**
 * 특정 부서의 하위 조직 계층구조 조회
 * @route GET /api/organization/department/:deptId/hierarchy
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getDepartmentHierarchy = async (req, res) => {
    try {
        const { deptId } = req.params;

        if (!deptId || isNaN(parseInt(deptId))) {
            return res.status(400).json({
                success: false,
                message: '유효한 부서 ID를 입력해주세요.'
            });
        }

        console.log('부서 계층구조 조회 요청:', {
            deptId: parseInt(deptId),
            userId: req.user?.userId
        });

        // Stored Procedure 실행
        const result = await executeStoredProcedureWithNamedParams('x_GetDepartmentHierarchy', {
            DeptId: parseInt(deptId)
        });

        if (result.ResultCode !== 0) {
            console.error('부서 계층구조 조회 DB 오류:', result.Message);
            return res.status(500).json({
                success: false,
                message: result.Message || '부서 계층구조 조회 중 오류가 발생했습니다.'
            });
        }

        const hierarchyData = result.data || [];

        if (hierarchyData.length === 0) {
            return res.status(404).json({
                success: false,
                message: '해당 부서를 찾을 수 없습니다.'
            });
        }

        // 각 부서의 직책 정보 파싱
        const processedData = hierarchyData.map(dept => ({
            ...dept,
            Positions: dept.Positions ? JSON.parse(dept.Positions) : []
        }));

        console.log('부서 계층구조 조회 성공:', {
            deptId: parseInt(deptId),
            totalDepartments: processedData.length,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: processedData,
            message: '부서 계층구조를 성공적으로 조회했습니다.'
        });

    } catch (error) {
        console.error('부서 계층구조 조회 컨트롤러 오류:', error);
        res.status(500).json({
            success: false,
            message: '부서 계층구조 조회 중 서버 오류가 발생했습니다.',
            error: error.message
        });
    }
};

/**
 * 조직도 통계 정보 조회
 * @route GET /api/organization/stats
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
const getOrganizationStats = async (req, res) => {
    try {
        const { companyId } = req.query;

        console.log('조직도 통계 조회 요청:', {
            companyId: companyId || 'ALL',
            userId: req.user?.userId
        });

        // Stored Procedure 실행
        const result = await executeStoredProcedureWithNamedParams('x_GetOrganizationStats', {
            CompanyId: companyId ? parseInt(companyId) : null
        });

        if (result.ResultCode !== 0) {
            console.error('조직도 통계 조회 DB 오류:', result.Message);
            return res.status(500).json({
                success: false,
                message: result.Message || '조직도 통계 조회 중 오류가 발생했습니다.'
            });
        }

        const statsData = result.data[0] || {};

        // TopDepartmentsBySize JSON 파싱
        if (statsData.TopDepartmentsBySize) {
            try {
                statsData.TopDepartmentsBySize = JSON.parse(statsData.TopDepartmentsBySize);
            } catch (parseError) {
                console.warn('부서별 통계 JSON 파싱 오류:', parseError);
                statsData.TopDepartmentsBySize = [];
            }
        }

        console.log('조직도 통계 조회 성공:', {
            companyId: companyId || 'ALL',
            stats: {
                companies: statsData.TotalCompanies,
                departments: statsData.TotalDepartments,
                employees: statsData.TotalEmployees
            },
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: statsData,
            message: '조직도 통계를 성공적으로 조회했습니다.'
        });

    } catch (error) {
        console.error('조직도 통계 조회 컨트롤러 오류:', error);
        res.status(500).json({
            success: false,
            message: '조직도 통계 조회 중 서버 오류가 발생했습니다.',
            error: error.message
        });
    }
};

/**
 * 플랫 데이터를 계층구조 트리로 변환하는 헬퍼 함수
 * @param {Array} flatData - 플랫 형태의 조직도 데이터
 * @returns {Array} 계층구조 트리 데이터
 */
const buildOrganizationTree = (flatData) => {
    const nodeMap = new Map();
    const tree = [];
    const processedNodes = new Set();

    // 1단계: 모든 노드를 Map에 저장 (순환 참조 방지를 위해 깊은 복사)
    flatData.forEach(item => {
        nodeMap.set(item.NodeId, {
            NodeType: item.NodeType,
            NodeId: item.NodeId,
            NodeName: item.NodeName,
            NodeCode: item.NodeCode,
            ParentId: item.ParentId,
            Level: item.Level,
            DisplayName: item.DisplayName,
            MemberCount: item.MemberCount,
            IsActive: item.IsActive,
            NodePath: item.NodePath,
            CreatedAt: item.CreatedAt,
            CompanyId: item.CompanyId,
            SubCompanyId: item.SubCompanyId,
            DeptId: item.DeptId,
            PosId: item.PosId,
            EmployeeId: item.EmployeeId,
            PositionName: item.PositionName,
            children: []
        });
    });

    // 2단계: 부모-자식 관계 설정 (순환 참조 방지)
    flatData.forEach(item => {
        // 이미 처리된 노드는 건너뛰기
        if (processedNodes.has(item.NodeId)) {
            return;
        }

        const node = nodeMap.get(item.NodeId);

        if (item.ParentId && nodeMap.has(item.ParentId) && item.ParentId !== item.NodeId) {
            // 부모가 있고, 자기 자신이 부모가 아닌 경우
            const parent = nodeMap.get(item.ParentId);

            // 이미 부모의 children에 있는지 확인
            const alreadyExists = parent.children.some(child => child.NodeId === item.NodeId);
            if (!alreadyExists) {
                parent.children.push(node);
            }
        } else {
            // 루트 노드인 경우 (회사 레벨)
            const alreadyInTree = tree.some(treeNode => treeNode.NodeId === item.NodeId);
            if (!alreadyInTree) {
                tree.push(node);
            }
        }

        processedNodes.add(item.NodeId);
    });

    return tree;
};

module.exports = {
    getOrganizationChart,
    getDepartmentHierarchy,
    getOrganizationStats
};