import { useCallback, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/**
 * supabase-js's FunctionsHttpError.message is always the generic
 * "Edge Function returned a non-2xx status code" — the actual error we
 * return from the edge function body (e.g. "prompt is required",
 * "Higgsfield credentials not configured") is only reachable via
 * error.context, the raw Response object.
 */
async function extractFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.clone().json();
      if (body?.error) return body.error;
    } catch {
      /* body wasn't JSON — fall through to the generic message */
    }
  }
  return (error as Error).message;
}

export interface HiggsfieldResult {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw";
  request_id?: string;
  images?: { url: string }[];
  video?: { url: string };
  error?: string;
}

interface SaveOpts {
  type: "image" | "video";
  prompt: string;
  model: string;
  duration?: number;
}

interface GenerateOpts {
  /** Higgsfield API path for the model, e.g. "/v1/text2image/soul" or "/v1/image2video/dop" */
  endpoint: string;
  payload: Record<string, unknown>;
  onProgress?: (status: string) => void;
  timeoutMs?: number;
  /** Persist the finished generation so it shows up in History */
  save?: SaveOpts;
}


/**
 * Higgsfield generation hook — submits an async request then polls until
 * completed/failed. Works for both images and image-to-video models.
 */
export function useHiggsfield() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HiggsfieldResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<{ requestId?: string; cancelled: boolean }>({ cancelled: false });

  const generate = useCallback(async ({ endpoint, payload, onProgress, timeoutMs = 300_000 }: GenerateOpts) => {
    setLoading(true);
    setError(null);
    setResult(null);
    cancelRef.current = { cancelled: false };

    try {
      const submit = await supabase.functions.invoke("higgsfield-generate", {
        body: { action: "submit", endpoint, payload },
      });
      if (submit.error) throw new Error(await extractFunctionErrorMessage(submit.error));
      const initial = submit.data as HiggsfieldResult;
      if (!initial?.request_id) {
        throw new Error(initial?.error || "Higgsfield: no request_id returned");
      }
      cancelRef.current.requestId = initial.request_id;
      onProgress?.(initial.status);

      const started = Date.now();
      while (!cancelRef.current.cancelled) {
        if (Date.now() - started > timeoutMs) throw new Error("Generation timed out");
        await new Promise((r) => setTimeout(r, 3000));
        const s = await supabase.functions.invoke("higgsfield-generate", {
          body: { action: "status", request_id: initial.request_id },
        });
        if (s.error) throw new Error(await extractFunctionErrorMessage(s.error));
        const cur = s.data as HiggsfieldResult;
        onProgress?.(cur.status);
        if (cur.status === "completed") {
          setResult(cur);
          return cur;
        }
        if (cur.status === "failed" || cur.status === "nsfw") {
          throw new Error(cur.error || `Generation ${cur.status}`);
        }
      }
      throw new Error("Cancelled");
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async () => {
    cancelRef.current.cancelled = true;
    const rid = cancelRef.current.requestId;
    if (rid) {
      try {
        await supabase.functions.invoke("higgsfield-generate", {
          body: { action: "cancel", request_id: rid },
        });
      } catch {
        /* ignore */
      }
    }
  }, []);

  return { generate, cancel, loading, result, error };
}
