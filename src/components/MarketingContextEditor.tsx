import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  Plus,
  X,
  Palette,
  Users,
  Package,
  Target,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface VisualIdentity {
  primary_color: string;
  secondary_colors: string[];
  aesthetic_style: string;
  logo_description: string;
  logo_url?: string;
  mood: string;
  fonts?: string[];
  color_scheme?: string;
}

interface BrandPersonality {
  tone: string;
  values: string[];
  voice_keywords: string[];
}

interface TargetAudience {
  primary: string;
  demographics: string;
  pain_points: string[];
  desires: string[];
}

interface ProductService {
  name: string;
  description: string;
  key_benefit: string;
}

interface ContentGuidelines {
  banned_terms: string[];
  preferred_terms: string[];
  visual_banned: string[];
  visual_preferred: string[];
}

export interface MarketingContext {
  visual_identity: VisualIdentity;
  brand_personality: BrandPersonality;
  target_audience: TargetAudience;
  products_services: ProductService[];
  competitive_positioning: string;
  content_guidelines: ContentGuidelines;
}

interface MarketingContextEditorProps {
  projectId: string;
  projectName: string;
  projectUrl?: string | null;
  projectDescription?: string | null;
  projectLogoUrl?: string | null;
  scrapedMarkdown?: string | null;
  initialContext?: MarketingContext | null;
  onSave: (context: MarketingContext) => Promise<void>;
}

const DEFAULT_CONTEXT: MarketingContext = {
  visual_identity: {
    primary_color: "#3B82F6",
    secondary_colors: [],
    aesthetic_style: "modern-minimal",
    logo_description: "",
    logo_url: "",
    mood: "professional",
    fonts: [],
    color_scheme: "light",
  },
  brand_personality: {
    tone: "professional",
    values: [],
    voice_keywords: [],
  },
  target_audience: {
    primary: "",
    demographics: "",
    pain_points: [],
    desires: [],
  },
  products_services: [],
  competitive_positioning: "",
  content_guidelines: {
    banned_terms: [],
    preferred_terms: [],
    visual_banned: [],
    visual_preferred: [],
  },
};

const AESTHETIC_STYLES = [
  { value: "modern-minimal", label: "Modern Minimal" },
  { value: "bold-vibrant", label: "Bold & Vibrant" },
  { value: "luxurious-elegant", label: "Luxurious & Elegant" },
  { value: "playful-fun", label: "Playful & Fun" },
  { value: "corporate-professional", label: "Corporate Professional" },
  { value: "organic-natural", label: "Organic & Natural" },
  { value: "tech-futuristic", label: "Tech & Futuristic" },
  { value: "vintage-retro", label: "Vintage & Retro" },
];

const TONE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "friendly-expert", label: "Friendly Expert" },
  { value: "casual-approachable", label: "Casual & Approachable" },
  { value: "authoritative", label: "Authoritative" },
  { value: "playful", label: "Playful" },
  { value: "inspiring", label: "Inspiring" },
  { value: "urgent", label: "Urgent" },
  { value: "luxurious", label: "Luxurious" },
];

const MOOD_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "approachable", label: "Approachable" },
  { value: "energetic", label: "Energetic" },
  { value: "calm", label: "Calm & Serene" },
  { value: "premium", label: "Premium" },
  { value: "innovative", label: "Innovative" },
  { value: "trustworthy", label: "Trustworthy" },
  { value: "creative", label: "Creative" },
];

// Deep merge helper to ensure all nested objects have defaults
const mergeWithDefaults = (partial: Partial<MarketingContext> | null | undefined): MarketingContext => {
  if (!partial) return DEFAULT_CONTEXT;
  
  return {
    visual_identity: {
      ...DEFAULT_CONTEXT.visual_identity,
      ...(partial.visual_identity || {}),
    },
    brand_personality: {
      ...DEFAULT_CONTEXT.brand_personality,
      ...(partial.brand_personality || {}),
    },
    target_audience: {
      ...DEFAULT_CONTEXT.target_audience,
      ...(partial.target_audience || {}),
    },
    products_services: partial.products_services || DEFAULT_CONTEXT.products_services,
    competitive_positioning: partial.competitive_positioning || DEFAULT_CONTEXT.competitive_positioning,
    content_guidelines: {
      ...DEFAULT_CONTEXT.content_guidelines,
      ...(partial.content_guidelines || {}),
    },
  };
};

