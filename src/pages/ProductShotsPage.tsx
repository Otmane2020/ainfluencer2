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
  Palette, ArrowRight, ArrowLeft, Wand2, Aperture,
} from "lucide-react";
import { toast } from "sonner";

const SHOT_TYPES = [
  { id: "front", label: "Front View", icon: Camera, description: "Direct front-facing shot", gradient: "from-blue-500 to-cyan-500" },
  { id: "angle45", label: "45° Angle", icon: Move3d, description: "Three-quarter angle view", gradient: "from-violet-500 to-purple-500" },
  { id: "profile", label: "Side Profile", icon: ArrowUpFromLine, description: "Side view of product", gradient: "from-pink-500 to-rose-500" },
  { id: "back", label: "Back View", icon: RotateCcw, description: "Rear view of product", gradient: "from-orange-500 to-amber-500" },
  { id: "top", label: "Top View", icon: Eye, description: "Bird's eye view", gradient: "from-emerald-500 to-teal-500" },
  { id: "low_angle", label: "Low Angle", icon: ArrowDownFromLine, description: "Dramatic upward angle", gradient: "from-indigo-500 to-blue-600" },
  { id: "zoom_detail", label: "Detail Close-up", icon: Maximize2, description: "Macro detail shot", gradient: "from-fuchsia-500 to-pink-600" },
];

interface GeneratedImage { type: string; label: string; url: string; selected: boolean; }

const STEPS = [
  { id: 1, label: "Upload", icon: Upload },
  { id: 2, label: "Choose shots", icon: Aperture },
  { id: 3, label: "Generate", icon: Wand2 },
  { id: 4, label: "Download", icon: Download },
];

