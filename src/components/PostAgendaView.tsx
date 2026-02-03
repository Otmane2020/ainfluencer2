import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, startOfDay } from "date-fns";
import { Calendar, Image, Video, FileText, ExternalLink, Play } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShareButton } from "@/components/ShareButton";

interface ContentItem {
  id: string;
  content_type: "video" | "image" | "text";
  text_content: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  ai_prompt: string | null;
  status: string;
  created_at: string;
  platforms: string[] | null;
  campaign_id: string | null;
  campaign?: { name: string } | null;
  project_id?: string;
  project?: { name: string } | null;
}

interface AgendaDay {
  date: Date;
  label: string;
  items: ContentItem[];
}

interface PostAgendaViewProps {
  items: ContentItem[];
  onShare?: (item: ContentItem) => void;
  onPreview?: (item: ContentItem) => void;
}

export const PostAgendaView = ({ items, onShare, onPreview }: PostAgendaViewProps) => {
  const [selectedDay, setSelectedDay] = useState<AgendaDay | null>(null);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);

  // Group items by date
  const agendaDays = useMemo(() => {
    const dateMap = new Map<string, ContentItem[]>();

    items.forEach(item => {
      const date = startOfDay(new Date(item.created_at));
      const dateKey = date.toISOString();
      
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(item);
    });

    // Sort by date descending
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );

    return sortedDates.map(dateKey => {
      const date = new Date(dateKey);
      let label: string;

      if (isToday(date)) {
        label = "Today";
      } else if (isYesterday(date)) {
        label = "Yesterday";
      } else {
        label = format(date, "EEE, MMM d");
      }

      return {
        date,
        label,
        items: dateMap.get(dateKey)!
      };
    });
  }, [items]);

  const handleThumbnailClick = (day: AgendaDay, item?: ContentItem) => {
    if (day.items.length > 1 && !item) {
      // Multiple items - open day popup
      setSelectedDay(day);
    } else {
      // Single item or specific item selected - open preview
      const targetItem = item || day.items[0];
      setSelectedItem(targetItem);
    }
  };

  const getItemThumbnail = (item: ContentItem) => {
    return item.thumbnail_url || item.media_url;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-3 w-3" />;
      case "image": return <Image className="h-3 w-3" />;
      default: return <FileText className="h-3 w-3" />;
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">No published posts yet</p>
        <p className="text-sm text-muted-foreground">Your published posts will appear here</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {agendaDays.map((day, dayIndex) => (
          <motion.div
            key={day.date.toISOString()}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.05 }}
            className="flex gap-4 items-start"
          >
            {/* Date column */}
            <div className="w-20 shrink-0 pt-1">
              <p className="text-sm font-medium text-foreground">{day.label}</p>
              <p className="text-xs text-muted-foreground">
                {day.items.length} post{day.items.length > 1 ? "s" : ""}
              </p>
            </div>

            {/* Thumbnails row */}
            <div className="flex-1">
              <div className="flex gap-2 flex-wrap">
                {/* Show first 4 thumbnails */}
                {day.items.slice(0, 4).map((item, itemIndex) => (
                  <motion.button
                    key={item.id}
                    onClick={() => handleThumbnailClick(day, day.items.length === 1 ? item : undefined)}
                    className="relative group rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ width: 80, height: 80 }}
                  >
                    {getItemThumbnail(item) ? (
                      <img
                        src={getItemThumbnail(item)!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        {getTypeIcon(item.content_type)}
                      </div>
                    )}

                    {/* Type badge */}
                    <div className="absolute top-1 left-1">
                      <Badge 
                        variant="secondary" 
                        className="h-5 px-1 text-[10px] bg-black/60 text-white border-0"
                      >
                        {getTypeIcon(item.content_type)}
                      </Badge>
                    </div>

                    {/* Play icon for videos */}
                    {item.content_type === "video" && item.media_url && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-6 w-6 text-white fill-white" />
                      </div>
                    )}

                    {/* Multiple items overlay on last visible */}
                    {day.items.length > 4 && itemIndex === 3 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white font-bold text-lg">
                        +{day.items.length - 4}
                      </div>
                    )}
                  </motion.button>
                ))}

                {/* Show +X badge if more than 4 and we have exactly 4 shown */}
                {day.items.length > 4 && day.items.length <= 4 && (
                  <button
                    onClick={() => setSelectedDay(day)}
                    className="w-20 h-20 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-accent/10 transition-colors"
                  >
                    +{day.items.length - 4}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Day Popup - Multiple items */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {selectedDay?.label} - {selectedDay?.items.length} posts
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="grid grid-cols-2 gap-3 p-1">
              {selectedDay?.items.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    setSelectedDay(null);
                    setSelectedItem(item);
                  }}
                  className="relative group rounded-xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all aspect-square"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {getItemThumbnail(item) ? (
                    <img
                      src={getItemThumbnail(item)!}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(item.content_type)}
                    </div>
                  )}

                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <Badge 
                      variant="secondary" 
                      className="h-6 px-2 text-xs bg-black/60 text-white border-0 gap-1"
                    >
                      {getTypeIcon(item.content_type)}
                      {item.content_type}
                    </Badge>
                  </div>

                  {/* Time */}
                  <div className="absolute bottom-2 right-2">
                    <Badge 
                      variant="secondary" 
                      className="h-5 px-1.5 text-[10px] bg-black/60 text-white border-0"
                    >
                      {format(new Date(item.created_at), "HH:mm")}
                    </Badge>
                  </div>

                  {/* Play icon for videos */}
                  {item.content_type === "video" && item.media_url && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="h-10 w-10 text-white fill-white" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Item Detail Popup */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl bg-card border-border p-0 overflow-hidden">
          {selectedItem && (
            <div className="flex flex-col">
              {/* Media */}
              <div className="relative bg-black aspect-video flex items-center justify-center">
                {selectedItem.content_type === "video" && selectedItem.media_url ? (
                  <video
                    src={selectedItem.media_url}
                    controls
                    autoPlay
                    className="max-h-[50vh] w-full object-contain"
                  />
                ) : getItemThumbnail(selectedItem) ? (
                  <img
                    src={getItemThumbnail(selectedItem)!}
                    alt=""
                    className="max-h-[50vh] w-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <FileText className="h-12 w-12" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1">
                      {getTypeIcon(selectedItem.content_type)}
                      {selectedItem.content_type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(selectedItem.created_at), "MMM d, yyyy 'at' HH:mm")}
                    </span>
                  </div>

                  <ShareButton
                    videoUrl={selectedItem.media_url || undefined}
                    thumbnailUrl={getItemThumbnail(selectedItem) || undefined}
                    title={selectedItem.text_content?.slice(0, 50) || "AI Content"}
                    description={selectedItem.ai_prompt || "Created with AI Influencer"}
                    brandName={selectedItem.project?.name}
                    onShare={(platform) => {
                      console.log(`Shared to ${platform}`);
                    }}
                  />
                </div>

                {/* Text content */}
                {selectedItem.text_content && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm max-h-32 overflow-y-auto">
                    {selectedItem.text_content}
                  </div>
                )}

                {/* Platforms */}
                {selectedItem.platforms && selectedItem.platforms.length > 0 && (
                  <div className="flex gap-2">
                    {selectedItem.platforms.map(platform => (
                      <Badge key={platform} variant="secondary" className="capitalize">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
