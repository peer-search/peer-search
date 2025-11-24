import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmployeeDetailPhoto } from "./employee-detail-photo";

// Mock usePresignedUrl hook
vi.mock("@/lib/s3/use-presigned-url", () => ({
  usePresignedUrl: vi.fn(),
}));

// Import mocked module for type-safe mocking
import { usePresignedUrl } from "@/lib/s3/use-presigned-url";

const mockUsePresignedUrl = vi.mocked(usePresignedUrl);

describe("EmployeeDetailPhoto", () => {
  it("ローディング中はスケルトンを表示する", () => {
    mockUsePresignedUrl.mockReturnValue({ url: null, isLoading: true });

    render(<EmployeeDetailPhoto s3Key="photos/123.jpg" />);

    const skeleton = screen.getByTestId("photo-skeleton");
    expect(skeleton).toHaveClass("animate-pulse");
    expect(skeleton).toHaveClass("bg-gray-200");
  });

  it("写真URLが取得できたら画像を表示する", () => {
    mockUsePresignedUrl.mockReturnValue({
      url: "https://s3.example.com/photo.jpg",
      isLoading: false,
    });

    render(<EmployeeDetailPhoto s3Key="photos/123.jpg" />);

    const img = screen.getByRole("img", { name: "社員写真" });
    expect(img).toBeInTheDocument();
    // Next.js Image component adds object-contain through className prop
    expect(img).toHaveClass("object-contain");
  });

  it("s3Keyがnullの場合プレースホルダーを表示する", () => {
    mockUsePresignedUrl.mockReturnValue({ url: null, isLoading: false });

    render(<EmployeeDetailPhoto s3Key={null} />);

    const img = screen.getByRole("img", { name: "社員写真" });
    expect(img).toHaveAttribute("src", expect.stringContaining("placeholder"));
  });

  it("3:4アスペクト比のコンテナを持つ", () => {
    mockUsePresignedUrl.mockReturnValue({
      url: "https://s3.example.com/photo.jpg",
      isLoading: false,
    });

    const { container } = render(
      <EmployeeDetailPhoto s3Key="photos/123.jpg" />,
    );

    // Find the aspect ratio container
    const aspectContainer = container.querySelector(".aspect-\\[3\\/4\\]");
    expect(aspectContainer).toBeInTheDocument();
  });

  it("白背景と中央配置のコンテナを持つ", () => {
    mockUsePresignedUrl.mockReturnValue({
      url: "https://s3.example.com/photo.jpg",
      isLoading: false,
    });

    const { container } = render(
      <EmployeeDetailPhoto s3Key="photos/123.jpg" />,
    );

    const aspectContainer = container.querySelector(".aspect-\\[3\\/4\\]");
    expect(aspectContainer).toHaveClass("bg-white");
    expect(aspectContainer).toHaveClass("flex");
    expect(aspectContainer).toHaveClass("items-center");
    expect(aspectContainer).toHaveClass("justify-center");
  });
});
