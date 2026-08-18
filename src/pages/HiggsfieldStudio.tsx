import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Coins,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic2,
  Play,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHiggsfield } from "@/hooks/useHiggsfield";
import { useToast } from "@/hooks/use-toast";
import { PaywallModal } from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { ProjectPromptButton } from "@/components/ProjectPromptButton";
import {
  getProductMotionCreditCost,
  getProductVisualCreditCost,
  getVoiceoverCreditCost,
  type ClipMotionResolution,
} from "@/lib/clipmotionEconomics";

const IMAGE_ENGINES = [
  { id: "/higgsfield-ai/soul/standard", label: "Soul", description: "Product-focused visual generation" },
  { id: "/reve/text-to-image", label: "Reve", description: "Versatile creative exploration" },
];

const VIDEO_ENGINES = [
  { id: "/higgsfield-ai/dop/standard", label: "DoP", description: "Cinematic product motion" },
  { id: "/bytedance/seedance/v1/pro/image-to-video", label: "Seedance Pro", description: "Expressive image animation" },
  { id: "/kling-video/v2.1/pro/image-to-video", label: "Kling v2.1 Pro", description: "Alternative motion engine" },
];

const MOTION_RECIPES = [
  {
    id: "product-reveal",
    title: "Product Reveal",
    description: "Clean premium reveal for a product page or ad.",
    prompt: "Premium product reveal. Preserve the exact product identity and geometry. Smooth controlled camera push-in, subtle parallax, realistic lighting, restrained motion, no text overlays, no object morphing.",
  },
  {
    id: "luxury-orbit",
    title: "Luxury Orbit",
    description: "Slow high-end camera movement around the product.",
    prompt: "Luxury commercial product shot. Preserve product identity. Slow elegant orbital camera movement, premium studio lighting, subtle reflections, polished advertising aesthetic, stable geometry, no text.",
  },
  {
    id: "social-hook",
    title: "Social Hook",
    description: "Faster movement designed for Reels and TikTok.",
    prompt: "Short-form social product ad. Preserve the product. Strong visual hook in the opening moment, energetic but controlled camera movement, crisp commercial lighting, modern Reels and TikTok pacing, no generated text.",
  },
  {
    id: "macro-detail",
    title: "Macro Detail",
    description: "Close-up movement for jewelry, beauty and details.",
    prompt: "Macro commercial product detail. Preserve materials, logo placement and geometry. Slow macro camera slide, shallow depth of field, realistic highlights, premium detail photography, subtle motion only.",
  },
];

const VISUAL_RECIPES = [
  {
    id: "studio",
    title: "Studio Shot",
    description: "Clean catalog-ready product concept.",
    prompt: "Premium studio product photography, clean seamless background, realistic softbox lighting, accurate materials, commercial e-commerce composition, no text, no watermark.",
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    description: "Place the product in an aspirational environment.",
    prompt: "Aspirational lifestyle product photography, natural believable environment, premium editorial lighting, product remains the hero, realistic scale and materials, commercial advertising composition, no text.",
  },
  {
    id: "luxury-ad",
    title: "Luxury Ad",
    description: "High-end campaign visual direction.",
    prompt: "Luxury advertising product image, art-directed set design, dramatic but realistic light, premium reflections and materials, elegant negative space, high-end campaign aesthetic, no text.",
  },
  {
    id: "social",
    title: "Social Creative",
    description: "Bold visual made for vertical social feeds.",
    prompt: "Scroll-stopping social product creative, bold modern set, clean product focus, vibrant commercial lighting, strong composition for mobile feeds, realistic product rendering, no generated text.",
  },
];

