
## Problème identifié : Double déclaration qui casse tout le cron

Le log d'erreur est sans appel :
```
SyntaxError: Identifier 'uploadBase64ToStorage' has already been declared at line 162
```

Lors de la correction précédente, j'ai ajouté `uploadBase64ToStorage` en haut du fichier (ligne 17), mais cette fonction **existait déjà** dans le fichier original (ligne 207). Le runtime Deno refuse de charger le fichier avec une déclaration dupliquée, ce qui fait que **le cron ne démarre pas du tout** depuis la dernière modification.

Résultat : tous les posts programmés depuis cette heure-là (y compris LovelyAnswers à 16h45) n'ont pas été publiés.

---

## Plan de correction

### Étape 1 : Supprimer la déclaration dupliquée (lignes 14-52)
Retirer le bloc `uploadBase64ToStorage` ajouté en haut du fichier (lignes 14-52), puisque la version originale existe déjà plus bas (ligne 207).

### Étape 2 : Vérifier la version originale (ligne 207)
La version originale fait la même chose mais avec un code plus simple. Elle sera conservée et utilisée pour le bloc de conversion base64 ajouté avant la boucle de publication (~ligne 1400).

### Étape 3 : Redéployer immédiatement
Déployer la fonction corrigée pour que le cron reprenne son fonctionnement normal au prochain tick (chaque minute).

### Étape 4 : Reprogrammer le post LovelyAnswers manqué
Après le déploiement, le post manqué de 16h45 devra être reprogrammé ou publié manuellement, car il a déjà été marqué "failed" ou est resté "scheduled" sans être traité.

---

## Détail technique

**Fichier à modifier :** `supabase/functions/run-campaigns-cron/index.ts`

**Action :** Supprimer les lignes 14 à 52 (le bloc `uploadBase64ToStorage` dupliqué).

La version existante à la ligne ~207 fonctionne correctement et sera utilisée par tous les appels existants + le nouveau bloc de conversion base64 avant publication.

**Impact immédiat :** Après redéploiement, le cron rebootera sans erreur et recommencera à publier les posts à l'heure prévue.
