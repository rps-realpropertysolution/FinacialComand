import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function RequireAuth() {
  const { user, profile, loading, profileLoading } = useAuth();

  // Espera tanto a sessão quanto o perfil carregarem (senão o login exigia 2 cliques).
  if (loading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!profile) return <Navigate to="/auth" replace />;
  return <Outlet />;
}