import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Film, Play, Download, Trash2, Music, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface Project {
  id: string;
  name: string;
  theme_color: string;
}

interface ReelItem {
  id: string;
  imageUrl: string;
  musicUrl?: string;
  createdAt: Date;
  fileName: string;
}

const ReelHistoryPage = () => {
  const navigate = useNavigate();
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedReel, setSelectedReel] = useState<ReelItem | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProjects();
      loadReels();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name, theme_color")
      .eq("user_id", user.id)
      .order("name");
    if (data) setProjects(data);
  };

  const loadReels = async () => {
    setIsLoading(true);
    try {
      // Fetch reel images from storage (files named reel-*)
      const { data: files, error } = await supabase.storage
        .from("media")
        .list("images", {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) {
        console.error("Error fetching reels:", error);
        return;
      }

      // Filter only reel files
      const reelFiles = (files || []).filter(f => f.name.startsWith("reel-"));
      
      const reelItems: ReelItem[] = reelFiles.map(file => {
        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(`images/${file.name}`);
        
        return {
          id: file.id || file.name,
          imageUrl: urlData.publicUrl,
          fileName: file.name,
          createdAt: new Date(file.created_at || Date.now()),
        };
      });

      setReels(reelItems);
    } catch (error) {
      console.error("Error loading reels:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadReels();
    toast({
      title: "Refreshed",
      description: `Found ${reels.length} reels`,
    });
  };

  const handleDelete = async (reel: ReelItem) => {
    try {
      const { error } = await supabase.storage
        .from("media")
        .remove([`images/${reel.fileName}`]);

      if (error) throw error;

      setReels(prev => prev.filter(r => r.id !== reel.id));
      toast({
        title: "Reel deleted",
        description: "Reel has been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete reel",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (reel: ReelItem) => {
    try {
      const response = await fetch(reel.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = reel.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download reel",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          Reels
        </h1>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="h-9 w-[140px] text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              <SelectItem value="all">All</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: project.theme_color }}
                    />
                    <span className="truncate max-w-[100px]">{project.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Reel Grid - Mobile-first 9:16 format */}
      {reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Film className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-3">No reels yet</p>
          <Button size="sm" onClick={() => navigate("/clipmotion")}>
            Create Reel
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className="group relative aspect-[9/16] rounded-xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all cursor-pointer"
              onClick={() => setSelectedReel(reel)}
            >
              {/* Reel Image */}
              <img
                src={reel.imageUrl}
                alt="Reel"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Reel badge */}
              <Badge className="absolute top-2 left-2 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5">
                9:16
              </Badge>

              {/* Actions on hover */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] text-white/80 truncate">
                  {formatDate(reel.createdAt)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-white/20 hover:bg-white/30 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(reel);
                    }}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-muted/50 hover:bg-destructive/80 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(reel);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="h-12 w-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                  <Play className="h-6 w-6 text-white fill-white" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reel Preview Dialog - Mobile optimized */}
      <Dialog open={!!selectedReel} onOpenChange={() => setSelectedReel(null)}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-background border-0">
          {selectedReel && (
            <div className="relative aspect-[9/16] w-full">
              <img
                src={selectedReel.imageUrl}
                alt="Reel Preview"
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {/* Action bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/70">
                    {formatDate(selectedReel.createdAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleDownload(selectedReel)}
                      className="h-8 gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReelHistoryPage;
