import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// SCENARIO SYSTEM (synced with generate-script-nanobanana)
// ============================================

interface Sector {
  id: string;
  name: string;
  emoji: string;
  visualContext: string;
}

interface VideoStyle {
  id: string;
  name: string;
  emoji: string;
  visualInstructions: string;
}

interface EmotionalTone {
  id: string;
  name: string;
  emoji: string;
  atmosphereNotes: string;
}

const BUSINESS_SECTORS: Sector[] = [
  { id: "restaurant", name: "Restaurant", emoji: "🍽️", visualContext: "busy restaurant kitchen, food preparation, satisfied diners, chef at work" },
  { id: "boutique", name: "Boutique", emoji: "🛍️", visualContext: "elegant retail space, product displays, shopping experience, customer service" },
  { id: "real_estate", name: "Real Estate", emoji: "🏠", visualContext: "property tours, modern interiors, house keys handover, happy homeowners" },
  { id: "doctor", name: "Medical/Doctor", emoji: "👨‍⚕️", visualContext: "clean medical office, patient consultation, modern healthcare equipment, trust" },
  { id: "hotel", name: "Hotel", emoji: "🏨", visualContext: "luxury lobby, comfortable rooms, hospitality service, guest experience" },
  { id: "fitness", name: "Fitness/Gym", emoji: "💪", visualContext: "modern gym equipment, workout sessions, transformation results, motivation" },
  { id: "beauty", name: "Beauty/Spa", emoji: "💅", visualContext: "relaxing spa environment, beauty treatments, before/after transformations" },
  { id: "tech", name: "Tech/SaaS", emoji: "💻", visualContext: "sleek interfaces, productivity gains, dashboard analytics, digital transformation" },
  { id: "education", name: "Education", emoji: "📚", visualContext: "learning environment, student success, knowledge sharing, courses" },
  { id: "ecommerce", name: "E-commerce", emoji: "📦", visualContext: "product unboxing, fast delivery, happy customers, shopping cart" },
  { id: "agency", name: "Marketing Agency", emoji: "📈", visualContext: "creative workspace, campaign results, team collaboration, growth charts" },
  { id: "artisan", name: "Artisan/Craft", emoji: "🔨", visualContext: "handmade process, craftsmanship details, authentic work, quality materials" },
];

const VIDEO_STYLES: VideoStyle[] = [
  { id: "testimonial", name: "Testimonial", emoji: "🗣️", visualInstructions: "authentic customer speaking directly to camera, genuine emotion, real results shared" },
  { id: "demo", name: "Product Demo", emoji: "📱", visualInstructions: "clear product showcase, step-by-step usage, feature highlights, smooth transitions" },
  { id: "before_after", name: "Before/After", emoji: "🔄", visualInstructions: "dramatic split screen or transition, clear transformation, compelling comparison" },
  { id: "tutorial", name: "Tutorial", emoji: "📖", visualInstructions: "educational step-by-step, clear instructions, helpful tips, easy to follow" },
  { id: "ugc", name: "UGC Style", emoji: "📲", visualInstructions: "raw smartphone footage, authentic handheld feel, relatable creator, casual setting" },
  { id: "cinematic", name: "Cinematic", emoji: "🎬", visualInstructions: "high production value, dramatic lighting, professional color grading, epic feel" },
  { id: "talking_head", name: "Talking Head", emoji: "🎤", visualInstructions: "direct to camera speech, engaging presenter, professional background, confident delivery" },
  { id: "montage", name: "Dynamic Montage", emoji: "⚡", visualInstructions: "fast-paced cuts, energetic rhythm, multiple scenes, visual storytelling" },
];

const EMOTIONAL_TONES: EmotionalTone[] = [
  { id: "urgent", name: "Urgent", emoji: "🔥", atmosphereNotes: "fast tempo, bold text overlays, countdown feeling, don't miss out energy" },
  { id: "inspiring", name: "Inspiring", emoji: "✨", atmosphereNotes: "uplifting music vibe, success stories, motivational, aspirational visuals" },
  { id: "reassuring", name: "Reassuring", emoji: "🤝", atmosphereNotes: "calm and confident, trust-building, professional yet warm, reliable feeling" },
  { id: "dynamic", name: "Dynamic", emoji: "⚡", atmosphereNotes: "high energy, action-packed, exciting transitions, vibrant colors" },
  { id: "professional", name: "Professional", emoji: "💼", atmosphereNotes: "corporate polish, clean aesthetics, authoritative, business-focused" },
  { id: "playful", name: "Playful", emoji: "🎉", atmosphereNotes: "fun and light, humor elements, bright colors, entertaining" },
  { id: "luxurious", name: "Luxurious", emoji: "👑", atmosphereNotes: "premium feel, elegant details, sophisticated, exclusive atmosphere" },
  { id: "authentic", name: "Authentic", emoji: "💚", atmosphereNotes: "raw and real, unfiltered moments, genuine connections, behind-the-scenes" },
];

