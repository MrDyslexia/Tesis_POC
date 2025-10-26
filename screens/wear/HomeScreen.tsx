// screens/wear/HomeScreen.tsx
'use client';

import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { useAudioStream } from '../../hooks/useAudioStream';
import AssistantPanel from '../shared/AssistantPanel';
import StatusBadge from '../../components/StatusBadge';
import { useTTS } from '../../hooks/useTTS';

const WearHome: React.FC = () => {
  const serverUrl = 'https://m1.blocktype.cl';
  const {
    isConnected, isRecording, error, connect, disconnect,
    startRecording, stopRecording,
    assistantResponse, isAssistantThinking, askAssistant, clearAssistantResponse, resetAssistantConversation,
    conversation, lastVoiceCommand,
  } = useAudioStream(serverUrl);

  const { status: ttsStatus } = useTTS();

  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    connect();
    return () => { /* cleanup en hook */ };
  }, [connect]);

  React.useEffect(() => {
    if (!lastVoiceCommand) return;
    let msg = '';
    if (lastVoiceCommand.action === 'start_conversation') msg = '🎯 Conversación activada con ALMA';
    else if (lastVoiceCommand.action === 'stop_conversation') msg = '🛑 Conversación finalizada';
    else if (lastVoiceCommand.action === 'reset_conversation') msg = '🔄 Conversación reiniciada';
    else msg = `ℹ️ Comando: ${lastVoiceCommand.action}`;
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  }, [lastVoiceCommand, toastOpacity]);

  const status = isRecording ? 'recording' : isConnected ? 'connected' : 'disconnected';
  const base = isRecording ? 'Grabando' : isConnected ? 'Conectado' : 'Desconectado';
  const statusLabel = conversation.active ? `${base} · Conversación activa` : base;

  return (
    <SafeAreaView style={styles.container}>
      {toastMsg ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statusWrap}>
          <StatusBadge status={status as any} label={statusLabel} />
          <Text style={styles.ttsHint}>TTS: {ttsStatus === 'speaking' ? 'Hablando…' : ttsStatus === 'error' ? 'Error' : 'Silencio'}</Text>
        </View>

        <View style={styles.mainActionContainer}>
          {(() => {
            if (!isConnected) {
              return (
                <TouchableOpacity style={[styles.mainButton, styles.connectButton]} onPress={connect}>
                  <Text style={styles.mainButtonIcon}>🔌</Text>
                  <Text style={styles.mainButtonText}>Conectar</Text>
                </TouchableOpacity>
              );
            } else if (isRecording) {
              return (
                <TouchableOpacity style={[styles.mainButton, styles.stopButton]} onPress={stopRecording}>
                  <Text style={styles.mainButtonIcon}>⏹️</Text>
                  <Text style={styles.mainButtonText}>Parar</Text>
                </TouchableOpacity>
              );
            } else {
              return (
                <TouchableOpacity style={[styles.mainButton, styles.recordButton]} onPress={startRecording}>
                  <Text style={styles.mainButtonIcon}>🎤</Text>
                  <Text style={styles.mainButtonText}>Grabar</Text>
                </TouchableOpacity>
              );
            }
          })()}
        </View>

        <View style={{ width: '95%' }}>
          <AssistantPanel
            title="ALMA"
            isAssistantThinking={isAssistantThinking}
            conversationActive={conversation.active}
            assistantResponse={assistantResponse}
            onClear={clearAssistantResponse}
            onAsk={askAssistant}
            onReset={resetAssistantConversation}
            canInteract={isConnected}
          />
        </View>

        {isConnected && !isRecording && (
          <TouchableOpacity style={[styles.secondaryButton, { marginTop: 10 }]} onPress={disconnect}>
            <Text style={styles.secondaryButtonText}>Desconectar</Text>
          </TouchableOpacity>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 8 },
  statusWrap: { alignItems: 'center', marginBottom: 10 },
  ttsHint: { color: '#9ca3af', marginTop: 4, fontSize: 12 },

  mainActionContainer: { width: '100%', alignItems: 'center', marginVertical: 8 },
  mainButton: {
    width: 140, height: 140, borderRadius: 1000, alignItems: 'center', justifyContent: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  connectButton: { backgroundColor: '#3b82f6' },
  recordButton: { backgroundColor: '#ef4444' },
  stopButton: { backgroundColor: '#10b981' },
  mainButtonIcon: { fontSize: 36, marginBottom: 4, color: '#fff' },
  mainButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  secondaryButton: { backgroundColor: '#6b7280', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  secondaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  errorContainer: { backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 8, borderRadius: 6, marginTop: 8, width: '95%' },
  errorText: { color: '#fca5a5', fontSize: 11, textAlign: 'center' },

  toast: {
    position: 'absolute', top: 10, alignSelf: 'center',
    backgroundColor: '#111827', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, zIndex: 50,
  },
  toastText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

export default WearHome;
