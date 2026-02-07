/**
 * KIE API Client - Shared utilities for KIE API integration
 * https://api.kie.ai - Async task-based API for AI models
 * 
 * TWO API patterns:
 * 1. Market API (qwen, grok, flux-2, recraft, ideogram, kling, wan)
 *    - Create: POST /v1/jobs/createTask  { model, input: {...} }
 *    - Status: GET /v1/jobs/recordInfo?taskId=xxx
 * 2. Flux Kontext API (separate endpoints)
 *    - Create: POST /v1/flux/kontext/generate { prompt, model, ... }
 *    - Status: GET /v1/flux/kontext/record-info?taskId=xxx
 */

const KIE_API_BASE = "https://api.kie.ai/api";

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

// ============================================================
// Market API - Unified task creation
// ============================================================

/**
 * Create a KIE Market API task (for qwen, grok, flux-2, recraft, ideogram, kling, wan)
 */
export async function createKieTask(
  model: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    console.log(`[KIE] Creating Market task: model=${model}`);
    
    const response = await fetch(`${KIE_API_BASE}/v1/jobs/createTask`, {
      method: "POST",
      headers: getKieHeaders(),
      body: JSON.stringify({ model, input }),
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

    const data = await response.json();
    
    if (data.code !== 200) {
      return { success: false, error: data.msg || data.message || "Unknown KIE error" };
    }

    const taskId = data.data?.taskId;
    if (!taskId) {
      return { success: false, error: "No taskId in response" };
    }

    console.log(`[KIE] Task created: ${taskId}`);
    return { success: true, taskId };
  } catch (error) {
    console.error("[KIE] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check KIE Market API task status
 * States: waiting, queuing, generating, success, fail
 */
export async function checkKieTaskStatus(
  taskId: string
): Promise<{
  success: boolean;
  status?: "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  resultUrls?: string[];
  error?: string;
}> {
  try {
    console.log(`[KIE] Checking task status: ${taskId}`);
    
    const response = await fetch(
      `${KIE_API_BASE}/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
      { method: "GET", headers: getKieHeaders() }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE] Status check failed:`, errorText.slice(0, 300));
      return { success: false, error: `Status check failed: ${response.status}` };
    }

    const data = await response.json();
    
    if (data.code !== 200) {
      return { success: false, error: data.message || data.msg || "Status check failed" };
    }

    const taskData = data.data;
    if (!taskData) {
      return { success: false, error: "No task data in response" };
    }

    // Map KIE states to our internal states
    const stateMap: Record<string, "pending" | "processing" | "completed" | "failed"> = {
      waiting: "pending",
      queuing: "pending",
      generating: "processing",
      success: "completed",
      fail: "failed",
    };

    const status = stateMap[taskData.state] || "pending";

    // Parse resultJson if task succeeded
    let resultUrls: string[] | undefined;
    if (taskData.state === "success" && taskData.resultJson) {
      try {
        const resultData = typeof taskData.resultJson === "string" 
          ? JSON.parse(taskData.resultJson) 
          : taskData.resultJson;
        
        console.log("[KIE] resultJson keys:", Object.keys(resultData));
        
        // Try multiple known keys for result URLs
        resultUrls = resultData.resultUrls 
          || resultData.result_urls 
          || resultData.images 
          || resultData.output;
        
        // Handle single URL fields
        if (!resultUrls || resultUrls.length === 0) {
          const singleUrl = resultData.url || resultData.image_url || resultData.image || resultData.result;
          if (typeof singleUrl === "string" && singleUrl.startsWith("http")) {
            resultUrls = [singleUrl];
          }
        }
        
        // Deep search: if resultData has nested objects, look for URLs
        if (!resultUrls || resultUrls.length === 0) {
          console.log("[KIE] resultJson full content:", JSON.stringify(resultData).slice(0, 500));
          // Search all string values for URLs
          const urls: string[] = [];
          const searchForUrls = (obj: unknown) => {
            if (typeof obj === "string" && (obj.startsWith("http://") || obj.startsWith("https://"))) {
              urls.push(obj);
            } else if (Array.isArray(obj)) {
              obj.forEach(searchForUrls);
            } else if (obj && typeof obj === "object") {
              Object.values(obj as Record<string, unknown>).forEach(searchForUrls);
            }
          };
          searchForUrls(resultData);
          if (urls.length > 0) {
            resultUrls = urls;
            console.log("[KIE] Found URLs via deep search:", urls.length);
          }
        }
      } catch (e) {
        console.error("[KIE] Failed to parse resultJson:", e);
      }
    }
    
    // Also check top-level taskData for URLs if resultJson parsing found nothing
    if ((!resultUrls || resultUrls.length === 0) && taskData.state === "success") {
      const fallbackUrl = taskData.resultUrl || taskData.result_url || taskData.imageUrl || taskData.image_url;
      if (typeof fallbackUrl === "string" && fallbackUrl.startsWith("http")) {
        resultUrls = [fallbackUrl];
        console.log("[KIE] Found URL in taskData top-level");
      }
    }

    return {
      success: true,
      status,
      resultUrl: resultUrls?.[0],
      resultUrls,
      error: taskData.failMsg || undefined,
    };
  } catch (error) {
    console.error("[KIE] Status check exception:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================
// Flux Kontext API - Separate endpoints
// ============================================================

/**
 * Create a Flux Kontext generation task
 */
export async function createFluxKontextTask(
  payload: Record<string, unknown>
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    console.log(`[KIE-Kontext] Creating task`);
    
    const response = await fetch(`${KIE_API_BASE}/v1/flux/kontext/generate`, {
      method: "POST",
      headers: getKieHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE-Kontext] Error ${response.status}:`, errorText.slice(0, 300));
      return { success: false, error: `Flux Kontext API error: ${response.status}` };
    }

    const data = await response.json();
    if (data.code !== 200) {
      return { success: false, error: data.msg || "Unknown error" };
    }

    const taskId = data.data?.taskId;
    if (!taskId) {
      return { success: false, error: "No taskId in response" };
    }

    console.log(`[KIE-Kontext] Task created: ${taskId}`);
    return { success: true, taskId };
  } catch (error) {
    console.error("[KIE-Kontext] Exception:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check Flux Kontext task status
 * successFlag: 0=generating, 1=success, 2=create_failed, 3=generate_failed
 */
export async function checkFluxKontextStatus(
  taskId: string
): Promise<{
  success: boolean;
  status?: "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  resultUrls?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(
      `${KIE_API_BASE}/v1/flux/kontext/record-info?taskId=${encodeURIComponent(taskId)}`,
      { method: "GET", headers: getKieHeaders() }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIE-Kontext] Status check failed:`, errorText.slice(0, 300));
      return { success: false, error: `Status check failed: ${response.status}` };
    }

    const data = await response.json();
    const taskData = data.data || data;
    const flag = taskData.successFlag ?? taskData.success_flag;

    console.log(`[KIE-Kontext] Status check - flag: ${flag}, keys: ${JSON.stringify(Object.keys(taskData))}`);

    if (flag === 1) {
      // Success - extract result URLs using documented field names:
      // data.response.resultImageUrl = generated image URL
      // data.response.originImageUrl = original image (valid 10 min)
      const resultImageUrl = taskData.response?.resultImageUrl;
      const originImageUrl = taskData.response?.originImageUrl;
      
      let resultUrls: string[] = [];
      
      if (resultImageUrl) {
        resultUrls.push(resultImageUrl);
        console.log(`[KIE-Kontext] Found resultImageUrl`);
      }
      if (originImageUrl && originImageUrl !== resultImageUrl) {
        resultUrls.push(originImageUrl);
      }
      
      // Fallback: also check legacy field names just in case
      if (resultUrls.length === 0) {
        const legacyUrls = taskData.response?.resultUrls 
          || taskData.resultUrls 
          || taskData.result_urls;
        if (legacyUrls && legacyUrls.length > 0) {
          resultUrls = legacyUrls;
          console.log(`[KIE-Kontext] Found URLs via legacy fields`);
        }
      }
      
      // Last resort: deep search
      if (resultUrls.length === 0) {
        console.log("[KIE-Kontext] Deep searching for URLs in:", JSON.stringify(taskData).slice(0, 500));
        const searchForUrls = (obj: unknown) => {
          if (typeof obj === "string" && (obj.startsWith("http://") || obj.startsWith("https://"))) {
            resultUrls.push(obj);
          } else if (Array.isArray(obj)) {
            obj.forEach(searchForUrls);
          } else if (obj && typeof obj === "object") {
            Object.values(obj as Record<string, unknown>).forEach(searchForUrls);
          }
        };
        searchForUrls(taskData);
        if (resultUrls.length > 0) {
          console.log(`[KIE-Kontext] Found ${resultUrls.length} URLs via deep search`);
        }
      }

      return {
        success: true,
        status: "completed",
        resultUrl: resultUrls[0],
        resultUrls: resultUrls.length > 0 ? resultUrls : undefined,
      };
    }

    if (flag === 2 || flag === 3) {
      return {
        success: true,
        status: "failed",
        error: taskData.errorMessage || taskData.error_message || "Generation failed",
      };
    }

    // flag === 0 or undefined = still processing
    return { success: true, status: "processing" };
  } catch (error) {
    console.error("[KIE-Kontext] Status check exception:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================
// Model name mappings for the new KIE Market API
// ============================================================

export const KIE_MODEL_NAMES: Record<string, string> = {
  // Image: Text → Image
  "qwen-zimage": "qwen/text-to-image",
  "grok-imagine-text": "grok-imagine/text-to-image",
  "flux-2-pro-1k": "flux-2/pro-text-to-image",
  "flux-2-pro-2k": "flux-2/pro-text-to-image",
  "flux-2-flex-1k": "flux-2/flex-text-to-image",
  "flux-2-flex-2k": "flux-2/flex-text-to-image",

  // Image: Image → Image
  "grok-imagine-img": "grok-imagine/image-to-image",
  "recraft-remove-bg": "recraft/remove-background",
  "recraft-crisp-upscale": "recraft/crisp-upscale",
  "ideogram-v3-remix-turbo": "ideogram/v3-remix",
  "ideogram-v3-remix-balanced": "ideogram/v3-remix",
  "ideogram-v3-remix-quality": "ideogram/v3-remix",
  "ideogram-v3-edit-quality": "ideogram/v3-edit",
  "ideogram-v3-reframe": "ideogram/v3-reframe",

  // Video models
  "wan-2.6-text2video": "wan/2-6-text-to-video",
  "wan-2.6-image2video": "wan/2-6-image-to-video",
  "kling-2.6-text2video": "kling-2.6/text-to-video",
  "kling-2.6-image2video": "kling-2.6/image-to-video",
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
