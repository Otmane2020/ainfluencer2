import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaywallModal } from "@/components/PaywallModal";
import { SEOHead } from "@/components/seo/SEOHead";
import {
  Zap,
  Copy,
  ExternalLink,
  Loader2,
  MessageSquareQuote,
  Sparkles,
  RefreshCcw,
  CheckCircle2,
  Search,
  TrendingUp,
  Link2,
} from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa";

const tones = [
  { value: "expert", label: "🧠 Expert", desc: "Deep value & authority" },
  { value: "provocative", label: "🔥 Provocative", desc: "Challenge & intrigue" },
  { value: "storytelling", label: "📖 Storytelling", desc: "Personal anecdote" },
  { value: "supportive", label: "🤝 Supportive", desc: "Warm & complementary" },
];

type DiscoveredPost = {
  url: string;
  title: string;
  author: string;
  preview: string;
  fullText: string;
};

const LinkedInReactionsPage = () => {
  const { toast } = useToast();
  const { subscription } = useSubscription();

  // URL/text mode
  const [postUrl, setPostUrl] = useState("");
  const [postText, setPostText] = useState("");
  const [useManualText, setUseManualText] = useState(false);

  // Common
  const [tone, setTone] = useState("expert");
  const [isLoading, setIsLoading] = useState(false);
  const [replies, setReplies] = useState<string[]>([]);
  const [scrapedPreview, setScrapedPreview] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [activeReplyUrl, setActiveReplyUrl] = useState("");

  // Search/trending
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredPosts, setDiscoveredPosts] = useState<DiscoveredPost[]>([]);
  const [activeTab, setActiveTab] = useState("url");

  const handleGenerate = async (url?: string, text?: string) => {
    if (!subscription.isSubscribed) {
      setShowPaywall(true);
      return;
    }

    const targetUrl = url || (useManualText ? undefined : postUrl);
    const targetText = text || (useManualText ? postText : undefined);

    if (!targetUrl && !targetText) {
      toast({ title: "Missing input", description: "Paste a LinkedIn URL or the post text", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setReplies([]);
    setScrapedPreview("");
    setActiveReplyUrl(targetUrl || "");

    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-reaction", {
        body: { postUrl: targetUrl, postText: targetText, tone },
      });

      if (error) throw error;

      if (data?.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        if (data.error.includes("paste the text")) setUseManualText(true);
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setDiscoveredPosts([]);
    try {
      const { data, error } = await supabase.functions.invoke("search-linkedin-topics", {
        body: { query: searchQuery, mode: "search" },
      });
      if (error) throw error;
      setDiscoveredPosts(data.results || []);
      if (!data.results?.length) {
        toast({ title: "No results", description: "Try a different keyword", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleTrending = async () => {
    setIsSearching(true);
    setDiscoveredPosts([]);
    try {
      const { data, error } = await supabase.functions.invoke("search-linkedin-topics", {
        body: { mode: "trending" },
      });
      if (error) throw error;
      setDiscoveredPosts(data.results || []);
      if (!data.results?.length) {
        toast({ title: "No results", description: "Try again in a moment", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load trends", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleReactToPost = (post: DiscoveredPost) => {
    handleGenerate(post.url, post.fullText);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast({ title: "Copied!", description: "Reply copied — go paste it on LinkedIn!" });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const openLinkedIn = () => {
    const url = activeReplyUrl || postUrl;
    if (url) window.open(url, "_blank");
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
          <div className="rounded-xl p-2.5 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="gap-1.5 text-xs sm:text-sm">
              <Link2 className="h-3.5 w-3.5" />
              Paste URL
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5 text-xs sm:text-sm">
              <Search className="h-3.5 w-3.5" />
              Search Topic
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5" />
              Trending
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Paste URL ── */}
          <TabsContent value="url" className="space-y-4 mt-4">
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
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground shrink-0" onClick={() => setUseManualText(true)}>
                        Paste text instead
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Post Text</label>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setUseManualText(false)}>
                        Use URL instead
                      </Button>
                    </div>
                    <Textarea placeholder="Paste the LinkedIn post text here..." value={postText} onChange={(e) => setPostText(e.target.value)} rows={4} />
                  </div>
                )}

                <ToneSelector tone={tone} setTone={setTone} />

                <Button onClick={() => handleGenerate()} disabled={isLoading || (!postUrl && !postText)} className="w-full gap-2 gradient-primary">
                  {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing & Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Strategic Replies</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: Search by Topic ── */}
          <TabsContent value="search" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <label className="text-sm font-medium">Search LinkedIn posts by topic</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. AI marketing, SEO 2026, personal branding..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()} className="gap-1.5 shrink-0">
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Search
                  </Button>
                </div>

                <ToneSelector tone={tone} setTone={setTone} />
              </CardContent>
            </Card>

            <DiscoveredPostsList posts={discoveredPosts} isLoading={isSearching} onReact={handleReactToPost} generatingUrl={isLoading ? activeReplyUrl : null} />
          </TabsContent>

          {/* ── TAB 3: Trending ── */}
          <TabsContent value="trending" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Trending LinkedIn posts</p>
                    <p className="text-xs text-muted-foreground mt-0.5">AI curated topics: AI, SEO, Marketing, SaaS, Growth</p>
                  </div>
                  <Button onClick={handleTrending} disabled={isSearching} className="gap-1.5">
                    {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    Load Trends
                  </Button>
                </div>

                <ToneSelector tone={tone} setTone={setTone} />
              </CardContent>
            </Card>

            <DiscoveredPostsList posts={discoveredPosts} isLoading={isSearching} onReact={handleReactToPost} generatingUrl={isLoading ? activeReplyUrl : null} />
          </TabsContent>
        </Tabs>

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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                  <MessageSquareQuote className="h-5 w-5 text-primary" />
                  AI Replies
                </h2>
                <Button variant="ghost" size="sm" onClick={() => handleGenerate()} className="gap-1 text-xs">
                  <RefreshCcw className="h-3 w-3" /> Regenerate
                </Button>
              </div>

              {replies.map((reply, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
                  <Card className="group hover:border-primary/40 transition-all border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
                        <p className="text-sm flex-1 whitespace-pre-wrap">{reply}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-3 justify-end">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => handleCopy(reply, idx)}>
                          {copiedIdx === idx ? <><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
                        </Button>
                        {(activeReplyUrl || postUrl) && (
                          <Button size="sm" className="gap-1.5 text-xs gradient-primary" onClick={openLinkedIn}>
                            <ExternalLink className="h-3.5 w-3.5" /> Open on LinkedIn
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

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} feature="campaigns" requiredPlan="starter" />
    </>
  );
};

/* ── Sub-components ── */

const ToneSelector = ({ tone, setTone }: { tone: string; setTone: (t: string) => void }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium">Reply Tone</label>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {tones.map((t) => (
        <button
          key={t.value}
          onClick={() => setTone(t.value)}
          className={`text-left p-2.5 rounded-lg border transition-all text-xs ${
            tone === t.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-muted-foreground/50"
          }`}
        >
          <div className="font-medium">{t.label}</div>
          <div className="text-muted-foreground text-[10px] mt-0.5">{t.desc}</div>
        </button>
      ))}
    </div>
  </div>
);

const DiscoveredPostsList = ({
  posts,
  isLoading,
  onReact,
  generatingUrl,
}: {
  posts: DiscoveredPost[];
  isLoading: boolean;
  onReact: (p: DiscoveredPost) => void;
  generatingUrl: string | null;
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Searching LinkedIn posts...</span>
      </div>
    );
  }

  if (!posts.length) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-muted-foreground">{posts.length} posts found</p>
      {posts.map((post, idx) => (
        <motion.div key={post.url} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
          <Card className="hover:border-primary/30 transition-all">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {post.author && (
                    <p className="text-xs font-medium text-primary mb-1 capitalize">{post.author}</p>
                  )}
                  {post.title && (
                    <p className="text-sm font-medium mb-1 line-clamp-1">{post.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-3">{post.preview}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs gradient-primary"
                    onClick={() => onReact(post)}
                    disabled={generatingUrl === post.url}
                  >
                    {generatingUrl === post.url ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    React
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs"
                    onClick={() => window.open(post.url, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3" />
                    View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default LinkedInReactionsPage;
