import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AIContentGeneratorProps {
  onContentGenerated: (content: { text: string; imageUrl?: string }) => void;
}

export const AIContentGenerator = ({ onContentGenerated }: AIContentGeneratorProps) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationType, setGenerationType] = useState<"text" | "image" | "both">("text");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt requis",
        description: "Entrez une idée pour générer du contenu",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { prompt, type: generationType },
      });

      if (error) {
        if (error.message?.includes("429")) {
          toast({
            title: "Limite atteinte",
            description: "Trop de requêtes, réessayez dans un moment",
            variant: "destructive",
          });
        } else if (error.message?.includes("402")) {
          toast({
            title: "Crédits épuisés",
            description: "Ajoutez des crédits à votre espace de travail",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      onContentGenerated({
        text: data.text,
        imageUrl: data.imageUrl,
      });

      toast({
        title: "Contenu généré !",
        description: "Votre post IA est prêt",
      });

      setPrompt("");
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le contenu",
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Générateur IA</h3>
          <p className="text-sm text-muted-foreground">Créez du contenu viral en quelques secondes</p>
        </div>
      </div>

      <Textarea
        placeholder="Décrivez votre idée de post... Ex: Un post motivationnel sur le succès avec un coucher de soleil"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mb-4 min-h-[100px] resize-none border-2 focus:border-primary/50"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["text", "image", "both"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setGenerationType(type)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
              generationType === type
                ? "gradient-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {type === "text" && "📝 Texte"}
            {type === "image" && "🖼️ Image"}
            {type === "both" && "✨ Texte + Image"}
          </button>
        ))}
      </div>

      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        variant="gradient"
        size="lg"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Génération en cours...
          </>
        ) : (
          <>
            <Wand2 className="h-5 w-5" />
            Générer le contenu
          </>
        )}
      </Button>
    </motion.div>
  );
};
