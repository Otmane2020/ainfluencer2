import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { User, Upload, Wand2, Loader2, Check, X, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AvatarManagerProps {
  currentAvatar?: string;
  onAvatarChange: (avatarUrl: string) => void;
}

export const AvatarManager = ({ currentAvatar, onAvatarChange }: AvatarManagerProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [showPromptInput, setShowPromptInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Format invalide",
        description: "Veuillez uploader une image (JPG, PNG, WebP)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 5 Mo",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create object URL for immediate preview
      const objectUrl = URL.createObjectURL(file);
      onAvatarChange(objectUrl);

      toast({
        title: "Avatar mis à jour !",
        description: "Votre photo de profil a été chargée",
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const generateAvatar = async () => {
    if (!avatarPrompt.trim()) {
      toast({
        title: "Description requise",
        description: "Décrivez l'apparence de votre avatar IA",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-avatar", {
        body: { prompt: avatarPrompt },
      });

      if (error) throw error;

      if (data.imageUrl) {
        onAvatarChange(data.imageUrl);
        toast({
          title: "Avatar généré !",
          description: "Votre avatar IA est prêt",
        });
        setShowPromptInput(false);
        setAvatarPrompt("");
      }
    } catch (error) {
      console.error("Avatar generation error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'avatar",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-card p-6 shadow-card"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent">
          <User className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Avatar IA</h3>
          <p className="text-sm text-muted-foreground">Votre personnage influenceur</p>
        </div>
      </div>

      {/* Avatar Preview */}
      <div className="mb-6 flex justify-center">
        <div className="relative">
          <div className="h-32 w-32 overflow-hidden rounded-full gradient-primary p-1 shadow-glow">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-card">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-muted-foreground" />
              )}
            </div>
          </div>
          {(isGenerating || isUploading) && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {!showPromptInput ? (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isGenerating}
            className="h-auto flex-col gap-2 py-4"
          >
            <Upload className="h-5 w-5" />
            <span className="text-xs">Uploader photo</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowPromptInput(true)}
            disabled={isUploading || isGenerating}
            className="h-auto flex-col gap-2 py-4"
          >
            <Wand2 className="h-5 w-5" />
            <span className="text-xs">Générer avatar</span>
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="space-y-3"
        >
          <textarea
            value={avatarPrompt}
            onChange={(e) => setAvatarPrompt(e.target.value)}
            placeholder="Ex: Une femme professionnelle, cheveux bruns, sourire confiant, style moderne..."
            className="w-full rounded-xl border-2 border-border bg-background p-3 text-sm focus:border-primary/50 focus:outline-hidden"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowPromptInput(false);
                setAvatarPrompt("");
              }}
              className="flex-1"
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={generateAvatar}
              disabled={isGenerating || !avatarPrompt.trim()}
              className="flex-1"
            >
              {isGenerating ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-1 h-4 w-4" />
              )}
              Générer
            </Button>
          </div>
        </motion.div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Tips */}
      <div className="mt-4 rounded-lg bg-muted/50 p-3 flex items-start gap-2">
        <Lightbulb className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong>Tip:</strong> For best results, use a front-facing photo with good lighting or describe your ideal avatar in detail.
        </p>
      </div>
    </motion.div>
  );
};
