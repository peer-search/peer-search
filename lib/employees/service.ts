import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employeeOrganizations, employees, organizations } from "@/db/schema";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "./types";

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
 * 複数の組織IDから階層パスを一括取得
 *
 * @param organizationIds - 組織ID配列（UUID[]）
 * @returns 組織ID → 階層パス のMap（半角スペース区切り）
 *
 * @example
 * const orgIds = ['uuid1', 'uuid2'];
 * const pathsMap = await buildOrganizationPathsBatch(orgIds);
 * // => Map { 'uuid1' => '株式会社ユニリタ 開発本部 製品開発部', 'uuid2' => '株式会社ユニリタ 管理本部' }
 */
export async function buildOrganizationPathsBatch(
  organizationIds: string[],
): Promise<Map<string, string>> {
  // 空配列の場合は空Mapを返す
  if (organizationIds.length === 0) {
    return new Map();
  }

  // パフォーマンス計測開始
  const startTime = performance.now();

  // WITH RECURSIVEを使用して複数組織の階層を一括取得
  const result = await db.execute<{ organization_id: string; path: string }>(
    sql`
    WITH RECURSIVE org_hierarchy AS (
      -- 非再帰項: 各組織IDをベースケースとして設定
      SELECT
        id AS start_id,
        id,
        name,
        level,
        parent_id
      FROM organizations
      WHERE id IN (${sql.join(
        organizationIds.map((id) => sql`${id}`),
        sql`, `,
      )})

      UNION ALL

      -- 再帰項: 親組織を辿る
      SELECT
        oh.start_id,
        o.id,
        o.name,
        o.level,
        o.parent_id
      FROM organizations o
      INNER JOIN org_hierarchy oh ON o.id = oh.parent_id
    )
    SELECT
      start_id AS organization_id,
      STRING_AGG(name, ' ' ORDER BY level ASC) AS path
    FROM org_hierarchy
    GROUP BY start_id
  `,
  );

  // パフォーマンス計測終了
  const executionTime = performance.now() - startTime;

  // クエリ実行時間が500msを超えた場合は警告ログ
  if (executionTime > 500) {
    console.warn(
      `[Performance Warning] Batch organization path query took ${executionTime.toFixed(2)}ms (threshold: 500ms)`,
      { organizationCount: organizationIds.length },
    );
  }

  // Map<組織ID, 階層パス> を構築
  const pathsMap = new Map<string, string>();

  // クエリ結果から取得した階層パスをMapに追加
  for (const row of result) {
    pathsMap.set(row.organization_id, row.path);
  }

  // 存在しない組織IDに対しては空文字列を設定
  for (const orgId of organizationIds) {
    if (!pathsMap.has(orgId)) {
      pathsMap.set(orgId, "");
    }
  }

  return pathsMap;
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

  // 組織フィルタがある場合は、対象社員のIDを先に取得
  let targetEmployeeIds: string[] | null = null;
  if (orgId) {
    const orgIds = await getDescendantOrganizationIds(orgId);
    const orgFilteredEmployees = await db
      .selectDistinct({ id: employees.id })
      .from(employees)
      .innerJoin(
        employeeOrganizations,
        eq(employees.id, employeeOrganizations.employeeId),
      )
      .where(inArray(employeeOrganizations.organizationId, orgIds));
    targetEmployeeIds = orgFilteredEmployees.map((row) => row.id);

    // 該当する社員がいない場合は空配列を返す
    if (targetEmployeeIds.length === 0) {
      return [];
    }
  }

  // ベースクエリ: employees LEFT JOIN employee_organizations LEFT JOIN organizations
  const baseQuery = db
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
    )
    .$dynamic();

  // WHERE条件の構築
  const conditions = [];

  // 組織フィルタで絞り込まれた社員IDでフィルタ
  if (targetEmployeeIds !== null) {
    conditions.push(inArray(employees.id, targetEmployeeIds));
  }

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

  let query = baseQuery;
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

  // 各社員の所属組織の階層パスを一括生成（N+1クエリ問題の解決）
  const employeesList = Array.from(employeeMap.values());

  // すべての社員の所属組織IDを収集（重複排除）
  const orgIdsSet = new Set<string>();
  for (const employee of employeesList) {
    for (const org of employee.organizations) {
      orgIdsSet.add(org.organizationId);
    }
  }

  // 組織階層パスを一括取得
  const orgPathsMap = await buildOrganizationPathsBatch(Array.from(orgIdsSet));

  // 各社員の所属組織に階層パスを設定
  for (const employee of employeesList) {
    for (const org of employee.organizations) {
      org.organizationPath = orgPathsMap.get(org.organizationId) || "";
    }
  }

  return employeesList;
}

