// services/AudioStreamService.ts
import LiveAudioStream from 'react-native-live-audio-stream';
import { io, type Socket } from 'socket.io-client';
import { type AudioConfig, DEFAULT_AUDIO_CONFIG } from '../types/audio';
import type { ConversationState } from '../types/conversation';

class AudioStreamService {
  private socket: Socket | null = null;
  private isStreaming = false;
  private config: AudioConfig = DEFAULT_AUDIO_CONFIG;

  connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.socket) {
          this.socket.removeAllListeners();
          this.socket.disconnect();
          this.socket = null;
        }

        this.socket = io(serverUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          timeout: 20000,
          forceNew: true,
          autoConnect: true,
        });

        this.socket.on('connect', () => {
          resolve();
        });

        this.socket.on('disconnect', () => {
          this.isStreaming = false;
        });

        this.socket.on('connect_error', (error) => {
          reject(new Error(`Error de conexión: ${error.message}`));
        });

        // Safety timeout si nunca conecta
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            const error = new Error('Timeout: No se pudo conectar al servidor');
            this.socket.disconnect();
            reject(error);
          }
        }, 20000);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  disconnect(): void {
    if (this.isStreaming) this.stopStreaming();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  setAudioConfig(config: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async startStreaming(): Promise<void> {
    if (this.isStreaming) return;
    if (!this.socket?.connected) throw new Error('No hay conexión WebSocket activa');

    try {
      LiveAudioStream.init({
        sampleRate: this.config.sampleRate,
        channels: this.config.channels,
        bitsPerSample: this.config.bitsPerSample,
        audioSource: this.config.audioSource,
        bufferSize: this.config.bufferSize,
        wavFile: 'audio_stream.wav', // solo para debug local
      });

      LiveAudioStream.on('data', (data: any) => {
        if (!this.socket?.connected || !this.isStreaming) return;

        try {
          let int16Array: Int16Array;

          if (typeof data === 'string') {
            // base64 -> Int16Array
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
            int16Array = new Int16Array(bytes.buffer);
          } else if (data instanceof Uint8Array) {
            int16Array = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
          } else {
            return;
          }

          if (int16Array.length === 0) return;

          this.socket.emit('audio_chunk', {
            chunk: Array.from(int16Array),
            timestamp: Date.now(),
          });
        } catch {
          // omitir errores por chunk
        }
      });

      // Avisar al backend que inicia la grabación
      this.socket.emit('start_recording');

      LiveAudioStream.start();
      this.isStreaming = true;
    } catch (error) {
      this.isStreaming = false;
      throw error;
    }
  }

  stopStreaming(): void {
    if (!this.isStreaming) return;
    try {
      LiveAudioStream.stop();
      this.isStreaming = false;
      // Avisar fin de grabación
      this.socket?.emit('stop_recording');
    } catch {
      // noop
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  isRecording(): boolean {
    return this.isStreaming;
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  /** === Funciones de control/IA para paridad con cliente web === */

  /** Fuerza al servidor a emitir el texto final acumulado y (si hay conversación activa) a responder con la IA. */
  getFinalTranscription(): void {
    this.socket?.emit('get_final_transcription');
  }

  /** Resetea el contexto conversacional en el servidor. */
  resetConversation(): void {
    this.socket?.emit('reset_conversation');
  }

  /**
   * Solicita el estado de la conversación. Devuelve una promesa que
   * se resuelve con el siguiente evento 'conversation_state'.
   */
  getConversationState(timeoutMs = 5000): Promise<ConversationState> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('Socket no inicializado'));

      let timeout: NodeJS.Timeout | null = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout esperando conversation_state'));
      }, timeoutMs);

      const handler = (state: ConversationState) => {
        cleanup();
        resolve(state);
      };

      const cleanup = () => {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        this.socket?.off('conversation_state', handler);
      };

      this.socket.once('conversation_state', handler);
      this.socket.emit('get_conversation_state');
    });
  }
}

export default new AudioStreamService();
