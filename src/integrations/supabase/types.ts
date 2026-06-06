export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas_faturamento: {
        Row: {
          created_at: string
          empresa_id: string
          faturamento_id: string | null
          id: string
          mensagem: string
          resolvido: boolean
          severidade: string
          tipo: Database["public"]["Enums"]["alerta_tipo"]
          tomador_id: string | null
        }
        Insert: {
          created_at?: string
          empresa_id: string
          faturamento_id?: string | null
          id?: string
          mensagem: string
          resolvido?: boolean
          severidade?: string
          tipo: Database["public"]["Enums"]["alerta_tipo"]
          tomador_id?: string | null
        }
        Update: {
          created_at?: string
          empresa_id?: string
          faturamento_id?: string | null
          id?: string
          mensagem?: string
          resolvido?: boolean
          severidade?: string
          tipo?: Database["public"]["Enums"]["alerta_tipo"]
          tomador_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_faturamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_faturamento_faturamento_id_fkey"
            columns: ["faturamento_id"]
            isOneToOne: false
            referencedRelation: "faturamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_faturamento_tomador_id_fkey"
            columns: ["tomador_id"]
            isOneToOne: false
            referencedRelation: "tomadores"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow: {
        Row: {
          categoria: string
          contrato_id: string | null
          created_at: string
          descricao: string | null
          empreendimento_id: string | null
          empresa_id: string
          id: string
          mes: string
          origem: string
          previsto: number
          realizado: number
          tipo: string
          updated_at: string
        }
        Insert: {
          categoria: string
          contrato_id?: string | null
          created_at?: string
          descricao?: string | null
          empreendimento_id?: string | null
          empresa_id: string
          id?: string
          mes: string
          origem?: string
          previsto?: number
          realizado?: number
          tipo: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          contrato_id?: string | null
          created_at?: string
          descricao?: string | null
          empreendimento_id?: string | null
          empresa_id?: string
          id?: string
          mes?: string
          origem?: string
          previsto?: number
          realizado?: number
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          alocacao: Database["public"]["Enums"]["colaborador_alocacao"]
          ativo: boolean
          cargo: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          email: string | null
          empreendimento_id: string | null
          empresa_id: string
          id: string
          nome: string
          observacoes: string | null
          outros_beneficios: number
          plano_saude: number
          salario_base: number
          telefone: string | null
          updated_at: string
          vale_refeicao: number
          vale_transporte: number
          vinculo: Database["public"]["Enums"]["colaborador_vinculo"]
        }
        Insert: {
          alocacao?: Database["public"]["Enums"]["colaborador_alocacao"]
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          email?: string | null
          empreendimento_id?: string | null
          empresa_id: string
          id?: string
          nome: string
          observacoes?: string | null
          outros_beneficios?: number
          plano_saude?: number
          salario_base?: number
          telefone?: string | null
          updated_at?: string
          vale_refeicao?: number
          vale_transporte?: number
          vinculo?: Database["public"]["Enums"]["colaborador_vinculo"]
        }
        Update: {
          alocacao?: Database["public"]["Enums"]["colaborador_alocacao"]
          ativo?: boolean
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          email?: string | null
          empreendimento_id?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          outros_beneficios?: number
          plano_saude?: number
          salario_base?: number
          telefone?: string | null
          updated_at?: string
          vale_refeicao?: number
          vale_transporte?: number
          vinculo?: Database["public"]["Enums"]["colaborador_vinculo"]
        }
        Relationships: []
      }
      contratos: {
        Row: {
          ativo: boolean
          created_at: string
          data_inicio: string
          descricao: string
          empreendimento_id: string
          empresa_id: string
          id: string
          mes_reajuste: number
          percentual_reajuste: number
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_inicio?: string
          descricao: string
          empreendimento_id: string
          empresa_id: string
          id?: string
          mes_reajuste?: number
          percentual_reajuste?: number
          valor_mensal?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_inicio?: string
          descricao?: string
          empreendimento_id?: string
          empresa_id?: string
          id?: string
          mes_reajuste?: number
          percentual_reajuste?: number
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      despesas_sede: {
        Row: {
          categoria: Database["public"]["Enums"]["despesa_sede_categoria"]
          competencia: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          empreendimento_id: string | null
          empresa_id: string
          forma_pagamento: string | null
          fornecedor: string | null
          id: string
          observacoes: string | null
          recorrente: boolean
          status: Database["public"]["Enums"]["despesa_sede_status"]
          updated_at: string
          valor: number
          valor_pago: number | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["despesa_sede_categoria"]
          competencia: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          empreendimento_id?: string | null
          empresa_id: string
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["despesa_sede_status"]
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["despesa_sede_categoria"]
          competencia?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          empreendimento_id?: string | null
          empresa_id?: string
          forma_pagamento?: string | null
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          recorrente?: boolean
          status?: Database["public"]["Enums"]["despesa_sede_status"]
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Relationships: []
      }
      emissor_config: {
        Row: {
          aliquota_iss: number | null
          ambiente: string
          cep: string | null
          cidade: string | null
          cnae: string | null
          cnpj_emissor: string | null
          codigo_servico: string | null
          codigo_tributacao_municipio: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          incentivador_cultural: boolean | null
          inscricao_municipal: string | null
          iss_retido: boolean | null
          natureza_operacao: string | null
          observacoes: string | null
          optante_simples: boolean | null
          proximo_numero_rps: number
          razao_social: string | null
          regime_especial_tributacao: string | null
          regime_tributario: string | null
          serie_rps: string | null
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          aliquota_iss?: number | null
          ambiente?: string
          cep?: string | null
          cidade?: string | null
          cnae?: string | null
          cnpj_emissor?: string | null
          codigo_servico?: string | null
          codigo_tributacao_municipio?: string | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
          incentivador_cultural?: boolean | null
          inscricao_municipal?: string | null
          iss_retido?: boolean | null
          natureza_operacao?: string | null
          observacoes?: string | null
          optante_simples?: boolean | null
          proximo_numero_rps?: number
          razao_social?: string | null
          regime_especial_tributacao?: string | null
          regime_tributario?: string | null
          serie_rps?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          aliquota_iss?: number | null
          ambiente?: string
          cep?: string | null
          cidade?: string | null
          cnae?: string | null
          cnpj_emissor?: string | null
          codigo_servico?: string | null
          codigo_tributacao_municipio?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          incentivador_cultural?: boolean | null
          inscricao_municipal?: string | null
          iss_retido?: boolean | null
          natureza_operacao?: string | null
          observacoes?: string | null
          optante_simples?: boolean | null
          proximo_numero_rps?: number
          razao_social?: string | null
          regime_especial_tributacao?: string | null
          regime_tributario?: string | null
          serie_rps?: string | null
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emissor_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empreendimentos: {
        Row: {
          codigo: string | null
          created_at: string
          empresa_id: string
          id: string
          nome: string
          status: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
          status?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "empreendimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string | null
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      faturamento_pagamentos: {
        Row: {
          created_at: string
          data_pagamento: string
          empresa_id: string
          faturamento_id: string
          forma_pagamento: string | null
          id: string
          observacao: string | null
          valor_pago: number
        }
        Insert: {
          created_at?: string
          data_pagamento: string
          empresa_id: string
          faturamento_id: string
          forma_pagamento?: string | null
          id?: string
          observacao?: string | null
          valor_pago: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          empresa_id?: string
          faturamento_id?: string
          forma_pagamento?: string | null
          id?: string
          observacao?: string | null
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "faturamento_pagamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamento_pagamentos_faturamento_id_fkey"
            columns: ["faturamento_id"]
            isOneToOne: false
            referencedRelation: "faturamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturamentos: {
        Row: {
          aliquota_iss: number | null
          base_calculo: number | null
          cnae: string | null
          codigo_tributacao_municipio: string | null
          competencia: string
          contrato_id: string | null
          created_at: string
          data_emissao: string | null
          data_vencimento: string
          descricao_servico: string | null
          empreendimento_id: string | null
          empresa_id: string
          id: string
          indice_reajuste: string | null
          iss_retido: boolean | null
          link_nfse: string | null
          mes_base_reajuste: string | null
          numero_nfse: string | null
          numero_rps: string | null
          observacoes: string | null
          quantidade: number | null
          serie_rps: string | null
          status: Database["public"]["Enums"]["faturamento_status"]
          tomador_id: string | null
          unidade: string | null
          updated_at: string
          valor_bruto: number | null
          valor_cofins: number | null
          valor_csll: number | null
          valor_deducoes: number | null
          valor_honorarios: number
          valor_inss: number | null
          valor_ir: number | null
          valor_iss: number | null
          valor_juridico: number
          valor_liquido: number | null
          valor_massa_salarial: number
          valor_outras_retencoes: number | null
          valor_pis: number | null
          valor_relatorios: number
          valor_total: number | null
          valor_unitario: number | null
          valor_viagem: number
          vigencia_contratual: string | null
          xml_rps: string | null
        }
        Insert: {
          aliquota_iss?: number | null
          base_calculo?: number | null
          cnae?: string | null
          codigo_tributacao_municipio?: string | null
          competencia: string
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento: string
          descricao_servico?: string | null
          empreendimento_id?: string | null
          empresa_id: string
          id?: string
          indice_reajuste?: string | null
          iss_retido?: boolean | null
          link_nfse?: string | null
          mes_base_reajuste?: string | null
          numero_nfse?: string | null
          numero_rps?: string | null
          observacoes?: string | null
          quantidade?: number | null
          serie_rps?: string | null
          status?: Database["public"]["Enums"]["faturamento_status"]
          tomador_id?: string | null
          unidade?: string | null
          updated_at?: string
          valor_bruto?: number | null
          valor_cofins?: number | null
          valor_csll?: number | null
          valor_deducoes?: number | null
          valor_honorarios?: number
          valor_inss?: number | null
          valor_ir?: number | null
          valor_iss?: number | null
          valor_juridico?: number
          valor_liquido?: number | null
          valor_massa_salarial?: number
          valor_outras_retencoes?: number | null
          valor_pis?: number | null
          valor_relatorios?: number
          valor_total?: number | null
          valor_unitario?: number | null
          valor_viagem?: number
          vigencia_contratual?: string | null
          xml_rps?: string | null
        }
        Update: {
          aliquota_iss?: number | null
          base_calculo?: number | null
          cnae?: string | null
          codigo_tributacao_municipio?: string | null
          competencia?: string
          contrato_id?: string | null
          created_at?: string
          data_emissao?: string | null
          data_vencimento?: string
          descricao_servico?: string | null
          empreendimento_id?: string | null
          empresa_id?: string
          id?: string
          indice_reajuste?: string | null
          iss_retido?: boolean | null
          link_nfse?: string | null
          mes_base_reajuste?: string | null
          numero_nfse?: string | null
          numero_rps?: string | null
          observacoes?: string | null
          quantidade?: number | null
          serie_rps?: string | null
          status?: Database["public"]["Enums"]["faturamento_status"]
          tomador_id?: string | null
          unidade?: string | null
          updated_at?: string
          valor_bruto?: number | null
          valor_cofins?: number | null
          valor_csll?: number | null
          valor_deducoes?: number | null
          valor_honorarios?: number
          valor_inss?: number | null
          valor_ir?: number | null
          valor_iss?: number | null
          valor_juridico?: number
          valor_liquido?: number | null
          valor_massa_salarial?: number
          valor_outras_retencoes?: number | null
          valor_pis?: number | null
          valor_relatorios?: number
          valor_total?: number | null
          valor_unitario?: number | null
          valor_viagem?: number
          vigencia_contratual?: string | null
          xml_rps?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faturamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faturamentos_tomador_id_fkey"
            columns: ["tomador_id"]
            isOneToOne: false
            referencedRelation: "tomadores"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_pagamento: {
        Row: {
          beneficios: number
          bonus: number
          colaborador_id: string
          competencia: string
          created_at: string
          custo_total: number | null
          data_pagamento: string | null
          descontos: number
          empresa_id: string
          fgts: number
          horas_extras: number
          id: string
          inss: number
          irrf: number
          liquido: number | null
          observacoes: string | null
          outros_encargos: number
          salario: number
          status: string
          updated_at: string
        }
        Insert: {
          beneficios?: number
          bonus?: number
          colaborador_id: string
          competencia: string
          created_at?: string
          custo_total?: number | null
          data_pagamento?: string | null
          descontos?: number
          empresa_id: string
          fgts?: number
          horas_extras?: number
          id?: string
          inss?: number
          irrf?: number
          liquido?: number | null
          observacoes?: string | null
          outros_encargos?: number
          salario?: number
          status?: string
          updated_at?: string
        }
        Update: {
          beneficios?: number
          bonus?: number
          colaborador_id?: string
          competencia?: string
          created_at?: string
          custo_total?: number | null
          data_pagamento?: string | null
          descontos?: number
          empresa_id?: string
          fgts?: number
          horas_extras?: number
          id?: string
          inss?: number
          irrf?: number
          liquido?: number | null
          observacoes?: string | null
          outros_encargos?: number
          salario?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      forecast_linhas: {
        Row: {
          categoria: string
          created_at: string
          descricao: string | null
          empreendimento_id: string | null
          empresa_id: string
          grupo: string
          id: string
          mes: string
          origem: string
          tipo: string
          updated_at: string
          valor_previsto: number
          valor_realizado: number
          versao_id: string
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao?: string | null
          empreendimento_id?: string | null
          empresa_id: string
          grupo: string
          id?: string
          mes: string
          origem?: string
          tipo: string
          updated_at?: string
          valor_previsto?: number
          valor_realizado?: number
          versao_id: string
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string | null
          empreendimento_id?: string | null
          empresa_id?: string
          grupo?: string
          id?: string
          mes?: string
          origem?: string
          tipo?: string
          updated_at?: string
          valor_previsto?: number
          valor_realizado?: number
          versao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forecast_linhas_versao_id_fkey"
            columns: ["versao_id"]
            isOneToOne: false
            referencedRelation: "forecast_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      forecast_versoes: {
        Row: {
          ativo: boolean
          cenario: string
          created_at: string
          descricao: string | null
          empresa_id: string
          horizonte_meses: number
          id: string
          mes_inicio: string
          nome: string
          premissas: Json
          status: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cenario?: string
          created_at?: string
          descricao?: string | null
          empresa_id: string
          horizonte_meses?: number
          id?: string
          mes_inicio: string
          nome: string
          premissas?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cenario?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          horizonte_meses?: number
          id?: string
          mes_inicio?: string
          nome?: string
          premissas?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      guias_fiscais: {
        Row: {
          categoria: Database["public"]["Enums"]["guia_fiscal_categoria"]
          codigo_receita: string | null
          competencia: string
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          empreendimento_id: string | null
          empresa_id: string
          id: string
          numero_documento: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["guia_fiscal_status"]
          updated_at: string
          valor: number
          valor_pago: number | null
        }
        Insert: {
          categoria: Database["public"]["Enums"]["guia_fiscal_categoria"]
          codigo_receita?: string | null
          competencia: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          empreendimento_id?: string | null
          empresa_id: string
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["guia_fiscal_status"]
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Update: {
          categoria?: Database["public"]["Enums"]["guia_fiscal_categoria"]
          codigo_receita?: string | null
          competencia?: string
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          empreendimento_id?: string | null
          empresa_id?: string
          id?: string
          numero_documento?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["guia_fiscal_status"]
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          empresa_id: string
          id: string
          nome: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          empresa_id: string
          id: string
          nome: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          empresa_id?: string
          id?: string
          nome?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      tomadores: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          empreendimento_id: string | null
          empresa_id: string
          endereco: string | null
          id: string
          inscricao_municipal: string | null
          nome: string
          observacoes: string | null
          razao_social: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empreendimento_id?: string | null
          empresa_id: string
          endereco?: string | null
          id?: string
          inscricao_municipal?: string | null
          nome: string
          observacoes?: string | null
          razao_social?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          empreendimento_id?: string | null
          empresa_id?: string
          endereco?: string | null
          id?: string
          inscricao_municipal?: string | null
          nome?: string
          observacoes?: string | null
          razao_social?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tomadores_empreendimento_id_fkey"
            columns: ["empreendimento_id"]
            isOneToOne: false
            referencedRelation: "empreendimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tomadores_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_empresa_id: { Args: never; Returns: string }
      forecast_aplicar_premissa: {
        Args: {
          _grupo: string
          _percentual: number
          _tipo: string
          _versao_id: string
        }
        Returns: number
      }
      forecast_ativar_versao: {
        Args: { _versao_id: string }
        Returns: undefined
      }
      forecast_atualizar_realizado: {
        Args: { _versao_id: string }
        Returns: number
      }
      forecast_duplicar_versao: {
        Args: { _novo_nome: string; _versao_id: string }
        Returns: string
      }
      forecast_gerar_versao: {
        Args: {
          _cenario: string
          _horizonte: number
          _mes_inicio: string
          _nome: string
          _premissas?: Json
        }
        Returns: string
      }
      gerar_alertas_faturamento: { Args: never; Returns: number }
      gerar_despesas_sede_recorrentes: {
        Args: { _mes: string }
        Returns: number
      }
      gerar_fis: { Args: { _mes: string }; Returns: number }
      gerar_xml_rps_sp: { Args: { _faturamento_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      marcar_faturamento_pago: {
        Args: {
          _data_pagamento: string
          _faturamento_id: string
          _forma?: string
          _obs?: string
          _valor: number
        }
        Returns: undefined
      }
      proximo_numero_nfse: { Args: never; Returns: number }
      register_empresa: {
        Args: { _cnpj: string; _nome_empresa: string; _nome_usuario: string }
        Returns: string
      }
      replicar_cashflow_mes_anterior: {
        Args: { _mes: string }
        Returns: number
      }
      replicar_despesas_sede_mes_anterior: {
        Args: { _mes: string }
        Returns: number
      }
      replicar_guias_fiscais_mes_anterior: {
        Args: { _mes: string }
        Returns: number
      }
    }
    Enums: {
      alerta_tipo:
        | "reajuste"
        | "vencimento_proximo"
        | "vencido"
        | "conciliacao_pendente"
        | "emissao_pendente"
      app_role: "diretor" | "gerente" | "operador"
      colaborador_alocacao: "sede" | "empreendimento"
      colaborador_vinculo: "clt" | "pj" | "estagio" | "socio" | "autonomo"
      despesa_sede_categoria:
        | "aluguel"
        | "condominio"
        | "luz"
        | "agua"
        | "internet"
        | "telefone"
        | "material_escritorio"
        | "salario_backoffice"
        | "reembolso"
        | "viagem"
        | "transporte"
        | "alimentacao"
        | "software"
        | "contabilidade"
        | "juridico"
        | "marketing"
        | "manutencao"
        | "outros"
      despesa_sede_status: "previsto" | "pago" | "vencido" | "cancelado"
      faturamento_status:
        | "pendente"
        | "emitida"
        | "paga"
        | "vencida"
        | "cancelada"
      guia_fiscal_categoria:
        | "inss"
        | "fgts"
        | "iss"
        | "irrf"
        | "das"
        | "pis"
        | "cofins"
        | "csll"
        | "irpj"
        | "outros"
      guia_fiscal_status: "pendente" | "pago" | "vencido" | "cancelado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      alerta_tipo: [
        "reajuste",
        "vencimento_proximo",
        "vencido",
        "conciliacao_pendente",
        "emissao_pendente",
      ],
      app_role: ["diretor", "gerente", "operador"],
      colaborador_alocacao: ["sede", "empreendimento"],
      colaborador_vinculo: ["clt", "pj", "estagio", "socio", "autonomo"],
      despesa_sede_categoria: [
        "aluguel",
        "condominio",
        "luz",
        "agua",
        "internet",
        "telefone",
        "material_escritorio",
        "salario_backoffice",
        "reembolso",
        "viagem",
        "transporte",
        "alimentacao",
        "software",
        "contabilidade",
        "juridico",
        "marketing",
        "manutencao",
        "outros",
      ],
      despesa_sede_status: ["previsto", "pago", "vencido", "cancelado"],
      faturamento_status: [
        "pendente",
        "emitida",
        "paga",
        "vencida",
        "cancelada",
      ],
      guia_fiscal_categoria: [
        "inss",
        "fgts",
        "iss",
        "irrf",
        "das",
        "pis",
        "cofins",
        "csll",
        "irpj",
        "outros",
      ],
      guia_fiscal_status: ["pendente", "pago", "vencido", "cancelado"],
    },
  },
} as const
