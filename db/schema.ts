import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Organizations table - 組織階層データ（会社 → 本部 → 部署 → 課／チーム）
 *
 * 階層レベル (level):
 * - 1: 会社
 * - 2: 本部
 * - 3: 部署
 * - 4: 課／チーム
 *
 * Note: CHECK制約 (level >= 1 AND level <= 4) はマイグレーションファイルで手動追加
 */
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    parentId: uuid("parent_id"),
    level: integer("level").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // インデックス: parent_idによる階層検索を高速化
    index("idx_organizations_parent_id").on(table.parentId),
    // インデックス: levelによるフィルタリングを最適化
    index("idx_organizations_level").on(table.level),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
