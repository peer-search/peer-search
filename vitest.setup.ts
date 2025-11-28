import "@testing-library/jest-dom/vitest";
import { resolve } from "node:path";
import { cleanup } from "@testing-library/react";
import { config } from "dotenv";
import { afterEach } from "vitest";

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") });

// Encode DATABASE_URL password if present
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    const [, user, password, rest] = match;
    process.env.DATABASE_URL = `postgresql://${user}:${encodeURIComponent(password)}@${rest}`;
  }
}

// 各テスト後にクリーンアップ
afterEach(() => {
  cleanup();
});
