import { describe, it, expect } from "vitest";
import { brl, monthInputValue, firstOfMonth, monthLabel } from "./format";

describe("format.brl", () => {
  it("formata reais no padrão pt-BR", () => {
    expect(brl(1234.5)).toContain("1.234,50");
    expect(brl(1234.5)).toContain("R$");
  });
  it("zera valores nulos/NaN sem quebrar", () => {
    expect(brl(0)).toContain("0,00");
    // @ts-expect-error: testando entrada inválida proposital
    expect(brl(null)).toContain("0,00");
    // @ts-expect-error: testando entrada inválida proposital
    expect(brl(undefined)).toContain("0,00");
  });
  it("formata negativos", () => {
    expect(brl(-50)).toContain("50,00");
    expect(brl(-50)).toMatch(/-/);
  });
});

describe("format.monthInputValue", () => {
  it("retorna YYYY-MM com mês zero-padded", () => {
    expect(monthInputValue(new Date(2026, 0, 15))).toBe("2026-01");
    expect(monthInputValue(new Date(2026, 11, 1))).toBe("2026-12");
  });
});

describe("format.firstOfMonth", () => {
  it("acrescenta o dia 01 ao YYYY-MM", () => {
    expect(firstOfMonth("2026-03")).toBe("2026-03-01");
  });
});

describe("format.monthLabel", () => {
  it("inclui o ano de 2 dígitos", () => {
    expect(monthLabel(new Date(2026, 5, 1))).toMatch(/26/);
  });
});
