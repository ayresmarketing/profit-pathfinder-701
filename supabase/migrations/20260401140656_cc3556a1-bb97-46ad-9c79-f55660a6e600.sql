
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
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

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Service role will manage subscriptions via edge functions, so we need insert/update for service role
-- No user-facing insert/update policies needed

-- Create products table
CREATE TABLE public.products (
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

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products" ON public.products FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own products" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own products" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own products" ON public.products FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create funnels table
CREATE TABLE public.funnels (
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

ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own funnels" ON public.funnels FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create own funnels" ON public.funnels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own funnels" ON public.funnels FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own funnels" ON public.funnels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create funnel_products junction table
CREATE TABLE public.funnel_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'principal' CHECK (role IN ('principal', 'orderbump', 'upsell', 'downsell')),
  conversion_rate NUMERIC(5,2) DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funnel_id, product_id)
);

ALTER TABLE public.funnel_products ENABLE ROW LEVEL SECURITY;

-- Use a join to check ownership through funnel
CREATE POLICY "Users can view own funnel products" ON public.funnel_products FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels WHERE id = funnel_id AND user_id = auth.uid()));
CREATE POLICY "Users can create own funnel products" ON public.funnel_products FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.funnels WHERE id = funnel_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own funnel products" ON public.funnel_products FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels WHERE id = funnel_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own funnel products" ON public.funnel_products FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.funnels WHERE id = funnel_id AND user_id = auth.uid()));

-- Auto-create profile on signup
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
  
  -- Create trial subscription (7 days)
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
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

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON public.funnels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
