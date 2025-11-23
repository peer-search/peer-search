import {
  date,
  index,
  integer,
  pgTable,
  primaryKey,
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

/**
 * Employees table - 社員情報
 */
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeNumber: text("employee_number").notNull().unique(),
    nameKanji: text("name_kanji").notNull(),
    nameKana: text("name_kana").notNull(),
    photoS3Key: text("photo_s3_key"), // NULLABLE
    mobilePhone: text("mobile_phone"), // NULLABLE
    email: text("email").notNull().unique(),
    hireDate: date("hire_date").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_employees_name_kana").on(table.nameKana), // 氏名検索最適化
    index("idx_employees_employee_number").on(table.employeeNumber), // 社員番号検索最適化
    index("idx_employees_hire_date").on(table.hireDate), // 入社年検索最適化
  ],
);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;

/**
 * Employee_Organizations table - 社員と組織の多対多リレーション
 */
export const employeeOrganizations = pgTable(
  "employee_organizations",
  {
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    position: text("position"), // NULLABLE (役職)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // 複合主キー
    pk: primaryKey({ columns: [table.employeeId, table.organizationId] }),
    // 社員IDで検索最適化
    employeeIdIdx: index("idx_employee_organizations_employee_id").on(
      table.employeeId,
    ),
    // 組織IDで検索最適化
    organizationIdIdx: index("idx_employee_organizations_organization_id").on(
      table.organizationId,
    ),
  }),
);

export type EmployeeOrganization = typeof employeeOrganizations.$inferSelect;
export type NewEmployeeOrganization = typeof employeeOrganizations.$inferInsert;
