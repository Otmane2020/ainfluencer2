import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import CampaignsPage from "./pages/CampaignsPage";
import LinkedInReactionsPage from "./pages/LinkedInReactionsPage";
import CalendarPage from "./pages/CalendarPage";
import Videos from "./pages/Videos";
// AI Video page removed - consolidated into Videos page
import Images from "./pages/Images";
import SmartImagePage from "./pages/SmartImagePage";
import Posts from "./pages/Posts";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";
import HistoryPage from "./pages/HistoryPage";
import PostHistoryPage from "./pages/PostHistoryPage";

import NotFound from "./pages/NotFound";
import ProductShotsPage from "./pages/ProductShotsPage";
// ClipMotion page removed - functionality consolidated into Videos page
// SEO Pages
import FeaturesPage from "./pages/FeaturesPage";
import PricingPage from "./pages/PricingPage";
import UseCasesPage from "./pages/UseCasesPage";
import AIVideoGeneratorPage from "./pages/AIVideoGeneratorPage";
import MotionDesignAIPage from "./pages/MotionDesignAIPage";
import FAQPage from "./pages/FAQPage";
import BlogPage from "./pages/BlogPage";
import BlogClipMotionPage from "./pages/BlogClipMotionPage";
import ClipMotionFAQPage from "./pages/ClipMotionFAQPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsPage from "./pages/TermsPage";
import ContactPage from "./pages/ContactPage";
import NanoBananaVideoPage from "./pages/NanoBananaVideoPage";
// Blog article pages
import KlingVideoAIPage from "./pages/blog/KlingVideoAIPage";
import KlingImageAIPage from "./pages/blog/KlingImageAIPage";
import SoraAIVideoPage from "./pages/blog/SoraAIVideoPage";
import NanoBananaVideoGuidePage from "./pages/blog/NanoBananaVideoGuidePage";
import NanoBananaProPage from "./pages/blog/NanoBananaProPage";
import BestAIVideoGenerators2026Page from "./pages/blog/BestAIVideoGenerators2026Page";
import TextToVideoAIGuidePage from "./pages/blog/TextToVideoAIGuidePage";
import AIVideoAdsGeneratorPage from "./pages/blog/AIVideoAdsGeneratorPage";
import TikTokVideosWithAIPage from "./pages/blog/TikTokVideosWithAIPage";
import InstagramReelsAIPage from "./pages/blog/InstagramReelsAIPage";
import AIVideoForEcommercePage from "./pages/blog/AIVideoForEcommercePage";
import TikTokCallbackPage from "./pages/TikTokCallbackPage";
import ChoosePlanPage from "./pages/ChoosePlanPage";

import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import { OrgProvider } from "./contexts/OrgContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
      <OrgProvider>
      <SubscriptionProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/use-cases" element={<UseCasesPage />} />
          <Route path="/ai-video-generator" element={<AIVideoGeneratorPage />} />
          <Route path="/motion-design-ai" element={<MotionDesignAIPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/clip-motion" element={<BlogClipMotionPage />} />
          <Route path="/blog/kling-video-ai" element={<KlingVideoAIPage />} />
          <Route path="/blog/kling-image-ai" element={<KlingImageAIPage />} />
          <Route path="/blog/sora-ai-video-generator" element={<SoraAIVideoPage />} />
          <Route path="/blog/nano-banana-video-guide" element={<NanoBananaVideoGuidePage />} />
          <Route path="/blog/nano-banana-pro" element={<NanoBananaProPage />} />
          <Route path="/blog/best-ai-video-generators-2026" element={<BestAIVideoGenerators2026Page />} />
          <Route path="/blog/text-to-video-ai-complete-guide" element={<TextToVideoAIGuidePage />} />
          <Route path="/blog/ai-video-ads-generator" element={<AIVideoAdsGeneratorPage />} />
          <Route path="/blog/tiktok-videos-with-ai" element={<TikTokVideosWithAIPage />} />
          <Route path="/blog/instagram-reels-ai-generator" element={<InstagramReelsAIPage />} />
          <Route path="/blog/ai-video-for-ecommerce" element={<AIVideoForEcommercePage />} />
          <Route path="/clip-motion-faq" element={<ClipMotionFAQPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/nanobananavideo" element={<NanoBananaVideoPage />} />
          <Route path="/api/tiktok/callback" element={<TikTokCallbackPage />} />
          <Route path="/choose-plan" element={<ChoosePlanPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/linkedin-reactions" element={<LinkedInReactionsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            {/* ClipMotion route removed - consolidated into Videos */}
            <Route path="/videos" element={<Videos />} />
            {/* AI Video route removed - consolidated into /videos */}
            <Route path="/images" element={<Images />} />
            <Route path="/smart-image" element={<SmartImagePage />} />
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
