import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, FileText, Palette, Share2, 
  ArrowRight, ArrowLeft, Loader2, Sparkles, 
  Instagram, Facebook, Linkedin, Upload,
  Check
} from "lucide-react";

// TikTok icon component
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { WizardProgress, WizardStep as WizardStepType } from "@/components/wizard/WizardProgress";
import { WizardStep, WizardStepContainer } from "@/components/wizard/WizardStep";

// Validation schema
const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  theme_color: z.string().default("#F97316"),
  instagram_enabled: z.boolean().default(true),
  facebook_enabled: z.boolean().default(true),
  youtube_enabled: z.boolean().default(false),
  linkedin_enabled: z.boolean().default(false),
  tiktok_enabled: z.boolean().default(false),
  posts_per_week: z.number().min(1).max(14).default(3),
  automation_mode: z.enum(["manual", "semi_auto", "full_auto"]).default("semi_auto"),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// Step configuration - removed Content step since campaigns handle volume
const wizardSteps: WizardStepType[] = [
  { id: "site", title: "Website", icon: Globe },
  { id: "info", title: "Information", icon: FileText },
  { id: "branding", title: "Branding", icon: Palette },
  { id: "platforms", title: "Platforms", icon: Share2 },
];

const themeColors = [
  { value: "#F97316", name: "Orange" },
  { value: "#EC4899", name: "Pink" },
  { value: "#8B5CF6", name: "Purple" },
  { value: "#3B82F6", name: "Blue" },
  { value: "#10B981", name: "Green" },
  { value: "#F59E0B", name: "Amber" },
  { value: "#EF4444", name: "Red" },
  { value: "#6366F1", name: "Indigo" },
];

// Language options for project
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "fr", label: "French", flag: "🇫🇷" },
  { value: "es", label: "Spanish", flag: "🇪🇸" },
  { value: "de", label: "German", flag: "🇩🇪" },
  { value: "it", label: "Italian", flag: "🇮🇹" },
  { value: "pt", label: "Portuguese", flag: "🇧🇷" },
];

