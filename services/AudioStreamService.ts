import LiveAudioStream from "react-native-live-audio-stream"
import { io, type Socket } from "socket.io-client"
import { type AudioConfig, DEFAULT_AUDIO_CONFIG } from "../types/audio"

class AudioStreamService {
  private socket: Socket | null = null
  private isStreaming = false
  private config: AudioConfig = DEFAULT_AUDIO_CONFIG

  /**
   * Inicializa la conexión WebSocket con el servidor
   */
  connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(serverUrl, {
          transports: ["websocket"],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        })

        this.socket.on("connect", () => {
          console.log("✅ Conectado al servidor WebSocket")
          resolve()
        })

        this.socket.on("connect_error", (error) => {
          console.error("❌ Error de conexión:", error)
          reject(error instanceof Error ? error : new Error(String(error)))
        })

        this.socket.on("disconnect", () => {
          console.log("🔌 Desconectado del servidor")
        })

        this.socket.on("transcription", (data) => {
          console.log("📝 Transcripción recibida:", data)
        })
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  /**
   * Desconecta del servidor WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  /**
   * Configura los parámetros de audio
   */
  setAudioConfig(config: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Inicia el streaming de audio
   */
  async startStreaming(): Promise<void> {
    if (this.isStreaming) {
      console.warn("⚠️ El streaming ya está activo")
      return
    }

    if (!this.socket?.connected) {
      throw new Error("No hay conexión WebSocket activa")
    }

    try {
      // Configurar el stream de audio
      LiveAudioStream.init({
        ...this.config,
        wavFile: "audio.wav" // o cualquier nombre de archivo válido requerido
      })

      // Escuchar eventos de datos de audio
      LiveAudioStream.on("data", (data: string) => {
        if (this.socket?.connected) {
          // Enviar datos de audio al servidor
          this.socket.emit("audio-stream", {
            audio: data,
            timestamp: Date.now(),
            sampleRate: this.config.sampleRate,
            channels: this.config.channels,
          })
        }
      })

      // Iniciar la grabación
      LiveAudioStream.start()
      this.isStreaming = true

      // Notificar al servidor que comenzó el streaming
      this.socket.emit("start-stream", {
        config: this.config,
      })

      console.log("🎤 Streaming de audio iniciado")
    } catch (error) {
      console.error("❌ Error al iniciar streaming:", error)
      throw error
    }
  }

  /**
   * Detiene el streaming de audio
   */
  stopStreaming(): void {
    if (!this.isStreaming) {
      return
    }

    try {
      LiveAudioStream.stop()
      this.isStreaming = false

      // Notificar al servidor que terminó el streaming
      if (this.socket?.connected) {
        this.socket.emit("stop-stream")
      }

      console.log("🛑 Streaming de audio detenido")
    } catch (error) {
      console.error("❌ Error al detener streaming:", error)
    }
  }

  /**
   * Verifica si está conectado
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  /**
   * Verifica si está grabando
   */
  isRecording(): boolean {
    return this.isStreaming
  }

  /**
   * Obtiene el socket para escuchar eventos personalizados
   */
  getSocket(): Socket | null {
    return this.socket
  }
}

export default new AudioStreamService()
