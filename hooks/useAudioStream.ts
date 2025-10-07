"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { PermissionsAndroid, Platform } from "react-native"
import AudioStreamService from "../services/AudioStreamService"
import type { AudioStreamState } from "../types/audio"

export const useAudioStream = (serverUrl: string) => {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    isConnected: false,
    error: null,
  })

  const [transcription, setTranscription] = useState<string>("")
  const isMountedRef = useRef(true)

  /**
   * Solicita permisos de micrófono
   */
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: "Permiso de Micrófono",
            message: "Esta app necesita acceso al micrófono para grabar audio",
            buttonNeutral: "Preguntar después",
            buttonNegative: "Cancelar",
            buttonPositive: "Aceptar",
          }
        )
        return granted === PermissionsAndroid.RESULTS.GRANTED
      }
      
      // iOS maneja permisos automáticamente al iniciar el stream
      return true
    } catch (err) {
      console.error("Error al solicitar permisos:", err)
      return false
    }
  }

  /**
   * Conecta al servidor WebSocket
   */
  const connect = useCallback(async () => {
    try {
      console.log("[v1] Hook: Iniciando conexión a:", serverUrl)
      setState((prev) => ({ ...prev, error: null }))

      await AudioStreamService.connect(serverUrl)

      if (!isMountedRef.current) return

      setState((prev) => ({ ...prev, isConnected: true }))
      console.log("[v1] Hook: Estado actualizado a conectado")

      // Configurar listeners del socket
      const socket = AudioStreamService.getSocket()
      if (socket) {
        // Limpiar listeners anteriores
        socket.off("transcription")
        socket.off("audio_error")
        socket.off("disconnect")

        // Transcripciones en tiempo real
        socket.on("transcription", (data: { text: string; isFinal: boolean }) => {
          console.log("[v1] Hook: Transcripción recibida:", data.text, "Final:", data.isFinal)
          if (isMountedRef.current) {
            setTranscription((prev) => {
              // Si es final, agregar con espacio, si es parcial reemplazar la última línea
              if (data.isFinal) {
                return prev + (prev ? " " : "") + data.text
              } else {
                // Para parciales, podrías mostrar de manera diferente
                return prev + " [Parcial: " + data.text + "]"
              }
            })
          }
        })

        // Manejar errores de audio
        socket.on("audio_error", (error: { error: string }) => {
          console.error("[v1] Hook: Error de audio del servidor:", error)
          if (isMountedRef.current) {
            setState((prev) => ({ ...prev, error: error.error }))
          }
        })

        // Manejar desconexión
        socket.on("disconnect", (reason: string) => {
          console.log("[v1] Hook: Socket desconectado:", reason)
          if (isMountedRef.current) {
            setState((prev) => ({ 
              ...prev, 
              isConnected: false, 
              isRecording: false 
            }))
          }
        })
      }

    } catch (error) {
      console.error("[v1] Hook: Error en connect:", error)
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Error al conectar con el servidor",
          isConnected: false,
        }))
      }
    }
  }, [serverUrl])

  /**
   * Desconecta del servidor
   */
  const disconnect = useCallback(() => {
    console.log("[v1] Hook: Desconectando...")
    AudioStreamService.disconnect()
    if (isMountedRef.current) {
      setState((prev) => ({ 
        ...prev, 
        isConnected: false, 
        isRecording: false 
      }))
      setTranscription("")
    }
  }, [])

  /**
   * Inicia la grabación y streaming
   */
  const startRecording = useCallback(async () => {
    try {
      console.log("[v1] Hook: Iniciando grabación...")
      
      const hasPermission = await requestMicrophonePermission()
      if (!hasPermission) {
        setState((prev) => ({
          ...prev,
          error: "Permiso de micrófono denegado",
        }))
        return
      }

      if (!AudioStreamService.isConnected()) {
        setState((prev) => ({
          ...prev,
          error: "No hay conexión con el servidor",
        }))
        return
      }

      await AudioStreamService.startStreaming()
      
      if (isMountedRef.current) {
        setState((prev) => ({ 
          ...prev, 
          isRecording: true, 
          error: null 
        }))
      }
      
      console.log("[v1] Hook: Grabación iniciada correctamente")
    } catch (error) {
      console.error("[v1] Hook: Error al iniciar grabación:", error)
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : "Error al iniciar grabación",
          isRecording: false,
        }))
      }
    }
  }, [])

  /**
   * Detiene la grabación
   */
  const stopRecording = useCallback(() => {
    console.log("[v1] Hook: Deteniendo grabación...")
    AudioStreamService.stopStreaming()
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, isRecording: false }))
    }
  }, [])

  /**
   * Limpia la transcripción
   */
  const clearTranscription = useCallback(() => {
    setTranscription("")
  }, [])

  // Efecto para limpieza
  useEffect(() => {
    isMountedRef.current = true

    return () => {
      console.log("[v1] Hook: Cleanup ejecutándose")
      isMountedRef.current = false
      AudioStreamService.stopStreaming()
      AudioStreamService.disconnect()
    }
  }, [])

  return {
    ...state,
    transcription,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscription,
  }
}