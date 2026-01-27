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
          
          <div className="bg-card border rounded-lg p-6 mb-8 not-prose">
            <h3 className="font-semibold mb-2">NewAI Ltd</h3>
            <address className="text-muted-foreground not-italic text-sm">
              Suite 4, Piccadilly House<br />
              Manchester<br />
              M1 1AB<br />
              United Kingdom
            </address>
          </div>

          <h2>1. Information We Collect</h2>
          <p>NewAI Ltd ("we", "us", "our") operates ClipMotion. We collect information you provide directly, including:</p>
          <ul>
            <li>Account information (name, email address)</li>
            <li>Content you create using our AI tools</li>
            <li>Payment and billing information</li>
            <li>Usage data and analytics</li>
          </ul>
          
          <h2>2. How We Use Your Information</h2>
          <p>We use your information to provide and improve our AI video generation services, process payments, communicate with you about your account, and comply with legal obligations.</p>
          
          <h2>3. Data Sharing</h2>
          <p>We do not sell your personal data. We may share data with trusted service providers who assist us in operating our platform, subject to confidentiality agreements.</p>
          
          <h2>4. Data Security</h2>
          <p>We implement industry-standard security measures including encryption in transit (TLS) and at rest to protect your data. Access to personal data is restricted to authorized personnel only.</p>
          
          <h2>5. Data Retention</h2>
          <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time.</p>
          
          <h2>6. Your Rights (GDPR)</h2>
          <p>Under UK and EU data protection laws, you have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Rectify inaccurate data</li>
            <li>Request erasure of your data</li>
            <li>Object to or restrict processing</li>
            <li>Data portability</li>
          </ul>
          
          <h2>7. Cookies</h2>
          <p>We use essential cookies to operate our platform and analytics cookies to understand usage. You can manage cookie preferences in your browser settings.</p>
          
          <h2>8. Contact Us</h2>
          <p>For privacy inquiries or to exercise your rights, contact us at:</p>
          <ul>
            <li>Email: privacy@clipmotion.ai</li>
            <li>Address: Suite 4, Piccadilly House, Manchester, M1 1AB, United Kingdom</li>
          </ul>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default PrivacyPolicyPage;
