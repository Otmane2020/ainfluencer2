import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface GenerationWaitModalProps {
  open: boolean;
  status: string;
  mediaType: "image" | "video";
  onCancel?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  "": "Starting…",
  queued: "Queued…",
  in_progress: "Generating…",
  completed: "Done!",
};

/** Maps a coarse Higgsfield status into a target percentage to animate toward. */
function targetForStatus(status: string): number {
  if (status === "completed") return 100;
  if (status === "in_progress") return 92;
  if (status === "queued") return 10;
  return 4;
}

/** Simple indeterminate-ish progress modal shown while a Higgsfield generation is in flight. */
export function GenerationWaitModal({ open, status, mediaType, onCancel }: GenerationWaitModalProps) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        const target = targetForStatus(status);
        if (p >= target) return p;
        // Ease toward the target — faster when far away, slower as it approaches.
        const step = Math.max(0.3, (target - p) * 0.08);
        return Math.min(target, p + step);
      });
    }, 200);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open, status]);

  const displayProgress = Math.round(progress);

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-sm text-center [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Generating {mediaType}</DialogTitle>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <Loader2 className="absolute h-16 w-16 animate-spin text-primary/30" />
            <Sparkles className="h-6 w-6 text-primary" />
          </div>

          <div className="space-y-1">
            <p className="font-semibold">
              {mediaType === "image" ? "Generating your image" : "Generating your video"}
            </p>
            <p className="text-sm text-muted-foreground">Please wait, this can take a minute…</p>
          </div>

          <div className="w-full space-y-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full gradient-primary transition-all duration-200"
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{STATUS_LABEL[status] || "Generating…"}</span>
              <span>{displayProgress}%</span>
            </div>
          </div>

          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel} className="text-muted-foreground">
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
