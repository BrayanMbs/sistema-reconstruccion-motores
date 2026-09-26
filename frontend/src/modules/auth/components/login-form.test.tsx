import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "./login-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/shared/services/supabase", () => ({ getSupabase: vi.fn() }));

describe("LoginForm password visibility", () => {
  afterEach(cleanup);
  it("toggles password visibility without changing autocomplete", () => {
    render(<LoginForm />);
    const password = screen.getByLabelText("Contraseña");
    fireEvent.change(password, { target: { value: "Temp1234" } });
    expect(password.getAttribute("type")).toBe("password");
    expect(password.getAttribute("autocomplete")).toBe("current-password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar contraseña" }));
    expect(password.getAttribute("type")).toBe("text");
    expect((password as HTMLInputElement).value).toBe("Temp1234");
    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toBeTruthy();
  });
});
