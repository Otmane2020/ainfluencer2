## Objectif

Le projet doit être 100 % cohérent avec son positionnement actuel : **Product Shot AI** (génération de photos produit, lifestyle, e-commerce). Aujourd'hui, beaucoup de pages, blogs, schemas SEO, navigation et CTA parlent encore de **vidéo AI, motion design, ClipMotion vidéo, Sora, Veo, Kling, Reels, TikTok video**. Tout cela doit disparaître ou être réécrit en photo.

Le nom de marque **ClipMotion** est conservé (domaine `clipmotion.ai`) mais le sous-titre devient systématiquement **"Product Shot AI"**.

---

## 1. Routes & pages à SUPPRIMER (App.tsx + fichiers)

Pages publiques 100 % vidéo qui n'ont plus aucun sens :

- `/ai-video-generator` → `AIVideoGeneratorPage.tsx`
- `/motion-design-ai` → `MotionDesignAIPage.tsx`
- `/nanobananavideo` → `NanoBananaVideoPage.tsx`
- `/blog/clip-motion` → `BlogClipMotionPage.tsx`
- `/clip-motion-faq` → `ClipMotionFAQPage.tsx`
- Blog articles vidéo :
  - `/blog/kling-video-ai`
  - `/blog/sora-ai-video-generator`
  - `/blog/nano-banana-video-guide`
  - `/blog/best-ai-video-generators-2026`
  - `/blog/text-to-video-ai-complete-guide`
  - `/blog/ai-video-ads-generator`
  - `/blog/tiktok-videos-with-ai`
  - `/blog/instagram-reels-ai-generator`
  - `/blog/ai-video-for-ecommerce`

Pages internes vidéo à retirer du routing (ne sont plus accessibles) :
- `/videos` (`Videos.tsx`) — conserver uniquement si l'app interne en a besoin ; sinon supprimer le lien et la route.
- `ClipMotionPage.tsx`, `SmartImagePage.tsx` (vidéo) → vérifier et supprimer si non liés.

Composants à supprimer / vider :
- `src/components/landing/VideoShowcase.tsx`
- `src/components/VideoModeSelector.tsx` (déjà vide)
- Imports vidéo dans `MobileLandingPage.tsx`, `LandingPage.tsx`, `Dashboard.tsx`, `FeatureShowcase.tsx`.

## 2. Pages à RÉÉCRIRE en Product Shot

- `LandingPage.tsx` & `MobileLandingPage.tsx` : retirer toute mention vidéo / motion / Reels ; ne garder que photo produit, lifestyle, batch, e-commerce. Showcase = images (montre, sneaker, etc., déjà en place).
- `FAQPage.tsx` : remplacer toutes les Q/R vidéo par des Q/R photo (formats produit, fond blanc, lifestyle, Shopify, batch, résolution image, etc.).
- `PricingPage.tsx` : retirer "videos / month", parler de "product shots / month".
- `UseCasesPage.tsx` : marketing, e-commerce, créateurs → orienté **photo produit** (catalogue, ads statiques, fiches Shopify, lookbooks).
- `BlogPage.tsx` : nouvelle liste d'articles photo (voir §4).
- `FeaturesPage.tsx` : déjà fait, OK.
- `Dashboard.tsx` + `FeatureShowcase.tsx` + `MobileHeader.tsx` + sidebar : supprimer les cartes/liens "AI Video", "Campaigns" (si vidéo), "ClipMotion". Ne garder que **Product Shots**, **AI Image**, **History**, **Integrations**, **Settings**.

## 3. SEO global (`src/lib/seo-data.ts`, `index.html`, `sitemap.xml`, `robots.txt`, `manifest.json`)

- `softwareApplicationSchema` : remplacer "AI Video Generator" → "AI Product Photography Platform". Description = photo produit.
- `productSchema` : nom "ClipMotion Product Shot AI", description photo.
- `faqSchema` : nouvelles Q/R photo (5–8 entrées).
- `seoPages` : réécrire `home`, `pricing`, `useCases`, `faq`, `blog`, `contact`, `privacyPolicy`, `terms` en orientation **AI Product Photography**. Supprimer `aiVideoGenerator`, `motionDesignAI`, `nanoBananaVideo`.
- `blogArticleIdeas` : remplacer la liste par des sujets photo (voir §4).
- `index.html` : title/description/og/twitter → photo produit. Garder marque "ClipMotion".
- `sitemap.xml` : retirer toutes les URLs vidéo, ajouter celles photo.
- `robots.txt` : pointer vers le nouveau sitemap (déjà OK).
- `manifest.json` : name + description en photo.

## 4. Nouveaux articles de blog (photo-first, SEO)

Remplacer les 11 articles vidéo par 6 articles photo (créer fichiers, routes dans App.tsx, entrées sitemap) :

1. `/blog/ai-product-photography-guide` — *AI Product Photography in 2026: Complete Guide*
2. `/blog/shopify-product-photos-with-ai` — *How to Create Shopify Product Photos with AI*
3. `/blog/lifestyle-product-shots-ai` — *Lifestyle Product Shots with AI (Without a Studio)*
4. `/blog/background-removal-ai` — *AI Background Removal for E-commerce*
5. `/blog/batch-product-images-ai` — *Generate 100s of Product Images in Minutes with AI*
6. `/blog/best-ai-product-shot-tools-2026` — *10 Best AI Product Shot Generators in 2026*

Chaque article : `BlogArticleLayout`, 800–1200 mots, H1/H2 SEO, schéma `Article`, internal links vers `/features`, `/pricing`, `/product-shots`.

## 5. Tests / vérifications

- Tester chaque route restante (404 sur les supprimées → redirect ou propre 404).
- Vérifier qu'aucun import cassé ne reste après suppression.
- Vérifier mobile (360 px) et desktop.
- Vérifier sitemap, robots, JSON-LD via les pages publiques.

---

## Section technique

- App.tsx : retirer imports + routes listés en §1 ; ajouter routes nouveaux blogs.
- Supprimer fichiers : 5 pages publiques + 9 articles vidéo + `VideoShowcase.tsx` + `VideoModeSelector.tsx`.
- `seo-data.ts` : réécrit en grande partie (clés home/pricing/useCases/faq/blog/contact + suppression des 3 clés vidéo + nouvelle `blogArticleIdeas`).
- `LandingPage.tsx`, `MobileLandingPage.tsx`, `FAQPage.tsx`, `PricingPage.tsx`, `UseCasesPage.tsx`, `BlogPage.tsx`, `Dashboard.tsx`, `FeatureShowcase.tsx`, `MobileHeader.tsx`, `AppSidebar.tsx` : nettoyage et réécriture des sections vidéo.
- `index.html`, `public/manifest.json`, `public/sitemap.xml` : MAJ titres/desc/URLs.
- Pas de migration DB nécessaire.

Tout reste en **anglais** pour l'UI publique, conformément aux règles projet.
