import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { AppLayout } from "@/components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import CampaignsPage from "./pages/CampaignsPage";
import CalendarPage from "./pages/CalendarPage";
import Images from "./pages/Images";
import Posts from "./pages/Posts";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";
import HistoryPage from "./pages/HistoryPage";
import PostHistoryPage from "./pages/PostHistoryPage";
import NotFound from "./pages/NotFound";
import ProductShotsPage from "./pages/ProductShotsPage";
// SEO Pages
import FeaturesPage from "./pages/FeaturesPage";
import PricingPage from "./pages/PricingPage";
import UseCasesPage from "./pages/UseCasesPage";
import FAQPage from "./pages/FAQPage";
import BlogPage from "./pages/BlogPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ContactPage from "./pages/ContactPage";
// Blog article pages (Product Shot AI focused)
import AIProductPhotographyGuidePage from "./pages/blog/AIProductPhotographyGuidePage";
import ShopifyProductPhotosPage from "./pages/blog/ShopifyProductPhotosPage";
import LifestyleProductShotsPage from "./pages/blog/LifestyleProductShotsPage";
import BackgroundRemovalAIPage from "./pages/blog/BackgroundRemovalAIPage";
import BatchProductImagesPage from "./pages/blog/BatchProductImagesPage";
import BestProductShotToolsPage from "./pages/blog/BestProductShotToolsPage";
import TikTokCallbackPage from "./pages/TikTokCallbackPage";
import ChoosePlanPage from "./pages/ChoosePlanPage";
import DemoPage from "./pages/DemoPage";
import Demo2Page from "./pages/Demo2Page";
import Demo3Page from "./pages/Demo3Page";
import Demo3ReelPage from "./pages/Demo3ReelPage";
import UnsubscribePage from "./pages/UnsubscribePage";

import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { OrgProvider } from "./contexts/OrgContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <ScrollToTop />
      <OrgProvider>
      <SubscriptionProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/use-cases" element={<UseCasesPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/demo2" element={<Demo2Page />} />
          <Route path="/demo3" element={<Demo3Page />} />
          <Route path="/demo3-reel" element={<Demo3ReelPage />} />
          <Route path="/blog/ai-product-photography-guide" element={<AIProductPhotographyGuidePage />} />
          <Route path="/blog/shopify-product-photos-with-ai" element={<ShopifyProductPhotosPage />} />
          <Route path="/blog/lifestyle-product-shots-ai" element={<LifestyleProductShotsPage />} />
          <Route path="/blog/background-removal-ai" element={<BackgroundRemovalAIPage />} />
          <Route path="/blog/batch-product-images-ai" element={<BatchProductImagesPage />} />
          <Route path="/blog/best-ai-product-shot-tools-2026" element={<BestProductShotToolsPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/api/tiktok/callback" element={<TikTokCallbackPage />} />
          <Route path="/choose-plan" element={<ChoosePlanPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/unsubscribe" element={<UnsubscribePage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/images" element={<Images />} />
            <Route path="/product-shots" element={<ProductShotsPage />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/posts" element={<PostHistoryPage />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </SubscriptionProvider>
      </OrgProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
