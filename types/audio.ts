export interface AudioConfig {
  sampleRate: number
  channels: number
  bitsPerSample: number
  audioSource: number
  bufferSize: number
}

export interface AudioStreamState {
  isRecording: boolean
  isConnected: boolean
  error: string | null
}

export const DEFAULT_AUDIO_CONFIG: AudioConfig = {
  sampleRate: 16000,
  channels: 1,
  bitsPerSample: 16,
  audioSource: 6,
  bufferSize: 4096,
}
