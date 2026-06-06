import * as XLSX from "xlsx";

export interface BankTx {
  data: string; // YYYY-MM-DD
  descricao: string;
  valor: number; // positivo = crédito, negativo = débito
}

export const parseBrDate = (s: string): string | null => {
  // dd/mm/yyyy or dd/mm/yy
  const m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
};

export const parseIsoDate = (s: string): string | null => {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

export const parseValor = (raw: string | number): number | null => {
  if (typeof raw === "number") return raw;
  if (!raw) return null;
  let s = String(raw).trim().replace(/\s/g, "");
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || /-$/.test(s) || /D$/i.test(s);
  s = s.replace(/[()CD]/gi, "").replace(/[^\d,.\-]/g, "");
  // formato brasileiro: 1.234,56 -> 1234.56
  if (s.includes(",") && s.lastIndexOf(",") > s.lastIndexOf(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return neg && n > 0 ? -n : n;
};

export async function parseXLSX(file: File): Promise<BankTx[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
  const txs: BankTx[] = [];
  for (const row of rows) {
    if (!row || row.length < 2) continue;
    let data: string | null = null;
    let valor: number | null = null;
    let desc = "";
    for (const cell of row) {
      const s = String(cell ?? "");
      if (!data) data = parseBrDate(s) || parseIsoDate(s);
    }
    // tenta achar valor: última coluna numérica
    for (let i = row.length - 1; i >= 0; i--) {
      const v = parseValor(row[i]);
      if (v !== null && Math.abs(v) > 0.001) { valor = v; break; }
    }
    desc = row
      .map((c) => String(c ?? ""))
      .filter((s) => s && !parseBrDate(s) && !parseIsoDate(s) && parseValor(s) === null)
      .join(" ")
      .trim();
    if (data && valor !== null) txs.push({ data, descricao: desc.slice(0, 200), valor });
  }
  return txs;
}

export async function parseOFX(file: File): Promise<BankTx[]> {
  const text = await file.text();
  return parseOFXText(text);
}

export function parseOFXText(text: string): BankTx[] {
  const txs: BankTx[] = [];
  const re = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const block = m[1];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(block);
      return r ? r[1].trim() : "";
    };
    const dt = get("DTPOSTED").slice(0, 8);
    const data = dt.length === 8 ? `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}` : "";
    const valor = parseFloat(get("TRNAMT"));
    const descricao = (get("MEMO") || get("NAME") || "").trim();
    if (data && !isNaN(valor)) txs.push({ data, descricao: descricao.slice(0, 200), valor });
  }
  return txs;
}

export async function parsePDF(file: File): Promise<BankTx[]> {
  // pdfjs-dist legacy build evita worker em ambientes sem CDN
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = "";
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf, disableWorker: true }).promise;
  const lines: string[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    // agrupa por linha (mesmo y aproximado)
    const buckets = new Map<number, string[]>();
    for (const it of content.items as any[]) {
      const y = Math.round((it.transform?.[5] ?? 0) / 2);
      const arr = buckets.get(y) ?? [];
      arr.push(it.str);
      buckets.set(y, arr);
    }
    const sorted = Array.from(buckets.entries()).sort((a, b) => b[0] - a[0]);
    for (const [, parts] of sorted) lines.push(parts.join(" ").trim());
  }
  const txs: BankTx[] = [];
  for (const line of lines) {
    const data = parseBrDate(line) || parseIsoDate(line);
    if (!data) continue;
    // valor monetário: último número formato 1.234,56 ou -1.234,56
    const valMatch = [...line.matchAll(/-?\(?\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*\)?[CD]?/gi)];
    if (valMatch.length === 0) continue;
    const valor = parseValor(valMatch[valMatch.length - 1][0]);
    if (valor === null || Math.abs(valor) < 0.001) continue;
    let desc = line.replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, "").trim();
    desc = desc.replace(/-?\(?\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*\)?[CD]?/g, "").trim();
    txs.push({ data, descricao: desc.slice(0, 200), valor });
  }
  return txs;
}

export async function parseBankFile(file: File): Promise<BankTx[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".ofx") || name.endsWith(".qfx")) return parseOFX(file);
  if (name.endsWith(".pdf")) return parsePDF(file);
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".csv")) return parseXLSX(file);
  throw new Error("Formato não suportado. Use XLSX, OFX ou PDF.");
}