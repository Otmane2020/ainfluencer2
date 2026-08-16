import { ReactNode } from "react";
import { useNavigate, Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface PublicPageLayoutProps {
  children: ReactNode;
}

export const PublicPageLayout = ({ children }: PublicPageLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 glass">
        <div className="container mx-auto flex h-14 md:h-16 items-center justify-between px-3 md:px-4">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl overflow-hidden shadow-glow">
              <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain scale-125" />
            </div>
            <span className="font-display text-lg md:text-xl font-bold text-gradient">ClipMotion</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link to="/features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
            <Link to="/use-cases" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Use Cases</Link>
            <Link to="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-xs md:text-sm px-2 md:px-4">
              Sign In
            </Button>
            <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary text-xs md:text-sm px-3 md:px-4">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14 md:pt-16">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-display font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/ai-video-generator" className="hover:text-foreground transition-colors">AI Video Generator</Link></li>
                <li><Link to="/motion-design-ai" className="hover:text-foreground transition-colors">Motion Design AI</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="/use-cases" className="hover:text-foreground transition-colors">Use Cases</Link></li>
                <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><a href="https://twitter.com/clipmotion" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter</a></li>
                <li><a href="https://linkedin.com/company/clipmotion" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">LinkedIn</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl overflow-hidden">
                <img src="/logo.png" alt="ClipMotion" className="h-full w-full object-contain" />
              </div>
              <span className="font-display text-lg font-bold">ClipMotion</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ClipMotion. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
