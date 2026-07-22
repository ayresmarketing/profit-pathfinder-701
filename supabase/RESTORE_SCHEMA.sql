-- ============================================================================
-- Anti-Prejuízo (profit-pathfinder-701) — Restauração completa do schema
-- ============================================================================
--
-- Este script recria do zero, num Supabase novo, exatamente o mesmo schema
-- que o projeto antigo (dbhmjzirzufvprfenwnb, pausado por falta de uso)
-- tinha em produção: tabelas, colunas, constraints, Row Level Security,
-- policies, funções e triggers.
--
-- Reconstruído a partir da migration original do repositório
-- (supabase/migrations/20260401140656_cc3556a1-bb97-46ad-9c79-f55660a6e600.sql)
-- e validado cruzando com os types gerados pelo Supabase CLI
-- (src/integrations/supabase/types.ts) e com o código que consome o banco
-- (src/contexts/OperationContext.tsx, AuthContext.tsx, Login.tsx, Signup.tsx).
--
-- Uso: cole este arquivo inteiro no SQL Editor do Supabase (projeto novo) e
-- rode de uma vez. É seguro rodar mais de uma vez (idempotente): usa
-- IF NOT EXISTS / DROP ... IF EXISTS antes de recriar policies e triggers.
--
-- Após rodar, atualize no projeto (fora deste script):
--   - supabase/config.toml -> project_id do novo projeto
--   - .env.local / variáveis de ambiente da Vercel:
--       VITE_SUPABASE_URL
--       VITE_SUPABASE_PUBLISHABLE_KEY
--       VITE_SUPABASE_PROJECT_ID
--   - (opcional) rodar `supabase gen types typescript` apontando para o
--     projeto novo para regerar src/integrations/supabase/types.ts — não é
--     estritamente necessário, pois o schema abaixo é idêntico ao já
--     refletido nesse arquivo de types.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. TABELAS
-- ----------------------------------------------------------------------------

-- profiles: perfil do usuário, criado automaticamente no signup via trigger
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- subscriptions: trial/assinatura, criado automaticamente no signup (trial 7 dias)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing',
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- products: produtos do usuário (principal + order bumps/upsells/downsells)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'principal' CHECK (type IN ('principal', 'orderbump', 'upsell', 'downsell')),
  tax_percentage NUMERIC(5,2) DEFAULT 0,
  platform_percentage NUMERIC(5,2) DEFAULT 0,
  platform_fixed NUMERIC(10,2) DEFAULT 0,
  coproducer_percentage NUMERIC(5,2) DEFAULT 0,
  other_costs NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- funnels: funis do usuário (estrutura existente no banco antigo; a UI atual
-- ainda não usa esta tabela diretamente, mas fazia parte do schema original)
CREATE TABLE IF NOT EXISTS public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Meu Funil',
  estimated_cpa NUMERIC(10,2) DEFAULT 0,
  daily_budget NUMERIC(10,2) DEFAULT 0,
  days INTEGER DEFAULT 30,
  ctr NUMERIC(5,2) DEFAULT 2,
  lp_conversion NUMERIC(5,2) DEFAULT 25,
  checkout_conversion NUMERIC(5,2) DEFAULT 33,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- funnel_products: junction table funnels <-> products
CREATE TABLE IF NOT EXISTS public.funnel_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'principal' CHECK (role IN ('principal', 'orderbump', 'upsell', 'downsell')),
  conversion_rate NUMERIC(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, product_id)
);


-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_products ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------------------
-- 3. POLICIES
-- ----------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- subscriptions (somente leitura pelo próprio usuário; insert/update é feito
-- pelo trigger handle_new_user via SECURITY DEFINER / service role)
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- products
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
CREATE POLICY "Users can view own products" ON public.products FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own products" ON public.products;
CREATE POLICY "Users can create own products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own products" ON public.products;
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- funnels
DROP POLICY IF EXISTS "Users can view own funnels" ON public.funnels;
CREATE POLICY "Users can view own funnels" ON public.funnels FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own funnels" ON public.funnels;
CREATE POLICY "Users can create own funnels" ON public.funnels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own funnels" ON public.funnels;
CREATE POLICY "Users can update own funnels" ON public.funnels FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own funnels" ON public.funnels;
CREATE POLICY "Users can delete own funnels" ON public.funnels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- funnel_products (ownership verificado via join com funnels)
DROP POLICY IF EXISTS "Users can view own funnel products" ON public.funnel_products;
CREATE POLICY "Users can view own funnel products" ON public.funnel_products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels WHERE id = funnel_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create own funnel products" ON public.funnel_products;
CREATE POLICY "Users can create own funnel products" ON public.funnel_products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.funnels WHERE id = funnel_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own funnel products" ON public.funnel_products;
CREATE POLICY "Users can update own funnel products" ON public.funnel_products FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels WHERE id = funnel_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own funnel products" ON public.funnel_products;
CREATE POLICY "Users can delete own funnel products" ON public.funnel_products FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels WHERE id = funnel_id AND user_id = auth.uid()));


-- ----------------------------------------------------------------------------
-- 4. FUNÇÃO + TRIGGER: criação automática de profile e subscription no signup
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );

  -- Cria subscription em trial (7 dias)
  INSERT INTO public.subscriptions (user_id, status, trial_start, trial_end)
  VALUES (
    NEW.id,
    'trialing',
    now(),
    now() + interval '7 days'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 5. FUNÇÃO + TRIGGERS: atualização automática de updated_at
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_funnels_updated_at ON public.funnels;
CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON public.funnels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Fim do script. Schema restaurado: profiles, subscriptions, products,
-- funnels, funnel_products — com RLS, policies e triggers idênticos ao
-- projeto Supabase original do Anti-Prejuízo.
-- ============================================================================
