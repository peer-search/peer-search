import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { employees } from "@/db/schema";
import type {
  Employee,
  EmployeeOrganization,
  SearchEmployeesParams,
} from "./service";
import {
  buildOrganizationPathsBatch,
  createEmployee,
  deleteEmployee,
  getEmployeeById,
  updateEmployee,
} from "./service";
import type { CreateEmployeeInput } from "./types";

// biome-ignore lint/suspicious/noExplicitAny: Mocking complex Drizzle ORM types requires any
type MockChain = any;

// Mock the database
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    execute: vi.fn(),
  },
}));

/**
 * EmployeeServiceのユニットテスト
 *
 * 注: このテストはDB接続が必要な統合テストのため、実際の実装後に
 * データベースセットアップを含めたテストを実行します。
 *
 * 現時点では型定義とインターフェースの検証のみを行います。
 */

describe("EmployeeService 型定義", () => {
  it("SearchEmployeesParams型が正しく定義されている", () => {
    const params: SearchEmployeesParams = {
      name: "山田",
      employeeNumber: "E001",
      hireYear: 2020,
      orgId: "uuid",
      sort: "name_kana",
      order: "asc",
    };

    expect(params.name).toBe("山田");
    expect(params.sort).toBe("name_kana");
  });

  it("EmployeeOrganization型が正しく定義されている", () => {
    const org: EmployeeOrganization = {
      organizationId: "org1",
      organizationName: "開発部",
      organizationPath: "会社 > 本部 > 開発部",
      position: "部長",
    };

    expect(org.organizationId).toBe("org1");
    expect(org.position).toBe("部長");
  });

  it("Employee型が正しく定義されている", () => {
    const employee: Employee = {
      id: "1",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "やまだたろう",
      photoS3Key: null,
      mobilePhone: "090-1234-5678",
      email: "yamada@example.com",
      hireDate: new Date("2020-04-01"),
      organizations: [],
    };

    expect(employee.id).toBe("1");
    expect(employee.organizations).toHaveLength(0);
  });

  it("Employee型に複数の組織を持たせることができる", () => {
    const employee: Employee = {
      id: "1",
      employeeNumber: "E001",
      nameKanji: "山田太郎",
      nameKana: "やまだたろう",
      photoS3Key: null,
      mobilePhone: null,
      email: "yamada@example.com",
      hireDate: new Date("2020-04-01"),
      organizations: [
        {
          organizationId: "org1",
          organizationName: "開発部",
          organizationPath: "会社 > 開発部",
          position: "部長",
        },
        {
          organizationId: "org2",
          organizationName: "営業部",
          organizationPath: "会社 > 営業部",
          position: "課長",
        },
      ],
    };

    expect(employee.organizations).toHaveLength(2);
    expect(employee.organizations[0].organizationName).toBe("開発部");
    expect(employee.organizations[1].organizationName).toBe("営業部");
  });
});

