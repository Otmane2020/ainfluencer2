import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Sparkles, Loader2, Plus, ImageIcon } from "lucide-react";
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

/**
 * "image"    → visual image prompt (suggest-content)
 * "motion"   → camera/motion direction (generate-motion-prompt), image-aware
 * "voice"    → spoken voiceover script (generate-motion-script)
 * "negative" → exclusions / negative prompt (generate-motion-prompt, task=negative)
 */
export type PromptMode = "image" | "motion" | "voice" | "negative";

interface ProjectPromptButtonProps {
  mode: PromptMode;
  onPromptGenerated: (prompt: string) => void;
  disabled?: boolean;
  /** Optional source image used as multimodal context (motion / negative). */
  imageUrl?: string;
  /** "pill" shows a compact labelled button, "icon" a bare sparkles icon. */
  variant?: "pill" | "icon";
  className?: string;
}

/**
 * Sparkles AI-assist control. Only fills the target field — it never starts a
 * final generation.
 */
export function ProjectPromptButton({
  mode,
  onPromptGenerated,
  disabled,
  imageUrl,
  variant = "pill",
  className,
}: ProjectPromptButtonProps) {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [open, setOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const usableImage = imageUrl?.trim().startsWith("http") ? imageUrl.trim() : undefined;
  const withImage = Boolean(usableImage) && (mode === "motion" || mode === "negative");
  const label = withImage ? "Generate with image" : "Generate with AI";

  useEffect(() => {
    let active = true;
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select(
          "id, name, description, theme_color, url, detected_language, avatar_url, scraped_markdown, scraped_data, marketing_context",
        )
        .order("name");
      if (active) setProjects((data as Project[]) || []);
    };
    fetchProjects();
    return () => {
      active = false;
    };
  }, []);

  const generate = async (project: Project) => {
    setGeneratingId(project.id);
    try {
      const scrapedContent = project.scraped_markdown?.slice(0, 3000);
      const detectedLanguage = project.detected_language || "en";
      const base = {
        projectId: project.id,
        projectName: project.name,
        projectDescription: project.description || project.name,
        projectUrl: project.url,
        scrapedContent,
        marketingContext: project.marketing_context,
        detectedLanguage,
      };

      let prompt: string | undefined;

      if (mode === "image") {
        const { data, error } = await supabase.functions.invoke("suggest-content", {
          body: {
            ...base,
            contentType: "image_prompt",
            productCategory: "image",
            logoUrl: project.avatar_url,
            services: project.scraped_data?.services,
          },
        });
        if (error) throw error;
        prompt = data?.suggestions?.[0]?.content;
      } else if (mode === "voice") {
        const { data, error } = await supabase.functions.invoke("generate-motion-script", {
          body: { ...base, style: "influencer" },
        });
        if (error) throw error;
        prompt = data?.script;
      } else {
        const { data, error } = await supabase.functions.invoke("generate-motion-prompt", {
          body: { ...base, imageUrl: usableImage, task: mode === "negative" ? "negative" : "motion" },
        });
        if (error) throw error;
        prompt = data?.prompt;
      }

      if (!prompt) throw new Error("No suggestion received");
      onPromptGenerated(prompt.trim());
      setOpen(false);
      toast({ title: "Field filled ✨", description: project.name });
    } catch (e) {
      toast({
        title: "AI assist failed",
        description: (e as Error).message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const hasProjects = (projects?.length ?? 0) > 0;
  const busy = generatingId !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === "icon" ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 shrink-0 ${className ?? ""}`}
            disabled={disabled}
            title={label}
            aria-label={label}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            aria-label={label}
            className={`h-7 shrink-0 gap-1.5 rounded-full border-primary/40 bg-primary/10 px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/20 ${className ?? ""}`}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : withImage ? (
              <ImageIcon className="h-3.5 w-3.5" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{label}</span>
            <Sparkles className="h-3.5 w-3.5 sm:hidden" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 max-w-[90vw] p-3" align="end">
        <div className="mb-3 text-sm font-medium">Generate from your project</div>
        {projects === null ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {hasProjects && (
              <ScrollArea className="mb-1 max-h-48">
                <div className="space-y-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => generate(project)}
                      disabled={busy}
                      className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm transition-colors hover:border-border hover:bg-muted disabled:opacity-60"
                    >
                      <div
                        className="h-4 w-4 shrink-0 rounded-full ring-2 ring-primary ring-offset-2 ring-offset-background"
                        style={{ backgroundColor: project.theme_color || "#6366f1" }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{project.name}</span>
                        {project.url && (
                          <span className="block truncate text-xs text-muted-foreground">{project.url}</span>
                        )}
                      </div>
                      {generatingId === project.id && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            {!hasProjects && (
              <p className="px-1 pb-2 text-xs text-muted-foreground">
                Create a project so AI can generate on-brand content for you.
              </p>
            )}
            <button
              onClick={() => navigate("/projects/new")}
              className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Create a new project
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
