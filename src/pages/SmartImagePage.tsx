import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Sparkles, Play, Loader2, CheckCircle, XCircle, Image as ImageIcon, Zap, Star, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TEXT_MODELS, IMAGE_MODELS, type ImageModel, getCostLevelColor, getCostLevelLabel } from "@/lib/imageModels";
import { SEOHead } from "@/components/seo/SEOHead";

interface GenerationResult {
  modelId: string;
  status: "idle" | "generating" | "success" | "error";
  imageUrl?: string;
  error?: string;
  duration?: number;
}

interface Project {
  id: string;
  name: string;
  theme_color: string;
  marketing_context: any;
  ai_context_summary: string | null;
}

const SmartImagePage = () => {
  const [prompt, setPrompt] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("none");
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, GenerationResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const { toast } = useToast();

  // Only text-to-image models for this page
  const availableModels = TEXT_MODELS;

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color, marketing_context, ai_context_summary")
      .order("name");
    if (data) setProjects(data as Project[]);
  };

  const toggleModel = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const selectAll = () => {
    setSelectedModels(availableModels.map(m => m.id));
  };

  const selectNone = () => {
    setSelectedModels([]);
  };

  const selectCheapest = () => {
    setSelectedModels(
      availableModels
        .filter(m => m.costLevel === "ultra-low" || m.costLevel === "low")
        .map(m => m.id)
    );
  };

  const generateSmartPrompt = async () => {
    if (selectedProject === "none") return;
    const project = projects.find(p => p.id === selectedProject);
    if (!project) return;

    setIsGeneratingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-content", {
        body: {
          projectId: selectedProject,
          type: "image-prompt",
          context: project.ai_context_summary || project.name,
        },
      });

      if (error) throw error;

      const suggestion = data?.suggestion || data?.prompt || data?.text;
      if (suggestion) {
        setPrompt(suggestion);
        toast({ title: "Prompt generated!", description: "AI created a prompt from your project" });
      } else {
        // Fallback: build a basic prompt from project context
        const ctx = project.marketing_context;
        const products = ctx?.products || ctx?.services || [];
        const productList = Array.isArray(products) ? products.slice(0, 3).join(", ") : "";
        const fallbackPrompt = `Professional advertising photo for ${project.name}${productList ? ` showcasing ${productList}` : ""}. High-end commercial photography, dramatic lighting, premium brand aesthetic.`;
        setPrompt(fallbackPrompt);
        toast({ title: "Prompt generated!", description: "Created from project context" });
      }
    } catch (err) {
      // Fallback on error
      const fallbackPrompt = `Professional advertising photo for ${project.name}. High-end commercial photography, dramatic lighting, premium brand aesthetic.`;
      setPrompt(fallbackPrompt);
      toast({ title: "Prompt generated!", description: "Created from project name" });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const generateForModel = async (modelId: string, fullPrompt: string) => {
    setResults(prev => ({
      ...prev,
      [modelId]: { modelId, status: "generating" },
    }));

    const startTime = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: fullPrompt,
          modelId,
          aspectRatio,
          skipCreditDeduction: false,
        },
      });

      const duration = Math.round((Date.now() - startTime) / 1000);

      if (error) throw error;

      if (data?.imageUrl) {
        setResults(prev => ({
          ...prev,
          [modelId]: { modelId, status: "success", imageUrl: data.imageUrl, duration },
        }));
      } else {
        throw new Error(data?.error || "No image returned");
      }
    } catch (err: any) {
      const duration = Math.round((Date.now() - startTime) / 1000);
      setResults(prev => ({
        ...prev,
        [modelId]: { modelId, status: "error", error: err.message || String(err), duration },
      }));
    }
  };

  const runGeneration = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt required", description: "Enter a prompt to generate images", variant: "destructive" });
      return;
    }
    if (selectedModels.length === 0) {
      toast({ title: "No models selected", description: "Select at least one model", variant: "destructive" });
      return;
    }

    setIsRunning(true);

    // Build prompt with project context
    let fullPrompt = prompt;
    if (selectedProject !== "none") {
      const project = projects.find(p => p.id === selectedProject);
      if (project?.ai_context_summary) {
        fullPrompt = `Brand context: ${project.ai_context_summary}\n\n${prompt}`;
      }
    }

    // Run all models in parallel (max 3 concurrent)
    const queue = [...selectedModels];
    const concurrency = 3;
    const running: Promise<void>[] = [];

    const runNext = async (): Promise<void> => {
      const modelId = queue.shift();
      if (!modelId) return;
      await generateForModel(modelId, fullPrompt);
      await runNext();
    };

    for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
      running.push(runNext());
    }

    await Promise.all(running);
    setIsRunning(false);

    toast({ title: "Generation complete", description: `${selectedModels.length} models tested` });
  };

  const totalCredits = selectedModels.reduce((sum, id) => {
    const model = availableModels.find(m => m.id === id);
    return sum + (model?.credits || 0);
  }, 0);

  const successCount = Object.values(results).filter(r => r.status === "success").length;
  const errorCount = Object.values(results).filter(r => r.status === "error").length;

  return (
    <>
      <SEOHead
        title="Smart AI Image - Test All Models"
        description="Test and compare all AI image generation models side by side. Find the best model for your brand."
      />
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Smart AI Image
          </h1>
          <p className="text-muted-foreground">
            Test all image models with one prompt — compare quality, speed & cost
          </p>
        </div>

        {/* Controls */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Project Selector */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Project context</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border z-50">
                    <SelectItem value="none">No project (raw prompt)</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.theme_color }} />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <label className="text-sm font-medium text-muted-foreground mb-1 block">Aspect Ratio</label>
                <Select value={aspectRatio} onValueChange={setAspectRatio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border border-border z-50">
                    <SelectItem value="1:1">1:1 Square</SelectItem>
                    <SelectItem value="16:9">16:9 Landscape</SelectItem>
                    <SelectItem value="9:16">9:16 Portrait</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Prompt */}
            <div className="relative">
              <Textarea
                placeholder="Describe the image you want to generate across all models..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[80px] resize-none pr-12"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 text-primary hover:bg-primary/10"
                disabled={selectedProject === "none" || isGeneratingPrompt}
                onClick={generateSmartPrompt}
                title="Auto-generate prompt from project"
              >
                {isGeneratingPrompt ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </Button>
            </div>
            {selectedProject === "none" && (
              <p className="text-xs text-muted-foreground -mt-2">
                Select a project above to enable AI prompt generation ✨
              </p>
            )}

            {/* Model Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Select Models ({selectedModels.length}/{availableModels.length})</label>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll}>All</Button>
                  <Button variant="ghost" size="sm" onClick={selectCheapest}>Cheapest</Button>
                  <Button variant="ghost" size="sm" onClick={selectNone}>None</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {availableModels.map(model => {
                  const isSelected = selectedModels.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      className={`flex flex-col p-2.5 rounded-lg border-2 text-left transition-all text-xs ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold truncate">{model.name}</span>
                        {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate mb-1">{model.provider === "kie" ? "KIE API" : model.provider === "lovable" ? "Lovable AI" : model.provider === "openai" ? "OpenAI" : model.provider}</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getCostLevelColor(model.costLevel)}`}>
                          {model.credits} cr
                        </Badge>
                        <span className="text-muted-foreground">{"⭐".repeat(Math.min(model.quality, 5))}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedModels.length} models × ~{totalCredits.toFixed(1)} credits total
              </div>
              <Button
                onClick={runGeneration}
                disabled={isRunning || !prompt.trim() || selectedModels.length === 0}
                variant="gradient"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Generate All ({selectedModels.length})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {Object.keys(results).length > 0 && (
          <div className="flex gap-3 text-sm">
            <Badge variant="outline" className="gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" /> {successCount} success
            </Badge>
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3 text-red-500" /> {errorCount} failed
            </Badge>
          </div>
        )}

        {/* Results Grid */}
        {Object.keys(results).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {selectedModels.map(modelId => {
              const model = availableModels.find(m => m.id === modelId);
              const result = results[modelId];
              if (!model || !result) return null;

              return (
                <motion.div
                  key={modelId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="overflow-hidden">
                    {/* Image Area */}
                    <div className="aspect-square bg-muted flex items-center justify-center relative">
                      {result.status === "generating" && (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <span className="text-xs">Generating...</span>
                        </div>
                      )}
                      {result.status === "success" && result.imageUrl && (
                        <img
                          src={result.imageUrl}
                          alt={`Generated by ${model.name}`}
                          className="w-full h-full object-contain"
                        />
                      )}
                      {result.status === "error" && (
                        <div className="flex flex-col items-center gap-2 text-destructive p-4">
                          <XCircle className="h-8 w-8" />
                          <span className="text-xs text-center">{result.error?.slice(0, 80)}</span>
                        </div>
                      )}
                      {result.status === "idle" && (
                        <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                      )}
                    </div>

                    {/* Model Info */}
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm truncate">{model.name}</span>
                        {result.status === "success" && (
                          <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getCostLevelColor(model.costLevel)}`}>
                          {model.credits} cr
                        </Badge>
                        {result.duration !== undefined && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {result.duration}s
                          </span>
                        )}
                        <span>{model.usage}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default SmartImagePage;
