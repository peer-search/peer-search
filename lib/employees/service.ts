import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employeeOrganizations, employees, organizations } from "@/db/schema";

/**
 * 組織IDから階層パスを生成する
 * Level 1（会社）から現在の組織まで、半角スペース区切りで連結
 * @param organizationId - 組織ID
 * @returns 組織階層パス（例: "株式会社ユニリタ 開発本部 製品開発部 フロントエンドチーム"）
 */
async function buildOrganizationPath(organizationId: string): Promise<string> {
  // WITH RECURSIVEを使用して組織階層を辿る
  const result = await db.execute<{ name: string; level: number }>(sql`
    WITH RECURSIVE org_hierarchy AS (
      -- ベースケース: 指定された組織
      SELECT
        id,
        name,
        level,
        parent_id
      FROM organizations
      WHERE id = ${organizationId}

      UNION ALL

      -- 再帰: 親組織を辿る
      SELECT
        o.id,
        o.name,
        o.level,
        o.parent_id
      FROM organizations o
      INNER JOIN org_hierarchy oh ON o.id = oh.parent_id
    )
    SELECT name, level
    FROM org_hierarchy
    ORDER BY level ASC
  `);

  // 組織名を半角スペースで連結
  const names = result.map((row) => row.name);
  return names.join(" ");
}

/**
 * 指定された組織とその配下の全組織IDを取得する
 * @param organizationId - 組織ID
 * @returns 組織ID配列（指定組織 + 配下の全組織）
 */
async function getDescendantOrganizationIds(
  organizationId: string,
): Promise<string[]> {
  // WITH RECURSIVEを使用して配下の組織を辿る
  const result = await db.execute<{ id: string }>(sql`
    WITH RECURSIVE org_tree AS (
      -- ベースケース: 指定された組織
      SELECT id
      FROM organizations
      WHERE id = ${organizationId}

      UNION ALL

      -- 再帰: 配下の組織を辿る
      SELECT o.id
      FROM organizations o
      INNER JOIN org_tree ot ON o.parent_id = ot.id
    )
    SELECT id FROM org_tree
  `);

  return result.map((row) => row.id);
}

/**
 * 社員検索パラメータ
 */
export interface SearchEmployeesParams {
  name?: string; // 氏名検索（部分一致、漢字/かな対応）
  employeeNumber?: string; // 社員番号検索（完全一致）
  hireYear?: number; // 入社年検索（年のみ）
  orgId?: string; // 組織フィルタ（UUID）
  sort?: "name_kana" | "employee_number" | "hire_date";
  order?: "asc" | "desc";
}

/**
 * 社員の所属組織情報
 */
export interface EmployeeOrganization {
  organizationId: string;
  organizationName: string;
  organizationPath: string; // "会社 > 本部 > 部署 > 課/チーム"
  position: string | null; // 役職
}

/**
 * 社員情報（所属組織情報を含む）
 */
export interface Employee {
  id: string;
  employeeNumber: string;
  nameKanji: string;
  nameKana: string;
  photoS3Key: string | null;
  mobilePhone: string | null;
  email: string;
  hireDate: Date;
  organizations: EmployeeOrganization[]; // 所属組織配列
}

/**
 * 社員データを検索・取得
 *
 * @param params - 検索パラメータ
 * @returns 社員データ配列（所属組織情報を含む）
 */
export async function searchEmployees(
  params: SearchEmployeesParams = {},
): Promise<Employee[]> {
  const { name, employeeNumber, hireYear, orgId, sort, order } = params;

  // ベースクエリ: employees LEFT JOIN employee_organizations LEFT JOIN organizations
  let query = db
    .select({
      id: employees.id,
      employeeNumber: employees.employeeNumber,
      nameKanji: employees.nameKanji,
      nameKana: employees.nameKana,
      photoS3Key: employees.photoS3Key,
      mobilePhone: employees.mobilePhone,
      email: employees.email,
      hireDate: employees.hireDate,
      // 所属組織情報
      organizationId: employeeOrganizations.organizationId,
      organizationName: organizations.name,
      position: employeeOrganizations.position,
    })
    .from(employees)
    .leftJoin(
      employeeOrganizations,
      eq(employees.id, employeeOrganizations.employeeId),
    )
    .leftJoin(
      organizations,
      eq(employeeOrganizations.organizationId, organizations.id),
    );

  // WHERE条件の構築
  const conditions = [];

  // 氏名検索（name_kanji OR name_kana の部分一致）
  if (name) {
    conditions.push(
      or(
        ilike(employees.nameKanji, `%${name}%`),
        ilike(employees.nameKana, `%${name}%`),
      ),
    );
  }

  // 社員番号検索（完全一致）
  if (employeeNumber) {
    conditions.push(eq(employees.employeeNumber, employeeNumber));
  }

  // 入社年検索
  if (hireYear) {
    conditions.push(
      sql`EXTRACT(YEAR FROM ${employees.hireDate}) = ${hireYear}`,
    );
  }

  // 組織フィルタ（階層対応：指定組織とその配下の全組織を含む）
  if (orgId) {
    const orgIds = await getDescendantOrganizationIds(orgId);
    conditions.push(inArray(employeeOrganizations.organizationId, orgIds));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // ORDER BY句の構築
  if (sort) {
    const orderFn = order === "desc" ? desc : asc;
    switch (sort) {
      case "name_kana":
        query = query.orderBy(orderFn(employees.nameKana));
        break;
      case "employee_number":
        query = query.orderBy(orderFn(employees.employeeNumber));
        break;
      case "hire_date":
        query = query.orderBy(orderFn(employees.hireDate));
        break;
    }
  }

  // クエリ実行（パフォーマンス計測）
  const startTime = performance.now();
  const rows = await query;
  const executionTime = performance.now() - startTime;

  // クエリ実行時間が500msを超えた場合は警告ログ
  if (executionTime > 500) {
    console.warn(
      `[Performance Warning] Employee search query took ${executionTime.toFixed(2)}ms (threshold: 500ms)`,
      { params },
    );
  } else {
    console.log(
      `[Performance] Employee search query completed in ${executionTime.toFixed(2)}ms`,
    );
  }

  // 社員IDで集約し、所属組織を配列化
  const employeeMap = new Map<string, Employee>();

  for (const row of rows) {
    if (!employeeMap.has(row.id)) {
      employeeMap.set(row.id, {
        id: row.id,
        employeeNumber: row.employeeNumber,
        nameKanji: row.nameKanji,
        nameKana: row.nameKana,
        photoS3Key: row.photoS3Key,
        mobilePhone: row.mobilePhone,
        email: row.email,
        hireDate: new Date(row.hireDate),
        organizations: [],
      });
    }

    const employee = employeeMap.get(row.id);
    if (!employee) continue;

    // 所属組織情報が存在する場合のみ追加
    if (row.organizationId && row.organizationName) {
      // 既に同じ組織が追加されていないかチェック（重複防止）
      const exists = employee.organizations.some(
        (org) => org.organizationId === row.organizationId,
      );

      if (!exists) {
        employee.organizations.push({
          organizationId: row.organizationId,
          organizationName: row.organizationName,
          organizationPath: row.organizationName, // 暫定値（後で階層パスに置き換え）
          position: row.position,
        });
      }
    }
  }

  // 各社員の所属組織の階層パスを生成
  const employeesList = Array.from(employeeMap.values());
  for (const employee of employeesList) {
    for (const org of employee.organizations) {
      org.organizationPath = await buildOrganizationPath(org.organizationId);
    }
  }

  return employeesList;
}
