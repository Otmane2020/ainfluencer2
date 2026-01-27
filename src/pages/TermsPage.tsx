import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { seoPages, organizationSchema } from "@/lib/seo-data";

const TermsPage = () => {
  const seo = seoPages.terms;
  return (
    <PublicPageLayout>
      <SEOHead title={seo.title} description={seo.description} canonical={seo.canonical} structuredData={[organizationSchema]} />
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl prose prose-invert">
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: January 2026</p>
          <h2>1. Acceptance of Terms</h2>
          <p>By using ClipMotion, you agree to these terms. If you disagree, please do not use our service.</p>
          <h2>2. Service Description</h2>
          <p>ClipMotion provides AI-powered video generation, motion design, and social media automation tools.</p>
          <h2>3. User Responsibilities</h2>
          <p>You are responsible for content you create. Do not use our service for illegal, harmful, or misleading content.</p>
          <h2>4. Intellectual Property</h2>
          <p>You retain ownership of content you create. ClipMotion retains rights to the platform and AI technology.</p>
          <h2>5. Limitation of Liability</h2>
          <p>ClipMotion is provided "as is" without warranties. We are not liable for indirect damages.</p>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default TermsPage;
