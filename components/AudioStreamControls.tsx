import type React from "react"
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native"

interface AudioStreamControlsProps {
  isConnected: boolean
  isRecording: boolean
  onConnect: () => void
  onDisconnect: () => void
  onStartRecording: () => void
  onStopRecording: () => void
}

export const AudioStreamControls: React.FC<AudioStreamControlsProps> = ({
  isConnected,
  isRecording,
  onConnect,
  onDisconnect,
  onStartRecording,
  onStopRecording,
}) => {
  return (
    <View style={styles.container}>
      {/* Estado de conexión */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: isConnected ? "#10b981" : "#ef4444" }]} />
        <Text style={styles.statusText}>{isConnected ? "Conectado" : "Desconectado"}</Text>
      </View>

      {/* Botones de conexión */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.connectButton, isConnected && styles.buttonDisabled]}
          onPress={onConnect}
          disabled={isConnected}
        >
          <Text style={styles.buttonText}>Conectar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.disconnectButton, !isConnected && styles.buttonDisabled]}
          onPress={onDisconnect}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>Desconectar</Text>
        </TouchableOpacity>
      </View>

      {/* Botón de grabación */}
      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordButtonActive, !isConnected && styles.buttonDisabled]}
        onPress={isRecording ? onStopRecording : onStartRecording}
        disabled={!isConnected}
      >
        {isRecording ? (
          <View style={styles.recordingIndicator}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.recordButtonText}>Grabando...</Text>
          </View>
        ) : (
          <Text style={styles.recordButtonText}>🎤 Iniciar Grabación</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 20,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  connectButton: {
    backgroundColor: "#3b82f6",
  },
  disconnectButton: {
    backgroundColor: "#6b7280",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  recordButton: {
    backgroundColor: "#ef4444",
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordButtonActive: {
    backgroundColor: "#dc2626",
  },
  recordingIndicator: {
    alignItems: "center",
    gap: 10,
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
})