describe("getEmployeeById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("存在する社員IDで社員情報を取得できる", async () => {
    // Setup mock data
    const mockEmployeeId = "550e8400-e29b-41d4-a716-446655440000";
    const mockRows = [
      {
        id: mockEmployeeId,
        employeeNumber: "12345",
        nameKanji: "山田太郎",
        nameKana: "やまだたろう",
        photoS3Key: "photos/123.jpg",
        mobilePhone: "090-1234-5678",
        email: "yamada@example.com",
        hireDate: "2020-04-01",
        organizationId: "org1",
        organizationName: "技術本部",
        position: "課長",
      },
      {
        id: mockEmployeeId,
        employeeNumber: "12345",
        nameKanji: "山田太郎",
        nameKana: "やまだたろう",
        photoS3Key: "photos/123.jpg",
        mobilePhone: "090-1234-5678",
        email: "yamada@example.com",
        hireDate: "2020-04-01",
        organizationId: "org2",
        organizationName: "開発部",
        position: null,
      },
    ];

    // Mock db.execute for WITH RECURSIVE queries (buildOrganizationPath)
    (
      vi.mocked(db.execute).mockImplementation as unknown as (
        impl: (_query: unknown) => Promise<unknown>,
      ) => void
    )(async (_query: unknown) => {
      const queryString = String(_query);
      if (queryString.includes("org1")) {
        return [
          { name: "ABC株式会社", level: 1 },
          { name: "技術本部", level: 2 },
        ];
      }
      if (queryString.includes("org2")) {
        return [
          { name: "ABC株式会社", level: 1 },
          { name: "技術本部", level: 2 },
          { name: "開発部", level: 3 },
        ];
      }
      return [];
    });

    // Mock db.select chain
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockRows),
    };

    vi.mocked(db.select).mockReturnValue(mockSelect as MockChain);

    // Execute
    const employee = await getEmployeeById(mockEmployeeId);

    // Assertions
    expect(employee).toBeTruthy();
    expect(employee?.id).toBe(mockEmployeeId);
    expect(employee?.nameKanji).toBe("山田太郎");
    expect(employee?.nameKana).toBe("やまだたろう");
    expect(employee?.employeeNumber).toBe("12345");
    expect(employee?.email).toBe("yamada@example.com");
    expect(employee?.mobilePhone).toBe("090-1234-5678");
    expect(employee?.photoS3Key).toBe("photos/123.jpg");
    expect(employee?.hireDate).toEqual(new Date("2020-04-01"));
    expect(employee?.organizations).toHaveLength(2);
    expect(employee?.organizations[0].organizationId).toBe("org1");
    expect(employee?.organizations[0].position).toBe("課長");
    expect(employee?.organizations[1].organizationId).toBe("org2");
    expect(employee?.organizations[1].position).toBeNull();
  });

  it("存在しない社員IDでnullを返す", async () => {
    const mockEmployeeId = "999e8400-e29b-41d4-a716-446655440000";

    // Mock db.select to return empty array
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(db.select).mockReturnValue(mockSelect as MockChain);

    // Execute
    const employee = await getEmployeeById(mockEmployeeId);

    // Assertion
    expect(employee).toBeNull();
  });

  it("所属情報の階層パスが正しく生成される", async () => {
    const mockEmployeeId = "550e8400-e29b-41d4-a716-446655440000";
    const mockRows = [
      {
        id: mockEmployeeId,
        employeeNumber: "12345",
        nameKanji: "山田太郎",
        nameKana: "やまだたろう",
        photoS3Key: "photos/123.jpg",
        mobilePhone: "090-1234-5678",
        email: "yamada@example.com",
        hireDate: "2020-04-01",
        organizationId: "org1",
        organizationName: "第一課",
        position: null,
      },
    ];

    // Mock buildOrganizationPath to return full path
    (
      vi.mocked(db.execute).mockResolvedValue as unknown as (
        value: unknown,
      ) => void
    )([
      { name: "ABC株式会社", level: 1 },
      { name: "技術本部", level: 2 },
      { name: "開発部", level: 3 },
      { name: "第一課", level: 4 },
    ]);

    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockRows),
    };

    vi.mocked(db.select).mockReturnValue(mockSelect as MockChain);

    // Execute
    const employee = await getEmployeeById(mockEmployeeId);

    // Assertion
    expect(employee).toBeTruthy();
    expect(employee?.organizations[0].organizationPath).toBe(
      "ABC株式会社 技術本部 開発部 第一課",
    );
  });

  it("所属組織がない社員の場合、organizationsが空配列になる", async () => {
    const mockEmployeeId = "550e8400-e29b-41d4-a716-446655440000";
    const mockRows = [
      {
        id: mockEmployeeId,
        employeeNumber: "12345",
        nameKanji: "山田太郎",
        nameKana: "やまだたろう",
        photoS3Key: null,
        mobilePhone: null,
        email: "yamada@example.com",
        hireDate: "2020-04-01",
        organizationId: null,
        organizationName: null,
        position: null,
      },
    ];

    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockRows),
    };

    vi.mocked(db.select).mockReturnValue(mockSelect as MockChain);

    // Execute
    const employee = await getEmployeeById(mockEmployeeId);

    // Assertions
    expect(employee).toBeTruthy();
    expect(employee?.organizations).toHaveLength(0);
  });
});