/**
 * 単一社員の詳細情報を取得（所属組織情報を含む）
 *
 * @param employeeId - 社員UUID
 * @returns 社員情報（所属を含む）または null（存在しない場合）
 * @throws データベース接続エラー
 */
export async function getEmployeeById(
  employeeId: string,
): Promise<Employee | null> {
  // Drizzle ORM: employees LEFT JOIN employee_organizations LEFT JOIN organizations
  const rows = await db
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
    )
    .where(eq(employees.id, employeeId));

  // 存在しない場合はnullを返却
  if (rows.length === 0) {
    return null;
  }

  // 最初の行から基本情報を取得
  const firstRow = rows[0];
  const employee: Employee = {
    id: firstRow.id,
    employeeNumber: firstRow.employeeNumber,
    nameKanji: firstRow.nameKanji,
    nameKana: firstRow.nameKana,
    photoS3Key: firstRow.photoS3Key,
    mobilePhone: firstRow.mobilePhone,
    email: firstRow.email,
    hireDate: new Date(firstRow.hireDate),
    organizations: [],
  };

  // 所属組織情報を集約（重複防止）
  const orgIds = new Set<string>();
  for (const row of rows) {
    if (
      row.organizationId &&
      row.organizationName &&
      !orgIds.has(row.organizationId)
    ) {
      orgIds.add(row.organizationId);
      employee.organizations.push({
        organizationId: row.organizationId,
        organizationName: row.organizationName,
        organizationPath: row.organizationName, // 暫定値（後で階層パスに置き換え）
        position: row.position,
      });
    }
  }

  // 各所属組織の階層パスを一括生成（N+1クエリ問題の解決）
  const orgPathsMap = await buildOrganizationPathsBatch(Array.from(orgIds));

  // 各所属組織に階層パスを設定
  for (const org of employee.organizations) {
    org.organizationPath = orgPathsMap.get(org.organizationId) || "";
  }

  return employee;
}

/**
 * 新規社員を作成
 * @param data - 社員データ
 * @returns 作成された社員情報
 * @throws データベースエラー（UNIQUE制約違反など）
 */
export async function createEmployee(
  data: CreateEmployeeInput,
): Promise<Employee> {
  // フェーズ1: 単一テーブル操作のため非トランザクション実装
  // フェーズ2で所属組織追加機能を実装する際にトランザクション化
  const [employee] = await db
    .insert(employees)
    .values({
      employeeNumber: data.employeeNumber,
      nameKanji: data.nameKanji,
      nameKana: data.nameKana,
      email: data.email,
      hireDate: data.hireDate, // string in "YYYY-MM-DD" format
      mobilePhone: data.mobilePhone || null,
      photoS3Key: null, // 初期値はnull
    })
    .returning();

  // 作成した社員情報を返却（所属組織情報は空配列）
  return {
    ...employee,
    hireDate: new Date(employee.hireDate),
    organizations: [],
  };
}

/**
 * 社員情報を更新
 * @param employeeId - 社員UUID
 * @param data - 更新データ
 * @returns 更新された社員情報
 * @throws 社員が存在しない場合、データベースエラー
 */
export async function updateEmployee(
  employeeId: string,
  data: UpdateEmployeeInput,
): Promise<Employee> {
  // 単一テーブル更新のためトランザクション不要
  const [employee] = await db
    .update(employees)
    .set({
      nameKanji: data.nameKanji,
      nameKana: data.nameKana,
      email: data.email,
      hireDate: data.hireDate, // string in "YYYY-MM-DD" format
      mobilePhone: data.mobilePhone,
    })
    .where(eq(employees.id, employeeId))
    .returning();

  if (!employee) {
    throw new Error("Employee not found");
  }

  // 所属組織情報を再取得（getEmployeeByIdを再利用）
  const fullEmployee = await getEmployeeById(employeeId);
  if (!fullEmployee) {
    throw new Error("Employee not found");
  }

  return fullEmployee;
}

/**
 * 社員を削除（物理削除）
 * @param employeeId - 社員UUID
 * @throws 社員が存在しない場合、データベースエラー
 */
export async function deleteEmployee(employeeId: string): Promise<void> {
  // CASCADE DELETE設定により、employee_organizationsも自動削除
  const result = await db
    .delete(employees)
    .where(eq(employees.id, employeeId))
    .returning({ id: employees.id });

  if (result.length === 0) {
    throw new Error("Employee not found");
  }
}
