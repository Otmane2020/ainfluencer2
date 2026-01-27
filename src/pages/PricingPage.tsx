import { useNavigate } from "react-router-dom";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { PricingPacks } from "@/components/PricingPacks";
import { seoPages, productSchema, organizationSchema } from "@/lib/seo-data";

const PricingPage = () => {
  const navigate = useNavigate();
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
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Choose the plan that fits your needs. Start free, upgrade anytime. No hidden fees, cancel anytime.
          </p>
          
          <PricingPacks />
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
                q: "Can I try ClipMotion for free?",
                a: "Yes! We offer a free plan with limited video generations so you can experience our AI video creation tools before committing to a paid plan.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for annual plans.",
              },
              {
                q: "Can I upgrade or downgrade my plan?",
                a: "Absolutely. You can change your plan at any time. If you upgrade, you'll be charged the prorated difference. If you downgrade, the new pricing takes effect at your next billing cycle.",
              },
              {
                q: "What happens if I run out of credits?",
                a: "You can purchase additional credits or upgrade to a higher plan. Unused credits don't roll over, so we recommend choosing a plan that fits your regular usage.",
              },
              {
                q: "Do you offer refunds?",
                a: "We offer a 14-day money-back guarantee on all paid plans. If you're not satisfied, contact our support team for a full refund.",
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