export default function ProductShotsPage() {
  const [step, setStep] = useState(1);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [productTitle, setProductTitle] = useState("");
  const [selectedShotTypes, setSelectedShotTypes] = useState<Set<string>>(
    new Set(["front", "angle45", "profile", "zoom_detail"])
  );
  const [includeLifestyle, setIncludeLifestyle] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatingLabel, setGeneratingLabel] = useState("");
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleShotType = (id: string) => {
    const s = new Set(selectedShotTypes);
    if (s.has(id)) { if (s.size > 1) s.delete(id); else return toast.warning("Select at least one shot type"); }
    else { if (s.size < 7) s.add(id); else return toast.warning("Maximum 7 shot types"); }
    setSelectedShotTypes(s);
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
        body: { sourceImageUrl: pub.publicUrl, shotTypes: Array.from(selectedShotTypes), productTitle: productTitle || "Product", includeLifestyle },
      });
      clearInterval(interval);
      if (error) throw error;
      if (data?.images?.length) {
        setGeneratedImages(data.images.map((img: any) => ({ type: img.type, label: img.label, url: img.url, selected: true })));
        setProgress(100);
        toast.success(`${data.images.length} product shots generated!`, { id: toastId });
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
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="h-3 w-3" /> AI Product Shot Studio
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          1 photo → <span className="text-gradient">10 pro shots</span>
        </h1>
        <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
          Upload your product, pick the angles, let AI do the studio work.
        </p>
      </div>

      {/* Stepper */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center relative">
                {i < STEPS.length - 1 && (
                  <div className="absolute top-5 left-1/2 w-full h-0.5 bg-border -z-10">
                    <div className={`h-full bg-gradient-to-r from-primary to-primary/50 transition-all duration-500 ${done ? "w-full" : "w-0"}`} />
                  </div>
                )}
                <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                  active ? "border-primary bg-primary text-primary-foreground scale-110 shadow-glow" :
                  done ? "border-primary bg-primary text-primary-foreground" :
                  "border-border bg-card text-muted-foreground"
                }`}>
                  {done ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`mt-2 text-xs font-medium hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <Card className="overflow-hidden border-2">
        <CardContent className="p-6 md:p-8">
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center mb-2">
                <h2 className="text-xl font-bold">Upload your product photo</h2>
                <p className="text-sm text-muted-foreground">Clear photo, white background recommended.</p>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all hover:border-primary/60 hover:bg-primary/5 ${sourceImage ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                {sourceImage ? (
                  <div className="relative animate-scale-in">
                    <img src={sourceImage} alt="Source" className="max-h-72 mx-auto rounded-xl object-contain" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                      <ImageIcon className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-medium">Click to upload or drag & drop</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                  </div>
                )}
              </div>
              {sourceImage && (
                <div className="space-y-2 animate-fade-in">
                  <Label>Product name (optional)</Label>
                  <Input value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="e.g., Modern Leather Chair" />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Shot types */}
          {step === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="text-xl font-bold">Pick your shots</h2>
                <p className="text-sm text-muted-foreground">{totalShots} shot{totalShots > 1 ? "s" : ""} will be generated</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SHOT_TYPES.map((type) => {
                  const Icon = type.icon;
                  const active = selectedShotTypes.has(type.id);
                  return (
                    <button key={type.id} type="button" onClick={() => toggleShotType(type.id)}
                      className={`group relative overflow-hidden rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.03] hover:shadow-md ${
                        active ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:border-primary/40"
                      }`}>
                      {active && (
                        <div className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow animate-scale-in">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </div>
                      )}
                      <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${type.gradient} shadow transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                        <Icon className="h-5 w-5 text-white" strokeWidth={2.5} />
                      </div>
                      <p className="text-sm font-semibold leading-tight">{type.label}</p>
                      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground line-clamp-2">{type.description}</p>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setIncludeLifestyle(!includeLifestyle)}
                className={`group relative w-full overflow-hidden rounded-xl border-2 p-4 text-left transition-all hover:shadow-md ${
                  includeLifestyle ? "border-primary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent" : "border-dashed border-border hover:border-primary/40"
                }`}>
                {includeLifestyle && (
                  <div className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 shadow-md transition-transform group-hover:scale-110">
                    <Palette className="h-5 w-5 text-white" strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">Lifestyle Scene</p>
                      <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-amber-500/15 text-amber-600 border-0">PREMIUM</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Product in a realistic, on-brand environment</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* STEP 3: Generating */}
          {step === 3 && (
            <div className="py-10 space-y-8 animate-fade-in">
              <div className="relative mx-auto w-64 h-64">
                {sourceImage && (
                  <img src={sourceImage} alt="Source" className="w-full h-full object-contain rounded-2xl" />
                )}
                {/* Scanning beam */}
                <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_hsl(var(--primary))] animate-[scan_2s_ease-in-out_infinite]" />
                </div>
                {/* Corner brackets */}
                <div className="absolute -inset-2 pointer-events-none">
                  {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c, i) => (
                    <div key={i} className={`absolute ${c} border-primary w-6 h-6 rounded-sm animate-pulse`} />
                  ))}
                </div>
                {/* Sparkles */}
                <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-primary animate-pulse" />
                <Sparkles className="absolute -bottom-2 -left-2 h-5 w-5 text-primary animate-pulse" style={{ animationDelay: "0.5s" }} />
              </div>
              <div className="space-y-3 text-center max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="font-semibold">Generating: <span className="text-primary">{generatingLabel || "..."}</span></p>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">{progress}% — AI is crafting {totalShots} studio-quality shots</p>
              </div>
              <style>{`@keyframes scan { 0%,100% { top: 0%; } 50% { top: 100%; } }`}</style>
            </div>
          )}

          {/* STEP 4: Results */}
          {step === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold">Your shots are ready 🎉</h2>
                  <p className="text-sm text-muted-foreground">
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
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {generatedImages.map((img, i) => (
                  <div key={i} onClick={() => toggleImageSelection(i)}
                    className={`relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all hover:scale-[1.02] animate-scale-in ${
                      img.selected ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-60"
                    }`}
                    style={{ animationDelay: `${i * 80}ms` }}>
                    <img src={img.url} alt={img.label} className="w-full aspect-square object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Badge variant="secondary" className="absolute bottom-2 left-2 text-xs">{img.label}</Badge>
                    <div className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center ${img.selected ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {img.selected ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Spacer so sticky bar doesn't cover content */}
      {step < 3 && <div className="h-24" />}

      {/* Sticky wizard nav — sits above the support chat widget */}
      {step < 3 && (
        <div className="fixed inset-x-0 bottom-20 z-40 px-4 pointer-events-none">
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <div className="flex items-center justify-between gap-3 rounded-2xl border bg-background/90 backdrop-blur-md shadow-lg p-3">
              <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <p className="hidden sm:block text-xs text-muted-foreground">
                Step {step} of {STEPS.length}
              </p>
              {step === 2 ? (
                <Button onClick={handleGenerate} disabled={!canNext || isGenerating} className="gradient-primary" size="lg">
                  <Sparkles className="h-4 w-4 mr-2" /> Generate {totalShots} shots
                </Button>
              ) : (
                <Button onClick={() => setStep((s) => Math.min(4, s + 1))} disabled={!canNext} size="lg">
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
