import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationSettings } from "@/components/NotificationSettings";
import { FeatureShowcase } from "@/components/dashboard/FeatureShowcase";
import { LowCreditsNudge } from "@/components/nudges/LowCreditsNudge";
import {
  Image as ImageIcon,
  Video,
  Sparkles,
  Coins,
  ArrowRight,
  Plus,
  FolderKanban,
  TrendingUp,
  Clock,
  CheckCircle2,
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
  imagesGenerated: number;
  videosGenerated: number;
  totalGenerations: number;
  totalProjects: number;
}

const Dashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({
    imagesGenerated: 0,
    videosGenerated: 0,
    totalGenerations: 0,
    totalProjects: 0,
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
        setProjects(projectsData as never);
        setStats((prev) => ({ ...prev, totalProjects: projectsData.length }));
      }

      const { data: generationsData } = await supabase
        .from("generations")
        .select("type")
        .in("status", ["completed", "success"]);

      if (generationsData) {
        const images = generationsData.filter((g: any) => (g.type || "").includes("image")).length;
        const videos = generationsData.filter((g: any) => (g.type || "").includes("video")).length;
        setStats((prev) => ({
          ...prev,
          imagesGenerated: images,
          videosGenerated: videos,
          totalGenerations: generationsData.length,
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
      title: "Images",
      value: stats.imagesGenerated,
      icon: ImageIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Videos",
      value: stats.videosGenerated,
      icon: Video,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      title: "Total Generations",
      value: stats.totalGenerations,
      icon: Sparkles,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Projects",
      value: stats.totalProjects,
      icon: FolderKanban,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];



  return (
    <div className="space-y-6 md:space-y-8">
      {/* Nudge: Low credits warning */}
      <LowCreditsNudge />

      {/* Nudge: Onboarding progress - Hidden */}
      {/* <OnboardingProgress /> */}

      {/* AI Creation Studio - Feature Showcase (Top Priority) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <FeatureShowcase />
      </motion.div>


      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl md:text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`h-10 w-10 md:h-12 md:w-12 rounded-xl ${stat.bgColor} flex items-center justify-center shrink-0`}>
                    <stat.icon className={`h-5 w-5 md:h-6 md:w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Projects */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Recent Projects</h2>
          <Button variant="ghost" onClick={() => navigate("/projects")} className="gap-2">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-sm text-center mb-4">
                Create your first project to automate your publications
              </p>
              <Button onClick={() => navigate("/projects/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: project.theme_color }}
                      >
                        {project.logo_url ? (
                          <img
                            src={project.logo_url}
                            alt={project.name}
                            className="h-full w-full rounded-xl object-cover"
                          />
                        ) : (
                          project.name[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{project.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {project.posts_per_week} posts/week
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  {project.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Notification Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
      >
        <NotificationSettings />
      </motion.div>
    </div>
  );
};

export default Dashboard;
