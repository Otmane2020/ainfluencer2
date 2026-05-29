import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Sparkles, Camera, RotateCcw, Eye, Download, Check, X, Loader2,
  ImageIcon, Trash2, ArrowUpFromLine, ArrowDownFromLine, Maximize2, Move3d,
  Palette, ArrowRight, ArrowLeft, Wand2, Aperture, Smartphone, Square, Monitor,
  Store, Package, Plug, ChevronDown, ChevronUp, Sun, Trees, Building, Coffee, Gem, Mountain, Link2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useCredits } from "@/hooks/useCredits";

const SHOT_TYPES = [
  { id: "front", label: "Front View", icon: Camera, description: "Direct front-facing shot", gradient: "from-blue-500 to-cyan-500" },
  { id: "angle45", label: "45° Angle", icon: Move3d, description: "Three-quarter angle view", gradient: "from-violet-500 to-purple-500" },
  { id: "profile", label: "Side Profile", icon: ArrowUpFromLine, description: "Side view of product", gradient: "from-pink-500 to-rose-500" },
  { id: "back", label: "Back View", icon: RotateCcw, description: "Rear view of product", gradient: "from-orange-500 to-amber-500" },
  { id: "top", label: "Top View", icon: Eye, description: "Bird's eye view", gradient: "from-emerald-500 to-teal-500" },
  { id: "low_angle", label: "Low Angle", icon: ArrowDownFromLine, description: "Dramatic upward angle", gradient: "from-indigo-500 to-blue-600" },
  { id: "zoom_detail", label: "Detail Close-up", icon: Maximize2, description: "Macro detail shot", gradient: "from-fuchsia-500 to-pink-600" },
];

const FORMATS = [
  { id: "portrait", label: "Mobile / Reels", ratio: "9:16", icon: Smartphone, hint: "TikTok, Reels, Shorts" },
  { id: "square", label: "Square", ratio: "1:1", icon: Square, hint: "Instagram feed, catalog" },
  { id: "landscape", label: "Landscape", ratio: "16:9", icon: Monitor, hint: "YouTube, web banners" },
] as const;
type FormatId = typeof FORMATS[number]["id"];

const AMBIANCE_STYLES = [
  { id: "studio_white", label: "Studio White", icon: Square, prompt: "pure white seamless studio backdrop, soft even lighting" },
  { id: "minimal_beige", label: "Minimal Beige", icon: Sun, prompt: "minimalist beige background, soft morning light, marble surface" },
  { id: "natural_outdoor", label: "Nature", icon: Trees, prompt: "natural outdoor setting, organic textures, soft daylight, greenery" },
  { id: "urban_modern", label: "Urban Modern", icon: Building, prompt: "modern urban interior, concrete and glass, contemporary architecture" },
  { id: "cozy_lifestyle", label: "Cozy Lifestyle", icon: Coffee, prompt: "cozy warm lifestyle setting, wooden surfaces, soft ambient lighting" },
  { id: "luxury_premium", label: "Luxury", icon: Gem, prompt: "premium luxury setting, marble and gold accents, dramatic lighting" },
  { id: "outdoor_adventure", label: "Adventure", icon: Mountain, prompt: "rugged outdoor adventure scene, natural rocks and landscape" },
] as const;
type AmbianceId = typeof AMBIANCE_STYLES[number]["id"];

interface GeneratedImage { type: string; label: string; url: string; selected: boolean; }

const STEPS = [
  { id: 1, label: "Upload", icon: Upload },
  { id: 2, label: "Choose shots", icon: Aperture },
  { id: 3, label: "Generate", icon: Wand2 },
  { id: 4, label: "Download", icon: Download },
];

