import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PaywallModal } from "@/components/PaywallModal";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquareQuote,
  Sparkles,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa";

const tones = [
  { value: "expert", label: "🧠 Expert", desc: "Deep value & authority" },
  { value: "provocative", label: "🔥 Provocative", desc: "Challenge & intrigue" },
  { value: "storytelling", label: "📖 Storytelling", desc: "Personal anecdote" },
  { value: "supportive", label: "🤝 Supportive", desc: "Warm & complementary" },
];

const LinkedInReactionsPage = () => {
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const [postUrl, setPostUrl] = useState("");
  const [postText, setPostText] = useState("");
  const [tone, setTone] = useState("expert");
  const [isLoading, setIsLoading] = useState(false);
  const [replies, setReplies] = useState<string[]>([]);
  const [scrapedPreview, setScrapedPreview] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [useManualText, setUseManualText] = useState(false);

  const handleGenerate = async () => {
    if (!subscription.isSubscribed) {
      setShowPaywall(true);
      return;
    }

    if (!postUrl && !postText) {
      toast({ title: "Missing input", description: "Paste a LinkedIn URL or the post text", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setReplies([]);
    setScrapedPreview("");

    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-reaction", {
        body: {
          postUrl: useManualText ? undefined : postUrl,
          postText: useManualText ? postText : undefined,
          tone,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        if (data.error.includes("paste the text")) {
          setUseManualText(true);
        }
        return;
      }

      setReplies(data.replies || []);
      setScrapedPreview(data.scrapedText || "");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message || "Generation failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast({ title: "Copied!", description: "Reply copied to clipboard. Go paste it on LinkedIn!" });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const openLinkedIn = () => {
    if (postUrl) {
      window.open(postUrl, "_blank");
    }
  };

  return (
    <>
      <SEOHead
        title="LinkedIn Reactions AI | ClipMotion"
        description="Generate strategic LinkedIn replies with AI. Boost your visibility and engagement."
      />

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl p-2.5 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
            <FaLinkedinIn className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">LinkedIn Reactions</h1>
            <p className="text-sm text-muted-foreground">
              AI-powered strategic replies to boost your visibility
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto bg-primary/20 text-primary border-0">
            Semi-Auto
          </Badge>
        </div>

        {/* How it works */}
        <Card className="bg-card/50 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-6 text-xs text-muted-foreground justify-center">
              <div className="flex items-center gap-1.5">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">1</span>
                Paste URL
              </div>
              <span>→</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">2</span>
                AI Scrapes
              </div>
              <span>→</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">3</span>
                AI Replies
              </div>
              <span>→</span>
              <div className="flex items-center gap-1.5">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">4</span>
                Copy & Post
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {!useManualText ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">LinkedIn Post URL</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.linkedin.com/posts/..."
                    value={postUrl}
                    onChange={(e) => setPostUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground shrink-0"
                    onClick={() => setUseManualText(true)}
                  >
                    Paste text instead
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Post Text</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setUseManualText(false)}
                  >
                    Use URL instead
                  </Button>
                </div>
                <Textarea
                  placeholder="Paste the LinkedIn post text here..."
                  value={postText}
                  onChange={(e) => setPostText(e.target.value)}
                  rows={4}
                />
              </div>
            )}

            {/* Tone selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Reply Tone</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {tones.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`text-left p-2.5 rounded-lg border transition-all text-xs ${
                      tone === t.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  >
                    <div className="font-medium">{t.label}</div>
                    <div className="text-muted-foreground text-[10px] mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || (!postUrl && !postText)}
              className="w-full gap-2 gradient-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing & Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Strategic Replies
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Scraped preview */}
        {scrapedPreview && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1 font-medium">📄 Detected post content:</p>
              <p className="text-sm text-muted-foreground line-clamp-3">{scrapedPreview}</p>
            </CardContent>
          </Card>
        )}

        {/* Generated replies */}
        <AnimatePresence>
          {replies.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <MessageSquareQuote className="h-5 w-5 text-primary" />
                  AI Replies
                </h2>
                <Button variant="ghost" size="sm" onClick={handleGenerate} className="gap-1 text-xs">
                  <RefreshCcw className="h-3 w-3" />
                  Regenerate
                </Button>
              </div>

              {replies.map((reply, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="group hover:border-primary/40 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm flex-1 whitespace-pre-wrap">{reply}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs"
                          onClick={() => handleCopy(reply, idx)}
                        >
                          {copiedIdx === idx ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </>
                          )}
                        </Button>
                        {postUrl && (
                          <Button
                            size="sm"
                            className="gap-1.5 text-xs gradient-primary"
                            onClick={openLinkedIn}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open on LinkedIn
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="campaigns"
        requiredPlan="starter"
      />
    </>
  );
};

export default LinkedInReactionsPage;