const VOICES = [
  { id: "aura-2-asteria-en", label: "Asteria · English", note: "Confident ad voice" },
  { id: "aura-2-atlas-en", label: "Atlas · English", note: "Strong commercial voice" },
  { id: "aura-2-odysseus-en", label: "Odysseus · English", note: "Advertising voice" },
  { id: "aura-2-thalia-en", label: "Thalia · English", note: "Warm natural voice" },
  { id: "aura-2-agathe-fr", label: "Agathe · Français", note: "French female voice" },
  { id: "aura-2-hector-fr", label: "Hector · Français", note: "French male voice" },
  { id: "aura-2-celeste-es", label: "Celeste · Español", note: "Spanish female voice" },
  { id: "aura-2-nestor-es", label: "Nestor · Español", note: "Spanish male voice" },
];

const ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const RESOLUTIONS: ClipMotionResolution[] = ["720p", "1080p"];
const DURATIONS = [3, 5, 8, 10];

type StudioTab = "product-motion" | "product-visuals" | "voiceover";
type LegacyTab = StudioTab | "text-to-image" | "image-to-video";

interface Props {
  defaultTab?: LegacyTab;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
}

function normalizeTab(tab: LegacyTab): StudioTab {
  if (tab === "text-to-image") return "product-visuals";
  if (tab === "image-to-video") return "product-motion";
  return tab;
}

async function functionErrorMessage(error: unknown) {
  const candidate = error as { context?: Response; message?: string };
  try {
    const body = await candidate.context?.clone().json();
    if (body?.error) {
      return body.required_credits ? `${body.error} — ${body.required_credits} credits required` : String(body.error);
    }
  } catch {
    // ignore body parsing errors
  }
  return candidate?.message || "Request failed";
}

