import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";

// Smoke test: renderiza o App inteiro. Sem sessão, deve cair na tela de login.
// Se houver erro de runtime (tela branca), este teste falha com o stack real.
describe("App smoke", () => {
  it("monta e chega na tela de login", async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument(),
      { timeout: 4000 },
    );
  });
});
