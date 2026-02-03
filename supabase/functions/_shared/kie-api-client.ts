/**
 * KIE API Client - Shared utilities for KIE API integration
 * https://kie.ai - Async task-based API for AI models
 * 
 * Rate Limits: 20 requests per 10 seconds, 100+ concurrent tasks
 * Data Retention: 14 days for media, 2 months for logs
 */

const KIE_API_BASE = "https://kie.ai/api";

export interface KieTaskResponse {
  code: number;
  message: string;
  data?: {
    task_id: string;
    status?: string;
  };
}

export interface KieTaskStatusResponse {
  code: number;
  message: string;
  data?: {
    task_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    result?: {
      url?: string;
      urls?: string[];
      duration?: number;
    };
    error?: string;
  };
}

export function getKieApiKey(): string {
  const key = Deno.env.get("KIE_API_KEY");
  if (!key) {
    throw new Error("KIE_API_KEY is not configured");
  }
  return key;
}

export function getKieHeaders(): Record<string, string> {
  return {
    "Authorization": `Bearer ${getKieApiKey()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Create a KIE API task
 */
export async function createKieTask(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    console.log(`[KIE] Creating task: ${endpoint}`);
    
    const response = await fetch(`${KIE_API_BASE}${endpoint}`, {
      method: "POST",
      headers: getKieHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE] Error ${response.status}:`, errorText.slice(0, 300));
      
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded. Please try again later." };
      }
      if (response.status === 401) {
        return { success: false, error: "KIE API authentication failed." };
      }
      
      return { success: false, error: `KIE API error: ${response.status}` };
    }

    const data: KieTaskResponse = await response.json();
    
    if (data.code !== 0 && data.code !== 200) {
      return { success: false, error: data.message || "Unknown KIE error" };
    }

    const taskId = data.data?.task_id;
    if (!taskId) {
      return { success: false, error: "No task_id in response" };
    }

    console.log(`[KIE] Task created: ${taskId}`);
    return { success: true, taskId };
  } catch (error) {
    console.error("[KIE] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check KIE task status
 */
export async function checkKieTaskStatus(
  taskId: string
): Promise<{
  success: boolean;
  status?: "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  resultUrls?: string[];
  duration?: number;
  error?: string;
}> {
  try {
    console.log(`[KIE] Checking task status: ${taskId}`);
    
    const response = await fetch(`${KIE_API_BASE}/v1/task/${taskId}`, {
      method: "GET",
      headers: getKieHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE] Status check failed:`, errorText.slice(0, 300));
      return { success: false, error: `Status check failed: ${response.status}` };
    }

    const data: KieTaskStatusResponse = await response.json();
    
    if (data.code !== 0 && data.code !== 200) {
      return { success: false, error: data.message || "Status check failed" };
    }

    const status = data.data?.status || "pending";
    const result = data.data?.result;

    return {
      success: true,
      status,
      resultUrl: result?.url,
      resultUrls: result?.urls,
      duration: result?.duration,
      error: data.data?.error,
    };
  } catch (error) {
    console.error("[KIE] Status check exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Model endpoints mapping for KIE API
 * All endpoints require /v1/ prefix
 */
export const KIE_ENDPOINTS = {
  // Image models
  "recraft-remove-bg": "/v1/recraft/remove-background",
  "recraft-upscale": "/v1/recraft/crisp-upscale",
  "qwen-zimage": "/v1/qwen/z-image",
  "flux-2-flex": "/v1/flux/2-flex",
  "flux-2-pro": "/v1/flux/2-pro",
  "flux-kontext": "/v1/flux/kontext",
  "grok-imagine": "/v1/grok/imagine",
  "ideogram-v3-remix": "/v1/ideogram/v3-remix",
  "ideogram-v3-edit": "/v1/ideogram/v3-edit",
  "ideogram-v3-reframe": "/v1/ideogram/v3-reframe",
  
  // Video models
  "wan-2.6-text2video": "/v1/wan/2.6/text-to-video",
  "wan-2.6-image2video": "/v1/wan/2.6/image-to-video",
  "wan-2.6-video2video": "/v1/wan/2.6/video-to-video",
  "kling-2.6-text2video": "/v1/kling/2.6/text-to-video",
  "kling-2.6-image2video": "/v1/kling/2.6/image-to-video",
} as const;

/**
 * Credit costs for KIE API models (per generation)
 */
export const KIE_CREDIT_COSTS = {
  // Image models (1-24 credits)
  "recraft-remove-bg": 1,
  "recraft-upscale": 1,
  "qwen-zimage": 1,
  "flux-2-flex-1k": 14,
  "flux-2-flex-2k": 24,
  "flux-2-pro-1k": 5,
  "flux-2-pro-2k": 7,
  "flux-kontext-pro": 5,
  "flux-kontext-max": 10,
  "grok-imagine": 4,
  "ideogram-turbo": 4,
  "ideogram-balanced": 7,
  "ideogram-quality": 10,
  
  // Video models (55-315 credits)
  "wan-2.6-5s-720p": 70,
  "wan-2.6-10s-720p": 140,
  "wan-2.6-15s-720p": 210,
  "wan-2.6-5s-1080p": 105,
  "wan-2.6-10s-1080p": 210,
  "wan-2.6-15s-1080p": 315,
  "kling-2.6-5s": 55,
  "kling-2.6-10s": 110,
  "kling-2.6-audio-5s": 110,
  "kling-2.6-audio-10s": 220,
} as const;
