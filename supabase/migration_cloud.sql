-- ============================================================================
-- ORDUS Performance - Supabase Cloud Migration
-- Instância: pzehsvanabwgtuqlcppk.supabase.co
-- Schema: public (default, exposto pelo PostgREST)
-- Migrado de: self-hosted (database.ordusdigital.com.br, schema desempenho)
-- ============================================================================

-- 1. TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('PARTNER', 'CONTRIBUTOR')),
  role_title TEXT,
  avatar TEXT,
  metrics JSONB DEFAULT '[]'::jsonb,
  auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT UNIQUE,
  password_changed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekly_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  metric_id TEXT NOT NULL,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week, metric_id)
);

CREATE TABLE IF NOT EXISTS public.weekly_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  blockers TEXT DEFAULT '',
  commitment TEXT DEFAULT '',
  learning TEXT DEFAULT '',
  commitment_completed BOOLEAN DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, week)
);

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed config
INSERT INTO public.app_config (key, value) VALUES ('current_week', '4')
ON CONFLICT (key) DO NOTHING;

-- 2. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.app_users WHERE auth_id = auth.uid();
$$;

-- app_users policies
CREATE POLICY "partners_full_access_users" ON public.app_users
  FOR ALL USING (public.get_user_role() = 'PARTNER');

CREATE POLICY "contributors_read_own_user" ON public.app_users
  FOR SELECT USING (auth_id = auth.uid());

-- weekly_entries policies
CREATE POLICY "partners_full_access_entries" ON public.weekly_entries
  FOR ALL USING (public.get_user_role() = 'PARTNER');

CREATE POLICY "contributors_own_entries" ON public.weekly_entries
  FOR ALL USING (
    user_id IN (SELECT id FROM public.app_users WHERE auth_id = auth.uid())
  );

-- weekly_feedback policies
CREATE POLICY "partners_full_access_feedback" ON public.weekly_feedback
  FOR ALL USING (public.get_user_role() = 'PARTNER');

CREATE POLICY "contributors_own_feedback" ON public.weekly_feedback
  FOR ALL USING (
    user_id IN (SELECT id FROM public.app_users WHERE auth_id = auth.uid())
  );

-- app_config policies
CREATE POLICY "all_read_config" ON public.app_config
  FOR SELECT USING (true);

CREATE POLICY "partners_write_config" ON public.app_config
  FOR UPDATE USING (public.get_user_role() = 'PARTNER');

CREATE POLICY "partners_insert_config" ON public.app_config
  FOR INSERT WITH CHECK (public.get_user_role() = 'PARTNER');

-- 3. AUTH USERS (3 PARTNERs)
-- ============================================================================
-- IMPORTANTE: No Supabase Cloud, usuarios auth NÃO podem ser criados via
-- INSERT direto nas tabelas auth.users/auth.identities. O GoTrue gerencia
-- campos internos que não são expostos e INSERTs manuais causam erro 500
-- ("Database error querying schema") no login.
--
-- Usuarios auth DEVEM ser criados por um destes métodos:
--   1. Supabase Dashboard → Authentication → Users → "Create new user"
--   2. Supabase Admin API (GoTrue): POST /auth/v1/admin/users
--   3. supabase.auth.admin.createUser() (server-side com service_role key)
--
-- Após criar os auth users, vincular ao app_users:
--   UPDATE public.app_users SET auth_id = '<auth-user-uuid>' WHERE id = '<app-user-id>';
--
-- Configuração dos 3 PARTNERs:
--   Leandro: leandrogeseth@gmail.com (password_changed = true)
--   Joel:    ojoeljunior1@gmail.com  (password_changed = false, troca obrigatória)
--   Adriano: sistemawebinfo@gmail.com (password_changed = false, troca obrigatória)
--
-- Auth IDs em produção (Supabase Cloud - criados via Dashboard):
--   Leandro (u4): 439b38e2-daa7-4d23-805b-efbf397d7d6e
--   Joel (u5):    553cdab7-debf-40c0-bac0-3948073b3200
--   Adriano (u6): 63e94e8a-e721-438f-ae25-42dcf313e09d

-- 4. SEED APP_USERS (all 7 users)
-- ============================================================================