describe("createEmployee", () => {
  // テスト用の社員データ
  const validEmployeeData: CreateEmployeeInput = {
    employeeNumber: "TEST-001",
    nameKanji: "テスト太郎",
    nameKana: "テストタロウ",
    email: "test.taro@example.com",
    hireDate: "2024-01-15",
    mobilePhone: "090-1234-5678",
  };

  // 各テストの前に、テスト用社員データをクリーンアップ
  beforeEach(async () => {
    vi.clearAllMocks();

    // 実際のDBを使用する統合テスト用のクリーンアップ
    // モックモードでは実行されない
    if (!vi.isMockFunction(db.delete)) {
      try {
        await db
          .delete(employees)
          .where(
            eq(employees.employeeNumber, validEmployeeData.employeeNumber),
          );
        await db
          .delete(employees)
          .where(eq(employees.email, validEmployeeData.email));
      } catch (_error) {
        // エラーは無視（データが存在しない場合）
      }
    }
  });

  it("新規社員を正常に作成できる", async () => {
    // モックの設定
    const mockInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          employeeNumber: validEmployeeData.employeeNumber,
          nameKanji: validEmployeeData.nameKanji,
          nameKana: validEmployeeData.nameKana,
          email: validEmployeeData.email,
          hireDate: validEmployeeData.hireDate,
          mobilePhone: validEmployeeData.mobilePhone,
          photoS3Key: null,
          createdAt: new Date(),
        },
      ]),
    };

    vi.mocked(db).insert = vi.fn().mockReturnValue(mockInsert) as MockChain;

    // Act
    const result = await createEmployee(validEmployeeData);

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBeTruthy();
    expect(result.employeeNumber).toBe(validEmployeeData.employeeNumber);
    expect(result.nameKanji).toBe(validEmployeeData.nameKanji);
    expect(result.nameKana).toBe(validEmployeeData.nameKana);
    expect(result.email).toBe(validEmployeeData.email);
    expect(result.hireDate).toEqual(new Date(validEmployeeData.hireDate));
    expect(result.mobilePhone).toBe(validEmployeeData.mobilePhone);
    expect(result.photoS3Key).toBeNull();
    expect(result.organizations).toEqual([]);
  });

  it("携帯電話が未指定の場合、nullで保存される", async () => {
    // Arrange
    const dataWithoutPhone: CreateEmployeeInput = {
      ...validEmployeeData,
      mobilePhone: undefined,
    };

    // モックの設定
    const mockInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          employeeNumber: dataWithoutPhone.employeeNumber,
          nameKanji: dataWithoutPhone.nameKanji,
          nameKana: dataWithoutPhone.nameKana,
          email: dataWithoutPhone.email,
          hireDate: dataWithoutPhone.hireDate,
          mobilePhone: null,
          photoS3Key: null,
          createdAt: new Date(),
        },
      ]),
    };

    vi.mocked(db).insert = vi.fn().mockReturnValue(mockInsert) as MockChain;

    // Act
    const result = await createEmployee(dataWithoutPhone);

    // Assert
    expect(result.mobilePhone).toBeNull();
  });

  it("UNIQUE制約違反（社員番号重複）時にエラーをスローする", async () => {
    // モックの設定: PostgreSQLのUNIQUE制約エラーをシミュレート
    const mockInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockRejectedValue(
        Object.assign(
          new Error("duplicate key value violates unique constraint"),
          {
            code: "23505",
            constraint: "employees_employee_number_unique",
          },
        ),
      ),
    };

    vi.mocked(db).insert = vi.fn().mockReturnValue(mockInsert) as MockChain;

    // Act & Assert
    await expect(createEmployee(validEmployeeData)).rejects.toThrow();
  });

  it("UNIQUE制約違反（メールアドレス重複）時にエラーをスローする", async () => {
    // モックの設定: PostgreSQLのUNIQUE制約エラーをシミュレート
    const mockInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockRejectedValue(
        Object.assign(
          new Error("duplicate key value violates unique constraint"),
          {
            code: "23505",
            constraint: "employees_email_unique",
          },
        ),
      ),
    };

    vi.mocked(db).insert = vi.fn().mockReturnValue(mockInsert) as MockChain;

    // Act & Assert
    await expect(createEmployee(validEmployeeData)).rejects.toThrow();
  });

  it("入社日が正しくDateオブジェクトに変換される", async () => {
    // モックの設定
    const mockInsert = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: "550e8400-e29b-41d4-a716-446655440002",
          employeeNumber: validEmployeeData.employeeNumber,
          nameKanji: validEmployeeData.nameKanji,
          nameKana: validEmployeeData.nameKana,
          email: validEmployeeData.email,
          hireDate: validEmployeeData.hireDate,
          mobilePhone: validEmployeeData.mobilePhone,
          photoS3Key: null,
          createdAt: new Date(),
        },
      ]),
    };

    vi.mocked(db).insert = vi.fn().mockReturnValue(mockInsert) as MockChain;

    // Act
    const result = await createEmployee(validEmployeeData);

    // Assert
    expect(result.hireDate).toBeInstanceOf(Date);
    expect(result.hireDate.getFullYear()).toBe(2024);
    expect(result.hireDate.getMonth()).toBe(0); // 0-indexed (January)
    expect(result.hireDate.getDate()).toBe(15);
  });
});

