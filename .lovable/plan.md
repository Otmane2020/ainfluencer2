

## Professional Icon & Emoji Overhaul

Based on my analysis, I've identified several areas where the UI uses childish or unprofessional elements that should be replaced for a professional SaaS application.

---

### Issues Identified

**1. Emoji Usage in UI (Unprofessional)**
Found in 17+ files:
- `👋` in Dashboard welcome message
- `🚀` in campaign launch toasts
- `🎉` in success notifications
- `🎬` `🖼️` `🎵` `👤` category labels in ModelSelector
- `✨` `💡` `😕` `📅` in progress modals
- `🔥` implied decorative usage

**2. Icons That Can Feel "Playful"**
- `Sparkles` - Used extensively (14+ locations) - can feel too playful
- `Rocket` - Used for launch buttons
- `Crown` and `Star` - Used for tier badges
- `Zap` - Used for Pro plan icon

**3. French Text Remnants**
- ModelSelector category labels still in French with emojis
- Some toast messages mixing languages

---

### Professional Replacements

#### Emoji → Clean Text or Icons

| Current | Replacement | Files |
|---------|-------------|-------|
| `👋` in "Hello, Creator 👋" | Remove emoji entirely | Dashboard.tsx, Index.tsx |
| `🚀` in toasts | Remove or use text "Launch" | CampaignSuggestions.tsx, CampaignDetailModal.tsx |
| `🎉` in toasts | Remove emoji | ProjectNew.tsx, CalendarPage.tsx |
| `🎬 Vidéos` | "Videos" (no emoji) | ModelSelector.tsx |
| `👤 Avatars Parlants` | "AI Avatars" | ModelSelector.tsx |
| `🖼️ Images` | "Images" (no emoji) | ModelSelector.tsx |
| `🎵 Audio & Voix` | "Audio & Voice" | ModelSelector.tsx |
| `✨` in progress messages | Clean text only | CampaignProgressModal.tsx |
| `💡` tips | Use `Lightbulb` icon | AvatarManager.tsx, ScheduledPostModal.tsx |
| `🎤` voice indicator | Use `Mic` icon | ProductSelector.tsx |
| `😕` error message | Remove | CampaignProgressModal.tsx |

#### Icon Refinements

| Current Icon | Context | Replacement | Reason |
|--------------|---------|-------------|--------|
| `Sparkles` | AI features, CTA buttons | `Wand2` or `BrainCircuit` | More professional AI indicator |
| `Rocket` | Launch buttons | `Play` or `ArrowRight` | More subtle, enterprise feel |
| `Crown` | Cinema tier | `Award` or `Diamond` | More sophisticated |
| `Zap` | Pro plan | `Bolt` or `TrendingUp` | Less cartoonish |

---

### Files to Modify

1. **`src/pages/Dashboard.tsx`**
   - Line 154: Remove `👋` from welcome message

2. **`src/pages/Index.tsx`**
   - Line 204: Remove `👋` from welcome message

3. **`src/components/ModelSelector.tsx`**
   - Lines 360-364: Replace emoji category labels with clean English text

4. **`src/components/ProductSelector.tsx`**
   - Line 178: Replace `🎤` with `Mic` icon component

5. **`src/components/PricingPacks.tsx`**
   - Replace `Sparkles` with `Wand2` for Starter plan icon
   - Keep `Zap` but could replace with `TrendingUp`

6. **`src/components/campaigns/CampaignSuggestions.tsx`**
   - Line 157: Remove `🚀` from toast
   - Line 268: Replace `Rocket` icon with `Play` or `Send`

7. **`src/components/campaigns/CampaignProgressModal.tsx`**
   - Lines 28-31: Remove all emojis from status messages
   - Line 170: Replace `💡` with `Lightbulb` icon

8. **`src/components/campaigns/CampaignDetailModal.tsx`**
   - Line 143: Remove `🚀` from toast

9. **`src/pages/CampaignsPage.tsx`**
   - Line 109: Remove `🚀` from toast

10. **`src/pages/ProjectNew.tsx`**
    - Line 413: Remove `🎉` from toast

11. **`src/pages/CalendarPage.tsx`**
    - Line 251: Remove `🎉` from toast

12. **`src/components/AvatarManager.tsx`**
    - Line 225: Replace `💡` with proper Lucide icon

13. **`src/components/ScheduledPostModal.tsx`**
    - Line 1033: Replace `💡` with proper Lucide icon

14. **`src/components/VideoGenerator.tsx`**
    - Lines 399, 415, 776, 800: Remove emojis from prompts and toasts

15. **`src/pages/VideoHistoryPage.tsx`**
    - Lines 101, 147: Remove `🎬` from toasts

16. **`src/pages/LandingPage.tsx`**
    - Replace `Sparkles` with `Wand2` for AI badge
    - Replace `Zap` feature icon with `Bolt` or similar

17. **`src/pages/FeaturesPage.tsx`**
    - Line 173: Replace `Sparkles` with `Wand2`

18. **`src/components/campaigns/CampaignWizardModal.tsx`**
    - Line 289: Replace `Sparkles` with `Wand2`

---

### Summary of Changes

| Change Type | Count |
|-------------|-------|
| Emoji removals | ~25 instances |
| Emoji → Icon replacements | ~8 instances |
| Icon replacements (Sparkles → Wand2) | ~15 instances |
| Icon replacements (Rocket → Play/Send) | ~3 instances |
| French → English labels | 4 category labels |

---

### Technical Notes

- All replacements use existing Lucide React icons (no new dependencies)
- `Wand2` is available in lucide-react and looks more professional for AI features
- `BrainCircuit` is another option for AI but may be too technical
- The `Lightbulb` icon is already imported in some files, just need to use it instead of emoji

