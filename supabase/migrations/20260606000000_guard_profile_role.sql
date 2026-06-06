-- ============================================================================
-- Segurança: impede escalonamento de privilégio via profiles.
-- Como o papel (role) é uma COLUNA em profiles e a policy de UPDATE só checa
-- id = auth.uid(), um usuário comum poderia se auto-promover a 'diretor'.
-- Este trigger bloqueia a troca do próprio role/empresa_id (exceto diretor).
-- ============================================================================

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Bloqueia mudança de papel por quem não é diretor
  if new.role is distinct from old.role then
    if not public.has_role(auth.uid(), 'diretor') then
      raise exception 'Apenas diretor pode alterar o papel (role).';
    end if;
  end if;

  -- Nunca permite trocar de empresa pelo update do próprio perfil
  if new.empresa_id is distinct from old.empresa_id then
    raise exception 'Não é permitido alterar empresa_id do perfil.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.prevent_role_escalation();
