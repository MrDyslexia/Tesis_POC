// hooks/useAudioStream.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import AudioStreamService from '../services/AudioStreamService';
import type { AudioStreamState } from '../types/audio';

/** ===== Tipos locales (luego podemos moverlos a types/conversation.ts) ===== */
type ChatRole = 'user' | 'assistant';
export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
};

export type ConversationState = {
  active: boolean;
  messageCount: number;
  duration: number;
  hasHistory: boolean;
};

export type ServerStats = {
  activeConnections: number;
  chunksReceived: number;
  duration: number; // ms
  totalTranscriptions: number;
  voskReady?: boolean;
  isRecording?: boolean;
};

export type VoiceCommandEvent = {
  action: 'start_conversation' | 'stop_conversation' | 'reset_conversation' | 'continue_conversation' | string;
  command?: string;
  text?: string;
  ts: number;
  conversationState?: ConversationState;
};

/** ===== Hook principal ===== */
export const useAudioStream = (serverUrl: string) => {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    isConnected: false,
    error: null,
  });

  const [transcription, setTranscription] = useState<string>('');
  const [interim, setInterim] = useState<string>(''); // parcial

  // IA streaming
  const [assistantResponse, setAssistantResponse] = useState<string>('');
  const [isAssistantThinking, setIsAssistantThinking] = useState<boolean>(false);

  // Conversación y stats
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [conversation, setConversation] = useState<ConversationState>({
    active: false,
    messageCount: 0,
    duration: 0,
    hasHistory: false,
  });
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [lastVoiceCommand, setLastVoiceCommand] = useState<VoiceCommandEvent | null>(null);

  const isMountedRef = useRef(true);
  const currentAssistantDraft = useRef<string>(''); // buffer hasta assistant_text_done

  /** ===== Permisos ===== */
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de Micrófono',
            message: 'Esta app necesita acceso al micrófono para grabar audio',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (err) {
      console.error('Error al solicitar permisos:', err);
      return false;
    }
  };

  /** ===== Conexión ===== */
  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await AudioStreamService.connect(serverUrl);

      const socket = AudioStreamService.getSocket();
      if (!socket) throw new Error('Socket no disponible tras conectar');

      // --- Eventos del servidor ---
      socket.on('transcription', (data: { text: string; isFinal: boolean; confidence?: number }) => {
        if (!isMountedRef.current) return;

        if (data.isFinal) {
          // acumular al texto final
          setTranscription(prev => (prev ? `${prev} ${data.text}` : data.text));
          setInterim('');

          // agregar al chat como turno de usuario
          const msg: ChatMessage = {
            id: `u_${Date.now()}`,
            role: 'user',
            content: data.text,
            ts: Date.now(),
          };
          setChat(prev => [...prev, msg]);
        } else {
          // parcial (interim)
          setInterim(data.text);
        }
      });

      socket.on('assistant_status', (data: { status: 'thinking' | 'idle' | string }) => {
        if (!isMountedRef.current) return;
        if (data.status === 'thinking') {
          setIsAssistantThinking(true);
          setAssistantResponse('Pensando...');
          currentAssistantDraft.current = '';
        } else if (data.status === 'idle') {
          setIsAssistantThinking(false);
        }
      });

      socket.on('assistant_text', (data: { delta: string }) => {
        if (!isMountedRef.current) return;
        setIsAssistantThinking(false);

        // limpiar placeholder "Pensando..." al primer delta
        setAssistantResponse(prev => (prev === 'Pensando...' ? data.delta : prev + data.delta));

        // mantener un buffer para luego consolidar un turno en chat
        currentAssistantDraft.current += data.delta;
      });

      socket.on('assistant_text_done', (data: { text: string }) => {
        if (!isMountedRef.current) return;
        setIsAssistantThinking(false);
        setAssistantResponse(data.text || currentAssistantDraft.current);

        const finalText = data.text || currentAssistantDraft.current || '';
        if (finalText.trim()) {
          const msg: ChatMessage = {
            id: `a_${Date.now()}`,
            role: 'assistant',
            content: finalText,
            ts: Date.now(),
          };
          setChat(prev => [...prev, msg]);
        }
        currentAssistantDraft.current = '';
      });

      socket.on('assistant_error', (data: { error: string }) => {
        if (!isMountedRef.current) return;
        setIsAssistantThinking(false);
        setState(prev => ({ ...prev, error: `IA: ${data.error}` }));
      });

      socket.on('voice_command_detected', (data: { action: string; command?: string; text?: string; conversationState?: ConversationState }) => {
        if (!isMountedRef.current) return;
        const evt: VoiceCommandEvent = {
          action: (data.action || '') as VoiceCommandEvent['action'],
          command: data.command,
          text: data.text,
          ts: Date.now(),
          conversationState: data.conversationState,
        };
        setLastVoiceCommand(evt);

        // reflejar en nuestro estado conversacional si viene incluido
        if (data.conversationState) {
          setConversation(data.conversationState);
        }
      });

      socket.on('server_stats', (data: any) => {
        if (!isMountedRef.current) return;
        const stats: ServerStats = {
          activeConnections: Number(data.activeConnections ?? 0),
          chunksReceived: Number(data.chunksReceived ?? 0),
          duration: Number(data.duration ?? 0),
          totalTranscriptions: Number(data.totalTranscriptions ?? 0),
          voskReady: Boolean(data.voskReady),
          isRecording: Boolean(data.isRecording),
        };
        setServerStats(stats);

        // también suele venir el estado de conversación
        if (data.conversationState) {
          setConversation(data.conversationState as ConversationState);
        }
      });

      socket.on('disconnect', () => {
        if (!isMountedRef.current) return;
        setState(prev => ({ ...prev, isConnected: false, isRecording: false }));
        setIsAssistantThinking(false);
      });

      setState(prev => ({ ...prev, isConnected: true }));
    } catch (error) {
      console.error('[useAudioStream] Error conectando:', error);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Error al conectar',
          isConnected: false,
        }));
      }
    }
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    AudioStreamService.disconnect();
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isConnected: false, isRecording: false }));
      setInterim('');
      setAssistantResponse('');
      setIsAssistantThinking(false);
    }
  }, []);

  /** ===== Grabación ===== */
  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setState(prev => ({ ...prev, error: 'Permiso de micrófono denegado' }));
        return;
      }
      if (!AudioStreamService.isConnected()) {
        setState(prev => ({ ...prev, error: 'No hay conexión con el servidor' }));
        return;
      }

      await AudioStreamService.startStreaming();
      if (isMountedRef.current) {
        setState(prev => ({ ...prev, isRecording: true, error: null }));
      }
    } catch (error) {
      console.error('[useAudioStream] Error al iniciar grabación:', error);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Error al iniciar grabación',
          isRecording: false,
        }));
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    AudioStreamService.stopStreaming();
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, isRecording: false }));
    }
  }, []);

  /** ===== Limpiezas ===== */
  const clearTranscription = useCallback(() => {
    setTranscription('');
    setInterim('');
  }, []);

  const clearAssistantResponse = useCallback(() => {
    setAssistantResponse('');
    setIsAssistantThinking(false);
    currentAssistantDraft.current = '';
  }, []);

  const clearChat = useCallback(() => {
    setChat([]);
  }, []);

  /** ===== IA / Conversación ===== */
  const askAssistant = useCallback(() => {
    const socket = AudioStreamService.getSocket();
    if (socket && AudioStreamService.isConnected()) {
      socket.emit('get_final_transcription');
    }
  }, []);

  const resetAssistantConversation = useCallback(() => {
    AudioStreamService.resetConversation();
    // limpiamos UI local (no transcripción)
    setAssistantResponse('');
    setIsAssistantThinking(false);
    currentAssistantDraft.current = '';
    setConversation({
      active: false,
      messageCount: 0,
      duration: 0,
      hasHistory: false,
    });
  }, []);

  const refreshConversationState = useCallback(async () => {
    try {
      const serverState = await AudioStreamService.getConversationState();
      if (isMountedRef.current) {
        setConversation(serverState);
      }
      return serverState;
    } catch (e) {
      // silencioso si falla
      return null;
    }
  }, []);

  /** ===== Ciclo de vida ===== */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      try {
        AudioStreamService.stopStreaming();
      } catch {}
      AudioStreamService.disconnect();
    };
  }, []);

  return {
    // conexión / grabación
    ...state,
    connect,
    disconnect,
    startRecording,
    stopRecording,

    // transcripción
    transcription,
    interim,
    clearTranscription,

    // IA
    assistantResponse,
    isAssistantThinking,
    askAssistant,
    clearAssistantResponse,
    resetAssistantConversation,

    // conversación y UI de chat
    chat,
    clearChat,
    conversation,
    refreshConversationState,
    lastVoiceCommand,

    // stats
    serverStats,
  };
};
