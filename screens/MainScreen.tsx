"use client"

import React from "react"
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions } from "react-native"
import { useAudioStream } from "../hooks/useAudioStream"
import DeviceInfo from "react-native-device-info"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

const HomeScreen: React.FC = () => {
  const serverUrl = "https://m1.blocktype.cl"
  const { isConnected, isRecording, error, transcription, connect, disconnect, startRecording, stopRecording } =
    useAudioStream(serverUrl)

  const model = DeviceInfo.getModel()
  const palabrasClaveReloj = ["watch", "wear"]
  const esModeloDeReloj = palabrasClaveReloj.some((keyword) => model.toLowerCase().includes(keyword.toLowerCase()))

  console.log("Modelo del dispositivo:", model, "¿Es modelo de reloj?", esModeloDeReloj)

  React.useEffect(() => {
    console.log("[v1] MainScreen: Montado, iniciando conexión a:", serverUrl)
    connect()

    return () => {
      console.log("[v1] MainScreen: Desmontando...")
    }
  }, [connect])

  const getStatusColor = () => {
    if (isRecording) return esModeloDeReloj ? stylesWatch.recordingWatch : stylesPhone.recording
    let colorStyle
    if (isConnected) {
      colorStyle = esModeloDeReloj ? stylesWatch.connectedWatch : stylesPhone.connected
    } else {
      colorStyle = esModeloDeReloj ? stylesWatch.disconnectedWatch : stylesPhone.disconnected
    }
    return colorStyle
  }

  const getStatusText = () => {
    if (isRecording) return "Grabando"
    return isConnected ? "Conectado" : "Desconectado"
  }

  const getStatusIcon = () => {
    if (isRecording) return "●"
    return isConnected ? "✓" : "✕"
  }

  if (esModeloDeReloj) {
    return (
      <SafeAreaView style={stylesWatch.container}>
        <ScrollView contentContainerStyle={stylesWatch.scrollContent}>
          {/* Status Indicator */}
          <View style={stylesWatch.statusContainer}>
            <View style={[stylesWatch.statusIndicator, getStatusColor()]}>
              <Text style={stylesWatch.statusIcon}>{getStatusIcon()}</Text>
            </View>
            <Text style={stylesWatch.statusLabel}>{getStatusText()}</Text>
          </View>

          {/* Main Action Button - Simplified for watch */}
          <View style={stylesWatch.mainActionContainer}>
            {(() => {
              if (!isConnected) {
                return (
                  <TouchableOpacity style={[stylesWatch.mainButton, stylesWatch.connectButton]} onPress={connect}>
                    <Text style={stylesWatch.mainButtonIcon}>🔌</Text>
                    <Text style={stylesWatch.mainButtonText}>Conectar</Text>
                  </TouchableOpacity>
                )
              } else if (isRecording) {
                return (
                  <TouchableOpacity style={[stylesWatch.mainButton, stylesWatch.stopButton]} onPress={stopRecording}>
                    <Text style={stylesWatch.mainButtonIcon}>⏹️</Text>
                    <Text style={stylesWatch.mainButtonText}>Parar</Text>
                  </TouchableOpacity>
                )
              } else {
                return (
                  <TouchableOpacity style={[stylesWatch.mainButton, stylesWatch.recordButton]} onPress={startRecording}>
                    <Text style={stylesWatch.mainButtonIcon}>🎤</Text>
                    <Text style={stylesWatch.mainButtonText}>Grabar</Text>
                  </TouchableOpacity>
                )
              }
            })()}
          </View>

          {/* Transcription Preview - Compact */}
          {!!transcription && (
            <View style={stylesWatch.transcriptionContainer}>
              <Text style={stylesWatch.transcriptionText} numberOfLines={3}>
                {transcription}
              </Text>
            </View>
          )}

          {/* Disconnect Button - Only when connected */}
          {isConnected && !isRecording && (
            <TouchableOpacity style={stylesWatch.secondaryButton} onPress={disconnect}>
              <Text style={stylesWatch.secondaryButtonText}>Desconectar</Text>
            </TouchableOpacity>
          )}

          {/* Error Display */}
          {error && (
            <View style={stylesWatch.errorContainer}>
              <Text style={stylesWatch.errorText}>⚠️ {error}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={stylesPhone.container}>
      <View style={stylesPhone.statusContainer}>
        <View style={[stylesPhone.statusIndicator, getStatusColor()]}>
          <Text style={stylesPhone.statusText}>{getStatusIcon()}</Text>
        </View>
        <Text style={stylesPhone.statusLabel}>{getStatusText()}</Text>
      </View>

      <View style={stylesPhone.controlsContainer}>
        <TouchableOpacity
          style={[
            stylesPhone.button,
            stylesPhone.connectButton,
            (isConnected || isRecording) && stylesPhone.disabledButton,
          ]}
          onPress={connect}
          disabled={isConnected || isRecording}
        >
          <Text style={stylesPhone.buttonText}>Conectar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            stylesPhone.button,
            stylesPhone.disconnectButton,
            (!isConnected || isRecording) && stylesPhone.disabledButton,
          ]}
          onPress={disconnect}
          disabled={!isConnected || isRecording}
        >
          <Text style={stylesPhone.buttonText}>Desconectar</Text>
        </TouchableOpacity>
      </View>

      <View style={stylesPhone.controlsContainer}>
        <TouchableOpacity
          style={[
            stylesPhone.button,
            stylesPhone.recordButton,
            (!isConnected || isRecording) && stylesPhone.disabledButton,
          ]}
          onPress={startRecording}
          disabled={!isConnected || isRecording}
        >
          <Text style={stylesPhone.buttonText}>🎤 Grabar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            stylesPhone.button,
            stylesPhone.stopButton,
            (!isConnected || !isRecording) && stylesPhone.disabledButton,
          ]}
          onPress={stopRecording}
          disabled={!isConnected || !isRecording}
        >
          <Text style={stylesPhone.buttonText}>⏹️ Parar</Text>
        </TouchableOpacity>
      </View>

      <View style={stylesPhone.transcriptionContainer}>
        <Text style={stylesPhone.transcriptionTitle}>Transcripción</Text>
        <ScrollView>
          {transcription ? (
            <Text style={stylesPhone.transcriptionText}>{transcription}</Text>
          ) : (
            <Text style={stylesPhone.placeholderText}>
              {isRecording
                ? "Habla ahora... la transcripción aparecerá aquí"
                : "Inicia la grabación para ver la transcripción"}
            </Text>
          )}
        </ScrollView>
      </View>

      {error && (
        <View style={stylesPhone.debugContainer}>
          <Text style={stylesPhone.debugText}>Error: {error}</Text>
          <Text style={stylesPhone.debugText}>URL: {serverUrl}</Text>
          <Text style={stylesPhone.debugText}>Conectado: {isConnected ? "Sí" : "No"}</Text>
          <Text style={stylesPhone.debugText}>Grabando: {isRecording ? "Sí" : "No"}</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const stylesWatch = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  statusContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  statusIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  connectedWatch: {
    backgroundColor: "#10b981",
  },
  disconnectedWatch: {
    backgroundColor: "#ef4444",
  },
  recordingWatch: {
    backgroundColor: "#f59e0b",
  },
  statusIcon: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
  },
  statusLabel: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  mainActionContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 10,
  },
  mainButton: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    maxWidth: 140,
    maxHeight: 140,
    borderRadius: 1000,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  connectButton: {
    backgroundColor: "#3b82f6",
  },
  recordButton: {
    backgroundColor: "#ef4444",
  },
  stopButton: {
    backgroundColor: "#10b981",
  },
  mainButtonIcon: {
    fontSize: 36,
    marginBottom: 5,
  },
  mainButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  transcriptionContainer: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
    width: "95%",
  },
  transcriptionText: {
    color: "#fff",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
  },
  secondaryButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
    width: "95%",
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 11,
    textAlign: "center",
  },
})

const stylesPhone = StyleSheet.create({
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

export default HomeScreen
