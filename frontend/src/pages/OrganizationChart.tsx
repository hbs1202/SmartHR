/**
 * 조직도 페이지 컴포넌트
 * @description 조직도 계층구조를 트리 형태로 표시하는 페이지
 * @author SmartHR Team
 * @date 2024-09-19
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Tree,
  Input,
  Select,
  Button,
  Row,
  Col,
  Statistic,
  Alert,
  Spin,
  Space,
  Tag,
  Breadcrumb,
  message,
  Tooltip
} from 'antd';
import {
  BankOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  SearchOutlined,
  ReloadOutlined,
  BarChartOutlined,
  HomeOutlined,
  ExpandAltOutlined,
  CompressOutlined
} from '@ant-design/icons';
import type { TreeProps } from 'antd/es/tree';
import type { DataNode } from 'antd/es/tree';
import {
  getOrganizationChart,
  getOrganizationStats,
  searchOrganizationNodes,
  getNodeColor,
  type OrganizationNode,
  type OrganizationStats,
  type OrganizationChartParams
} from '../services/organizationChartService';

const { Search } = Input;
const { Option } = Select;

const OrganizationChart: React.FC = () => {
  // 상태 관리
  const [loading, setLoading] = useState<boolean>(false);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [organizationData, setOrganizationData] = useState<OrganizationNode[]>([]);
  const [filteredData, setFilteredData] = useState<OrganizationNode[]>([]);
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedNodeType, setSelectedNodeType] = useState<OrganizationNode['NodeType'] | 'all'>('all');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  const [autoExpandParent, setAutoExpandParent] = useState<boolean>(true);
  const [isAllExpanded, setIsAllExpanded] = useState<boolean>(false);

  // 조직도 데이터 로드
  const loadOrganizationChart = useCallback(async (params: OrganizationChartParams = {}) => {
    try {
      setLoading(true);
      const response = await getOrganizationChart(params);

      if (response.success && response.data) {
        setOrganizationData(response.data.tree);
        setFilteredData(response.data.tree);

        // 첫 번째 레벨 자동 확장
        const firstLevelKeys = response.data.tree.map(node => node.NodeId);
        setExpandedKeys(firstLevelKeys);
      } else {
        message.error('조직도 데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      console.error('조직도 로드 오류:', error);
      message.error('조직도 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  // 통계 데이터 로드
  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const response = await getOrganizationStats();

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('통계 로드 오류:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    loadOrganizationChart();
    loadStats();
  }, [loadOrganizationChart, loadStats]);

  // 검색 처리
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);

    if (!value.trim()) {
      setFilteredData(organizationData);
      return;
    }

    const nodeTypeFilter = selectedNodeType === 'all' ? undefined : selectedNodeType;
    const filtered = searchOrganizationNodes(organizationData, value, nodeTypeFilter);
    setFilteredData(filtered);

    // 검색 결과가 있으면 모든 노드 확장
    if (filtered.length > 0) {
      const allKeys = getAllNodeKeys(filtered);
      setExpandedKeys(allKeys);
      setAutoExpandParent(true);
    }
  }, [organizationData, selectedNodeType]);

  // 노드 타입 필터 변경
  const handleNodeTypeChange = useCallback((value: OrganizationNode['NodeType'] | 'all') => {
    setSelectedNodeType(value);

    if (searchTerm) {
      const nodeTypeFilter = value === 'all' ? undefined : value;
      const filtered = searchOrganizationNodes(organizationData, searchTerm, nodeTypeFilter);
      setFilteredData(filtered);
    }
  }, [organizationData, searchTerm]);

  // 모든 노드 키 가져오기
  const getAllNodeKeys = (nodes: OrganizationNode[]): string[] => {
    const keys: string[] = [];

    const traverse = (nodeList: OrganizationNode[]) => {
      nodeList.forEach(node => {
        keys.push(node.NodeId);
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(nodes);
    return keys;
  };

  // 전체 확장/축소 토글
  const toggleExpandAll = useCallback(() => {
    if (isAllExpanded) {
      setExpandedKeys([]);
      setIsAllExpanded(false);
    } else {
      const allKeys = getAllNodeKeys(filteredData);
      setExpandedKeys(allKeys);
      setIsAllExpanded(true);
    }
    setAutoExpandParent(false);
  }, [filteredData, isAllExpanded]);

  // 새로고침
  const handleRefresh = useCallback(() => {
    setSearchTerm('');
    setSelectedNodeType('all');
    loadOrganizationChart();
    loadStats();
  }, [loadOrganizationChart, loadStats]);

  // 조직도 데이터를 Ant Design Tree 형식으로 변환
  const convertToTreeData = useCallback((nodes: OrganizationNode[]): DataNode[] => {
    return nodes.map(node => ({
      key: node.NodeId,
      title: (
        <Space size="small">
          {getNodeTypeIcon(node.NodeType)}
          <span style={{ fontWeight: 500 }}>{node.NodeName}</span>
          <Tag color={getNodeTypeColor(node.NodeType)}>
            {getNodeTypeLabel(node.NodeType)}
          </Tag>
          {node.NodeType === 'employee' ? (
            <Tag color="blue">
              {node.DisplayName.includes('(') ?
                node.DisplayName.split('(')[1]?.replace(')', '') || '직책 정보 없음' :
                '직책 정보 없음'
              }
            </Tag>
          ) : (
            <Tag color="blue">
              {node.MemberCount}명
            </Tag>
          )}
          {!node.IsActive && (
            <Tag color="red">비활성</Tag>
          )}
        </Space>
      ),
      children: node.children && node.children.length > 0 ? convertToTreeData(node.children) : undefined,
    }));
  }, []);

  // 노드 타입별 아이콘 반환
  const getNodeTypeIcon = (nodeType: OrganizationNode['NodeType']) => {
    const iconProps = { style: { color: getNodeColor(nodeType) } };

    switch (nodeType) {
      case 'company':
        return <BankOutlined {...iconProps} />;
      case 'subcompany':
        return <ShopOutlined {...iconProps} />;
      case 'department':
        return <TeamOutlined {...iconProps} />;
      case 'employee':
        return <UserOutlined {...iconProps} />;
      default:
        return <UserOutlined {...iconProps} />;
    }
  };

  // 노드 타입별 색상 반환
  const getNodeTypeColor = (nodeType: OrganizationNode['NodeType']): string => {
    switch (nodeType) {
      case 'company':
        return 'blue';
      case 'subcompany':
        return 'green';
      case 'department':
        return 'orange';
      case 'employee':
        return 'purple';
      default:
        return 'default';
    }
  };

  // 노드 타입별 라벨 반환
  const getNodeTypeLabel = (nodeType: OrganizationNode['NodeType']): string => {
    switch (nodeType) {
      case 'company':
        return '회사';
      case 'subcompany':
        return '사업장';
      case 'department':
        return '부서';
      case 'employee':
        return '사원';
      default:
        return '기타';
    }
  };

  // Tree 이벤트 핸들러
  const onExpand: TreeProps['onExpand'] = (expandedKeysValue) => {
    setExpandedKeys(expandedKeysValue);
    setAutoExpandParent(false);
    setIsAllExpanded(expandedKeysValue.length === getAllNodeKeys(filteredData).length);
  };

  const onSelect: TreeProps['onSelect'] = (selectedKeysValue, info) => {
    setSelectedKeys(selectedKeysValue);
    console.log('선택된 노드:', info);
  };

  return (
    <div style={{ padding: '24px' }}>
      <Breadcrumb style={{ marginBottom: '16px' }}>
        <Breadcrumb.Item>
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>조직 관리</Breadcrumb.Item>
        <Breadcrumb.Item>조직도</Breadcrumb.Item>
      </Breadcrumb>

      <Row gutter={[16, 16]}>
        {/* 통계 섹션 */}
        <Col span={24}>
          <Card title="조직 현황" extra={<BarChartOutlined />}>
            <Spin spinning={statsLoading}>
              <Row gutter={16}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="총 회사 수"
                    value={stats?.TotalCompanies || 0}
                    prefix={<BankOutlined />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="총 사업장 수"
                    value={stats?.TotalSubCompanies || 0}
                    prefix={<ShopOutlined />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="총 부서 수"
                    value={stats?.TotalDepartments || 0}
                    prefix={<TeamOutlined />}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="총 직원 수"
                    value={stats?.TotalEmployees || 0}
                    prefix={<UserOutlined />}
                  />
                </Col>
              </Row>
            </Spin>
          </Card>
        </Col>

        {/* 조직도 섹션 */}
        <Col span={24}>
          <Card
            title="조직도"
            extra={
              <Space>
                <Tooltip title={isAllExpanded ? "모두 접기" : "모두 펼치기"}>
                  <Button
                    icon={isAllExpanded ? <CompressOutlined /> : <ExpandAltOutlined />}
                    onClick={toggleExpandAll}
                  />
                </Tooltip>
                <Tooltip title="새로고침">
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleRefresh}
                    loading={loading}
                  />
                </Tooltip>
              </Space>
            }
          >
            {/* 검색 및 필터 */}
            <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
              <Col xs={24} sm={12} md={8}>
                <Search
                  placeholder="조직명, 코드로 검색"
                  allowClear
                  enterButton={<SearchOutlined />}
                  size="middle"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onSearch={handleSearch}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="조직 유형 선택"
                  value={selectedNodeType}
                  onChange={handleNodeTypeChange}
                >
                  <Option value="all">전체</Option>
                  <Option value="company">회사</Option>
                  <Option value="subcompany">사업장</Option>
                  <Option value="department">부서</Option>
                  <Option value="employee">사원</Option>
                </Select>
              </Col>
            </Row>

            {/* 조직도 트리 */}
            <Spin spinning={loading}>
              {filteredData.length > 0 ? (
                <Tree
                  showLine
                  showIcon={false}
                  defaultExpandedKeys={[]}
                  expandedKeys={expandedKeys}
                  autoExpandParent={autoExpandParent}
                  selectedKeys={selectedKeys}
                  onExpand={onExpand}
                  onSelect={onSelect}
                  treeData={convertToTreeData(filteredData)}
                  style={{
                    backgroundColor: '#fafafa',
                    padding: '16px',
                    borderRadius: '6px',
                    border: '1px solid #d9d9d9'
                  }}
                />
              ) : (
                <Alert
                  message="조직도 데이터가 없습니다"
                  description="조직 데이터를 등록하거나 검색 조건을 확인해주세요."
                  type="info"
                  showIcon
                />
              )}
            </Spin>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default OrganizationChart;