import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Referências compartilhadas (hoisted) para garantir que o mock usado no
// componente é o MESMO objeto que o teste inspeciona.
const { toastMock, signInMock, navigateMock } = vi.hoisted(() => ({
  toastMock: { error: vi.fn(), success: vi.fn() },
  signInMock: vi.fn(),
  navigateMock: vi.fn(),
}));

vi.mock("react-router-dom", () => ({ useNavigate: () => navigateMock }));
vi.mock("sonner", () => ({ toast: toastMock }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithPassword: signInMock } },
}));

import Auth from "./Auth";

beforeEach(() => {
  vi.clearAllMocks();
  signInMock.mockResolvedValue({ error: null });
});

const fill = (email: string, senha: string) => {
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: senha } });
  fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
};

describe("Auth (login)", () => {
  it("renderiza apenas o formulário de login (sem cadastro público)", () => {
    render(<Auth />);
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
    expect(screen.queryByText(/registrar empresa/i)).not.toBeInTheDocument();
  });

  it("zod bloqueia e-mail inválido e NÃO chama o Supabase", async () => {
    render(<Auth />);
    // type=email faz o navegador/jsdom barrar o submit por click; submit direto
    // no form exercita a validação do zod (defesa em profundidade).
    fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "invalido" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "123456" } });
    const formEl = screen.getByRole("button", { name: /entrar/i }).closest("form")!;
    fireEvent.submit(formEl);
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("E-mail inválido"));
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("bloqueia senha curta e NÃO chama o Supabase", async () => {
    render(<Auth />);
    fill("lucas@rpsglobal.com.br", "123");
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Mínimo 6 caracteres"));
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("envia credenciais válidas ao Supabase", async () => {
    render(<Auth />);
    fill("lucas@rpsglobal.com.br", "172218Sher");
    await waitFor(() =>
      expect(signInMock).toHaveBeenCalledWith({
        email: "lucas@rpsglobal.com.br",
        password: "172218Sher",
      }),
    );
  });
});
