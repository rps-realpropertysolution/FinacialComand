import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmpreendimentoLite {
  id: string;
  nome: string;
  codigo: string | null;
  status: string;
}

/** Hook compartilhado: lista todos os empreendimentos da empresa atual.
 *  Usado por todos os módulos (Fiscal, RH, Despesas Sede, Faturamentos,
 *  Emissor NFS-e, Cashflow, Contratos, YTD) para vincular registros. */
export function useEmpreendimentos() {
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("empreendimentos")
        .select("id, nome, codigo, status")
        .order("nome");
      if (mounted) {
        setEmpreendimentos((data as EmpreendimentoLite[]) ?? []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const nomeOf = (id: string | null | undefined) =>
    !id ? "—" : empreendimentos.find((e) => e.id === id)?.nome ?? "—";

  return { empreendimentos, loading, nomeOf };
}