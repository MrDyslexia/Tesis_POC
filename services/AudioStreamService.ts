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
        console.log("[v0] AudioStreamService: Intentando conectar a:", serverUrl)

        if (this.socket) {
          console.log("[v0] AudioStreamService: Limpiando socket anterior")
          this.socket.removeAllListeners()
          this.socket.disconnect()
          this.socket = null
        }

        this.socket = io(serverUrl, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          timeout: 20000,
          forceNew: true,
          autoConnect: true,
        })

        this.socket.on("connect", () => {
          console.log("[v0] AudioStreamService: ✅ Conectado exitosamente")
          console.log("[v0] AudioStreamService: Socket ID:", this.socket?.id)
          resolve()
        })

        this.socket.on("connect_error", (error) => {
          console.error("[v0] AudioStreamService: ❌ Error de conexión:", {
            message: error.message,
            type: error.name,
          })
          reject(new Error(`Error de conexión: ${error.message}`))
        })

        this.socket.on("disconnect", (reason) => {
          console.log("[v0] AudioStreamService: 🔌 Desconectado. Razón:", reason)
        })

        this.socket.on("error", (error) => {
          console.error("[v0] AudioStreamService: ❌ Error del socket:", error)
        })

        this.socket.on("transcription", (data) => {
          console.log("[v0] AudioStreamService: 📝 Transcripción recibida:", data)
        })

        setTimeout(() => {
          if (this.socket && !this.socket.connected) {
            console.log("[v0] AudioStreamService: ⏱️ Timeout de conexión alcanzado")
            const error = new Error("Timeout: No se pudo conectar al servidor")
            this.socket.disconnect()
            reject(error)
          }
        }, 20000)
      } catch (error) {
        console.error("[v0] AudioStreamService: Error en connect:", error)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  /**
   * Desconecta del servidor WebSocket
   */
  disconnect(): void {
    console.log("[v0] AudioStreamService: Desconectando...")

    if (this.isStreaming) {
      this.stopStreaming()
    }

    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
      console.log("[v0] AudioStreamService: Socket desconectado y limpiado")
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
      console.warn("[v0] AudioStreamService: ⚠️ El streaming ya está activo")
      return
    }

    if (!this.socket?.connected) {
      throw new Error("No hay conexión WebSocket activa")
    }

    try {
      console.log("[v0] AudioStreamService: Iniciando streaming con config:", this.config)

      LiveAudioStream.init({
        ...this.config,
        wavFile: "audio.wav",
      })

      LiveAudioStream.on("data", (data: string) => {
        if (this.socket?.connected) {
          this.socket.emit("audio-stream", {
            audio: data,
            timestamp: Date.now(),
            sampleRate: this.config.sampleRate,
            channels: this.config.channels,
          })
        }
      })

      LiveAudioStream.start()
      this.isStreaming = true

      if (this.socket?.connected) {
        this.socket.emit("start-stream", {
          config: this.config,
        })
      }

      console.log("[v0] AudioStreamService: 🎤 Streaming de audio iniciado")
    } catch (error) {
      console.error("[v0] AudioStreamService: ❌ Error al iniciar streaming:", error)
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
      console.log("[v0] AudioStreamService: Deteniendo streaming...")

      LiveAudioStream.stop()
      this.isStreaming = false

      if (this.socket?.connected) {
        this.socket.emit("stop-stream")
      }

      console.log("[v0] AudioStreamService: 🛑 Streaming de audio detenido")
    } catch (error) {
      console.error("[v0] AudioStreamService: ❌ Error al detener streaming:", error)
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
