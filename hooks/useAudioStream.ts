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
      console.log("[v0] Hook: Iniciando conexión...")
      setState((prev) => ({ ...prev, error: null }))

      await AudioStreamService.connect(serverUrl)

      if (!isMountedRef.current) return

      setState((prev) => ({ ...prev, isConnected: true }))
      console.log("[v0] Hook: Estado actualizado a conectado")

      // Escuchar transcripciones
      const socket = AudioStreamService.getSocket()
      if (socket) {
        socket.off("transcription")
        socket.on("transcription", (data: { text: string }) => {
          console.log("[v0] Hook: Transcripción recibida:", data.text)
          if (isMountedRef.current) {
            setTranscription((prev) => prev + " " + data.text)
          }
        })
      }
    } catch (error) {
      console.error("[v0] Hook: Error en connect:", error)
      if (isMountedRef.current) {
        setState((prev) => ({
          ...prev,
          error: "Error al conectar con el servidor",
          isConnected: false,
        }))
      }
    }
  }, [serverUrl])

  /**
   * Desconecta del servidor
   */
  const disconnect = useCallback(() => {
    console.log("[v0] Hook: Desconectando...")
    AudioStreamService.disconnect()
    if (isMountedRef.current) {
      setState((prev) => ({ ...prev, isConnected: false, isRecording: false }))
    }
  }, [])

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
        error: "Error al iniciar grabación",
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

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      console.log("[v0] Hook: Cleanup ejecutándose")
      isMountedRef.current = false
      AudioStreamService.stopStreaming()
      AudioStreamService.disconnect()
    }
  }, []) // Sin dependencias para que solo se ejecute al montar/desmontar

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
