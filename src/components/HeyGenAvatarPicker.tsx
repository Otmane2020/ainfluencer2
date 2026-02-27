import { useState, useEffect } from "react";
import { Loader2, User, Search, Shuffle, Check, ArrowLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AvatarScene {
  scene_id: string;
  preview_image_url: string;
  preview_video_url?: string;
  label?: string;
}

interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  preview_image_url?: string;
  preview_video_url?: string;
  gender?: string;
  category?: string;
  scenes?: AvatarScene[];
  is_favorite?: boolean;
}

interface HeyGenAvatarPickerProps {
  selectedAvatarId: string;
  onAvatarSelect: (avatarId: string, avatarName: string, previewUrl?: string) => void;
  onClose?: () => void;
}

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "professional", label: "Professional" },
  { id: "lifestyle", label: "Lifestyle" },
  { id: "ugc", label: "UGC" },
  { id: "community", label: "Community" },
  { id: "favorites", label: "Favorites" },
] as const;

// Curated defaults with categories & scenes
const DEFAULT_AVATARS: HeyGenAvatar[] = [
  {
    avatar_id: "Daisy-inskirt-20220818", avatar_name: "Daisy", gender: "female", category: "professional",
    scenes: [
      { scene_id: "default", preview_image_url: "", label: "Office" },
      { scene_id: "casual", preview_image_url: "", label: "Casual" },
    ],
  },
  { avatar_id: "josh_lite3_20230714", avatar_name: "Josh", gender: "male", category: "ugc" },
  { avatar_id: "Anna_public_3_20240108", avatar_name: "Anna", gender: "female", category: "professional" },
  { avatar_id: "Tyler-incasualsuit-20220721", avatar_name: "Tyler", gender: "male", category: "lifestyle" },
  { avatar_id: "Kayla-incasualsuit-20220818", avatar_name: "Kayla", gender: "female", category: "ugc" },
  { avatar_id: "jeff_lite_20230714", avatar_name: "Jeff", gender: "male", category: "community" },
];

