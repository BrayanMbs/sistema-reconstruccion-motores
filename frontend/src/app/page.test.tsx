import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("muestra el nombre del sistema", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { name: /sistema de reconstrucción de motores/i })).toBeTruthy();
  });
});
