import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingBag, Plus, RefreshCw, Trash2, Check, Loader2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { enUS } from "date-fns/locale";

type Platform = "shopify" | "woocommerce" | "prestashop" | "custom";

interface StoreConnection {
  id: string;
  platform: Platform;
  shop_name: string;
  store_url: string;
  status: string;
  last_sync_at: string | null;
}

const platformMeta: Record<Platform, { label: string; gradient: string; helper: string }> = {
  shopify: { label: "Shopify", gradient: "from-[#95BF47] to-[#5E8E3E]", helper: "Admin API access token (Custom App)" },
  woocommerce: { label: "WooCommerce", gradient: "from-[#7F54B3] to-[#5A3E8C]", helper: "REST API consumer key & secret" },
  prestashop: { label: "PrestaShop", gradient: "from-[#DF0067] to-[#A30049]", helper: "Webservice key (Advanced > Webservice)" },
  custom: { label: "Custom Feed", gradient: "from-slate-500 to-slate-700", helper: "Generic JSON product feed (advanced)" },
};

export const StoreIntegrations = () => {
  const { toast } = useToast();
  const [connections, setConnections] = useState<StoreConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    platform: "shopify" as Platform,
    shop_name: "",
    store_url: "",
    api_key: "",
    api_secret: "",
    access_token: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("store_connections")
      .select("id, platform, shop_name, store_url, status, last_sync_at")
      .order("created_at", { ascending: false });
    setConnections((data as StoreConnection[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.shop_name.trim() || !form.store_url.trim()) {
      toast({ title: "Missing fields", description: "Shop name and URL are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSubmitting(false); return; }

    const { error } = await supabase.from("store_connections").insert({
      user_id: session.user.id,
      platform: form.platform,
      shop_name: form.shop_name.trim(),
      store_url: form.store_url.trim().replace(/\/+$/, ""),
      api_key: form.api_key.trim() || null,
      api_secret: form.api_secret.trim() || null,
      access_token: form.access_token.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to add store", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Store connected", description: "You can now sync products" });
    setOpen(false);
    setForm({ platform: "shopify", shop_name: "", store_url: "", api_key: "", api_secret: "", access_token: "" });
    load();
  };

  const handleSync = async (id: string) => {
    setSyncing(id);
    const { data, error } = await supabase.functions.invoke("sync-store-products", { body: { connection_id: id } });
    setSyncing(null);
    if (error || !data?.success) {
      toast({ title: "Sync failed", description: error?.message ?? data?.error ?? "Unknown error", variant: "destructive" });
      return;
    }
    toast({ title: "Sync complete", description: `${data.count} products imported` });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Disconnect this store? Imported products will be removed.")) return;
    const { error } = await supabase.from("store_connections").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else load();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">E-commerce Stores</CardTitle>
              <CardDescription>Import products from Shopify, WooCommerce, PrestaShop</CardDescription>
            </div>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary"><Plus className="h-4 w-4 mr-1" />Add store</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Connect a store</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Platform</Label>
                  <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as Platform })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(platformMeta).map(([k, m]) => (
                        <SelectItem key={k} value={k}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{platformMeta[form.platform].helper}</p>
                </div>
                <div>
                  <Label>Shop name</Label>
                  <Input value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} placeholder="My Shop" />
                </div>
                <div>
                  <Label>Store URL</Label>
                  <Input value={form.store_url} onChange={(e) => setForm({ ...form, store_url: e.target.value })} placeholder="https://my-shop.myshopify.com" />
                </div>
                {form.platform === "shopify" && (
                  <div>
                    <Label>Admin API access token</Label>
                    <Input type="password" value={form.access_token} onChange={(e) => setForm({ ...form, access_token: e.target.value })} placeholder="shpat_..." />
                  </div>
                )}
                {form.platform === "woocommerce" && (
                  <>
                    <div>
                      <Label>Consumer key</Label>
                      <Input value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="ck_..." />
                    </div>
                    <div>
                      <Label>Consumer secret</Label>
                      <Input type="password" value={form.api_secret} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} placeholder="cs_..." />
                    </div>
                  </>
                )}
                {form.platform === "prestashop" && (
                  <div>
                    <Label>Webservice key</Label>
                    <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={submitting} className="gradient-primary">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : connections.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Store className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
            <p className="text-sm text-muted-foreground">No store connected yet.</p>
            <p className="text-xs text-muted-foreground">Connect Shopify, WooCommerce or PrestaShop to import your catalog and generate AI product shots.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((c) => {
              const meta = platformMeta[c.platform];
              return (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${meta.gradient}`}>
                      <ShoppingBag className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.shop_name} <Badge variant="secondary" className="ml-1 text-[10px]">{meta.label}</Badge></p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.last_sync_at ? `Synced ${formatDistanceToNow(new Date(c.last_sync_at), { addSuffix: true, locale: enUS })}` : "Never synced"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleSync(c.id)} disabled={syncing === c.id}>
                      {syncing === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      <span className="ml-1 hidden sm:inline">Sync</span>
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
