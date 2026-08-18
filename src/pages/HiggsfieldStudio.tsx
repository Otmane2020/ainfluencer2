import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Coins,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Mic2,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHiggsfield } from "@/hooks/useHiggsfield";
import { useToast } from "@/hooks/use-toast";
import { PaywallModal } from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";
import { useCredits } from "@/hooks/useCredits";
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

const DOP_TURBO_ENDPOINT = "/v1/image2video/dop";
const DOP_TURBO_MODEL = "dop-turbo";
const DOP_TURBO_DURATION = 5;

const VIDEO_ENGINES = [
  { id: DOP_TURBO_ENDPOINT, label: "DoP Turbo", description: "Official product motion — highest product fidelity" },
  { id: "/bytedance/seedance/v1/pro/image-to-video", label: "Seedance Pro", description: "Expressive image animation" },
  { id: "/kling-video/v2.1/pro/image-to-video", label: "Kling v2.1 Pro", description: "Alternative motion engine" },
];

const MOTION_RECIPES = [
  {
    id: "product-reveal",
    title: "Product Reveal",
    eyebrow: "Best seller",
    description: "Premium controlled reveal for an ad or product page.",
    prompt: "Camera move only: smooth, controlled slow push-in toward the product with subtle parallax. Keep the existing set, lighting and styling exactly as in the source image. No scene change, no new objects, no text overlays.",
  },
  {
    id: "luxury-orbit",
    title: "Luxury Orbit",
    eyebrow: "Premium",
    description: "Slow high-end camera movement around the product.",
    prompt: "Camera move only: slow, elegant partial orbit around the product with a steady horizon. Keep the existing set, lighting and styling exactly as in the source image. No scene change, no new objects, no text overlays.",
  },
  {
    id: "social-hook",
    title: "Social Hook",
    eyebrow: "Reels / TikTok",
    description: "Faster movement with a stronger opening beat.",
    prompt: "Camera move only: snappy opening beat then a controlled push-in with a slight lateral drift, modern short-form pacing. Keep the existing set, lighting and styling exactly as in the source image. No scene change, no new objects, no text overlays.",
  },
  {
    id: "macro-detail",
    title: "Macro Detail",
    eyebrow: "Beauty / jewelry",
    description: "Close-up movement for materials and product details.",
    prompt: "Camera move only: slow macro slide across the product surface with shallow depth of field. Keep the existing set, lighting and styling exactly as in the source image. No scene change, no new objects, no text overlays.",
  },
];

const PRODUCT_LOCK_BLOCK = [
  "PRODUCT FIDELITY — STRICT:",
  "The uploaded source image is the absolute ground truth.",
  "Keep the exact product identity, silhouette, dimensions and proportions, geometry, colors, textures and materials, seams, buttons, hardware, labels, printed text, logo placement, packaging and the exact number of parts.",
  "Do not redesign, morph, warp, melt, stretch, recolor, retexture, replace, add or remove parts, invent details, change branding, or change any readable text.",
  "Only camera motion, subtle parallax, reflection and lighting changes, and physically plausible micro-motion around the product are allowed unless the user instruction explicitly asks otherwise.",
  "The FIRST FRAME must visually match the uploaded source image.",
].join(" ");

export function buildMotionPrompt(options: {
  userDirection: string;
  recipePrompt: string;
  productLock: boolean;
}) {
  const parts: string[] = [];
  const direction = options.userDirection.trim();
  if (direction) parts.push(`USER INSTRUCTION — HIGHEST PRIORITY: ${direction}`);
  if (options.productLock) parts.push(PRODUCT_LOCK_BLOCK);
  if (options.recipePrompt) parts.push(`SECONDARY MOTION AND STYLE GUIDANCE: ${options.recipePrompt}`);
  return parts.join("\n\n");
}

export function buildMotionPayload(options: {
  endpoint: string;
  prompt: string;
  imageUrl: string;
  duration: number;
}) {
  const image = options.imageUrl.trim();
  if (options.endpoint === DOP_TURBO_ENDPOINT) {
    return {
      model: DOP_TURBO_MODEL,
      prompt: options.prompt,
      input_images: [{ type: "image_url", image_url: image }],
    } as Record<string, unknown>;
  }
  return {
    prompt: options.prompt,
    duration: options.duration,
    image_url: image,
  } as Record<string, unknown>;
}


