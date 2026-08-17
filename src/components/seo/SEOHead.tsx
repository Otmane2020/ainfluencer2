import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  keywords?: string;
  noindex?: boolean;
  structuredData?: object | object[];
}

export const SEOHead = ({
  title,
  description,
  canonical = "https://clipmotion.ai",
  ogImage = "https://clipmotion.ai/og-image.png",
  ogType = "website",
  keywords,
  noindex = false,
  structuredData,
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const updateMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Update meta description
    updateMeta("description", description);

    // Update keywords if provided
    if (keywords) {
      updateMeta("keywords", keywords);
    }

    // Update robots
    if (noindex) {
      updateMeta("robots", "noindex, nofollow");
    } else {
      updateMeta("robots", "index, follow");
    }

    // Update Open Graph tags
    updateMeta("og:title", title, true);
    updateMeta("og:description", description, true);
    updateMeta("og:url", canonical, true);
    updateMeta("og:image", ogImage, true);
    updateMeta("og:type", ogType, true);
    updateMeta("og:site_name", "ClipMotion", true);

    // Update Twitter tags
    updateMeta("twitter:title", title);
    updateMeta("twitter:description", description);
    updateMeta("twitter:image", ogImage);
    updateMeta("twitter:card", "summary_large_image");

    // Update canonical link
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);

    // Update structured data (only the scripts owned by this component,
    // so SSR route-level JSON-LD is preserved)
    if (structuredData) {
      document
        .querySelectorAll('script[type="application/ld+json"][data-seo-head="true"]')
        .forEach((script) => script.remove());

      const dataArray = Array.isArray(structuredData) ? structuredData : [structuredData];
      dataArray.forEach(data => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo-head", "true");
        script.text = JSON.stringify(data);
        document.head.appendChild(script);
      });
    }

    return () => {
      document
        .querySelectorAll('script[type="application/ld+json"][data-seo-head="true"]')
        .forEach((script) => script.remove());
    };
  }, [title, description, canonical, ogImage, ogType, keywords, noindex, structuredData]);

  return null;
};
