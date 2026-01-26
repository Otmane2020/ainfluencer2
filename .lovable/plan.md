
# Plan: Wizard de creation de projet High SaaS + Correction du bouton

## Analyse du probleme actuel

### Bug du bouton "Creer le projet"
Apres analyse du code `ProjectNew.tsx`, le formulaire semble fonctionnel mais le probleme pourrait venir de:
1. **Validation Zod trop stricte** - Le schema peut bloquer la soumission silencieusement
2. **Absence de feedback utilisateur** - Les erreurs ne sont pas toujours visibles
3. **Condition `!user`** - Si l'utilisateur n'est pas charge, le submit echoue silencieusement

### Interface actuelle
L'interface actuelle affiche toutes les sections d'un coup (5 cartes), ce qui peut etre intimidant et pas tres "High SaaS".

---

## Solution proposee

### 1. Interface Wizard multi-etapes

Transformer le formulaire en assistant de creation avec des etapes claires:

```text
+------------------------------------------+
|  [1]----[2]----[3]----[4]----[5]         |
|  Site   Info   Brand  Content  Publish   |
+------------------------------------------+
|                                          |
|     Contenu de l'etape actuelle          |
|     avec animations fluides              |
|                                          |
+------------------------------------------+
|  [Precedent]              [Suivant ->]   |
+------------------------------------------+
```

**Etapes du wizard:**
- **Etape 1 - Site web** : URL + bouton analyse Firecrawl (optionnel, peut etre saute)
- **Etape 2 - Informations** : Nom + Description du projet
- **Etape 3 - Branding** : Logo + Couleur theme
- **Etape 4 - Contenu** : Generation mensuelle (videos, images) + frequence
- **Etape 5 - Plateformes** : Instagram/Facebook + mode automatisation + recapitulatif

### 2. Corrections techniques

- Ajouter des logs de debug pour identifier les erreurs
- Verifier que `user` est bien charge avant d'afficher le formulaire
- Afficher un loading state pendant la creation
- Ameliorer les messages d'erreur avec des toasts plus explicites

### 3. Ameliorations visuelles High SaaS

- Progress bar animee entre les etapes
- Animations Framer Motion pour les transitions
- Resume/preview du projet cree a la derniere etape
- Boutons avec feedback visuel (loading states)
- Design glassmorphism coherent avec le reste de l'app

---

## Details techniques

### Fichiers a creer/modifier

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/ProjectNew.tsx` | Modifier | Refonte complete en wizard multi-etapes |
| `src/components/wizard/WizardProgress.tsx` | Creer | Barre de progression avec etapes |
| `src/components/wizard/WizardStep.tsx` | Creer | Container anime pour chaque etape |

### Structure du nouveau composant

```typescript
// Etats du wizard
const [currentStep, setCurrentStep] = useState(0);
const steps = [
  { id: 'site', title: 'Site web', icon: Globe },
  { id: 'info', title: 'Informations', icon: FileText },
  { id: 'branding', title: 'Identite', icon: Palette },
  { id: 'content', title: 'Contenu', icon: Calendar },
  { id: 'publish', title: 'Plateformes', icon: Share2 },
];

// Navigation
const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 0));
const isLastStep = currentStep === steps.length - 1;
```

### Validation par etape

Chaque etape aura sa propre validation:
- **Etape 1** : URL optionnelle (pas de validation bloquante)
- **Etape 2** : Nom requis (min 2 caracteres)
- **Etape 3** : Couleur theme (pre-selectionnee par defaut)
- **Etape 4** : Sliders avec valeurs par defaut
- **Etape 5** : Au moins une plateforme + confirmation

### Correction du bug de soumission

```typescript
const handleSubmit = async () => {
  // 1. Verification utilisateur avec message explicite
  if (!user) {
    toast({
      title: "Non connecte",
      description: "Veuillez vous reconnecter",
      variant: "destructive",
    });
    navigate("/auth");
    return;
  }

  // 2. Validation avec feedback
  try {
    projectSchema.parse(formData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      toast({
        title: "Donnees invalides",
        description: error.errors[0]?.message || "Verifiez le formulaire",
        variant: "destructive",
      });
      return;
    }
  }

  // 3. Creation avec loading state
  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from("projects")
      .insert({...})
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    toast({
      title: "Projet cree !",
      description: "Redirection vers vos projets...",
    });
    navigate("/projects");
  } catch (error) {
    console.error("Creation error:", error);
    toast({
      title: "Erreur de creation",
      description: "Impossible de creer le projet. Reessayez.",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};
```

---

## Estimation

- **Complexite** : Moyenne
- **Composants a creer** : 2 nouveaux + 1 refonte
- **Impact visuel** : Eleve (experience utilisateur amelioree)
