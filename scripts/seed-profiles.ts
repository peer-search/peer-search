/**
 * プロフィールサンプルデータ投入スクリプト
 *
 * 実行方法:
 * node scripts/load-env.mjs scripts/seed-profiles.ts
 *
 * 投入データ:
 * - data/profiles-seed.csv から読み込み
 * - CSV形式: user_id,role (ヘッダー行を含む)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { db } from "@/db";
import { profiles } from "@/db/schema";

interface ProfileSeedData {
  userId: string;
  role: "user" | "admin";
}

/**
 * シンプルなCSVパーサー
 * @param csvContent CSV文字列
 * @returns パースされたレコード配列
 */
function parseCSV(csvContent: string): ProfileSeedData[] {
  const lines = csvContent
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")); // 空行とコメント行を除外

  if (lines.length === 0) {
    return [];
  }

  // ヘッダー行をスキップ
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const [userId, role] = line.split(",").map((field) => field.trim());
    return {
      userId,
      role: role as "user" | "admin",
    };
  });
}

async function seed() {
  console.log("🌱 プロフィールデータ投入を開始します...");

  try {
    // CSVファイルを読み込み
    const csvPath = path.join(process.cwd(), "data", "profiles-seed.csv");
    console.log(`📄 CSVファイルを読み込み中: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSVファイルが見つかりません: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8");

    // CSVをパース（コメント行をスキップ）
    const records = parseCSV(csvContent);

    if (records.length === 0) {
      console.warn("⚠️ CSVファイルにデータがありません。処理を終了します。");
      process.exit(0);
    }

    console.log(`📊 ${records.length} 件のレコードを読み込みました`);

    // 既存データをクリア
    console.log("📦 既存のプロフィールデータをクリア中...");
    await db.delete(profiles);

    // データを投入
    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        // roleの検証
        if (record.role !== "user" && record.role !== "admin") {
          console.error(
            `❌ 無効なrole値: ${record.role} (user_id: ${record.userId})`,
          );
          errorCount++;
          continue;
        }

        // データを挿入
        const [inserted] = await db
          .insert(profiles)
          .values({
            userId: record.userId,
            role: record.role,
          })
          .returning({ id: profiles.id, userId: profiles.userId });

        console.log(
          `✅ user_id: ${inserted.userId}, role: ${record.role} を投入しました (ID: ${inserted.id})`,
        );
        successCount++;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("foreign key constraint")
        ) {
          console.error(
            `❌ user_id が auth.users に存在しません: ${record.userId}`,
          );
        } else if (
          error instanceof Error &&
          error.message.includes("duplicate key")
        ) {
          console.error(`❌ user_id が重複しています: ${record.userId}`);
        } else {
          console.error(
            `❌ エラー (user_id: ${record.userId}):`,
            error instanceof Error ? error.message : error,
          );
        }
        errorCount++;
      }
    }

    // 投入結果を確認
    console.log("\n📊 投入結果を確認中...");
    const allProfiles = await db.select().from(profiles);

    console.log(
      `\n合計 ${allProfiles.length} 件のプロフィールデータが投入されました:`,
    );
    for (const profile of allProfiles) {
      console.log(`  - user_id: ${profile.userId}, role: ${profile.role}`);
    }

    console.log(`\n✨ サンプルデータ投入が完了しました!`);
    console.log(`   成功: ${successCount} 件`);
    console.log(`   失敗: ${errorCount} 件`);

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ エラーが発生しました:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed();
