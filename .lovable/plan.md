
# Solution: FFmpeg.wasm — Création vidéo 100% dans le navigateur

## Objectif

Créer de **vrais fichiers MP4** directement dans le navigateur en combinant :
- 🖼️ Image générée
- 🎵 Musique
- ⏱️ Durée choisie

**Résultat** : Un MP4 téléchargeable et publiable sur Instagram/TikTok — sans aucun serveur externe !

---

## Comment ça marche

```text
┌─────────────────────────────────────────────────────────┐
│                    NAVIGATEUR (Browser)                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   1. Image (PNG) ─────┐                                │
│                       ├──► FFmpeg.wasm ──► MP4 file    │
│   2. Audio (MP3) ─────┘      (WebAssembly)             │
│                                                         │
│   3. Download / Upload to Supabase                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Avantages :**
- ✅ Gratuit (pas d'API payante)
- ✅ Pas de serveur (pas de Railway)
- ✅ Fichier MP4 réel
- ✅ Téléchargeable + publiable

**Inconvénients :**
- ⚠️ ~10-30 secondes de traitement (selon l'appareil)
- ⚠️ ~30MB téléchargés la première fois (cache ensuite)

---

## Implémentation

### Étape 1 : Installer ffmpeg.wasm

Ajouter les dépendances :
```bash
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

### Étape 2 : Créer un hook `useVideoComposer`

Nouveau fichier : `src/hooks/useVideoComposer.ts`

Ce hook va :
1. Charger FFmpeg.wasm (une seule fois)
2. Télécharger l'image et l'audio
3. Les combiner avec effet Ken Burns
4. Retourner un Blob MP4

### Étape 3 : Créer un composant `VideoComposerModal`

Nouveau fichier : `src/components/VideoComposerModal.tsx`

Interface utilisateur :
- Indicateur de progression (Loading FFmpeg → Downloading files → Rendering)
- Barre de progression
- Boutons : Télécharger / Upload to Cloud

### Étape 4 : Mettre à jour `ReelVideoPlayer`

Ajouter un bouton **"Create MP4"** qui :
1. Ouvre le modal de composition
2. Lance le rendu
3. Propose le téléchargement

### Étape 5 : Option upload vers Supabase

Après création du MP4 :
- Upload automatique dans `media/reels/`
- URL publique disponible

---

## Fichiers à créer/modifier

| Fichier | Action |
|---------|--------|
| `src/hooks/useVideoComposer.ts` | **Créer** — Logic FFmpeg.wasm |
| `src/components/VideoComposerModal.tsx` | **Créer** — UI composition |
| `src/components/ReelVideoPlayer.tsx` | **Modifier** — Ajouter bouton "Create MP4" |
| `package.json` | **Modifier** — Ajouter @ffmpeg/ffmpeg, @ffmpeg/util |

---

## Détails techniques

### Commande FFmpeg (Ken Burns + Audio)

```javascript
await ffmpeg.exec([
  '-loop', '1',
  '-i', 'image.png',
  '-i', 'audio.mp3',
  '-c:v', 'libx264',
  '-t', '10',           // durée
  '-pix_fmt', 'yuv420p',
  '-vf', 'scale=1080:1920,zoompan=z=min(zoom+0.0008\\,1.08):d=300:s=1080x1920',
  '-c:a', 'aac',
  '-shortest',
  '-movflags', '+faststart',
  'output.mp4'
]);
```

### Flux utilisateur

```text
User clicks "Generate Reel"
         ↓
   Image + Audio créés (actuel)
         ↓
   Preview dans ReelVideoPlayer
         ↓
   User clicks "Create MP4"
         ↓
   FFmpeg.wasm charge (~5s première fois)
         ↓
   Composition (~10-20s)
         ↓
   ✅ Download MP4 ou Upload Cloud
```

---

## Coût

| Élément | Coût |
|---------|------|
| FFmpeg.wasm | Gratuit |
| Serveur | Aucun |
| API | Aucune |
| **Total** | **0€** |

---

## Résumé

Cette solution permet de générer de **vrais fichiers MP4** directement dans le navigateur, sans aucune infrastructure externe. L'utilisateur peut ensuite télécharger la vidéo ou l'uploader dans le cloud pour la publier.
