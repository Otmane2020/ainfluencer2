import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { PricingPacks } from "@/components/PricingPacks";
import { seoPages, productSchema, organizationSchema } from "@/lib/seo-data";

const PricingPage = () => {
  const seo = seoPages.pricing;

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

      {/* How Credits Work */}
      <section className="py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="font-display text-3xl font-bold text-center mb-8">
            How Credits Work
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-card rounded-xl p-6 border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                📸 Product Shots
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Smart shot</span><span className="font-bold">2 credits</span></div>
                <div className="flex justify-between"><span>High shot</span><span className="font-bold">3 credits</span></div>
                <div className="flex justify-between"><span>Studio shot</span><span className="font-bold">4 credits</span></div>
              </div>
            </div>
            <div className="bg-card rounded-xl p-6 border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                🖼️ Background Removal
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Single cutout</span><span className="font-bold">1 credit</span></div>
                <div className="flex justify-between"><span>Batch (per image)</span><span className="font-bold">1 credit</span></div>
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
