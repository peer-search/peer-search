/**
 * Organization Actions Integration Tests
 *
 * これらのテストは実際のデータベースに接続して、Server ActionsとDB操作の統合を検証します。
 *
 * 実行要件:
 * - DATABASE_URLが.env.localに設定されていること
 * - Supabaseデータベースへの接続が可能であること
 *
 * 注意:
 * - これらのテストは実際のデータベースにテストデータを作成・削除します
 * - ローカル環境で実行困難な場合は、CI/CD環境でのみ実行することを推奨します
 */

import type { User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { db } from "@/db";
import type { Profile } from "@/db/schema";
import { organizations } from "@/db/schema";
import * as profileService from "@/lib/profiles/service";
import * as auth from "@/lib/supabase-auth/auth";
import {
  createOrganizationAction,
  deleteOrganizationAction,
  updateOrganizationAction,
} from "./actions";

// Skip integration tests if DATABASE_URL is not available
// Note: Connection failures will be caught during test execution
const shouldSkipIntegrationTests =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes("pooler.supabase.com");

// Mock auth and profile service only
vi.mock("@/lib/supabase-auth/auth");
vi.mock("@/lib/profiles/service");
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Helper to setup admin user
function setupAdminUser() {
  vi.mocked(auth.getUser).mockResolvedValue({
    id: "test-admin-user",
  } as User);
  vi.mocked(profileService.getProfileByUserId).mockResolvedValue({
    userId: "test-admin-user",
    role: "admin",
  } as Profile);
}

describe.skipIf(shouldSkipIntegrationTests)(
  "Organization Actions Integration Tests",
  () => {
    let testOrgIds: string[] = [];

    beforeAll(() => {
      // Note: Database connection is checked by shouldSkipIntegrationTests flag
      // Integration tests are skipped if DATABASE_URL is not properly configured
    });

    beforeEach(() => {
      vi.clearAllMocks();
      setupAdminUser();
      testOrgIds = [];
    });

    afterEach(async () => {
      // Cleanup test data
      if (testOrgIds.length > 0) {
        try {
          // Delete in reverse order (children first)
          for (const id of testOrgIds.reverse()) {
            await db
              .delete(organizations)
              .where((t) => t.id === id)
              .catch(() => {
                /* ignore errors */
              });
          }
        } catch (error) {
          console.error("Cleanup error:", error);
        }
      }
    });

    describe("createOrganizationAction", () => {
      it("新しいルート組織を作成できる", async () => {
        // Act
        const result = await createOrganizationAction({
          name: "テスト会社",
          parentId: null,
        });

        // Assert
        expect(result.success).toBe(true);

        // Verify database
        const created = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "テスト会社"),
        });
        expect(created).toBeDefined();
        expect(created?.level).toBe(1);
        expect(created?.parentId).toBeNull();

        if (created) {
          testOrgIds.push(created.id);
        }
      });

      it("親組織の配下に子組織を作成できる", async () => {
        // Arrange: Create parent organization
        const parentResult = await createOrganizationAction({
          name: "親組織",
          parentId: null,
        });
        expect(parentResult.success).toBe(true);

        const parent = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "親組織"),
        });
        expect(parent).toBeDefined();
        testOrgIds.push(parent!.id);

        // Act: Create child organization
        const childResult = await createOrganizationAction({
          name: "子組織",
          parentId: parent!.id,
        });

        // Assert
        expect(childResult.success).toBe(true);

        // Verify database
        const child = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "子組織"),
        });
        expect(child).toBeDefined();
        expect(child?.level).toBe(2); // Parent level + 1
        expect(child?.parentId).toBe(parent!.id);

        if (child) {
          testOrgIds.push(child.id);
        }
      });

      it("レベル4の組織配下には子組織を作成できない", async () => {
        // Arrange: Create level 4 organization
        const level1 = await createOrganizationAction({
          name: "会社",
          parentId: null,
        });
        const org1 = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "会社"),
        });
        testOrgIds.push(org1!.id);

        const level2 = await createOrganizationAction({
          name: "本部",
          parentId: org1!.id,
        });
        const org2 = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "本部"),
        });
        testOrgIds.push(org2!.id);

        const level3 = await createOrganizationAction({
          name: "部署",
          parentId: org2!.id,
        });
        const org3 = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "部署"),
        });
        testOrgIds.push(org3!.id);

        const level4 = await createOrganizationAction({
          name: "課",
          parentId: org3!.id,
        });
        const org4 = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "課"),
        });
        expect(org4?.level).toBe(4);
        testOrgIds.push(org4!.id);

        // Act: Try to create level 5 (should fail)
        const result = await createOrganizationAction({
          name: "チーム",
          parentId: org4!.id,
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain("課／チーム配下には追加できません");
      });
    });

    describe("updateOrganizationAction", () => {
      it("組織名を更新できる", async () => {
        // Arrange: Create organization
        await createOrganizationAction({
          name: "元の名前",
          parentId: null,
        });
        const org = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "元の名前"),
        });
        expect(org).toBeDefined();
        testOrgIds.push(org!.id);

        // Act: Update name
        const result = await updateOrganizationAction({
          id: org!.id,
          name: "更新後の名前",
          parentId: null,
        });

        // Assert
        expect(result.success).toBe(true);

        // Verify database
        const updated = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, org!.id),
        });
        expect(updated?.name).toBe("更新後の名前");
        expect(updated?.level).toBe(1);
      });

      it("親組織を変更すると階層レベルが再計算される", async () => {
        // Arrange: Create organizations
        // Level 1: Company
        await createOrganizationAction({
          name: "会社",
          parentId: null,
        });
        const company = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "会社"),
        });
        testOrgIds.push(company!.id);

        // Level 2: Department (child of company)
        await createOrganizationAction({
          name: "本部A",
          parentId: company!.id,
        });
        const deptA = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "本部A"),
        });
        testOrgIds.push(deptA!.id);

        // Level 2: Another department (will be moved)
        await createOrganizationAction({
          name: "本部B",
          parentId: company!.id,
        });
        const deptB = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "本部B"),
        });
        testOrgIds.push(deptB!.id);

        // Level 3: Section (child of deptB)
        await createOrganizationAction({
          name: "部署",
          parentId: deptB!.id,
        });
        const section = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "部署"),
        });
        expect(section?.level).toBe(3);
        testOrgIds.push(section!.id);

        // Act: Move deptB to be a child of deptA (level 2 → level 3)
        const result = await updateOrganizationAction({
          id: deptB!.id,
          name: "本部B",
          parentId: deptA!.id,
        });

        // Assert
        expect(result.success).toBe(true);

        // Verify: deptB should now be level 3
        const updatedDeptB = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, deptB!.id),
        });
        expect(updatedDeptB?.level).toBe(3); // deptA (level 2) + 1

        // Verify: section should now be level 4 (cascaded update)
        const updatedSection = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, section!.id),
        });
        expect(updatedSection?.level).toBe(4); // updatedDeptB (level 3) + 1
      });

      it("親をnullに変更するとルート組織になる", async () => {
        // Arrange: Create parent and child
        await createOrganizationAction({
          name: "親組織",
          parentId: null,
        });
        const parent = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "親組織"),
        });
        testOrgIds.push(parent!.id);

        await createOrganizationAction({
          name: "子組織",
          parentId: parent!.id,
        });
        const child = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "子組織"),
        });
        expect(child?.level).toBe(2);
        testOrgIds.push(child!.id);

        // Act: Move child to root
        const result = await updateOrganizationAction({
          id: child!.id,
          name: "子組織",
          parentId: null,
        });

        // Assert
        expect(result.success).toBe(true);

        // Verify: child should now be level 1
        const updated = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, child!.id),
        });
        expect(updated?.level).toBe(1);
        expect(updated?.parentId).toBeNull();
      });

      it("循環参照を防ぐ（自分自身を親に設定できない）", async () => {
        // Arrange: Create organization
        await createOrganizationAction({
          name: "組織",
          parentId: null,
        });
        const org = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "組織"),
        });
        testOrgIds.push(org!.id);

        // Act: Try to set self as parent
        const result = await updateOrganizationAction({
          id: org!.id,
          name: "組織",
          parentId: org!.id, // Self-reference
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain(
          "親組織に自分自身または子部署は選択できません",
        );
      });

      it("循環参照を防ぐ（子孫を親に設定できない）", async () => {
        // Arrange: Create parent → child hierarchy
        await createOrganizationAction({
          name: "親",
          parentId: null,
        });
        const parent = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "親"),
        });
        testOrgIds.push(parent!.id);

        await createOrganizationAction({
          name: "子",
          parentId: parent!.id,
        });
        const child = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "子"),
        });
        testOrgIds.push(child!.id);

        await createOrganizationAction({
          name: "孫",
          parentId: child!.id,
        });
        const grandchild = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "孫"),
        });
        testOrgIds.push(grandchild!.id);

        // Act: Try to set grandchild as parent of parent (circular reference)
        const result = await updateOrganizationAction({
          id: parent!.id,
          name: "親",
          parentId: grandchild!.id, // Circular reference
        });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain(
          "親組織に自分自身または子部署は選択できません",
        );
      });
    });

    describe("deleteOrganizationAction", () => {
      it("ルートノードの削除は拒否される", async () => {
        // Arrange: Create root organization
        await createOrganizationAction({
          name: "会社",
          parentId: null,
        });
        const org = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "会社"),
        });
        testOrgIds.push(org!.id);

        // Act: Try to delete root node
        const result = await deleteOrganizationAction(org!.id);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain("ルート組織は削除できません");

        // Verify: organization still exists
        const stillExists = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, org!.id),
        });
        expect(stillExists).toBeDefined();
      });

      it("組織を削除できる", async () => {
        // Arrange: Create parent and child
        await createOrganizationAction({
          name: "親組織",
          parentId: null,
        });
        const parent = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "親組織"),
        });
        testOrgIds.push(parent!.id);

        await createOrganizationAction({
          name: "子組織",
          parentId: parent!.id,
        });
        const child = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "子組織"),
        });
        testOrgIds.push(child!.id);

        // Act: Delete child organization
        const result = await deleteOrganizationAction(child!.id);

        // Assert
        expect(result.success).toBe(true);

        // Verify: child is deleted
        const deleted = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, child!.id),
        });
        expect(deleted).toBeUndefined();

        // Verify: parent still exists
        const parentExists = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, parent!.id),
        });
        expect(parentExists).toBeDefined();
      });

      it("ON DELETE CASCADEにより子孫組織も連動削除される", async () => {
        // Arrange: Create hierarchy: parent → child → grandchild
        await createOrganizationAction({
          name: "親",
          parentId: null,
        });
        const parent = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "親"),
        });
        testOrgIds.push(parent!.id);

        await createOrganizationAction({
          name: "子",
          parentId: parent!.id,
        });
        const child = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "子"),
        });
        testOrgIds.push(child!.id);

        await createOrganizationAction({
          name: "孫",
          parentId: child!.id,
        });
        const grandchild = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.name, "孫"),
        });
        testOrgIds.push(grandchild!.id);

        // Act: Delete child (grandchild should cascade)
        const result = await deleteOrganizationAction(child!.id);

        // Assert
        expect(result.success).toBe(true);

        // Verify: child is deleted
        const childDeleted = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, child!.id),
        });
        expect(childDeleted).toBeUndefined();

        // Verify: grandchild is also deleted (CASCADE)
        const grandchildDeleted = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, grandchild!.id),
        });
        expect(grandchildDeleted).toBeUndefined();

        // Verify: parent still exists
        const parentExists = await db.query.organizations.findFirst({
          where: (t, { eq }) => eq(t.id, parent!.id),
        });
        expect(parentExists).toBeDefined();
      });
    });
  },
);
