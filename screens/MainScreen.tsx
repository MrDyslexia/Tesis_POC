"use client"

import React, { useState } from "react"
import { View, Text, TextInput, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from "react-native"
import { useAudioStream } from "../hooks/useAudioStream"
import { AudioStreamControls } from "../components/AudioStreamControls"
import { TranscriptionDisplay } from "../components/TranscriptionDisplay"

export const HomeScreen: React.FC = () => {
  const [serverUrl, setServerUrl] = useState("http://192.168.1.100:3000")

  const {
    isConnected,
    isRecording,
    error,
    transcription,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscription,
  } = useAudioStream(serverUrl)

  const handleConnect = async () => {
    if (!serverUrl.trim()) {
      Alert.alert("Error", "Por favor ingresa la URL del servidor")
      return
    }
    await connect()
  }

  React.useEffect(() => {
    if (error) {
      Alert.alert("Error", error)
    }
  }, [error])

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎙️ Audio Stream</Text>
          <Text style={styles.headerSubtitle}>Streaming de audio en tiempo real</Text>
        </View>

        {/* Configuración del servidor */}
        <View style={styles.configSection}>
          <Text style={styles.label}>URL del Servidor</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="http://192.168.1.100:3000"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnected}
          />
        </View>

        {/* Controles */}
        <AudioStreamControls
          isConnected={isConnected}
          isRecording={isRecording}
          onConnect={handleConnect}
          onDisconnect={disconnect}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
        />

        {/* Transcripción */}
        <TranscriptionDisplay transcription={transcription} onClear={clearTranscription} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  configSection: {
    padding: 20,
    paddingBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
  },
})