// ============================================================
// CONTENT DIVERSITY SYSTEM - Unique content every time
// ============================================================

// 12 Visual Scenes - Forces variety in image settings
const VISUAL_SCENES = [
  { id: "neon_night", desc: "Neon-lit urban night scene, vibrant city lights, modern nightlife aesthetic" },
  { id: "golden_hour", desc: "Golden hour outdoor setting, warm sunlight, natural beauty, optimistic mood" },
  { id: "minimal_studio", desc: "Clean white studio, minimal props, product-focused, high-end photography" },
  { id: "urban_street", desc: "Busy urban street, diverse crowd, real city life, authentic documentary style" },
  { id: "luxury_interior", desc: "Upscale interior space, elegant furnishings, rich textures, premium feel" },
  { id: "nature_outdoor", desc: "Natural outdoor environment, greenery, fresh air, wellness vibes" },
  { id: "home_cozy", desc: "Cozy home setting, comfortable atmosphere, relatable everyday life" },
  { id: "industrial_modern", desc: "Industrial modern space, exposed brick, metal accents, trendy startup vibes" },
  { id: "beach_coastal", desc: "Beach or coastal setting, ocean views, vacation energy, freedom feeling" },
  { id: "rooftop_skyline", desc: "Rooftop with city skyline, success imagery, aspirational urban lifestyle" },
  { id: "artsy_creative", desc: "Artistic creative space, colorful, eclectic, unique personality" },
  { id: "tech_futuristic", desc: "Sleek tech environment, screens, futuristic aesthetic, innovation feel" },
];

// 8 Marketing Angles - Forces different persuasion approaches
const MARKETING_ANGLES = [
  { id: "social_proof", desc: "Show others already using/loving the product. Testimonial energy. FOMO trigger." },
  { id: "pain_point", desc: "Visualize the PROBLEM customers face. Make them feel the frustration. Then hint at solution." },
  { id: "transformation", desc: "Dramatic before/after. Show the life change. The glow-up. The upgrade." },
  { id: "authority", desc: "Expert positioning. Data, stats, credentials. Trust signals. Professional credibility." },
  { id: "urgency_scarcity", desc: "Limited time/quantity. Act now energy. Countdown vibes. Don't miss out." },
  { id: "lifestyle_aspiration", desc: "Dream life imagery. The person they want to become. Aspirational but attainable." },
  { id: "behind_scenes", desc: "Raw, authentic, unfiltered. Real process. Human touch. Transparency builds trust." },
  { id: "comparison", desc: "Us vs. old way. Better alternative. Clear advantages. Competitive positioning." },
];

// BANNED CLICHÉS - AI must avoid these overused concepts
const BANNED_CLICHES = [
  "laptop in café",
  "person smiling at phone",
  "entrepreneur in coffee shop", 
  "woman with laptop",
  "man in suit with graph",
  "handshake business deal",
  "lightbulb idea concept",
  "rocket launch growth",
  "puzzle pieces fitting together",
  "sticky notes on glass wall",
  "team high-fiving",
  "person jumping with joy",
  "clock running out",
  "money tree growing",
  "superhero cape businessman",
];

function buildScenarioPrompt(sectorId?: string, styleId?: string, toneId?: string): string {
  const parts: string[] = [];
  
  const sector = BUSINESS_SECTORS.find(s => s.id === sectorId);
  const style = VIDEO_STYLES.find(s => s.id === styleId);
  const tone = EMOTIONAL_TONES.find(t => t.id === toneId);
  
  if (sector || style || tone) {
    parts.push("\n\n--- VISUAL/SCENARIO CONTEXT ---");
    
    if (sector) {
      parts.push(`BUSINESS SECTOR: ${sector.name}`);
      parts.push(`Recommended visual elements: ${sector.visualContext}`);
    }
    
    if (style) {
      parts.push(`VIDEO STYLE: ${style.name}`);
      parts.push(`Execution instructions: ${style.visualInstructions}`);
    }
    
    if (tone) {
      parts.push(`EMOTIONAL TONE: ${tone.name}`);
      parts.push(`Atmosphere: ${tone.atmosphereNotes}`);
    }
    
    parts.push("--- END VISUAL CONTEXT ---\n\n");
  }
  
  return parts.join("\n");
}

