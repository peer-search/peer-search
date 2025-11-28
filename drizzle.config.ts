import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local file
config({ path: ".env.local" });

// Encode password in DATABASE_URL if it contains special characters
if (process.env.DATABASE_URL) {
  const url = process.env.DATABASE_URL;
  const match = url.match(/postgresql:\/\/([^:]+):([^@]+)@(.+)/);
  if (match) {
    const [, user, password, rest] = match;
    // Check if password contains special characters that need encoding
    if (
      password.includes("?") ||
      password.includes("&") ||
      password.includes("%")
    ) {
      process.env.DATABASE_URL = `postgresql://${user}:${encodeURIComponent(password)}@${rest}`;
    }
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
