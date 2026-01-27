// ClipMotion SEO Data - All structured data and meta information

export const SITE_URL = "https://clipmotion.ai";
export const SITE_NAME = "ClipMotion";

// Organization Schema
export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ClipMotion",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [
    "https://twitter.com/clipmotion",
    "https://linkedin.com/company/clipmotion",
    "https://instagram.com/clipmotion.ai",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@clipmotion.ai",
    contactType: "customer support",
    availableLanguage: "English",
  },
};

// Software Application Schema with AggregateRating
export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ClipMotion AI Video Generator",
  applicationCategory: "MultimediaApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "ClipMotion is an AI-powered video generation platform that creates stunning motion design videos, AI influencer content, and social media videos in seconds.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free plan available",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "189000",
    bestRating: "5",
    worstRating: "1",
  },
  author: {
    "@type": "Organization",
    name: "ClipMotion",
  },
};

// Product Schema for Pricing
export const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "ClipMotion Pro",
  description:
    "Professional AI video generation platform for content creators, marketers, and agencies.",
  brand: {
    "@type": "Brand",
    name: "ClipMotion",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Starter Plan",
      price: "49",
      priceCurrency: "EUR",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: "149",
      priceCurrency: "EUR",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Agency Plan",
      price: "299",
      priceCurrency: "EUR",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "189000",
    bestRating: "5",
    worstRating: "1",
  },
};

// FAQ Schema
export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is ClipMotion?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ClipMotion is an AI-powered video generation platform that enables users to create professional motion design videos, AI influencer content, and social media videos in seconds. It automates the entire content creation workflow from script generation to multi-platform publishing.",
      },
    },
    {
      "@type": "Question",
      name: "How does AI video generation work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ClipMotion uses advanced AI models to generate videos from text prompts. Simply describe your video concept, select your preferred style and AI voice, and our platform generates professional-quality videos with motion graphics, animations, and voiceovers automatically.",
      },
    },
    {
      "@type": "Question",
      name: "Can I create AI influencer videos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! ClipMotion features AI avatar generation that creates realistic virtual influencers for your brand. You can generate custom AI spokespersons that deliver your message consistently across all your content.",
      },
    },
    {
      "@type": "Question",
      name: "What platforms can I publish to?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ClipMotion supports direct publishing to Instagram, Facebook, TikTok, LinkedIn, and YouTube. You can schedule and automate posts across all platforms from a single dashboard.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, ClipMotion offers a free plan that lets you try the platform with limited video generations. Paid plans start at €49/month for the Starter plan with 10 images and 2 videos per month.",
      },
    },
    {
      "@type": "Question",
      name: "How is ClipMotion different from other AI video tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ClipMotion is an all-in-one platform that combines AI video generation, motion design, AI avatars, and social media automation. Unlike point solutions, we handle the entire workflow from content ideation to scheduled publishing across multiple platforms.",
      },
    },
    {
      "@type": "Question",
      name: "What video formats and resolutions are supported?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ClipMotion generates videos up to 1080p HD resolution in formats optimized for each social platform: 9:16 for TikTok/Reels, 1:1 for Instagram feed, 16:9 for YouTube, and custom aspect ratios for ads.",
      },
    },
    {
      "@type": "Question",
      name: "Can I use my own voice or brand assets?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, you can upload custom brand assets, logos, and colors. For voiceovers, we offer 30+ AI voices in multiple languages, or you can record your own voice.",
      },
    },
  ],
};

