// supabase/functions/extract-services-firecrawl/index.ts
// Deno + Supabase Edge Function
// Input: { url: string }
// Output: { services: string[], raw?: { title?: string, description: string } }

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type FirecrawlResult = {
  success: boolean;
  data?: {
    content?: string; // markdown
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
      url?: string;
      sourceURL?: string;
    };
  };
  error?: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function stripMd(s: string) {
  return s
    .replace(/`{1,3}[^`]*`{1,3}/g, " ") // inline code
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ") // images
    .replace(/\[[^\]]*\]\([^)]+\)/g, "$1") // links -> text
    .replace(/[*_~]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeService(s: string) {
  return stripMd(s)
    .replace(/^[-–—•\d.)\s]+/g, "")
    .replace(/[:：]\s*$/g, "")
    .trim();
}

// Heuristic extraction for "services" from marketing pages.
// It tries:
// 1) Feature cards in markdown: headings + short description lines
// 2) Bullet lists in relevant sections
// 3) Known keywords grouping (avis, seo, aeo, chatgpt, visibilité)
function extractServicesFromMarkdown(md: string): string[] {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);

  // Find candidate blocks around keywords
  const keywords = [
    "fonctionnalit",
    "features",
    "services",
    "réponses",
    "avis",
    "seo",
    "aeo",
    "chatgpt",
    "visibil",
    "autopost",
    "article",
    "multi",
  ];

  const candidateLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase();
    if (keywords.some((k) => low.includes(k))) {
      // take a window around the match
      for (let j = Math.max(0, i - 8); j <= Math.min(lines.length - 1, i + 35); j++) {
        candidateLines.push(lines[j]);
      }
    }
  }

  const pool = candidateLines.length ? candidateLines : lines;

  // 1) Heading-based extraction (#, ##, ###)
  const headingServices: string[] = [];
  for (let i = 0; i < pool.length; i++) {
    const m = pool[i].match(/^(#{2,4})\s+(.+)/); // prefer ## ### ####
    if (m) {
      const title = normalizeService(m[2]);
      // Ignore generic headings
      if (
        title.length >= 3 &&
        !/^(pourquoi|comment|tarifs|sécurité|conformité|témoignages|faq|contact|blog|produit|fonctionnalités|features|services)$/i.test(
          title,
        )
      ) {
        headingServices.push(title);
      }
    }
  }

  // 2) Bullet extraction
  const bulletServices: string[] = [];
  for (const l of pool) {
    if (/^[-*•]\s+/.test(l)) {
      const item = normalizeService(l);
      if (item && item.length >= 3) bulletServices.push(item);
    }
  }

  // 3) Targeted patterns for typical feature cards in markdown:
  // "**Title**" then description
  const boldTitleServices: string[] = [];
  for (let i = 0; i < pool.length; i++) {
    const m = pool[i].match(/^\*\*(.+?)\*\*$/);
    if (m) {
      const t = normalizeService(m[1]);
      if (t && t.length >= 3) boldTitleServices.push(t);
    }
  }

  // Merge + de-dup + business-shortening for your “Starlinko” style
  const merged = [...headingServices, ...boldTitleServices, ...bulletServices]
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // Keep only likely “service/feature” lines (reduce noise)
  const likely = merged.filter((s) => {
    const low = s.toLowerCase();
    return (
      low.length <= 80 &&
      !/(©|tous droits|conditions|confidentialité|support|téléphone|contact|annulation|sans carte|cookies)/i.test(
        low,
      )
    );
  });

  // Deduplicate (case-insensitive)
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const s of likely) {
    const key = s.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      dedup.push(s);
    }
  }

  // Optional: collapse to your business labels if detected
  // (If you want exact 4 labels)
  const labels: string[] = [];
  const lowAll = dedup.map((x) => x.toLowerCase()).join(" | ");

  const hasReviews =
    /avis|review|réponses aux avis|reply|responses/.test(lowAll) ||
    dedup.some((x) => /avis/i.test(x));
  const hasChatgpt = /chatgpt|perplexity|gemini|ia générative/.test(lowAll);
  const hasAeo = /aeo|q&a|questions|réponses ia|visibilité ia/.test(lowAll);
  const hasSeo = /seo|articles|autopost|blog|mots-clés|google/.test(lowAll);

  if (hasReviews) labels.push("Réponses aux avis avec IA");
  if (hasChatgpt) labels.push("Visibilité ChatGPT");
  if (hasAeo) labels.push("AEO local");
  if (hasSeo) labels.push("SEO local");

  // If we confidently detected these, return them; otherwise return extracted list.
  return labels.length >= 2 ? labels : dedup.slice(0, 20);
}

async function firecrawlScrape(url: string) {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) throw new Error("Missing FIRECRAWL_API_KEY env var");

  console.log("[extract-services] Scraping URL:", url);

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html"],
      onlyMainContent: true,
    }),
  });

  const json = (await res.json()) as FirecrawlResult;
  if (!res.ok || !json.success) {
    console.error("[extract-services] Firecrawl error:", json.error);
    throw new Error(json.error || `Firecrawl error (${res.status})`);
  }
  return json.data || {};
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return jsonResponse({ error: "Use POST" }, 405);
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return jsonResponse({ error: "Missing 'url' in body" }, 400);
    }

    const data = await firecrawlScrape(url);
    const md = data.markdown || data.content || "";
    const html = data.html || "";

    const services = extractServicesFromMarkdown(md || stripMd(html));

    console.log("[extract-services] Extracted services:", services);

    return jsonResponse({
      url,
      services,
      raw: {
        title: data.metadata?.title,
        description: data.metadata?.description,
      },
    });
  } catch (e) {
    console.error("[extract-services] Error:", e);
    return jsonResponse({ error: (e as Error).message }, 500);
  }
});
