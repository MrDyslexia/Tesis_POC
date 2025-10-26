// screens/MainScreen.tsx
"use client";

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
} from "react-native";
import DeviceInfo from "react-native-device-info";
import { useAudioStream } from "../hooks/useAudioStream";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const HomeScreen: React.FC = () => {
  const serverUrl = "https://m1.blocktype.cl";

  const {
    // conexión / grabación
    isConnected,
    isRecording,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,

    // transcripción
    transcription,
    interim,
    clearTranscription,

    // IA
    assistantResponse,
    isAssistantThinking,
    askAssistant,
    clearAssistantResponse,
    resetAssistantConversation,

    // conversación y chat
    chat,
    clearChat,
    conversation,
    refreshConversationState,
    lastVoiceCommand,

    // stats
    serverStats,
  } = useAudioStream(serverUrl);

  /** ===== Detección reloj vs teléfono ===== */
  const model = DeviceInfo.getModel();
  const palabrasClaveReloj = ["watch", "wear"];
  const esModeloDeReloj = palabrasClaveReloj.some((keyword) =>
    model.toLowerCase().includes(keyword.toLowerCase())
  );
  console.log("Modelo del dispositivo:", model, "¿Es modelo de reloj?", esModeloDeReloj);

  /** ===== Efectos iniciales ===== */
  React.useEffect(() => {
    console.log("[v2] MainScreen: Montado, iniciando conexión a:", serverUrl);
    connect();
    return () => {
      console.log("[v2] MainScreen: Desmontando...");
    };
  }, [connect]);

  /** ===== Banner de comandos de voz ===== */
  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!lastVoiceCommand) return;
    let msg = "";
    if (lastVoiceCommand.action === "start_conversation") {
      msg = "🎯 Conversación activada con ALMA";
    } else if (lastVoiceCommand.action === "stop_conversation") {
      msg = "🛑 Conversación finalizada";
    } else if (lastVoiceCommand.action === "reset_conversation") {
      msg = "🔄 Conversación reiniciada";
    } else {
      msg = `ℹ️ Comando detectado: ${lastVoiceCommand.action}`;
    }
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  }, [lastVoiceCommand, toastOpacity]);

  /** ===== Helpers visuales ===== */
  const getStatusColor = () => {
    if (isRecording) return esModeloDeReloj ? stylesWatch.recordingWatch : stylesPhone.recording;
    let colorStyle;
    if (isConnected) {
      colorStyle = esModeloDeReloj ? stylesWatch.connectedWatch : stylesPhone.connected;
    } else {
      colorStyle = esModeloDeReloj ? stylesWatch.disconnectedWatch : stylesPhone.disconnected;
    }
    return colorStyle;
  };

  const getStatusText = () => {
    const base = isRecording ? "Grabando" : isConnected ? "Conectado" : "Desconectado";
    if (conversation.active) return `${base} · Conversación activa`;
    return base;
  };

  const getStatusIcon = () => {
    if (isRecording) return "●";
    return isConnected ? "✓" : "✕";
  };

  /** ===== Vista para RELOJ ===== */
  if (esModeloDeReloj) {
    return (
      <SafeAreaView style={stylesWatch.container}>
        {/* Toast */}
        {toastMsg ? (
          <Animated.View style={[stylesWatch.toast, { opacity: toastOpacity }]}>
            <Text style={stylesWatch.toastText}>{toastMsg}</Text>
          </Animated.View>
        ) : null}

        <ScrollView contentContainerStyle={stylesWatch.scrollContent}>
          {/* Estado */}
          <View style={stylesWatch.statusContainer}>
            <View style={[stylesWatch.statusIndicator, getStatusColor()]}>
              <Text style={stylesWatch.statusIcon}>{getStatusIcon()}</Text>
            </View>
            <Text style={stylesWatch.statusLabel}>{getStatusText()}</Text>
          </View>

          {/* Botón principal */}
          <View style={stylesWatch.mainActionContainer}>
            {(() => {
              if (!isConnected) {
                return (
                  <TouchableOpacity style={[stylesWatch.mainButton, stylesWatch.connectButton]} onPress={connect}>
                    <Text style={stylesWatch.mainButtonIcon}>🔌</Text>
                    <Text style={stylesWatch.mainButtonText}>Conectar</Text>
                  </TouchableOpacity>
                );
              } else if (isRecording) {
                return (
                  <TouchableOpacity style={[stylesWatch.mainButton, stylesWatch.stopButton]} onPress={stopRecording}>
                    <Text style={stylesWatch.mainButtonIcon}>⏹️</Text>
                    <Text style={stylesWatch.mainButtonText}>Parar</Text>
                  </TouchableOpacity>
                );
              } else {
                return (
                  <TouchableOpacity style={[stylesWatch.mainButton, stylesWatch.recordButton]} onPress={startRecording}>
                    <Text style={stylesWatch.mainButtonIcon}>🎤</Text>
                    <Text style={stylesWatch.mainButtonText}>Grabar</Text>
                  </TouchableOpacity>
                );
              }
            })()}
          </View>

          {/* Resumen IA (compacto) */}
          <View style={stylesWatch.aiContainer}>
            <Text style={stylesWatch.aiTitle}>ALMA</Text>
            <Text style={stylesWatch.aiState}>
              {isAssistantThinking ? "🧠 Pensando…" : conversation.active ? "💬 Conversación activa" : "—"}
            </Text>
            {!!assistantResponse && (
              <ScrollView style={stylesWatch.aiScroll}>
                <Text style={stylesWatch.aiText}>{assistantResponse}</Text>
              </ScrollView>
            )}

            <View style={stylesWatch.aiButtons}>
              <TouchableOpacity style={stylesWatch.secondaryButton} onPress={clearAssistantResponse}>
                <Text style={stylesWatch.secondaryButtonText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[stylesWatch.secondaryButton, stylesWatch.askButton]}
                onPress={askAssistant}
                disabled={!isConnected}
              >
                <Text style={stylesWatch.secondaryButtonText}>Consultar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Desconectar */}
          {isConnected && !isRecording && (
            <TouchableOpacity style={[stylesWatch.secondaryButton, { marginTop: 10 }]} onPress={disconnect}>
              <Text style={stylesWatch.secondaryButtonText}>Desconectar</Text>
            </TouchableOpacity>
          )}

          {/* Error */}
          {error && (
            <View style={stylesWatch.errorContainer}>
              <Text style={stylesWatch.errorText}>⚠️ {error}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /** ===== Vista para TELÉFONO ===== */
  return (
    <SafeAreaView style={stylesPhone.container}>
      {/* Toast */}
      {toastMsg ? (
        <Animated.View style={[stylesPhone.toast, { opacity: toastOpacity }]}>
          <Text style={stylesPhone.toastText}>{toastMsg}</Text>
        </Animated.View>
      ) : null}

      {/* Estado */}
      <View style={stylesPhone.statusContainer}>
        <View style={[stylesPhone.statusIndicator, getStatusColor()]}>
          <Text style={stylesPhone.statusText}>{getStatusIcon()}</Text>
        </View>
        <Text style={stylesPhone.statusLabel}>{getStatusText()}</Text>
      </View>

      {/* Controles conexión */}
      <View style={stylesPhone.controlsContainer}>
        <TouchableOpacity
          style={[stylesPhone.button, stylesPhone.connectButton, (isConnected || isRecording) && stylesPhone.disabledButton]}
          onPress={connect}
          disabled={isConnected || isRecording}
        >
          <Text style={stylesPhone.buttonText}>Conectar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[stylesPhone.button, stylesPhone.disconnectButton, (!isConnected || isRecording) && stylesPhone.disabledButton]}
          onPress={disconnect}
          disabled={!isConnected || isRecording}
        >
          <Text style={stylesPhone.buttonText}>Desconectar</Text>
        </TouchableOpacity>
      </View>

      {/* Controles grabación */}
      <View style={stylesPhone.controlsContainer}>
        <TouchableOpacity
          style={[stylesPhone.button, stylesPhone.recordButton, (!isConnected || isRecording) && stylesPhone.disabledButton]}
          onPress={startRecording}
          disabled={!isConnected || isRecording}
        >
          <Text style={stylesPhone.buttonText}>🎤 Grabar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[stylesPhone.button, stylesPhone.stopButton, (!isConnected || !isRecording) && stylesPhone.disabledButton]}
          onPress={stopRecording}
          disabled={!isConnected || !isRecording}
        >
          <Text style={stylesPhone.buttonText}>⏹️ Parar</Text>
        </TouchableOpacity>
      </View>

      {/* Panel IA */}
      <View style={stylesPhone.panel}>
        <View style={stylesPhone.panelHeader}>
          <Text style={stylesPhone.panelTitle}>🤖 ALMA (IA Local)</Text>
          <Text style={stylesPhone.badge}>
            {isAssistantThinking ? "🧠 Pensando…" : conversation.active ? "💬 Activa" : "—"}
          </Text>
        </View>

        <View style={stylesPhone.panelButtons}>
          <TouchableOpacity style={[stylesPhone.smallBtn, stylesPhone.grayBtn]} onPress={clearAssistantResponse}>
            <Text style={stylesPhone.smallBtnText}>🧹 Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[stylesPhone.smallBtn, stylesPhone.primaryBtn]}
            onPress={askAssistant}
            disabled={!isConnected}
          >
            <Text style={stylesPhone.smallBtnText}>📨 Consultar IA</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[stylesPhone.smallBtn, stylesPhone.orangeBtn]}
            onPress={resetAssistantConversation}
            disabled={!isConnected}
          >
            <Text style={stylesPhone.smallBtnText}>🔄 Reset</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={stylesPhone.assistantBox}>
          {!!assistantResponse ? (
            <Text style={stylesPhone.assistantText}>{assistantResponse}</Text>
          ) : (
            <Text style={stylesPhone.placeholderText}>Aquí verás la respuesta de ALMA en tiempo real…</Text>
          )}
        </ScrollView>
      </View>

      {/* Transcripción */}
      <View style={stylesPhone.transcriptionContainer}>
        <View style={stylesPhone.panelHeader}>
          <Text style={stylesPhone.transcriptionTitle}>📝 Transcripción</Text>
          <TouchableOpacity onPress={clearTranscription}>
            <Text style={stylesPhone.clearLink}>Limpiar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView>
          {transcription ? (
            <Text style={stylesPhone.transcriptionText}>{transcription}</Text>
          ) : (
            <Text style={stylesPhone.placeholderText}>
              {isRecording ? "Habla ahora... la transcripción aparecerá aquí" : "Inicia la grabación para ver la transcripción"}
            </Text>
          )}
          {!!interim && <Text style={stylesPhone.interimText}>{interim}</Text>}
        </ScrollView>
      </View>

      {/* Chat (historial de turnos) */}
      <View style={stylesPhone.chatContainer}>
        <View style={stylesPhone.panelHeader}>
          <Text style={stylesPhone.panelTitle}>💬 Historial</Text>
          <TouchableOpacity onPress={clearChat}>
            <Text style={stylesPhone.clearLink}>Vaciar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={stylesPhone.chatScroll}>
          {chat.length === 0 ? (
            <Text style={stylesPhone.placeholderText}>Aún no hay turnos en esta sesión.</Text>
          ) : (
            chat.map((m) => (
              <View
                key={m.id}
                style={[
                  stylesPhone.chatBubble,
                  m.role === "user" ? stylesPhone.chatUser : stylesPhone.chatAssistant,
                ]}
              >
                <Text style={stylesPhone.chatRole}>{m.role === "user" ? "Usuario" : "ALMA"}</Text>
                <Text style={stylesPhone.chatText}>{m.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Stats (compacto) */}
      {serverStats && (
        <View style={stylesPhone.statsRow}>
          <Text style={stylesPhone.statItem}>Conexiones: {serverStats.activeConnections}</Text>
          <Text style={stylesPhone.statItem}>Chunks: {serverStats.chunksReceived}</Text>
          <Text style={stylesPhone.statItem}>Duración: {Math.round((serverStats.duration || 0) / 1000)}s</Text>
          <Text style={stylesPhone.statItem}>Transcripciones: {serverStats.totalTranscriptions}</Text>
        </View>
      )}

      {/* Error */}
      {error && (
        <View style={stylesPhone.debugContainer}>
          <Text style={stylesPhone.debugText}>Error: {error}</Text>
          <Text style={stylesPhone.debugText}>URL: {serverUrl}</Text>
          <Text style={stylesPhone.debugText}>Conectado: {isConnected ? "Sí" : "No"}</Text>
          <Text style={stylesPhone.debugText}>Grabando: {isRecording ? "Sí" : "No"}</Text>
          <TouchableOpacity onPress={refreshConversationState}>
            <Text style={[stylesPhone.debugText, { textDecorationLine: "underline" }]}>
              Actualizar estado de conversación
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

/* ===================== STYLES Watch ===================== */
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
    marginBottom: 10,
  },
  statusIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  connectedWatch: { backgroundColor: "#10b981" },
  disconnectedWatch: { backgroundColor: "#ef4444" },
  recordingWatch: { backgroundColor: "#f59e0b" },
  statusIcon: { fontSize: 24, color: "#fff", fontWeight: "bold" },
  statusLabel: { fontSize: 13, color: "#fff", fontWeight: "600" },

  mainActionContainer: { width: "100%", alignItems: "center", marginVertical: 8 },
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
  connectButton: { backgroundColor: "#3b82f6" },
  recordButton: { backgroundColor: "#ef4444" },
  stopButton: { backgroundColor: "#10b981" },
  mainButtonIcon: { fontSize: 36, marginBottom: 4 },
  mainButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  aiContainer: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    width: "95%",
  },
  aiTitle: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 4, textAlign: "center" },
  aiState: { color: "#cbd5e1", fontSize: 12, marginBottom: 6, textAlign: "center" },
  aiScroll: { maxHeight: 100 },
  aiText: { color: "#fff", fontSize: 12, lineHeight: 16 },
  aiButtons: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },

  secondaryButton: {
    backgroundColor: "#6b7280",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  askButton: { backgroundColor: "#2563eb" },
  secondaryButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    width: "95%",
  },
  errorText: { color: "#fca5a5", fontSize: 11, textAlign: "center" },

  toast: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    zIndex: 50,
  },
  toastText: { color: "#fff", fontSize: 12, fontWeight: "600" },
});

