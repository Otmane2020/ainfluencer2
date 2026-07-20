import { useState } from "react";
import { motion } from "framer-motion";
import { Video, Download, Loader2, Wand2, Upload } from "lucide-react";
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

const VIDEO_MODELS = [
  { id: "higgsfield-ai/dop/standard", label: "DoP Standard — Fast" },
  { id: "higgsfield-ai/dop/preview", label: "DoP Preview — High quality" },
  { id: "bytedance/seedance/v1/pro/image-to-video", label: "Seedance Pro" },
  { id: "kling-video/v2.1/pro/image-to-video", label: "Kling v2.1 Pro — Cinematic" },
];

interface Props { mode: "text" | "image" }

const HiggsfieldVideoStudio = ({ mode: initialMode = "text" }: Partial<Props>) => {
  const [mode, setMode] = useState<"text" | "image">(initialMode);
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [model, setModel] = useState(VIDEO_MODELS[0].id);
  const [duration, setDuration] = useState("5");
  const [status, setStatus] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const { generate, loading, error } = useHiggsfield();
  const { toast } = useToast();
  const { subscription } = useSubscription();

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const path = `higgsfield/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { data, error } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("media").getPublicUrl(data.path);
      setImageUrl(pub.publicUrl);
      toast({ title: "Image uploaded" });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return toast({ title: "Prompt required", variant: "destructive" });
    if (mode === "image" && !imageUrl) return toast({ title: "Image required for Image → Video", variant: "destructive" });
    if (!subscription.isSubscribed) return setShowPaywall(true);

    try {
      const payload: Record<string, unknown> = {
        prompt,
        duration: Number(duration),
      };
      if (mode === "image") payload.image_url = imageUrl;

      const r = await generate({ modelId: model, payload, onProgress: setStatus, timeoutMs: 600_000 });
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
            <Video className="h-7 w-7 text-primary" /> AI Video Studio
          </h1>
          <p className="text-muted-foreground">Powered by Higgsfield — cinematic AI videos from text or an image</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList>
                  <TabsTrigger value="text">Text → Video</TabsTrigger>
                  <TabsTrigger value="image">Image → Video</TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="space-y-3 pt-4">
                  <Label>Source image</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://…/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
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
                  {imageUrl && <img src={imageUrl} alt="source" className="rounded-lg max-h-40 object-contain" />}
                </TabsContent>
              </Tabs>

              <div>
                <Label>Motion / Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Slow cinematic camera push-in, warm neon lights, animated city signage…"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
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

              <Button size="lg" className="w-full gap-2" onClick={handleGenerate} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {loading ? (status || "Rendering…") : "Generate Video"}
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
      </div>

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} feature="videos" requiredPlan="starter" />
    </>
  );
};

export default HiggsfieldVideoStudio;
