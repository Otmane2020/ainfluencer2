import { useState } from "react";
import { SEOHead } from "@/components/seo/SEOHead";
import { PublicPageLayout } from "@/components/seo/PublicPageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { seoPages, organizationSchema } from "@/lib/seo-data";
import { useToast } from "@/hooks/use-toast";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { sendSupportEmail } from "@/lib/support.functions";

const ContactPage = () => {
  const seo = seoPages.contact;
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    try {
      await sendSupportEmail({
        data: {
          name: String(formData.get("name") || ""),
          email: String(formData.get("email") || ""),
          subject: "Contact form message",
          message: String(formData.get("message") || ""),
          source: "contact-page",
        },
      });
      toast({ title: "Message sent!", description: "We'll get back to you within 24 hours." });
      form.reset();
    } catch (error) {
      toast({
        title: "Could not send message",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicPageLayout>
      <SEOHead title={seo.title} description={seo.description} canonical={seo.canonical} structuredData={[organizationSchema]} />
      <section className="py-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-6 text-center">
            Get in <span className="text-gradient">Touch</span>
          </h1>
          <p className="text-muted-foreground text-center mb-12 max-w-xl mx-auto">
            Have questions about ClipMotion? Our team is here to help.
          </p>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p className="text-muted-foreground">support@clipmotion.ai</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MessageCircle className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Live Chat</h3>
                  <p className="text-muted-foreground">Available 9am-6pm EST</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPin className="h-6 w-6 text-primary mt-1" />
                <div>
                  <h3 className="font-semibold">Location</h3>
                  <p className="text-muted-foreground">San Francisco, CA</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" name="message" rows={4} required />
              </div>
              <Button type="submit" className="w-full gradient-primary" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
};

export default ContactPage;