describe("updateEmployee", () => {
  const mockEmployeeId = "550e8400-e29b-41d4-a716-446655440100";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("社員情報を正常に更新できる", async () => {
    const updateData = {
      nameKanji: "更新太郎",
      nameKana: "コウシンタロウ",
      email: "updated@example.com",
      hireDate: "2024-02-01",
      mobilePhone: "080-9999-8888",
    };

    // モックの設定: update
    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: mockEmployeeId,
          employeeNumber: "TEST-001",
          nameKanji: updateData.nameKanji,
          nameKana: updateData.nameKana,
          email: updateData.email,
          hireDate: updateData.hireDate,
          mobilePhone: updateData.mobilePhone,
          photoS3Key: null,
          createdAt: new Date(),
        },
      ]),
    };

    vi.mocked(db).update = vi.fn().mockReturnValue(mockUpdate) as MockChain;

    // モックの設定: getEmployeeById (内部で呼び出される)
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          id: mockEmployeeId,
          employeeNumber: "TEST-001",
          nameKanji: updateData.nameKanji,
          nameKana: updateData.nameKana,
          email: updateData.email,
          hireDate: updateData.hireDate,
          mobilePhone: updateData.mobilePhone,
          photoS3Key: null,
          organizationId: null,
          organizationName: null,
          position: null,
        },
      ]),
    };

    vi.mocked(db.select).mockReturnValue(mockSelect as MockChain);

    // Act
    const result = await updateEmployee(mockEmployeeId, updateData);

    // Assert
    expect(result).toBeDefined();
    expect(result.id).toBe(mockEmployeeId);
    expect(result.nameKanji).toBe(updateData.nameKanji);
    expect(result.nameKana).toBe(updateData.nameKana);
    expect(result.email).toBe(updateData.email);
    expect(result.mobilePhone).toBe(updateData.mobilePhone);
  });

  it("存在しない社員IDでエラーをスローする", async () => {
    // モックの設定: update returning empty array
    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(db).update = vi.fn().mockReturnValue(mockUpdate) as MockChain;

    // Act & Assert
    await expect(
      updateEmployee("nonexistent-id", { nameKanji: "テスト" }),
    ).rejects.toThrow("Employee not found");
  });

  it("UNIQUE制約違反（メールアドレス重複）時にエラーをスローする", async () => {
    // モックの設定: PostgreSQLのUNIQUE制約エラーをシミュレート
    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockRejectedValue(
        Object.assign(
          new Error("duplicate key value violates unique constraint"),
          {
            code: "23505",
            constraint: "employees_email_unique",
          },
        ),
      ),
    };

    vi.mocked(db).update = vi.fn().mockReturnValue(mockUpdate) as MockChain;

    // Act & Assert
    await expect(
      updateEmployee(mockEmployeeId, { email: "duplicate@example.com" }),
    ).rejects.toThrow();
  });

  it("携帯電話をnullに更新できる", async () => {
    const updateData = {
      mobilePhone: null,
    };

    // モックの設定: update
    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([
        {
          id: mockEmployeeId,
          employeeNumber: "TEST-001",
          nameKanji: "テスト太郎",
          nameKana: "テストタロウ",
          email: "test@example.com",
          hireDate: "2024-01-15",
          mobilePhone: null,
          photoS3Key: null,
          createdAt: new Date(),
        },
      ]),
    };

    vi.mocked(db).update = vi.fn().mockReturnValue(mockUpdate) as MockChain;

    // モックの設定: getEmployeeById
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          id: mockEmployeeId,
          employeeNumber: "TEST-001",
          nameKanji: "テスト太郎",
          nameKana: "テストタロウ",
          email: "test@example.com",
          hireDate: "2024-01-15",
          mobilePhone: null,
          photoS3Key: null,
          organizationId: null,
          organizationName: null,
          position: null,
        },
      ]),
    };

    vi.mocked(db.select).mockReturnValue(mockSelect as MockChain);

    // Act
    const result = await updateEmployee(mockEmployeeId, updateData);

    // Assert
    expect(result.mobilePhone).toBeNull();
  });
});

describe("deleteEmployee", () => {
  const mockEmployeeId = "550e8400-e29b-41d4-a716-446655440200";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("社員を正常に削除できる", async () => {
    // モックの設定: delete
    const mockDelete = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: mockEmployeeId }]),
    };

    vi.mocked(db).delete = vi.fn().mockReturnValue(mockDelete) as MockChain;

    // Act & Assert (エラーがスローされないことを確認)
    await expect(deleteEmployee(mockEmployeeId)).resolves.toBeUndefined();
  });

  it("存在しない社員IDでエラーをスローする", async () => {
    // モックの設定: delete returning empty array
    const mockDelete = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };

    vi.mocked(db).delete = vi.fn().mockReturnValue(mockDelete) as MockChain;

    // Act & Assert
    await expect(deleteEmployee("nonexistent-id")).rejects.toThrow(
      "Employee not found",
    );
  });

  it("CASCADE DELETEにより関連レコードも削除される", async () => {
    // このテストはモックレベルでは検証が難しいため、
    // 実際のDBを使った統合テストで検証する
    // ここではCASCADE DELETE設定があることをドキュメント化

    // モックの設定
    const mockDelete = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: mockEmployeeId }]),
    };

    vi.mocked(db).delete = vi.fn().mockReturnValue(mockDelete) as MockChain;

    // Act
    await deleteEmployee(mockEmployeeId);

    // Assert: CASCADE DELETEはDB側の設定で自動実行される
    // employee_organizationsテーブルのレコードも自動削除されることを期待
    expect(mockDelete.where).toHaveBeenCalled();
  });
});

