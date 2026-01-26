import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, FileText, Palette, Calendar, Share2, 
  ArrowRight, ArrowLeft, Loader2, Sparkles, 
  Instagram, Facebook, Upload, Zap, Clock,
  Check
} from "lucide-react";
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

// Schema de validation
const projectSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  description: z.string().optional(),
  url: z.string().url().optional().or(z.literal("")),
  theme_color: z.string().default("#F97316"),
  instagram_enabled: z.boolean().default(true),
  facebook_enabled: z.boolean().default(true),
  posts_per_week: z.number().min(1).max(14).default(3),
  automation_mode: z.enum(["manual", "semi_auto", "full_auto"]).default("semi_auto"),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// Configuration des étapes
const wizardSteps: WizardStepType[] = [
  { id: "site", title: "Site web", icon: Globe },
  { id: "info", title: "Informations", icon: FileText },
  { id: "branding", title: "Identité", icon: Palette },
  { id: "content", title: "Contenu", icon: Calendar },
  { id: "platforms", title: "Plateformes", icon: Share2 },
];

const themeColors = [
  { value: "#F97316", name: "Orange" },
  { value: "#EC4899", name: "Rose" },
  { value: "#8B5CF6", name: "Violet" },
  { value: "#3B82F6", name: "Bleu" },
  { value: "#10B981", name: "Vert" },
  { value: "#F59E0B", name: "Ambre" },
  { value: "#EF4444", name: "Rouge" },
  { value: "#6366F1", name: "Indigo" },
];

