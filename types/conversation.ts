// types/conversation.ts

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: number; // epoch ms
}

export interface ConversationState {
  active: boolean;
  messageCount: number;
  duration: number; // ms desde inicio de conversación
  hasHistory: boolean;
}

export interface ServerStats {
  activeConnections: number;
  chunksReceived: number;
  duration: number; // ms desde primer chunk
  totalTranscriptions: number;
  voskReady?: boolean;
  isRecording?: boolean;
}

export interface VoiceCommandEvent {
  action:
    | 'start_conversation'
    | 'stop_conversation'
    | 'reset_conversation'
    | 'continue_conversation'
    | string;
  command?: string;
  text?: string;
  ts: number;
  conversationState?: ConversationState;
}
