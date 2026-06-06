export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

export const monthLabel = (d: Date) =>
  d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

export const monthInputValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export const firstOfMonth = (ym: string) => `${ym}-01`;