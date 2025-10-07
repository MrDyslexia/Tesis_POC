import { useState, useEffect, useCallback } from "react"
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

  /**
   * Solicita permisos de micrófono en Android
   */
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
          title: "Permiso de Micrófono",
          message: "Esta app necesita acceso al micrófono para grabar audio",
          buttonNeutral: "Preguntar después",
          buttonNegative: "Cancelar",
          buttonPositive: "Aceptar",
        })
        return granted === PermissionsAndroid.RESULTS.GRANTED
      } catch (err) {
        console.error("Error al solicitar permisos:", err)
        return false
      }
    }
    return true // iOS maneja permisos automáticamente
  }

  /**
   * Conecta al servidor WebSocket
   */
  const connect = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }))
      await AudioStreamService.connect(serverUrl)
      setState((prev) => ({ ...prev, isConnected: true }))

      // Escuchar transcripciones
      const socket = AudioStreamService.getSocket()
      if (socket) {
        socket.on("transcription", (data: { text: string }) => {
          setTranscription((prev) => prev + " " + data.text)
        })
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Error al conectar con el servidor",
        isConnected: false,
      }))
    }
  }, [serverUrl])

  /**
   * Desconecta del servidor
   */
  const disconnect = useCallback(() => {
    if (state.isRecording) {
      stopRecording()
    }
    AudioStreamService.disconnect()
    setState((prev) => ({ ...prev, isConnected: false }))
  }, [state.isRecording])

  /**
   * Inicia la grabación y streaming
   */
  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestMicrophonePermission()
      if (!hasPermission) {
        setState((prev) => ({
          ...prev,
          error: "Permiso de micrófono denegado",
        }))
        return
      }

      await AudioStreamService.startStreaming()
      setState((prev) => ({ ...prev, isRecording: true, error: null }))
    } catch (error) {
      console.error("Error al iniciar grabación:", error);
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Error al iniciar grabación",
        isRecording: false,
      }))
    }
  }, [])

  /**
   * Detiene la grabación
   */
  const stopRecording = useCallback(() => {
    AudioStreamService.stopStreaming()
    setState((prev) => ({ ...prev, isRecording: false }))
  }, [])

  /**
   * Limpia la transcripción
   */
  const clearTranscription = useCallback(() => {
    setTranscription("")
  }, [])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (state.isRecording) {
        AudioStreamService.stopStreaming()
      }
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
