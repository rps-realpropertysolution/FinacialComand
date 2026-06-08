import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  role: "diretor" | "gerente" | "operador";
}

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  empresa: Empresa | null;
  loading: boolean;
  profileLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  // true enquanto o perfil está sendo carregado após autenticar (evita que o
  // RequireAuth chute para /auth antes do profile chegar — bug do "clicar 2x").
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = async (uid: string) => {
    setProfileLoading(true);
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      setProfile((prof as Profile) ?? null);
      if (prof?.empresa_id) {
        const { data: emp } = await supabase
          .from("empresas")
          .select("*")
          .eq("id", prof.empresa_id)
          .maybeSingle();
        setEmpresa((emp as Empresa) ?? null);
      } else {
        setEmpresa(null);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setProfileLoading(true); // marca já, antes do loadProfile assíncrono
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setEmpresa(null);
        setProfileLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, empresa, loading, profileLoading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}