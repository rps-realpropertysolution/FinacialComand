import { describe, it, expect } from "vitest";
import { parseValor, parseBrDate, parseIsoDate, parseOFXText } from "./bank-statement";

describe("parseValor (valores monetários)", () => {
  it("entende formato brasileiro 1.234,56", () => {
    expect(parseValor("1.234,56")).toBeCloseTo(1234.56);
  });
  it("entende formato com ponto decimal 1234.56", () => {
    expect(parseValor("1234.56")).toBeCloseTo(1234.56);
  });
  it("trata sufixo D (débito) como negativo", () => {
    expect(parseValor("1.234,56 D")).toBeCloseTo(-1234.56);
  });
  it("trata parênteses como negativo", () => {
    expect(parseValor("(1.234,56)")).toBeCloseTo(-1234.56);
  });
  it("preserva sinal de menos à esquerda", () => {
    expect(parseValor("-50,00")).toBeCloseTo(-50);
  });
  it("aceita número puro", () => {
    expect(parseValor(987.65)).toBeCloseTo(987.65);
  });
  it("retorna null para lixo/vazio", () => {
    expect(parseValor("abc")).toBeNull();
    expect(parseValor("")).toBeNull();
  });
});

describe("parseBrDate / parseIsoDate", () => {
  it("converte dd/mm/yyyy -> ISO", () => {
    expect(parseBrDate("05/03/2026")).toBe("2026-03-05");
  });
  it("converte dd/mm/yy (2 dígitos) -> ISO", () => {
    expect(parseBrDate("5/3/26")).toBe("2026-03-05");
  });
  it("retorna null para texto sem data", () => {
    expect(parseBrDate("sem data")).toBeNull();
  });
  it("extrai data ISO já formatada", () => {
    expect(parseIsoDate("2026-03-05 movimento")).toBe("2026-03-05");
    expect(parseIsoDate("nada")).toBeNull();
  });
});

describe("parseOFXText (extrato bancário OFX)", () => {
  it("extrai transações de crédito e débito", () => {
    const ofx = `
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260305120000<TRNAMT>1500.00<MEMO>Honorario Edificio A</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260310<TRNAMT>-200.50<NAME>Tarifa bancaria</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const txs = parseOFXText(ofx);
    expect(txs).toHaveLength(2);
    expect(txs[0]).toMatchObject({ data: "2026-03-05", valor: 1500 });
    expect(txs[0].descricao).toContain("Honorario");
    expect(txs[1]).toMatchObject({ data: "2026-03-10", valor: -200.5 });
    expect(txs[1].descricao).toContain("Tarifa");
  });
});
