import dns from "node:dns";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// IPv4を優先してDNS解決（IPv6接続エラーを回避）
dns.setDefaultResultOrder("ipv4first");

// パスワードに特殊文字が含まれている場合の処理
// URLの形式: postgresql://user:password@host:port/database
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;

  // 最後の @ を見つける（パスワードにも @ が含まれている可能性があるため）
  const lastAtIndex = url.lastIndexOf("@");

  if (lastAtIndex > 0) {
    const beforeAt = url.substring(0, lastAtIndex); // postgresql://user:password
    const afterAt = url.substring(lastAtIndex + 1); // host:port/database

    // protocol://user:password の形式から抽出
    const credentialsMatch = beforeAt.match(/^(.*:\/\/)([^:]+):(.+)$/);

    if (credentialsMatch) {
      const protocol = credentialsMatch[1]; // postgresql://
      const user = credentialsMatch[2]; // postgres
      const password = credentialsMatch[3]; // Vh3p.67?r&m46ki

      // パスワードにURL特殊文字が含まれているかチェック
      if (/[?&#%]/.test(password)) {
        const encodedPassword = encodeURIComponent(password);
        const newUrl = `${protocol}${user}:${encodedPassword}@${afterAt}`;
        process.env.DATABASE_URL = newUrl;
        console.log(
          "[DB] Password contains URL special characters, encoding applied",
        );
        console.log("[DB] Host part:", afterAt);
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

// Disable prefetch as it is not supported for "Transaction" pool mode
// Note: To force IPv4 connection, set NODE_OPTIONS=--dns-result-order=ipv4first
// or use IPv4 address directly in DATABASE_URL
const client = postgres(process.env.DATABASE_URL, {
  prepare: false,
  // @ts-expect-error - postgres-js types don't include fetch_types but it's supported
  fetch_types: false,
  ssl: "prefer",
  connection: {
    application_name: "peer-search-re",
  },
});
export const db = drizzle(client, { schema });
