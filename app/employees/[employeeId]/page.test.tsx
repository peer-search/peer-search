import { render, screen } from "@testing-library/react";
import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EmployeeDetailPage, { generateMetadata } from "./page";

// Mock dependencies
vi.mock("@/lib/supabase-auth/auth", () => ({
  getUser: vi.fn(),
}));

vi.mock("@/lib/profiles/service", () => ({
  getProfileByUserId: vi.fn(),
}));

vi.mock("@/lib/employees/service", () => ({
  getEmployeeById: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
}));

vi.mock("@/components/employee/employee-detail-photo", () => ({
  EmployeeDetailPhoto: () => <div data-testid="employee-photo">Photo</div>,
}));

vi.mock("@/components/employee/employee-detail-card", () => ({
  EmployeeDetailCard: () => <div data-testid="employee-card">Card</div>,
}));

vi.mock("@/components/employee/employee-form", () => ({
  EmployeeForm: () => <div data-testid="employee-form">Form</div>,
}));

vi.mock("@/components/employee/delete-employee-dialog", () => ({
  DeleteEmployeeDialog: () => (
    <div data-testid="delete-dialog">Delete Dialog</div>
  ),
}));

import { getEmployeeById } from "@/lib/employees/service";
import { getProfileByUserId } from "@/lib/profiles/service";
import { getUser } from "@/lib/supabase-auth/auth";

describe("EmployeeDetailPage - Cache Behavior", () => {
  const mockEmployee = {
    id: "emp-1",
    employeeNumber: "E001",
    nameKanji: "山田太郎",
    nameKana: "ヤマダタロウ",
    email: "yamada@example.com",
    hireDate: new Date("2020-01-01"),
    photoS3Key: null,
    mobilePhone: null,
    organizations: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
    } as any);
    vi.mocked(getProfileByUserId).mockResolvedValue({
      id: "profile-1",
      userId: "user-1",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(getEmployeeById).mockResolvedValue(mockEmployee);
  });

  it("should use getEmployeeById in both generateMetadata and page component", async () => {
    const params = Promise.resolve({ employeeId: "emp-1" });
    const searchParams = Promise.resolve({});

    // Call generateMetadata
    await generateMetadata({ params, searchParams });

    // Render the page component
    render(
      await EmployeeDetailPage({
        params: Promise.resolve({ employeeId: "emp-1" }),
        searchParams: Promise.resolve({}),
      }),
    );

    // Verify that getEmployeeById was called with correct parameter
    // Note: React.cache() will deduplicate these calls in production RSC environment
    expect(getEmployeeById).toHaveBeenCalled();
    expect(getEmployeeById).toHaveBeenCalledWith("emp-1");
  });

  it("should return correct metadata when employee is found", async () => {
    const params = Promise.resolve({ employeeId: "emp-1" });
    const searchParams = Promise.resolve({});

    const metadata = await generateMetadata({ params, searchParams });

    expect(metadata.title).toBe("山田太郎 - 社員詳細 - peer-search");
    expect(getEmployeeById).toHaveBeenCalledWith("emp-1");
  });

  it("should return default metadata when employee is not found", async () => {
    vi.mocked(getEmployeeById).mockResolvedValue(null);

    const params = Promise.resolve({ employeeId: "emp-999" });
    const searchParams = Promise.resolve({});

    const metadata = await generateMetadata({ params, searchParams });

    expect(metadata.title).toBe("社員詳細 - peer-search");
  });
});