const ProjectNew = () => {
  const navigate = useNavigate();
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
    posts_per_week: 3,
    automation_mode: "semi_auto",
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [videosPerMonth, setVideosPerMonth] = useState(4);
  const [imagesPerMonth, setImagesPerMonth] = useState(12);

  // Navigation du wizard
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

  // Validation par étape
  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Site web - optionnel
        return true;
      case 1: // Informations
        if (!formData.name || formData.name.length < 2) {
          toast({
            title: "Nom requis",
            description: "Le nom du projet doit contenir au moins 2 caractères",
            variant: "destructive",
          });
          return false;
        }
        return true;
      case 2: // Branding - toujours valide (couleur par défaut)
        return true;
      case 3: // Contenu - toujours valide (valeurs par défaut)
        return true;
      case 4: // Plateformes
        if (!formData.instagram_enabled && !formData.facebook_enabled) {
          toast({
            title: "Plateforme requise",
            description: "Sélectionnez au moins une plateforme de publication",
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

  // Scraping URL avec Firecrawl
  const handleScrapeUrl = async () => {
    if (!formData.url) {
      toast({
        title: "URL requise",
        description: "Entrez une URL pour l'analyser",
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

        toast({
          title: "Site analysé !",
          description: "Les informations ont été extraites avec succès",
        });
        
        // Passer automatiquement à l'étape suivante
        nextStep();
      }
    } catch (error) {
      console.error("Scrape error:", error);
      toast({
        title: "Erreur d'analyse",
        description: "Impossible d'analyser le site. Continuez manuellement.",
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

  // Soumission finale
  const handleSubmit = async () => {
    // Vérification utilisateur
    if (!user) {
      console.error("No user found");
      toast({
        title: "Non connecté",
        description: "Veuillez vous reconnecter pour créer un projet",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Validation finale
    try {
      projectSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        toast({
          title: "Données invalides",
          description: error.errors[0]?.message || "Vérifiez le formulaire",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      let logoUrl: string | null = null;

      // Upload du logo si présent
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

      // Création du projet
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: formData.name,
          description: formData.description || null,
          url: formData.url || null,
          logo_url: logoUrl,
          theme_color: formData.theme_color,
          instagram_enabled: formData.instagram_enabled,
          facebook_enabled: formData.facebook_enabled,
          posts_per_week: formData.posts_per_week,
          automation_mode: formData.automation_mode,
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
        title: "Projet créé avec succès ! 🎉",
        description: `${formData.name} est prêt à générer du contenu`,
      });

      navigate("/projects");
    } catch (error) {
      console.error("Create project error:", error);
      toast({
        title: "Erreur de création",
        description: "Impossible de créer le projet. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Non connecté
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Vous devez être connecté pour créer un projet</p>
        <Button onClick={() => navigate("/auth")}>Se connecter</Button>
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
            Nouveau projet
          </h1>
          <p className="text-muted-foreground">
            Configurez votre projet en quelques étapes
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
          {/* Step 1: Site web */}
          {currentStep === 0 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Site web"
                description="Analysez votre site pour pré-remplir les informations (optionnel)"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="url">URL du site</Label>
                    <div className="flex gap-2">
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://monsite.com"
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
                            Analyser
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      L'IA analysera votre site pour extraire le nom, la description et les couleurs
                    </p>
                  </div>
                </div>
              </WizardStepContainer>
            </WizardStep>
          )}

          {/* Step 2: Informations */}
          {currentStep === 1 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Informations"
                description="Donnez un nom et une description à votre projet"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom du projet *</Label>
                    <Input
                      id="name"
                      placeholder="Mon super projet"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Décrivez votre projet en quelques mots..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={4}
                    />
                  </div>
                </div>
              </WizardStepContainer>
            </WizardStep>
          )}

          {/* Step 3: Branding */}
          {currentStep === 2 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Identité visuelle"
                description="Personnalisez l'apparence de votre projet"
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
                          PNG, JPG ou SVG. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Couleur */}
                  <div className="space-y-4">
                    <Label>Couleur thème</Label>
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

          {/* Step 4: Contenu */}
          {currentStep === 3 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Génération de contenu"
                description="Définissez la quantité de contenu à générer chaque mois"
              >
                <div className="space-y-8">
                  {/* Vidéos par mois */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        Vidéos / Reels par mois
                      </Label>
                      <span className="text-2xl font-bold text-primary">{videosPerMonth}</span>
                    </div>
                    <Slider
                      value={[videosPerMonth]}
                      onValueChange={([v]) => setVideosPerMonth(v)}
                      min={0}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommandé: 4-8 vidéos par mois pour un bon engagement
                    </p>
                  </div>

                  {/* Images par mois */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Palette className="w-4 h-4 text-accent" />
                        </div>
                        Posts images par mois
                      </Label>
                      <span className="text-2xl font-bold text-accent">{imagesPerMonth}</span>
                    </div>
                    <Slider
                      value={[imagesPerMonth]}
                      onValueChange={([v]) => setImagesPerMonth(v)}
                      min={0}
                      max={30}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommandé: 12-16 images par mois pour une présence régulière
                    </p>
                  </div>

                  {/* Fréquence publication */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                          <Clock className="w-4 h-4 text-foreground" />
                        </div>
                        Publications par semaine
                      </Label>
                      <span className="text-2xl font-bold">{formData.posts_per_week}</span>
                    </div>
                    <Slider
                      value={[formData.posts_per_week]}
                      onValueChange={([v]) => setFormData(prev => ({ ...prev, posts_per_week: v }))}
                      min={1}
                      max={14}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </div>
              </WizardStepContainer>
            </WizardStep>
          )}

          {/* Step 5: Plateformes */}
          {currentStep === 4 && (
            <WizardStep isActive={true} direction={direction}>
              <WizardStepContainer
                title="Plateformes & Automatisation"
                description="Choisissez où publier et comment automatiser"
              >
                <div className="space-y-8">
                  {/* Plateformes */}
                  <div className="space-y-4">
                    <Label>Plateformes de publication</Label>
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
                              <p className="text-xs text-muted-foreground">Posts, Vidéos, Reels</p>
                            </div>
                          </div>
                          <Switch checked={formData.facebook_enabled} />
                        </div>
                      </motion.div>
                    </div>
                  </div>

                  {/* Mode automatisation */}
                  <div className="space-y-4">
                    <Label>Mode d'automatisation</Label>
                    <div className="space-y-3">
                      {[
                        { 
                          value: "manual", 
                          label: "Manuel", 
                          desc: "Validation manuelle de chaque post" 
                        },
                        { 
                          value: "semi_auto", 
                          label: "Semi-auto", 
                          desc: "Génération auto, publication manuelle" 
                        },
                        { 
                          value: "full_auto", 
                          label: "100% Auto", 
                          desc: "Tout est automatisé" 
                        },
                      ].map((mode) => (
                        <motion.div
                          key={mode.value}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            formData.automation_mode === mode.value 
                              ? "border-primary bg-primary/5" 
                              : "border-border bg-muted/50 hover:border-primary/30"
                          }`}
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            automation_mode: mode.value as ProjectFormData["automation_mode"]
                          }))}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold">{mode.label}</p>
                              <p className="text-sm text-muted-foreground">{mode.desc}</p>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              formData.automation_mode === mode.value 
                                ? "border-primary bg-primary" 
                                : "border-muted-foreground"
                            }`}>
                              {formData.automation_mode === mode.value && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Résumé */}
                  <motion.div 
                    className="p-4 rounded-xl bg-muted/30 border border-border"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      Résumé du projet
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nom:</span>
                        <p className="font-medium">{formData.name || "—"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Vidéos/mois:</span>
                        <p className="font-medium">{videosPerMonth}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Images/mois:</span>
                        <p className="font-medium">{imagesPerMonth}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Publications/sem:</span>
                        <p className="font-medium">{formData.posts_per_week}</p>
                      </div>
                    </div>
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
            {currentStep === 0 ? "Annuler" : "Précédent"}
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
                  Créer le projet
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleNext}
              className="min-w-[120px]"
            >
              Suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectNew;
