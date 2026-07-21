import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Download, Loader2, Wand2, Upload, CheckCircle2, X } from "lucide-react";
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

const IMAGE_MODELS = [
  { id: "/higgsfield-ai/soul/standard", label: "Soul — Flagship" },
  { id: "/reve/text-to-image", label: "Reve — Versatile" },
];
const ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const RESOLUTIONS = ["720p", "1080p"];

const VIDEO_MODELS = [
  { id: "/higgsfield-ai/dop/standard", label: "DoP — Cinematic" },
  { id: "/bytedance/seedance/v1/pro/image-to-video", label: "Seedance Pro" },
  { id: "/kling-video/v2.1/pro/image-to-video", label: "Kling v2.1 Pro" },
];

interface GenImg { id: string; url: string; prompt: string }

type Tab = "text-to-image" | "image-to-video";

interface Props { defaultTab?: Tab }

const HiggsfieldStudio = ({ defaultTab = "text-to-image" }: Props) => {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const { generate, loading, error } = useHiggsfield();
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // Text to Image state
  const [imgPrompt, setImgPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [imgModel, setImgModel] = useState(IMAGE_MODELS[0].id);
  const [aspect, setAspect] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [imgStatus, setImgStatus] = useState("");
  const [imgHistory, setImgHistory] = useState<GenImg[]>([]);

  // Image to Video state
  const [vidPrompt, setVidPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [vidModel, setVidModel] = useState(VIDEO_MODELS[0].id);
  const [duration, setDuration] = useState("5");
  const [vidStatus, setVidStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `higgsfield/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error: uploadError } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(data.path);
      setImageUrl(pub.publicUrl);
      setUploadedFileName(file.name);
      toast({ title: "Image uploaded" });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUrl("");
    setUploadedFileName(null);
  };

  const handleGenerateImage = async () => {
    if (!imgPrompt.trim()) {
      toast({ title: "Prompt required", variant: "destructive" });
      return;
    }
    if (!subscription.isSubscribed) {
      setShowPaywall(true);
      return;
    }
    try {
      const r = await generate({
        endpoint: imgModel,
        payload: {
          prompt: imgPrompt,
          negative_prompt: negative || undefined,
          aspect_ratio: aspect,
          resolution,
        },
        onProgress: setImgStatus,
      });
      const url = r.images?.[0]?.url;
      if (url) {
        setImgHistory((h) => [{ id: r.request_id!, url, prompt: imgPrompt }, ...h].slice(0, 24));
        toast({ title: "Image ready" });
      }
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleGenerateVideo = async () => {
    if (!vidPrompt.trim()) return toast({ title: "Prompt required", variant: "destructive" });
    if (!imageUrl) return toast({ title: "Source image required", variant: "destructive" });
    if (!subscription.isSubscribed) return setShowPaywall(true);

    try {
      const r = await generate({
        endpoint: vidModel,
        payload: { prompt: vidPrompt, duration: Number(duration), image_url: imageUrl },
        onProgress: setVidStatus,
        timeoutMs: 600_000,
      });
      const url = r.video?.url;
      if (url) {
        setVideoUrl(url);
        toast({ title: "Video ready" });
      }
    } catch (e) {
      toast({ title: "Generation failed", description: (e as Error).message, variant: "destructive" });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" /> AI Studio
          </h1>
          <p className="text-muted-foreground">Powered by Higgsfield — generate images and bring them to life as video</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="text-to-image">Text to Image</TabsTrigger>
            <TabsTrigger value="image-to-video">Image to Video</TabsTrigger>
          </TabsList>

          <TabsContent value="text-to-image" className="pt-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label>Prompt</Label>
                    <div className="relative">
                      <Textarea
                        value={imgPrompt}
                        onChange={(e) => setImgPrompt(e.target.value)}
                        placeholder="A serene mountain landscape at sunset with vibrant orange and purple skies…"
                        rows={4}
                        className="pr-12"
                      />
                      <div className="absolute right-1 top-1">
                        <ProjectPromptButton mode="image" onPromptGenerated={setImgPrompt} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Negative prompt (optional)</Label>
                    <Textarea
                      value={negative}
                      onChange={(e) => setNegative(e.target.value)}
                      placeholder="blurry, low quality, watermark"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label>Model</Label>
                      <Select value={imgModel} onValueChange={setImgModel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {IMAGE_MODELS.map((m) => (<SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Aspect ratio</Label>
                      <Select value={aspect} onValueChange={setAspect}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASPECTS.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Resolution</Label>
                      <Select value={resolution} onValueChange={setResolution}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RESOLUTIONS.map((r) => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="lg" className="w-full gap-2" onClick={handleGenerateImage} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {loading ? (imgStatus || "Generating…") : "Generate Image"}
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-semibold">Latest</h3>
                  {imgHistory[0] ? (
                    <div className="space-y-2">
                      <img src={imgHistory[0].url} alt={imgHistory[0].prompt} className="rounded-lg w-full" />
                      <Button asChild variant="outline" size="sm" className="w-full gap-2">
                        <a href={imgHistory[0].url} target="_blank" rel="noreferrer" download>
                          <Download className="h-4 w-4" /> Download
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Your latest generation will appear here.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {imgHistory.length > 1 && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">History</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  {imgHistory.slice(1).map((h) => (
                    <a key={h.id} href={h.url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-border hover:border-primary transition">
                      <img src={h.url} alt={h.prompt} className="w-full aspect-square object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="image-to-video" className="pt-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <Label>Source image</Label>
                    {imageUrl ? (
                      <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        <span className="flex-1 min-w-0 truncate">
                          {uploadedFileName ? `Image uploaded — ${uploadedFileName}` : "Image linked"}
                        </span>
                        <button
                          type="button"
                          onClick={clearImage}
                          className="shrink-0 rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="https://…/image.jpg"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                        />
                        <label className="inline-flex">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                          />
                          <Button asChild variant="outline" disabled={uploading}>
                            <span className="cursor-pointer gap-2 flex items-center">
                              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                            </span>
                          </Button>
                        </label>
                      </div>
                    )}
                    {imageUrl && <img src={imageUrl} alt="source" className="rounded-lg max-h-40 object-contain" />}
                  </div>

                  <div>
                    <Label>Motion / Prompt</Label>
                    <div className="relative">
                      <Textarea
                        value={vidPrompt}
                        onChange={(e) => setVidPrompt(e.target.value)}
                        placeholder="Slow cinematic camera push-in, warm neon lights, animated city signage…"
                        rows={4}
                        className="pr-12"
                      />
                      <div className="absolute right-1 top-1">
                        <ProjectPromptButton mode="motion" onPromptGenerated={setVidPrompt} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Model</Label>
                      <Select value={vidModel} onValueChange={setVidModel}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VIDEO_MODELS.map((m) => (<SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duration (seconds)</Label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["3", "5", "8", "10"].map((d) => (<SelectItem key={d} value={d}>{d}s</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button size="lg" className="w-full gap-2" onClick={handleGenerateVideo} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    {loading ? (vidStatus || "Rendering…") : "Generate Video"}
                  </Button>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-semibold">Preview</h3>
                  {videoUrl ? (
                    <div className="space-y-2">
                      <video src={videoUrl} controls className="rounded-lg w-full" />
                      <Button asChild variant="outline" size="sm" className="w-full gap-2">
                        <a href={videoUrl} target="_blank" rel="noreferrer" download>
                          <Download className="h-4 w-4" /> Download
                        </a>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Your video will appear here once ready.</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} feature={tab === "text-to-image" ? "images" : "video"} requiredPlan="starter" />
    </>
  );
};

export default HiggsfieldStudio;
