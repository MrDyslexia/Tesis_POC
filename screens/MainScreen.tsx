"use client"

import React from "react"
import { View, Text, StyleSheet, SafeAreaView } from "react-native"
import { useAudioStream } from "../hooks/useAudioStream"

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
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
  statusText: {
    fontSize: 32,
  },
  statusLabel: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  debugContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "monospace",
  },
})

const HomeScreen: React.FC = () => {
  const serverUrl = "https://m1.blocktype.cl"
  const { isConnected, error, connect } = useAudioStream(serverUrl)

  React.useEffect(() => {
    console.log("[v0] MainScreen: Montado, iniciando conexión a:", serverUrl)
    connect()

    return () => {
      console.log("[v0] MainScreen: Desmontando...")
    }
  }, [connect])

  React.useEffect(() => {
    console.log("[v0] MainScreen: Estado de conexión cambió a:", isConnected)
  }, [isConnected])

  React.useEffect(() => {
    if (error) {
      console.error("[v0] MainScreen: Error detectado:", error)
    }
  }, [error])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]}>
          <Text style={styles.statusText}>{isConnected ? "✓" : "✕"}</Text>
        </View>
        <Text style={styles.statusLabel}>{isConnected ? "Conectado" : "Desconectado"}</Text>
      </View>

      {error && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Error: {error}</Text>
          <Text style={styles.debugText}>URL: {serverUrl}</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

export default HomeScreen
