/**
 * 社員検索パフォーマンステスト
 *
 * 実行方法:
 * node scripts/load-env.mjs scripts/test-employee-performance.ts
 */

import { searchEmployees } from "@/lib/employees/service";

async function testPerformance() {
  console.log("=== 社員検索パフォーマンステスト ===\n");

  // テストケース1: 全社員取得
  console.log("1. 全社員取得テスト");
  const startTime1 = performance.now();
  const allEmployees = await searchEmployees({});
  const time1 = performance.now() - startTime1;
  console.log(`   件数: ${allEmployees.length}件`);
  console.log(`   実行時間: ${time1.toFixed(2)}ms`);
  console.log(
    `   判定: ${time1 < 500 ? "✅ PASS (< 500ms)" : "❌ FAIL (>= 500ms)"}\n`,
  );

  // テストケース2: 氏名検索（部分一致）
  console.log("2. 氏名検索テスト (name='田')");
  const startTime2 = performance.now();
  const nameSearch = await searchEmployees({ name: "田" });
  const time2 = performance.now() - startTime2;
  console.log(`   件数: ${nameSearch.length}件`);
  console.log(`   実行時間: ${time2.toFixed(2)}ms`);
  console.log(
    `   判定: ${time2 < 500 ? "✅ PASS (< 500ms)" : "❌ FAIL (>= 500ms)"}\n`,
  );

  // テストケース3: 入社年検索
  console.log("3. 入社年検索テスト (hireYear=2020)");
  const startTime3 = performance.now();
  const hireYearSearch = await searchEmployees({ hireYear: 2020 });
  const time3 = performance.now() - startTime3;
  console.log(`   件数: ${hireYearSearch.length}件`);
  console.log(`   実行時間: ${time3.toFixed(2)}ms`);
  console.log(
    `   判定: ${time3 < 500 ? "✅ PASS (< 500ms)" : "❌ FAIL (>= 500ms)"}\n`,
  );

  // テストケース4: ソート付き検索
  console.log("4. ソート付き検索テスト (sort=name_kana, order=asc)");
  const startTime4 = performance.now();
  const sortedSearch = await searchEmployees({
    sort: "name_kana",
    order: "asc",
  });
  const time4 = performance.now() - startTime4;
  console.log(`   件数: ${sortedSearch.length}件`);
  console.log(`   実行時間: ${time4.toFixed(2)}ms`);
  console.log(
    `   判定: ${time4 < 500 ? "✅ PASS (< 500ms)" : "❌ FAIL (>= 500ms)"}\n`,
  );

  // テストケース5: 複合条件検索
  console.log('5. 複合条件検索テスト (name="佐藤", sort=hire_date)');
  const startTime5 = performance.now();
  const complexSearch = await searchEmployees({
    name: "佐藤",
    sort: "hire_date",
    order: "desc",
  });
  const time5 = performance.now() - startTime5;
  console.log(`   件数: ${complexSearch.length}件`);
  console.log(`   実行時間: ${time5.toFixed(2)}ms`);
  console.log(
    `   判定: ${time5 < 500 ? "✅ PASS (< 500ms)" : "❌ FAIL (>= 500ms)"}\n`,
  );

  // サマリー
  const allTimes = [time1, time2, time3, time4, time5];
  const avgTime = allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length;
  const maxTime = Math.max(...allTimes);
  const passed = allTimes.filter((t) => t < 500).length;

  console.log("=== サマリー ===");
  console.log(`平均実行時間: ${avgTime.toFixed(2)}ms`);
  console.log(`最大実行時間: ${maxTime.toFixed(2)}ms`);
  console.log(`合格テスト: ${passed}/5`);
  console.log(
    `総合判定: ${passed === 5 ? "✅ 全テスト合格" : "❌ 一部テスト不合格"}`,
  );

  // パフォーマンス要件11.2の確認
  if (maxTime < 500) {
    console.log(
      "\n✅ 要件11.2を満たしています: データベースクエリ実行時間 < 500ms",
    );
  } else {
    console.log(
      "\n❌ 要件11.2を満たしていません: 最大実行時間が500msを超えています",
    );
    console.log(
      "   推奨対応: インデックスの追加、クエリの最適化を検討してください",
    );
  }
}

// 実行
testPerformance().catch(console.error);
