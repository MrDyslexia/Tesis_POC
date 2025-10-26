// screens/shared/AssistantPanel.tsx
'use client';

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

type Props = {
  title?: string;
  isAssistantThinking: boolean;
  conversationActive: boolean;
  assistantResponse: string;
  onClear: () => void;
  onAsk: () => void;
  onReset?: () => void;
  canInteract?: boolean; // habilita/deshabilita acciones (ej.: depende de conexión)
};

const AssistantPanel: React.FC<Props> = ({
  title = '🤖 ALMA (IA Local)',
  isAssistantThinking,
  conversationActive,
  assistantResponse,
  onClear,
  onAsk,
  onReset,
  canInteract = true,
}) => {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        <Text style={styles.badge}>
          {isAssistantThinking ? '🧠 Pensando…' : conversationActive ? '💬 Activa' : '—'}
        </Text>
      </View>

      <View style={styles.panelButtons}>
        <TouchableOpacity style={[styles.smallBtn, styles.grayBtn]} onPress={onClear}>
          <Text style={styles.smallBtnText}>🧹 Limpiar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.smallBtn, styles.primaryBtn, !canInteract && styles.disabledBtn]}
          onPress={onAsk}
          disabled={!canInteract}
        >
          <Text style={styles.smallBtnText}>📨 Consultar IA</Text>
        </TouchableOpacity>

        {onReset ? (
          <TouchableOpacity
            style={[styles.smallBtn, styles.orangeBtn, !canInteract && styles.disabledBtn]}
            onPress={onReset}
            disabled={!canInteract}
          >
            <Text style={styles.smallBtnText}>🔄 Reset</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.assistantBox}>
        {assistantResponse ? (
          <Text style={styles.assistantText}>{assistantResponse}</Text>
        ) : (
          <Text style={styles.placeholderText}>Aquí verás la respuesta de ALMA en tiempo real…</Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  panelTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  badge: { color: '#cbd5e1', fontSize: 12 },

  panelButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-start', marginBottom: 8 },
  smallBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  grayBtn: { backgroundColor: '#6b7280' },
  primaryBtn: { backgroundColor: '#2563eb' },
  orangeBtn: { backgroundColor: '#f59e0b' },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  disabledBtn: { opacity: 0.5 },

  assistantBox: { maxHeight: 160, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: 10 },
  assistantText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  placeholderText: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'left', marginTop: 6 },
});

export default AssistantPanel;
