# Déploiement des Edge Functions (checkout, abonnement)

Si le checkout ou la page « Choose plan » renvoie des erreurs **CORS** ou **404** en production (`www.clipmotion.ai`), c’est en général que les Edge Functions ne sont pas déployées sur le projet Supabase utilisé par le front.

## Erreurs fréquentes

### 1. "Invalid Refresh Token" / CORS 404

**Cause** : Tu as changé de projet Supabase (ex. vgffjuvaedmxoxvzovoq → axwwpawvezqsybttulyo). Le token en localStorage appartient à l'ancien projet.

**Fix** :
1. Déconnecte-toi (ou vide le localStorage pour clipmotion.ai)
2. Reconnecte-toi → tu auras un token valide pour axwwpawvezqsybttulyo

### 2. "create-checkout" / "check-subscription" → 404 CORS

**Cause** : Les Edge Functions ne sont pas déployées sur le projet axwwpawvezqsybttulyo.

**Fix** :
1. GitHub → Actions → **Supabase Deploy** → **Run workflow**
2. Ou push sur `main` pour déclencher le déploiement auto
3. Vérifie que les secrets `SUPABASE_ACCESS_TOKEN` et `SUPABASE_PROJECT_REF` sont configurés

## Debug checkout (console navigateur)

En cas d'échec, active le mode debug : dans la console (F12), tape :
```js
localStorage.setItem("CHECKOUT_DEBUG", "1")
```
Puis rafraîchis et réessaie. Les logs détaillés apparaîtront. En cas d'erreur, le toast propose **Copier debug** pour coller le rapport.

## Projet Supabase : tout doit pointer vers axwwpawvezqsybttulyo

- **Front (.env + Vercel)** : `VITE_SUPABASE_URL` = `https://axwwpawvezqsybttulyo.supabase.co`
- **Edge Functions** : déployées sur ce même projet
- **STRIPE_SECRET_KEY** : dans Supabase Dashboard → Edge Functions → Secrets

Si le front pointe vers un autre projet, le checkout échouera (404).

## Option 1 : Déployer via GitHub Actions (recommandé)

Le workflow **Supabase Deploy** (`.github/workflows/supabase.yml`) déploie les fonctions à chaque **push sur `main`**.

Pour déployer **sans push** (à la demande) :
1. Ouvre le dépôt sur GitHub → **Actions**
2. Choisis **Supabase Deploy**
3. Clique sur **Run workflow** → **Run workflow**

Assure-toi que les **variables** et **secrets** du dépôt sont configurés :
- Variable : `SUPABASE_PROJECT_REF` = `axwwpawvezqsybttulyo`
- Secret : `SUPABASE_ACCESS_TOKEN` = ton [Personal Access Token](https://supabase.com/dashboard/account/tokens) Supabase

**STRIPE_SECRET_KEY** doit être défini dans **Supabase** (Dashboard → Paramètres → Edge Functions → Secrets), **pas** dans GitHub. Les secrets GitHub servent au déploiement CI uniquement ; les Edge Functions lisent les secrets depuis Supabase.

### Webhook d’échec (autonome)

Pour être notifié en cas d’échec du déploiement, ajoute le secret **`deploy-error-webhook (auto)`** avec l’URL de ton webhook (Discord, Slack, etc.). Le workflow enverra un POST JSON en cas d’erreur.

## Option 2 : Déployer en local (CLI)

À la racine du repo, avec la [CLI Supabase](https://supabase.com/docs/guides/cli) installée et le projet lié :

```bash
# Lier le projet (une fois)
supabase link --project-ref axwwpawvezqsybttulyo

# Déployer toutes les fonctions
supabase functions deploy
```

Pour ne déployer que les fonctions liées au checkout / abonnement :

```bash
supabase functions deploy create-checkout
supabase functions deploy check-subscription
supabase functions deploy customer-portal
supabase functions deploy stripe-webhook
supabase functions deploy grant-founder-lifetime
supabase functions deploy echome-react
```

**EchoMe** (double avatar) nécessite le secret `OPENROUTER_API_KEY` dans Supabase.

Les variables d’environnement (`STRIPE_SECRET_KEY`, etc.) doivent être définies dans le dashboard Supabase (Settings → Edge Functions → Secrets) ou via :

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_...
```

Après déploiement, les appels depuis `https://www.clipmotion.ai` vers `https://axwwpawvezqsybttulyo.supabase.co/functions/v1/create-checkout` (et les autres) doivent répondre correctement (plus de 404, preflight CORS OK).

## Stripe : mise à jour d’API ou nouveau compte

- **Version d’API** : le code n’impose plus de version d’API Stripe ; le SDK utilise sa version par défaut. Après une mise à jour du compte Stripe (Workbench), redéploie les fonctions ci‑dessus pour qu’elles tournent avec le bon SDK.
- **Nouveaux produits / prix** : si tu as recréé des produits ou prix dans le Dashboard Stripe, mets à jour les **Price IDs** dans le code :
  - `supabase/functions/create-checkout/index.ts` : `PLAN_PRICES` et `CREDIT_PACK_PRICES`
  - `supabase/functions/check-subscription/index.ts` : `PRICE_TO_PLAN` (et `PRODUCT_TO_PLAN` si besoin)
  - `supabase/functions/stripe-webhook/index.ts` : les mappings prix → plan / pack
  - `src/lib/stripeProducts.ts` (si utilisé côté front).
