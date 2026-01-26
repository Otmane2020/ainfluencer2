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
        title: "Prompt required",
        description: "Enter an idea to generate content",
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
            title: "Rate limit reached",
            description: "Too many requests, please try again later",
            variant: "destructive",
          });
        } else if (error.message?.includes("402")) {
          toast({
            title: "Credits exhausted",
            description: "Add credits to your workspace",
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
        title: "Content generated!",
        description: "Your AI post is ready",
      });

      setPrompt("");
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Error",
        description: "Unable to generate content",
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
      className="rounded-2xl bg-card p-4 md:p-6 shadow-card"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="font-display text-base md:text-lg font-semibold">AI Generator</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Create viral content in seconds</p>
        </div>
      </div>

      <Textarea
        placeholder="Describe your post idea... E.g: A motivational post about success with a sunset"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="mb-4 min-h-[80px] md:min-h-[100px] resize-none border-2 focus:border-primary/50 text-sm md:text-base"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["text", "image", "both"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setGenerationType(type)}
            className={`rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition-all ${
              generationType === type
                ? "gradient-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {type === "text" && "📝 Text"}
            {type === "image" && "🖼️ Image"}
            {type === "both" && "✨ Text + Image"}
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
            <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
            <span className="text-sm md:text-base">Generating...</span>
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 md:h-5 md:w-5" />
            <span className="text-sm md:text-base">Generate Content</span>
          </>
        )}
      </Button>
    </motion.div>
  );
};
