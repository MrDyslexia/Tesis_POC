// screens/phone/HomeScreen.tsx
'use client';

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Animated,
  Linking,
} from 'react-native';
import {useAudioStream} from '../../hooks/useAudioStream';
import AssistantPanel from '../shared/AssistantPanel';
import TranscriptionPanel from '../shared/TranscriptionPanel';
import StatusBadge from '../../components/StatusBadge';
import {useTTS} from '../../hooks/useTTS';
import TTSService from '../../services/TTSService';
import {hasGMS} from '../../utils/device';

const PhoneHome: React.FC = () => {
  const serverUrl = 'https://m1.blocktype.cl';
  const [gmsOk] = React.useState<boolean>(hasGMS());
  const {
    isConnected,
    isRecording,
    error,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    transcription,
    interim,
    clearTranscription,
    assistantResponse,
    isAssistantThinking,
    askAssistant,
    clearAssistantResponse,
    resetAssistantConversation,
    chat,
    clearChat,
    conversation,
    refreshConversationState,
    lastVoiceCommand,
    serverStats,
  } = useAudioStream(serverUrl);

  const {status: ttsStatus, error: ttsError} = useTTS();

  const [toastMsg, setToastMsg] = React.useState<string | null>(null);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    connect();
    return () => {
      // cleanup lo maneja el hook
    };
  }, [connect]);

  React.useEffect(() => {
    if (!lastVoiceCommand) return;
    let msg = '';
    if (lastVoiceCommand.action === 'start_conversation') {
      msg = '🎯 Conversación activada con ALMA';
    } else if (lastVoiceCommand.action === 'stop_conversation') {
      msg = '🛑 Conversación finalizada';
    } else if (lastVoiceCommand.action === 'reset_conversation') {
      msg = '🔄 Conversación reiniciada';
    } else {
      msg = `ℹ️ Comando detectado: ${lastVoiceCommand.action}`;
    }
    setToastMsg(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMsg(null));
  }, [lastVoiceCommand, toastOpacity]);

  const status = isRecording
    ? 'recording'
    : isConnected
    ? 'connected'
    : 'disconnected';
  const base = isRecording
    ? 'Grabando'
    : isConnected
    ? 'Conectado'
    : 'Desconectado';
  const statusLabel = conversation.active
    ? `${base} · Conversación activa`
    : base;

  return (
    <SafeAreaView style={styles.container}>
      {/* Toast */}
      {toastMsg ? (
        <Animated.View style={[styles.toast, {opacity: toastOpacity}]}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </Animated.View>
      ) : null}

      {/* Estado (StatusBadge) + TTS */}
      <View style={styles.statusWrap}>
        <StatusBadge status={status as any} label={statusLabel} large />
        <Text style={styles.ttsHint}>
          TTS:{' '}
          {ttsStatus === 'speaking'
            ? 'Hablando…'
            : ttsStatus === 'error'
            ? 'Error'
            : 'Silencio'}
        </Text>
        {!gmsOk && (
          <View style={styles.gmsBanner}>
            <Text style={styles.gmsBannerTitle}>
              Falta Google Play Services
            </Text>
            <Text style={styles.gmsBannerText}>
              Para usar TTS de Google, este dispositivo necesita Google Play
              Services y Play Store. En emulador, crea un AVD Wear OS con Google
              Play. En reloj real, actualiza Play Services desde Play Store.
            </Text>
            <View style={{height: 6}} />
            <TouchableOpacity
              style={styles.gmsBtn}
              onPress={() =>
                Linking.openURL(
                  'market://details?id=com.google.android.gms',
                ).catch(() =>
                  Linking.openURL(
                    'https://play.google.com/store/apps/details?id=com.google.android.gms',
                  ),
                )
              }>
              <Text style={styles.gmsBtnText}>
                Abrir ficha de Play Services
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* CTA: instalar motor TTS si falta */}
        {ttsError?.includes('No hay motor TTS instalado') && (
          <TouchableOpacity
            style={styles.ttsCtaBtn}
            onPress={() => TTSService.openEngineInstall()}>
            <Text style={styles.ttsCtaText}>Instalar motor TTS (Google)</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Controles conexión */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.connectButton,
            (isConnected || isRecording) && styles.disabledButton,
          ]}
          onPress={connect}
          disabled={isConnected || isRecording}>
          <Text style={styles.buttonText}>Conectar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.disconnectButton,
            (!isConnected || isRecording) && styles.disabledButton,
          ]}
          onPress={disconnect}
          disabled={!isConnected || isRecording}>
          <Text style={styles.buttonText}>Desconectar</Text>
        </TouchableOpacity>
      </View>

      {/* Controles grabación */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.recordButton,
            (!isConnected || isRecording) && styles.disabledButton,
          ]}
          onPress={startRecording}
          disabled={!isConnected || isRecording}>
          <Text style={styles.buttonText}>🎤 Grabar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.stopButton,
            (!isConnected || !isRecording) && styles.disabledButton,
          ]}
          onPress={stopRecording}
          disabled={!isConnected || !isRecording}>
          <Text style={styles.buttonText}>⏹️ Parar</Text>
        </TouchableOpacity>
      </View>

      {/* Panel IA */}
      <AssistantPanel
        title="🤖 ALMA (IA Local)"
        isAssistantThinking={isAssistantThinking}
        conversationActive={conversation.active}
        assistantResponse={assistantResponse}
        onClear={clearAssistantResponse}
        onAsk={askAssistant}
        onReset={resetAssistantConversation}
        canInteract={isConnected}
      />

      {/* Transcripción */}
      <TranscriptionPanel
        transcription={transcription}
        interim={interim}
        onClear={clearTranscription}
      />

      {/* Chat (historial) */}
      <View style={styles.chatContainer}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>💬 Historial</Text>
          <TouchableOpacity onPress={clearChat}>
            <Text style={styles.clearLink}>Vaciar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.chatScroll}>
          {chat.length === 0 ? (
            <Text style={styles.placeholderText}>
              Aún no hay turnos en esta sesión.
            </Text>
          ) : (
            chat.map(m => (
              <View
                key={m.id}
                style={[
                  styles.chatBubble,
                  m.role === 'user' ? styles.chatUser : styles.chatAssistant,
                ]}>
                <Text style={styles.chatRole}>
                  {m.role === 'user' ? 'Usuario' : 'ALMA'}
                </Text>
                <Text style={styles.chatText}>{m.content}</Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Stats */}
      {serverStats && (
        <View style={styles.statsRow}>
          <Text style={styles.statItem}>
            Conexiones: {serverStats.activeConnections}
          </Text>
          <Text style={styles.statItem}>
            Chunks: {serverStats.chunksReceived}
          </Text>
          <Text style={styles.statItem}>
            Duración: {Math.round((serverStats.duration || 0) / 1000)}s
          </Text>
          <Text style={styles.statItem}>
            Transcripciones: {serverStats.totalTranscriptions}
          </Text>
        </View>
      )}

      {/* Error conexión */}
      {error && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Error: {error}</Text>
          <Text style={styles.debugText}>URL: {serverUrl}</Text>
          <Text style={styles.debugText}>
            Conectado: {isConnected ? 'Sí' : 'No'}
          </Text>
          <Text style={styles.debugText}>
            Grabando: {isRecording ? 'Sí' : 'No'}
          </Text>
          <TouchableOpacity onPress={refreshConversationState}>
            <Text style={[styles.debugText, {textDecorationLine: 'underline'}]}>
              Actualizar estado de conversación
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

/* ===================== STYLES Phone ===================== */
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000', padding: 20},

  toast: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    zIndex: 50,
  },
  toastText: {color: '#fff', fontSize: 13, fontWeight: '600'},

  statusWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 16,
  },
  ttsHint: {color: '#9ca3af', marginTop: 4, fontSize: 12},
  ttsCtaBtn: {
    marginTop: 6,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ttsCtaText: {color: '#fff', fontSize: 13, fontWeight: '600'},

  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 10,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  connectButton: {backgroundColor: '#3b82f6'},
  disconnectButton: {backgroundColor: '#6b7280'},
  recordButton: {backgroundColor: '#ef4444'},
  stopButton: {backgroundColor: '#10b981'},
  buttonText: {color: '#fff', fontSize: 16, fontWeight: '600'},
  disabledButton: {opacity: 0.5},

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  panelTitle: {color: '#fff', fontSize: 18, fontWeight: '700'},
  clearLink: {color: '#93c5fd', fontSize: 13, textDecorationLine: 'underline'},

  placeholderText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'left',
    marginTop: 6,
  },

  chatContainer: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    maxHeight: 220,
  },
  chatScroll: {maxHeight: 180},
  chatBubble: {marginBottom: 8, borderRadius: 8, padding: 10},
  chatUser: {
    backgroundColor: 'rgba(59,130,246,0.2)',
    alignSelf: 'flex-end',
    maxWidth: '90%',
  },
  chatAssistant: {
    backgroundColor: 'rgba(16,185,129,0.2)',
    alignSelf: 'flex-start',
    maxWidth: '90%',
  },
  chatRole: {color: '#cbd5e1', fontSize: 11, marginBottom: 4},
  chatText: {color: '#fff', fontSize: 15, lineHeight: 20},

  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statItem: {color: '#9ca3af', fontSize: 12},

  debugContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  debugText: {color: '#fff', fontSize: 10, fontFamily: 'monospace'},
  gmsBanner: {
    marginTop: 10,
    backgroundColor: 'rgba(234,179,8,0.15)',
    borderColor: '#eab308',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    width: '100%',
  },
  gmsBannerTitle: {color: '#fde68a', fontWeight: '700', marginBottom: 4},
  gmsBannerText: {color: '#fef9c3', fontSize: 12, lineHeight: 16},
  gmsBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#2563eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  gmsBtnText: {color: '#fff', fontSize: 12, fontWeight: '600'},
});

export default PhoneHome;
