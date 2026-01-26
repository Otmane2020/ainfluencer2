import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Video,
  Image as ImageIcon,
  FileText,
  RefreshCw,
  Copy,
  Check,
  Loader2,
  TrendingUp,
  Hash,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ContentSuggestion {
  id: string;
  title: string;
  content: string;
  contentType: "video" | "image" | "text";
  estimatedEngagement: "high" | "medium" | "low";
  hashtags: string[];
}

interface ContentSuggestionsProps {
  projectId: string;
  projectContext?: {
    name: string;
    description?: string;
    url?: string;
    scrapedContent?: string;
  };
  onSelectSuggestion?: (suggestion: ContentSuggestion) => void;
}

const contentTypeIcons = {
  video: Video,
  image: ImageIcon,
  text: FileText,
};

const engagementColors = {
  high: "bg-green-500/20 text-green-600 border-green-500/30",
  medium: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const engagementLabels = {
  high: "Potentiel élevé",
  medium: "Potentiel moyen",
  low: "Standard",
};

export const ContentSuggestions = ({
  projectId,
  projectContext,
  onSelectSuggestion,
}: ContentSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<ContentSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-content", {
        body: {
          projectId,
          projectName: projectContext?.name,
          projectDescription: projectContext?.description,
          projectUrl: projectContext?.url,
          scrapedContent: projectContext?.scrapedContent?.slice(0, 3000),
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
        toast({
          title: "Suggestions générées",
          description: `${data.suggestions.length} idées de contenu créées`,
        });
      }
    } catch (error) {
      console.error("Error generating suggestions:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer les suggestions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (suggestion: ContentSuggestion) => {
    const text = `${suggestion.title}\n\n${suggestion.content}\n\n${suggestion.hashtags.map((h) => `#${h}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(suggestion.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: "Copié !",
      description: "Le contenu a été copié dans le presse-papiers",
    });
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">
                Suggestions IA
              </h3>
              <p className="text-sm text-muted-foreground">
                Idées basées sur votre contexte projet
              </p>
            </div>
          </div>
          <Button
            onClick={generateSuggestions}
            disabled={isLoading}
            size="sm"
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {suggestions.length > 0 ? "Régénérer" : "Générer"}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {suggestions.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8 text-center"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Cliquez sur "Générer" pour obtenir des idées de contenu
              <br />
              basées sur votre projet
            </p>
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-8"
          >
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">
              Génération des suggestions en cours...
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="popLayout">
          {suggestions.map((suggestion, index) => {
            const Icon = contentTypeIcons[suggestion.contentType];
            return (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className="group rounded-xl border-2 border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium leading-tight">
                        {suggestion.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={engagementColors[suggestion.estimatedEngagement]}
                        >
                          <TrendingUp className="mr-1 h-3 w-3" />
                          {engagementLabels[suggestion.estimatedEngagement]}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard(suggestion)}
                    >
                      {copiedId === suggestion.id ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    {onSelectSuggestion && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onSelectSuggestion(suggestion)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="mb-3 text-sm text-muted-foreground line-clamp-3">
                  {suggestion.content}
                </p>

                {suggestion.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {suggestion.hashtags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        <Hash className="mr-0.5 h-3 w-3" />
                        {tag}
                      </span>
                    ))}
                    {suggestion.hashtags.length > 5 && (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        +{suggestion.hashtags.length - 5}
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