export const HeyGenAvatarPicker = ({ selectedAvatarId, onAvatarSelect, onClose }: HeyGenAvatarPickerProps) => {
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>(DEFAULT_AVATARS);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [shuffleScenes, setShuffleScenes] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<HeyGenAvatar | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState<string>("default");
  const { toast } = useToast();

  // Load avatars from DB cache first, then API
  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    setIsLoading(true);
    try {
      // 1. Try DB cache first
      const { data: cached } = await supabase
        .from("heygen_avatars")
        .select("*")
        .order("avatar_name");

      if (cached && cached.length > 5) {
        const mapped: HeyGenAvatar[] = cached.map((a: any) => ({
          avatar_id: a.avatar_id,
          avatar_name: a.avatar_name,
          preview_image_url: a.preview_image_url,
          preview_video_url: a.preview_video_url,
          gender: a.gender,
          category: a.category || "all",
          scenes: a.scenes || [],
          is_favorite: a.is_favorite,
        }));
        setAvatars(mapped);
        setIsLoading(false);
        // Refresh in background
        refreshFromApi(false);
        return;
      }

      // 2. Fetch from API
      await refreshFromApi(true);
    } catch (err) {
      console.warn("[HeyGen] Load error:", err);
      setIsLoading(false);
    }
  };

  const refreshFromApi = async (showLoader: boolean) => {
    try {
      const { data, error } = await supabase.functions.invoke("generate-video-heygen", {
        body: { action: "avatars" },
      });
      if (error) throw error;
      if (data?.avatars?.length > 0) {
        const mapped: HeyGenAvatar[] = data.avatars.map((a: any) => ({
          avatar_id: a.avatar_id,
          avatar_name: a.avatar_name || a.avatar_id,
          preview_image_url: a.preview_image_url,
          preview_video_url: a.preview_video_url,
          gender: a.gender,
          category: inferCategory(a),
          scenes: a.talking_photo_list?.map((s: any, i: number) => ({
            scene_id: s.id || `scene-${i}`,
            preview_image_url: s.preview_image_url || s.image_url || "",
            preview_video_url: s.preview_video_url || "",
            label: s.name || `Scene ${i + 1}`,
          })) || [],
        }));
        setAvatars(mapped);

        // Cache to DB in background
        cacheAvatarsToDb(mapped);
      }
    } catch (err) {
      console.warn("[HeyGen] API refresh failed:", err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const inferCategory = (avatar: any): string => {
    const name = (avatar.avatar_name || "").toLowerCase();
    const id = (avatar.avatar_id || "").toLowerCase();
    if (id.includes("professional") || id.includes("suit") || id.includes("office")) return "professional";
    if (id.includes("casual") || id.includes("lifestyle") || name.includes("lifestyle")) return "lifestyle";
    if (id.includes("ugc") || id.includes("community")) return "ugc";
    // Distribute based on gender for variety
    if (avatar.gender === "female") return "lifestyle";
    return "professional";
  };

  const cacheAvatarsToDb = async (avatarList: HeyGenAvatar[]) => {
    try {
      // Use edge function to cache (service role)
      await supabase.functions.invoke("generate-video-heygen", {
        body: { action: "cache-avatars", avatars: avatarList.slice(0, 100) },
      });
    } catch {
      // Silent fail for caching
    }
  };

  const toggleFavorite = async (avatar: HeyGenAvatar) => {
    const updated = avatars.map(a =>
      a.avatar_id === avatar.avatar_id ? { ...a, is_favorite: !a.is_favorite } : a
    );
    setAvatars(updated);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Upsert user-specific favorite
        await supabase.from("heygen_avatars").upsert({
          avatar_id: avatar.avatar_id,
          avatar_name: avatar.avatar_name,
          preview_image_url: avatar.preview_image_url,
          gender: avatar.gender,
          category: avatar.category,
          scenes: avatar.scenes as any,
          is_favorite: !avatar.is_favorite,
          user_id: user.id,
        }, { onConflict: "avatar_id" });
      }
    } catch {
      // Silent
    }
  };

  const handleAvatarClick = (avatar: HeyGenAvatar) => {
    if (avatar.scenes && avatar.scenes.length > 1) {
      setSelectedAvatar(avatar);
      setSelectedSceneId("default");
    } else {
      // Direct select
      onAvatarSelect(avatar.avatar_id, avatar.avatar_name, avatar.preview_image_url);
    }
  };

  const handleUseAvatar = () => {
    if (!selectedAvatar) return;
    const scene = selectedAvatar.scenes?.find(s => s.scene_id === selectedSceneId);
    const preview = scene?.preview_image_url || selectedAvatar.preview_image_url;
    onAvatarSelect(selectedAvatar.avatar_id, selectedAvatar.avatar_name, preview);
    setSelectedAvatar(null);
  };

  // Pick random scene when shuffle is on
  const getDisplayImage = (avatar: HeyGenAvatar) => {
    if (shuffleScenes && avatar.scenes && avatar.scenes.length > 0) {
      const randomScene = avatar.scenes[Math.floor(Math.random() * avatar.scenes.length)];
      return randomScene.preview_image_url || avatar.preview_image_url;
    }
    return avatar.preview_image_url;
  };

  const filtered = avatars.filter(a => {
    const matchesSearch =
      a.avatar_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.avatar_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === "all" ||
      (activeCategory === "favorites" && a.is_favorite) ||
      a.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Scene detail view for a specific avatar
  if (selectedAvatar) {
    return (
      <div className="space-y-4">
        {/* Back header */}
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedAvatar(null)} className="p-1 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h3 className="text-lg font-semibold">{selectedAvatar.avatar_name}</h3>
        </div>

        {/* Scenes grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {selectedAvatar.scenes && selectedAvatar.scenes.length > 0 ? (
              selectedAvatar.scenes.map((scene) => (
                <button
                  key={scene.scene_id}
                  onClick={() => setSelectedSceneId(scene.scene_id)}
                  className={cn(
                    "relative group rounded-xl overflow-hidden border-2 aspect-[3/4] transition-all",
                    selectedSceneId === scene.scene_id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {scene.preview_image_url ? (
                    <img
                      src={scene.preview_image_url}
                      alt={scene.label || selectedAvatar.avatar_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full bg-muted flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <span className="text-white text-xs font-medium">{scene.label || selectedAvatar.avatar_name}</span>
                  </div>
                  {/* Selected indicator */}
                  {selectedSceneId === scene.scene_id && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="col-span-4 flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <User className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No scenes available for this avatar</p>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Use Avatar button */}
        <Button
          onClick={handleUseAvatar}
          className="w-full gap-2"
          size="lg"
        >
          <User className="h-4 w-4" />
          Use Avatar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search avatars..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
              activeCategory === cat.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Shuffle toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {filtered.length} avatar{filtered.length !== 1 ? "s" : ""}
        </span>
        <label className="flex items-center gap-2 cursor-pointer">
          <Shuffle className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Shuffle scenes</span>
          <Switch
            checked={shuffleScenes}
            onCheckedChange={setShuffleScenes}
            className="scale-75"
          />
        </label>
      </div>

      {/* Avatar grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading avatars...</span>
        </div>
      ) : (
        <ScrollArea className="h-[380px]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {filtered.map((avatar) => (
              <div key={avatar.avatar_id} className="relative group">
                <button
                  onClick={() => handleAvatarClick(avatar)}
                  className={cn(
                    "w-full rounded-xl overflow-hidden border-2 aspect-[3/4] transition-all",
                    selectedAvatarId === avatar.avatar_id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="h-full w-full bg-muted relative">
                    {getDisplayImage(avatar) ? (
                      <img
                        src={getDisplayImage(avatar)!}
                        alt={avatar.avatar_name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    {/* Name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                      <span className="text-white text-xs font-medium">{avatar.avatar_name}</span>
                    </div>
                    {/* Scene count badge */}
                    {avatar.scenes && avatar.scenes.length > 1 && (
                      <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] px-1.5 py-0 bg-black/50 text-white border-0">
                        {avatar.scenes.length} scenes
                      </Badge>
                    )}
                    {/* Selected check */}
                    {selectedAvatarId === avatar.avatar_id && (
                      <div className="absolute top-2 right-2 bg-primary rounded-full p-0.5">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                </button>
                {/* Favorite star */}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(avatar); }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100 z-10"
                >
                  <Star className={cn("h-3.5 w-3.5", avatar.is_favorite ? "fill-yellow-400 text-yellow-400" : "text-white")} />
                </button>
              </div>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-12">No avatars found</p>
          )}
        </ScrollArea>
      )}
    </div>
  );
};
