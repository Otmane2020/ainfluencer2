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
            No hidden fees • Cancel anytime • 1 credit = 1€
          </p>
          
          <PricingPacks />
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
                          {pack.price} €
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
                          {pack.price} €
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
                          {pack.price} €
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
                  <span>Smart Image</span>
                  <span className="font-bold">2 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>High Image</span>
                  <span className="font-bold">3 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Studio Image</span>
                  <span className="font-bold">4 credits</span>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                🎬 Video Generation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Smart Video</span>
                  <span className="font-bold">10 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>High Video</span>
                  <span className="font-bold">13 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Cinema Video</span>
                  <span className="font-bold">20 credits</span>
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
                q: "How does the subscription + credits model work?",
                a: "Your subscription (Starter, Pro, or Business) gives you access to the app features and AutoPost limits. Each AI generation (image or video) consumes credits from your balance. This way, you only pay for what you actually use.",
              },
              {
                q: "Can I try ClipMotion for free?",
                a: "Yes! New users receive 10 free credits to try our AI generation tools. You can upgrade to a paid plan when you're ready.",
              },
              {
                q: "What happens if I run out of credits?",
                a: "AutoPost will automatically pause when your credits are depleted. You can purchase additional credits anytime to resume generation. Your scheduled content remains safe.",
              },
              {
                q: "What's included in AutoPost?",
                a: "AutoPost automatically generates and schedules content for your projects. Starter plan includes up to 30 images/day. Pro adds 1 video/day, and Business includes 3 videos/day. Each generation consumes credits.",
              },
              {
                q: "Do credits expire?",
                a: "No, your credits never expire. Use them whenever you need, at your own pace.",
              },
              {
                q: "Can I upgrade or downgrade my plan?",
                a: "Absolutely. You can change your plan at any time. If you upgrade, you'll get immediate access to higher limits. If you downgrade, the change takes effect at your next billing cycle.",
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
