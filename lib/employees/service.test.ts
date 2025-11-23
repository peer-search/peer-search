import { describe, expect, it } from "vitest";
import type {
  Employee,
  EmployeeOrganization,
  SearchEmployeesParams,
} from "./service";

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
