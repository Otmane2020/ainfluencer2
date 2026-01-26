
# Plan: Planification de contenu, Pop-up detail, LinkedIn/TikTok et correction Facebook

## Analyse de l'existant

### Calendrier actuel
- Le fichier `CalendarPage.tsx` affiche les posts programmes par jour
- Les posts sont stockes dans `scheduled_posts` avec: `content_type`, `text_content`, `platforms`, `status`, `ai_prompt`, `media_url`
- Clic sur un post = pas d'action actuelle (juste un `cursor-pointer`)

### Plateformes actuelles
- Seuls Instagram et Facebook sont supportes dans `platforms[]`
- La table `projects` a `instagram_enabled` et `facebook_enabled`
- Le hook `useMetaOAuth` gere la connexion Meta

### Connexion Facebook
- Les secrets `META_APP_ID` et `META_APP_SECRET` sont configures
- L'edge function `meta-oauth` est fonctionnelle
- Probleme potentiel: Le `META_REDIRECT_URI` doit etre whitelist dans Meta Developer

### Scraping projet
- Firecrawl est connecte et fonctionne via `scrape-project-url`
- Le contenu scrappe (markdown, branding) peut servir de contexte IA

---

## Solution proposee

### 1. Pop-up detail du post programme

Creer un composant `ScheduledPostModal` qui affiche:
- Sujet/titre du post
- Contenu texte complet
- Media (video/image) en preview
- Plateformes ciblees avec icones
- Date/heure de publication
- Statut actuel
- Actions: Editer, Supprimer, Publier maintenant

```text
+----------------------------------------+
|  X                                     |
|  [Video Preview / Image]               |
|----------------------------------------|
|  Sujet: Post viral fitness            |
|                                        |
|  Contenu:                              |
|  "Transforme ta vie en 30 jours..."   |
|                                        |
|  Plateformes:                          |
|  [IG] [FB] [LinkedIn] [TikTok]        |
|                                        |
|  Programmer pour: 28 Jan 2026 18:00    |
|  Statut: Brouillon                     |
|                                        |
|  [Editer] [Supprimer] [Publier]       |
+----------------------------------------+
```

### 2. Ajouter LinkedIn et TikTok

#### Base de donnees
Ajouter les colonnes a `projects`:
- `linkedin_enabled boolean DEFAULT false`
- `tiktok_enabled boolean DEFAULT false`

Mettre a jour `platforms[]` pour supporter: `instagram`, `facebook`, `linkedin`, `tiktok`

#### Interface
- Ajouter les icones LinkedIn et TikTok partout ou Instagram/Facebook sont affiches
- Mettre a jour `ShareButton.tsx` pour inclure ces plateformes
- Mettre a jour le wizard de creation de projet

#### Partage
- LinkedIn: Utiliser l'API de partage web (https://www.linkedin.com/sharing/share-offsite/)
- TikTok: Telechargement + instruction (pas d'API web directe)

### 3. Suggestion de contenu basee sur le contexte

Creer un systeme de suggestions IA:

#### Nouveau composant `ContentSuggestions`
- Affiche 3-5 idees de posts/scripts basees sur:
  - Le contenu scrappe du site projet (markdown)
  - L'historique des posts precedents
  - Les tendances du secteur

#### Edge function `suggest-content`
- Prend en entree: `projectId`, `contentType` (video/post)
- Recupere le contexte du projet (description, markdown scrappe)
- Genere des suggestions via Gemini

```typescript
// Exemple de prompt
const systemPrompt = `Tu es un expert en creation de contenu viral.
Basé sur ce contexte de projet:
- Site: ${projectUrl}
- Description: ${projectDescription}
- Contenu du site: ${scrapedMarkdown.slice(0, 2000)}

Genere 5 idées de ${contentType === 'video' ? 'scripts video' : 'posts'} 
viraux et engageants.`;
```

### 4. Correction connexion Facebook

#### Diagnostics et corrections
1. Verifier le `META_REDIRECT_URI` dans Meta Developer Portal
2. Ajouter des logs detailles dans `meta-oauth`
3. Gerer les erreurs de token expire
4. Afficher des messages d'erreur explicites

#### Ameliorations du hook `useMetaOAuth`
- Ajouter la gestion des erreurs specifiques Meta
- Implementer le refresh token
- Verifier la validite du token avant chaque action

---

## Details techniques

### Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `src/components/ScheduledPostModal.tsx` | Pop-up detail du post |
| `src/components/ContentSuggestions.tsx` | Suggestions IA basees sur contexte |
| `supabase/functions/suggest-content/index.ts` | Edge function pour generer suggestions |

### Fichiers a modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/CalendarPage.tsx` | Ajouter onClick pour ouvrir le modal |
| `src/components/ShareButton.tsx` | Ajouter LinkedIn et TikTok |
| `src/components/SocialConnections.tsx` | Ajouter LinkedIn et TikTok |
| `src/pages/ProjectNew.tsx` | Checkboxes LinkedIn/TikTok dans wizard |
| `src/pages/Projects.tsx` | Afficher icones LinkedIn/TikTok |
| `src/hooks/useMetaOAuth.ts` | Ameliorer gestion erreurs |
| `supabase/functions/meta-oauth/index.ts` | Ajouter logs debug |

### Migration base de donnees

```sql
-- Ajouter colonnes LinkedIn et TikTok
ALTER TABLE projects 
ADD COLUMN linkedin_enabled boolean DEFAULT false,
ADD COLUMN tiktok_enabled boolean DEFAULT false;
```

### Structure du modal

```typescript
interface ScheduledPostModalProps {
  post: ScheduledPost;
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (post: ScheduledPost) => void;
  onDelete: (postId: string) => void;
  onPublishNow: (post: ScheduledPost) => void;
}
```

### Structure des suggestions

```typescript
interface ContentSuggestion {
  id: string;
  title: string;
  content: string;
  contentType: "video" | "image" | "text";
  estimatedEngagement: "high" | "medium" | "low";
  hashtags: string[];
}
```

---

## Ordre d'implementation

1. **Migration DB** - Ajouter colonnes LinkedIn/TikTok
2. **ScheduledPostModal** - Pop-up detail avec toutes les infos
3. **Calendrier** - Connecter le modal au clic sur les posts
4. **ShareButton** - Ajouter LinkedIn et TikTok
5. **SocialConnections** - Mettre a jour l'interface
6. **Wizard projet** - Ajouter les nouvelles plateformes
7. **Edge function suggest-content** - Generer des suggestions
8. **ContentSuggestions** - Afficher les suggestions dans l'UI
9. **Meta OAuth** - Corriger et ameliorer la connexion Facebook

---

## Estimation

- **Complexite**: Moyenne-elevee
- **Composants a creer**: 3 nouveaux
- **Fichiers a modifier**: 7
- **Migration DB**: 1
- **Impact utilisateur**: Eleve (nouvelles fonctionnalites cles)