-- CONTRIBUTORs (sem auth — serão criados pelo AdminPanel via manage_user RPC)
INSERT INTO public.app_users (id, name, role, role_title, avatar, metrics) VALUES
  ('u1', 'Rafael', 'CONTRIBUTOR', 'Tráfego Pago', 'https://picsum.photos/seed/rafael/150/150',
   '[{"id":"m_rafael_1","title":"Contas com CPA reduzido","targetValue":60,"unit":"%","type":"PERCENTAGE_CUMULATIVE","inputs":[{"key":"total_accounts","label":"Em quantas contas você trabalhou esta semana?","type":"number"},{"key":"reduced_accounts","label":"Quantas tiveram redução clara de CPA?","type":"number"}]}]'::jsonb),

  ('u2', 'Kauã', 'CONTRIBUTOR', 'Automação & IA', 'https://picsum.photos/seed/kaua/150/150',
   '[{"id":"m_kaua_1","title":"Demandas atendidas em < 48h","targetValue":90,"unit":"%","type":"PERCENTAGE_CUMULATIVE","inputs":[{"key":"total_demands","label":"Quantas demandas você recebeu/finalizou?","type":"number"},{"key":"fast_demands","label":"Quantas foram resolvidas em menos de 48h úteis?","type":"number"}]}]'::jsonb),

  ('u3', 'Kevin', 'CONTRIBUTOR', 'Design & Edição', 'https://picsum.photos/seed/kevin/150/150',
   '[{"id":"m_kevin_1","title":"Entregas dentro do prazo","targetValue":90,"unit":"%","type":"PERCENTAGE_CUMULATIVE","inputs":[{"key":"total_deliveries","label":"Total de entregas realizadas","type":"number"},{"key":"on_time_deliveries","label":"Quantas foram entregues no prazo estipulado?","type":"number"}]}]'::jsonb),

  ('u7', 'Arthur', 'CONTRIBUTOR', 'Copywriter', 'https://picsum.photos/seed/arthur/150/150',
   '[{"id":"m_arthur_1","title":"Qualidade Copy (Aprovadas 1ª)","targetValue":80,"unit":"%","type":"PERCENTAGE_CUMULATIVE","inputs":[{"key":"total_copies","label":"Copys entregues","type":"number"},{"key":"approved_copies","label":"Aprovadas sem refação","type":"number"}]}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- PARTNERs (auth_id NULL inicialmente — atualizar após criar auth users via Dashboard)
INSERT INTO public.app_users (id, name, role, role_title, avatar, metrics, email, password_changed) VALUES
  ('u4', 'Leandro', 'PARTNER', 'Sócio / Comercial', 'https://picsum.photos/seed/leandro/150/150',
   '[{"id":"m_leandro_1","title":"Auditorias pagas agendadas","targetValue":12,"unit":"un","type":"SUM_TARGET","inputs":[{"key":"audits_scheduled","label":"Novas auditorias pagas agendadas","type":"number"}]},{"id":"m_leandro_2","title":"Conversão Auditoria -> CORE","targetValue":25,"unit":"%","type":"PERCENTAGE_CUMULATIVE","inputs":[{"key":"audits_performed","label":"Auditorias realizadas","type":"number"},{"key":"core_closed","label":"Vendas de CORE fechadas","type":"number"}]},{"id":"m_leandro_3","title":"Conteúdos Publicados","targetValue":35,"unit":"un","type":"SUM_TARGET","inputs":[{"key":"content_count","label":"Conteúdos publicados (YT+LI+IG)","type":"number"}]}]'::jsonb,
   'leandrogeseth@gmail.com', true),

  ('u5', 'Joel', 'PARTNER', 'Sócio / Financeiro / SDR', 'https://picsum.photos/seed/joel/150/150',
   '[{"id":"m_joel_1","title":"Taxa de Aceite Diagnóstico","targetValue":60,"unit":"%","type":"PERCENTAGE_CUMULATIVE","inputs":[{"key":"contacts_made","label":"Contatos realizados","type":"number"},{"key":"diagnostics_accepted","label":"Diagnósticos aceitos","type":"number"}]},{"id":"m_joel_2","title":"Contas da empresa em dia","targetValue":95,"unit":"%","type":"PERCENTAGE_AVERAGE","inputs":[{"key":"on_time_percentage","label":"% de contas pagas sem atraso esta semana","type":"number"}]}]'::jsonb,
   'ojoeljunior1@gmail.com', false),

  ('u6', 'Adriano', 'PARTNER', 'Sócio / PM / CS', 'https://picsum.photos/seed/adriano/150/150',
   '[{"id":"m_adriano_1","title":"Projetos no prazo","targetValue":90,"unit":"%","type":"PERCENTAGE_CUMULATIVE","inputs":[{"key":"total_projects","label":"Projetos ativos/entregues","type":"number"},{"key":"on_track_projects","label":"Projetos dentro do cronograma","type":"number"}]},{"id":"m_adriano_2","title":"NPS Médio","targetValue":8,"unit":"pts","type":"PERCENTAGE_AVERAGE","inputs":[{"key":"current_nps","label":"NPS medido esta semana","type":"number"}]}]'::jsonb,
   'sistemawebinfo@gmail.com', false)
ON CONFLICT (id) DO NOTHING;

-- Após criar auth users via Dashboard, vincular:
-- UPDATE public.app_users SET auth_id = '439b38e2-daa7-4d23-805b-efbf397d7d6e' WHERE id = 'u4';
-- UPDATE public.app_users SET auth_id = '553cdab7-debf-40c0-bac0-3948073b3200' WHERE id = 'u5';
-- UPDATE public.app_users SET auth_id = '63e94e8a-e721-438f-ae25-42dcf313e09d' WHERE id = 'u6';

-- 5. MANAGE_USER RPC FUNCTION
-- ============================================================================
-- NOTA: Esta function usa INSERT direto em auth.users (SECURITY DEFINER).
-- No Supabase Cloud, a action 'create' pode falhar pelos mesmos motivos
-- descritos na seção 3. Se isso ocorrer, migrar para Supabase Admin API
-- (supabase.auth.admin.createUser) chamada server-side.
-- As actions 'delete' e 'reset_password' funcionam normalmente pois
-- operam em registros já criados pelo GoTrue.

CREATE OR REPLACE FUNCTION public.manage_user(
  action TEXT,
  user_email TEXT DEFAULT NULL,
  user_name TEXT DEFAULT NULL,
  user_role TEXT DEFAULT NULL,
  user_role_title TEXT DEFAULT NULL,
  user_avatar TEXT DEFAULT NULL,
  user_metrics JSONB DEFAULT NULL,
  target_user_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_auth_id UUID;
  new_user_id TEXT;
  result JSONB;
BEGIN
  -- Only PARTNERs can call this
  IF public.get_user_role() != 'PARTNER' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: only PARTNERs can manage users');
  END IF;

  CASE action
    WHEN 'create' THEN
      new_auth_id := gen_random_uuid();

      -- Create auth user
      INSERT INTO auth.users (
        id, instance_id, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        role, aud, created_at, updated_at,
        confirmation_token, recovery_token,
        email_change_token_new, email_change_token_current,
        is_sso_user
      ) VALUES (
        new_auth_id, '00000000-0000-0000-0000-000000000000',
        user_email, crypt('ordus2025', gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', user_name),
        'authenticated', 'authenticated', now(), now(),
        '', '', '', '', false
      );

      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id,
        last_sign_in_at, created_at, updated_at
      ) VALUES (
        new_auth_id, new_auth_id,
        jsonb_build_object('sub', new_auth_id::text, 'email', user_email, 'email_verified', true),
        'email', new_auth_id::text,
        now(), now(), now()
      );

      -- Create app_user
      new_user_id := new_auth_id::text;
      INSERT INTO public.app_users (id, name, role, role_title, avatar, metrics, auth_id, email, password_changed)
      VALUES (
        new_user_id,
        user_name,
        COALESCE(user_role, 'CONTRIBUTOR'),
        user_role_title,
        COALESCE(user_avatar, 'https://api.dicebear.com/7.x/initials/svg?seed=' || user_name),
        COALESCE(user_metrics, '[]'::jsonb),
        new_auth_id,
        user_email,
        false
      );

      result := jsonb_build_object('success', true, 'user_id', new_user_id, 'auth_id', new_auth_id);

    WHEN 'delete' THEN
      DELETE FROM auth.users WHERE id = (
        SELECT auth_id FROM public.app_users WHERE id = target_user_id
      );
      DELETE FROM public.app_users WHERE id = target_user_id;
      result := jsonb_build_object('success', true);

    WHEN 'reset_password' THEN
      UPDATE auth.users SET
        encrypted_password = crypt('ordus2025', gen_salt('bf')),
        updated_at = now()
      WHERE id = (SELECT auth_id FROM public.app_users WHERE id = target_user_id);

      UPDATE public.app_users SET password_changed = false WHERE id = target_user_id;
      result := jsonb_build_object('success', true);

    ELSE
      result := jsonb_build_object('success', false, 'error', 'Invalid action');
  END CASE;

  RETURN result;
END;
$$;
