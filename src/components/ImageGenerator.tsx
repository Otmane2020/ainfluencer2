import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductSelector } from "@/components/ProductSelector";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import {
  COMMERCIAL_PRODUCTS,
  CommercialProduct,
} from "@/lib/commercialProducts";
import { VideoScenario } from "@/lib/videoScenarios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Project {
  id: string;
  name: string;
  description: string | null;
  theme_color: string | null;
  url: string | null;
}

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: Date;
}

interface ImageGeneratorProps {
  onImageGenerated: (image: GeneratedImage) => void;
}

// Filter commercial products for images only
const IMAGE_PRODUCTS = COMMERCIAL_PRODUCTS.filter((p) => p.category === "image");

const PREFS_KEY = "image_generator_prefs";

interface StoredPrefs {
  productId?: string;
}

const loadPrefs = (): StoredPrefs => {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const savePrefs = (prefs: Partial<StoredPrefs>) => {
  try {
    const current = loadPrefs();
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...prefs }));
  } catch {
    // Ignore storage errors
  }
};

export const ImageGenerator = ({ onImageGenerated }: ImageGeneratorProps) => {
  const storedPrefs = loadPrefs();
  const defaultProduct =
    IMAGE_PRODUCTS.find((p) => p.id === storedPrefs.productId) ||
    IMAGE_PRODUCTS.find((p) => p.id === "ai-image-pro") ||
    IMAGE_PRODUCTS[0];

  const [prompt, setPrompt] = useState("");
  const [selectedProduct, setSelectedProductState] = useState<CommercialProduct>(defaultProduct);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const { toast } = useToast();

  // Scenario state
  const [selectedSector, setSelectedSector] = useState<VideoScenario | undefined>();
  const [selectedStyle, setSelectedStyle] = useState<VideoScenario | undefined>();
  const [selectedTone, setSelectedTone] = useState<VideoScenario | undefined>();

  const setSelectedProduct = (product: CommercialProduct) => {
    setSelectedProductState(product);
    savePrefs({ productId: product.id });
  };

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, description, theme_color, url")
        .order("name");
      if (data) setProjects(data);
    };
    fetchProjects();
  }, []);

  const generateAIPrompt = async (project: Project) => {
    setIsGeneratingPrompt(true);
    setProjectSelectorOpen(false);

    try {
      // First, scrape the project URL if available
      let scrapedContent: string | undefined;
      if (project.url) {
        try {
          const { data: scrapeData } = await supabase.functions.invoke("scrape-project-url", {
            body: { url: project.url },
          });
          scrapedContent = scrapeData?.markdown?.slice(0, 3000);
        } catch (scrapeError) {
          console.log("Scraping skipped:", scrapeError);
        }
      }

      // Use suggest-content for consistent prompt generation
      const { data, error } = await supabase.functions.invoke("suggest-content", {
        body: {
          projectId: project.id,
          projectName: project.name,
          projectDescription: project.description || project.name,
          projectUrl: project.url,
          scrapedContent,
          contentType: "image_prompt",
          productName: selectedProduct.name,
          productCategory: selectedProduct.category,
          sectorId: selectedSector?.id,
          styleId: selectedStyle?.id,
          toneId: selectedTone?.id,
        },
      });

      if (error) throw error;

      const suggestions = data?.suggestions;
      if (!suggestions || suggestions.length === 0) {
        throw new Error("No prompts received");
      }

      setPrompt(suggestions[0].content);

      toast({
        title: "Prompt generated! ✨",
        description: `${selectedSector?.name || ""} ${selectedStyle?.name || ""} ${selectedTone?.name || ""}`.trim() || project.name,
      });
    } catch (error) {
      console.error("AI prompt generation error:", error);
      toast({
        title: "Generation error",
        description: "Unable to generate prompt. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Please describe the image you want to generate",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    toast({
      title: `Generating ${selectedProduct.name}...`,
      description: "Creating your AI image",
    });

    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: prompt.trim(),
          productId: selectedProduct.id,
          sectorId: selectedSector?.id,
          styleId: selectedStyle?.id,
          toneId: selectedTone?.id,
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          url: data.imageUrl,
          prompt: prompt.trim(),
          createdAt: new Date(),
        };

        onImageGenerated(newImage);

        toast({
          title: "Image generated! 🎨",
          description: "Your AI image is ready",
        });
      } else {
        throw new Error("No image URL received");
      }
    } catch (error: any) {
      console.error("Image generation error:", error);
      
      // Handle rate limiting
      if (error?.message?.includes("429") || error?.status === 429) {
        toast({
          title: "Rate limit reached",
          description: "Please wait a moment and try again",
          variant: "destructive",
        });
      } else if (error?.message?.includes("402") || error?.status === 402) {
        toast({
          title: "Credits required",
          description: "Please add credits to continue generating",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Generation error",
          description: "Unable to generate image. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-4 sm:p-6"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <ImageIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">AI Image Creator</h3>
            <p className="text-xs text-muted-foreground">
              Create stunning images with AI
            </p>
          </div>
        </div>

        {/* Scenario Selector */}
        <ScenarioSelector
          selectedSector={selectedSector}
          selectedStyle={selectedStyle}
          selectedTone={selectedTone}
          onSectorChange={setSelectedSector}
          onStyleChange={setSelectedStyle}
          onToneChange={setSelectedTone}
        />
      </div>

      {/* Quality/Product Selector */}
      <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="mb-4 w-full justify-between">
            <span className="flex items-center gap-2">
              <span className="text-lg">🖼️</span>
              {selectedProduct.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {selectedProduct.salePrice}€{selectedProduct.salePriceUnit}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Select Image Quality</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <ProductSelector
              selectedProduct={selectedProduct}
              onProductChange={(p) => {
                setSelectedProduct(p);
                setShowProductSelector(false);
              }}
              category="image"
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Prompt Workspace */}
      <div className="space-y-3">
        <div className="relative">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your image in detail... e.g., 'A modern coffee shop interior with warm lighting, minimalist decor, and plants'"
            className="min-h-[120px] pr-12 resize-none"
            disabled={isGenerating}
          />

          {/* AI Sparkles Button */}
          <Popover open={projectSelectorOpen} onOpenChange={setProjectSelectorOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
                disabled={isGeneratingPrompt || isGenerating}
              >
                {isGeneratingPrompt ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="text-xs font-medium mb-2 text-muted-foreground">
                Generate from project context
              </div>
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => generateAIPrompt(project)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <div
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: project.theme_color || "#6366f1" }}
                      />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">
                      No projects yet. Create one first.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        {/* Character count */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{prompt.length} characters</span>
          <span>Recommended: 50-200 characters</span>
        </div>
      </div>

      {/* Generate Button */}
      <Button
        onClick={generateImage}
        disabled={isGenerating || !prompt.trim()}
        className="mt-4 w-full gradient-primary text-white"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Generate Image
          </>
        )}
      </Button>
    </motion.div>
  );
};

export default ImageGenerator;
