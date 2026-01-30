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

  // Filter out published posts - queue only shows pending posts
  const pendingPosts = posts.filter(post => post.status !== "published");

  const handleCopy = async (post: ScheduledPost) => {
    try {
      await navigator.clipboard.writeText(post.content.text);
      setCopiedId(post.id);
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({
        title: "Error",
        description: "Unable to copy content",
        variant: "destructive",
      });
    }
  };

  const statusConfig = {
    draft: {
      label: "Draft",
      className: "bg-muted text-muted-foreground",
    },
    scheduled: {
      label: "Scheduled",
      className: "bg-accent/20 text-accent-foreground",
    },
  };

  if (pendingPosts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-card p-4 md:p-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Calendar className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h3 className="font-display text-base md:text-lg font-semibold">Queue</h3>
            <p className="text-xs md:text-sm text-muted-foreground">Your scheduled posts</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 md:py-12 text-center">
          <div className="mb-4 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No posts in queue</p>
          <p className="text-xs md:text-sm text-muted-foreground">Generate content to get started</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-card p-4 md:p-6 shadow-card"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Calendar className="h-5 w-5 text-foreground" />
        </div>
        <div>
        <h3 className="font-display text-base md:text-lg font-semibold">Queue</h3>
          <p className="text-xs md:text-sm text-muted-foreground">{pendingPosts.length} post(s) pending</p>
        </div>
      </div>

      <div className="space-y-3">
        {pendingPosts.map((post, index) => {
          const status = statusConfig[post.status];

          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * index }}
              className="group rounded-xl border border-border p-3 md:p-4 transition-all hover:border-primary/30"
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
                        {new Date(post.scheduledFor).toLocaleDateString("en-US", {
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

              {/* Actions - Always visible on mobile */}
              <div className="mt-3 flex flex-wrap items-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(post)}
                  className="h-8 rounded-full text-xs"
                >
                  {copiedId === post.id ? (
                    <Check className="h-3 w-3 mr-1 text-primary" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  Copy
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPublishNow(post)}
                  className="h-8 rounded-full text-xs"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Share
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(post.id)}
                  className="h-8 rounded-full text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
