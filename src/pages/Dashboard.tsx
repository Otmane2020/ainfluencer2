import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationSettings } from "@/components/NotificationSettings";
import { FeatureShowcase } from "@/components/dashboard/FeatureShowcase";
import { LowCreditsNudge } from "@/components/nudges/LowCreditsNudge";
import { OnboardingProgress } from "@/components/nudges/OnboardingProgress";
import {
  FolderKanban,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  theme_color: string;
  posts_per_week: number;
}

interface Stats {
  totalProjects: number;
  scheduledPosts: number;
  publishedPosts: number;
  pendingPosts: number;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalProjects: 0,
    scheduledPosts: 0,
    publishedPosts: 0,
    pendingPosts: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: projectsData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(4);

      if (projectsData) {
        setProjects(projectsData);
        setStats((prev) => ({ ...prev, totalProjects: projectsData.length }));
      }

      const { data: postsData } = await supabase
        .from("scheduled_posts")
        .select("status");

      if (postsData) {
        setStats((prev) => ({
          ...prev,
          scheduledPosts: postsData.filter((p) => p.status === "scheduled").length,
          publishedPosts: postsData.filter((p) => p.status === "published").length,
          pendingPosts: postsData.filter((p) => p.status === "pending_approval").length,
        }));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    {
      title: "Projects",
      value: stats.totalProjects,
      icon: FolderKanban,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Scheduled",
      value: stats.scheduledPosts,
      icon: Clock,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Published",
      value: stats.publishedPosts,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending",
      value: stats.pendingPosts,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
  ];


  return (
    <div className="space-y-6 md:space-y-8">
      {/* Nudge: Low credits warning */}
      <LowCreditsNudge />

      {/* Nudge: Onboarding progress */}
      <OnboardingProgress />

      {/* AI Creation Studio - Feature Showcase (Top Priority) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <FeatureShowcase />
      </motion.div>



      {/* User Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Quick Start Guide</h2>
          <Button variant="ghost" onClick={() => navigate("/history")} className="gap-2">
            View History
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: "1", title: "Upload your product photo", desc: "Drag & drop a single product image — any angle, any background." },
            { step: "2", title: "Pick a style", desc: "Choose from 20+ pro styles: studio, lifestyle, e-commerce, premium." },
            { step: "3", title: "Get 10 pro shots", desc: "AI generates conversion-ready visuals in under 2 minutes. Download & publish." },
          ].map((item) => (
            <Card key={item.step} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-display text-lg font-bold text-primary">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Button onClick={() => navigate("/product-shots")} size="lg" className="gap-2 gradient-primary">
            <Plus className="h-4 w-4" />
            Start your first product shot
          </Button>
        </div>
      </motion.div>

    </div>
  );
};

export default Dashboard;
