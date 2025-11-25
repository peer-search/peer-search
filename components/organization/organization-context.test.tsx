import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { OrganizationFlatNode } from "@/lib/organizations/types";
import {
  OrganizationProvider,
  useOrganizationSelection,
} from "./organization-context";

describe("OrganizationContext", () => {
  describe("OrganizationProvider", () => {
    it("should render children", () => {
      render(
        <OrganizationProvider>
          <div>Test Child</div>
        </OrganizationProvider>,
      );

      expect(screen.getByText("Test Child")).toBeInTheDocument();
    });
  });

  describe("useOrganizationSelection", () => {
    it("should throw error when used outside provider", () => {
      // Component that uses the hook outside provider
      const TestComponent = () => {
        useOrganizationSelection();
        return <div>Test</div>;
      };

      // Suppress console.error for this test
      const originalError = console.error;
      console.error = () => {};

      expect(() => render(<TestComponent />)).toThrow(
        "useOrganizationSelection must be used within OrganizationProvider",
      );

      // Restore console.error
      console.error = originalError;
    });

    it("should provide initial null selectedNode", () => {
      const TestComponent = () => {
        const { selectedNode } = useOrganizationSelection();
        return <div>{selectedNode ? selectedNode.name : "No selection"}</div>;
      };

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>,
      );

      expect(screen.getByText("No selection")).toBeInTheDocument();
    });

    it("should update selectedNode when setSelectedNode is called", async () => {
      const user = userEvent.setup();
      const mockNode: OrganizationFlatNode = {
        id: "org-1",
        name: "テスト組織",
        parentId: null,
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const TestComponent = () => {
        const { selectedNode, setSelectedNode } = useOrganizationSelection();

        return (
          <div>
            <button type="button" onClick={() => setSelectedNode(mockNode)}>
              Select Node
            </button>
            <div data-testid="selected-name">
              {selectedNode ? selectedNode.name : "No selection"}
            </div>
          </div>
        );
      };

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>,
      );

      // Initially no selection
      expect(screen.getByTestId("selected-name")).toHaveTextContent(
        "No selection",
      );

      // Click button to select node
      await user.click(screen.getByText("Select Node"));

      // Should show selected node name
      expect(screen.getByTestId("selected-name")).toHaveTextContent(
        "テスト組織",
      );
    });

    it("should allow setting selectedNode to null", async () => {
      const user = userEvent.setup();
      const mockNode: OrganizationFlatNode = {
        id: "org-1",
        name: "テスト組織",
        parentId: null,
        level: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const TestComponent = () => {
        const { selectedNode, setSelectedNode } = useOrganizationSelection();

        return (
          <div>
            <button type="button" onClick={() => setSelectedNode(mockNode)}>
              Select Node
            </button>
            <button type="button" onClick={() => setSelectedNode(null)}>
              Clear Selection
            </button>
            <div data-testid="selected-name">
              {selectedNode ? selectedNode.name : "No selection"}
            </div>
          </div>
        );
      };

      render(
        <OrganizationProvider>
          <TestComponent />
        </OrganizationProvider>,
      );

      // Select node
      await user.click(screen.getByText("Select Node"));
      expect(screen.getByTestId("selected-name")).toHaveTextContent(
        "テスト組織",
      );

      // Clear selection
      await user.click(screen.getByText("Clear Selection"));
      expect(screen.getByTestId("selected-name")).toHaveTextContent(
        "No selection",
      );
    });
  });
});
