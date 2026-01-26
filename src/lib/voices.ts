// ============================================================
// AI VOICE CONFIGURATION
// Centralized voice definitions for ElevenLabs TTS
// ============================================================

export interface Voice {
  id: string;
  name: string;
  gender: "female" | "male";
  accent?: string;
  preview?: string;
}

// Premium ElevenLabs voices
export const AVAILABLE_VOICES: Voice[] = [
  // Female voices
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", gender: "female", accent: "American" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", gender: "female", accent: "American" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", gender: "female", accent: "British" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", gender: "female", accent: "American" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", gender: "female", accent: "Australian" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", gender: "female", accent: "British" },
  
  // Male voices
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", gender: "male", accent: "British" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", gender: "male", accent: "American" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", gender: "male", accent: "American" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", gender: "male", accent: "American" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", gender: "male", accent: "British" },
  { id: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", gender: "male", accent: "Scottish" },
];

// Get voices by gender
export const getVoicesByGender = (gender: "female" | "male"): Voice[] => {
  return AVAILABLE_VOICES.filter((v) => v.gender === gender);
};

// Get default voice
export const getDefaultVoice = (): Voice => {
  return AVAILABLE_VOICES[0]; // Sarah
};

// Get voice by ID
export const getVoiceById = (id: string): Voice | undefined => {
  return AVAILABLE_VOICES.find((v) => v.id === id);
};
