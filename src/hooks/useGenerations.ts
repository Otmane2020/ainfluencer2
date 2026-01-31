import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// GENERATION TRACKING HOOK
// Real-time progress updates with polling and Supabase Realtime
// ============================================================

export interface Generation {
  id: string;
  user_id: string;
  project_id: string | null;
  campaign_id: string | null;
  type: "video" | "image" | "reel" | "clipmotion" | "avatar";
  video_mode: "standard" | "clipmotion";
  status: "pending" | "generating" | "processing" | "completed" | "failed";
  progress: number;
  step: "initializing" | "script" | "image" | "video" | "voiceover" | "finalizing";
  external_task_id: string | null;
  prompt: string | null;
  script: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  audio_url: string | null;
  duration: number;
  model: string | null;
  quality: string;
  format: string;
  estimated_cost: number;
  actual_cost: number | null;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StartGenerationParams {
  type: "video" | "image" | "reel" | "clipmotion" | "avatar";
  projectId?: string;
  campaignId?: string;
  prompt: string;
  script?: string;
  duration?: number;
  model?: string;
  quality?: string;
  format?: string;
  videoMode?: "standard" | "clipmotion";
  estimatedCost?: number;
}

export interface UpdateProgressParams {
  generationId: string;
  status?: Generation["status"];
  progress?: number;
  step?: Generation["step"];
  externalTaskId?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  errorMessage?: string;
  actualCost?: number;
}

// Step weights for progress calculation
export const STEP_WEIGHTS: Record<string, { min: number; max: number }> = {
  initializing: { min: 0, max: 5 },
  script: { min: 5, max: 20 },
  image: { min: 20, max: 40 },
  video: { min: 40, max: 80 },
  voiceover: { min: 80, max: 90 },
  finalizing: { min: 90, max: 100 },
};

export function useGenerations() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [activeGenerations, setActiveGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  // Get access token
  const getAccessToken = useCallback(async () => {
    if (accessTokenRef.current) return accessTokenRef.current;
    const { data } = await supabase.auth.getSession();
    accessTokenRef.current = data.session?.access_token || null;
    return accessTokenRef.current;
  }, []);

  // Fetch generations list
  const fetchGenerations = useCallback(async (type?: string, status?: string) => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const params = new URLSearchParams({ action: "list" });
      if (type) params.set("type", type);
      if (status) params.set("status", status);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-generation?${params}`,
        {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch generations");

      const data = await response.json();
      setGenerations(data.generations || []);
      setActiveGenerations(data.activeGenerations || []);
      setError(null);
    } catch (err) {
      console.error("[useGenerations] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch generations");
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  // Start a new generation
  const startGeneration = useCallback(async (params: StartGenerationParams): Promise<string | null> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-generation?action=start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start generation");
      }

      const data = await response.json();
      
      // Immediately add to active generations for instant UI feedback
      const newGeneration: Generation = {
        id: data.generationId,
        user_id: "",
        project_id: params.projectId || null,
        campaign_id: params.campaignId || null,
        type: params.type,
        video_mode: params.videoMode || "standard",
        status: "pending",
        progress: 0,
        step: "initializing",
        external_task_id: null,
        prompt: params.prompt,
        script: params.script || null,
        media_url: null,
        thumbnail_url: null,
        audio_url: null,
        duration: params.duration || 8,
        model: params.model || "smart-video",
        quality: params.quality || "720p",
        format: params.format || "reel",
        estimated_cost: params.estimatedCost || 0,
        actual_cost: null,
        error_message: null,
        retry_count: 0,
        started_at: new Date().toISOString(),
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setActiveGenerations(prev => [newGeneration, ...prev]);
      setGenerations(prev => [newGeneration, ...prev]);

      return data.generationId;
    } catch (err) {
      console.error("[useGenerations] Start error:", err);
      throw err;
    }
  }, [getAccessToken]);

  // Update generation progress
  const updateProgress = useCallback(async (params: UpdateProgressParams): Promise<void> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-generation?action=update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update progress");
      }

      // Update local state immediately
      const updateLocalState = (gen: Generation) => {
        if (gen.id !== params.generationId) return gen;
        return {
          ...gen,
          status: params.status || gen.status,
          progress: params.progress ?? gen.progress,
          step: params.step || gen.step,
          external_task_id: params.externalTaskId || gen.external_task_id,
          media_url: params.mediaUrl || gen.media_url,
          thumbnail_url: params.thumbnailUrl || gen.thumbnail_url,
          audio_url: params.audioUrl || gen.audio_url,
          error_message: params.errorMessage || gen.error_message,
          actual_cost: params.actualCost ?? gen.actual_cost,
          updated_at: new Date().toISOString(),
        };
      };

      setGenerations(prev => prev.map(updateLocalState));
      setActiveGenerations(prev => {
        const updated = prev.map(updateLocalState);
        // Remove completed/failed from active
        return updated.filter(g => g.status !== "completed" && g.status !== "failed");
      });

    } catch (err) {
      console.error("[useGenerations] Update error:", err);
      throw err;
    }
  }, [getAccessToken]);

  // Retry a failed generation
  const retryGeneration = useCallback(async (generationId: string): Promise<void> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-generation?action=retry`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ generationId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to retry generation");
      }

      // Refresh list
      await fetchGenerations();
    } catch (err) {
      console.error("[useGenerations] Retry error:", err);
      throw err;
    }
  }, [getAccessToken, fetchGenerations]);

  // Get single generation status
  const getGenerationStatus = useCallback(async (generationId: string): Promise<Generation | null> => {
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return null;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/start-generation?action=status&generationId=${generationId}`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      return data.generation;
    } catch (err) {
      console.error("[useGenerations] Status error:", err);
      return null;
    }
  }, [getAccessToken]);

  // Polling for active generations - REDUCED FREQUENCY to avoid blocking
  // Video generation takes 2-4 minutes, so polling every 10s is sufficient
  useEffect(() => {
    if (activeGenerations.length === 0) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    // Poll every 10 seconds (reduced from 2s to avoid excessive API calls)
    pollingRef.current = setInterval(async () => {
      console.log(`[useGenerations] Polling ${activeGenerations.length} active generations...`);
      
      const updatedActive: Generation[] = [];

      for (const gen of activeGenerations) {
        const updated = await getGenerationStatus(gen.id);
        if (updated) {
          updatedActive.push(updated);

          // Update main list too
          setGenerations(prev => 
            prev.map(g => g.id === updated.id ? updated : g)
          );
        }
      }

      // Filter out completed/failed from active
      setActiveGenerations(
        updatedActive.filter(g => g.status !== "completed" && g.status !== "failed")
      );
    }, 10000); // 10 seconds instead of 2 seconds

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [activeGenerations.length, getGenerationStatus]);

  // Initial fetch
  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("generations-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "generations",
        },
        (payload) => {
          console.log("[useGenerations] Realtime update:", payload);
          
          if (payload.eventType === "INSERT") {
            const newGen = payload.new as Generation;
            setGenerations(prev => [newGen, ...prev.filter(g => g.id !== newGen.id)]);
            if (newGen.status !== "completed" && newGen.status !== "failed") {
              setActiveGenerations(prev => [newGen, ...prev.filter(g => g.id !== newGen.id)]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedGen = payload.new as Generation;
            setGenerations(prev => prev.map(g => g.id === updatedGen.id ? updatedGen : g));
            setActiveGenerations(prev => {
              const updated = prev.map(g => g.id === updatedGen.id ? updatedGen : g);
              return updated.filter(g => g.status !== "completed" && g.status !== "failed");
            });
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setGenerations(prev => prev.filter(g => g.id !== deletedId));
            setActiveGenerations(prev => prev.filter(g => g.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    generations,
    activeGenerations,
    isLoading,
    error,
    startGeneration,
    updateProgress,
    retryGeneration,
    fetchGenerations,
    getGenerationStatus,
  };
}
