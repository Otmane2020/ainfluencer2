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

function buildScenarioPrompt(sectorId?: string, styleId?: string, toneId?: string): string {
  const parts: string[] = [];
  
  const sector = BUSINESS_SECTORS.find(s => s.id === sectorId);
  const style = VIDEO_STYLES.find(s => s.id === styleId);
  const tone = EMOTIONAL_TONES.find(t => t.id === toneId);
  
  if (sector || style || tone) {
    parts.push("\n\n--- CONTEXTE VISUEL / SCÉNARIO ---");
    
    if (sector) {
      parts.push(`SECTEUR D'ACTIVITÉ : ${sector.name}`);
      parts.push(`Éléments visuels recommandés : ${sector.visualContext}`);
    }
    
    if (style) {
      parts.push(`STYLE VIDÉO : ${style.name}`);
      parts.push(`Instructions de réalisation : ${style.visualInstructions}`);
    }
    
    if (tone) {
      parts.push(`TON ÉMOTIONNEL : ${tone.name}`);
      parts.push(`Atmosphère : ${tone.atmosphereNotes}`);
    }
    
    parts.push("--- FIN DU CONTEXTE VISUEL ---\n\n");
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
      scriptType, // reel, story, ad, testimonial
      duration, // Video duration in seconds
      // NEW: Project branding
      logoUrl,
      detectedLanguage, // Language detected from Firecrawl
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

      systemPrompt = `You are a CONVERSION-FOCUSED image prompt specialist creating SELLER SHOWCASING visuals that DRIVE ACTION.

🚨 CRITICAL BRAND NAME RULE:
"${projectName}" is a BRAND NAME, not a literal description!
- DO NOT interpret the brand name literally (e.g., "Starlinko" does NOT mean stars, links, or space themes)
- FOCUS ONLY on what the brand ACTUALLY SELLS based on the website content below
- The brand name should appear as a logo or text overlay, NEVER as a visual concept

🎯 ULTIMATE GOAL: Create image prompts that make people WANT TO BUY. Every image must:
- SHOWCASE the actual product/service the brand sells (NOT the brand name as a concept)
- Create DESIRE and URGENCY in the viewer
- Highlight TRANSFORMATION and RESULTS the product delivers
- Feature the PRODUCT HERO prominently
- Appeal to EMOTIONS that drive purchase decisions

🔥 IMPACTFUL IMAGE FORMULAS:

FORMULA 1 - PRODUCT HERO SHOT:
"[Actual product/service] displayed as the undisputed hero, [premium setting], [luxury lighting], [aspirational lifestyle context], making viewers NEED to own it"

FORMULA 2 - TRANSFORMATION/RESULT:
"Dramatic before/after or result visualization showing [the outcome customers desire], [emotional satisfaction visible], [social proof implied]"

FORMULA 3 - LIFESTYLE ASPIRATION:
"[Target customer persona] living their BEST life thanks to [actual product/service], [enviable situation], [emotional payoff visible], [creates FOMO]"

FORMULA 4 - SOCIAL PROOF MOMENT:
"[Happy customer type] experiencing [key benefit], [genuine emotion], [relatable yet aspirational], [makes viewers think 'I want that too']"

FORMULA 5 - URGENCY/SCARCITY:
"[Product] in a context that implies exclusivity or limited availability, [premium packaging], [VIP treatment vibes], [creates 'must have now' feeling]"

📍 BRAND SELLING CONTEXT:
- Brand name (DO NOT interpret literally): ${projectName || "Unknown seller"}
- What they ACTUALLY SELL (FOCUS ON THIS): ${projectDescription || "Products/services to promote"}
${projectUrl ? `- Sales page: ${projectUrl}` : ""}
${brandContext}
${sector ? `- Market: ${sector.name} - Visual hooks: ${sector.visualContext}` : ""}
${style ? `- Visual approach: ${style.name} - ${style.visualInstructions}` : ""}
${tone ? `- Emotional trigger: ${tone.name} - ${tone.atmosphereNotes}` : ""}
${productName ? `- Focus product: ${productName}` : ""}
${logoUrl ? `- Brand logo to include: ${logoUrl}` : ""}

🚫 STRICTLY FORBIDDEN (these kill conversions):
❌ Interpreting the brand name literally as a visual concept
❌ Generic stock photo vibes
❌ Abstract concepts without product focus
❌ Boring flat lays without context
❌ Images that could be ANY brand
❌ No clear product or benefit visible
❌ Cluttered compositions that confuse
❌ Stars, space, futuristic themes UNLESS that's what the brand actually sells

✅ IMPACTFUL PROMPT EXAMPLES:

For a Google review management SaaS (like Starlinko): "Business owner smiling at their phone showing 5-star Google reviews flooding in, their local business storefront visible through window behind them, notification badges showing positive reviews, the relief and satisfaction of automated reputation management, clean professional photography, warm lighting, ${projectName} logo subtly visible on screen"

For e-commerce skincare: "Glowing woman in her 30s gently touching her flawless cheek, the signature serum bottle positioned elegantly in foreground, soft morning bathroom light, mirror reflection showing confident smile, the transformation result that makes viewers reach for their credit card, beauty editorial photography, shallow depth of field"

For coaching service: "Confident entrepreneur just closed a major deal, celebrating in a modern glass office with city skyline view, laptop showing growth charts, the exact success their coaching clients achieve, aspirational but attainable, lifestyle photography that sells the dream"

For restaurant: "Signature dish being served to an excited couple at the best table, steam rising, golden hour light through floor-to-ceiling windows, the waiter presenting with pride, FOMO-inducing dining experience, making viewers book a reservation immediately"

${languageInstruction}

Respond ONLY with valid JSON:
{
  "suggestions": [
    {
      "id": "1",
      "title": "Impactful hook title (max 50 chars)",
      "content": "The complete seller-focused image prompt that SHOWCASES the ACTUAL product/service (NOT the brand name concept)",
      "contentType": "image",
      "conversionAngle": "product_hero|transformation|lifestyle|social_proof|urgency",
      "estimatedEngagement": "high"
    }
  ]
}`;

      userMessage = `Generate 5 IMPACTFUL seller-showcasing image prompts for "${projectName || 'this seller'}". 
Each prompt must:
1. Put the PRODUCT/SERVICE as the HERO
2. Show the TRANSFORMATION or RESULT customers get
3. Create DESIRE and URGENCY
4. Be SPECIFIC to this brand - no generic images
5. Make viewers want to BUY NOW

Mix of formulas: 2 product hero shots, 1 transformation, 1 lifestyle, 1 social proof.`;

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
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Handle social_post format (singular suggestion)
        if (contentType === "social_post" && parsed.suggestion) {
          socialSuggestion = parsed.suggestion;
          console.log("Social post suggestion parsed:", socialSuggestion.content?.substring(0, 100));
        } else {
          // Handle regular suggestions format
          suggestions = parsed.suggestions || parsed;
          
          // Quality filter: validate each suggestion (same logic as nanobanana)
          if (Array.isArray(suggestions)) {
            suggestions = suggestions.filter((s: { content?: string }) => {
              const text = s.content?.trim() || "";
              
              // Length check (more permissive for ads with timestamps)
              const textWithoutTimestamps = text.replace(/\[\d+[–-]\d+s\]/g, "").trim();
              if (textWithoutTimestamps.length < 30 || textWithoutTimestamps.length > 800) return false;
              
              // English words check (strict - only for non-English content)
              if (contentType !== "social_post") {
                const englishWords = /\b(discover|our|solution|innovative|boost|game-changer|tips|hack|amazing|incredible|unique|transform|revolutionary)\b/gi;
                if ((text.match(englishWords) || []).length > 0) return false;
              }
              
              // Generic French marketing phrases check (only for French content)
              if (contentType !== "social_post") {
                const genericPhrases = [
                  "découvrez notre",
                  "n'attendez plus",
                  "solution innovante",
                  "révolutionnaire",
                  "unique en son genre",
                  "va changer votre vie",
                  "ne manquez pas",
                ];
                const lowerText = text.toLowerCase();
                if (genericPhrases.some(phrase => lowerText.includes(phrase))) return false;
              }
              
              // For ADS: Check sentence length (max 7 words per sentence)
              if (scriptType === "ad") {
                const lines = text.split(/\n/).filter(Boolean);
                for (const line of lines) {
                  const cleanLine = line.replace(/^\[\d+[–-]\d+s\]\s*/, "").trim();
                  if (cleanLine) {
                    const words = cleanLine.split(/\s+/).filter(Boolean);
                    if (words.length > 8) {
                      console.log("ADS script rejected - line too long:", cleanLine);
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
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Fallback suggestions in perfect French
      suggestions = [
        {
          id: "1",
          title: "L'histoire derrière la marque",
          content: `${projectName || "Notre marque"} est née d'une conviction simple : faire mieux, pas plus. Chaque détail compte. Chaque client aussi.`,
          contentType: "video",
          angle: "emotion",
          estimatedEngagement: "high",
          hashtags: ["authenticite", "marque", "histoire"],
        },
        {
          id: "2", 
          title: "Le problème que vous connaissez",
          content: `Vous perdez du temps sur des tâches répétitives ? ${projectName || "Cette solution"} automatise l'essentiel pour que vous puissiez vous concentrer sur ce qui compte vraiment.`,
          contentType: "video",
          angle: "probleme",
          estimatedEngagement: "high",
          hashtags: ["productivite", "automatisation", "efficacite"],
        },
        {
          id: "3",
          title: "Résultat concret",
          content: `Moins de stress. Plus de résultats. Voilà ce que nos clients disent après 30 jours avec ${projectName || "nous"}.`,
          contentType: "video",
          angle: "benefice",
          estimatedEngagement: "medium",
          hashtags: ["resultats", "temoignage", "confiance"],
        },
        {
          id: "4",
          title: "La question qui pique",
          content: `Combien de clients as-tu perdus ce mois-ci sans le savoir ? ${projectName || "Notre solution"} te donne les réponses.`,
          contentType: "video",
          angle: "emotion",
          estimatedEngagement: "high",
          hashtags: ["clients", "analyse", "performance"],
        },
        {
          id: "5",
          title: "L'action immédiate",
          content: `Une semaine. C'est tout ce qu'il te faut pour voir la différence avec ${projectName || "notre solution"}. Prêt à essayer ?`,
          contentType: "video",
          angle: "urgence",
          estimatedEngagement: "high",
          hashtags: ["action", "defi", "transformation"],
        },
      ];
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
