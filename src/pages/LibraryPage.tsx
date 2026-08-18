import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Download, Film, Image as ImageIcon, Library, Loader2, Mic2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Generation = {
  id: string;
  type: string;
  status: string;
  progress: number;
  prompt: string | null;
  media_url: string | null;
  audio_url: string | null;
  thumbnail_url: string | null;
  provider: string | null;
  model: string | null;
  duration: number | null;
  created_at: string;
  error_message: string | null;
};

type Filter = "all" | "video" | "image" | "audio";

function typeMeta(type: string) {
  if (type === "video") return { label: "Motion", icon: Film };
  if (type === "audio") return { label: "Voice", icon: Mic2 };
  return { label: "Visual", icon: ImageIcon };
}

function statusClass(status: string) {
  if (["completed", "success", "ready"].includes(status)) return "border-primary/20 bg-primary/10 text-primary";
  if (["failed", "error"].includes(status)) return "border-destructive/20 bg-destructive/10 text-destructive";
  return "border-border bg-muted text-muted-foreground";
}

const LibraryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("generations")
        .select("id,type,status,progress,prompt,media_url,audio_url,thumbnail_url,provider,model,duration,created_at,error_message")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      setItems((data || []) as Generation[]);
    } catch (error) {
      console.error("Library load failed", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => filter === "all" ? items : items.filter((item) => item.type === filter),
    [filter, items],
  );

  const counts = useMemo(() => ({
    all: items.length,
    video: items.filter((item) => item.type === "video").length,
    image: items.filter((item) => item.type === "image").length,
    audio: items.filter((item) => item.type === "audio").length,
  }), [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <Library className="h-4 w-4" /> Creative Library
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold">Everything you created in ClipMotion</h1>
          <p className="mt-2 text-muted-foreground">Product visuals, motion clips and voiceovers in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" className="gradient-primary" onClick={() => navigate("/create")}>
            <Sparkles className="mr-2 h-4 w-4" /> Create
          </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
        <TabsList className="grid h-auto w-full grid-cols-4 sm:w-fit">
          <TabsTrigger value="all">All · {counts.all}</TabsTrigger>
          <TabsTrigger value="video">Motion · {counts.video}</TabsTrigger>
          <TabsTrigger value="image">Visuals · {counts.image}</TabsTrigger>
          <TabsTrigger value="audio">Voice · {counts.audio}</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
            <Library className="h-9 w-9 text-muted-foreground" />
            <h2 className="mt-4 font-semibold">Nothing here yet</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              Create a product visual, animate a product photo or generate a voiceover and it will appear here.
            </p>
            <Button className="mt-4" onClick={() => navigate("/create")}>Start creating</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => {
            const meta = typeMeta(item.type);
            const Icon = meta.icon;
            const mediaUrl = item.type === "audio" ? item.audio_url || item.media_url : item.media_url;
            const complete = ["completed", "success", "ready"].includes(item.status);

            return (
              <Card key={item.id} className="overflow-hidden border-border/70">
                <div className="relative aspect-[4/3] bg-muted/30">
                  {item.type === "image" && mediaUrl ? (
                    <img src={mediaUrl} alt={item.prompt || "ClipMotion visual"} className="h-full w-full object-cover" loading="lazy" />
                  ) : item.type === "video" && mediaUrl ? (
                    <video src={mediaUrl} poster={item.thumbnail_url || undefined} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
                  ) : item.type === "audio" && mediaUrl ? (
                    <div className="flex h-full flex-col items-center justify-center gap-4 p-5">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                        <Mic2 className="h-7 w-7 text-primary" />
                      </div>
                      <audio src={mediaUrl} controls className="w-full" />
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {complete ? "Output unavailable" : item.status === "failed" ? "Generation failed" : `${item.progress || 0}% · ${item.status}`}
                      </p>
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex gap-2">
                    <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
                      <Icon className="mr-1 h-3 w-3" /> {meta.label}
                    </Badge>
                    <Badge variant="outline" className={statusClass(item.status)}>{item.status}</Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <p className="line-clamp-2 min-h-10 text-sm leading-5">
                    {item.prompt || (item.type === "audio" ? "AI voiceover" : "ClipMotion generation")}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                    <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    <span className="truncate">{item.provider || "ClipMotion"}</span>
                  </div>
                  {item.error_message && <p className="mt-2 line-clamp-2 text-xs text-destructive">{item.error_message}</p>}
                  {mediaUrl && (
                    <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                      <a href={mediaUrl} target="_blank" rel="noreferrer" download>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