// ============================================
// MAIN EDGE FUNCTION
// ============================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      projectId,
      projectName,
      projectDescription,
      projectUrl,
      scrapedContent,
      contentType, // "script" for video scripts, "suggestions" for general content
      productName,
      productCategory,
      // NEW: Scenario parameters (synced with VideoGenerator)
      sectorId,
      styleId,
      toneId,
      scriptType, // short, story, ad, testimonial
      duration, // Video duration in seconds
      // NEW: Project branding
      logoUrl,
      detectedLanguage, // Language detected from Firecrawl
      marketingContext, // NEW: Rich marketing context
    } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Determine output language
    const outputLanguage = detectedLanguage || "en";
    const languageInstructions: Record<string, string> = {
      en: "OUTPUT ONLY IN ENGLISH - Use natural, conversational American English.",
      fr: "OUTPUT ONLY IN FRENCH - No English words except brand names. Use natural, conversational French.",
      es: "OUTPUT ONLY IN SPANISH - No English words except brand names. Use natural, conversational Spanish.",
      de: "OUTPUT ONLY IN GERMAN - No English words except brand names. Use natural, conversational German.",
      it: "OUTPUT ONLY IN ITALIAN - No English words except brand names. Use natural, conversational Italian.",
      pt: "OUTPUT ONLY IN PORTUGUESE - No English words except brand names. Use natural, conversational Portuguese.",
    };
    const languageInstruction = languageInstructions[outputLanguage] || languageInstructions.en;

    console.log("Generating content for project:", projectName, "type:", contentType, "language:", outputLanguage, "logo:", logoUrl ? "present" : "none");

    // Build scenario context
    const scenarioContext = buildScenarioPrompt(sectorId, styleId, toneId);

    // Logo context for branding
    const logoContext = logoUrl ? `\nBRAND LOGO URL: ${logoUrl} (Consider incorporating brand logo in visual descriptions when appropriate)` : "";

    // Build marketing context injection
    let marketingContextBlock = "";
    if (marketingContext && typeof marketingContext === "object") {
      const mc = marketingContext as any;
      const parts: string[] = [];
      
      if (mc.target_audience?.primary) {
        parts.push(`TARGET AUDIENCE: ${mc.target_audience.primary}`);
      }
      if (mc.target_audience?.pain_points?.length > 0) {
        parts.push(`Pain points to address: ${mc.target_audience.pain_points.join(", ")}`);
      }
      if (mc.target_audience?.desires?.length > 0) {
        parts.push(`Desires to fulfill: ${mc.target_audience.desires.join(", ")}`);
      }
      if (mc.brand_personality?.tone) {
        parts.push(`BRAND TONE: ${mc.brand_personality.tone}`);
      }
      if (mc.brand_personality?.values?.length > 0) {
        parts.push(`Brand values: ${mc.brand_personality.values.join(", ")}`);
      }
      if (mc.brand_personality?.voice_keywords?.length > 0) {
        parts.push(`Voice keywords: ${mc.brand_personality.voice_keywords.join(", ")}`);
      }
      if (mc.products_services?.length > 0) {
        const productsList = mc.products_services
          .slice(0, 5)
          .map((p: any) => `- ${p.name}: ${p.key_benefit}`)
          .join("\n");
        parts.push(`PRODUCTS TO SHOWCASE:\n${productsList}`);
      }
      if (mc.competitive_positioning) {
        parts.push(`UNIQUE SELLING POINT: ${mc.competitive_positioning}`);
      }
      if (mc.content_guidelines?.banned_terms?.length > 0) {
        parts.push(`NEVER use these words: ${mc.content_guidelines.banned_terms.join(", ")}`);
      }
      if (mc.content_guidelines?.preferred_terms?.length > 0) {
        parts.push(`PREFER these words: ${mc.content_guidelines.preferred_terms.join(", ")}`);
      }
      if (mc.content_guidelines?.visual_banned?.length > 0) {
        parts.push(`AVOID visually: ${mc.content_guidelines.visual_banned.join(", ")}`);
      }
      if (mc.content_guidelines?.visual_preferred?.length > 0) {
        parts.push(`PREFER visually: ${mc.content_guidelines.visual_preferred.join(", ")}`);
      }
      
      if (parts.length > 0) {
        marketingContextBlock = `\n\n=== MARKETING CONTEXT (CRITICAL - USE THIS!) ===\n${parts.join("\n")}\n=== END MARKETING CONTEXT ===\n`;
      }
    }

    // Different prompts based on content type
    let systemPrompt: string;
    let userMessage: string;

    if (contentType === "image_prompt") {
      // ============================================
      // IMAGE PROMPT GENERATION - SELLER SHOWCASING / IMPACTFUL
      // ============================================
      const sector = BUSINESS_SECTORS.find(s => s.id === sectorId);
      const style = VIDEO_STYLES.find(s => s.id === styleId);
      const tone = EMOTIONAL_TONES.find(t => t.id === toneId);

      // Extract brand-specific elements from scraped content
      const brandContext = scrapedContent ? `
WEBSITE ANALYSIS (extract key selling points):
${scrapedContent.substring(0, 2500)}

KEY EXTRACTION TARGETS:
• Main products/services being sold
• Hero benefits and value propositions
• Target customer profile
• Brand aesthetic and color palette
• Unique competitive advantages
• Social proof elements (awards, testimonials mentions)
` : "";

      // Select random diversity elements for variety
      const randomSceneIdx = Math.floor(Math.random() * VISUAL_SCENES.length);
      const bannedList = BANNED_CLICHES.join(", ");

      systemPrompt = `You are a CONVERSION-FOCUSED image prompt specialist creating SELLER SHOWCASING visuals that DRIVE ACTION.

🎨 USE THESE VISUAL SCENES (rotate through them for variety):
${VISUAL_SCENES.map((s, i) => `${i + 1}. ${s.id}: ${s.desc}`).join("\n")}

🎯 USE THESE MARKETING ANGLES (each prompt should use a different one):
${MARKETING_ANGLES.map((a, i) => `${i + 1}. ${a.id}: ${a.desc}`).join("\n")}

🚨 CRITICAL BRAND NAME RULE:
"${projectName}" is a BRAND NAME, not a literal description!
- DO NOT interpret the brand name literally (e.g., "Starlinko" does NOT mean stars, links, or space themes)
- FOCUS ONLY on what the brand ACTUALLY SELLS based on the website content below
- The brand name should appear as a logo or text overlay, NEVER as a visual concept

🎯 ULTIMATE GOAL: Create image prompts that make people WANT TO BUY. Every image must:
- Use a UNIQUE visual scene from the list above
- Apply a UNIQUE marketing angle from the list above
- SHOWCASE the actual product/service the brand sells (NOT the brand name as a concept)
- Create DESIRE and URGENCY in the viewer
- Highlight TRANSFORMATION and RESULTS the product delivers
- Feature the PRODUCT HERO prominently
- Appeal to EMOTIONS that drive purchase decisions

📍 BRAND SELLING CONTEXT:
- Brand name (DO NOT interpret literally): ${projectName || "Unknown seller"}
- What they ACTUALLY SELL (FOCUS ON THIS): ${projectDescription || "Products/services to promote"}
${projectUrl ? `- Sales page: ${projectUrl}` : ""}
${brandContext}
${marketingContextBlock}
${sector ? `- Market: ${sector.name} - Visual hooks: ${sector.visualContext}` : ""}
${style ? `- Visual approach: ${style.name} - ${style.visualInstructions}` : ""}
${tone ? `- Emotional trigger: ${tone.name} - ${tone.atmosphereNotes}` : ""}
${productName ? `- Focus product: ${productName}` : ""}
${logoUrl ? `- Brand logo to include: ${logoUrl}` : ""}

🚫 BANNED CLICHÉS (NEVER use these - they kill engagement):
${bannedList}

🚫 ALSO FORBIDDEN:
❌ Interpreting the brand name literally as a visual concept
❌ Generic stock photo vibes
❌ Abstract concepts without product focus
❌ Boring flat lays without context
❌ Images that could be ANY brand
❌ No clear product or benefit visible
❌ Cluttered compositions that confuse
❌ Stars, space, futuristic themes UNLESS that's what the brand actually sells

${languageInstruction}

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Impactful hook title (max 50 chars)",
      "content": "The complete seller-focused image prompt using a UNIQUE scene and angle",
      "contentType": "image",
      "visualScene": "one of the 12 scene IDs",
      "marketingAngle": "one of the 8 angle IDs",
      "estimatedEngagement": "high"
    }
  ]
}`;

      userMessage = `Generate 5 UNIQUE, HIGH-IMPACT image prompts for "${projectName || 'this seller'}". 

CRITICAL REQUIREMENTS:
1. Each prompt MUST use a DIFFERENT visual scene from the 12 options
2. Each prompt MUST use a DIFFERENT marketing angle from the 8 options
3. AVOID all banned clichés listed above
4. Put the PRODUCT/SERVICE as the HERO
5. Show the TRANSFORMATION or RESULT customers get
6. Be SPECIFIC to this brand - no generic images`;

    } else if (contentType === "script") {
      // Calculate word count based on duration (same logic as generate-script-nanobanana)
      const dur = duration || 10;
      const wordsPerSecond = 2.5;
      const targetWords = Math.round(dur * wordsPerSecond);
      const minWords = Math.max(10, targetWords - 10);
      const maxWords = targetWords + 15;

      // ADS-specific aggressive template
      const isAdsScript = scriptType === "ad";
      const adsInstructions = isAdsScript ? `
🔥 MANDATORY FORMAT FOR ADS:
Each line MUST start with a timestamp [0–1s], [1–3s], etc.
Each phrase = 2 to 6 words MAX. NEVER more than 7 words per phrase!
Brutal, direct tone, no fluff.

EXAMPLE FORMAT TO FOLLOW:
[0–1s] You're losing money.
[1–3s] Every single day.
[3–5s] Because of bad reviews.
[5–7s] No responses.
[7–9s] Customers leave.
` : "";

      // ULTRA-STRICT PROMPT for video scripts
      systemPrompt = `You are a professional copywriter specialized in viral video scripts.

⚠️ RULE #1 MOST IMPORTANT - LANGUAGE:
${languageInstruction}

⚠️ RULE #2 - SCRIPT LENGTH:
The script MUST contain between ${minWords} and ${maxWords} words for a ${dur} second duration.
A script too short = failed video. COUNT YOUR WORDS before responding!
${adsInstructions}
STYLE RULES:
• Perfect grammar and spelling
• ZERO emojis
• ZERO generic phrases ("Discover", "Don't wait", "innovative solution")
• ZERO empty marketing jargon ("revolutionary", "unique", "incredible")
${scenarioContext}
${logoContext}
PROJECT CONTEXT:
Name: ${projectName || "Not specified"}
Description: ${projectDescription || "Not specified"}
${projectUrl ? `Website: ${projectUrl}` : ""}
${scrapedContent ? `Website content:\n${scrapedContent.substring(0, 1500)}` : ""}
${productName ? `Targeted product/service: ${productName}` : ""}
${productCategory ? `Content type: ${productCategory}` : ""}

EXPECTED TONE:
- Natural, like talking to a friend
- Direct and no-nonsense
- Concrete with examples and numbers if possible
- Emotional but credible

GOOD STYLE EXAMPLES (adapt to duration):
✅ "You waste 3 hours a week answering the same questions? This automation does the work while you sleep."
✅ "An unhappy customer costs 5 times more than keeping a loyal one. That's why I created this."
✅ "I tested 12 tools before finding this one. Result: 40% time saved."

BAD STYLE EXAMPLES:
❌ "Discover our innovative solution that revolutionizes your daily life..."
❌ "Don't wait to boost your business!"
❌ "This unique method will transform your life..."

Generate 5 different scripts, varied in angle and tone.

FINAL REMINDER: Each script MUST be ${minWords}-${maxWords} words for ${dur} seconds of video!${isAdsScript ? "\n⚠️ ADS FORMAT: Mandatory timestamps + phrases of 2-6 words MAX!" : ""}

IMPORTANT: Respond ONLY with valid JSON, no markdown or explanation:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Short title (max 50 char)",
      "content": "The complete script",
      "contentType": "video",
      "angle": "problem|benefit|emotion|proof|urgency",
      "estimatedEngagement": "high",
      "hashtags": ["word1", "word2", "word3"]
    }
  ]
}`;

      userMessage = "Generate 5 short, punchy video scripts for this project.";

    } else if (contentType === "social_post") {
      // ============================================
      // SOCIAL POST GENERATION (for Facebook/Instagram)
      // Generates engaging description + hashtags, NOT the raw prompt
      // ============================================
      systemPrompt = `You are an expert social media content creator for Facebook and Instagram.

OBJECTIVE: Create an engaging social media post description with hashtags based on the provided context.
The output should be ready to publish - NOT the original prompt/brief, but actual CONTENT.

CRITICAL RULES:
• ${languageInstruction}
• Create ENGAGING post copy that tells a story or creates curiosity
• Include a clear call-to-action when relevant
• Generate 8-12 relevant hashtags
• NO generic phrases like "Check this out" or "Don't miss"
• Make it feel authentic and conversational
• Adapt tone to the platform (Instagram = more casual, Facebook = slightly more professional)

CONTEXT:
- Topic/Brief: ${projectDescription || projectName || "Engaging content"}
${projectUrl ? `- Website: ${projectUrl}` : ""}
${scrapedContent ? `- Brand context:\n${scrapedContent.substring(0, 800)}` : ""}
${productName ? `- Product/Service: ${productName}` : ""}
${logoContext}

POST STRUCTURE:
1. Hook (first line that stops the scroll)
2. Main message (2-3 sentences max)
3. Call-to-action (optional)
4. Hashtags (8-12, mix of popular and niche)

EXAMPLE GOOD POST:
"The secret nobody talks about? 🤫
Small business owners spend 40% of their time on tasks AI can handle in seconds.
I switched 3 months ago. Haven't looked back.

What's YOUR biggest time-waster? Drop it below 👇

#SmallBusiness #Productivity #AITools #EntrepreneurLife #BusinessGrowth #WorkSmarter #TimeManagement #StartupTips"

EXAMPLE BAD POST (DO NOT DO THIS):
"Check out our amazing product! It's revolutionary and will change your life! Buy now! #sale #discount #amazing"

Respond ONLY with valid JSON:
{
  "suggestion": {
    "content": "The full post caption ready to publish",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6", "hashtag7", "hashtag8"],
    "platform": "instagram_facebook"
  }
}`;

      userMessage = `Create an engaging social media post for Facebook and Instagram based on this topic/brief: "${projectDescription || projectName || 'Engaging content for social media'}"`;

    } else {
      // Standard prompt for general content suggestions
      systemPrompt = `You are an expert in creating social media content.

LANGUAGE: ${languageInstruction}
${scenarioContext}
${logoContext}
CONTEXT:
- Project: ${projectName || "Not specified"}
- Description: ${projectDescription || "Not specified"}
${projectUrl ? `- URL: ${projectUrl}` : ""}
${scrapedContent ? `- Website content:\n${scrapedContent.substring(0, 1500)}` : ""}

OBJECTIVE: Generate 5 creative and engaging content ideas.

For each suggestion:
1. Catchy title (max 60 characters)
2. Detailed content/script
3. Type: "video", "image" or "text"
4. Engagement potential: "high", "medium" or "low"
5. 5-8 relevant hashtags (without #)

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Title",
      "content": "Detailed content...",
      "contentType": "video",
      "estimatedEngagement": "high",
      "hashtags": ["hashtag1", "hashtag2"]
    }
  ]
}`;

      userMessage = "Generate 5 content suggestions for this project.";
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: contentType === "image_prompt" ? 0.7 : 0.4, // Higher creativity for images
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response received, parsing...");

    // Parse the JSON from the AI response
    let suggestions;
    let socialSuggestion = null;
    
    try {
      // ROBUST JSON PARSING: Clean markdown and extract JSON
      let cleanedContent = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      
      // Extract the first complete JSON object
      const firstBrace = cleanedContent.indexOf("{");
      const lastBrace = cleanedContent.lastIndexOf("}");
      
      if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error("No valid JSON structure found");
      }
      
      const jsonStr = cleanedContent.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonStr);
      
      // Handle social_post format (singular suggestion)
      if (contentType === "social_post" && parsed.suggestion) {
        socialSuggestion = parsed.suggestion;
        console.log("Social post suggestion parsed:", socialSuggestion.content?.substring(0, 100));
      } else {
        // Handle regular suggestions format
        suggestions = parsed.suggestions || parsed;
        
        // Quality filter: validate each suggestion
        if (Array.isArray(suggestions)) {
          suggestions = suggestions.filter((s: { content?: string }) => {
            const text = s.content?.trim() || "";
            
            // Length check (more permissive for ads with timestamps)
            const textWithoutTimestamps = text.replace(/\[\d+[–-]\d+s\]/g, "").trim();
            if (textWithoutTimestamps.length < 30 || textWithoutTimestamps.length > 800) return false;
            
            // English words check - ONLY for non-English content, tolerate 1 occurrence
            if (contentType !== "social_post" && outputLanguage !== "en") {
              const englishWords = /\b(discover|our|solution|innovative|boost|game-changer|tips|hack|amazing|incredible|unique|transform|revolutionary)\b/gi;
              const matches = (text.match(englishWords) || []).length;
              if (matches > 1) {
                console.log(`[FILTER] Rejected: ${matches} English words in ${outputLanguage} content`);
                return false;
              }
            }
            
            // Generic marketing phrases check - language-specific
            if (contentType !== "social_post") {
              const genericPhrases: Record<string, string[]> = {
                fr: ["découvrez notre", "n'attendez plus", "solution innovante", "révolutionnaire", "unique en son genre", "va changer votre vie", "ne manquez pas"],
                es: ["descubra nuestra", "no espere más", "solución innovadora", "revolucionario", "único en su género"],
                de: ["entdecken sie unsere", "warten sie nicht", "innovative lösung", "revolutionär", "einzigartig"],
                it: ["scopri la nostra", "non aspettare", "soluzione innovativa", "rivoluzionario"],
                pt: ["descubra nossa", "não espere mais", "solução inovadora", "revolucionário"],
              };
              
              const langPhrases = genericPhrases[outputLanguage] || [];
              const lowerText = text.toLowerCase();
              if (langPhrases.some(phrase => lowerText.includes(phrase))) {
                console.log(`[FILTER] Rejected: generic phrase in ${outputLanguage}`);
                return false;
              }
            }
            
            // For ADS: Check sentence length (max 7 words per sentence)
            if (scriptType === "ad") {
              const lines = text.split(/\n/).filter(Boolean);
              for (const line of lines) {
                const cleanLine = line.replace(/^\[\d+[–-]\d+s\]\s*/, "").trim();
                if (cleanLine) {
                  const words = cleanLine.split(/\s+/).filter(Boolean);
                  if (words.length > 8) {
                    console.log("[FILTER] ADS script rejected - line too long:", cleanLine);
                    return false;
                  }
                }
              }
            }
            
            return true;
          });

          // If all were filtered out, use fallbacks
          if (suggestions.length === 0) {
            throw new Error("All suggestions filtered for quality");
          }
        }
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content preview:", content.substring(0, 200));
      // MULTILINGUAL FALLBACK SUGGESTIONS
      const fallbackByLang: Record<string, { titles: string[]; contents: string[]; hashtags: string[][] }> = {
        fr: {
          titles: ["L'histoire derrière la marque", "Le problème que vous connaissez", "Résultat concret", "La question qui pique", "L'action immédiate"],
          contents: [
            `${projectName || "Notre marque"} est née d'une conviction simple : faire mieux, pas plus. Chaque détail compte. Chaque client aussi.`,
            `Vous perdez du temps sur des tâches répétitives ? ${projectName || "Cette solution"} automatise l'essentiel pour que vous puissiez vous concentrer sur ce qui compte vraiment.`,
            `Moins de stress. Plus de résultats. Voilà ce que nos clients disent après 30 jours avec ${projectName || "nous"}.`,
            `Combien de clients as-tu perdus ce mois-ci sans le savoir ? ${projectName || "Notre solution"} te donne les réponses.`,
            `Une semaine. C'est tout ce qu'il te faut pour voir la différence avec ${projectName || "notre solution"}. Prêt à essayer ?`,
          ],
          hashtags: [["authenticite", "marque", "histoire"], ["productivite", "automatisation", "efficacite"], ["resultats", "temoignage", "confiance"], ["clients", "analyse", "performance"], ["action", "defi", "transformation"]],
        },
        en: {
          titles: ["The story behind the brand", "The problem you know", "Concrete results", "The question that stings", "Take action now"],
          contents: [
            `${projectName || "Our brand"} was born from a simple conviction: do better, not more. Every detail matters. Every customer too.`,
            `Wasting time on repetitive tasks? ${projectName || "This solution"} automates the essentials so you can focus on what really matters.`,
            `Less stress. More results. That's what our clients say after 30 days with ${projectName || "us"}.`,
            `How many customers did you lose this month without knowing? ${projectName || "Our solution"} gives you the answers.`,
            `One week. That's all you need to see the difference with ${projectName || "our solution"}. Ready to try?`,
          ],
          hashtags: [["authentic", "brand", "story"], ["productivity", "automation", "efficiency"], ["results", "testimonial", "trust"], ["customers", "analytics", "performance"], ["action", "challenge", "transformation"]],
        },
        es: {
          titles: ["La historia detrás de la marca", "El problema que conoces", "Resultados concretos", "La pregunta que pica", "Actúa ahora"],
          contents: [
            `${projectName || "Nuestra marca"} nació de una convicción simple: hacer mejor, no más. Cada detalle cuenta. Cada cliente también.`,
            `¿Pierdes tiempo en tareas repetitivas? ${projectName || "Esta solución"} automatiza lo esencial para que puedas enfocarte en lo que realmente importa.`,
            `Menos estrés. Más resultados. Eso es lo que dicen nuestros clientes después de 30 días con ${projectName || "nosotros"}.`,
            `¿Cuántos clientes perdiste este mes sin saberlo? ${projectName || "Nuestra solución"} te da las respuestas.`,
            `Una semana. Es todo lo que necesitas para ver la diferencia con ${projectName || "nuestra solución"}. ¿Listo para probar?`,
          ],
          hashtags: [["autentico", "marca", "historia"], ["productividad", "automatizacion", "eficiencia"], ["resultados", "testimonio", "confianza"], ["clientes", "analisis", "rendimiento"], ["accion", "reto", "transformacion"]],
        },
        de: {
          titles: ["Die Geschichte hinter der Marke", "Das Problem, das Sie kennen", "Konkrete Ergebnisse", "Die Frage, die brennt", "Jetzt handeln"],
          contents: [
            `${projectName || "Unsere Marke"} wurde aus einer einfachen Überzeugung geboren: besser machen, nicht mehr. Jedes Detail zählt. Jeder Kunde auch.`,
            `Verschwenden Sie Zeit mit sich wiederholenden Aufgaben? ${projectName || "Diese Lösung"} automatisiert das Wesentliche, damit Sie sich auf das konzentrieren können, was wirklich zählt.`,
            `Weniger Stress. Mehr Ergebnisse. Das sagen unsere Kunden nach 30 Tagen mit ${projectName || "uns"}.`,
            `Wie viele Kunden haben Sie diesen Monat verloren, ohne es zu wissen? ${projectName || "Unsere Lösung"} gibt Ihnen die Antworten.`,
            `Eine Woche. Das ist alles, was Sie brauchen, um den Unterschied mit ${projectName || "unserer Lösung"} zu sehen. Bereit zu starten?`,
          ],
          hashtags: [["authentisch", "marke", "geschichte"], ["produktivitaet", "automatisierung", "effizienz"], ["ergebnisse", "testimonial", "vertrauen"], ["kunden", "analyse", "leistung"], ["aktion", "herausforderung", "transformation"]],
        },
        it: {
          titles: ["La storia dietro il marchio", "Il problema che conosci", "Risultati concreti", "La domanda che punge", "Agisci ora"],
          contents: [
            `${projectName || "Il nostro marchio"} è nato da una convinzione semplice: fare meglio, non di più. Ogni dettaglio conta. Ogni cliente anche.`,
            `Perdi tempo in compiti ripetitivi? ${projectName || "Questa soluzione"} automatizza l'essenziale per concentrarti su ciò che conta davvero.`,
            `Meno stress. Più risultati. Ecco cosa dicono i nostri clienti dopo 30 giorni con ${projectName || "noi"}.`,
            `Quanti clienti hai perso questo mese senza saperlo? ${projectName || "La nostra soluzione"} ti dà le risposte.`,
            `Una settimana. È tutto ciò che serve per vedere la differenza con ${projectName || "la nostra soluzione"}. Pronto a provare?`,
          ],
          hashtags: [["autentico", "marchio", "storia"], ["produttivita", "automazione", "efficienza"], ["risultati", "testimonianza", "fiducia"], ["clienti", "analisi", "prestazioni"], ["azione", "sfida", "trasformazione"]],
        },
        pt: {
          titles: ["A história por trás da marca", "O problema que você conhece", "Resultados concretos", "A pergunta que pica", "Aja agora"],
          contents: [
            `${projectName || "Nossa marca"} nasceu de uma convicção simples: fazer melhor, não mais. Cada detalhe conta. Cada cliente também.`,
            `Perdendo tempo em tarefas repetitivas? ${projectName || "Esta solução"} automatiza o essencial para você focar no que realmente importa.`,
            `Menos estresse. Mais resultados. É o que nossos clientes dizem após 30 dias com ${projectName || "a gente"}.`,
            `Quantos clientes você perdeu este mês sem saber? ${projectName || "Nossa solução"} te dá as respostas.`,
            `Uma semana. É tudo que você precisa para ver a diferença com ${projectName || "nossa solução"}. Pronto para tentar?`,
          ],
          hashtags: [["autentico", "marca", "historia"], ["produtividade", "automacao", "eficiencia"], ["resultados", "depoimento", "confianca"], ["clientes", "analise", "desempenho"], ["acao", "desafio", "transformacao"]],
        },
      };
      
      const langFallback = fallbackByLang[outputLanguage] || fallbackByLang.en;
      const angles = ["emotion", "probleme", "benefice", "emotion", "urgence"];
      
      suggestions = langFallback.titles.map((title, i) => ({
        id: String(i + 1),
        title,
        content: langFallback.contents[i],
        contentType: "video",
        angle: angles[i],
        estimatedEngagement: i < 2 || i === 3 ? "high" : "medium",
        hashtags: langFallback.hashtags[i],
      }));
    }

    // Return appropriate format based on content type
    if (contentType === "social_post" && socialSuggestion) {
      console.log("Returning social post suggestion");
      return new Response(
        JSON.stringify({ suggestion: socialSuggestion }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Suggestions generated successfully:", suggestions?.length || 0);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in suggest-content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