// WebSite Schema for search
export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "ClipMotion",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// SEO Page Metadata
export const seoPages = {
  home: {
    title: "ClipMotion – AI Video Generator for Social Media | Create Videos in Seconds",
    description:
      "Create stunning AI-powered videos for TikTok, Instagram, and YouTube. ClipMotion generates motion design videos, AI influencers, and social content automatically.",
    keywords:
      "AI video generator, motion design AI, text to video AI, AI video for social media, create videos with AI, AI animation tool",
    canonical: SITE_URL,
  },
  features: {
    title: "Features – AI Video Generation & Motion Design Tools | ClipMotion",
    description:
      "Explore ClipMotion's powerful AI features: video generation, motion design, AI avatars, smart scheduling, and one-click publishing to all social platforms.",
    keywords:
      "AI video features, motion design tools, AI avatar generator, social media automation, video scheduling",
    canonical: `${SITE_URL}/features`,
  },
  pricing: {
    title: "Pricing – Affordable AI Video Plans from $49/mo | ClipMotion",
    description:
      "Simple, transparent pricing for AI video generation. Start free, then upgrade to Starter ($49), Pro ($149), or Agency ($299) plans. No hidden fees.",
    keywords:
      "AI video pricing, video generator cost, motion design pricing, AI video subscription",
    canonical: `${SITE_URL}/pricing`,
  },
  useCases: {
    title: "Use Cases – AI Videos for Marketing, E-commerce & Creators | ClipMotion",
    description:
      "See how marketers, e-commerce brands, and content creators use ClipMotion to generate viral AI videos, product demos, and social media content.",
    keywords:
      "AI video use cases, marketing videos AI, ecommerce video, content creator tools",
    canonical: `${SITE_URL}/use-cases`,
  },
  aiVideoGenerator: {
    title: "AI Video Generator – Create Professional Videos from Text | ClipMotion",
    description:
      "Transform text into stunning videos with ClipMotion's AI video generator. Create TikToks, Reels, YouTube Shorts, and ads in seconds with AI.",
    keywords:
      "AI video generator, text to video, video from text AI, AI video maker, automated video creation",
    canonical: `${SITE_URL}/ai-video-generator`,
  },
  motionDesignAI: {
    title: "Motion Design AI – Automated Animation & Motion Graphics | ClipMotion",
    description:
      "Create professional motion design videos with AI. Automated animations, kinetic typography, and motion graphics without design skills required.",
    keywords:
      "motion design AI, AI animation, motion graphics generator, automated animation, kinetic typography AI",
    canonical: `${SITE_URL}/motion-design-ai`,
  },
  faq: {
    title: "FAQ – Frequently Asked Questions About AI Video Generation | ClipMotion",
    description:
      "Get answers to common questions about ClipMotion's AI video generator, pricing, features, and how to create professional videos with artificial intelligence.",
    keywords: "AI video FAQ, ClipMotion help, video generator questions, AI video support",
    canonical: `${SITE_URL}/faq`,
  },
  blog: {
    title: "Blog – AI Video Tips, Tutorials & Industry Insights | ClipMotion",
    description:
      "Learn AI video creation strategies, motion design tips, and social media best practices from ClipMotion's expert blog. Updated weekly.",
    keywords:
      "AI video blog, motion design tutorials, video marketing tips, social media video strategy",
    canonical: `${SITE_URL}/blog`,
  },
  privacyPolicy: {
    title: "Privacy Policy | ClipMotion",
    description:
      "Read ClipMotion's privacy policy. Learn how we collect, use, and protect your personal data when using our AI video generation platform.",
    keywords: "privacy policy, data protection, GDPR, ClipMotion privacy",
    canonical: `${SITE_URL}/privacy-policy`,
  },
  terms: {
    title: "Terms of Service | ClipMotion",
    description:
      "Review ClipMotion's terms of service. Understand your rights and responsibilities when using our AI video generation platform.",
    keywords: "terms of service, user agreement, ClipMotion terms",
    canonical: `${SITE_URL}/terms`,
  },
  contact: {
    title: "Contact Us – Get in Touch with ClipMotion Support",
    description:
      "Have questions about ClipMotion? Contact our support team for help with AI video generation, account issues, or partnership inquiries.",
    keywords: "contact ClipMotion, AI video support, customer service",
    canonical: `${SITE_URL}/contact`,
  },
};

