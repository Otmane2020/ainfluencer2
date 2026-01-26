import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Instagram,
  Facebook,
  Linkedin,
  Video,
  Image as ImageIcon,
  FileText,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Send,
  Loader2,
  Music2,
  Check,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ProductSelector } from "./ProductSelector";
import { COMMERCIAL_PRODUCTS, CommercialProduct } from "@/lib/commercialProducts";

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

interface ScheduledPost {
  id: string;
  project_id: string;
  user_id: string;
  content_type: string;
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  platforms: string[] | null;
  scheduled_for: string;
  status: string | null;
  ai_prompt: string | null;
  published_at: string | null;
  error_message: string | null;
}

interface ScheduledPostModalProps {
  post: ScheduledPost | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (post: ScheduledPost) => void;
  onDelete?: (postId: string) => void;
  onPublishNow?: (post: ScheduledPost) => void;
  onUpdate?: () => void;
}

const platformConfig = {
  instagram: {
    icon: Instagram,
    name: "Instagram",
    gradient: "from-[#833AB4] via-[#E1306C] to-[#F77737]",
    color: "#E1306C",
  },
  facebook: {
    icon: Facebook,
    name: "Facebook",
    gradient: "from-[#1877F2] to-[#0D65D9]",
    color: "#1877F2",
  },
  linkedin: {
    icon: Linkedin,
    name: "LinkedIn",
    gradient: "from-[#0A66C2] to-[#004182]",
    color: "#0A66C2",
  },
  tiktok: {
    icon: TikTokIcon,
    name: "TikTok",
    gradient: "from-[#000000] via-[#25F4EE] to-[#FE2C55]",
    color: "#000000",
  },
};

const statusConfig = {
  draft: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  scheduled: { label: "Programmé", color: "bg-blue-500/20 text-blue-600" },
  published: { label: "Publié", color: "bg-green-500/20 text-green-600" },
  failed: { label: "Échec", color: "bg-destructive/20 text-destructive" },
};

const contentTypeConfig = {
  video: { icon: Video, label: "Vidéo" },
  image: { icon: ImageIcon, label: "Image" },
  text: { icon: FileText, label: "Texte" },
  reel: { icon: Music2, label: "Reel" },
};

