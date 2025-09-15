/**
 * SP_GetOrganizationTree 수정 스크립트
 */

const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function updateSP() {
  try {
    console.log('📋 SP_GetOrganizationTree 업데이트 중...');
    
    const pool = await sql.connect(config);
    
    // SP 삭제 후 재생성
    const dropSP = `
      IF EXISTS (SELECT * FROM sys.objects WHERE name = 'SP_GetOrganizationTree')
          DROP PROCEDURE SP_GetOrganizationTree;
    `;
    
    await pool.request().query(dropSP);
    console.log('✅ 기존 SP 삭제 완료');
    
    // 새로운 SP 생성
    const createSP = `
CREATE PROCEDURE SP_GetOrganizationTree
    @CompanyId INT = NULL,
    @SubCompanyId INT = NULL,
    @IncludeInactive BIT = 0,
    @ResultCode INT OUTPUT,
    @Message NVARCHAR(500) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        SELECT 
            'Company' AS NodeType,
            c.CompanyId AS Id,
            NULL AS ParentId,
            c.CompanyCode AS Code,
            c.CompanyName AS Name,
            1 AS Level,
            c.IsActive,
            0 AS EmployeeCount
        FROM uCompanyTb c
        WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (c.IsActive = 1 OR @IncludeInactive = 1)
            
        UNION ALL
        
        SELECT 
            'WorkSite' AS NodeType,
            ws.SubCompanyId AS Id,
            ws.CompanyId AS ParentId,
            ws.SubCompanyCode AS Code,
            ws.SubCompanyName AS Name,
            2 AS Level,
            ws.IsActive,
            0 AS EmployeeCount
        FROM uSubCompanyTb ws
        INNER JOIN uCompanyTb c ON ws.CompanyId = c.CompanyId
        WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR ws.SubCompanyId = @SubCompanyId)
            AND (ws.IsActive = 1 OR @IncludeInactive = 1)
            AND (c.IsActive = 1 OR @IncludeInactive = 1)
            
        UNION ALL
        
        SELECT 
            'Department' AS NodeType,
            d.DeptId AS Id,
            d.SubCompanyId AS ParentId,
            d.DeptCode AS Code,
            d.DeptName AS Name,
            3 AS Level,
            d.IsActive,
            d.EmployeeCount
        FROM uDeptTb d
        INNER JOIN uSubCompanyTb ws ON d.SubCompanyId = ws.SubCompanyId
        INNER JOIN uCompanyTb c ON ws.CompanyId = c.CompanyId
        WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR ws.SubCompanyId = @SubCompanyId)
            AND (d.IsActive = 1 OR @IncludeInactive = 1)
            AND (ws.IsActive = 1 OR @IncludeInactive = 1)
            AND (c.IsActive = 1 OR @IncludeInactive = 1)
            
        UNION ALL
        
        SELECT 
            'Position' AS NodeType,
            p.PosId AS Id,
            p.DeptId AS ParentId,
            p.PosCode AS Code,
            p.PosName AS Name,
            4 AS Level,
            p.IsActive,
            0 AS EmployeeCount
        FROM uPositionTb p
        INNER JOIN uDeptTb d ON p.DeptId = d.DeptId
        INNER JOIN uSubCompanyTb ws ON d.SubCompanyId = ws.SubCompanyId
        INNER JOIN uCompanyTb c ON ws.CompanyId = c.CompanyId
        WHERE (@CompanyId IS NULL OR c.CompanyId = @CompanyId)
            AND (@SubCompanyId IS NULL OR ws.SubCompanyId = @SubCompanyId)
            AND (p.IsActive = 1 OR @IncludeInactive = 1)
            AND (d.IsActive = 1 OR @IncludeInactive = 1)
            AND (ws.IsActive = 1 OR @IncludeInactive = 1)
            AND (c.IsActive = 1 OR @IncludeInactive = 1)
        
        ORDER BY NodeType, Level, Name;
        
        SET @ResultCode = 0;
        SET @Message = '조직도 조회가 성공적으로 완료되었습니다.';
        
    END TRY
    BEGIN CATCH
        SET @ResultCode = -1;
        SET @Message = '조직도 조회 중 오류가 발생했습니다: ' + ERROR_MESSAGE();
    END CATCH
END
    `;
    
    await pool.request().query(createSP);
    console.log('✅ SP_GetOrganizationTree 재생성 완료');
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ SP 업데이트 실패:', error.message);
    process.exit(1);
  }
}

updateSP();