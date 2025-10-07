"use client"

import React from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from "react-native"
import { useAudioStream } from "../hooks/useAudioStream"

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 30,
  },
  statusIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  connected: {
    backgroundColor: "#10b981",
  },
  disconnected: {
    backgroundColor: "#ef4444",
  },
  recording: {
    backgroundColor: "#f59e0b",
  },
  statusText: {
    fontSize: 32,
    color: "#fff",
  },
  statusLabel: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 20,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  connectButton: {
    backgroundColor: "#3b82f6",
  },
  disconnectButton: {
    backgroundColor: "#6b7280",
  },
  recordButton: {
    backgroundColor: "#ef4444",
  },
  stopButton: {
    backgroundColor: "#10b981",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  transcriptionContainer: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  transcriptionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },
  transcriptionText: {
    color: "#fff",
    fontSize: 16,
    lineHeight: 24,
  },
  placeholderText: {
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 20,
  },
  debugContainer: {
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  debugText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "monospace",
  },
})

const HomeScreen: React.FC = () => {
  const serverUrl = "https://m1.blocktype.cl" // Cambia por tu URL
  const { 
    isConnected, 
    isRecording, 
    error, 
    transcription,
    connect, 
    disconnect, 
    startRecording, 
    stopRecording,
  } = useAudioStream(serverUrl)

  React.useEffect(() => {
    console.log("[v1] MainScreen: Montado, iniciando conexión a:", serverUrl)
    connect()

    return () => {
      console.log("[v1] MainScreen: Desmontando...")
    }
  }, [connect])

  const getStatusColor = () => {
    if (isRecording) return styles.recording
    return isConnected ? styles.connected : styles.disconnected
  }

  const getStatusText = () => {
    if (isRecording) return "Grabando"
    return isConnected ? "Conectado" : "Desconectado"
  }

  const getStatusIcon = () => {
    if (isRecording) return "●"
    return isConnected ? "✓" : "✕"
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, getStatusColor()]}>
          <Text style={styles.statusText}>{getStatusIcon()}</Text>
        </View>
        <Text style={styles.statusLabel}>{getStatusText()}</Text>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.button, 
            styles.connectButton, 
            (isConnected || isRecording) && styles.disabledButton
          ]}
          onPress={connect}
          disabled={isConnected || isRecording}
        >
          <Text style={styles.buttonText}>Conectar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button, 
            styles.disconnectButton, 
            (!isConnected || isRecording) && styles.disabledButton
          ]}
          onPress={disconnect}
          disabled={!isConnected || isRecording}
        >
          <Text style={styles.buttonText}>Desconectar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.button, 
            styles.recordButton, 
            (!isConnected || isRecording) && styles.disabledButton
          ]}
          onPress={startRecording}
          disabled={!isConnected || isRecording}
        >
          <Text style={styles.buttonText}>🎤 Grabar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button, 
            styles.stopButton, 
            (!isConnected || !isRecording) && styles.disabledButton
          ]}
          onPress={stopRecording}
          disabled={!isConnected || !isRecording}
        >
          <Text style={styles.buttonText}>⏹️ Parar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transcriptionContainer}>
        <Text style={styles.transcriptionTitle}>Transcripción</Text>
        <ScrollView>
          {transcription ? (
            <Text style={styles.transcriptionText}>{transcription}</Text>
          ) : (
            <Text style={styles.placeholderText}>
              {isRecording 
                ? "Habla ahora... la transcripción aparecerá aquí" 
                : "Inicia la grabación para ver la transcripción"
              }
            </Text>
          )}
        </ScrollView>
      </View>

      {error && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Error: {error}</Text>
          <Text style={styles.debugText}>URL: {serverUrl}</Text>
          <Text style={styles.debugText}>Conectado: {isConnected ? "Sí" : "No"}</Text>
          <Text style={styles.debugText}>Grabando: {isRecording ? "Sí" : "No"}</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

export default HomeScreen