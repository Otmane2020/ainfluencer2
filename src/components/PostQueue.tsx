import { motion } from "framer-motion";
import { Calendar, Clock, Send, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ScheduledPost {
  id: string;
  content: {
    text: string;
    imageUrl?: string;
  };
  scheduledFor?: Date;
  platforms: ("instagram" | "facebook")[];
  status: "draft" | "scheduled" | "published";
}

interface PostQueueProps {
  posts: ScheduledPost[];
  onPublishNow: (post: ScheduledPost) => void;
  onDelete: (id: string) => void;
}

export const PostQueue = ({ posts, onPublishNow, onDelete }: PostQueueProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleCopy = async (post: ScheduledPost) => {
    try {
      await navigator.clipboard.writeText(post.content.text);
      setCopiedId(post.id);
      toast({
        title: "Copié !",
        description: "Le contenu a été copié dans le presse-papiers",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de copier le contenu",
        variant: "destructive",
      });
    }
  };

  const statusConfig = {
    draft: {
      label: "Brouillon",
      className: "bg-muted text-muted-foreground",
    },
    scheduled: {
      label: "Programmé",
      className: "bg-accent/20 text-accent",
    },
    published: {
      label: "Publié",
      className: "bg-green-100 text-green-700",
    },
  };

  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-card p-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Calendar className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">File d'attente</h3>
            <p className="text-sm text-muted-foreground">Vos posts programmés</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Aucun post dans la file</p>
          <p className="text-sm text-muted-foreground">Générez du contenu pour commencer</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-card p-6 shadow-card"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Calendar className="h-5 w-5 text-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">File d'attente</h3>
          <p className="text-sm text-muted-foreground">{posts.length} post(s) en attente</p>
        </div>
      </div>

      <div className="space-y-3">
        {posts.map((post, index) => {
          const status = statusConfig[post.status];

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className="group rounded-xl border-2 border-border p-4 transition-all hover:border-primary/30"
            >
              <div className="flex items-start gap-3">
                {post.content.imageUrl && (
                  <img
                    src={post.content.imageUrl}
                    alt="Post thumbnail"
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm">{post.content.text}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    {post.scheduledFor && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(post.scheduledFor).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(post)}
                  className="h-8 rounded-full"
                >
                  {copiedId === post.id ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  Copier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPublishNow(post)}
                  className="h-8 rounded-full"
                >
                  <Send className="h-4 w-4" />
                  Publier
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(post.id)}
                  className="h-8 rounded-full text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
