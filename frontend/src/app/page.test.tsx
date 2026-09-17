import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "../shared/components/status-badge";

describe("StatusBadge", () => {
  it("muestra el estado activo", () => {
    render(<StatusBadge active />);
    expect(screen.getByText("Activo")).toBeTruthy();
  });
});
