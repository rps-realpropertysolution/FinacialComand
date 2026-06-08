import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { nome: "Lucas Fernandes", role: "diretor" },
    empresa: { nome: "RPS" },
    signOut: vi.fn(),
  }),
}));

import AppLayout from "./AppLayout";

describe("AppLayout (sidebar agrupada)", () => {
  it("renderiza grupos e itens de navegação sem erro", () => {
    render(
      <MemoryRouter initialEntries={["/app"]}>
        <AppLayout>
          <div>conteúdo</div>
        </AppLayout>
      </MemoryRouter>,
    );
    // grupos
    expect(screen.getByText("Visão Geral")).toBeInTheDocument();
    expect(screen.getByText("Receitas")).toBeInTheDocument();
    expect(screen.getByText("Custos & Pessoas")).toBeInTheDocument();
    // itens
    expect(screen.getByText("Painel BI")).toBeInTheDocument();
    expect(screen.getByText("Faturamentos")).toBeInTheDocument();
    expect(screen.getByText("Emissor NFS-e")).toBeInTheDocument();
    // conteúdo passado por children
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
