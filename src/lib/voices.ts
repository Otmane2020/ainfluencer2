// ============================================================
// AI VOICE CONFIGURATION
// Centralized voice definitions for ElevenLabs TTS
// ============================================================

export type VoiceLanguage = "en" | "fr" | "es" | "de" | "it" | "pt";

export interface Voice {
  id: string;
  name: string;
  gender: "female" | "male";
  language: VoiceLanguage;
  accent?: string;
  preview?: string;
}

export interface Language {
  code: VoiceLanguage;
  name: string;
  flag: string;
}

// Available languages
export const AVAILABLE_LANGUAGES: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇧🇷" },
];

// Premium ElevenLabs voices - multilingual model supports all languages
export const AVAILABLE_VOICES: Voice[] = [
  // English Female voices
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", language: "en", accent: "American" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female", language: "en", accent: "American" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female", language: "en", accent: "British" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "female", language: "en", accent: "American" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female", language: "en", accent: "Australian" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "female", language: "en", accent: "British" },
  
  // English Male voices
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male", language: "en", accent: "British" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male", language: "en", accent: "American" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "male", language: "en", accent: "American" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "male", language: "en", accent: "American" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male", language: "en", accent: "British" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", gender: "male", language: "en", accent: "Scottish" },

  // French voices
  { id: "pMsXgVXv3BLzUgSXRplE", name: "Sophie", gender: "female", language: "fr", accent: "French" },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Charlotte", gender: "female", language: "fr", accent: "French" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male", language: "fr", accent: "French" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", gender: "male", language: "fr", accent: "French" },

  // Spanish voices
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", gender: "female", language: "es", accent: "Spanish" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", gender: "male", language: "es", accent: "Spanish" },

  // German voices
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", gender: "male", language: "de", accent: "German" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", gender: "male", language: "de", accent: "German" },

  // Italian voices
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Isabella", gender: "female", language: "it", accent: "Italian" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "Marco", gender: "male", language: "it", accent: "Italian" },

  // Portuguese voices
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Ana", gender: "female", language: "pt", accent: "Brazilian" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Pedro", gender: "male", language: "pt", accent: "Brazilian" },
];

// Get voices by language
export const getVoicesByLanguage = (language: VoiceLanguage): Voice[] => {
  return AVAILABLE_VOICES.filter((v) => v.language === language);
};

// Get voices by gender
export const getVoicesByGender = (gender: "female" | "male"): Voice[] => {
  return AVAILABLE_VOICES.filter((v) => v.gender === gender);
};

// Get voices by language and gender
export const getVoicesByLanguageAndGender = (language: VoiceLanguage, gender: "female" | "male"): Voice[] => {
  return AVAILABLE_VOICES.filter((v) => v.language === language && v.gender === gender);
};

// Get default voice for a language
export const getDefaultVoiceForLanguage = (language: VoiceLanguage): Voice => {
  const voices = getVoicesByLanguage(language);
  return voices[0] || AVAILABLE_VOICES[0];
};

// Get default voice
export const getDefaultVoice = (): Voice => {
  return AVAILABLE_VOICES[0]; // Sarah
};

// Get voice by ID
export const getVoiceById = (id: string): Voice | undefined => {
  return AVAILABLE_VOICES.find((v) => v.id === id);
};

// Get language by code
export const getLanguageByCode = (code: VoiceLanguage): Language | undefined => {
  return AVAILABLE_LANGUAGES.find((l) => l.code === code);
};
