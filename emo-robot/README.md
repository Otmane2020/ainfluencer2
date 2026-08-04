# EMO Robot FR — publication TikTok automatique

Publie chaque jour sur [@emorobotfrancais](https://www.tiktok.com/@emorobotfrancais)
une vidéo officielle EMO doublée en français.

## Ce que fait le cycle quotidien

```
TikTok officiel @livingai
  -> vidéo la plus récente non publiée
  -> transcription de l'audio anglais       (faster-whisper)
  -> traduction en français                 (deep-translator / Claude)
  -> voix off française                     (edge-tts, fr-FR-DeniseNeural)
  -> sous-titres FR incrustés               (ffmpeg)
  -> légende française + hashtags
  -> brouillon TikTok
```

## À faire une seule fois

**1. Récupérer le token TikTok**

Ouvre <https://emo-robot-tiktok.vercel.app/dashboard>, clique « Connexion avec TikTok »,
autorise avec le compte `@emorobotfrancais`, puis colle le token dans `.env` :

```
TIKTOK_ACCESS_TOKEN=...
TIKTOK_REFRESH_TOKEN=...
```

**2. C'est tout** — la tâche planifiée `EmoRobotTikTok` tourne déjà chaque jour à 10h00.

## Commandes

```bash
python main.py            # cycle quotidien (ce que lance le cron)
python main.py check      # liste les vidéos disponibles, sans rien publier
python main.py once <url> # traite une URL précise immédiatement
```

Gérer la tâche planifiée :

```powershell
Start-ScheduledTask   -TaskName EmoRobotTikTok      # tester maintenant
Get-ScheduledTaskInfo -TaskName EmoRobotTikTok      # dernier résultat
Unregister-ScheduledTask -TaskName EmoRobotTikTok   # supprimer
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `main.py` | Point d'entrée quotidien, choisit la vidéo à publier |
| `pipeline.py` | Enchaîne les étapes et tient l'historique |
| `downloader.py` | Énumère la source et télécharge (yt-dlp) |
| `dubbing.py` | Transcription, traduction, voix off, sous-titres |
| `translator.py` | Rédige la légende française + hashtags |
| `poster.py` | Envoi vers l'API TikTok Content Posting |
| `api/` | Dashboard et OAuth hébergés sur Vercel |
| `published.json` | Historique — évite de republier deux fois |

## Limites connues

**Brouillon uniquement.** L'app TikTok est en sandbox : le scope accordé est
`video.upload`, qui dépose dans les brouillons. Tu valides la publication depuis
l'app TikTok. Pour publier directement, il faut activer « Direct Post » dans le
portail développeur et faire valider l'app par TikTok — ensuite, mettre
`POST_TO_DRAFT=false` dans `.env`.

**La page Facebook n'est pas utilisable comme source.** Facebook n'expose aucun
moyen de lire les posts d'une Page dont on n'est pas administrateur : l'API Graph
exige le rôle admin, la page renvoie HTTP 400 sans session, et yt-dlp n'a pas
d'extracteur de page (uniquement les vidéos et Reels individuels). Le compte
TikTok officiel `@livingai` diffuse le même contenu et se laisse énumérer — c'est
la source utilisée. Pour traiter malgré tout une vidéo Facebook précise :

```bash
python main.py once "https://www.facebook.com/emorobot/videos/123456789"
```

Si la vidéo est protégée, exporte tes cookies Facebook dans `cookies.txt`
à la racine du projet.
