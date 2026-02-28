/**
 * Checkout debug - capture et affichage des diagnostics pour résoudre les échecs.
 * Active le mode verbose : localStorage.setItem("CHECKOUT_DEBUG", "1")
 */

export type CheckoutDebugPayload = {
  timestamp: string;
  step: string;
  supabaseUrl: string;
  hasSession: boolean;
  planId?: string;
  type?: string;
  // Réponse brute (sérialisable)
  responseData: unknown;
  responseError: unknown;
  errorMessage: string;
  httpStatus?: number;
};

const safeStringify = (v: unknown): string => {
  try {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    if (typeof v === "object") {
      const seen = new WeakSet();
      return JSON.stringify(v, (_, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        if (typeof val === "function") return "[Function]";
        return val;
      }, 2);
    }
    return String(v);
  } catch {
    return String(v);
  }
};

export function buildCheckoutDebug(p: Partial<CheckoutDebugPayload>): CheckoutDebugPayload {
  return {
    timestamp: new Date().toISOString(),
    step: "invoke",
    supabaseUrl: "",
    hasSession: false,
    responseData: null,
    responseError: null,
    errorMessage: "",
    ...p,
  };
}

export function formatDebugForClipboard(p: CheckoutDebugPayload): string {
  const { responseData, responseError, ...rest } = p;
  return JSON.stringify(
    {
      ...rest,
      responseData: responseData,
      responseError: responseError,
      responseDataStr: safeStringify(responseData),
      responseErrorStr: safeStringify(responseError),
    },
    null,
    2
  );
}

export function isCheckoutDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("CHECKOUT_DEBUG") === "1";
}

export function logCheckoutDebug(label: string, data: unknown): void {
  if (isCheckoutDebugEnabled()) {
    console.groupCollapsed(`[CHECKOUT-DEBUG] ${label}`);
    console.log(data);
    console.groupEnd();
  }
}