/* ===================== STYLES Phone ===================== */
const stylesPhone = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 20,
  },
  toast: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    backgroundColor: "#111827",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    zIndex: 50,
  },
  toastText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  statusContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    marginBottom: 16,
  },
  statusIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  connected: { backgroundColor: "#10b981" },
  disconnected: { backgroundColor: "#ef4444" },
  recording: { backgroundColor: "#f59e0b" },
  statusText: { fontSize: 32, color: "#fff" },
  statusLabel: { fontSize: 18, color: "#fff", fontWeight: "600" },

  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: "center",
  },
  connectButton: { backgroundColor: "#3b82f6" },
  disconnectButton: { backgroundColor: "#6b7280" },
  recordButton: { backgroundColor: "#ef4444" },
  stopButton: { backgroundColor: "#10b981" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  disabledButton: { opacity: 0.5 },

  panel: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  panelTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  badge: { color: "#cbd5e1", fontSize: 12 },

  panelButtons: { flexDirection: "row", gap: 10, justifyContent: "flex-start", marginBottom: 8 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  grayBtn: { backgroundColor: "#6b7280" },
  primaryBtn: { backgroundColor: "#2563eb" },
  orangeBtn: { backgroundColor: "#f59e0b" },
  smallBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  assistantBox: {
    maxHeight: 160,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 8,
    padding: 10,
  },
  assistantText: { color: "#fff", fontSize: 16, lineHeight: 22 },

  transcriptionContainer: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: 15,
    marginTop: 12,
  },
  transcriptionTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  transcriptionText: { color: "#fff", fontSize: 16, lineHeight: 24 },
  interimText: { color: "#9ca3af", fontStyle: "italic", marginTop: 6 },

  clearLink: { color: "#93c5fd", fontSize: 13, textDecorationLine: "underline" },
  placeholderText: { color: "#9ca3af", fontStyle: "italic", textAlign: "left", marginTop: 6 },

  chatContainer: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    maxHeight: 220,
  },
  chatScroll: { maxHeight: 180 },
  chatBubble: {
    marginBottom: 8,
    borderRadius: 8,
    padding: 10,
  },
  chatUser: { backgroundColor: "rgba(59,130,246,0.2)", alignSelf: "flex-end", maxWidth: "90%" },
  chatAssistant: { backgroundColor: "rgba(16,185,129,0.2)", alignSelf: "flex-start", maxWidth: "90%" },
  chatRole: { color: "#cbd5e1", fontSize: 11, marginBottom: 4 },
  chatText: { color: "#fff", fontSize: 15, lineHeight: 20 },

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 10,
  },
  statItem: { color: "#9ca3af", fontSize: 12 },

  debugContainer: {
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  debugText: { color: "#fff", fontSize: 10, fontFamily: "monospace" },
});

export default HomeScreen;