export const MarketingContextEditor = ({
  projectId,
  projectName,
  projectUrl,
  projectDescription,
  projectLogoUrl,
  scrapedMarkdown,
  initialContext,
  onSave,
}: MarketingContextEditorProps) => {
  const { toast } = useToast();
  const [context, setContext] = useState<MarketingContext>(() =>
    mergeWithDefaults(initialContext)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [activeTagInput, setActiveTagInput] = useState<string | null>(null);

  // Sync project logo URL to marketing context
  useEffect(() => {
    if (projectLogoUrl && projectLogoUrl !== context.visual_identity.logo_url) {
      setContext((prev) => ({
        ...prev,
        visual_identity: {
          ...prev.visual_identity,
          logo_url: projectLogoUrl,
        },
      }));
    }
  }, [projectLogoUrl]);

  // Track completion percentage
  const getCompletionPercentage = (): number => {
    let filled = 0;
    let total = 10;

    if (context.visual_identity?.primary_color) filled++;
    if (context.visual_identity?.logo_description) filled++;
    if (context.brand_personality?.values?.length > 0) filled++;
    if (context.brand_personality?.voice_keywords?.length > 0) filled++;
    if (context.target_audience?.primary) filled++;
    if (context.target_audience?.pain_points?.length > 0) filled++;
    if (context.target_audience?.desires?.length > 0) filled++;
    if (context.products_services?.length > 0) filled++;
    if (context.competitive_positioning) filled++;
    if (context.content_guidelines?.preferred_terms?.length > 0) filled++;

    return Math.round((filled / total) * 100);
  };

  const handleGenerateWithAI = async () => {
    if (!scrapedMarkdown && !projectName) {
      toast({
        title: "No content available",
        description: "Please add a website URL to your project first for AI analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-marketing-context`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectName,
            projectUrl,
            scrapedMarkdown,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate context");
      }

      const data = await response.json();
      if (data.context) {
        setContext(data.context);
        toast({
          title: "Context generated ✓",
          description: "Review and adjust the generated marketing context.",
        });
      }
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(context);
      toast({
        title: "Context saved ✓",
        description: "Your marketing context has been updated.",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = (field: string, value: string) => {
    if (!value.trim()) return;
    const path = field.split(".");
    
    setContext((prev) => {
      const updated = { ...prev };
      let target: any = updated;
      
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
      }
      
      const arrayField = path[path.length - 1];
      if (!target[arrayField].includes(value.trim())) {
        target[arrayField] = [...target[arrayField], value.trim()];
      }
      
      return updated;
    });
    setNewTag("");
  };

  const removeTag = (field: string, index: number) => {
    const path = field.split(".");
    
    setContext((prev) => {
      const updated = { ...prev };
      let target: any = updated;
      
      for (let i = 0; i < path.length - 1; i++) {
        target = target[path[i]];
      }
      
      const arrayField = path[path.length - 1];
      target[arrayField] = target[arrayField].filter((_: string, i: number) => i !== index);
      
      return updated;
    });
  };

  const addProduct = () => {
    setContext((prev) => ({
      ...prev,
      products_services: [
        ...prev.products_services,
        { name: "", description: "", key_benefit: "" },
      ],
    }));
  };

  const updateProduct = (index: number, field: keyof ProductService, value: string) => {
    setContext((prev) => ({
      ...prev,
      products_services: prev.products_services.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const removeProduct = (index: number) => {
    setContext((prev) => ({
      ...prev,
      products_services: prev.products_services.filter((_, i) => i !== index),
    }));
  };

  const TagInput = ({ field, placeholder }: { field: string; placeholder: string }) => {
    const path = field.split(".");
    let tags: string[] = context as any;
    for (const p of path) {
      tags = tags?.[p as keyof typeof tags] as any;
    }
    // Ensure tags is always an array
    if (!Array.isArray(tags)) {
      tags = [];
    }

    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag: string, i: number) => (
            <Badge key={i} variant="secondary" className="gap-1 pr-1">
              {tag}
              <button
                onClick={() => removeTag(field, i)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={activeTagInput === field ? newTag : ""}
            onChange={(e) => {
              setActiveTagInput(field);
              setNewTag(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag(field, newTag);
              }
            }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => addTag(field, newTag)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  const completion = getCompletionPercentage();

  return (
    <div className="space-y-6">
      {/* Header with AI Generate and Save */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {completion === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <span className="text-sm font-medium">{completion}% complete</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateWithAI}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate with AI
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Context
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-6">
          {/* Project Info - Name, URL, Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Project Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <p className="font-medium">{projectName || "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Website</Label>
                  {projectUrl ? (
                    <a 
                      href={projectUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm truncate block"
                    >
                      {projectUrl}
                    </a>
                  ) : (
                    <p className="text-muted-foreground text-sm">—</p>
                  )}
                </div>
              </div>
              {projectDescription && (
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="text-sm text-muted-foreground">{projectDescription}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Visual Identity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4" />
                Visual Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={context.visual_identity.primary_color}
                      onChange={(e) =>
                        setContext((prev) => ({
                          ...prev,
                          visual_identity: {
                            ...prev.visual_identity,
                            primary_color: e.target.value,
                          },
                        }))
                      }
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={context.visual_identity.primary_color}
                      onChange={(e) =>
                        setContext((prev) => ({
                          ...prev,
                          visual_identity: {
                            ...prev.visual_identity,
                            primary_color: e.target.value,
                          },
                        }))
                      }
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Aesthetic Style</Label>
                  <Select
                    value={context.visual_identity.aesthetic_style}
                    onValueChange={(value) =>
                      setContext((prev) => ({
                        ...prev,
                        visual_identity: {
                          ...prev.visual_identity,
                          aesthetic_style: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AESTHETIC_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          {style.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secondary Colors</Label>
                <TagInput
                  field="visual_identity.secondary_colors"
                  placeholder="Add color (e.g., #1E3A8A)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo Description</Label>
                  <Textarea
                    value={context.visual_identity.logo_description}
                    onChange={(e) =>
                      setContext((prev) => ({
                        ...prev,
                        visual_identity: {
                          ...prev.visual_identity,
                          logo_description: e.target.value,
                        },
                      }))
                    }
                    placeholder="Describe your logo visually..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Brand Mood</Label>
                  <Select
                    value={context.visual_identity.mood}
                    onValueChange={(value) =>
                      setContext((prev) => ({
                        ...prev,
                        visual_identity: {
                          ...prev.visual_identity,
                          mood: value,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOOD_OPTIONS.map((mood) => (
                        <SelectItem key={mood.value} value={mood.value}>
                          {mood.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Logo URL - extracted from Firecrawl */}
              <div className="space-y-2">
                <Label>Logo URL</Label>
                {projectLogoUrl ? (
                  <div className="flex gap-3 items-center p-3 rounded-lg border bg-muted/30">
                    <img
                      src={projectLogoUrl}
                      alt="Brand logo"
                      className="h-12 w-12 rounded border object-contain bg-white"
                      onError={(e) => {
                        e.currentTarget.src = "/favicon.ico";
                      }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium truncate max-w-xs">{projectLogoUrl.split('/').pop()}</p>
                      <p className="text-xs text-muted-foreground">
                        Uploaded logo. Edit in project Identity tab.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={context.visual_identity.logo_url || ""}
                        onChange={(e) =>
                          setContext((prev) => ({
                            ...prev,
                            visual_identity: {
                              ...prev.visual_identity,
                              logo_url: e.target.value,
                            },
                          }))
                        }
                        placeholder="https://example.com/logo.png"
                        className="flex-1"
                      />
                      {context.visual_identity.logo_url && (
                        <img
                          src={context.visual_identity.logo_url}
                          alt="Brand logo"
                          className="h-10 w-10 rounded border object-contain bg-white"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a logo in the Identity tab, or paste a URL here.
                    </p>
                  </>
                )}
              </div>

              {/* Fonts - extracted from Firecrawl */}
              <div className="space-y-2">
                <Label>Brand Fonts</Label>
                <TagInput
                  field="visual_identity.fonts"
                  placeholder="Add font (e.g., Inter, Roboto)"
                />
                <p className="text-xs text-muted-foreground">
                  Typography detected from your website
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Brand Personality */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Brand Personality
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Brand Tone</Label>
                <Select
                  value={context.brand_personality.tone}
                  onValueChange={(value) =>
                    setContext((prev) => ({
                      ...prev,
                      brand_personality: {
                        ...prev.brand_personality,
                        tone: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Brand Values</Label>
                <TagInput
                  field="brand_personality.values"
                  placeholder="Add value (e.g., innovation, reliability)"
                />
              </div>

              <div className="space-y-2">
                <Label>Voice Keywords</Label>
                <TagInput
                  field="brand_personality.voice_keywords"
                  placeholder="Add keyword (e.g., smart, effortless)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Target Audience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Audience</Label>
                <Textarea
                  value={context.target_audience.primary}
                  onChange={(e) =>
                    setContext((prev) => ({
                      ...prev,
                      target_audience: {
                        ...prev.target_audience,
                        primary: e.target.value,
                      },
                    }))
                  }
                  placeholder="Who is your ideal customer? (e.g., Small business owners managing their online presence)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Demographics</Label>
                <Input
                  value={context.target_audience.demographics}
                  onChange={(e) =>
                    setContext((prev) => ({
                      ...prev,
                      target_audience: {
                        ...prev.target_audience,
                        demographics: e.target.value,
                      },
                    }))
                  }
                  placeholder="Age, profession, interests (e.g., 35-55, entrepreneurs, tech-curious)"
                />
              </div>

              <div className="space-y-2">
                <Label>Pain Points</Label>
                <TagInput
                  field="target_audience.pain_points"
                  placeholder="Add pain point (e.g., No time for marketing)"
                />
              </div>

              <div className="space-y-2">
                <Label>Desires</Label>
                <TagInput
                  field="target_audience.desires"
                  placeholder="Add desire (e.g., More customers)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products & Services */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Products & Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {context.products_services.map((product, index) => (
                <div key={index} className="space-y-3 p-3 border rounded-lg relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => removeProduct(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <div className="space-y-2">
                    <Label>Product/Service Name</Label>
                    <Input
                      value={product.name}
                      onChange={(e) => updateProduct(index, "name", e.target.value)}
                      placeholder="e.g., AI Review Responder"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={product.description}
                      onChange={(e) => updateProduct(index, "description", e.target.value)}
                      placeholder="e.g., Automatic responses to Google reviews"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Key Benefit</Label>
                    <Input
                      value={product.key_benefit}
                      onChange={(e) => updateProduct(index, "key_benefit", e.target.value)}
                      placeholder="e.g., Save 5 hours/week"
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addProduct} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Product/Service
              </Button>
            </CardContent>
          </Card>

          {/* Competitive Positioning */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4" />
                Competitive Positioning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={context.competitive_positioning}
                onChange={(e) =>
                  setContext((prev) => ({
                    ...prev,
                    competitive_positioning: e.target.value,
                  }))
                }
                placeholder="What makes you different? (e.g., The only AI tool focused 100% on Google Business Profile automation)"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Content Guidelines */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Content Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-red-500">Banned Terms</Label>
                  <TagInput
                    field="content_guidelines.banned_terms"
                    placeholder="Words to avoid"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-green-500">Preferred Terms</Label>
                  <TagInput
                    field="content_guidelines.preferred_terms"
                    placeholder="Words to use"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-red-500">Visuals to Avoid</Label>
                  <TagInput
                    field="content_guidelines.visual_banned"
                    placeholder="e.g., generic stock photos"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-green-500">Preferred Visuals</Label>
                  <TagInput
                    field="content_guidelines.visual_preferred"
                    placeholder="e.g., real customers"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default MarketingContextEditor;
