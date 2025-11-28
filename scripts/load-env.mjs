/**
 * 環境変数ローダー
 * .env.localを読み込み、DATABASE_URLのパスワードをエンコードして
 * 子プロセスに渡す
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { config } from "dotenv";

// .env.localを読み込む
config({ path: resolve(process.cwd(), ".env.local") });

// DATABASE_URLのパスワードをエンコード
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    const [, user, password, rest] = match;
    process.env.DATABASE_URL = `postgresql://${user}:${encodeURIComponent(password)}@${rest}`;
  }
}

// コマンドライン引数から実行するスクリプトを取得
const scriptPath = process.argv[2];

if (!scriptPath) {
  console.error("使用方法: node scripts/load-env.mjs <script-path>");
  process.exit(1);
}

// 環境変数を継承してスクリプトを実行
const child = spawn("tsx", [scriptPath], {
  stdio: "inherit",
  env: process.env,
  shell: true,
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
