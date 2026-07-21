import { useState } from "react";
import { Check, Download, FileVideo, Film, Loader2, Play, Scissors, Share2, Sparkles, Subtitles, Upload, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const suggestions = [
  { id: "hook", title: "The idea that changed everything", duration: "00:34", score: 98, hook: "This is the moment the conversation turns.", platforms: ["Reels", "TikTok"] },
  { id: "truth", title: "The uncomfortable truth", duration: "00:27", score: 94, hook: "Most creators get this completely wrong.", platforms: ["Shorts", "TikTok"] },
  { id: "lesson", title: "One lesson worth keeping", duration: "00:42", score: 91, hook: "A clean, high-retention takeaway.", platforms: ["Reels", "Shorts"] },
  { id: "quote", title: "A quote your audience will save", duration: "00:18", score: 88, hook: "A concise moment made for sharing.", platforms: ["Reels"] },
];

const ratios = ["9:16", "1:1", "16:9"];

export default function ClipMotionStudio() {
  const [selected, setSelected] = useState("hook");
  const [ratio, setRatio] = useState("9:16");
  const [captions, setCaptions] = useState(true);
  const [status, setStatus] = useState<"idle" | "generating" | "ready">("idle");
  const clip = suggestions.find((item) => item.id === selected)!;

  const generate = () => {
    setStatus("generating");
    window.setTimeout(() => setStatus("ready"), 2100);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="h-4 w-4" /> ClipMotion AI</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Turn one video into your next best clips.</h1>
          <p className="mt-1 text-muted-foreground">AI finds the moments your audience will want to watch, save, and share.</p>
        </div>
        <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Upload a new video</Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card className="overflow-hidden border-primary/20 bg-card/80 shadow-card">
            <div className="relative aspect-video overflow-hidden bg-[radial-gradient(circle_at_65%_25%,hsl(190_85%_55%_/_0.3),transparent_29%),radial-gradient(circle_at_25%_75%,hsl(270_80%_65%_/_0.36),transparent_36%),hsl(220_20%_6%)]">
              <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,.06)_50%,transparent_65%)]" />
              <div className="absolute left-[13%] top-[17%] h-44 w-44 rounded-full border border-white/10 bg-white/5 blur-[1px]" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div className="max-w-md"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Source video · The Creator Economy Podcast</p><h2 className="text-xl font-semibold text-white sm:text-2xl">How to build a brand people remember</h2></div>
                <button aria-label="Play source video" className="grid h-14 w-14 place-items-center rounded-full bg-white text-slate-950 shadow-lg transition-transform hover:scale-105"><Play className="ml-1 h-5 w-5 fill-current" /></button>
              </div>
            </div>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>00:00</span><span>42:18</span></div>
              <div className="relative h-2 rounded-full bg-muted"><div className="absolute inset-y-0 left-[26%] w-[22%] rounded-full gradient-primary" /><div className="absolute left-[26%] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-background bg-primary shadow-glow" /></div>
              <div className="grid grid-cols-8 gap-1 opacity-70" aria-label="Video timeline">{Array.from({ length: 40 }, (_, index) => <div key={index} className={cn("h-7 rounded-sm bg-muted", index > 10 && index < 20 && "bg-primary/50", index % 5 === 0 && "h-10")} />)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_auto_auto] md:items-center">
              <div><p className="text-sm font-semibold">Output settings</p><p className="text-sm text-muted-foreground">Formatted for the places your audience scrolls.</p></div>
              <div className="flex rounded-xl border border-border bg-muted/40 p-1">{ratios.map((item) => <button key={item} onClick={() => setRatio(item)} className={cn("rounded-lg px-3 py-2 text-sm font-medium transition-colors", ratio === item ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{item}</button>)}</div>
              <button onClick={() => setCaptions(!captions)} className="flex items-center gap-2 text-sm font-medium"><span className={cn("grid h-5 w-5 place-items-center rounded border", captions ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/50")}>{captions && <Check className="h-3.5 w-3.5" />}</span><Subtitles className="h-4 w-4 text-muted-foreground" /> Captions</button>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit overflow-hidden border-primary/20">
          <div className="border-b border-border bg-gradient-to-r from-primary/10 to-secondary/10 px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold">AI clip suggestions</h2><p className="text-xs text-muted-foreground">4 high-potential moments found</p></div><Scissors className="h-5 w-5 text-primary" /></div></div>
          <CardContent className="space-y-2 p-3">
            {suggestions.map((item) => <button key={item.id} onClick={() => { setSelected(item.id); setStatus("idle"); }} className={cn("w-full rounded-xl border p-3 text-left transition-all", selected === item.id ? "border-primary/70 bg-primary/10 shadow-glow" : "border-transparent hover:border-border hover:bg-muted/50")}>
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold leading-tight">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.duration} · {item.hook}</p></div><span className="rounded-md bg-primary/15 px-1.5 py-1 text-xs font-bold text-primary">{item.score}</span></div>
              <div className="mt-2 flex gap-1.5">{item.platforms.map((platform) => <span key={platform} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{platform}</span>)}</div>
            </button>)}
            <div className="pt-2">
              {status === "generating" ? <div className="space-y-3 rounded-xl bg-muted/50 p-4"><div className="flex items-center gap-2 text-sm font-medium"><Loader2 className="h-4 w-4 animate-spin text-primary" /> Building your clip…</div><Progress value={68} /></div> : status === "ready" ? <div className="space-y-3 rounded-xl border border-secondary/30 bg-secondary/10 p-4"><div className="flex gap-2"><Check className="mt-0.5 h-4 w-4 text-secondary" /><div><p className="text-sm font-semibold">Your clip is ready</p><p className="text-xs text-muted-foreground">{clip.duration} · {ratio} · {captions ? "Captions on" : "No captions"}</p></div></div><div className="grid grid-cols-2 gap-2"><Button size="sm" className="gap-1.5"><Download className="h-3.5 w-3.5" /> Download</Button><Button size="sm" variant="outline" className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</Button></div></div> : <Button onClick={generate} className="w-full gap-2"><Film className="h-4 w-4" /> Generate clip</Button>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3"><Card><CardContent className="flex gap-3 p-4"><FileVideo className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold">Automatic highlights</p><p className="text-xs text-muted-foreground">Hooks, insights, and quotable moments.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 p-4"><Subtitles className="h-5 w-5 text-secondary" /><div><p className="text-sm font-semibold">Captions that follow</p><p className="text-xs text-muted-foreground">Readable, social-first subtitles.</p></div></CardContent></Card><Card><CardContent className="flex gap-3 p-4"><Youtube className="h-5 w-5 text-primary" /><div><p className="text-sm font-semibold">Ready to publish</p><p className="text-xs text-muted-foreground">One clip, every essential format.</p></div></CardContent></Card></div>
    </div>
  );
}
