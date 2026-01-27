import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { seoPages, organizationSchema } from "@/lib/seo-data";

const PrivacyPolicyPage = () => {
  const seo = seoPages.privacyPolicy;
  return (
    <PublicPageLayout>
      <SEOHead title={seo.title} description={seo.description} canonical={seo.canonical} structuredData={[organizationSchema]} />
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-3xl prose prose-invert">
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: January 2026</p>
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly, including account details, content you create, and payment information.</p>
          <h2>2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our AI video generation services, process payments, and communicate with you.</p>
          <h2>3. Data Security</h2>
          <p>We implement industry-standard security measures to protect your data. All content is encrypted in transit and at rest.</p>
          <h2>4. Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. Contact support@clipmotion.ai for requests.</p>
          <h2>5. Contact Us</h2>
          <p>For privacy inquiries, email us at privacy@clipmotion.ai</p>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default PrivacyPolicyPage;
