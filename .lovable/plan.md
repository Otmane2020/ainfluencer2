
# Plan: Fix ElevenLabs Voice and Language Issues

## Problems Identified

1. **Duplicate Voice IDs for Italian and Portuguese**: The voices for Italian and Portuguese languages incorrectly reuse English voice IDs, causing the wrong voices to be used
2. **Missing Voice Header Icon in Compact Mode**: The compact VoiceSelector doesn't show the Volume2 icon header like the full mode does
3. **No Female Voices for German**: Only male voices available for German language
4. **Language/Voice Sync Issue**: The selected language state may not properly sync with the actual voice language

---

## Implementation Plan

### Step 1: Fix Voice IDs in `src/lib/voices.ts`

Replace the incorrect duplicate IDs with proper unique ElevenLabs voice IDs:

**Italian voices** (lines 65-68):
- Replace Isabella ID `EXAVITQu4vr4xnSDxMaL` with a proper Italian female voice
- Replace Marco ID `JBFqnCBsd6RMkjVDRZzb` with a proper Italian male voice

**Portuguese voices** (lines 69-72):
- Replace Ana ID `FGY2WhTYpPnrIDTdsKH5` with a proper Brazilian Portuguese female voice
- Replace Pedro ID `TX3LPaxmHKxFdv7VOQHJ` with a proper Brazilian Portuguese male voice

**German voices** - Add female voices for better gender balance

Updated voices using ElevenLabs multilingual voices:
```typescript
// Italian voices - using multilingual voices that work well with Italian
{ id: "pMsXgVXv3BLzUgSXRplE", name: "Isabella", gender: "female", language: "it", accent: "Italian" },
{ id: "IKne3meq5aSn9XLyUdCD", name: "Marco", gender: "male", language: "it", accent: "Italian" },

// Portuguese voices - using multilingual voices for Brazilian Portuguese  
{ id: "ThT5KcBeYPX3keUQqHPh", name: "Ana", gender: "female", language: "pt", accent: "Brazilian" },
{ id: "CwhRBWXzGAHq8TQ4Fs17", name: "Pedro", gender: "male", language: "pt", accent: "Brazilian" },

// German voices - add female option
{ id: "XrExE9yKIg1WjnnlVkGX", name: "Marta", gender: "female", language: "de", accent: "German" },
```

### Step 2: Add Voice Header in Compact Mode - `src/components/VoiceSelector.tsx`

Add a header section to the compact mode showing the current voice selection with the Volume2 icon:

```tsx
if (compact) {
  return (
    <div className="space-y-3">
      {/* Header for compact mode */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md gradient-primary">
          <Volume2 className="h-3 w-3 text-white" />
        </div>
        <span className="text-sm font-medium">Voice: {selectedVoice?.name || "Select"}</span>
      </div>
      
      {/* Language selector compact */}
      <Select ...>
      ...
```

### Step 3: Fix Language Sync with Voice

Update the `selectedLanguage` initialization to properly sync when the voice changes from outside:

```tsx
// Add useEffect to sync language when voice changes externally
useEffect(() => {
  if (selectedVoice?.language && selectedVoice.language !== selectedLanguage) {
    setSelectedLanguage(selectedVoice.language);
  }
}, [selectedVoice?.language]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/voices.ts` | Fix duplicate voice IDs for Italian/Portuguese, add German female voice |
| `src/components/VoiceSelector.tsx` | Add header with icon in compact mode, fix language sync |

---

## Technical Notes

- ElevenLabs `eleven_multilingual_v2` model supports all these languages with the same voice IDs - the voices are multilingual
- The key is to use distinct voice IDs so users can hear different voice characteristics per selection
- Using Sophie (French), Charlotte (French), Charlie (French), Roger (French) as bases for other languages since they sound natural in those languages too
