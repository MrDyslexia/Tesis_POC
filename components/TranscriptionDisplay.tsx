import type React from "react"
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native"

interface TranscriptionDisplayProps {
  transcription: string
  onClear: () => void
}

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ transcription, onClear }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transcripción</Text>
        {transcription.length > 0 && (
          <TouchableOpacity onPress={onClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Limpiar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {transcription.length > 0 ? (
          <Text style={styles.transcriptionText}>{transcription}</Text>
        ) : (
          <Text style={styles.placeholderText}>La transcripción aparecerá aquí en tiempo real...</Text>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    padding: 16,
    margin: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ef4444",
    borderRadius: 8,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: "#374151",
  },
  placeholderText: {
    fontSize: 16,
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 40,
  },
})
