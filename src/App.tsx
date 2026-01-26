import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PWAInstallBanner } from "@/components/PWAInstall";
import LandingPage from "./pages/LandingPage";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectNew from "./pages/ProjectNew";
import ProjectDetail from "./pages/ProjectDetail";
import CalendarPage from "./pages/CalendarPage";
import Videos from "./pages/Videos";
import Posts from "./pages/Posts";
import Settings from "./pages/Settings";
import Integrations from "./pages/Integrations";
import VideoHistoryPage from "./pages/VideoHistoryPage";
import ImageHistoryPage from "./pages/ImageHistoryPage";
import PostHistoryPage from "./pages/PostHistoryPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/posts" element={<Posts />} />
            <Route path="/history/videos" element={<VideoHistoryPage />} />
            <Route path="/history/images" element={<ImageHistoryPage />} />
            <Route path="/history/posts" element={<PostHistoryPage />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        <PWAInstallBanner />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
