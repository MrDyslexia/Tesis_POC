import LiveAudioStream from 'react-native-live-audio-stream';
import {io, type Socket} from 'socket.io-client';
import {type AudioConfig, DEFAULT_AUDIO_CONFIG} from '../types/audio';
class AudioStreamService {
  private socket: Socket | null = null;
  private isStreaming = false;
  private config: AudioConfig = DEFAULT_AUDIO_CONFIG;
  connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(
          '[v0] AudioStreamService: Intentando conectar a:',
          serverUrl,
        );

        if (this.socket) {
          console.log('[v0] AudioStreamService: Limpiando socket anterior');
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
          console.log('[v0] AudioStreamService: Conectado exitosamente');
          console.log('[v0] AudioStreamService: Socket ID:', this.socket?.id);
          resolve();
        });

        this.socket.on('connected', data => {
          console.log('[v0] AudioStreamService: Servidor listo:', data);
        });

        this.socket.on('transcription', data => {
          console.log(
            '[v0] AudioStreamService: Transcripción recibida:',
            data,
          );
        });

        this.socket.on('audio_ack', data => {
          console.log('[v0] AudioStreamService: ACK recibido:', data);
        });

        this.socket.on('server_stats', data => {
          console.log('[v0] AudioStreamService: Stats:', data);
        });

        this.socket.on('audio_error', error => {
          console.error('[v0] AudioStreamService: Error de audio:', error);
        });

        this.socket.on('connect_error', error => {
          console.error('[v0] AudioStreamService: Error de conexión:', {
            message: error.message,
            type: error.name,
          });
          reject(new Error(`Error de conexión: ${error.message}`));
        });

        this.socket.on('disconnect', reason => {
          console.log(
            '[v0] AudioStreamService: 🔌 Desconectado. Razón:',
            reason,
          );
          this.isStreaming = false;
        });

        this.socket.on('error', error => {
          console.error('[v0] AudioStreamService: Error del socket:', error);
        });
        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            console.log(
              '[v0] AudioStreamService: ⏱️ Timeout de conexión alcanzado',
            );
            const error = new Error('Timeout: No se pudo conectar al servidor');
            this.socket.disconnect();
            reject(error);
          }
        }, 20000);
      } catch (error) {
        console.error('[v0] AudioStreamService: Error en connect:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
  disconnect(): void {
    console.log('[v0] AudioStreamService: Desconectando...');

    if (this.isStreaming) {
      this.stopStreaming();
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      console.log('[v0] AudioStreamService: Socket desconectado y limpiado');
    }
  }
  setAudioConfig(config: Partial<AudioConfig>): void {
    this.config = {...this.config, ...config};
  }
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.warn('[v0] AudioStreamService: ⚠️ El streaming ya está activo');
      return;
    }

    if (!this.socket?.connected) {
      throw new Error('No hay conexión WebSocket activa');
    }

    try {
      console.log(
        '[v0] AudioStreamService: Iniciando streaming con config:',
        this.config,
      );
      LiveAudioStream.init({
        sampleRate: this.config.sampleRate,
        channels: this.config.channels,
        bitsPerSample: this.config.bitsPerSample,
        audioSource: this.config.audioSource,
        bufferSize: this.config.bufferSize,
        wavFile: 'audio_stream.wav', // Solo para debug
      });
      LiveAudioStream.on('data', (data: any) => {
        if (!this.socket?.connected || !this.isStreaming) return;

        try {
          let int16Array: Int16Array;

          if (typeof data === 'string') {
            const binaryString = atob(data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            int16Array = new Int16Array(bytes.buffer);
          } else if (data instanceof Uint8Array) {
            int16Array = new Int16Array(
              data.buffer,
              data.byteOffset,
              data.byteLength / 2,
            );
          } else {
            console.warn(
              '[LiveAudioStream] Formato de dato no reconocido:',
              typeof data,
            );
            return;
          }

          if (int16Array.length === 0) {
            console.warn('[LiveAudioStream] Chunk vacío después de conversión');
            return;
          }

          this.socket.emit('audio_chunk', {
            chunk: Array.from(int16Array),
            timestamp: Date.now(),
          });
        } catch (error) {
          console.error('[LiveAudioStream] Error procesando chunk:', error);
        }
      });
      LiveAudioStream.start();
      this.isStreaming = true;
    } catch (error) {
      console.error(
        '[v0] AudioStreamService: Error al iniciar streaming:',
        error,
      );
      this.isStreaming = false;
      throw error;
    }
  }
  stopStreaming(): void {
    if (!this.isStreaming) {
      return;
    }
    try {
      LiveAudioStream.stop();
      this.isStreaming = false;
      console.log('[v0] AudioStreamService: Streaming de audio detenido');
    } catch (error) {
      console.error(
        '[v0] AudioStreamService: Error al detener streaming:',
        error,
      );
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
}
export default new AudioStreamService();