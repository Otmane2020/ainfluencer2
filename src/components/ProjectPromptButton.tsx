import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  name: string;
  description: string | null;
  theme_color: string | null;
  url: string | null;
  detected_language: string | null;
  avatar_url: string | null;
  scraped_markdown: string | null;
  marketing_context: any | null;
  scraped_data: { services?: string[] } | null;
}

interface ProjectPromptButtonProps {
  /** Which suggest-content prompt style to request. */
  contentType: "image_prompt" | "video_prompt";
  productCategory: string;
  onPromptGenerated: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Sparkles button that generates a branded prompt from one of the user's
 * projects via the suggest-content edge function. If the user has no
 * project yet, it sends them to create one instead of silently no-oping.
 */
export function ProjectPromptButton({ contentType, productCategory, onPromptGenerated, disabled }: ProjectPromptButtonProps) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [open, setOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, description, theme_color, url, detected_language, avatar_url, scraped_markdown, scraped_data, marketing_context")
        .order("name");
      setProjects((data as Project[]) || []);
    };
    fetchProjects();
  }, []);

  const generate = async (project: Project) => {
    setGeneratingId(project.id);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-content", {
        body: {
          projectId: project.id,
          projectName: project.name,
          projectDescription: project.description || project.name,
          projectUrl: project.url,
          scrapedContent: project.scraped_markdown?.slice(0, 3000),
          contentType,
          productCategory,
          detectedLanguage: project.detected_language || "en",
          logoUrl: project.avatar_url,
          services: project.scraped_data?.services,
          marketingContext: project.marketing_context,
        },
      });
      if (error) throw error;
      const suggestion = data?.suggestions?.[0];
      if (!suggestion?.content) throw new Error("No prompt received");
      onPromptGenerated(suggestion.content);
      setOpen(false);
      toast({ title: "Prompt generated ✨", description: project.name });
    } catch (e) {
      toast({ title: "Generation error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setGeneratingId(null);
    }
  };

  const hasProjects = (projects?.length ?? 0) > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={disabled}
          title="Auto-generate prompt from a project"
        >
          <Sparkles className="h-4 w-4 text-primary" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        {projects === null ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : !hasProjects ? (
          <div className="space-y-3 text-center py-2">
            <p className="text-sm font-medium">No project yet</p>
            <p className="text-xs text-muted-foreground">
              Create a project so AI can generate on-brand prompts for you.
            </p>
            <Button size="sm" className="w-full" onClick={() => navigate("/projects/new")}>
              Create a project
            </Button>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium mb-3">Generate from your project</div>
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => generate(project)}
                    disabled={generatingId !== null}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors border border-transparent hover:border-border disabled:opacity-60"
                  >
                    <div
                      className="h-4 w-4 rounded-full shrink-0 ring-2 ring-offset-2 ring-offset-background ring-primary"
                      style={{ backgroundColor: project.theme_color || "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{project.name}</span>
                      {project.url && (
                        <span className="text-xs text-muted-foreground truncate block">{project.url}</span>
                      )}
                    </div>
                    {generatingId === project.id && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
