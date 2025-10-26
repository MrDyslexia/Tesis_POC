// types/tts.ts
export type TTSStatus = 'idle' | 'speaking' | 'stopped' | 'error';

export interface TTSOptions {
  voiceId?: string;   // id de la voz nativa (si se fuerza)
  rate?: number;      // 0.0 - 1.0 aprox (RN-TTS normaliza internamente)
  pitch?: number;     // 0.5 - 2.0
  autoSpeak?: boolean;
  // Nota: el idioma preferido se resuelve internamente a voces es-*
}

export interface TTSVoice {
  id: string;
  name?: string;
  language?: string;  // ej: 'es-CL', 'es-ES', 'es-US', etc.
}

export interface TTSState extends TTSOptions {
  status: TTSStatus;
  lastText?: string;
  availableVoices: TTSVoice[];
  error?: string | null;
}