const VISUAL_RECIPES = [
  {
    id: "studio",
    title: "Studio Shot",
    eyebrow: "E-commerce",
    description: "Clean catalog-ready product concept.",
    prompt: "Premium studio product photography, clean seamless background, realistic softbox lighting, accurate materials, commercial e-commerce composition, no text, no watermark.",
  },
  {
    id: "lifestyle",
    title: "Lifestyle",
    eyebrow: "Campaign",
    description: "Place the product in an aspirational environment.",
    prompt: "Aspirational lifestyle product photography, natural believable environment, premium editorial lighting, product remains the hero, realistic scale and materials, commercial advertising composition, no text.",
  },
  {
    id: "luxury-ad",
    title: "Luxury Ad",
    eyebrow: "Premium",
    description: "High-end campaign visual direction.",
    prompt: "Luxury advertising product image, art-directed set design, dramatic but realistic light, premium reflections and materials, elegant negative space, high-end campaign aesthetic, no text.",
  },
  {
    id: "social",
    title: "Social Creative",
    eyebrow: "Scroll stop",
    description: "Bold visual built for mobile feeds.",
    prompt: "Scroll-stopping social product creative, bold modern set, clean product focus, vibrant commercial lighting, strong composition for mobile feeds, realistic product rendering, no generated text.",
  },
];

const VOICES = [
  { id: "aura-2-asteria-en", label: "Asteria · English", note: "Confident ad voice" },
  { id: "aura-2-atlas-en", label: "Atlas · English", note: "Strong commercial voice" },
  { id: "aura-2-thalia-en", label: "Thalia · English", note: "Warm natural voice" },
  { id: "aura-2-agathe-fr", label: "Agathe · Français", note: "French female voice" },
  { id: "aura-2-hector-fr", label: "Hector · Français", note: "French male voice" },
  { id: "aura-2-celeste-es", label: "Celeste · Español", note: "Spanish female voice" },
  { id: "aura-2-nestor-es", label: "Nestor · Español", note: "Spanish male voice" },
];

const ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const RESOLUTIONS: ClipMotionResolution[] = ["720p", "1080p"];
const DURATIONS = [3, 5, 8, 10];

type StudioTab = "product-motion" | "product-visuals";
type LegacyTab = StudioTab | "voiceover" | "text-to-image" | "image-to-video";

interface Props {
  defaultTab?: LegacyTab;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
}

function normalizeTab(tab: LegacyTab): StudioTab {
  if (tab === "product-visuals" || tab === "text-to-image") return "product-visuals";
  return "product-motion";
}

function isValidPublicUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
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
  const { balance, isLoading: creditsLoading, refresh: refreshCredits } = useCredits();
  const [showPaywall, setShowPaywall] = useState(false);

  const [imageUrl, setImageUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [motionRecipe, setMotionRecipe] = useState(MOTION_RECIPES[0].id);
  const [motionDirection, setMotionDirection] = useState("");
  const [videoEngine, setVideoEngine] = useState(VIDEO_ENGINES[0].id);
  const [duration, setDuration] = useState(DOP_TURBO_DURATION);
  const [productLock, setProductLock] = useState(true);

  const [motionStatus, setMotionStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [serverMotionCredits, setServerMotionCredits] = useState<number | null>(null);

  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voice, setVoice] = useState(VOICES[0].id);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [visualRecipe, setVisualRecipe] = useState(VISUAL_RECIPES[0].id);
  const [visualDirection, setVisualDirection] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [imageEngine, setImageEngine] = useState(IMAGE_ENGINES[0].id);
  const [aspect, setAspect] = useState("1:1");
  const [resolution, setResolution] = useState<ClipMotionResolution>("720p");
  const [visualStatus, setVisualStatus] = useState("");
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);

  const [preflightLoading, setPreflightLoading] = useState(false);
  const [preflightMessage, setPreflightMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const selectedMotionRecipe = useMemo(
    () => MOTION_RECIPES.find((recipe) => recipe.id === motionRecipe) ?? MOTION_RECIPES[0],
    [motionRecipe],
  );
  const selectedVisualRecipe = useMemo(
    () => VISUAL_RECIPES.find((recipe) => recipe.id === visualRecipe) ?? VISUAL_RECIPES[0],
    [visualRecipe],
  );

  const isDopTurbo = videoEngine === DOP_TURBO_ENDPOINT;
  const effectiveDuration = isDopTurbo ? DOP_TURBO_DURATION : duration;
  const estimatedMotionCredits = serverMotionCredits ?? getProductMotionCreditCost(effectiveDuration, "720p");

  const visualCredits = getProductVisualCreditCost(resolution);
  const voiceCredits = voiceEnabled ? getVoiceoverCreditCost(voiceText.trim().length) : 0;
  const totalMotionCredits = estimatedMotionCredits + voiceCredits;

  const motionBlocker = useMemo(() => {
    if (!subscription.isSubscribed) return "Choose an active plan to continue.";
    if (!imageUrl.trim()) return "Add a product image to continue.";
    if (!isValidPublicUrl(imageUrl.trim())) return "Check the image URL to continue.";
    if (voiceEnabled && !voiceText.trim()) return "Add a voiceover script or switch voiceover off.";
    if (!creditsLoading && balance < totalMotionCredits) return `You need ${totalMotionCredits} credits but your balance is ${balance}.`;
    return null;
  }, [subscription.isSubscribed, imageUrl, voiceEnabled, voiceText, creditsLoading, balance, totalMotionCredits]);

  const visualBlocker = useMemo(() => {
    if (!subscription.isSubscribed) return "Choose an active plan to continue.";
    if (!creditsLoading && balance < visualCredits) return `You need ${visualCredits} credits but your balance is ${balance}.`;
    return null;
  }, [subscription.isSubscribed, creditsLoading, balance, visualCredits]);

  const showBlocked = (message: string) => {
    setPreflightMessage(message);
    toast({ title: "Generation unavailable", description: message, variant: "destructive" });
  };

  const showRequirement = (message: string) => {
    setPreflightMessage(null);
    toast({ title: "Almost ready", description: message });
  };

  const assertBackendReady = async (functionName: "higgsfield-generate" | "clipmotion-voice") => {
    const response = await supabase.functions.invoke(functionName, { body: { action: "health" } });
    if (response.error) throw new Error(await functionErrorMessage(response.error));
    if (!response.data?.configured) {
      throw new Error(functionName === "clipmotion-voice" ? "Voice service is not configured." : "Motion service is not configured.");
    }
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setPreflightMessage(null);
    try {
      const path = `higgsfield/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: publicData } = supabase.storage.from("media").getPublicUrl(data.path);
      setImageUrl(publicData.publicUrl);
      setUploadedFileName(file.name);
      toast({ title: "Product image ready" });
    } catch (caught) {
      showBlocked(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUrl("");
    setUploadedFileName(null);
    setVideoUrl(null);
    setAudioUrl(null);
  };

  const preflightMotion = async () => {
    if (motionBlocker) {
      showRequirement(motionBlocker);
      return null;
    }

    setPreflightLoading(true);
    setPreflightMessage(null);
    try {
      await assertBackendReady("higgsfield-generate");
      if (voiceEnabled) await assertBackendReady("clipmotion-voice");

      const prompt = buildMotionPrompt({
        userDirection: motionDirection,
        recipePrompt: selectedMotionRecipe.prompt,
        productLock,
      });
      const payload = buildMotionPayload({
        endpoint: videoEngine,
        prompt,
        imageUrl,
        duration: effectiveDuration,
      });
      const quote = await supabase.functions.invoke("higgsfield-generate", {
        body: { action: "quote", endpoint: videoEngine, payload },
      });
      if (quote.error) throw new Error(await functionErrorMessage(quote.error));
      const exactMotionCredits = Number(quote.data?.credits || estimatedMotionCredits);
      setServerMotionCredits(exactMotionCredits);
      const required = exactMotionCredits + voiceCredits;
      if (balance < required) throw new Error(`You need ${required} credits but your balance is ${balance}.`);

      return { prompt, payload, exactMotionCredits, required };
    } catch (caught) {
      showBlocked(caught instanceof Error ? caught.message : "Preflight failed");
      return null;
    } finally {
      setPreflightLoading(false);
    }
  };

  const handleGenerateMotion = async () => {
    const ready = await preflightMotion();
    if (!ready) return;

    setVideoUrl(null);
    setAudioUrl(null);
    try {
      const result = await generate({
        endpoint: videoEngine,
        payload: ready.payload,
        onProgress: setMotionStatus,
        timeoutMs: 600_000,
        save: { type: "video", prompt: ready.prompt, model: videoEngine, duration: effectiveDuration },
      });


      if (!result.video?.url) throw new Error("Motion provider returned no video file.");
      setVideoUrl(result.video.url);
      await refreshCredits();

      if (voiceEnabled) {
        setVoiceLoading(true);
        try {
          const voiceResponse = await supabase.functions.invoke("clipmotion-voice", {
            body: {
              text: voiceText.trim(),
              voice,
              attach_to_request_id: result.request_id,
            },
          });
          if (voiceResponse.error) throw new Error(await functionErrorMessage(voiceResponse.error));
          if (!voiceResponse.data?.audio_url) throw new Error("Voice provider returned no audio file.");
          setAudioUrl(voiceResponse.data.audio_url);
          await refreshCredits();
          toast({ title: "Motion + voice ready", description: `${ready.required} credits used` });
        } catch (voiceError) {
          toast({
            title: "Motion ready — voice was not added",
            description: voiceError instanceof Error ? voiceError.message : "Voice generation failed",
            variant: "destructive",
          });
        } finally {
          setVoiceLoading(false);
        }
      } else {
        toast({ title: "Motion clip ready", description: `${result.credits_charged ?? ready.exactMotionCredits} credits used` });
      }
    } catch (caught) {
      toast({ title: "Motion generation failed", description: caught instanceof Error ? caught.message : "Generation failed", variant: "destructive" });
      await refreshCredits();
    }
  };

  const handleGenerateVisual = async () => {
    if (visualBlocker) {
      showRequirement(visualBlocker);
      return;
    }

    const prompt = [selectedVisualRecipe.prompt, visualDirection.trim()].filter(Boolean).join(" ");
    setPreflightLoading(true);
    setPreflightMessage(null);
    try {
      await assertBackendReady("higgsfield-generate");
      const quote = await supabase.functions.invoke("higgsfield-generate", {
        body: { action: "quote", endpoint: imageEngine, payload: { prompt, resolution } },
      });
      if (quote.error) throw new Error(await functionErrorMessage(quote.error));
      const exactCredits = Number(quote.data?.credits || visualCredits);
      if (balance < exactCredits) throw new Error(`You need ${exactCredits} credits but your balance is ${balance}.`);
    } catch (caught) {
      setPreflightLoading(false);
      showBlocked(caught instanceof Error ? caught.message : "Preflight failed");
      return;
    }
    setPreflightLoading(false);

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
      if (!generatedUrl) throw new Error("Image provider returned no image file.");
      setImageHistory((history) => [
        { id: result.request_id ?? crypto.randomUUID(), url: generatedUrl, prompt },
        ...history,
      ].slice(0, 12));
      await refreshCredits();
      toast({ title: "Product visual ready", description: `${result.credits_charged ?? visualCredits} credits used` });
    } catch (caught) {
      toast({ title: "Visual generation failed", description: caught instanceof Error ? caught.message : "Generation failed", variant: "destructive" });
      await refreshCredits();
    }
  };

  const playWithVoice = async () => {
    if (!videoRef.current || !audioRef.current || !audioUrl) return;
    videoRef.current.currentTime = 0;
    audioRef.current.currentTime = 0;
    videoRef.current.muted = true;
    await Promise.allSettled([videoRef.current.play(), audioRef.current.play()]);
  };

  const syncVoiceOnPlay = () => {
    if (!audioUrl || !audioRef.current || !videoRef.current) return;
    audioRef.current.currentTime = videoRef.current.currentTime;
    void audioRef.current.play();
  };

  const syncVoiceOnPause = () => {
    if (audioRef.current) audioRef.current.pause();
  };

  const StatusStrip = ({ blocker }: { blocker: string | null }) => {
    const hasTechnicalIssue = Boolean(preflightMessage);
    const needsInput = Boolean(blocker) && !hasTechnicalIssue;

    return (
      <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
        hasTechnicalIssue
          ? "border-destructive/30 bg-destructive/5"
          : "border-primary/20 bg-primary/5"
      }`}>
        {hasTechnicalIssue ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        ) : needsInput ? (
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        ) : (
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {hasTechnicalIssue ? "Generation unavailable" : needsInput ? "Almost ready" : "Ready for preflight"}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            {preflightMessage || blocker || "ClipMotion will verify backend availability and exact credits before any generation starts."}
          </p>
        </div>
      </div>
    );
  };

  const CreditQuote = ({ credits, label }: { credits: number; label: string }) => (
    <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Coins className="h-4 w-4 text-primary" />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-bold text-primary">{credits} credits</span>
    </div>
  );

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[28px] border border-primary/15 bg-gradient-to-br from-primary/15 via-background to-secondary/10 p-6 shadow-sm md:p-8"
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-secondary/15 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur">
                <Zap className="h-3.5 w-3.5" /> PRODUCT → MOTION → VOICE
              </div>
              <h1 className="mt-4 font-display text-4xl font-black tracking-tight md:text-5xl">
                Make the product <span className="text-gradient">impossible to ignore.</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
                Upload one product photo, pick the creative outcome, and generate a motion ad with an optional synced Deepgram voice track.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-background/70 p-2 backdrop-blur">
              <div className="rounded-xl px-3 py-2 text-center"><p className="text-lg font-bold">{creditsLoading ? "—" : balance}</p><p className="text-[10px] text-muted-foreground">credits</p></div>
              <div className="rounded-xl px-3 py-2 text-center"><p className="text-lg font-bold">1080p</p><p className="text-[10px] text-muted-foreground">supported</p></div>
              <div className="rounded-xl px-3 py-2 text-center"><p className="text-lg font-bold">2</p><p className="text-[10px] text-muted-foreground">core flows</p></div>
            </div>
          </div>
        </motion.section>

        <Tabs value={tab} onValueChange={(value) => { setTab(value as StudioTab); setPreflightMessage(null); }}>
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-border bg-card p-1.5 sm:w-[420px]">
            <TabsTrigger value="product-motion" className="gap-2 rounded-xl py-3 data-[state=active]:shadow-sm">
              <Film className="h-4 w-4" /> Product Motion
            </TabsTrigger>
            <TabsTrigger value="product-visuals" className="gap-2 rounded-xl py-3 data-[state=active]:shadow-sm">
              <ImageIcon className="h-4 w-4" /> Product Visuals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="product-motion" className="pt-5">
            <div className="grid gap-6 xl:grid-cols-[1fr_410px]">
              <Card className="overflow-hidden border-border/70 shadow-sm">
                <CardContent className="space-y-7 p-5 md:p-7">
                  <StatusStrip blocker={motionBlocker} />

                  <section>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground">1</div>
                      <div><p className="font-semibold">Add your product</p><p className="text-xs text-muted-foreground">A clean front or 3/4 photo gives the most stable motion.</p></div>
                    </div>
                    {imageUrl ? (
                      <div className="grid gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-3 sm:grid-cols-[150px_1fr]">
                        <img src={imageUrl} alt="Product source" className="h-36 w-full rounded-xl bg-background object-contain" />
                        <div className="flex min-w-0 items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{uploadedFileName || "Product image linked"}</p>
                            <p className="mt-1 text-xs text-muted-foreground">This image anchors geometry, materials and product identity.</p>
                          </div>
                          <Button variant="ghost" size="icon" onClick={clearImage}><X className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                        <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary/25 bg-gradient-to-br from-primary/5 to-transparent px-6 text-center transition-all hover:border-primary/50 hover:bg-primary/10">
                          <input type="file" accept="image/*" className="hidden" onChange={(event) => event.target.files?.[0] && handleUpload(event.target.files[0])} />
                          {uploading ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <Upload className="h-7 w-7 text-primary" />}
                          <p className="mt-3 text-sm font-semibold">Drop a product photo</p>
                          <p className="mt-1 text-xs text-muted-foreground">PNG, JPG or WEBP</p>
                        </label>
                        <div className="flex min-h-40 flex-col justify-center rounded-2xl border border-border bg-muted/20 p-4">
                          <Label>Or paste a public image URL</Label>
                          <Input className="mt-2" placeholder="https://..." value={imageUrl} onChange={(event) => { setImageUrl(event.target.value); setPreflightMessage(null); }} />
                        </div>
                      </div>
                    )}
                  </section>

                  <section>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground">2</div>
                      <div><p className="font-semibold">Pick the creative move</p><p className="text-xs text-muted-foreground">Choose the outcome. ClipMotion handles the underlying engine.</p></div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {MOTION_RECIPES.map((recipe) => (
                        <button key={recipe.id} type="button" onClick={() => setMotionRecipe(recipe.id)} className={`group rounded-2xl border p-4 text-left transition-all ${motionRecipe === recipe.id ? "border-primary bg-primary/7 shadow-sm" : "border-border bg-card hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm"}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{recipe.eyebrow}</span>
                          <p className="mt-1 font-semibold">{recipe.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{recipe.description}</p>
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4">
                      <div>
                        <p className="text-sm font-semibold">Product Lock</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Preserve exact shape, colors, materials, logo and packaging.</p>
                      </div>
                      <Switch checked={productLock} onCheckedChange={setProductLock} />
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <Label>Creative direction (optional)</Label>
                        <ProjectPromptButton mode="motion" imageUrl={imageUrl} onPromptGenerated={setMotionDirection} />
                      </div>
                      <Textarea value={motionDirection} onChange={(event) => setMotionDirection(event.target.value)} placeholder="Optional direction: warm sunset, slower push-in, keep the logo readable…" rows={3} />
                      <p className="mt-2 text-[11px] text-muted-foreground">Your instruction is sent first, with the highest priority.</p>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label>Clip duration</Label>
                        {isDopTurbo ? (
                          <div className="mt-2 flex h-10 items-center rounded-md border border-border bg-muted/30 px-3 text-sm text-muted-foreground">5s · fidelity optimized</div>
                        ) : (
                          <Select value={String(duration)} onValueChange={(value) => { setDuration(Number(value)); setServerMotionCredits(null); }}>
                            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                            <SelectContent>{DURATIONS.map((seconds) => <SelectItem key={seconds} value={String(seconds)}>{seconds} seconds</SelectItem>)}</SelectContent>
                          </Select>
                        )}
                      </div>

                      <details className="rounded-xl border border-border p-3">
                        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4" /> Advanced engine</summary>
                        <div className="mt-3">
                          <Select value={videoEngine} onValueChange={(value) => { setVideoEngine(value); setServerMotionCredits(null); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{VIDEO_ENGINES.map((engine) => <SelectItem key={engine.id} value={engine.id}>{engine.label}</SelectItem>)}</SelectContent>
                          </Select>
                          <p className="mt-2 text-[11px] text-muted-foreground">DoP Turbo is the default product-motion route. Seedance and Kling are alternatives.</p>
                        </div>
                      </details>
                    </div>
                  </section>

                  <section className={`rounded-2xl border p-4 transition-all ${voiceEnabled ? "border-primary/30 bg-gradient-to-br from-primary/8 to-secondary/5" : "border-border bg-muted/20"}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10"><Mic2 className="h-4 w-4 text-primary" /></div>
                        <div><p className="text-sm font-semibold">3. Add AI voice to this motion</p><p className="mt-0.5 text-xs text-muted-foreground">Deepgram voice is attached to the same video in your ClipMotion library.</p></div>
                      </div>
                      <Switch checked={voiceEnabled} onCheckedChange={(checked) => { setVoiceEnabled(checked); setPreflightMessage(null); }} />
                    </div>
                    {voiceEnabled && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 grid gap-4">
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2"><Label>Voiceover script</Label><div className="flex items-center gap-2"><span className="text-[11px] text-muted-foreground">{voiceText.length.toLocaleString()} / 12,000</span><ProjectPromptButton mode="voice" onPromptGenerated={(text) => setVoiceText(text.slice(0, 12000))} /></div></div>
                          <Textarea className="mt-2" value={voiceText} onChange={(event) => setVoiceText(event.target.value.slice(0, 12000))} placeholder="Meet the product designed to turn every scroll into attention…" rows={4} />
                        </div>

                        <div>
                          <Label>Voice</Label>
                          <Select value={voice} onValueChange={setVoice}>
                            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                            <SelectContent>{VOICES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label} — {item.note}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                      </motion.div>
                    )}
                  </section>

                  <p className="text-[11px] text-muted-foreground">For the most faithful result, use a clean product photo and keep motion subtle.</p>

                  <CreditQuote credits={totalMotionCredits} label={voiceEnabled ? `${effectiveDuration}s motion + voice` : `${effectiveDuration}s product motion`} />


                  {!subscription.isSubscribed ? (
                    <Button size="lg" className="w-full gap-2" onClick={() => setShowPaywall(true)}>Choose a plan <ArrowRight className="h-4 w-4" /></Button>
                  ) : (
                    <Button size="lg" className="w-full gap-2 shadow-sm" onClick={handleGenerateMotion} disabled={Boolean(motionBlocker) || loading || uploading || voiceLoading || preflightLoading || creditsLoading}>
                      {loading || voiceLoading || preflightLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {preflightLoading ? "Checking everything…" : loading ? (motionStatus || "Creating motion…") : voiceLoading ? "Adding voice…" : `Create ${voiceEnabled ? "Motion + Voice" : "Motion"} · ${totalMotionCredits} credits`}
                    </Button>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
              </Card>

              <Card className="h-fit overflow-hidden border-border/70 shadow-sm xl:sticky xl:top-20">
                <div className="border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 px-5 py-4">
                  <div className="flex items-center justify-between"><div><p className="font-semibold">Creative preview</p><p className="text-xs text-muted-foreground">Your latest product motion</p></div><Film className="h-5 w-5 text-primary" /></div>
                </div>
                <CardContent className="p-5">
                  {videoUrl ? (
                    <div className="space-y-4">
                      <div className="overflow-hidden rounded-2xl border border-border bg-black">
                        <video ref={videoRef} src={videoUrl} controls playsInline muted={Boolean(audioUrl)} onPlay={syncVoiceOnPlay} onPause={syncVoiceOnPause} onSeeked={syncVoiceOnPlay} className="aspect-[9/16] max-h-[560px] w-full object-contain" />
                        {audioUrl && <audio ref={audioRef} src={audioUrl} preload="auto" />}
                      </div>
                      {audioUrl && (
                        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold"><Volume2 className="h-4 w-4 text-primary" /> Voice attached</div>
                          <p className="mt-1 text-xs text-muted-foreground">The Deepgram track is linked to this motion clip and syncs in preview.</p>
                          <Button size="sm" className="mt-3 w-full gap-2" onClick={playWithVoice}><Play className="h-4 w-4" /> Play motion + voice</Button>
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <Button asChild variant="outline" className="gap-2"><a href={videoUrl} target="_blank" rel="noreferrer" download><Download className="h-4 w-4" /> Download motion</a></Button>
                        {audioUrl && <Button asChild variant="outline" className="gap-2"><a href={audioUrl} target="_blank" rel="noreferrer" download><Mic2 className="h-4 w-4" /> Download voice</a></Button>}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-b from-muted/30 to-transparent p-8 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Play className="h-7 w-7 text-primary" /></div>
                      <p className="mt-5 font-semibold">Your product starts moving here</p>
                      <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">ClipMotion checks the required inputs, backend and credits before it sends anything to Higgsfield.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="product-visuals" className="pt-5">
            <div className="grid gap-6 xl:grid-cols-[1fr_410px]">
              <Card className="border-border/70 shadow-sm">
                <CardContent className="space-y-6 p-5 md:p-7">
                  <StatusStrip blocker={visualBlocker} />
                  <div>
                    <div className="mb-3 flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-xs font-black text-primary-foreground">1</div><div><p className="font-semibold">Choose the visual outcome</p><p className="text-xs text-muted-foreground">Start with a commercial direction instead of a model name.</p></div></div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {VISUAL_RECIPES.map((recipe) => (
                        <button key={recipe.id} type="button" onClick={() => setVisualRecipe(recipe.id)} className={`rounded-2xl border p-4 text-left transition-all ${visualRecipe === recipe.id ? "border-primary bg-primary/7 shadow-sm" : "border-border hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm"}`}>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">{recipe.eyebrow}</span><p className="mt-1 font-semibold">{recipe.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{recipe.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2"><Label>Product / campaign details</Label><ProjectPromptButton mode="image" onPromptGenerated={setVisualDirection} /></div>
                    <Textarea className="mt-2" value={visualDirection} onChange={(event) => setVisualDirection(event.target.value)} placeholder="Describe the product, material, background and campaign mood…" rows={4} />
                  </div>


                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label>Format</Label><Select value={aspect} onValueChange={setAspect}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{ASPECTS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Resolution</Label><Select value={resolution} onValueChange={(value) => setResolution(value as ClipMotionResolution)}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{RESOLUTIONS.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div>
                  </div>

                  <details className="rounded-xl border border-border p-3">
                    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4" /> Advanced controls</summary>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div><Label>Engine</Label><Select value={imageEngine} onValueChange={setImageEngine}><SelectTrigger className="mt-2"><SelectValue /></SelectTrigger><SelectContent>{IMAGE_ENGINES.map((engine) => <SelectItem key={engine.id} value={engine.id}>{engine.label}</SelectItem>)}</SelectContent></Select></div>
                      <div><div className="flex flex-wrap items-center justify-between gap-2"><Label>Negative prompt</Label><ProjectPromptButton mode="negative" imageUrl={imageUrl} onPromptGenerated={setNegativePrompt} /></div><Input className="mt-2" value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} placeholder="watermark, blurry…" /></div>
                    </div>
                  </details>

                  <CreditQuote credits={visualCredits} label={`${resolution} product visual`} />
                  {!subscription.isSubscribed ? (
                    <Button size="lg" className="w-full" onClick={() => setShowPaywall(true)}>Choose a plan</Button>
                  ) : (
                    <Button size="lg" className="w-full gap-2" onClick={handleGenerateVisual} disabled={Boolean(visualBlocker) || loading || preflightLoading || creditsLoading}>
                      {loading || preflightLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                      {preflightLoading ? "Checking everything…" : loading ? (visualStatus || "Creating visual…") : `Create Visual · ${visualCredits} credits`}
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card className="h-fit overflow-hidden border-border/70 shadow-sm xl:sticky xl:top-20">
                <div className="border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 px-5 py-4"><div className="flex items-center justify-between"><div><p className="font-semibold">Visual preview</p><p className="text-xs text-muted-foreground">Latest generated concept</p></div><ImageIcon className="h-5 w-5 text-primary" /></div></div>
                <CardContent className="p-5">
                  {imageHistory[0] ? (
                    <div className="space-y-3"><img src={imageHistory[0].url} alt={imageHistory[0].prompt} className="w-full rounded-2xl border border-border" /><Button asChild variant="outline" className="w-full gap-2"><a href={imageHistory[0].url} target="_blank" rel="noreferrer" download><Download className="h-4 w-4" /> Download visual</a></Button></div>
                  ) : (
                    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-gradient-to-b from-muted/30 to-transparent p-8 text-center"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><ImageIcon className="h-7 w-7 text-primary" /></div><p className="mt-5 font-semibold">Campaign visuals appear here</p><p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">Choose a direction, add your product context and generate only after the preflight passes.</p></div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} feature="clipmotion" requiredPlan="starter" />
    </>
  );
};

export default HiggsfieldStudio;