export const ScheduledPostModal = ({
  post,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onPublishNow,
  onUpdate,
}: ScheduledPostModalProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CommercialProduct | null>(null);
  const [activeTab, setActiveTab] = useState("details");
  const { toast } = useToast();

  // Initialize platforms from post
  useEffect(() => {
    if (post?.platforms) {
      setSelectedPlatforms(post.platforms);
    }
  }, [post]);

  if (!post) return null;

  const status = statusConfig[post.status as keyof typeof statusConfig] || statusConfig.draft;
  const contentType = contentTypeConfig[post.content_type as keyof typeof contentTypeConfig] || contentTypeConfig.text;
  const ContentIcon = contentType.icon;

  // Filter products based on content type
  const getRelevantProducts = () => {
    if (post.content_type === "video" || post.content_type === "reel") {
      return COMMERCIAL_PRODUCTS.filter((p) => p.category === "video" || p.category === "avatar");
    } else if (post.content_type === "image") {
      return COMMERCIAL_PRODUCTS.filter((p) => p.category === "image");
    }
    return COMMERCIAL_PRODUCTS.filter((p) => p.category === "image"); // Default to image for text posts
  };

  const relevantProducts = getRelevantProducts();

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSavePlatforms = async () => {
    if (selectedPlatforms.length === 0) {
      toast({
        title: "Sélection requise",
        description: "Sélectionnez au moins une plateforme",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("scheduled_posts")
        .update({ platforms: selectedPlatforms })
        .eq("id", post.id);

      if (error) throw error;

      toast({
        title: "Plateformes mises à jour ✓",
        description: `Publication sur ${selectedPlatforms.length} plateforme(s)`,
      });
      
      onUpdate?.();
    } catch (error) {
      console.error("Update platforms error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les plateformes",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(post.id);
      toast({
        title: "Post supprimé",
        description: "Le post a été supprimé avec succès",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le post",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePublishNow = async () => {
    if (!onPublishNow) return;
    setIsPublishing(true);
    try {
      await onPublishNow(post);
      toast({
        title: "Publication en cours",
        description: "Le post est en cours de publication",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de publier le post",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60">
              <ContentIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-display">{contentType.label}</span>
              <Badge className={`ml-3 ${status.color}`}>{status.label}</Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Détails</TabsTrigger>
            <TabsTrigger value="platforms">Réseaux sociaux</TabsTrigger>
            <TabsTrigger value="models">Modèles IA</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="details" className="space-y-4 m-0">
              {/* Media Preview */}
              {(post.media_url || post.thumbnail_url) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative aspect-video overflow-hidden rounded-xl bg-muted"
                >
                  {post.content_type === "video" ? (
                    <video
                      src={post.media_url || undefined}
                      poster={post.thumbnail_url || undefined}
                      controls
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={post.media_url || post.thumbnail_url || undefined}
                      alt="Post media"
                      className="h-full w-full object-cover"
                    />
                  )}
                </motion.div>
              )}

              {/* AI Prompt / Subject */}
              {post.ai_prompt && (
                <div className="rounded-xl bg-muted/50 p-4">
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Sujet / Prompt IA
                  </h4>
                  <p className="text-sm">{post.ai_prompt}</p>
                </div>
              )}

              {/* Text Content */}
              {post.text_content && (
                <div className="rounded-xl border border-border p-4">
                  <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                    Contenu
                  </h4>
                  <p className="whitespace-pre-wrap text-sm">{post.text_content}</p>
                </div>
              )}

              {/* Current Platforms (read-only display) */}
              <div>
                <h4 className="mb-3 text-sm font-medium text-muted-foreground">
                  Plateformes actuelles
                </h4>
                <div className="flex flex-wrap gap-2">
                  {(post.platforms || []).map((platform) => {
                    const config = platformConfig[platform as keyof typeof platformConfig];
                    if (!config) return null;
                    const Icon = config.icon;
                    return (
                      <div
                        key={platform}
                        className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5"
                      >
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient}`}
                        >
                          <Icon className="h-3.5 w-3.5 text-white" />
                        </div>
                        <span className="text-sm font-medium">{config.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Schedule Info */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(post.scheduled_for), "EEEE d MMMM yyyy", {
                      locale: fr,
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-4 py-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(post.scheduled_for), "HH:mm")}
                  </span>
                </div>
              </div>

              {/* Error Message */}
              {post.error_message && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                  <h4 className="mb-2 text-sm font-medium text-destructive">
                    Erreur
                  </h4>
                  <p className="text-sm text-destructive/80">{post.error_message}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="platforms" className="space-y-4 m-0">
              <div className="rounded-xl border border-border p-4">
                <h4 className="mb-4 text-sm font-medium">
                  Sélectionnez les plateformes de publication
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(platformConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = selectedPlatforms.includes(key);
                    return (
                      <motion.button
                        key={key}
                        type="button"
                        onClick={() => togglePlatform(key)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute right-2 top-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${config.gradient}`}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-medium">{config.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button 
                    onClick={handleSavePlatforms} 
                    disabled={isSaving || selectedPlatforms.length === 0}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="models" className="space-y-4 m-0">
              <div className="rounded-xl border border-border p-4">
                <h4 className="mb-2 text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Produits IA disponibles
                </h4>
                <p className="mb-4 text-xs text-muted-foreground">
                  Sélectionnez un produit pour régénérer le contenu de ce post
                </p>
                
                <div className="grid gap-3 sm:grid-cols-2">
                  {relevantProducts.map((product) => {
                    const isSelected = selectedProduct?.id === product.id;
                    return (
                      <motion.button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`relative flex flex-col rounded-xl border-2 p-3 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {product.popular && (
                          <div className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                            ⭐ POPULAIRE
                          </div>
                        )}
                        {product.badge && !product.popular && (
                          <div className="absolute -right-1 -top-1 flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground shadow-sm">
                            {product.badge}
                          </div>
                        )}
                        {isSelected && !product.popular && !product.badge && (
                          <div className="absolute right-2 top-2">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                              <Check className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-semibold text-sm">{product.name}</span>
                          {product.tier !== "standard" && (
                            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase bg-primary/20 text-primary">
                              {product.tier}
                            </span>
                          )}
                        </div>
                        <p className="mb-2 text-xs text-muted-foreground line-clamp-1">
                          {product.description}
                        </p>
                        <div className="flex items-center gap-1 mt-auto">
                          <span className="text-lg font-bold text-primary">{product.salePrice}€</span>
                          <span className="text-xs text-muted-foreground">{product.salePriceUnit}</span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {selectedProduct && (
                  <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <p className="text-sm">
                      <span className="font-medium">Produit sélectionné :</span>{" "}
                      {selectedProduct.name} - {selectedProduct.salePrice}€{selectedProduct.salePriceUnit}
                    </p>
                    <Button className="mt-3 w-full" size="sm">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Régénérer avec {selectedProduct.name}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-border mt-4">
          {onEdit && (
            <Button
              variant="outline"
              onClick={() => onEdit(post)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Éditer
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-2 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Supprimer
            </Button>
          )}
          {onPublishNow && post.status !== "published" && (
            <Button
              onClick={handlePublishNow}
              disabled={isPublishing}
              className="ml-auto gap-2"
            >
              {isPublishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Publier maintenant
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
