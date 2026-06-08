import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Captura erros de render das páginas e mostra uma mensagem legível em vez de
 * tela branca. Sem isto, um erro em qualquer página derruba a árvore inteira.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Algo deu errado nesta tela</h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            Recarregue a página. Se persistir, o erro abaixo ajuda a diagnosticar:
          </p>
          <pre className="max-w-xl overflow-auto rounded-md border border-border bg-muted p-3 text-left text-xs text-destructive">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
