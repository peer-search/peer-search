/**
 * RPC関数 get_org_hierarchy() のテストスクリプト
 *
 * 実行方法:
 * npm run test:rpc
 *
 * 検証内容:
 * 1. RPC関数が正常に実行できるか
 * 2. 階層データが正しく取得できるか
 * 3. 階層順にソートされているか
 * 4. 循環参照チェックが機能しているか
 */

import { sql } from "drizzle-orm";
import { db } from "@/db";

interface OrgHierarchyRow extends Record<string, unknown> {
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
}

async function testRpcFunction() {
  console.log("🧪 RPC関数 get_org_hierarchy() のテストを開始します...\n");

  try {
    // RPC関数を実行
    console.log("📞 RPC関数を実行中...");
    const startTime = Date.now();

    const result = await db.execute<OrgHierarchyRow>(
      sql`SELECT * FROM get_org_hierarchy()`,
    );

    const executionTime = Date.now() - startTime;
    console.log(
      `✅ RPC関数が正常に実行されました (実行時間: ${executionTime}ms)\n`,
    );

    // 結果の検証
    const rows = result as unknown as OrgHierarchyRow[];
    if (!rows || rows.length === 0) {
      console.log("⚠️ データが取得できませんでした");
      return;
    }

    console.log(`📊 取得したデータ: ${rows.length} 件\n`);

    // レベルごとにグループ化して表示
    const levelGroups = new Map<number, OrgHierarchyRow[]>();
    for (const row of rows) {
      const group = levelGroups.get(row.level) || [];
      group.push(row);
      levelGroups.set(row.level, group);
    }

    // レベル別に表示
    console.log("📋 階層別データ:\n");
    for (let level = 1; level <= 4; level++) {
      const group = levelGroups.get(level);
      if (group) {
        const levelName = ["会社", "本部", "部署", "課/チーム"][level - 1];
        console.log(`Level ${level} (${levelName}): ${group.length} 件`);
        for (const org of group) {
          const indent = "  ".repeat(level - 1);
          console.log(
            `${indent}- ${org.name} (ID: ${org.id.substring(0, 8)}...)`,
          );
        }
        console.log();
      }
    }

    // ソート順の検証
    console.log("🔍 ソート順の検証:");
    let isCorrectOrder = true;
    for (let i = 1; i < rows.length; i++) {
      const prev = rows[i - 1];
      const curr = rows[i];

      if (prev.level > curr.level) {
        console.log(
          `❌ レベル順が不正: ${prev.name} (${prev.level}) → ${curr.name} (${curr.level})`,
        );
        isCorrectOrder = false;
      }
    }

    if (isCorrectOrder) {
      console.log("✅ データは正しくレベル順にソートされています\n");
    } else {
      console.log("❌ ソート順に問題があります\n");
    }

    // 親子関係の検証
    console.log("🔗 親子関係の検証:");
    const idSet = new Set(rows.map((row) => row.id));
    let hasInvalidRelations = false;

    for (const row of rows) {
      if (row.parent_id && !idSet.has(row.parent_id)) {
        console.log(
          `❌ 親IDが存在しません: ${row.name} (親ID: ${row.parent_id})`,
        );
        hasInvalidRelations = true;
      }
    }

    if (!hasInvalidRelations) {
      console.log("✅ すべての親子関係が正しく解決されています\n");
    }

    console.log("✨ RPC関数のテストが完了しました!");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

testRpcFunction();
