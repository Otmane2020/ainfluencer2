import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { PricingPacks } from "@/components/PricingPacks";
import { CreditPacks } from "@/components/CreditPacks";
import { seoPages, productSchema, organizationSchema } from "@/lib/seo-data";
import { Separator } from "@/components/ui/separator";
import { IMAGE_PACKS, VIDEO_PACKS } from "@/lib/commercialProducts";
import { CLIPMOTION_PACKS } from "@/lib/clipMotionConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Film, Star, Coins, Sparkles } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const PricingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const seo = seoPages.pricing;

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case "smart-image":
        return "Smart / High";
      case "high-image":
        return "Smart / High";
      case "studio-image":
        return "Studio";
      case "smart-video":
        return "Smart";
      case "high-video":
        return "Smart / High";
      case "cinema-video":
        return "Cinema";
      default:
        return quality;
    }
  };

  const handleBuyPack = (packName: string) => {
    toast({
      title: "Coming Soon",
      description: `${packName} purchase will be available soon via Stripe.`,
    });
  };

  return (
    <PublicPageLayout>
      <SEOHead
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        keywords={seo.keywords}
        structuredData={[productSchema, organizationSchema]}
      />

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-bold mb-6">
            Simple, <span className="text-gradient">Transparent</span> Pricing
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            Choose the plan that fits your needs. Start with a subscription, pay per generation with credits.
          </p>
          <p className="text-sm text-muted-foreground mb-12">
            No hidden fees • Cancel anytime • 1 credit = $1
          </p>

          <PricingPacks />
        </div>
      </section>

      {/* Emo Robot Premium Section */}
      <section className="py-16 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-t border-b border-primary/20">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="rounded-2xl border-2 border-primary/30 bg-card/50 backdrop-blur-sm p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-bold mb-4">
                  💎 PREMIUM SOLUTION
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
                  Emo Robot — Complete AI Automation
                </h2>
                <p className="text-muted-foreground mb-4">
                  Get unlimited access to all our AI tools with 5000 lifetime credits, advanced features, and dedicated support.
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>5000 lifetime credits</strong> — never buy again</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>Unlimited projects & campaigns</strong> — no restrictions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>VIP support</strong> — dedicated account manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>Enterprise API access</strong> — webhooks & integrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    <span><strong>Team collaboration</strong> — up to 5 users</span>
                  </li>
                </ul>
              </div>
              <div className="flex-shrink-0">
                <div className="text-center">
                  <div className="text-5xl md:text-6xl font-bold text-gradient mb-2">€599</div>
                  <div className="text-sm text-muted-foreground mb-4">one-time payment</div>
                  <Button size="lg" className="w-full md:w-auto mb-4">
                    Get Emo Robot
                  </Button>
                  <div className="inline-block px-4 py-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.5 2a1 1 0 011 1v1h1a1 1 0 110 2h-.5v13.5a1 1 0 11-2 0V5.5H4a1 1 0 110-2h1V3a1 1 0 011-1zM15 2a1 1 0 011 1v1h1a1 1 0 110 2h-.5v13.5a1 1 0 11-2 0V5.5h-.5a1 1 0 110-2h1V3a1 1 0 011-1zM10 3a1 1 0 011 1v1h.5a1 1 0 110 2H11v13.5a1 1 0 11-2 0V6h-.5a1 1 0 110-2H10V4a1 1 0 011-1z" clipRule="evenodd" />
                      </svg>
                      🚚 FREE SHIPPING WORLDWIDE
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pack Shop - Image & Video Packs */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-8">
            <h2 className="font-display text-3xl font-bold mb-4">
              Top Up Your Credits
            </h2>
            <p className="text-muted-foreground">
              Buy packs for bulk discounts or credits for maximum flexibility
            </p>
          </div>

          <Tabs defaultValue="clipmotion" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="clipmotion" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                ClipMotion
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Image Packs
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Film className="h-4 w-4" />
                Video Packs
              </TabsTrigger>
            </TabsList>

            {/* ClipMotion Packs Tab */}
            <TabsContent value="clipmotion">
              <div className="bg-card rounded-xl border overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    ClipMotion Packs
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Viral-ready videos for TikTok, Reels & Shorts
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Pack</TableHead>
                      <TableHead className="font-semibold">Content</TableHead>
                      <TableHead className="text-right font-semibold">Price</TableHead>
                      <TableHead className="text-right font-semibold w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {CLIPMOTION_PACKS.map((pack) => (
                      <TableRow key={pack.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {pack.name}
                          {pack.popular && (
                            <Star className="inline-block h-4 w-4 text-amber-500 ml-2" fill="currentColor" />
                          )}
                          {pack.badge && (
                            <Badge variant="secondary" className="ml-2 text-[10px] bg-accent/20 text-accent border-0">
                              {pack.badge}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pack.quantity} ClipMotion videos
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${pack.price}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => handleBuyPack(pack.name)}
                          >
                            Buy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Image Packs Tab */}
            <TabsContent value="images">
              <div className="bg-card rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Pack</TableHead>
                      <TableHead className="font-semibold">Content</TableHead>
                      <TableHead className="text-right font-semibold">Price</TableHead>
                      <TableHead className="text-right font-semibold w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {IMAGE_PACKS.map((pack) => (
                      <TableRow key={pack.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {pack.name}
                          {pack.popular && (
                            <Star className="inline-block h-4 w-4 text-amber-500 ml-2" fill="currentColor" />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pack.quantity} images {getQualityLabel(pack.quality)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${pack.price}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleBuyPack(pack.name)}
                          >
                            Buy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Video Packs Tab */}
            <TabsContent value="videos">
              <div className="bg-card rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Pack</TableHead>
                      <TableHead className="font-semibold">Content</TableHead>
                      <TableHead className="text-right font-semibold">Price</TableHead>
                      <TableHead className="text-right font-semibold w-32"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {VIDEO_PACKS.map((pack) => (
                      <TableRow key={pack.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium">
                          {pack.name}
                          {pack.popular && (
                            <Star className="inline-block h-4 w-4 text-amber-500 ml-2" fill="currentColor" />
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pack.quantity} videos {getQualityLabel(pack.quality)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          ${pack.price}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleBuyPack(pack.name)}
                          >
                            Buy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* How Credits Work */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            How Credits Work
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6 border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                🖼️ Image Generation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Soul / Reve (720p – 1080p)</span>
                  <span className="font-bold">1 credit</span>
                </div>
                <div className="text-xs text-muted-foreground pt-2">
                  Every text-to-image generation costs 1 credit, regardless of aspect ratio or resolution.
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                🎬 Video Generation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>DoP / Seedance / Kling</span>
                  <span className="font-bold">4 credits</span>
                </div>
                <div className="text-xs text-muted-foreground pt-2">
                  Text-to-video and image-to-video (5s clips) cost 4 credits per generation.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-center mb-12">
            Pricing FAQ
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "How does the credit system work?",
                a: "Every plan includes a monthly credit balance. Each AI image costs 1 credit and each AI video costs 4 credits. Credits refresh at the start of each billing cycle.",
              },
              {
                q: "Can I try ClipMotion for free?",
                a: "Yes — every paid plan starts with a 7-day free trial. No credit card is charged during the trial and you can cancel at any time.",
              },
              {
                q: "What happens if I run out of credits?",
                a: "You can top up your balance from Settings at any time, or upgrade to a higher plan for more monthly credits. Your generation history is always kept safe.",
              },
              {
                q: "Which AI models do I get access to?",
                a: "All plans unlock every model available on ClipMotion — Higgsfield Soul, Reve, DoP, Seedance Pro, and Kling v2.1 Pro — for both image and video generation.",
              },
              {
                q: "Do unused credits roll over?",
                a: "Monthly plan credits reset each billing cycle. Credits purchased in top-up packs never expire.",
              },
              {
                q: "Can I upgrade or downgrade my plan?",
                a: "Absolutely. Upgrades take effect immediately with a prorated charge. Downgrades apply at the next billing cycle.",
              },
              {
                q: "Can I use generations commercially?",
                a: "Pro and Business plans include full commercial usage rights. The Starter plan is intended for personal and evaluation use.",
              },
            ].map((item) => (
              <div key={item.q} className="bg-card rounded-lg p-6 border">
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default PricingPage;
