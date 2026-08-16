import { useState, useEffect } from "react";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaywallModal } from "@/components/PaywallModal";
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  Instagram,
  Facebook,
  MoreVertical,
  Trash2,
  Edit,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  logo_url: string | null;
  theme_color: string;
  instagram_enabled: boolean;
  facebook_enabled: boolean;
  posts_per_week: number;
  automation_mode: string;
  created_at: string;
}

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscription } = useSubscription();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error",
        description: "Unable to load projects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewProject = () => {
    if (!subscription.isSubscribed) {
      setShowPaywall(true);
      return;
    }
    navigate("/projects/new");
  };

  const handleDelete = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      toast({
        title: "Project deleted",
        description: "Project has been successfully deleted",
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "Unable to delete project",
        variant: "destructive",
      });
    }
  };

  const handleGenerateClick = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!subscription.isSubscribed) {
      setShowPaywall(true);
      return;
    }
    navigate(`/videos?project=${projectId}`);
  };

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const automationLabels: Record<string, string> = {
    manual: "Manual",
    semi_auto: "Semi-auto",
    full_auto: "Automatic",
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold">Projects</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Manage your projects
            </p>
          </div>
          <Button 
            onClick={handleNewProject} 
            size="sm"
            className="gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Project</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        {/* Projects List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-muted rounded mb-2" />
                      <div className="h-3 w-1/2 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 px-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <FolderKanban className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm mb-1 text-center">
                {searchQuery ? "No results" : "No projects"}
              </h3>
              <p className="text-muted-foreground text-xs text-center mb-4 max-w-xs">
                {searchQuery
                  ? "No projects match your search"
                  : "Create your first project to start"}
              </p>
              {!searchQuery && (
                <Button onClick={handleNewProject} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" />
                  Create Project
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      {/* Logo */}
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center text-white font-bold text-base shrink-0 cursor-pointer"
                        style={{ backgroundColor: project.theme_color }}
                        onClick={() => navigate(`/projects/${project.id}`)}
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
                      
                      {/* Content */}
                      <div 
                        className="flex-1 min-w-0 cursor-pointer" 
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <h3 className="font-semibold text-sm truncate">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {project.instagram_enabled && (
                            <Instagram className="h-3 w-3 text-muted-foreground" />
                          )}
                          {project.facebook_enabled && (
                            <Facebook className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {automationLabels[project.automation_mode]}
                          </span>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border z-50">
                          <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {project.url && (
                            <DropdownMenuItem onClick={() => window.open(project.url!, "_blank")}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Open Website
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(project.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Description - compact */}
                    {project.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-2">
                        {project.description}
                      </p>
                    )}
                    
                    {/* Bottom row */}
                    <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{project.posts_per_week}/week</span>
                      </div>
                      <Button
                        size="sm"
                        className="gradient-primary gap-1.5 h-7 px-2.5 text-xs"
                        onClick={(e) => handleGenerateClick(project.id, e)}
                      >
                        <Sparkles className="h-3 w-3" />
                        AI Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="projects"
        requiredPlan="starter"
      />
    </>
  );
};

export default Projects;
