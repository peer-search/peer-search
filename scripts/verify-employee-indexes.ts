/**
 * 社員テーブルのインデックス確認スクリプト
 *
 * 実行方法:
 * node scripts/load-env.mjs scripts/verify-employee-indexes.ts
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";

async function verifyIndexes() {
  console.log("=== 社員テーブルインデックス確認 ===\n");

  // employeesテーブルのインデックスを確認
  console.log("📋 employeesテーブルのインデックス:");
  const employeeIndexes = await db.execute<{
    indexname: string;
    indexdef: string;
  }>(sql`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'employees'
    ORDER BY indexname;
  `);

  if (employeeIndexes.length === 0) {
    console.log("   ⚠️  インデックスが見つかりませんでした");
  } else {
    for (const index of employeeIndexes) {
      console.log(`   - ${index.indexname}`);
      console.log(`     ${index.indexdef}\n`);
    }
  }

  // employee_organizationsテーブルのインデックスを確認
  console.log("📋 employee_organizationsテーブルのインデックス:");
  const empOrgIndexes = await db.execute<{
    indexname: string;
    indexdef: string;
  }>(sql`
    SELECT
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'employee_organizations'
    ORDER BY indexname;
  `);

  if (empOrgIndexes.length === 0) {
    console.log("   ⚠️  インデックスが見つかりませんでした");
  } else {
    for (const index of empOrgIndexes) {
      console.log(`   - ${index.indexname}`);
      console.log(`     ${index.indexdef}\n`);
    }
  }

  // 必要なインデックスのチェックリスト
  console.log("=== インデックスチェックリスト ===");
  const requiredIndexes = [
    {
      table: "employees",
      name: "idx_employees_name_kana",
      exists: employeeIndexes.some((row) =>
        row.indexname.includes("name_kana"),
      ),
    },
    {
      table: "employees",
      name: "idx_employees_employee_number",
      exists: employeeIndexes.some((row) =>
        row.indexname.includes("employee_number"),
      ),
    },
    {
      table: "employees",
      name: "idx_employees_hire_date",
      exists: employeeIndexes.some((row) =>
        row.indexname.includes("hire_date"),
      ),
    },
    {
      table: "employee_organizations",
      name: "idx_employee_organizations_employee_id",
      exists: empOrgIndexes.some((row) =>
        row.indexname.includes("employee_id"),
      ),
    },
    {
      table: "employee_organizations",
      name: "idx_employee_organizations_organization_id",
      exists: empOrgIndexes.some((row) =>
        row.indexname.includes("organization_id"),
      ),
    },
  ];

  let allIndexesExist = true;
  for (const index of requiredIndexes) {
    const status = index.exists ? "✅" : "❌";
    console.log(`${status} ${index.table}.${index.name}`);
    if (!index.exists) {
      allIndexesExist = false;
    }
  }

  if (allIndexesExist) {
    console.log(
      "\n✅ すべての必須インデックスが作成されています（要件7.2, 8.3, 8.4を満たしています）",
    );
  } else {
    console.log(
      "\n❌ 一部のインデックスが不足しています。マイグレーションを確認してください。",
    );
  }

  // テーブルの行数を確認
  console.log("\n=== テーブル統計 ===");
  const employeeCount = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*) as count FROM employees;
  `);
  const empOrgCount = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*) as count FROM employee_organizations;
  `);

  console.log(`社員数: ${employeeCount[0].count}人`);
  console.log(`所属関係数: ${empOrgCount[0].count}件`);

  if (Number(employeeCount[0].count) === 0) {
    console.log(
      "\n⚠️  社員データが登録されていません。サンプルデータをインポートしてください。",
    );
    console.log("   参考: data/employees-sample.csv");
  }
}

// 実行
verifyIndexes().catch(console.error);
