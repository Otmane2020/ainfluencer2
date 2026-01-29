// ============================================================
// VIDEO SCENARIOS - Context settings for video generation
// ============================================================

export interface VideoScenario {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  promptContext: string;
}

// ============================================================
// BUSINESS SECTORS
// ============================================================

export const BUSINESS_SECTORS: VideoScenario[] = [
  {
    id: "restaurant",
    name: "Restaurant",
    icon: "UtensilsCrossed",
    promptContext: "Restaurant setting with delicious food, warm ambiance, chef preparing dishes, satisfied customers dining",
  },
  {
    id: "boutique",
    name: "Fashion & Retail",
    icon: "ShoppingBag",
    promptContext: "Fashion boutique with elegant displays, customers trying on clothes, stylish interior, shopping experience",
  },
  {
    id: "real-estate",
    name: "Real Estate",
    icon: "Home",
    promptContext: "Beautiful property tour, modern home interior, real estate agent showing house, dream home vibes",
  },
  {
    id: "medical",
    name: "Healthcare",
    icon: "Stethoscope",
    promptContext: "Professional medical clinic, caring doctor with patient, clean modern healthcare environment, trust and expertise",
  },
  {
    id: "hotel",
    name: "Hospitality",
    icon: "Building2",
    promptContext: "Luxury hotel experience, beautiful room reveal, spa and amenities, vacation and relaxation vibes",
  },
  {
    id: "fitness",
    name: "Fitness & Wellness",
    icon: "Dumbbell",
    promptContext: "Dynamic gym environment, workout session, athletic performance, motivation and energy",
  },
  {
    id: "beauty",
    name: "Beauty & Spa",
    icon: "Sparkles",
    promptContext: "Beauty salon transformation, hair styling, makeup application, before and after reveal",
  },
  {
    id: "auto",
    name: "Automotive",
    icon: "Car",
    promptContext: "Car dealership or garage, vehicle showcase, automotive expertise, professional car care",
  },
  {
    id: "tech",
    name: "Technology",
    icon: "Laptop",
    promptContext: "Modern tech office, innovative product demo, startup culture, cutting-edge technology",
  },
  {
    id: "education",
    name: "Education",
    icon: "GraduationCap",
    promptContext: "Learning environment, classroom or online course, knowledge sharing, student success stories",
  },
  {
    id: "agency",
    name: "Professional Services",
    icon: "Briefcase",
    promptContext: "Professional agency office, team collaboration, client meeting, business success",
  },
  {
    id: "ecommerce",
    name: "E-commerce",
    icon: "Package",
    promptContext: "Product unboxing, online shopping experience, package delivery, customer satisfaction",
  },
];

// ============================================================
// VIDEO STYLES
// ============================================================

export const VIDEO_STYLES: VideoScenario[] = [
  {
    id: "testimonial",
    name: "Testimonial",
    icon: "MessageCircle",
    promptContext: "Authentic customer testimonial, real person speaking to camera, genuine emotion and satisfaction",
  },
  {
    id: "product-demo",
    name: "Product Demo",
    icon: "Box",
    promptContext: "Product demonstration, hands-on showcase, features highlight, close-up details",
  },
  {
    id: "before-after",
    name: "Transformation",
    icon: "ArrowRightLeft",
    promptContext: "Dramatic before and after transformation, split screen comparison, impressive results",
  },
  {
    id: "tutorial",
    name: "Tutorial",
    icon: "BookOpen",
    promptContext: "Step-by-step tutorial, educational content, how-to guide, clear instructions",
  },
  {
    id: "behind-scenes",
    name: "Behind the Scenes",
    icon: "Film",
    promptContext: "Behind the scenes footage, making-of content, authentic process reveal, team at work",
  },
  {
    id: "story",
    name: "Brand Story",
    icon: "BookMarked",
    promptContext: "Brand storytelling, company journey, founder story, mission and values",
  },
  {
    id: "lifestyle",
    name: "Lifestyle",
    icon: "Heart",
    promptContext: "Lifestyle content, aspirational visuals, product in daily life, aesthetic scenes",
  },
  {
    id: "ugc",
    name: "UGC Style",
    icon: "Smartphone",
    promptContext: "User-generated content style, casual phone recording, authentic and raw, relatable content",
  },
];

