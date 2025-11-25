/**
 * Task 2.2: 組織管理用の型定義拡張のテスト
 *
 * このテストは、Server Actions用の入力型とActionResult型が正しく定義されていることを検証します。
 */

import { describe, expect, it } from "vitest";
import type {
  ActionResult,
  CreateOrganizationInput,
  OrganizationFlatNode,
  UpdateOrganizationInput,
} from "./types";

describe("Task 2.2: 組織管理用の型定義", () => {
  describe("OrganizationFlatNode", () => {
    it("should include updatedAt field", () => {
      const node: OrganizationFlatNode = {
        id: "test-id",
        name: "Test Organization",
        parentId: null,
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(node.updatedAt).toBeDefined();
      expect(node.updatedAt).toBeInstanceOf(Date);
    });

    it("should have parentId as string | null", () => {
      const nodeWithParent: OrganizationFlatNode = {
        id: "child-id",
        name: "Child Organization",
        parentId: "parent-id",
        level: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const nodeWithoutParent: OrganizationFlatNode = {
        id: "root-id",
        name: "Root Organization",
        parentId: null,
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(nodeWithParent.parentId).toBe("parent-id");
      expect(nodeWithoutParent.parentId).toBeNull();
    });
  });

  describe("CreateOrganizationInput", () => {
    it("should have name and parentId fields", () => {
      const input: CreateOrganizationInput = {
        name: "New Organization",
        parentId: null,
      };

      expect(input.name).toBe("New Organization");
      expect(input.parentId).toBeNull();
    });

    it("should allow parentId to be a string", () => {
      const input: CreateOrganizationInput = {
        name: "Child Organization",
        parentId: "parent-id",
      };

      expect(input.parentId).toBe("parent-id");
    });
  });

  describe("UpdateOrganizationInput", () => {
    it("should have id, name, and parentId fields", () => {
      const input: UpdateOrganizationInput = {
        id: "org-id",
        name: "Updated Organization",
        parentId: "new-parent-id",
      };

      expect(input.id).toBe("org-id");
      expect(input.name).toBe("Updated Organization");
      expect(input.parentId).toBe("new-parent-id");
    });

    it("should allow parentId to be null", () => {
      const input: UpdateOrganizationInput = {
        id: "org-id",
        name: "Root Organization",
        parentId: null,
      };

      expect(input.parentId).toBeNull();
    });
  });

  describe("ActionResult", () => {
    it("should represent successful result without data", () => {
      const result: ActionResult = {
        success: true,
      };

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.error).toBeUndefined();
    });

    it("should represent successful result with data", () => {
      const result: ActionResult<{ id: string }> = {
        success: true,
        data: { id: "new-org-id" },
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: "new-org-id" });
      expect(result.error).toBeUndefined();
    });

    it("should represent failed result with error message", () => {
      const result: ActionResult = {
        success: false,
        error: "Validation error: name is required",
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe("Validation error: name is required");
      expect(result.data).toBeUndefined();
    });

    it("should work with generic data type", () => {
      type OrganizationData = {
        id: string;
        name: string;
      };

      const result: ActionResult<OrganizationData> = {
        success: true,
        data: {
          id: "org-123",
          name: "Test Organization",
        },
      };

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("Test Organization");
    });
  });
});
