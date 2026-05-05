
-- Store connections (Shopify, WooCommerce, PrestaShop, Custom feed)
CREATE TABLE public.store_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID,
  platform TEXT NOT NULL CHECK (platform IN ('shopify','woocommerce','prestashop','custom')),
  shop_name TEXT NOT NULL,
  store_url TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own store connections" ON public.store_connections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own store connections" ON public.store_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own store connections" ON public.store_connections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own store connections" ON public.store_connections
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER store_connections_updated_at
  BEFORE UPDATE ON public.store_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_store_connections_user ON public.store_connections(user_id);
CREATE INDEX idx_store_connections_project ON public.store_connections(project_id);

-- Imported products cache
CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES public.store_connections(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC,
  currency TEXT,
  primary_image_url TEXT,
  image_urls JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  product_url TEXT,
  raw JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(connection_id, external_id)
);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own store products" ON public.store_products
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own store products" ON public.store_products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own store products" ON public.store_products
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own store products" ON public.store_products
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_store_products_user ON public.store_products(user_id);
CREATE INDEX idx_store_products_connection ON public.store_products(connection_id);
