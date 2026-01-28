import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Upload,
  Sparkles,
  Camera,
  RotateCcw,
  Eye,
  Focus,
  Home,
  Download,
  Check,
  X,
  Loader2,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

// Shot types configuration
const SHOT_TYPES = [
  { id: "front", label: "Front View", icon: Camera, description: "Direct front-facing shot" },
  { id: "angle45", label: "45° Angle", icon: RotateCcw, description: "Three-quarter angle view" },
  { id: "profile", label: "Side Profile", icon: RotateCcw, description: "Side view of product" },
  { id: "back", label: "Back View", icon: RotateCcw, description: "Rear view of product" },
  { id: "top", label: "Top View", icon: Eye, description: "Bird's eye view" },
  { id: "low_angle", label: "Low Angle", icon: Camera, description: "Dramatic upward angle" },
  { id: "zoom_detail", label: "Detail Close-up", icon: Focus, description: "Macro detail shot" },
];

interface GeneratedImage {
  type: string;
  label: string;
  url: string;
  selected: boolean;
}

export default function ProductShotsPage() {
  // State
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [productTitle, setProductTitle] = useState("");
  const [selectedShotTypes, setSelectedShotTypes] = useState<Set<string>>(
    new Set(["front", "angle45", "profile", "zoom_detail"])
  );
  const [includeLifestyle, setIncludeLifestyle] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setSourceFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSourceImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-extract product name from filename
    if (!productTitle) {
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setProductTitle(name);
    }
  };

  // Toggle shot type selection
  const toggleShotType = (typeId: string) => {
    const newSet = new Set(selectedShotTypes);
    if (newSet.has(typeId)) {
      if (newSet.size > 1) {
        newSet.delete(typeId);
      } else {
        toast.warning("Select at least one shot type");
      }
    } else {
      if (newSet.size < 7) {
        newSet.add(typeId);
      } else {
        toast.warning("Maximum 7 shot types allowed");
      }
    }
    setSelectedShotTypes(newSet);
  };

  // Generate product shots
  const handleGenerate = async () => {
    if (!sourceImage) {
      toast.error("Please upload a product image first");
      return;
    }

    if (selectedShotTypes.size === 0) {
      toast.error("Select at least one shot type");
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setGeneratedImages([]);

    const toastId = toast.loading("Generating product shots...");

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 90));
      }, 500);

      const { data, error } = await supabase.functions.invoke("generate-product-shots", {
        body: {
          sourceImageUrl: sourceImage,
          shotTypes: Array.from(selectedShotTypes),
          productTitle: productTitle || "Product",
          includeLifestyle,
        },
      });

      clearInterval(progressInterval);

      if (error) throw error;

      if (data?.images && data.images.length > 0) {
        const images: GeneratedImage[] = data.images.map((img: any) => ({
          type: img.type,
          label: img.label,
          url: img.url,
          selected: true,
        }));

        setGeneratedImages(images);
        setProgress(100);
        toast.success(`${images.length} product shots generated!`, { id: toastId });
      } else {
        throw new Error("No images generated");
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast.error(error.message || "Failed to generate images", { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (index: number) => {
    setGeneratedImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, selected: !img.selected } : img))
    );
  };

  // Download selected images
  const handleDownloadSelected = async () => {
    const selected = generatedImages.filter((img) => img.selected);
    if (selected.length === 0) {
      toast.error("No images selected");
      return;
    }

    for (const img of selected) {
      try {
        const response = await fetch(img.url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${productTitle || "product"}-${img.type}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Download error:", err);
      }
    }

    toast.success(`Downloaded ${selected.length} image(s)`);
  };

  // Clear all
  const handleClear = () => {
    setSourceImage(null);
    setSourceFile(null);
    setProductTitle("");
    setGeneratedImages([]);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Camera className="h-6 w-6 text-primary" />
          AI Product Shot
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate multiple angles and views from a single product image
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Upload & Settings */}
        <div className="space-y-4">
          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Source Image
              </CardTitle>
              <CardDescription>
                Upload a clear product photo (white background recommended)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed rounded-lg p-6 cursor-pointer
                  transition-colors hover:border-primary/50 hover:bg-primary/5
                  ${sourceImage ? "border-primary" : "border-border"}
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {sourceImage ? (
                  <div className="relative">
                    <img
                      src={sourceImage}
                      alt="Source product"
                      className="max-h-64 mx-auto rounded-lg object-contain"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag & drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {/* Product Title */}
              <div className="space-y-2">
                <Label>Product Name (optional)</Label>
                <Input
                  value={productTitle}
                  onChange={(e) => setProductTitle(e.target.value)}
                  placeholder="e.g., Modern Leather Chair"
                />
              </div>
            </CardContent>
          </Card>

          {/* Shot Types Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                Shot Types
              </CardTitle>
              <CardDescription>
                Select the angles you want to generate ({selectedShotTypes.size}/7)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {SHOT_TYPES.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => toggleShotType(type.id)}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                      transition-all hover:border-primary/50
                      ${selectedShotTypes.has(type.id)
                        ? "border-primary bg-primary/10"
                        : "border-border"
                      }
                    `}
                  >
                    <Checkbox
                      checked={selectedShotTypes.has(type.id)}
                      onCheckedChange={() => toggleShotType(type.id)}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{type.label}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {type.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lifestyle Option */}
              <div
                onClick={() => setIncludeLifestyle(!includeLifestyle)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                  transition-all hover:border-primary/50
                  ${includeLifestyle ? "border-primary bg-primary/10" : "border-border"}
                `}
              >
                <Checkbox
                  checked={includeLifestyle}
                  onCheckedChange={(checked) => setIncludeLifestyle(!!checked)}
                />
                <Home className="h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Lifestyle Scene</p>
                  <p className="text-xs text-muted-foreground">
                    Product in realistic environment
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={!sourceImage || isGenerating}
            className="w-full h-12 text-lg"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                Generate {selectedShotTypes.size + (includeLifestyle ? 1 : 0)} Shots
              </>
            )}
          </Button>

          {/* Progress */}
          {isGenerating && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-center text-muted-foreground">
                Generating product shots... {progress}%
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Generated Results */}
        <Card className="h-fit">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generated Shots
                </CardTitle>
                <CardDescription>
                  {generatedImages.length > 0
                    ? `${generatedImages.filter((i) => i.selected).length} of ${generatedImages.length} selected`
                    : "Your generated images will appear here"}
                </CardDescription>
              </div>
              {generatedImages.length > 0 && (
                <Button
                  onClick={handleDownloadSelected}
                  disabled={generatedImages.filter((i) => i.selected).length === 0}
                  size="sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {generatedImages.length > 0 ? (
              <ScrollArea className="h-[500px] pr-4">
                <div className="grid grid-cols-2 gap-3">
                  {generatedImages.map((img, index) => (
                    <div
                      key={`${img.type}-${index}`}
                      onClick={() => toggleImageSelection(index)}
                      className={`
                        relative group rounded-lg overflow-hidden cursor-pointer
                        border-2 transition-all
                        ${img.selected
                          ? "border-primary ring-2 ring-primary/20"
                          : "border-transparent opacity-60"
                        }
                      `}
                    >
                      <img
                        src={img.url}
                        alt={img.label}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Badge
                        variant="secondary"
                        className="absolute bottom-2 left-2 text-xs"
                      >
                        {img.label}
                      </Badge>
                      <div
                        className={`
                          absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center
                          ${img.selected ? "bg-primary text-primary-foreground" : "bg-muted"}
                        `}
                      >
                        {img.selected ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <Camera className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-center">
                  Upload a product image and click Generate
                  <br />
                  to create multiple angles
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
