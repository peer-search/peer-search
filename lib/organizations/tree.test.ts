import { describe, expect, it } from "vitest";
import { buildTree } from "./tree";
import type { OrganizationFlatNode } from "./types";

// テスト用の日付を固定
const testDate = new Date("2024-01-01");

describe("buildTree", () => {
  it("空配列の場合、空配列を返す", () => {
    const result = buildTree([]);
    expect(result).toEqual([]);
  });

  it("単一のルートノード（parentId: null）をツリーに変換する", () => {
    const flatNodes: OrganizationFlatNode[] = [
      {
        id: "1",
        name: "会社A",
        parentId: null,
        level: 1,
        createdAt: testDate,
        updatedAt: testDate,
      },
    ];

    const result = buildTree(flatNodes);

    expect(result).toEqual([
      { id: "1", name: "会社A", level: 1, children: [] },
    ]);
  });

  it("親子関係（2階層）を正しくツリー構造に変換する", () => {
    const flatNodes: OrganizationFlatNode[] = [
      {
        id: "1",
        name: "会社A",
        parentId: null,
        level: 1,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "2",
        name: "本部B",
        parentId: "1",
        level: 2,
        createdAt: testDate,
        updatedAt: testDate,
      },
    ];

    const result = buildTree(flatNodes);

    expect(result).toEqual([
      {
        id: "1",
        name: "会社A",
        level: 1,
        children: [{ id: "2", name: "本部B", level: 2, children: [] }],
      },
    ]);
  });

  it("複数階層（4階層）を正しくツリー構造に変換する", () => {
    const flatNodes: OrganizationFlatNode[] = [
      {
        id: "1",
        name: "会社A",
        parentId: null,
        level: 1,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "2",
        name: "本部B",
        parentId: "1",
        level: 2,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "3",
        name: "部署C",
        parentId: "2",
        level: 3,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "4",
        name: "課D",
        parentId: "3",
        level: 4,
        createdAt: testDate,
        updatedAt: testDate,
      },
    ];

    const result = buildTree(flatNodes);

    expect(result).toEqual([
      {
        id: "1",
        name: "会社A",
        level: 1,
        children: [
          {
            id: "2",
            name: "本部B",
            level: 2,
            children: [
              {
                id: "3",
                name: "部署C",
                level: 3,
                children: [{ id: "4", name: "課D", level: 4, children: [] }],
              },
            ],
          },
        ],
      },
    ]);
  });

  it("複数の兄弟ノードを持つツリーを正しく構築する", () => {
    const flatNodes: OrganizationFlatNode[] = [
      {
        id: "1",
        name: "会社A",
        parentId: null,
        level: 1,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "2",
        name: "本部B",
        parentId: "1",
        level: 2,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "3",
        name: "本部C",
        parentId: "1",
        level: 2,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "4",
        name: "部署D",
        parentId: "2",
        level: 3,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "5",
        name: "部署E",
        parentId: "2",
        level: 3,
        createdAt: testDate,
        updatedAt: testDate,
      },
    ];

    const result = buildTree(flatNodes);

    expect(result).toEqual([
      {
        id: "1",
        name: "会社A",
        level: 1,
        children: [
          {
            id: "2",
            name: "本部B",
            level: 2,
            children: [
              { id: "4", name: "部署D", level: 3, children: [] },
              { id: "5", name: "部署E", level: 3, children: [] },
            ],
          },
          { id: "3", name: "本部C", level: 2, children: [] },
        ],
      },
    ]);
  });

  it("複数のルートノードを持つ場合、すべてのルートノードを返す", () => {
    const flatNodes: OrganizationFlatNode[] = [
      {
        id: "1",
        name: "会社A",
        parentId: null,
        level: 1,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "2",
        name: "会社B",
        parentId: null,
        level: 1,
        createdAt: testDate,
        updatedAt: testDate,
      },
    ];

    const result = buildTree(flatNodes);

    expect(result).toEqual([
      { id: "1", name: "会社A", level: 1, children: [] },
      { id: "2", name: "会社B", level: 1, children: [] },
    ]);
  });

  it("子ノードをlevel順でソートする", () => {
    const flatNodes: OrganizationFlatNode[] = [
      {
        id: "1",
        name: "会社A",
        parentId: null,
        level: 1,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "4",
        name: "課D",
        parentId: "1",
        level: 4,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "2",
        name: "本部B",
        parentId: "1",
        level: 2,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "3",
        name: "部署C",
        parentId: "1",
        level: 3,
        createdAt: testDate,
        updatedAt: testDate,
      },
    ];

    const result = buildTree(flatNodes);

    // 子ノードがlevel順（2, 3, 4）でソートされていることを確認
    expect(result[0].children[0].level).toBe(2);
    expect(result[0].children[1].level).toBe(3);
    expect(result[0].children[2].level).toBe(4);
  });

  it("親ノードが存在しない場合、ルートノードとして扱う（データ不整合対応）", () => {
    const flatNodes: OrganizationFlatNode[] = [
      {
        id: "1",
        name: "会社A",
        parentId: null,
        level: 1,
        createdAt: testDate,
        updatedAt: testDate,
      },
      {
        id: "2",
        name: "孤立ノード",
        parentId: "999",
        level: 2,
        createdAt: testDate,
        updatedAt: testDate,
      }, // 親ID 999 は存在しない
    ];

    const result = buildTree(flatNodes);

    // 孤立ノードがルートノードとして扱われる
    expect(result).toHaveLength(2);
    expect(result.some((node) => node.id === "2")).toBe(true);
  });
});