// Blog article ideas for SEO
export const blogArticleIdeas = [
  {
    slug: "best-ai-video-generators-2026",
    title: "10 Best AI Video Generators in 2026 (Comprehensive Comparison)",
    h1: "Best AI Video Generators in 2026",
    keywords: ["AI video generator", "best video AI tools", "AI video comparison"],
  },
  {
    slug: "how-to-create-motion-design-videos-with-ai",
    title: "How to Create Motion Design Videos with AI (Step-by-Step Guide)",
    h1: "Create Stunning Motion Design Videos with AI",
    keywords: ["motion design AI", "AI animation tutorial", "motion graphics guide"],
  },
  {
    slug: "ai-video-vs-traditional-motion-design",
    title: "AI Video vs Traditional Motion Design: Which is Better in 2026?",
    h1: "AI Video vs Traditional Motion Design",
    keywords: ["AI vs traditional video", "motion design comparison", "video production cost"],
  },
  {
    slug: "text-to-video-ai-complete-guide",
    title: "Text to Video AI: The Complete 2026 Guide for Beginners",
    h1: "Text to Video AI: Complete Beginner's Guide",
    keywords: ["text to video", "AI video from text", "automated video creation"],
  },
  {
    slug: "ai-video-ads-generator",
    title: "How to Create High-Converting Video Ads with AI in Minutes",
    h1: "Generate Video Ads with AI That Actually Convert",
    keywords: ["AI video ads", "ad generator", "automated ad creation"],
  },
  {
    slug: "tiktok-videos-with-ai",
    title: "Create Viral TikTok Videos with AI: 2026 Strategy Guide",
    h1: "How to Make Viral TikTok Videos with AI",
    keywords: ["TikTok AI videos", "viral content AI", "TikTok automation"],
  },
  {
    slug: "ai-influencer-marketing",
    title: "AI Influencers: The Future of Digital Marketing in 2026",
    h1: "AI Influencers: Complete Marketing Guide",
    keywords: ["AI influencer", "virtual influencer", "digital avatar marketing"],
  },
  {
    slug: "instagram-reels-ai-generator",
    title: "Instagram Reels AI Generator: Automate Your Content in 2026",
    h1: "Generate Instagram Reels with AI Automatically",
    keywords: ["Instagram Reels AI", "Reels generator", "automated Instagram content"],
  },
  {
    slug: "ai-video-for-ecommerce",
    title: "AI Video for E-commerce: Boost Sales with Automated Product Videos",
    h1: "AI Video for E-commerce: Increase Conversions",
    keywords: ["ecommerce video AI", "product video generator", "AI product demos"],
  },
  {
    slug: "youtube-shorts-ai",
    title: "YouTube Shorts AI: How to Generate Shorts That Get Views",
    h1: "Create YouTube Shorts with AI That Go Viral",
    keywords: ["YouTube Shorts AI", "Shorts generator", "AI video for YouTube"],
  },
  {
    slug: "ai-voice-for-videos",
    title: "AI Voice Generators for Video: Best Text-to-Speech in 2026",
    h1: "Best AI Voice Generators for Video Content",
    keywords: ["AI voice", "text to speech video", "voiceover AI"],
  },
  {
    slug: "social-media-video-automation",
    title: "Social Media Video Automation: Complete 2026 Playbook",
    h1: "Automate Your Social Media Videos",
    keywords: ["video automation", "social media automation", "content automation"],
  },
  {
    slug: "ai-video-editing-tools",
    title: "AI Video Editing Tools: Edit Videos 10x Faster with AI",
    h1: "AI Video Editing: Work Smarter, Not Harder",
    keywords: ["AI video editing", "automated editing", "video editing tools"],
  },
  {
    slug: "motion-graphics-templates-ai",
    title: "AI Motion Graphics Templates: No Design Skills Required",
    h1: "Motion Graphics Made Easy with AI Templates",
    keywords: ["motion graphics templates", "AI templates", "animated templates"],
  },
  {
    slug: "ai-video-scripts",
    title: "How to Write Video Scripts with AI (That Actually Work)",
    h1: "AI Video Script Writing: Complete Guide",
    keywords: ["AI video scripts", "script generator", "video copywriting AI"],
  },
  {
    slug: "faceless-youtube-channel",
    title: "Start a Faceless YouTube Channel with AI in 2026",
    h1: "Build a Faceless YouTube Channel Using AI",
    keywords: ["faceless YouTube", "AI YouTube channel", "automated YouTube"],
  },
  {
    slug: "ai-video-localization",
    title: "AI Video Localization: Translate Videos to 50+ Languages",
    h1: "Localize Your Videos with AI Translation",
    keywords: ["video localization", "AI translation", "multilingual video"],
  },
  {
    slug: "repurpose-content-with-ai",
    title: "Repurpose Content with AI: Turn 1 Video into 10 Pieces",
    h1: "Content Repurposing with AI: Multiply Your Reach",
    keywords: ["content repurposing", "AI content", "video repurposing"],
  },
  {
    slug: "ai-video-analytics",
    title: "AI Video Analytics: Optimize Performance with Data",
    h1: "Master Video Analytics with AI Insights",
    keywords: ["video analytics AI", "performance optimization", "video metrics"],
  },
  {
    slug: "future-of-ai-video",
    title: "The Future of AI Video: Predictions for 2027 and Beyond",
    h1: "AI Video: What's Coming Next?",
    keywords: ["future AI video", "video AI trends", "video technology predictions"],
  },
];