const ProjectNew = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editProjectId = searchParams.get("edit");
  const isEditMode = Boolean(editProjectId);
  
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  
  // Form state
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    url: "",
    theme_color: "#F97316",
    instagram_enabled: true,
    facebook_enabled: true,
    youtube_enabled: false,
    linkedin_enabled: false,
    tiktok_enabled: false,
    posts_per_week: 3,
    automation_mode: "semi_auto",
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProject, setIsFetchingProject] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState("en");

  // Fetch existing project data in edit mode
  useEffect(() => {
    const fetchProject = async () => {
      if (!editProjectId || !user) return;
      
      setIsFetchingProject(true);
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*")
          .eq("id", editProjectId)
          .single();

        if (error) throw error;

        if (data) {
          setFormData({
            name: data.name || "",
            description: data.description || "",
            url: data.url || "",
            theme_color: data.theme_color || "#F97316",
            instagram_enabled: data.instagram_enabled ?? true,
            facebook_enabled: data.facebook_enabled ?? true,
            youtube_enabled: data.youtube_enabled ?? false,
            linkedin_enabled: data.linkedin_enabled ?? false,
            tiktok_enabled: data.tiktok_enabled ?? false,
            posts_per_week: data.posts_per_week || 3,
            automation_mode: (data.automation_mode as "manual" | "semi_auto" | "full_auto") || "semi_auto",
          });
          
          if (data.logo_url) {
            setLogoPreview(data.logo_url);
          }
          
          // Set detected language from existing project
          if (data.detected_language) {
            setDetectedLanguage(data.detected_language);
          }
        }
      } catch (error) {
        console.error("Error fetching project:", error);
        toast({
          title: "Error",
          description: "Unable to load project",
          variant: "destructive",
        });
        navigate("/projects");
      } finally {
        setIsFetchingProject(false);
      }
    };

    fetchProject();
  }, [editProjectId, user, toast, navigate]);

  // Wizard navigation
  const nextStep = useCallback(() => {
    if (currentStep < wizardSteps.length - 1) {
      setDirection("forward");
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setDirection("backward");
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((index: number) => {
    setDirection(index > currentStep ? "forward" : "backward");
    setCurrentStep(index);
  }, [currentStep]);

  // Step validation
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Website - optional
        return true;
      case 1: // Information
        if (!formData.name || formData.name.length < 2) {
          toast({
            title: "Name required",
            description: "Project name must be at least 2 characters",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 2: // Branding - always valid (default color)
        return true;
      case 3: // Platforms
        if (!formData.instagram_enabled && !formData.facebook_enabled && !formData.youtube_enabled && !formData.linkedin_enabled && !formData.tiktok_enabled) {
          toast({
            title: "Platform required",
            description: "Select at least one publishing platform",
            variant: "destructive",
          });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      nextStep();
    }
  };

  // Scrape URL with Firecrawl
  const handleScrapeUrl = async () => {
    if (!formData.url) {
      toast({
        title: "URL required",
        description: "Enter a URL to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-project-url", {
        body: { url: formData.url },
      });

      if (error) throw error;

      if (data?.success) {
        setFormData(prev => ({
          ...prev,
          name: data.title || prev.name,
          description: data.description || prev.description,
        }));
        
        if (data.logo) {
          setLogoPreview(data.logo);
        }
        
        if (data.colors?.primary) {
          setFormData(prev => ({ ...prev, theme_color: data.colors.primary }));
        }

        // Store detected language
        if (data.detectedLanguage) {
          setDetectedLanguage(data.detectedLanguage);
        }

        toast({
          title: "Website analyzed!",
          description: "Information extracted successfully",
        });
        
        // Automatically move to next step
        nextStep();
      }
    } catch (error) {
      console.error("Scrape error:", error);
      toast({
        title: "Analysis error",
        description: "Unable to analyze website. Continue manually.",
        variant: "destructive",
      });
    } finally {
      setIsScraping(false);
    }
  };

  // Upload logo
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Final submission
  const handleSubmit = async () => {
    // User verification
    if (!user) {
      console.error("No user found");
      toast({
        title: "Not logged in",
        description: "Please log in again to create a project",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Final validation
    try {
      projectSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        toast({
          title: "Invalid data",
          description: error.errors[0]?.message || "Check the form",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      let logoUrl: string | null = null;

      // Upload logo if present
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(fileName);
        
        logoUrl = urlData.publicUrl;
      } else if (logoPreview && logoPreview.startsWith("http")) {
        logoUrl = logoPreview;
      }

      const projectData = {
        name: formData.name,
        description: formData.description || null,
        url: formData.url || null,
        logo_url: logoUrl,
        theme_color: formData.theme_color,
        instagram_enabled: formData.instagram_enabled,
        facebook_enabled: formData.facebook_enabled,
        youtube_enabled: formData.youtube_enabled,
        linkedin_enabled: formData.linkedin_enabled,
        tiktok_enabled: formData.tiktok_enabled,
        posts_per_week: formData.posts_per_week,
        automation_mode: formData.automation_mode,
        detected_language: detectedLanguage,
      };

      if (isEditMode && editProjectId) {
        // Edit mode - Update
        const { error } = await supabase
          .from("projects")
          .update(projectData)
          .eq("id", editProjectId);

        if (error) {
          console.error("Supabase update error:", error);
          throw error;
        }

        toast({
          title: "Project updated! ✓",
          description: `${formData.name} has been updated`,
        });

        navigate(`/projects/${editProjectId}`);
      } else {
        // Create mode - Insert
        const { data, error } = await supabase
          .from("projects")
          .insert({
            ...projectData,
            user_id: user.id,
          })
          .select()
          .single();

        if (error) {
          console.error("Supabase insert error:", error);
          throw error;
        }

        console.log("Project created:", data);
        
        toast({
          title: "Project created!",
          description: "You can now create campaigns to generate content",
        });

        navigate(`/projects/${data.id}`);
      }
    } catch (error) {
      console.error("Save project error:", error);
      toast({
        title: isEditMode ? "Update error" : "Creation error",
        description: "Unable to save project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading auth
  if (authLoading || isFetchingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">You must be logged in to create a project</p>
        <Button onClick={() => navigate("/auth")}>Log in</Button>
      </div>
    );
  }

  const isLastStep = currentStep === wizardSteps.length - 1;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          className="text-center space-y-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">
            {isEditMode ? "Edit Project" : "New Project"}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode 
              ? "Modify your project settings"
              : "Configure your project in a few steps"
            }
          </p>
        </motion.div>

        {/* Progress */}
        <WizardProgress 
          steps={wizardSteps} 
          currentStep={currentStep} 
          onStepClick={goToStep}
        />

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Website */}
          {currentStep === 0 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Website"
                description="Analyze your website to pre-fill information (optional)"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="url">Website URL</Label>
                    <div className="flex gap-2">
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://mywebsite.com"
                        value={formData.url}
                        onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        onClick={handleScrapeUrl}
                        disabled={isScraping || !formData.url}
                        className="min-w-[120px]"
                      >
                        {isScraping ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Analyze
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI will analyze your website to extract name, description and colors
                    </p>
                  </div>
                </div>
              </WizardStepContainer>
            </WizardStep>
          )}

          {/* Step 2: Information */}
          {currentStep === 1 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Information"
                description="Give your project a name and description"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Project name *</Label>
                    <Input
                      id="name"
                      placeholder="My awesome project"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your project in a few words..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  {/* Language Selection */}
                  <div className="space-y-3">
                    <Label>Content Language</Label>
                    <p className="text-xs text-muted-foreground">
                      AI-generated content will use this language
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <Button
                          key={lang.value}
                          type="button"
                          variant={detectedLanguage === lang.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setDetectedLanguage(lang.value)}
                          className="min-w-[80px]"
                        >
                          <span className="mr-1">{lang.flag}</span>
                          {lang.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </WizardStepContainer>
            </WizardStep>
          )}

          {/* Step 3: Branding */}
          {currentStep === 2 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Visual Identity"
                description="Customize your project's appearance"
              >
                <div className="space-y-8">
                  {/* Logo */}
                  <div className="space-y-4">
                    <Label>Logo</Label>
                    <div className="flex items-center gap-6">
                      <div 
                        className="w-24 h-24 rounded-2xl border-2 border-dashed border-border 
                                   flex items-center justify-center overflow-hidden bg-muted/50"
                      >
                        {logoPreview ? (
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG or SVG. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Color */}
                  <div className="space-y-4">
                    <Label>Theme color</Label>
                    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                      {themeColors.map((color) => (
                        <motion.button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, theme_color: color.value }))}
                          className="relative w-12 h-12 rounded-xl shadow-md transition-transform"
                          style={{ backgroundColor: color.value }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {formData.theme_color === color.value && (
                            <motion.div
                              className="absolute inset-0 flex items-center justify-center"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <Check className="w-6 h-6 text-white drop-shadow-md" />
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              </WizardStepContainer>
            </WizardStep>
          )}

          {/* Step 4: Platforms (was step 5) */}
          {currentStep === 3 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Platforms"
                description="Choose where to publish your content"
              >
                <div className="space-y-8">
                  {/* Platforms */}
                  <div className="space-y-4">
                    <Label>Publishing platforms</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <motion.div
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.instagram_enabled 
                            ? "border-primary bg-primary/5" 
                            : "border-border bg-muted/50"
                        }`}
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          instagram_enabled: !prev.instagram_enabled 
                        }))}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                              <Instagram className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold">Instagram</p>
                              <p className="text-xs text-muted-foreground">Posts, Reels, Stories</p>
                            </div>
                          </div>
                          <Switch checked={formData.instagram_enabled} />
                        </div>
                      </motion.div>

                      <motion.div
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.facebook_enabled 
                            ? "border-primary bg-primary/5" 
                            : "border-border bg-muted/50"
                        }`}
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          facebook_enabled: !prev.facebook_enabled 
                        }))}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[hsl(221,83%,53%)] flex items-center justify-center">
                              <Facebook className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold">Facebook</p>
                              <p className="text-xs text-muted-foreground">Posts, Videos, Reels</p>
                            </div>
                          </div>
                          <Switch checked={formData.facebook_enabled} />
                        </div>
                      </motion.div>

                      <motion.div
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.youtube_enabled 
                            ? "border-primary bg-primary/5" 
                            : "border-border bg-muted/50"
                        }`}
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          youtube_enabled: !prev.youtube_enabled 
                        }))}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[hsl(0,100%,50%)] flex items-center justify-center">
                              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary-foreground">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                              </svg>
                            </div>
                            <div>
                              <p className="font-semibold">YouTube</p>
                              <p className="text-xs text-muted-foreground">Shorts, Videos</p>
                            </div>
                          </div>
                          <Switch checked={formData.youtube_enabled} />
                        </div>
                      </motion.div>

                      <motion.div
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.linkedin_enabled 
                            ? "border-primary bg-primary/5" 
                            : "border-border bg-muted/50"
                        }`}
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          linkedin_enabled: !prev.linkedin_enabled 
                        }))}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[hsl(210,100%,40%)] flex items-center justify-center">
                              <Linkedin className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <div>
                              <p className="font-semibold">LinkedIn</p>
                              <p className="text-xs text-muted-foreground">Posts, Articles</p>
                            </div>
                          </div>
                          <Switch checked={formData.linkedin_enabled} />
                        </div>
                      </motion.div>

                      <motion.div
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.tiktok_enabled 
                            ? "border-primary bg-primary/5" 
                            : "border-border bg-muted/50"
                        }`}
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          tiktok_enabled: !prev.tiktok_enabled 
                        }))}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-foreground flex items-center justify-center">
                              <TikTokIcon className="w-5 h-5 text-background" />
                            </div>
                            <div>
                              <p className="font-semibold">TikTok</p>
                              <p className="text-xs text-muted-foreground">Short videos</p>
                            </div>
                          </div>
                          <Switch checked={formData.tiktok_enabled} />
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Summary */}
                  <motion.div 
                    className="p-4 rounded-xl bg-muted/30 border border-border"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Project Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <p className="font-medium">{formData.name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Language:</span>
                        <p className="font-medium">{LANGUAGE_OPTIONS.find(l => l.value === detectedLanguage)?.label || "English"}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Platforms:</span>
                        <p className="font-medium">
                          {[
                            formData.instagram_enabled && "Instagram",
                            formData.facebook_enabled && "Facebook",
                            formData.youtube_enabled && "YouTube",
                            formData.linkedin_enabled && "LinkedIn",
                            formData.tiktok_enabled && "TikTok",
                          ].filter(Boolean).join(", ") || "None selected"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Content volume is configured per campaign
                    </p>
                  </motion.div>
                </div>
              </WizardStepContainer>
            </WizardStep>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        <motion.div 
          className="flex justify-between gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? () => navigate("/projects") : prevStep}
            disabled={isLoading}
            className="min-w-[120px]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? "Cancel" : "Previous"}
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              variant="gradient"
              onClick={handleSubmit}
              disabled={isLoading}
              className="min-w-[160px]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Project
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              className="min-w-[120px]"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectNew;
