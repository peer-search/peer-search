/**
 * 組織階層サンプルデータ投入スクリプト
 *
 * 実行方法:
 * npm run seed:organizations
 *
 * 投入データ:
 * - 会社 (level 1): 1つ
 * - 本部 (level 2): 2つ
 * - 部署 (level 3): 4つ
 * - 課/チーム (level 4): 8つ
 */

import { db } from "@/db";
import { organizations } from "@/db/schema";

interface SampleOrganization {
  name: string;
  level: number;
  parentName?: string;
}

const sampleData: SampleOrganization[] = [
  // Level 1: 会社
  { name: "ユニリタ株式会社", level: 1 },

  // Level 2: 本部
  { name: "開発本部", level: 2, parentName: "ユニリタ株式会社" },
  { name: "営業本部", level: 2, parentName: "ユニリタ株式会社" },

  // Level 3: 部署
  { name: "製品開発部", level: 3, parentName: "開発本部" },
  { name: "技術支援部", level: 3, parentName: "開発本部" },
  { name: "営業第一部", level: 3, parentName: "営業本部" },
  { name: "営業第二部", level: 3, parentName: "営業本部" },

  // Level 4: 課/チーム
  { name: "フロントエンドチーム", level: 4, parentName: "製品開発部" },
  { name: "バックエンドチーム", level: 4, parentName: "製品開発部" },
  { name: "インフラチーム", level: 4, parentName: "技術支援部" },
  { name: "QAチーム", level: 4, parentName: "技術支援部" },
  { name: "首都圏営業課", level: 4, parentName: "営業第一部" },
  { name: "関西営業課", level: 4, parentName: "営業第一部" },
  { name: "中部営業課", level: 4, parentName: "営業第二部" },
  { name: "九州営業課", level: 4, parentName: "営業第二部" },
];

async function seed() {
  console.log("🌱 サンプルデータ投入を開始します...");

  try {
    // 既存データをクリア
    console.log("📦 既存の組織データをクリア中...");
    await db.delete(organizations);

    // 親IDを解決しながら投入
    const nameToIdMap = new Map<string, string>();

    for (const org of sampleData) {
      let parentId: string | undefined;

      // 親組織のIDを解決
      if (org.parentName) {
        parentId = nameToIdMap.get(org.parentName);
        if (!parentId) {
          throw new Error(
            `親組織が見つかりません: ${org.parentName} (子組織: ${org.name})`,
          );
        }
      }

      // データを挿入
      const [inserted] = await db
        .insert(organizations)
        .values({
          name: org.name,
          level: org.level,
          parentId: parentId || null,
        })
        .returning({ id: organizations.id });

      nameToIdMap.set(org.name, inserted.id);
      console.log(
        `✅ ${org.name} (Level ${org.level}) を投入しました (ID: ${inserted.id})`,
      );
    }

    // 投入結果を確認
    console.log("\n📊 投入結果を確認中...");
    const allOrgs = await db
      .select()
      .from(organizations)
      .orderBy(organizations.level, organizations.name);

    console.log(`\n合計 ${allOrgs.length} 件の組織データが投入されました:`);
    for (const org of allOrgs) {
      const indent = "  ".repeat(org.level - 1);
      console.log(`${indent}- ${org.name} (Level ${org.level}, ID: ${org.id})`);
    }

    console.log("\n✨ サンプルデータ投入が完了しました!");
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
