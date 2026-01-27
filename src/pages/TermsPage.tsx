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
          
          <div className="bg-card border rounded-lg p-6 mb-8 not-prose">
            <h3 className="font-semibold mb-2">NewAI Ltd</h3>
            <address className="text-muted-foreground not-italic text-sm">
              Suite 4, Piccadilly House<br />
              Manchester<br />
              M1 1AB<br />
              United Kingdom
            </address>
          </div>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using ClipMotion (operated by NewAI Ltd), you agree to be bound by these Terms of Service. If you disagree with any part of these terms, please do not use our service.</p>
          
          <h2>2. Service Description</h2>
          <p>ClipMotion, a product of NewAI Ltd, provides AI-powered video generation, motion design, and social media automation tools for businesses and content creators.</p>
          
          <h2>3. User Responsibilities</h2>
          <p>You are responsible for all content you create using our platform. You agree not to use our service for illegal, harmful, defamatory, or misleading content. You must comply with all applicable laws and regulations.</p>
          
          <h2>4. Intellectual Property</h2>
          <p>You retain ownership of content you create using ClipMotion. NewAI Ltd retains all rights to the platform, software, AI technology, and associated intellectual property.</p>
          
          <h2>5. Payment and Subscriptions</h2>
          <p>Paid subscriptions are billed in advance on a monthly or annual basis. Refunds are available within 14 days of purchase if you are not satisfied with the service.</p>
          
          <h2>6. Limitation of Liability</h2>
          <p>ClipMotion is provided "as is" without warranties of any kind. NewAI Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages.</p>
          
          <h2>7. Termination</h2>
          <p>We may terminate or suspend your account at any time for violations of these terms. You may cancel your subscription at any time through your account settings.</p>
          
          <h2>8. Governing Law</h2>
          <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
          
          <h2>9. Contact</h2>
          <p>For questions about these Terms of Service, please contact us at legal@clipmotion.ai or write to our registered address above.</p>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default TermsPage;
