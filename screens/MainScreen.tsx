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
})

const HomeScreen: React.FC = () => {
  const serverUrl = "https://m1.blocktype.cl"
  const { isConnected, connect } = useAudioStream(serverUrl)

  React.useEffect(() => {
    connect()
  }, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]}>
          <Text style={styles.statusText}>{isConnected ? "✓" : "✕"}</Text>
        </View>
        <Text style={styles.statusLabel}>{isConnected ? "Conectado" : "Desconectado"}</Text>
      </View>
    </SafeAreaView>
  )
}

export default HomeScreen
