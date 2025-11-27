import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  getDescendantCount,
  getDescendantIds,
  validateParentSelection,
} from "./service";

// Mock the database module
vi.mock("@/db", () => ({
  db: {
    execute: vi.fn(),
  },
}));

// biome-ignore lint/suspicious/noExplicitAny: モックデータの型キャストに必要
type MockExecuteResult = any;

describe("validateParentSelection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation before each test
    vi.mocked(db.execute).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should reject when parent is self", async () => {
    const result = await validateParentSelection("node-1", "node-1");
    expect(result).toBe(false);
  });

  it("should reject when parent is descendant", async () => {
    // Mock getDescendantIds to return child nodes
    vi.mocked(db.execute).mockResolvedValue([
      { id: "node-2" },
      { id: "node-3" },
    ] as MockExecuteResult);

    // node-1 → node-2 → node-3 の階層
    const result = await validateParentSelection("node-1", "node-3");
    expect(result).toBe(false);
  });

  it("should accept valid parent", async () => {
    // Mock getDescendantIds to return empty array
    vi.mocked(db.execute).mockResolvedValue([] as MockExecuteResult);

    const result = await validateParentSelection("node-3", "node-1");
    expect(result).toBe(true);
  });

  it("should accept null parent", async () => {
    const result = await validateParentSelection("node-1", null);
    expect(result).toBe(true);
  });
});

describe("getDescendantIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation before each test
    vi.mocked(db.execute).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty array when no descendants", async () => {
    vi.mocked(db.execute).mockResolvedValue([] as MockExecuteResult);

    const result = await getDescendantIds("node-1");
    expect(result).toEqual([]);
  });

  it("should return all descendant IDs", async () => {
    vi.mocked(db.execute).mockResolvedValue([
      { id: "node-2" },
      { id: "node-3" },
      { id: "node-4" },
    ] as MockExecuteResult);

    const result = await getDescendantIds("node-1");
    expect(result).toEqual(["node-2", "node-3", "node-4"]);
  });

  it("should handle recursive hierarchy correctly", async () => {
    // node-1 → node-2 → node-3 → node-4 の階層
    vi.mocked(db.execute).mockResolvedValue([
      { id: "node-2" },
      { id: "node-3" },
      { id: "node-4" },
    ] as MockExecuteResult);

    const result = await getDescendantIds("node-1");
    expect(result).toEqual(["node-2", "node-3", "node-4"]);
    expect(result.length).toBe(3);
  });
});

describe("getDescendantCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.execute).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 0 when no descendants", async () => {
    vi.mocked(db.execute).mockResolvedValue([] as MockExecuteResult);

    const count = await getDescendantCount("node-1");
    expect(count).toBe(0);
  });

  it("should return correct count for descendants", async () => {
    vi.mocked(db.execute).mockResolvedValue([
      { id: "node-2" },
      { id: "node-3" },
      { id: "node-4" },
    ] as MockExecuteResult);

    const count = await getDescendantCount("node-1");
    expect(count).toBe(3);
  });
});
