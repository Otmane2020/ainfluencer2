
# Plan : Création des Packs Commerciaux et Refonte des Modèles IA

## Objectif
Transformer l'interface technique en interface business-ready :
- **Masquer les noms techniques** (Sora, Veo, Flux, ElevenLabs) au profit de noms commerciaux
- **Créer des packs commerciaux** avec pricing attractif (Starter, Pro, Agency)
- **Simplifier le choix utilisateur** avec des niveaux de qualité (Standard, Pro, Ultra, Cinema)

---

## Architecture Proposée

### 1. Nouveaux Produits Commerciaux (visible client)

**Images :**
| Nom Commercial | Qualité | Prix Vente | Coût API |
|----------------|---------|------------|----------|
| AI Image Standard | Standard | 2€ | ~$0.01 |
| AI Image Pro | Pro | 5€ | ~$0.03-0.08 |
| AI Image Studio | Ultra | 10-15€ | ~$0.10-0.20 |

**Vidéos :**
| Nom Commercial | Qualité | Prix Vente | Coût API |
|----------------|---------|------------|----------|
| AI Reel | Standard | 15€ | ~$0.40 |
| AI Reel Pro | Pro | 25-39€ | ~$0.64-1.92 |
| AI Cinema | Ultra | 59-79€ | ~$2.00 |

**Vidéos Parlantes (AI Influencer) :**
| Nom Commercial | Qualité | Prix Vente | Coût API |
|----------------|---------|------------|----------|
| AI Influencer Standard | Pro | 39€ | ~$0.50-1.00 |
| AI Influencer Pro | Ultra | 69€ | ~$1.50-2.00 |

### 2. Packs Commerciaux

| Pack | Contenu | Prix/mois | Coût réel |
|------|---------|-----------|-----------|
| **Starter** | 10 images + 2 vidéos | 49€ | ~2€ |
| **Pro** | 30 images + 6 vidéos + 2 vidéos parlantes | 149€ | ~6-8€ |
| **Agency** | Usage illimité (fair-use) + choix qualité | 299-499€ | variable |

---

## Modifications Techniques

### Fichier 1 : `src/components/ModelSelector.tsx`

**Changements :**
- Créer une nouvelle interface `CommercialProduct` avec mapping interne vers les modèles techniques
- Remplacer `AI_MODELS` par `COMMERCIAL_PRODUCTS` pour l'affichage client
- Ajouter un mapping privé `INTERNAL_MODEL_MAPPING` qui lie chaque produit commercial aux vrais modèles API
- Masquer : provider, noms techniques (Sora, Veo, Kling, Flux, ElevenLabs)
- Afficher : nom commercial, description business, prix de vente, features orientées résultat

**Nouvelle structure :**
```typescript
interface CommercialProduct {
  id: string;
  name: string; // "AI Image Pro", "AI Reel Cinema"
  category: "image" | "video" | "avatar";
  tier: "standard" | "pro" | "ultra" | "cinema";
  salePrice: number; // Prix de vente en €
  salePriceUnit: string;
  description: string; // Description business
  features: string[]; // Features orientées client
  internalModels: string[]; // IDs des vrais modèles (NON AFFICHÉ)
  needsVoice: boolean;
  needsAvatar?: boolean;
  supportedDurations?: number[];
}

// Mapping interne (JAMAIS exposé au client)
const INTERNAL_MODEL_MAPPING: Record<string, AIModel> = {...}
```

### Fichier 2 : `src/components/ProductSelector.tsx` (NOUVEAU)

**Création d'un nouveau composant** qui remplace ModelSelector pour l'interface client :
- Affiche uniquement les produits commerciaux avec noms business
- Design épuré sans mentions techniques
- Indicateurs de qualité visuels (Standard → Cinema)
- Prix en euros (pas en dollars API)

### Fichier 3 : `src/components/PricingPacks.tsx` (NOUVEAU)

**Nouveau composant pour afficher les packs :**
- 3 cartes : Starter, Pro, Agency
- Comparatif des features
- CTA d'abonnement
- Affichage économies réalisées

### Fichier 4 : `src/components/VideoGenerator.tsx`

**Changements :**
- Remplacer `ModelSelector` par `ProductSelector`
- Adapter la logique pour utiliser le mapping interne
- Masquer les détails techniques dans les toasts et messages
- Afficher "Vidéo AI Reel Pro générée" au lieu de "Vidéo Sora 2 Pro générée"

### Fichier 5 : `src/components/ScheduledPostModal.tsx`

**Changements :**
- Remplacer l'affichage des modèles IA par les produits commerciaux
- Mettre à jour l'onglet "Modèles IA" avec le nouveau `ProductSelector`
- Masquer pricing API, afficher pricing vente

### Fichier 6 : `src/pages/Videos.tsx`

**Changements :**
- Intégrer le sélecteur de produits commerciaux
- Ajouter section "Packs recommandés" en bas de page

### Fichier 7 : `src/pages/Settings.tsx`

**Ajouts :**
- Nouvelle section "Abonnement & Crédits"
- Affichage du pack actuel
- Compteur de crédits restants (images/vidéos)
- Bouton upgrade

---

## Logique Métier

### Sélection Automatique du Modèle (invisible client)

```typescript
// Quand le client choisit "AI Reel Pro"
function getInternalModel(productId: string): string {
  const mapping = {
    "ai-reel-pro": "sora-2-pro", // Sora 2 Pro en interne
    "ai-image-standard": "flux-2-flex", // Flux 2 Flex
    "ai-influencer-pro": "kling-lip-sync-pro", // Kling Lip-Sync Pro
  };
  return mapping[productId];
}
```

### Voix Automatique (ElevenLabs)

Tous les modèles vidéo utilisent automatiquement ElevenLabs pour la voix - c'est déjà implémenté dans `VideoGenerator.tsx` mais les messages seront adaptés :
- ❌ "Voix ElevenLabs générée"
- ✅ "Voix off IA ultra-réaliste incluse"

---

## Résumé des Fichiers

| Fichier | Action |
|---------|--------|
| `src/components/ModelSelector.tsx` | Refactoring majeur - mapping interne |
| `src/components/ProductSelector.tsx` | **NOUVEAU** - Interface client |
| `src/components/PricingPacks.tsx` | **NOUVEAU** - Packs commerciaux |
| `src/components/VideoGenerator.tsx` | Adaptation au nouveau système |
| `src/components/ScheduledPostModal.tsx` | Adaptation au nouveau système |
| `src/pages/Videos.tsx` | Intégration packs |
| `src/pages/Settings.tsx` | Section abonnement |

---

## Bénéfices Business

1. **Protection marge** : Le client ne voit jamais le coût API réel
2. **Valeur perçue** : Noms commerciaux premium (AI Cinema > Veo 3.1 Pro)
3. **Simplicité** : 3 niveaux au lieu de 15+ modèles techniques
4. **Upsell naturel** : Progression Standard → Pro → Cinema
5. **Secret industriel** : Routing intelligent non exposé

