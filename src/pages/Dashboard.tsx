import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureShowcase } from "@/components/dashboard/FeatureShowcase";
import {
  ArrowRight,
  Film,
  FolderKanban,
  Image as ImageIcon,
  Library,
  Mic2,
  Plus,
  Sparkles,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  theme_color: string;
}

interface Stats {
  visuals: number;
  motion: number;
  voiceovers: number;
  projects: number;
}

const Dashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({ visuals: 0, motion: 0, voiceovers: 0, projects: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [projectsResult, projectCountResult, generationsResult] = await Promise.all([
          supabase
            .from("projects")
            .select("id,name,description,logo_url,theme_color")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(4),
          supabase
            .from("projects")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("generations")
            .select("type")
            .eq("user_id", user.id)
            .in("status", ["completed", "success", "ready"]),
        ]);

        setProjects((projectsResult.data || []) as Project[]);
        const generations = generationsResult.data || [];
        setStats({
          visuals: generations.filter((item) => item.type === "image").length,
          motion: generations.filter((item) => item.type === "video").length,
          voiceovers: generations.filter((item) => item.type === "audio").length,
          projects: projectCountResult.count || 0,
        });
      } catch (error) {
        console.error("Dashboard load failed", error);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, [user?.id]);

  const statCards = [
    { title: "Product visuals", value: stats.visuals, icon: ImageIcon },
    { title: "Motion clips", value: stats.motion, icon: Film },
    { title: "Voiceovers", value: stats.voiceovers, icon: Mic2 },
    { title: "Projects", value: stats.projects, icon: FolderKanban },
  ];

  return (
    <div className="space-y-7 md:space-y-9">
      <section className="flex flex-col gap-5 rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-background to-secondary/5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" /> ClipMotion workspace
          </div>
          <h1 className="mt-2 font-display text-3xl font-bold md:text-4xl">
            {profile?.display_name ? `Welcome back, ${profile.display_name}` : "Create your next product ad"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Start with a product photo, create the visual direction, animate the strongest take and add a voiceover when the ad needs narration.
          </p>
        </div>
        <Button size="lg" className="shrink-0 gap-2 gradient-primary" onClick={() => navigate("/create")}>
          <Film className="h-4 w-4" /> Create product motion
        </Button>
      </section>

      <FeatureShowcase />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Your creative library</h2>
            <p className="text-sm text-muted-foreground">Completed outputs across ClipMotion.</p>
          </div>
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/history")}>
            Open library <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
            >
              <Card>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground md:text-sm">{stat.title}</p>
                      <p className="mt-1 text-2xl font-bold md:text-3xl">{isLoading ? "—" : stat.value}</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <stat.icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Product projects</h2>
            <p className="text-sm text-muted-foreground">Keep brand context and product work organized.</p>
          </div>
          <Button variant="ghost" className="gap-2" onClick={() => navigate("/projects")}>
            View all <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {projects.length === 0 && !isLoading ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <FolderKanban className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-4 font-semibold">Create your first product project</h3>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Save product and brand context so prompt assistance can stay consistent across new visuals and motion clips.
              </p>
              <Button className="mt-4 gap-2" onClick={() => navigate("/projects/new")}>
                <Plus className="h-4 w-4" /> New project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <CardContent className="p-5">
                  <div
                    className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl font-bold text-white"
                    style={{ backgroundColor: project.theme_color || "hsl(var(--primary))" }}
                  >
                    {project.logo_url ? (
                      <img src={project.logo_url} alt={project.name} className="h-full w-full object-cover" />
                    ) : (
                      project.name.slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <h3 className="mt-4 truncate font-semibold">{project.name}</h3>
                  <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                    {project.description || "Product creative workspace"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => navigate("/history")}
        className="flex w-full items-center justify-between rounded-2xl border border-border bg-muted/20 p-4 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Library className="h-5 w-5 text-primary" />
          </span>
          <span>
            <span className="block text-sm font-medium">Generation Library</span>
            <span className="block text-xs text-muted-foreground">Review, download and reuse your finished assets.</span>
          </span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
};

export default Dashboard;