const HiggsfieldStudio = ({ defaultTab = "product-motion" }: Props) => {
  const [tab, setTab] = useState<StudioTab>(normalizeTab(defaultTab));
  const { generate, loading, error } = useHiggsfield();
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [motionRecipe, setMotionRecipe] = useState(MOTION_RECIPES[0].id);
  const [motionDirection, setMotionDirection] = useState("");
  const [videoEngine, setVideoEngine] = useState(VIDEO_ENGINES[0].id);
  const [duration, setDuration] = useState(5);
  const [motionStatus, setMotionStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [visualRecipe, setVisualRecipe] = useState(VISUAL_RECIPES[0].id);
  const [visualDirection, setVisualDirection] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [imageEngine, setImageEngine] = useState(IMAGE_ENGINES[0].id);
  const [aspect, setAspect] = useState("1:1");
  const [resolution, setResolution] = useState<ClipMotionResolution>("720p");
  const [visualStatus, setVisualStatus] = useState("");
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);

  const [voiceText, setVoiceText] = useState("");
  const [voice, setVoice] = useState(VOICES[0].id);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const selectedMotionRecipe = useMemo(
    () => MOTION_RECIPES.find((recipe) => recipe.id === motionRecipe) ?? MOTION_RECIPES[0],
    [motionRecipe],
  );
  const selectedVisualRecipe = useMemo(
    () => VISUAL_RECIPES.find((recipe) => recipe.id === visualRecipe) ?? VISUAL_RECIPES[0],
    [visualRecipe],
  );

  const motionCredits = getProductMotionCreditCost(duration, "720p");
  const visualCredits = getProductVisualCreditCost(resolution);
  const voiceCredits = getVoiceoverCreditCost(voiceText.trim().length);

  const ensureSubscribed = () => {
    if (subscription.isSubscribed) return true;
    setShowPaywall(true);
    return false;
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `higgsfield/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("media").getPublicUrl(data.path);
      setImageUrl(publicData.publicUrl);
      setUploadedFileName(file.name);
      toast({ title: "Product image ready" });
    } catch (caught) {
      toast({ title: "Upload failed", description: (caught as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUrl("");
    setUploadedFileName(null);
  };

  const handleGenerateMotion = async () => {
    if (!imageUrl) {
      toast({ title: "Upload a product image first", variant: "destructive" });
      return;
    }
    if (!ensureSubscribed()) return;

    const prompt = [selectedMotionRecipe.prompt, motionDirection.trim()].filter(Boolean).join(" ");
    try {
      const result = await generate({
        endpoint: videoEngine,
        payload: {
          prompt,
          duration,
          image_url: imageUrl,
        },
        onProgress: setMotionStatus,
        timeoutMs: 600_000,
        save: { type: "video", prompt, model: videoEngine, duration },
      });
      if (result.video?.url) {
        setVideoUrl(result.video.url);
        toast({ title: "Motion clip ready", description: `${result.credits_charged ?? motionCredits} credits used` });
      }
    } catch (caught) {
      toast({ title: "Motion generation failed", description: (caught as Error).message, variant: "destructive" });
    }
  };

  const handleGenerateVisual = async () => {
    if (!ensureSubscribed()) return;
    const prompt = [selectedVisualRecipe.prompt, visualDirection.trim()].filter(Boolean).join(" ");

    try {
      const result = await generate({
        endpoint: imageEngine,
        payload: {
          prompt,
          negative_prompt: negativePrompt.trim() || undefined,
          aspect_ratio: aspect,
          resolution,
        },
        onProgress: setVisualStatus,
        save: { type: "image", prompt, model: imageEngine },
      });
      const generatedUrl = result.images?.[0]?.url;
      if (generatedUrl) {
        setImageHistory((history) => [
          { id: result.request_id ?? crypto.randomUUID(), url: generatedUrl, prompt },
          ...history,
        ].slice(0, 12));
        toast({ title: "Product visual ready", description: `${result.credits_charged ?? visualCredits} credits used` });
      }
    } catch (caught) {
      toast({ title: "Visual generation failed", description: (caught as Error).message, variant: "destructive" });
    }
  };

  const handleGenerateVoice = async () => {
    const text = voiceText.trim();
    if (!text) {
      toast({ title: "Write a voiceover script first", variant: "destructive" });
      return;
    }
    if (!ensureSubscribed()) return;

    setVoiceLoading(true);
    try {
      const response = await supabase.functions.invoke("clipmotion-voice", {
        body: { text, voice },
      });
      if (response.error) throw new Error(await functionErrorMessage(response.error));
      if (!response.data?.audio_url) throw new Error("Voice generation returned no audio file");

      setAudioUrl(response.data.audio_url);
      window.dispatchEvent(new CustomEvent("clipmotion:credits-changed"));
      toast({ title: "Voiceover ready", description: `${response.data.credits_charged ?? voiceCredits} credits used` });
    } catch (caught) {
      toast({ title: "Voice generation failed", description: (caught as Error).message, variant: "destructive" });
    } finally {
      setVoiceLoading(false);
    }
  };

  const CreditQuote = ({ credits, label }: { credits: number; label: string }) => (
    <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Coins className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-semibold text-primary">{credits} credits</span>
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Create with ClipMotion
            </div>
            <h1 className="font-display text-3xl font-bold md:text-4xl">Make your product move.</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Create product motion, campaign visuals and natural voiceovers without choosing an AI model first.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Motion & visuals powered by Higgsfield · Voice by Deepgram</p>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as StudioTab)}>
          <TabsList className="grid h-auto w-full grid-cols-3 p-1 sm:w-fit">
            <TabsTrigger value="product-motion" className="gap-2 py-2.5">
              <Film className="h-4 w-4" /> <span className="hidden sm:inline">Product </span>Motion
            </TabsTrigger>
            <TabsTrigger value="product-visuals" className="gap-2 py-2.5">
              <ImageIcon className="h-4 w-4" /> Visuals
            </TabsTrigger>
            <TabsTrigger value="voiceover" className="gap-2 py-2.5">
              <Mic2 className="h-4 w-4" /> Voice
            </TabsTrigger>
          </TabsList>

          <TabsContent value="product-motion" className="pt-5">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card>
                <CardContent className="space-y-6 p-5 md:p-7">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">1. Add your product</p>
                        <p className="text-xs text-muted-foreground">A clean product photo gives the most stable result.</p>
                      </div>
                    </div>

                    {imageUrl ? (
                      <div className="grid gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:grid-cols-[120px_1fr]">
                        <img src={imageUrl} alt="Product source" className="h-28 w-full rounded-xl object-contain bg-background" />
                        <div className="flex min-w-0 items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{uploadedFileName || "Product image linked"}</p>
                            <p className="text-xs text-muted-foreground">This image will anchor the motion.</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={clearImage} aria-label="Remove product image">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/5">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => event.target.files?.[0] && handleUpload(event.target.files[0])}
                          />
                          {uploading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-primary" />}
                          <p className="mt-3 text-sm font-medium">Upload product image</p>
                          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or WEBP</p>
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">or</span>
                          <Input placeholder="Paste a public image URL" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold">2. Choose the motion</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {MOTION_RECIPES.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() => setMotionRecipe(recipe.id)}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            motionRecipe === recipe.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          <p className="font-medium">{recipe.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{recipe.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Optional creative direction</Label>
                    <div className="relative mt-2">
                      <Textarea
                        value={motionDirection}
                        onChange={(event) => setMotionDirection(event.target.value)}
                        placeholder="Example: warm sunset light, slow push-in, keep the logo perfectly readable…"
                        rows={3}
                        className="pr-12"
                      />
                      <div className="absolute right-1 top-1">
                        <ProjectPromptButton mode="motion" onPromptGenerated={setMotionDirection} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Clip duration</Label>
                      <Select value={String(duration)} onValueChange={(value) => setDuration(Number(value))}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DURATIONS.map((seconds) => <SelectItem key={seconds} value={String(seconds)}>{seconds} seconds</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <details className="rounded-xl border border-border p-3">
                      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                        <SlidersHorizontal className="h-4 w-4" /> Advanced engine
                      </summary>
                      <div className="mt-3">
                        <Select value={videoEngine} onValueChange={setVideoEngine}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {VIDEO_ENGINES.map((engine) => (
                              <SelectItem key={engine.id} value={engine.id}>{engine.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="mt-2 text-[11px] text-muted-foreground">ClipMotion defaults to DoP. Switch only when you want to compare engines.</p>
                      </div>
                    </details>
                  </div>

                  <CreditQuote credits={motionCredits} label={`${duration}s product motion`} />

                  <Button size="lg" className="w-full gap-2" onClick={handleGenerateMotion} disabled={loading || uploading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Film className="h-4 w-4" />}
                    {loading ? (motionStatus || "Creating motion…") : `Create Motion · ${motionCredits} credits`}
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
              </Card>

              <Card className="h-fit lg:sticky lg:top-20">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Motion preview</h3>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Latest</span>
                  </div>
                  {videoUrl ? (
                    <div className="mt-4 space-y-3">
                      <video src={videoUrl} controls playsInline className="w-full rounded-2xl bg-black" />
                      <Button asChild variant="outline" className="w-full gap-2">
                        <a href={videoUrl} target="_blank" rel="noreferrer" download>
                          <Download className="h-4 w-4" /> Download motion clip
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                      <Play className="h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium">Your product motion appears here</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Generate, review the take, retry if needed, then download the strongest clip.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="product-visuals" className="pt-5">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card>
                <CardContent className="space-y-6 p-5 md:p-7">
                  <div>
                    <p className="text-sm font-semibold">Choose a visual direction</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {VISUAL_RECIPES.map((recipe) => (
                        <button
                          key={recipe.id}
                          type="button"
                          onClick={() => setVisualRecipe(recipe.id)}
                          className={`rounded-2xl border p-4 text-left transition-all ${
                            visualRecipe === recipe.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                          }`}
                        >
                          <p className="font-medium">{recipe.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{recipe.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Product / campaign details</Label>
                    <div className="relative mt-2">
                      <Textarea
                        value={visualDirection}
                        onChange={(event) => setVisualDirection(event.target.value)}
                        placeholder="Describe the product, material, desired background and campaign mood…"
                        rows={4}
                        className="pr-12"
                      />
                      <div className="absolute right-1 top-1">
                        <ProjectPromptButton mode="image" onPromptGenerated={setVisualDirection} />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Format</Label>
                      <Select value={aspect} onValueChange={setAspect}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASPECTS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Resolution</Label>
                      <Select value={resolution} onValueChange={(value) => setResolution(value as ClipMotionResolution)}>
                        <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESOLUTIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <details className="rounded-xl border border-border p-3">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium">
                      <SlidersHorizontal className="h-4 w-4" /> Advanced controls
                    </summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Engine</Label>
                        <Select value={imageEngine} onValueChange={setImageEngine}>
                          <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {IMAGE_ENGINES.map((engine) => <SelectItem key={engine.id} value={engine.id}>{engine.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Negative prompt</Label>
                        <Input className="mt-2" value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} placeholder="watermark, blurry…" />
                      </div>
                    </div>
                  </details>

                  <CreditQuote credits={visualCredits} label={`${resolution} product visual`} />
                  <Button size="lg" className="w-full gap-2" onClick={handleGenerateVisual} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {loading ? (visualStatus || "Creating visual…") : `Create Visual · ${visualCredits} credits`}
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
              </Card>

              <Card className="h-fit lg:sticky lg:top-20">
                <CardContent className="p-5">
                  <h3 className="font-semibold">Latest visual</h3>
                  {imageHistory[0] ? (
                    <div className="mt-4 space-y-3">
                      <img src={imageHistory[0].url} alt={imageHistory[0].prompt} className="w-full rounded-2xl" />
                      <Button asChild variant="outline" className="w-full gap-2">
                        <a href={imageHistory[0].url} target="_blank" rel="noreferrer" download>
                          <Download className="h-4 w-4" /> Download visual
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium">Your visual appears here</p>
                      <p className="mt-1 text-xs text-muted-foreground">Choose a direction and generate a campaign concept.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="voiceover" className="pt-5">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card>
                <CardContent className="space-y-6 p-5 md:p-7">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <Label>Voiceover script</Label>
                      <span className="text-xs text-muted-foreground">{voiceText.length.toLocaleString()} / 12,000 characters</span>
                    </div>
                    <Textarea
                      className="mt-2"
                      value={voiceText}
                      onChange={(event) => setVoiceText(event.target.value.slice(0, 12000))}
                      placeholder="Meet the product designed to make every day easier…"
                      rows={8}
                    />
                  </div>

                  <div>
                    <Label>Voice</Label>
                    <Select value={voice} onValueChange={setVoice}>
                      <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {VOICES.map((item) => (
                          <SelectItem key={item.id} value={item.id}>{item.label} — {item.note}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/20 p-4 text-sm">
                    <p className="font-medium">Designed for product ads</p>
                    <p className="mt-1 leading-6 text-muted-foreground">
                      Generate a natural narration, download the MP3 and pair it with your strongest ClipMotion motion take. French, English and Spanish voices are available here first.
                    </p>
                  </div>

                  <CreditQuote credits={voiceCredits} label="Deepgram Aura-2 voiceover" />
                  <Button size="lg" className="w-full gap-2" onClick={handleGenerateVoice} disabled={voiceLoading}>
                    {voiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}
                    {voiceLoading ? "Creating voiceover…" : `Create Voiceover · ${voiceCredits} credit${voiceCredits > 1 ? "s" : ""}`}
                  </Button>
                </CardContent>
              </Card>

              <Card className="h-fit lg:sticky lg:top-20">
                <CardContent className="p-5">
                  <h3 className="font-semibold">Voice preview</h3>
                  {audioUrl ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                        <audio src={audioUrl} controls className="w-full" />
                      </div>
                      <Button asChild variant="outline" className="w-full gap-2">
                        <a href={audioUrl} target="_blank" rel="noreferrer" download>
                          <Download className="h-4 w-4" /> Download MP3
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-4 flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 p-6 text-center">
                      <Mic2 className="h-8 w-8 text-muted-foreground" />
                      <p className="mt-3 text-sm font-medium">Your voiceover appears here</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">Write a short ad script and choose a voice.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="clipmotion"
        requiredPlan="starter"
      />
    </>
  );
};

export default HiggsfieldStudio;
