// Audio bank for Image-to-Reel conversion
// These are royalty-free 30-second background tracks

export interface AudioTrack {
  id: string;
  name: string;
  category: "upbeat" | "chill" | "dramatic" | "corporate" | "inspiring";
  duration: number; // in seconds
  url: string;
}

// Using free audio from common sources
// In production, these would be stored in Supabase Storage
export const AUDIO_TRACKS: AudioTrack[] = [
  {
    id: "upbeat-1",
    name: "Energetic Pop",
    category: "upbeat",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
  },
  {
    id: "upbeat-2",
    name: "Happy Vibes",
    category: "upbeat",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3",
  },
  {
    id: "chill-1",
    name: "Lofi Beats",
    category: "chill",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3",
  },
  {
    id: "chill-2",
    name: "Ambient Flow",
    category: "chill",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3",
  },
  {
    id: "dramatic-1",
    name: "Cinematic Rise",
    category: "dramatic",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3",
  },
  {
    id: "dramatic-2",
    name: "Epic Trailer",
    category: "dramatic",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-epic-orchestra-transition-2290.mp3",
  },
  {
    id: "corporate-1",
    name: "Business Motion",
    category: "corporate",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
  },
  {
    id: "corporate-2",
    name: "Professional Touch",
    category: "corporate",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-a-very-happy-christmas-897.mp3",
  },
  {
    id: "inspiring-1",
    name: "Motivational Wave",
    category: "inspiring",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-spirit-of-the-explorer-723.mp3",
  },
  {
    id: "inspiring-2",
    name: "Sunrise Journey",
    category: "inspiring",
    duration: 30,
    url: "https://assets.mixkit.co/music/preview/mixkit-life-is-a-dream-837.mp3",
  },
];

export function getRandomTrack(category?: string): AudioTrack {
  const filtered = category 
    ? AUDIO_TRACKS.filter(t => t.category === category)
    : AUDIO_TRACKS;
  
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex] || AUDIO_TRACKS[0];
}

export function getTracksByCategory(category: string): AudioTrack[] {
  return AUDIO_TRACKS.filter(t => t.category === category);
}

export const AUDIO_CATEGORIES = [
  { id: "upbeat", label: "Upbeat & Energetic", emoji: "🎉" },
  { id: "chill", label: "Chill & Relaxed", emoji: "😌" },
  { id: "dramatic", label: "Dramatic & Cinematic", emoji: "🎬" },
  { id: "corporate", label: "Corporate & Professional", emoji: "💼" },
  { id: "inspiring", label: "Inspiring & Motivational", emoji: "✨" },
];
