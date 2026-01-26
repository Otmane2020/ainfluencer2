

# Plan de correction : Barre de progression vidéo

## Contexte du bug

L'API CometAPI retourne bien une progression (20% visible dans les logs), mais la barre de progression reste à 0% dans l'interface. 

## Causes identifiées

1. **Closure stale** : Le polling utilise `segmentsWithTasks` capturé au moment de la création de l'intervalle, au lieu d'utiliser une référence mise à jour
2. **Pas de polling initial** : Le premier appel de status ne se fait qu'après le délai du `setInterval`
3. **Affichage "In queue"** : Quand le status est `queued`, le texte affiche "In queue..." même si progress > 0

## Modifications prévues

### 1. VideoGenerator.tsx - Refactoriser le polling

- Utiliser `useRef` pour maintenir une référence aux segments actifs
- Ajouter un appel de status immédiat avant le setInterval
- S'assurer que les mises à jour d'état sont correctement propagées aux `generationTasks`

### 2. GenerationProgressModal.tsx - Améliorer l'affichage

- Afficher la progression même quand le status est `queued` (car l'API retourne progress même en file d'attente)
- Changer le texte de "In queue..." vers "In queue... X%" pour montrer la vraie progression

### 3. Edge function - Vérification du parsing

- S'assurer que le progress string "20%" est correctement parsé en nombre 20

## Détails techniques

```text
Flux actuel (bugué) :
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  API Call   │────▶│ segmentsWithTasks │────▶│   Modal     │
│  (status)   │     │  (closure figée)  │     │ progress=0  │
└─────────────┘     └──────────────────┘     └─────────────┘

Flux corrigé :
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  API Call   │────▶│   segmentsRef    │────▶│   Modal     │
│  (status)   │     │  (useRef actuel) │     │ progress=20 │
└─────────────┘     └──────────────────┘     └─────────────┘
```

## Fichiers à modifier

| Fichier | Changement |
|---------|------------|
| `src/components/VideoGenerator.tsx` | Refactoriser le polling avec useRef, ajouter polling initial immédiat |
| `src/components/GenerationProgressModal.tsx` | Afficher progression même en status "queued" |

## Résultat attendu

- La barre de progression se met à jour en temps réel (toutes les 10 secondes)
- L'utilisateur voit la progression passer de 0% → 20% → 50% → 100%
- Le modal affiche correctement le statut même en file d'attente

