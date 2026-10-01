import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), save: vi.fn() }));
vi.mock("../services/settings.service", () => ({ settingsService: mocks }));

import { ApiError } from "@/shared/services/api";
import { SettingsView } from "./settings-view";

const settings = {
  company: { name: "Motores López", phone: "+502 5555-1234", address: "Zona 1" },
  finance: { currency: "GTQ", taxRate: 12 }
};

const field = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const taxInput = () => screen.getByRole("spinbutton", { name: "Impuesto (%)" }) as HTMLInputElement;
const saveButton = () => screen.getByRole("button", { name: /Guardar configuración|Guardando/ }) as HTMLButtonElement;
const change = (element: HTMLElement, value: string) => fireEvent.change(element, { target: { value } });
const renderLoaded = async () => {
  render(<SettingsView />);
  await screen.findByRole("form", { name: "Configuración general" });
};

describe("SettingsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.get.mockResolvedValue(settings);
    mocks.save.mockImplementation((value: typeof settings) => Promise.resolve(value));
  });
  afterEach(() => cleanup());

  it("shows a loading state and then the real stored values", async () => {
    let resolve!: (value: typeof settings) => void;
    mocks.get.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<SettingsView />);
    expect(screen.getByText("Cargando configuración...")).toBeTruthy();

    await act(async () => resolve(settings));

    expect(field("Nombre comercial").value).toBe("Motores López");
    expect(field("Teléfono").value).toBe("+502 5555-1234");
    expect(field("Dirección").value).toBe("Zona 1");
    expect(field("Moneda").value).toBe("GTQ");
    expect(taxInput().value).toBe("12");
  });

  it("shows an understandable load error and retries", async () => {
    mocks.get.mockRejectedValueOnce(new Error("technical database detail"));
    render(<SettingsView />);

    expect(await screen.findByText("No fue posible cargar la configuración.")).toBeTruthy();
    expect(screen.queryByText("technical database detail")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByRole("form", { name: "Configuración general" })).toBeTruthy();
    expect(mocks.get).toHaveBeenCalledTimes(2);
  });

  it("validates on the client before calling the backend", async () => {
    await renderLoaded();
    change(field("Nombre comercial"), "   ");
    change(field("Moneda"), "qq");
    change(taxInput(), "101");

    fireEvent.click(saveButton());

    expect(await screen.findByText("Revisa los campos marcados antes de guardar.")).toBeTruthy();
    expect(screen.getByText("El nombre comercial es obligatorio.")).toBeTruthy();
    expect(screen.getByText("Use un código de 3 letras, por ejemplo GTQ.")).toBeTruthy();
    expect(screen.getByText("Ingrese un porcentaje entre 0 y 100, con hasta 2 decimales.")).toBeTruthy();
    expect(field("Nombre comercial").getAttribute("aria-invalid")).toBe("true");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("disables the form while saving, sends normalized values and confirms success", async () => {
    let resolveSave!: (value: typeof settings) => void;
    mocks.save.mockReturnValue(new Promise((done) => { resolveSave = done; }));
    await renderLoaded();
    change(field("Nombre comercial"), "  Taller Central  ");
    change(field("Moneda"), "usd");
    change(taxInput(), "15.5");

    fireEvent.click(saveButton());

    await waitFor(() => expect(saveButton().disabled).toBe(true));
    expect(saveButton().textContent).toBe("Guardando...");
    expect(field("Nombre comercial").closest("fieldset")?.disabled).toBe(true);
    const expected = { company: { ...settings.company, name: "Taller Central" }, finance: { currency: "USD", taxRate: 15.5 } };
    expect(mocks.save).toHaveBeenCalledWith(expected);

    await act(async () => resolveSave(expected));

    expect(await screen.findByText("Configuración guardada correctamente.")).toBeTruthy();
    expect(saveButton().disabled).toBe(false);
    expect(field("Nombre comercial").value).toBe("Taller Central");
  });

  it("sends a single request when the form is submitted twice quickly", async () => {
    mocks.save.mockReturnValue(new Promise(() => undefined));
    await renderLoaded();
    change(field("Teléfono"), "5555-0000");
    const form = screen.getByRole("form", { name: "Configuración general" });

    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => expect(saveButton().disabled).toBe(true));
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });

  it("does not call the backend when nothing changed", async () => {
    await renderLoaded();
    fireEvent.click(saveButton());
    expect(await screen.findByText("No hay cambios para guardar.")).toBeTruthy();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("shows the backend validation message and keeps the edited values", async () => {
    mocks.save.mockRejectedValueOnce(new ApiError("Moneda debe ser un código de 3 letras, por ejemplo GTQ", 422, "VALIDATION_ERROR"));
    await renderLoaded();
    change(field("Dirección"), "Zona 10");

    fireEvent.click(saveButton());

    expect(await screen.findByText("Moneda debe ser un código de 3 letras, por ejemplo GTQ")).toBeTruthy();
    expect(field("Dirección").value).toBe("Zona 10");
    expect(saveButton().disabled).toBe(false);
  });

  it("hides technical network errors behind a clear message", async () => {
    mocks.save.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await renderLoaded();
    change(field("Dirección"), "Zona 10");

    fireEvent.click(saveButton());

    expect(await screen.findByText("No fue posible guardar la configuración. Verifica tu conexión e intenta nuevamente.")).toBeTruthy();
    expect(screen.queryByText("Failed to fetch")).toBeNull();
  });
});
