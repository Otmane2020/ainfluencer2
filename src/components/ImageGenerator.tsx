import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ImageIcon, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProductSelector } from "@/components/ProductSelector";
import { ScenarioSelector } from "@/components/ScenarioSelector";
import { FormatSelector, ContentFormat, FORMAT_OPTIONS } from "@/components/FormatSelector";
import { BrandOptions, BrandOptionsState } from "@/components/BrandOptions";
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
  detected_language: string | null;
  avatar_url: string | null;
  ai_context_summary: string | null;
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
  format?: ContentFormat;
  brandOptions?: BrandOptionsState;
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
  const [selectedFormat, setSelectedFormatState] = useState<ContentFormat>(storedPrefs.format || "reel");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [brandOptions, setBrandOptionsState] = useState<BrandOptionsState>(
    storedPrefs.brandOptions || { includeLogo: false, includeUrl: false, includeText: false, includeAvatar: false }
  );
  const { toast } = useToast();

  // Scenario state
  const [selectedSector, setSelectedSector] = useState<VideoScenario | undefined>();
  const [selectedStyle, setSelectedStyle] = useState<VideoScenario | undefined>();
  const [selectedTone, setSelectedTone] = useState<VideoScenario | undefined>();

  const setBrandOptions = (options: BrandOptionsState) => {
    setBrandOptionsState(options);
    savePrefs({ brandOptions: options });
  };

  const setSelectedFormat = (format: ContentFormat) => {
    setSelectedFormatState(format);
    savePrefs({ format });
  };

  const setSelectedProduct = (product: CommercialProduct) => {
    setSelectedProductState(product);
    savePrefs({ productId: product.id });
  };

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name, description, theme_color, url, detected_language, avatar_url, ai_context_summary")
        .order("name");
      if (data) setProjects(data as Project[]);
    };
    fetchProjects();
  }, []);

  const generateAIPrompt = async (project: Project) => {
    setIsGeneratingPrompt(true);
    setProjectSelectorOpen(false);
    setSelectedProject(project); // Track the selected project

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
      const formatConfig = FORMAT_OPTIONS.find((f) => f.id === selectedFormat) || FORMAT_OPTIONS[0];
      
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          prompt: prompt.trim(),
          productId: selectedProduct.id,
          format: selectedFormat,
          aspectRatio: formatConfig.aspectRatio,
          width: formatConfig.dimensions.width,
          height: formatConfig.dimensions.height,
          sectorId: selectedSector?.id,
          styleId: selectedStyle?.id,
          toneId: selectedTone?.id,
          includeLogo: brandOptions.includeLogo,
          includeUrl: brandOptions.includeUrl,
          includeText: brandOptions.includeText,
          includeAvatar: brandOptions.includeAvatar,
          overlayText: brandOptions.overlayText,
          brandName: selectedProject?.name,
          projectUrl: selectedProject?.url,
          avatarUrl: selectedProject?.avatar_url,
          aiContextSummary: selectedProject?.ai_context_summary,
          detectedLanguage: selectedProject?.detected_language || "en",
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

      {/* Format, Quality & Brand Options */}
      <div className="flex flex-wrap gap-2 mb-4">
        <FormatSelector
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          compact
        />
        
        <Dialog open={showProductSelector} onOpenChange={setShowProductSelector}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 justify-between">
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
      </div>

      {/* Brand Options */}
      <div className="mb-4">
        <BrandOptions options={brandOptions} onChange={setBrandOptions} compact />
      </div>

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
              <div className="absolute right-2 top-2 flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isGeneratingPrompt || isGenerating}
                >
                  {isGeneratingPrompt ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                </Button>
                <span className="text-[10px] text-center text-muted-foreground">AI</span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="text-sm font-medium mb-3">
                Generate from your project
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                AI will create a visual prompt showcasing your brand, products, and style based on your project's website content.
              </p>
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => generateAIPrompt(project)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors border border-transparent hover:border-border"
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
                    </button>
                  ))}
                  {projects.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2 text-center">
                      No projects yet. Create one to generate branded content.
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
