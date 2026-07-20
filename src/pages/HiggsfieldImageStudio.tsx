import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Download, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHiggsfield } from "@/hooks/useHiggsfield";
import { useToast } from "@/hooks/use-toast";
import { PaywallModal } from "@/components/PaywallModal";
import { useSubscription } from "@/hooks/useSubscription";

const MODELS = [
  { id: "higgsfield-ai/soul/standard", label: "Soul Standard — Flagship" },
  { id: "reve/text-to-image", label: "Reve — Versatile" },
];
const ASPECTS = ["16:9", "9:16", "1:1", "4:3", "3:4"];
const RESOLUTIONS = ["720p", "1080p"];

interface GenImg {
  id: string;
  url: string;
  prompt: string;
}

const HiggsfieldImageStudio = () => {
  const [prompt, setPrompt] = useState("");
  const [negative, setNegative] = useState("");
  const [model, setModel] = useState(MODELS[0].id);
  const [aspect, setAspect] = useState("16:9");
  const [resolution, setResolution] = useState("720p");
  const [status, setStatus] = useState<string>("");
  const [history, setHistory] = useState<GenImg[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const { generate, loading, error } = useHiggsfield();
  const { toast } = useToast();
  const { subscription } = useSubscription();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt required", variant: "destructive" });
      return;
    }
    if (!subscription.isSubscribed) {
      setShowPaywall(true);
      return;
    }
    try {
      const r = await generate({
        modelId: model,
        payload: {
          prompt,
          negative_prompt: negative || undefined,
          aspect_ratio: aspect,
          resolution,
        },
        onProgress: setStatus,
      });
      const url = r.images?.[0]?.url;
      if (url) {
        setHistory((h) => [{ id: r.request_id!, url, prompt }, ...h].slice(0, 24));
        toast({ title: "Image ready" });
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
            <Sparkles className="h-7 w-7 text-primary" /> AI Image Studio
          </h1>
          <p className="text-muted-foreground">Powered by Higgsfield — generate stunning images from text prompts</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A serene mountain landscape at sunset with vibrant orange and purple skies…"
                  rows={4}
                />
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
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODELS.map((m) => (<SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>))}
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
              <Button size="lg" className="w-full gap-2" onClick={handleGenerate} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {loading ? (status || "Generating…") : "Generate Image"}
              </Button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold">Latest</h3>
              {history[0] ? (
                <div className="space-y-2">
                  <img src={history[0].url} alt={history[0].prompt} className="rounded-lg w-full" />
                  <Button asChild variant="outline" size="sm" className="w-full gap-2">
                    <a href={history[0].url} target="_blank" rel="noreferrer" download>
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

        {history.length > 1 && (
          <div>
            <h3 className="font-semibold mb-3">History</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {history.slice(1).map((h) => (
                <a key={h.id} href={h.url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-border hover:border-primary transition">
                  <img src={h.url} alt={h.prompt} className="w-full aspect-square object-cover" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} feature="images" requiredPlan="starter" />
    </>
  );
};

export default HiggsfieldImageStudio;
