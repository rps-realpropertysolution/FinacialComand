import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Usa as variáveis de ambiente quando definidas (recomendado: configure
// VITE_SUPABASE_* no .env local e no painel da Vercel). Os fallbacks abaixo são
// os valores PÚBLICOS do projeto (a anon key é pública por design, protegida por
// RLS) — garantem que o app não fique em tela branca caso o ambiente não injete
// as variáveis (ex.: deploy sem env configurada).
const FALLBACK_URL = 'https://iwvmzlryeyxwuxqafytb.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dm16bHJ5ZXl4d3V4cWFmeXRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MDQyNDIsImV4cCI6MjA5NjI4MDI0Mn0.SYcfkgHuYytZSN3WwVC7GcbWgKXQtdhN7lkCLK9cyKg';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY;

if (!import.meta.env.VITE_SUPABASE_URL) {
  // Ajuda a diagnosticar deploy sem env (não derruba o app).
  console.warn(
    '[supabase] VITE_SUPABASE_URL não definida — usando fallback público. Configure as variáveis de ambiente.',
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
});
