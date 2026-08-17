import { createFileRoute } from "@tanstack/react-router";
import ClipMotionFAQPage from "@/pages/ClipMotionFAQPage";

const title = "Clip Motion FAQ — How AI Clip Motion Works";
const description =
  "What Clip Motion is, how AI turns a prompt into an animated clip, supported formats, languages, pricing and commercial rights.";
const url = "https://clipmotion.ai/clip-motion-faq";
const ogImage = "https://clipmotion.ai/og-image.png";

const clipMotionFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      q: "What is Clip Motion?",
      a: "Clip Motion (ClipMotion) is an AI-powered video creation platform that transforms text prompts into professional videos, generating motion design, animations, voiceovers and complete social media videos automatically — no editing skills required.",
    },
    {
      q: "How does Clip Motion work?",
      a: "Clip Motion works in 4 steps: describe your video, the AI generates visuals and motion graphics, add an AI voiceover or music, then export or publish directly to social media. The whole process takes under 60 seconds.",
    },
    {
      q: "Do I need video editing experience to use Clip Motion?",
      a: "No. The AI handles motion design, animation timing, transitions and export settings. You simply describe what you want and the AI creates it.",
    },
    {
      q: "What types of videos can I create with Clip Motion?",
      a: "TikTok videos (9:16), Instagram Reels, YouTube Shorts, Facebook and LinkedIn content, product demos, marketing ads, explainer videos and AI influencer content, each optimised for its platform.",
    },
    {
      q: "How fast can Clip Motion generate a video?",
      a: "Most videos are generated in under 60 seconds. Complex motion design videos with AI voiceovers may take 2-3 minutes.",
    },
    {
      q: "Is my content safe and private on Clip Motion?",
      a: "Yes. Your content, brand assets and generated videos stay private to your account, protected by enterprise-grade encryption and never shared with third parties.",
    },
  ].map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export const Route = createFileRoute("/clip-motion-faq")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: url },
      { property: "og:image", content: ogImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImage },
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(clipMotionFaqSchema) }],
  }),
  component: ClipMotionFAQPage,
});