describe("buildOrganizationPathsBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("空の配列が渡された場合、空Mapを返す", async () => {
    // Act
    const result = await buildOrganizationPathsBatch([]);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });

  it("単一の組織IDで正しい階層パスを返す", async () => {
    const orgId = "550e8400-e29b-41d4-a716-446655440000";

    // Mock db.execute to return organization hierarchy
    (
      vi.mocked(db.execute).mockResolvedValue as unknown as (
        value: unknown,
      ) => void
    )([
      {
        organization_id: orgId,
        path: "株式会社ユニリタ 開発本部 製品開発部",
      },
    ]);

    // Act
    const result = await buildOrganizationPathsBatch([orgId]);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(1);
    expect(result.get(orgId)).toBe("株式会社ユニリタ 開発本部 製品開発部");
  });

  it("複数の組織IDですべての階層パスを含むMapを返す", async () => {
    const orgId1 = "550e8400-e29b-41d4-a716-446655440001";
    const orgId2 = "550e8400-e29b-41d4-a716-446655440002";
    const orgId3 = "550e8400-e29b-41d4-a716-446655440003";

    // Mock db.execute to return multiple organization hierarchies
    (
      vi.mocked(db.execute).mockResolvedValue as unknown as (
        value: unknown,
      ) => void
    )([
      {
        organization_id: orgId1,
        path: "株式会社ユニリタ 開発本部 製品開発部",
      },
      {
        organization_id: orgId2,
        path: "株式会社ユニリタ 管理本部 総務部",
      },
      {
        organization_id: orgId3,
        path: "株式会社ユニリタ 営業本部",
      },
    ]);

    // Act
    const result = await buildOrganizationPathsBatch([orgId1, orgId2, orgId3]);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(3);
    expect(result.get(orgId1)).toBe("株式会社ユニリタ 開発本部 製品開発部");
    expect(result.get(orgId2)).toBe("株式会社ユニリタ 管理本部 総務部");
    expect(result.get(orgId3)).toBe("株式会社ユニリタ 営業本部");
  });

  it("存在しない組織IDが含まれる場合、空文字列を値として返す", async () => {
    const existingOrgId = "550e8400-e29b-41d4-a716-446655440001";
    const nonExistentOrgId = "550e8400-e29b-41d4-a716-446655440999";

    // Mock db.execute to return only existing organization
    (
      vi.mocked(db.execute).mockResolvedValue as unknown as (
        value: unknown,
      ) => void
    )([
      {
        organization_id: existingOrgId,
        path: "株式会社ユニリタ 開発本部",
      },
      // nonExistentOrgId はクエリ結果に含まれない
    ]);

    // Act
    const result = await buildOrganizationPathsBatch([
      existingOrgId,
      nonExistentOrgId,
    ]);

    // Assert
    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(2);
    expect(result.get(existingOrgId)).toBe("株式会社ユニリタ 開発本部");
    expect(result.get(nonExistentOrgId)).toBe("");
  });

  it("階層パスの形式が既存のbuildOrganizationPath()と一致する（半角スペース区切り）", async () => {
    const orgId = "550e8400-e29b-41d4-a716-446655440000";

    // Mock db.execute to return a 4-level hierarchy
    (
      vi.mocked(db.execute).mockResolvedValue as unknown as (
        value: unknown,
      ) => void
    )([
      {
        organization_id: orgId,
        path: "ABC株式会社 技術本部 開発部 第一課",
      },
    ]);

    // Act
    const result = await buildOrganizationPathsBatch([orgId]);

    // Assert: 半角スペース区切りで連結されていることを確認
    expect(result.get(orgId)).toBe("ABC株式会社 技術本部 開発部 第一課");
    expect(result.get(orgId)).toContain(" "); // 半角スペースが含まれる
    expect(result.get(orgId)).not.toContain("　"); // 全角スペースは含まれない
  });
});
