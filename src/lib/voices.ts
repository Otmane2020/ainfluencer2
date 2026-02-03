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
  // ============================================================
  // ENGLISH VOICES
  // ============================================================
  
  // English Female - Standard
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", language: "en", accent: "American" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female", language: "en", accent: "American" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female", language: "en", accent: "British" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "female", language: "en", accent: "American" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female", language: "en", accent: "Australian" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "female", language: "en", accent: "British" },
  
  // English Female - Advertising / Commercial
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female", language: "en", accent: "American Commercial" },
  { id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", gender: "female", language: "en", accent: "American Ad" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", gender: "female", language: "en", accent: "American Ad" },
  { id: "jsCqWAovK2LkecY7zXl4", name: "Freya", gender: "female", language: "en", accent: "American Commercial" },
  
  // English Male - Standard
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male", language: "en", accent: "British" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male", language: "en", accent: "American" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "male", language: "en", accent: "American" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "male", language: "en", accent: "American" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male", language: "en", accent: "British" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", gender: "male", language: "en", accent: "Scottish" },
  
  // English Male - Advertising / Commercial
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", gender: "male", language: "en", accent: "American Ad" },
  { id: "VR6AewLTigWG4xSOukaG", name: "Arnold", gender: "male", language: "en", accent: "American Commercial" },
  { id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", gender: "male", language: "en", accent: "American Ad" },
  { id: "ZQe5CZNOzWyzPSCn5a3c", name: "James", gender: "male", language: "en", accent: "Australian Commercial" },

  // ============================================================
  // FRENCH VOICES
  // ============================================================
  
  // French Female - Standard
  { id: "pMsXgVXv3BLzUgSXRplE", name: "Sophie", gender: "female", language: "fr", accent: "French" },
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Charlotte", gender: "female", language: "fr", accent: "French" },
  
  // French Female - Advertising / Commercial
  { id: "jBpfuIE2acCO8z3wKNLl", name: "Gigi", gender: "female", language: "fr", accent: "French Commercial" },
  { id: "oWAxZDx7w5VEj9dCyTzz", name: "Grace", gender: "female", language: "fr", accent: "French Ad" },
  { id: "z9fAnlkpzviPz146aGWa", name: "Glinda", gender: "female", language: "fr", accent: "French Commercial" },
  
  // French Male - Standard
  { id: "IKne3meq5aSn9XLyUdCD", name: "Charlie", gender: "male", language: "fr", accent: "French" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Roger", gender: "male", language: "fr", accent: "French" },
  
  // French Male - Advertising / Commercial
  { id: "ODq5zmih8GrVes37Dizd", name: "Patrick", gender: "male", language: "fr", accent: "French Commercial" },
  { id: "g5CIjZEefAph4nQFvHAz", name: "Ethan", gender: "male", language: "fr", accent: "French Ad" },
  { id: "SOYHLrjzK2X1ezoPC6cr", name: "Harry", gender: "male", language: "fr", accent: "French Commercial" },

  // ============================================================
  // SPANISH VOICES
  // ============================================================
  { id: "SAz9YHcvj6GT2YYXdXww", name: "River", gender: "female", language: "es", accent: "Spanish" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", gender: "male", language: "es", accent: "Spanish" },

  // ============================================================
  // GERMAN VOICES
  // ============================================================
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Marta", gender: "female", language: "de", accent: "German" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", gender: "male", language: "de", accent: "German" },
  { id: "pqHfZKP75CvOlQylNhV4", name: "Bill", gender: "male", language: "de", accent: "German" },

  // ============================================================
  // ITALIAN VOICES
  // ============================================================
  { id: "pMsXgVXv3BLzUgSXRplE", name: "Isabella", gender: "female", language: "it", accent: "Italian" },
  { id: "IKne3meq5aSn9XLyUdCD", name: "Marco", gender: "male", language: "it", accent: "Italian" },

  // ============================================================
  // PORTUGUESE VOICES
  // ============================================================
  { id: "ThT5KcBeYPX3keUQqHPh", name: "Ana", gender: "female", language: "pt", accent: "Brazilian" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", name: "Pedro", gender: "male", language: "pt", accent: "Brazilian" },
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
