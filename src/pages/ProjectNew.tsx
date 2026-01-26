import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Instagram,
  Facebook,
  Link as LinkIcon,
  Palette,
  Upload,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(2, "Nom minimum 2 caractères").max(100),
  description: z.string().max(500).optional(),
  url: z.string().url("URL invalide").optional().or(z.literal("")).transform(val => val || undefined),
  theme_color: z.string(),
  posts_per_week: z.number().min(1).max(14),
  automation_mode: z.enum(["manual", "semi_auto", "full_auto"]),
  instagram_enabled: z.boolean(),
  facebook_enabled: z.boolean(),
});

const colorPresets = [
  "#F97316", // Orange
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#06B6D4", // Cyan
];

const ProjectNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

const [formData, setFormData] = useState<{
    name: string;
    description: string;
    url: string;
    theme_color: string;
    posts_per_week: number;
    automation_mode: "manual" | "semi_auto" | "full_auto";
    instagram_enabled: boolean;
    facebook_enabled: boolean;
  }>({
    name: "",
    description: "",
    url: "",
    theme_color: "#F97316",
    posts_per_week: 3,
    automation_mode: "semi_auto",
    instagram_enabled: true,
    facebook_enabled: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;

    const fileExt = logoFile.name.split(".").pop();
    const fileName = `${user.id}/logos/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("media")
      .upload(fileName, logoFile);

    if (error) {
      console.error("Logo upload error:", error);
      return null;
    }

    const { data } = supabase.storage.from("media").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      projectSchema.parse(formData);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    if (!user) return;

    setIsLoading(true);

    try {
      // Upload logo if provided
      const logoUrl = await uploadLogo();

      // Create project
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: formData.name,
          description: formData.description || null,
          url: formData.url || null,
          logo_url: logoUrl,
          theme_color: formData.theme_color,
          posts_per_week: formData.posts_per_week,
          automation_mode: formData.automation_mode,
          instagram_enabled: formData.instagram_enabled,
          facebook_enabled: formData.facebook_enabled,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Projet créé !",
        description: "Votre projet a été créé avec succès",
      });

      navigate("/projects");
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Nouveau projet</h1>
          <p className="text-muted-foreground">
            Configurez votre projet et son automatisation
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Informations générales
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du projet *</Label>
              <Input
                id="name"
                placeholder="Ex: Starlinko - Avis Google"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre projet, son activité, sa cible... Ces informations seront utilisées comme contexte pour l'IA."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Cette description sera utilisée comme contexte pour la génération de contenu IA
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                URL du site
              </Label>
              <Input
                id="url"
                type="url"
                placeholder="https://exemple.com"
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
              />
              {errors.url && (
                <p className="text-sm text-destructive">{errors.url}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-secondary" />
              Identité visuelle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                <div
                  className="h-16 w-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl overflow-hidden"
                  style={{ backgroundColor: formData.theme_color }}
                >
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    formData.name[0]?.toUpperCase() || "P"
                  )}
                </div>
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Télécharger un logo
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Couleur thème</Label>
              <div className="flex flex-wrap gap-2">
                {colorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, theme_color: color }))
                    }
                    className={`h-8 w-8 rounded-full transition-all ${
                      formData.theme_color === color
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <Input
                  type="color"
                  value={formData.theme_color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, theme_color: e.target.value }))
                  }
                  className="h-8 w-8 p-0 border-0 rounded-full cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platforms */}
        <Card>
          <CardHeader>
            <CardTitle>Plateformes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center">
                  <Instagram className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Instagram</p>
                  <p className="text-sm text-muted-foreground">Publier sur Instagram</p>
                </div>
              </div>
              <Switch
                checked={formData.instagram_enabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, instagram_enabled: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                  <Facebook className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">Facebook</p>
                  <p className="text-sm text-muted-foreground">Publier sur Facebook</p>
                </div>
              </div>
              <Switch
                checked={formData.facebook_enabled}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, facebook_enabled: checked }))
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Automation */}
        <Card>
          <CardHeader>
            <CardTitle>Automatisation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Mode d'automatisation</Label>
              <Select
                value={formData.automation_mode}
                onValueChange={(value: "manual" | "semi_auto" | "full_auto") =>
                  setFormData((prev) => ({ ...prev, automation_mode: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">
                    <div>
                      <p className="font-medium">Manuel</p>
                      <p className="text-xs text-muted-foreground">
                        Créer et publier manuellement
                      </p>
                    </div>
                  </SelectItem>
                  <SelectItem value="semi_auto">
                    <div>
                      <p className="font-medium">Semi-automatique</p>
                      <p className="text-xs text-muted-foreground">
                        Génération auto, validation manuelle
                      </p>
                    </div>
                  </SelectItem>
                  <SelectItem value="full_auto">
                    <div>
                      <p className="font-medium">Automatique</p>
                      <p className="text-xs text-muted-foreground">
                        Génération et publication automatiques
                      </p>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Publications par semaine</Label>
                <span className="text-sm font-medium">
                  {formData.posts_per_week} posts/semaine
                </span>
              </div>
              <Slider
                value={[formData.posts_per_week]}
                onValueChange={([value]) =>
                  setFormData((prev) => ({ ...prev, posts_per_week: value }))
                }
                min={1}
                max={14}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1/sem</span>
                <span>7/sem (1/jour)</span>
                <span>14/sem (2/jour)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/projects")}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1 gap-2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Créer le projet
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ProjectNew;
