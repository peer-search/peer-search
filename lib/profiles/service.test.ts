import { describe, expect, it, vi } from "vitest";
import type { Profile } from "@/db/schema";
import { getProfileByUserId } from "./service";

// Mock db module
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("ProfilesService", () => {
  describe("getProfileByUserId", () => {
    it("should return profile when user_id exists", async () => {
      // Arrange
      const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
      const mockProfile: Profile = {
        id: "650e8400-e29b-41d4-a716-446655440000",
        userId: mockUserId,
        role: "admin",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      };

      const { db } = await import("@/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      } as any);

      // Act
      const result = await getProfileByUserId(mockUserId);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(db.select).toHaveBeenCalled();
    });

    it("should return null when user_id does not exist", async () => {
      // Arrange
      const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

      const { db } = await import("@/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      // Act
      const result = await getProfileByUserId(mockUserId);

      // Assert
      expect(result).toBeNull();
    });

    it("should return user role profile by default", async () => {
      // Arrange
      const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
      const mockProfile: Profile = {
        id: "650e8400-e29b-41d4-a716-446655440000",
        userId: mockUserId,
        role: "user",
        createdAt: new Date("2025-01-01T00:00:00Z"),
      };

      const { db } = await import("@/db");
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockProfile]),
        }),
      } as any);

      // Act
      const result = await getProfileByUserId(mockUserId);

      // Assert
      expect(result).toEqual(mockProfile);
      expect(result?.role).toBe("user");
    });
  });
});