// ============================================================
// EMOTIONAL TONES
// ============================================================

export const EMOTIONAL_TONES: VideoScenario[] = [
  {
    id: "urgent",
    name: "Urgent",
    icon: "Zap",
    promptContext: "Fast-paced, dynamic editing, urgency and FOMO, limited time offer vibes, action-driven",
  },
  {
    id: "inspiring",
    name: "Inspiring",
    icon: "Sunrise",
    promptContext: "Inspirational mood, motivational energy, success story, uplifting music vibes, emotional journey",
  },
  {
    id: "reassuring",
    name: "Reassuring",
    icon: "Shield",
    promptContext: "Calm and trustworthy, professional expertise, reliable service, peace of mind, safety",
  },
  {
    id: "dynamic",
    name: "Dynamic",
    icon: "Rocket",
    promptContext: "High energy, fast cuts, exciting visuals, modern and trendy, youth appeal",
  },
  {
    id: "professional",
    name: "Professional",
    icon: "Award",
    promptContext: "Corporate style, business professional, credibility and expertise, polished presentation",
  },
  {
    id: "playful",
    name: "Playful",
    icon: "PartyPopper",
    promptContext: "Fun and playful, colorful visuals, humor, engaging and entertaining, light-hearted",
  },
  {
    id: "luxurious",
    name: "Premium",
    icon: "Crown",
    promptContext: "Premium and luxurious, elegant visuals, high-end aesthetic, exclusive and sophisticated",
  },
  {
    id: "authentic",
    name: "Authentic",
    icon: "Fingerprint",
    promptContext: "Raw and authentic, no filters, real moments, genuine connection, transparency",
  },
];

// ============================================================
// SCENARIO PRESET COMBINATIONS
// ============================================================

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  sector: string;
  style: string;
  tone: string;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "restaurant-testimonial",
    name: "Restaurant Review",
    description: "Happy customer sharing their dining experience",
    sector: "restaurant",
    style: "testimonial",
    tone: "authentic",
  },
  {
    id: "boutique-lifestyle",
    name: "Fashion Showcase",
    description: "Stylish lifestyle content for fashion brands",
    sector: "boutique",
    style: "lifestyle",
    tone: "luxurious",
  },
  {
    id: "real-estate-tour",
    name: "Property Tour",
    description: "Immersive home tour with professional vibes",
    sector: "real-estate",
    style: "product-demo",
    tone: "professional",
  },
  {
    id: "fitness-motivation",
    name: "Fitness Motivation",
    description: "High-energy workout content",
    sector: "fitness",
    style: "before-after",
    tone: "inspiring",
  },
  {
    id: "beauty-transformation",
    name: "Beauty Glow Up",
    description: "Stunning before/after beauty transformation",
    sector: "beauty",
    style: "before-after",
    tone: "dynamic",
  },
  {
    id: "tech-demo",
    name: "Tech Product Launch",
    description: "Sleek product demo for tech products",
    sector: "tech",
    style: "product-demo",
    tone: "dynamic",
  },
  {
    id: "medical-trust",
    name: "Healthcare Trust",
    description: "Professional medical content building trust",
    sector: "medical",
    style: "testimonial",
    tone: "reassuring",
  },
  {
    id: "ecommerce-unbox",
    name: "Unboxing Experience",
    description: "Exciting product unboxing content",
    sector: "ecommerce",
    style: "product-demo",
    tone: "playful",
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export const buildScenarioPrompt = (
  sector?: VideoScenario,
  style?: VideoScenario,
  tone?: VideoScenario
): string => {
  const parts: string[] = [];
  
  if (sector) parts.push(sector.promptContext);
  if (style) parts.push(style.promptContext);
  if (tone) parts.push(tone.promptContext);
  
  if (parts.length === 0) return "";
  
  return `Visual context: ${parts.join(". ")}. `;
};

export const getScenarioById = (
  id: string,
  list: VideoScenario[]
): VideoScenario | undefined => {
  return list.find((s) => s.id === id);
};

export const getPresetScenario = (presetId: string) => {
  const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  
  return {
    sector: getScenarioById(preset.sector, BUSINESS_SECTORS),
    style: getScenarioById(preset.style, VIDEO_STYLES),
    tone: getScenarioById(preset.tone, EMOTIONAL_TONES),
  };
};
