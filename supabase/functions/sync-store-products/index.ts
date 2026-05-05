import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NormalizedProduct {
  external_id: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  primary_image_url: string | null;
  image_urls: string[];
  variants: any[];
  product_url: string | null;
  raw: any;
}

const normalizeUrl = (u: string) => u.replace(/\/+$/, "");

async function fetchShopify(storeUrl: string, token: string): Promise<NormalizedProduct[]> {
  const base = normalizeUrl(storeUrl);
  const url = `${base}/admin/api/2024-01/products.json?limit=250`;
  const res = await fetch(url, { headers: { "X-Shopify-Access-Token": token } });
  if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.products ?? []).map((p: any) => ({
    external_id: String(p.id),
    title: p.title,
    description: p.body_html ?? null,
    price: p.variants?.[0]?.price ? Number(p.variants[0].price) : null,
    currency: null,
    primary_image_url: p.image?.src ?? p.images?.[0]?.src ?? null,
    image_urls: (p.images ?? []).map((i: any) => i.src),
    variants: p.variants ?? [],
    product_url: `${base}/products/${p.handle}`,
    raw: p,
  }));
}

async function fetchWooCommerce(storeUrl: string, key: string, secret: string): Promise<NormalizedProduct[]> {
  const base = normalizeUrl(storeUrl);
  const auth = btoa(`${key}:${secret}`);
  const url = `${base}/wp-json/wc/v3/products?per_page=100`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`WooCommerce ${res.status}: ${await res.text()}`);
  const items = await res.json();
  return (items ?? []).map((p: any) => ({
    external_id: String(p.id),
    title: p.name,
    description: p.description ?? p.short_description ?? null,
    price: p.price ? Number(p.price) : null,
    currency: null,
    primary_image_url: p.images?.[0]?.src ?? null,
    image_urls: (p.images ?? []).map((i: any) => i.src),
    variants: p.variations ?? [],
    product_url: p.permalink ?? null,
    raw: p,
  }));
}

async function fetchPrestaShop(storeUrl: string, key: string): Promise<NormalizedProduct[]> {
  const base = normalizeUrl(storeUrl);
  const auth = btoa(`${key}:`);
  const url = `${base}/api/products?output_format=JSON&display=full&limit=100`;
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`PrestaShop ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return (json.products ?? []).map((p: any) => ({
    external_id: String(p.id),
    title: typeof p.name === "string" ? p.name : p.name?.[0]?.value ?? "Untitled",
    description: typeof p.description === "string" ? p.description : p.description?.[0]?.value ?? null,
    price: p.price ? Number(p.price) : null,
    currency: null,
    primary_image_url: null,
    image_urls: [],
    variants: [],
    product_url: null,
    raw: p,
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { connection_id } = await req.json();
    if (!connection_id) throw new Error("connection_id required");

    const { data: conn, error: cErr } = await supabase
      .from("store_connections")
      .select("*")
      .eq("id", connection_id)
      .eq("user_id", user.id)
      .single();
    if (cErr || !conn) throw new Error("Connection not found");

    let products: NormalizedProduct[] = [];
    if (conn.platform === "shopify") {
      products = await fetchShopify(conn.store_url, conn.access_token ?? conn.api_key);
    } else if (conn.platform === "woocommerce") {
      products = await fetchWooCommerce(conn.store_url, conn.api_key, conn.api_secret);
    } else if (conn.platform === "prestashop") {
      products = await fetchPrestaShop(conn.store_url, conn.api_key);
    } else {
      throw new Error(`Unsupported platform: ${conn.platform}`);
    }

    if (products.length > 0) {
      const rows = products.map((p) => ({ ...p, user_id: user.id, connection_id }));
      const { error: upErr } = await supabase
        .from("store_products")
        .upsert(rows, { onConflict: "connection_id,external_id" });
      if (upErr) throw upErr;
    }

    await supabase
      .from("store_connections")
      .update({ last_sync_at: new Date().toISOString(), status: "active" })
      .eq("id", connection_id);

    return new Response(
      JSON.stringify({ success: true, count: products.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("sync-store-products error:", e);
    return new Response(
      JSON.stringify({ success: false, error: e.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
