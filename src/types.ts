export interface VocabularyItem {
  id: number;
  word: string;
  article: string;
  meaning: string;
  example_de: string;
  example_vi: string;
  level: string;
  category: string;
  favorite: boolean;
  review_count: number;
  created_at: string;
}

export interface AppSettings {
  interval_minutes: number;
  delay_before_translation: number;
  voice_de: string;
  voice_vi: string;
  volume: number;
  speech_rate?: number;
  random_mode: boolean;
  playback_mode: string;
  prefer_cloud_tts?: boolean;
}
