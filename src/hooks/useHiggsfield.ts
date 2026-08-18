import { useCallback, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { HIGGSFIELD_PROVIDER_CREDIT_USD } from "@/lib/clipmotionEconomics";

async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      if (body?.error) {
        if (body.required_credits) return `${body.error} — ${body.required_credits} credits required`;
        return body.error;
      }
    } catch {
      // fall through
    }
  }
  return error instanceof Error ? error.message : "Generation failed";
}

export interface HiggsfieldResult {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw";
  request_id?: string;
  images?: { url: string }[];
  video?: { url: string };
  error?: string;
  credits_charged?: number;
  credits_refunded?: boolean;
  estimated_provider_cost_usd?: number;
}

interface SaveOpts {
  type: "image" | "video";
  prompt: string;
  model: string;
  duration?: number;
}

async function persistGeneration(
  save: SaveOpts,
  result: HiggsfieldResult,
  chargedCredits?: number,
) {
  const mediaUrl = save.type === "video" ? result.video?.url : result.images?.[0]?.url;
  if (!mediaUrl) return;

  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const credits = result.credits_charged ?? chargedCredits ?? 0;

    await supabase.from("generations").insert({
      user_id: auth.user.id,
      type: save.type,
      status: "completed",
      progress: 100,
      provider: "higgsfield",
      model: save.model,
      prompt: save.prompt,
      media_url: mediaUrl,
      duration: save.duration ?? null,
      external_task_id: result.request_id ?? null,
      estimated_cost: credits ? Number((credits * HIGGSFIELD_PROVIDER_CREDIT_USD).toFixed(4)) : 0,
      actual_cost: result.estimated_provider_cost_usd ?? null,
      completed_at: new Date().toISOString(),
    });
  } catch {
    // History persistence must never break generation.
  }
}

interface GenerateOpts {
  endpoint: string;
  payload: Record<string, unknown>;
  onProgress?: (status: string) => void;
  timeoutMs?: number;
  save?: SaveOpts;
}

function announceCreditChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clipmotion:credits-changed"));
  }
}

export function useHiggsfield() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HiggsfieldResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<{ requestId?: string; cancelled: boolean }>({ cancelled: false });

  const generate = useCallback(async ({ endpoint, payload, onProgress, timeoutMs = 300_000, save }: GenerateOpts) => {
    setLoading(true);
    setError(null);
    setResult(null);
    cancelRef.current = { cancelled: false };
    let chargedCredits: number | undefined;

    try {
      const submit = await supabase.functions.invoke("higgsfield-generate", {
        body: { action: "submit", endpoint, payload },
      });
      if (submit.error) throw new Error(await extractFunctionErrorMessage(submit.error));

      const initial = submit.data as HiggsfieldResult;
      if (!initial?.request_id) throw new Error(initial?.error || "Higgsfield: no request_id returned");

      chargedCredits = initial.credits_charged;
      if (chargedCredits) announceCreditChange();
      cancelRef.current.requestId = initial.request_id;
      onProgress?.(initial.status);

      const started = Date.now();
      while (!cancelRef.current.cancelled) {
        if (Date.now() - started > timeoutMs) throw new Error("Generation timed out");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const statusResponse = await supabase.functions.invoke("higgsfield-generate", {
          body: { action: "status", request_id: initial.request_id },
        });
        if (statusResponse.error) throw new Error(await extractFunctionErrorMessage(statusResponse.error));

        const current = statusResponse.data as HiggsfieldResult;
        if (current.credits_refunded) announceCreditChange();
        onProgress?.(current.status);

        if (current.status === "completed") {
          const merged = { ...current, credits_charged: current.credits_charged ?? chargedCredits };
          setResult(merged);
          if (save) await persistGeneration(save, merged, chargedCredits);
          return merged;
        }

        if (current.status === "failed" || current.status === "nsfw") {
          throw new Error(current.error || `Generation ${current.status}`);
        }
      }

      throw new Error("Cancelled");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Generation failed";
      setError(message);
      throw caught;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    cancelRef.current.cancelled = true;
    const requestId = cancelRef.current.requestId;
    if (!requestId) return;

    try {
      await supabase.functions.invoke("higgsfield-generate", {
        body: { action: "cancel", request_id: requestId },
      });
    } catch {
      // Cancellation is best-effort.
    }
  }, []);

  return { generate, cancel, loading, result, error };
}