export default function ProductShotsPage() {
  const { balance, refresh: refreshCredits } = useCredits();
  const [step, setStep] = useState(1);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [productTitle, setProductTitle] = useState("");
  const [selectedShotTypes, setSelectedShotTypes] = useState<Set<string>>(
    new Set(["front", "angle45", "profile", "zoom_detail"])
  );
  const [includeLifestyle, setIncludeLifestyle] = useState(true);
  const [format, setFormat] = useState<FormatId>("portrait");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatingLabel, setGeneratingLabel] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [withAmbiance, setWithAmbiance] = useState(false);
  const [ambianceStyle, setAmbianceStyle] = useState<AmbianceId>("studio_white");
  const [showAmbianceStyles, setShowAmbianceStyles] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importingUrl, setImportingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Catalog integration
  const [hasIntegration, setHasIntegration] = useState<boolean | null>(null);
  const [catalogProducts, setCatalogProducts] = useState<Array<{ id: string; title: string; primary_image_url: string | null }>>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingCatalog(true);
      const { data: conns } = await supabase.from("store_connections").select("id").limit(1);
      const connected = !!conns && conns.length > 0;
      setHasIntegration(connected);
      if (connected) {
        const { data: prods } = await supabase
          .from("store_products")
          .select("id, title, primary_image_url")
          .order("imported_at", { ascending: false })
          .limit(60);
        setCatalogProducts(prods || []);
      }
      setLoadingCatalog(false);
    })();
  }, []);

  const pickCatalogProduct = async (p: { id: string; title: string; primary_image_url: string | null }) => {
    if (!p.primary_image_url) return toast.error("This product has no image");
    try {
      const res = await fetch(p.primary_image_url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const file = new File([blob], `${p.title}.${ext}`, { type: blob.type });
      setSourceFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setSourceImage(e.target?.result as string);
      reader.readAsDataURL(file);
      setProductTitle(p.title);
      toast.success(`Loaded "${p.title}"`);
    } catch {
      toast.error("Could not load this product image");
    }
  };

  const totalShots = selectedShotTypes.size + (includeLifestyle ? 1 : 0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please upload an image file");
    if (file.size > 10 * 1024 * 1024) return toast.error("Image must be less than 10MB");
    setSourceFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setSourceImage(e.target?.result as string);
    reader.readAsDataURL(file);
    if (!productTitle) setProductTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
  };

  const handleImportFromUrl = async () => {
    const trimmed = importUrl.trim();
    if (!trimmed) return toast.error("Paste a product image URL");
    if (!/^https?:\/\//i.test(trimmed)) return toast.error("URL must start with http(s)://");
    setImportingUrl(true);
    try {
      const res = await fetch(trimmed);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (!blob.type.startsWith("image/")) throw new Error("URL doesn't point to an image");
      if (blob.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB");
      const ext = (blob.type.split("/")[1] || "png").replace("jpeg", "jpg");
      const fileName = trimmed.split("/").pop()?.split("?")[0] || `import.${ext}`;
      const file = new File([blob], fileName, { type: blob.type });
      setSourceFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setSourceImage(e.target?.result as string);
      reader.readAsDataURL(file);
      if (!productTitle) setProductTitle(fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      toast.success("Image imported from URL");
    } catch (e: any) {
      toast.error(e?.message || "Could not load image from this URL");
    } finally {
      setImportingUrl(false);
    }
  };

  const maxShots = Math.max(1, Math.min(7, balance));
  const lifestyleAllowed = (selectedShotTypes.size + 1) <= balance;

  const toggleShotType = (id: string) => {
    const s = new Set(selectedShotTypes);
    if (s.has(id)) {
      if (s.size > 1) s.delete(id);
      else return toast.warning("Select at least one shot type");
    } else {
      const projected = s.size + 1 + (includeLifestyle ? 1 : 0);
      if (projected > balance) return toast.error(`Not enough credits — you have ${balance}. Upgrade or buy more.`);
      if (s.size >= 7) return toast.warning("Maximum 7 shot types");
      s.add(id);
    }
    setSelectedShotTypes(s);
  };

  const toggleLifestyle = () => {
    if (!includeLifestyle) {
      if (selectedShotTypes.size + 1 > balance) {
        return toast.error(`Not enough credits — you have ${balance}.`);
      }
    }
    setIncludeLifestyle(!includeLifestyle);
  };

  // Cycle through shot labels during generation for visual feedback
  useEffect(() => {
    if (!isGenerating) return;
    const labels = [
      ...Array.from(selectedShotTypes).map((id) => SHOT_TYPES.find((t) => t.id === id)?.label ?? ""),
      ...(includeLifestyle ? ["Lifestyle Scene"] : []),
    ].filter(Boolean);
    let i = 0;
    setGeneratingLabel(labels[0] ?? "");
    const t = setInterval(() => { i = (i + 1) % labels.length; setGeneratingLabel(labels[i]); }, 1400);
    return () => clearInterval(t);
  }, [isGenerating, selectedShotTypes, includeLifestyle]);

  const handleGenerate = async () => {
    if (!sourceImage || !sourceFile) return toast.error("Please upload a product image first");
    setStep(3);
    setIsGenerating(true);
    setProgress(0);
    setGeneratedImages([]);
    const toastId = toast.loading("Uploading source image...");
    try {
      const fileName = `product-shots/source-${Date.now()}-${crypto.randomUUID()}.${sourceFile.name.split(".").pop() || "png"}`;
      const { data: up, error: upErr } = await supabase.storage.from("media").upload(fileName, sourceFile, { contentType: sourceFile.type, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = supabase.storage.from("media").getPublicUrl(up.path);
      toast.loading("Generating product shots...", { id: toastId });
      const interval = setInterval(() => setProgress((p) => Math.min(p + 4, 92)), 600);
      const { data, error } = await supabase.functions.invoke("generate-product-shots", {
        body: { sourceImageUrl: pub.publicUrl, shotTypes: Array.from(selectedShotTypes), productTitle: productTitle || "Product", includeLifestyle, format, customPrompt: customPrompt.trim() || undefined, withAmbiance, ambianceStyle: withAmbiance ? ambianceStyle : undefined, ambiancePrompt: withAmbiance ? AMBIANCE_STYLES.find(a => a.id === ambianceStyle)?.prompt : undefined },
      });
      clearInterval(interval);
      if (error) throw error;
      if (data?.fallback || data?.success === false) {
        const failedCount = Array.isArray(data?.failedShots) ? data.failedShots.length : totalShots;
        const firstFailure = data?.failedShots?.[0]?.failures?.[0];
        const detail = firstFailure?.code === "CREDITS_EXHAUSTED"
          ? "Please top up the connected AI billing first, then retry."
          : firstFailure?.code === "RATE_LIMITED"
            ? "The provider is rate-limited right now. Please retry in a moment."
            : "Please retry in a moment.";
        toast.error(`${data?.error || "Image generation is temporarily unavailable."} ${detail}`, { id: toastId });
        setProgress(0);
        setStep(2);
        if (failedCount < totalShots && data?.images?.length) {
          setGeneratedImages(data.images.map((img: any) => ({ type: img.type, label: img.label, url: img.url, selected: true })));
          setStep(4);
        }
        return;
      }
      if (data?.images?.length) {
        setGeneratedImages(data.images.map((img: any) => ({ type: img.type, label: img.label, url: img.url, selected: true })));
        setProgress(100);
        const charged = data.creditsCharged ?? data.images.length;
        toast.success(`${data.images.length} shots generated — ${charged} credit(s) used`, { id: toastId });
        await refreshCredits();
        setStep(4);
      } else throw new Error(data?.error || "No images generated");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to generate", { id: toastId });
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleImageSelection = (i: number) =>
    setGeneratedImages((prev) => prev.map((img, idx) => (idx === i ? { ...img, selected: !img.selected } : img)));

  const handleDownloadSelected = async () => {
    const sel = generatedImages.filter((i) => i.selected);
    if (!sel.length) return toast.error("No images selected");
    for (const img of sel) {
      try {
        const blob = await (await fetch(img.url)).blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${productTitle || "product"}-${img.type}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) { console.error(e); }
    }
    toast.success(`Downloaded ${sel.length} image(s)`);
  };

  const handleReset = () => {
    setStep(1); setSourceImage(null); setSourceFile(null); setProductTitle("");
    setGeneratedImages([]); setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canNext = step === 1 ? !!sourceImage : step === 2 ? selectedShotTypes.size > 0 : false;

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col min-h-[calc(100dvh-5rem)] sm:min-h-0 px-3 sm:px-0 gap-3 sm:gap-4 animate-fade-in">
      {/* Compact header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold leading-tight truncate">
            1 photo → <span className="text-gradient">10 pro shots</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">Upload, pick angles, AI handles the studio.</p>
        </div>
        <div className="hidden sm:inline-flex shrink-0 items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium">
          <Sparkles className="h-3 w-3" /> AI Studio
        </div>
      </div>

      {/* Stepper compact */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-0.5 bg-border -z-10">
                    <div className={`h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-500 ${done ? "w-full" : "w-0"}`} />
                  </div>
                )}
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  active ? "border-primary bg-primary text-primary-foreground scale-110 shadow-glow" :
                  done ? "border-primary bg-primary text-primary-foreground" :
                  "border-border bg-card text-muted-foreground"
                }`}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`mt-1 text-[10px] font-medium hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <Card className="overflow-hidden border-2 flex-1 flex flex-col">
        <CardContent className="p-3 sm:p-4 md:p-5 flex-1 overflow-y-auto">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-in flex flex-col h-full">
              <div className="text-center">
                <h2 className="text-base font-bold">Add your product</h2>
                <p className="text-xs text-muted-foreground">Upload a photo or pick one from your store catalog.</p>
              </div>

              <Tabs defaultValue="upload" className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 h-9">
                  <TabsTrigger value="upload" className="text-xs gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="catalog" className="text-xs gap-1.5">
                    <Package className="h-3.5 w-3.5" /> From Catalog
                    {hasIntegration && catalogProducts.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[9px]">{catalogProducts.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* UPLOAD TAB */}
                <TabsContent value="upload" className="flex-1 mt-3 data-[state=inactive]:hidden">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all hover:border-primary/60 hover:bg-primary/5 h-full min-h-[240px] flex items-center justify-center ${sourceImage ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    {sourceImage ? (
                      <div className="relative animate-scale-in w-full h-full flex items-center justify-center">
                        <img src={sourceImage} alt="Source" className="max-h-[260px] sm:max-h-[320px] md:max-h-[360px] w-auto max-w-full mx-auto rounded-lg object-contain" />
                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleReset(); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-3">
                          <ImageIcon className="h-7 w-7 text-primary" />
                        </div>
                        <p className="font-medium text-sm">Click to upload or drag & drop</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">PNG, JPG up to 10MB</p>
                      </div>
                    )}
                  </div>

                  {/* OR import from URL */}
                  {!sourceImage && (
                    <div className="mt-3">
                      <div className="relative flex items-center mb-2">
                        <div className="flex-grow border-t border-border" />
                        <span className="mx-3 text-[10px] uppercase tracking-wider text-muted-foreground">or paste a link</span>
                        <div className="flex-grow border-t border-border" />
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            type="url"
                            value={importUrl}
                            onChange={(e) => setImportUrl(e.target.value)}
                            placeholder="https://store.com/product-image.jpg"
                            className="pl-8 h-9 text-xs"
                            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleImportFromUrl())}
                          />
                        </div>
                        <Button onClick={handleImportFromUrl} disabled={importingUrl || !importUrl.trim()} size="sm" className="h-9">
                          {importingUrl ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Import"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">Direct image URL from Shopify, Amazon, etc.</p>
                    </div>
                  )}
                </TabsContent>

                {/* CATALOG TAB */}
                <TabsContent value="catalog" className="flex-1 mt-3 data-[state=inactive]:hidden">
                  {loadingCatalog ? (
                    <div className="flex items-center justify-center h-full min-h-[240px]">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : !hasIntegration ? (
                    <div className="border-2 border-dashed rounded-xl p-6 h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-3">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                        <Plug className="h-7 w-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">No store connected yet</p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          Connect your Shopify, WooCommerce or PrestaShop store to import products and generate shots in one click.
                        </p>
                      </div>
                      <Button asChild size="sm" className="gap-1.5">
                        <Link to="/integrations">
                          <Store className="h-3.5 w-3.5" /> Add your store
                        </Link>
                      </Button>
                    </div>
                  ) : catalogProducts.length === 0 ? (
                    <div className="border-2 border-dashed rounded-xl p-6 h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-3">
                      <Package className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <p className="font-semibold text-sm">No products imported</p>
                        <p className="text-xs text-muted-foreground mt-1">Sync your store from the Integrations page.</p>
                      </div>
                      <Button asChild size="sm" variant="outline">
                        <Link to="/integrations">Go to Integrations</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[340px] overflow-y-auto pr-1">
                      {catalogProducts.map((p) => {
                        const isSelected = productTitle === p.title && !!sourceImage;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => pickCatalogProduct(p)}
                            className={`group relative aspect-square rounded-lg border-2 overflow-hidden transition-all hover:scale-[1.03] hover:shadow-md ${
                              isSelected ? "border-primary shadow-glow" : "border-border hover:border-primary/40"
                            }`}
                          >
                            {p.primary_image_url ? (
                              <img src={p.primary_image_url} alt={p.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-muted">
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                              <p className="text-[10px] font-medium text-white truncate">{p.title}</p>
                            </div>
                            {isSelected && (
                              <div className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {sourceImage && (
                <div className="space-y-1.5 animate-fade-in">
                  <Label className="text-xs">Product name (optional)</Label>
                  <Input className="h-9" value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="e.g., Modern Leather Chair" />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Shot types — compact 4-col grid, no scroll */}
          {step === 2 && (
            <div className="space-y-3 animate-fade-in">
              <div className="text-center">
                <h2 className="text-base font-bold">Pick your shots</h2>
                <p className="text-xs text-muted-foreground">
                  {totalShots} shot{totalShots > 1 ? "s" : ""} • costs {totalShots} credit{totalShots > 1 ? "s" : ""} (you have {balance})
                </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {SHOT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const active = selectedShotTypes.has(type.id);
                  return (
                    <button key={type.id} type="button" onClick={() => toggleShotType(type.id)}
                      className={`group relative overflow-hidden rounded-lg border-2 p-2 text-center transition-all hover:scale-[1.04] hover:shadow-md ${
                        active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
                      }`}>
                      {active && (
                        <div className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow animate-scale-in">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </div>
                      )}
                      <div className={`mx-auto mb-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br ${type.gradient} shadow transition-transform group-hover:scale-110`}>
                        <Icon className="h-4 w-4 text-white" strokeWidth={2.5} />
                      </div>
                      <p className="text-[11px] font-semibold leading-tight">{type.label}</p>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={toggleLifestyle}
                className={`group relative w-full overflow-hidden rounded-lg border-2 p-2.5 text-left transition-all hover:shadow-md ${
                  includeLifestyle ? "border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" : "border-dashed border-border hover:border-primary/40"
                }`}>
                {includeLifestyle && (
                  <div className="absolute right-2 top-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-md transition-transform group-hover:scale-110">
                    <Palette className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">Lifestyle Scene</p>
                      <Badge variant="secondary" className="h-3.5 px-1 text-[8px] bg-amber-500/15 text-amber-600 border-0">PREMIUM</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Product in a realistic, on-brand environment</p>
                  </div>
                </div>
              </button>

              {/* Ambiance toggle (With / Without) + collapsible style picker */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">Ambiance</p>
                  <div className="inline-flex rounded-lg border border-border overflow-hidden text-[11px]">
                    <button
                      type="button"
                      onClick={() => setWithAmbiance(false)}
                      className={`px-2.5 py-1 transition-colors ${!withAmbiance ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                    >
                      Without ambiance
                    </button>
                    <button
                      type="button"
                      onClick={() => setWithAmbiance(true)}
                      className={`px-2.5 py-1 transition-colors ${withAmbiance ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
                    >
                      With ambiance
                    </button>
                  </div>
                </div>

                {withAmbiance && (
                  <div className="rounded-lg border border-border bg-card/50 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setShowAmbianceStyles((v) => !v)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/40 transition"
                      aria-expanded={showAmbianceStyles}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {(() => {
                          const cur = AMBIANCE_STYLES.find((a) => a.id === ambianceStyle)!;
                          const Icon = cur.icon;
                          return (
                            <>
                              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-primary/5 text-primary shrink-0">
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold truncate">{cur.label}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {showAmbianceStyles ? "Hide styles" : "Expand styles"}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      {showAmbianceStyles ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    {showAmbianceStyles && (
                      <div className="px-2 pb-2 grid grid-cols-3 sm:grid-cols-4 gap-1.5 animate-fade-in">
                        {AMBIANCE_STYLES.map((a) => {
                          const Icon = a.icon;
                          const active = ambianceStyle === a.id;
                          return (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setAmbianceStyle(a.id)}
                              className={`relative rounded-md border-2 p-1.5 text-center transition-all hover:scale-[1.04] ${
                                active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
                              }`}
                            >
                              {active && (
                                <div className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                  <Check className="h-2 w-2" strokeWidth={3} />
                                </div>
                              )}
                              <Icon className={`mx-auto mb-0.5 h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                              <p className="text-[10px] font-medium leading-tight">{a.label}</p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Custom prompt — passed to Lovable AI */}
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="custom-prompt" className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Custom instructions <span className="normal-case text-muted-foreground/70">(optional)</span>
                </Label>
                <textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value.slice(0, 500))}
                  placeholder="e.g. minimalist beige background, soft morning light, marble surface…"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2 text-xs placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <p className="text-[10px] text-muted-foreground text-right">{customPrompt.length}/500</p>
              </div>

              {/* Format / Orientation selector */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Output format</p>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATS.map((f) => {
                    const Icon = f.icon;
                    const active = format === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFormat(f.id)}
                        className={`group relative rounded-lg border-2 p-2 text-center transition-all hover:scale-[1.03] hover:shadow-md ${
                          active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        {active && (
                          <div className="absolute right-1 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          </div>
                        )}
                        <Icon className={`mx-auto h-5 w-5 mb-1 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={2} />
                        <p className="text-[11px] font-semibold leading-tight">{f.label}</p>
                        <p className="text-[9px] text-muted-foreground">{f.ratio} · {f.hint}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Generating */}
          {step === 3 && (
            <div className="py-4 space-y-4 animate-fade-in">
              <div className="relative mx-auto w-48 h-48">
                {sourceImage && (
                  <img src={sourceImage} alt="Source" className="w-full h-full object-contain rounded-2xl" />
                )}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(var(--primary))] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
                <div className="absolute -inset-2 pointer-events-none">
                  {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c, i) => (
                    <div key={i} className={`absolute ${c} border-primary w-5 h-5 rounded-sm animate-pulse`} />
                  ))}
                </div>
                <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-primary animate-pulse" />
                <Sparkles className="absolute -bottom-2 -left-2 h-4 w-4 text-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
              </div>
              <div className="space-y-2 text-center max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm font-semibold">Generating: <span className="text-primary">{generatingLabel || "..."}</span></p>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-[11px] text-muted-foreground">{progress}% — crafting {totalShots} studio-quality shots</p>
              </div>
              <style>{`@keyframes scan { 0%,100% { top: 0%; } 50% { top: 100%; } }`}</style>
            </div>
          )}

          {/* STEP 4: Results */}
          {step === 4 && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="text-base font-bold">Your shots are ready 🎉</h2>
                  <p className="text-xs text-muted-foreground">
                    {generatedImages.filter((i) => i.selected).length} of {generatedImages.length} selected
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-1" /> New
                  </Button>
                  <Button size="sm" onClick={handleDownloadSelected} disabled={!generatedImages.some((i) => i.selected)}>
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {generatedImages.map((img, i) => (
                  <div key={i} onClick={() => toggleImageSelection(i)}
                    className={`relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.03] animate-scale-in ${
                      img.selected ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60"
                    }`}
                    style={{ animationDelay: `${i * 60}ms` }}>
                    <img src={img.url} alt={img.label} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="View larger"
                    >
                      <span className="rounded-full bg-background/90 backdrop-blur p-2 shadow-lg">
                        <Eye className="h-4 w-4" />
                      </span>
                    </button>
                    <Badge variant="secondary" className="absolute bottom-1 left-1 text-[9px] px-1.5 py-0">{img.label}</Badge>
                    <div className={`absolute top-1 right-1 h-5 w-5 rounded-full flex items-center justify-center ${img.selected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {img.selected ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    </div>
                  </div>
                ))}
              </div>
              {lightboxIndex !== null && generatedImages[lightboxIndex] && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
                  onClick={() => setLightboxIndex(null)}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
                    className="absolute top-4 right-4 h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 text-white flex items-center justify-center transition"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((idx) => idx === null ? null : (idx - 1 + generatedImages.length) % generatedImages.length); }}
                    className="absolute left-4 h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 text-white flex items-center justify-center transition"
                    aria-label="Previous"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex((idx) => idx === null ? null : (idx + 1) % generatedImages.length); }}
                    className="absolute right-4 h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 text-white flex items-center justify-center transition"
                    aria-label="Next"
                  >
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <img
                      src={generatedImages[lightboxIndex].url}
                      alt={generatedImages[lightboxIndex].label}
                      className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3 text-white">
                      <Badge variant="secondary">{generatedImages[lightboxIndex].label}</Badge>
                      <a
                        href={generatedImages[lightboxIndex].url}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-sm rounded-md bg-primary text-primary-foreground px-3 py-1.5 hover:opacity-90"
                      >
                        <Download className="h-4 w-4" /> Download
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Wizard footer nav — clean inline layout, mobile-friendly */}
        {step < 3 && (
          <div className="border-t bg-muted/30 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="h-9 px-2.5 sm:px-3 shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>

            <div className="flex items-center gap-1.5 shrink-0">
              {STEPS.map((s) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    step === s.id ? "w-5 sm:w-6 bg-primary" : step > s.id ? "w-2.5 sm:w-3 bg-primary/60" : "w-2.5 sm:w-3 bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            {step === 2 ? (
              <Button
                onClick={handleGenerate}
                disabled={!canNext || isGenerating || totalShots > balance}
                className="gradient-primary h-9 px-3 sm:px-4 shrink-0"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-1 sm:mr-1.5" />
                <span className="text-xs sm:text-sm">
                  {totalShots > balance ? `Need ${totalShots} credits` : `Generate ${totalShots}`}
                </span>
              </Button>
            ) : (
              <Button
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={!canNext}
                size="sm"
                className="h-9 px-3 sm:px-4 shrink-0"
              >
                <span className="text-xs sm:text-sm">Next</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
