// ClipMotion · Product Shot AI — SEO Data

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

// Software Application Schema
export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ClipMotion – Product Shot AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "ClipMotion is an AI product photography platform for e-commerce. Turn one product photo into 10 high-converting visuals for Shopify, Amazon, Instagram and TikTok in 2 minutes.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free trial available",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "1280",
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
  name: "ClipMotion Product Shot AI",
  description:
    "Professional AI product photography for online sellers, Shopify stores, marketplaces and DTC brands.",
  brand: {
    "@type": "Brand",
    name: "ClipMotion",
  },
  offers: [
    {
      "@type": "Offer",
      name: "Starter Plan",
      price: "29",
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Pro Plan",
      price: "79",
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
    },
    {
      "@type": "Offer",
      name: "Agency Plan",
      price: "199",
      priceCurrency: "USD",
      priceValidUntil: "2027-12-31",
      availability: "https://schema.org/InStock",
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "1280",
    bestRating: "5",
    worstRating: "1",
  },
};

// FAQ Schema (Product Shot AI)
export const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is ClipMotion?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ClipMotion is an AI product photography platform. Upload a single product photo and we generate 10 professional, high-converting product images — clean studio shots, lifestyle scenes and multi-platform formats — in about 2 minutes.",
      },
    },
    {
      "@type": "Question",
      name: "What kind of photos can I upload?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Any photo of your product works — a phone snap, a white-background shot or even an existing catalog image. Our AI removes the background, fixes lighting and recreates the product in new pro scenes.",
      },
    },
    {
      "@type": "Question",
      name: "Does it work for Shopify, Amazon and Etsy?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. ClipMotion exports HD images in the formats required by Shopify, Amazon, Etsy, WooCommerce and social platforms (square, portrait 9:16, landscape).",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Most product galleries are ready in under 2 minutes per product. Batch mode lets you process up to 20 products at once.",
      },
    },
    {
      "@type": "Question",
      name: "Is there a free trial?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. New users get free credits to generate their first product shots, no credit card required.",
      },
    },
    {
      "@type": "Question",
      name: "Are the generated images mine?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, you own a full commercial license on every image you generate, including for paid ads on Meta, TikTok and Google.",
      },
    },
  ],
};

// WebSite Schema
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
    title: "ClipMotion – Product Shot AI | 1 Photo, 10 Pro Product Images in 2 Minutes",
    description:
      "Turn one product photo into 10 high-converting visuals for Shopify, Amazon, Instagram and TikTok. AI product photography in 2 minutes — no studio, no photographer.",
    keywords:
      "product shot AI, AI product photography, ecommerce product photos, Shopify product images, AI background removal, lifestyle product images, ClipMotion",
    canonical: SITE_URL,
  },
  features: {
    title: "Features – AI Product Photography & Lifestyle Shots | ClipMotion",
    description:
      "Explore ClipMotion · Product Shot AI features: 1 photo → 10 pro product shots, background removal, lifestyle scenes, multi-platform formats and batch generation for e-commerce.",
    keywords:
      "AI product photography features, product shot AI, background removal, lifestyle product images, Shopify product photos, batch product images",
    canonical: `${SITE_URL}/features`,
  },
  pricing: {
    title: "Pricing – Affordable AI Product Photography Plans | ClipMotion",
    description:
      "Simple, transparent pricing for AI product shots. Start free, then upgrade to Starter ($29), Pro ($79) or Agency ($199). No hidden fees, cancel anytime.",
    keywords:
      "AI product photography pricing, product shot AI cost, Shopify photo plan, ecommerce image subscription",
    canonical: `${SITE_URL}/pricing`,
  },
  useCases: {
    title: "Use Cases – AI Product Shots for E-commerce, Brands & Creators | ClipMotion",
    description:
      "See how Shopify sellers, DTC brands, marketplaces and agencies use ClipMotion to produce pro product photos at scale — without a studio or a photographer.",
    keywords:
      "product shot use cases, Shopify product photos, ecommerce photography AI, DTC brand photos, marketplace images",
    canonical: `${SITE_URL}/use-cases`,
  },
  faq: {
    title: "FAQ – Frequently Asked Questions About AI Product Photography | ClipMotion",
    description:
      "Answers to common questions about ClipMotion's AI product photography platform: how it works, supported platforms, pricing, licensing and image quality.",
    keywords: "AI product shot FAQ, ClipMotion help, product photography questions, AI photo support",
    canonical: `${SITE_URL}/faq`,
  },
  blog: {
    title: "Blog – AI Product Photography Tips, Tutorials & E-commerce Insights | ClipMotion",
    description:
      "Learn how to create scroll-stopping product photos with AI. Guides on Shopify, Amazon, lifestyle scenes, background removal and batch product imaging.",
    keywords:
      "AI product photography blog, product shot tutorials, ecommerce photo tips, Shopify image guide",
    canonical: `${SITE_URL}/blog`,
  },
  privacyPolicy: {
    title: "Privacy Policy | ClipMotion",
    description:
      "Read ClipMotion's privacy policy. Learn how we collect, use and protect your data when using our AI product photography platform.",
    keywords: "privacy policy, data protection, GDPR, ClipMotion privacy",
    canonical: `${SITE_URL}/privacy-policy`,
  },
  terms: {
    title: "Terms of Service | ClipMotion",
    description:
      "Review ClipMotion's terms of service. Understand your rights and responsibilities when using our AI product photography platform.",
    keywords: "terms of service, user agreement, ClipMotion terms",
    canonical: `${SITE_URL}/terms`,
  },
  contact: {
    title: "Contact Us – Get in Touch with ClipMotion Support",
    description:
      "Have questions about ClipMotion? Contact our team for help with AI product photography, account questions or partnership inquiries.",
    keywords: "contact ClipMotion, AI product shot support, customer service",
    canonical: `${SITE_URL}/contact`,
  },
};

// Blog article ideas — Product Shot AI / e-commerce SEO
export const blogArticleIdeas = [
  {
    slug: "ai-product-photography-guide",
    title: "AI Product Photography in 2026: The Complete Guide",
    h1: "AI Product Photography: Complete 2026 Guide",
    keywords: ["AI product photography", "product shot AI", "ecommerce photos"],
  },
  {
    slug: "shopify-product-photos-with-ai",
    title: "How to Create Shopify Product Photos with AI (Step-by-Step)",
    h1: "Shopify Product Photos with AI",
    keywords: ["Shopify product photos", "AI Shopify images", "ecommerce photography"],
  },
  {
    slug: "lifestyle-product-shots-ai",
    title: "Lifestyle Product Shots with AI (Without a Studio)",
    h1: "Lifestyle Product Shots Powered by AI",
    keywords: ["lifestyle product shots", "AI lifestyle photos", "product scenes"],
  },
  {
    slug: "background-removal-ai",
    title: "AI Background Removal for E-commerce Product Photos",
    h1: "AI Background Removal: A Practical Guide",
    keywords: ["AI background removal", "remove background", "product cutout"],
  },
  {
    slug: "batch-product-images-ai",
    title: "Generate 100s of Product Images in Minutes with AI",
    h1: "Batch Product Image Generation with AI",
    keywords: ["batch product images", "bulk product photos", "catalog photos AI"],
  },
  {
    slug: "best-ai-product-shot-tools-2026",
    title: "10 Best AI Product Shot Generators in 2026 (Comparison)",
    h1: "Best AI Product Shot Generators in 2026",
    keywords: ["best product shot AI", "AI photo tools", "product photography software"],
  },
];
