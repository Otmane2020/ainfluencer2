import { motion } from "framer-motion";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from "lucide-react";
import defaultPostBg from "@/assets/default-post-bg.jpg";

interface PostPreviewProps {
  content: {
    text: string;
    imageUrl?: string;
  };
  username?: string;
  avatar?: string;
}

export const PostPreview = ({ content, username = "ai_influencer", avatar }: PostPreviewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="overflow-hidden rounded-2xl bg-card shadow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full gradient-primary p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-card">
              {avatar ? (
                <img src={avatar} alt={username} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-gradient">AI</span>
              )}
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">{username}</p>
            <p className="text-xs text-muted-foreground">Sponsorisé</p>
          </div>
        </div>
        <button className="p-2 hover:bg-muted rounded-full transition-colors">
          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Image */}
      <div className="aspect-square w-full bg-muted">
        <img
          src={content.imageUrl || defaultPostBg}
          alt="Post content"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 1.2 }}
            className="hover:text-secondary transition-colors"
          >
            <Heart className="h-6 w-6" />
          </motion.button>
          <button className="hover:text-muted-foreground transition-colors">
            <MessageCircle className="h-6 w-6" />
          </button>
          <button className="hover:text-muted-foreground transition-colors">
            <Send className="h-6 w-6" />
          </button>
        </div>
        <button className="hover:text-muted-foreground transition-colors">
          <Bookmark className="h-6 w-6" />
        </button>
      </div>

      {/* Likes */}
      <div className="px-4">
        <p className="font-semibold text-sm">12,458 J'aime</p>
      </div>

      {/* Caption */}
      <div className="p-4 pt-2">
        <p className="text-sm">
          <span className="font-semibold">{username}</span>{" "}
          <span className="text-foreground">{content.text}</span>
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Il y a 2 heures</p>
      </div>
    </motion.div>
  );
};
