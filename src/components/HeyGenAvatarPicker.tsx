import { useState, useEffect } from "react";
import { Loader2, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface HeyGenAvatar {
  avatar_id: string;
  avatar_name: string;
  preview_image_url?: string;
  preview_video_url?: string;
  gender?: string;
}

interface HeyGenAvatarPickerProps {
  selectedAvatarId: string;
  onAvatarSelect: (avatarId: string, avatarName: string, previewUrl?: string) => void;
}

// Popular default avatars as fallback
const DEFAULT_AVATARS: HeyGenAvatar[] = [
  { avatar_id: "Daisy-inskirt-20220818", avatar_name: "Daisy", gender: "female" },
  { avatar_id: "josh_lite3_20230714", avatar_name: "Josh", gender: "male" },
  { avatar_id: "Anna_public_3_20240108", avatar_name: "Anna", gender: "female" },
  { avatar_id: "Tyler-incasualsuit-20220721", avatar_name: "Tyler", gender: "male" },
  { avatar_id: "Kayla-incasualsuit-20220818", avatar_name: "Kayla", gender: "female" },
  { avatar_id: "jeff_lite_20230714", avatar_name: "Jeff", gender: "male" },
];

export const HeyGenAvatarPicker = ({ selectedAvatarId, onAvatarSelect }: HeyGenAvatarPickerProps) => {
  const [avatars, setAvatars] = useState<HeyGenAvatar[]>(DEFAULT_AVATARS);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasLoadedApi, setHasLoadedApi] = useState(false);
  const { toast } = useToast();

  const loadAvatars = async () => {
    if (hasLoadedApi) return;
    setIsLoading(true);
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
        }));
        setAvatars(mapped);
      }
      setHasLoadedApi(true);
    } catch (err) {
      console.warn("[HeyGen] Failed to load avatars, using defaults:", err);
      setHasLoadedApi(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAvatars();
  }, []);

  const filtered = avatars.filter(
    (a) =>
      a.avatar_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.avatar_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search avatars..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 text-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Loading HeyGen avatars...</span>
        </div>
      ) : (
        <ScrollArea className="h-[320px]">
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((avatar) => (
              <button
                key={avatar.avatar_id}
                onClick={() => onAvatarSelect(avatar.avatar_id, avatar.avatar_name, avatar.preview_image_url)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-all hover:bg-muted/50",
                  selectedAvatarId === avatar.avatar_id
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border"
                )}
              >
                <div className="h-16 w-16 overflow-hidden rounded-full bg-muted">
                  {avatar.preview_image_url ? (
                    <img
                      src={avatar.preview_image_url}
                      alt={avatar.avatar_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium truncate w-full text-center">
                  {avatar.avatar_name}
                </span>
                {avatar.gender && (
                  <span className="text-[9px] text-muted-foreground capitalize">{avatar.gender}</span>
                )}
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No avatars found</p>
          )}
        </ScrollArea>
      )}

      {!isLoading && !hasLoadedApi && (
        <Button variant="outline" size="sm" onClick={loadAvatars} className="w-full text-xs">
          Load all HeyGen avatars
        </Button>
      )}
    </div>
  );
};
