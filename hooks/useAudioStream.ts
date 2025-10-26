// hooks/useAudioStream.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import AudioStreamService from '../services/AudioStreamService';
import type { AudioStreamState } from '../types/audio';
import type { ChatMessage, ConversationState, ServerStats, VoiceCommandEvent } from '../types/conversation';
import TTSService from '../services/TTSService';

export const useAudioStream = (serverUrl: string) => {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    isConnected: false,
    error: null,
  });

  const [transcription, setTranscription] = useState<string>('');
  const [interim, setInterim] = useState<string>('');

  const [assistantResponse, setAssistantResponse] = useState<string>('');
  const [isAssistantThinking, setIsAssistantThinking] = useState<boolean>(false);
  const currentAssistantDraft = useRef<string>(''); 

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

  const connect = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      await AudioStreamService.connect(serverUrl);

      const socket = AudioStreamService.getSocket();
      if (!socket) throw new Error('Socket no disponible tras conectar');

      // TRANSCRIPCIÓN
      socket.on('transcription', (data: { text: string; isFinal: boolean; confidence?: number }) => {
        if (!isMountedRef.current) return;

        if (data.isFinal) {
          setTranscription(prev => (prev ? `${prev} ${data.text}` : data.text));
          setInterim('');
          const msg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: data.text, ts: Date.now() };
          setChat(prev => [...prev, msg]);
        } else {
          setInterim(data.text);
        }
      });

      // ESTADO IA
      socket.on('assistant_status', (data: { status: 'thinking' | 'idle' | string }) => {
        if (!isMountedRef.current) return;
        if (data.status === 'thinking') {
          setIsAssistantThinking(true);
          // Fase 1: si IA comienza a pensar, aseguramos cortar cualquier TTS previo
          TTSService.stop().catch(() => {});
          setAssistantResponse('Pensando...');
          currentAssistantDraft.current = '';
        } else if (data.status === 'idle') {
          setIsAssistantThinking(false);
        }
      });

      // STREAM IA (delta)
      socket.on('assistant_text', (data: { delta: string }) => {
        if (!isMountedRef.current) return;
        setIsAssistantThinking(false);
        setAssistantResponse(prev => (prev === 'Pensando...' ? data.delta : prev + data.delta));
        currentAssistantDraft.current += data.delta;
      });

      // FIN IA (texto final)
      socket.on('assistant_text_done', async (data: { text: string }) => {
        if (!isMountedRef.current) return;
        setIsAssistantThinking(false);

        const finalText = (data.text || currentAssistantDraft.current || '').trim();
        setAssistantResponse(finalText);

        if (finalText) {
          const msg: ChatMessage = { id: `a_${Date.now()}`, role: 'assistant', content: finalText, ts: Date.now() };
          setChat(prev => [...prev, msg]);
        }
        currentAssistantDraft.current = '';

        // Fase 1: TTS automático si está habilitado
        try {
          const { autoSpeak } = TTSService.getOptions();
          if (autoSpeak && finalText) {
            await TTSService.speak(finalText);
          }
        } catch {}
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
        if (data.conversationState) setConversation(data.conversationState);
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
        if (data.conversationState) setConversation(data.conversationState as ConversationState);
      });

      socket.on('disconnect', () => {
        if (!isMountedRef.current) return;
        setState(prev => ({ ...prev, isConnected: false, isRecording: false }));
        setIsAssistantThinking(false);
        // Por si estaba hablando, paramos TTS
        TTSService.stop().catch(() => {});
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
      TTSService.stop().catch(() => {});
    }
  }, []);

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

      // Fase 1: evitar acople, detener TTS antes de grabar
      await TTSService.stop();

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

  const askAssistant = useCallback(() => {
    const socket = AudioStreamService.getSocket();
    if (!socket || !AudioStreamService.isConnected()) return;

    if (state.isRecording) {
      AudioStreamService.stopStreaming();
      setState(prev => ({ ...prev, isRecording: false }));
      setTimeout(() => {
        socket.emit('get_final_transcription');
      }, 150);
    } else {
      socket.emit('get_final_transcription');
    }
  }, [state.isRecording]);

  const resetAssistantConversation = useCallback(() => {
    AudioStreamService.resetConversation();
    setAssistantResponse('');
    setIsAssistantThinking(false);
    currentAssistantDraft.current = '';
    setConversation({ active: false, messageCount: 0, duration: 0, hasHistory: false });
  }, []);

  const refreshConversationState = useCallback(async () => {
    try {
      const serverState = await AudioStreamService.getConversationState();
      if (isMountedRef.current && serverState) {
        setConversation(serverState);
      }
      return serverState;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      try { AudioStreamService.stopStreaming(); } catch {}
      AudioStreamService.disconnect();
      TTSService.stop().catch(() => {});
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    startRecording,
    stopRecording,

    transcription,
    interim,
    clearTranscription,

    assistantResponse,
    isAssistantThinking,
    askAssistant,
    clearAssistantResponse,
    resetAssistantConversation,

    chat,
    clearChat,
    conversation,
    refreshConversationState,
    lastVoiceCommand,

    serverStats,
  };
};
