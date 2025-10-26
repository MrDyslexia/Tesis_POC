// screens/shared/TranscriptionPanel.tsx
'use client';

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

type Props = {
  title?: string;
  transcription: string;
  interim?: string;
  onClear: () => void;
};

const TranscriptionPanel: React.FC<Props> = ({
  title = '📝 Transcripción',
  transcription,
  interim,
  onClear,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.panelHeader}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity onPress={onClear}>
          <Text style={styles.clearLink}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView>
        {transcription ? (
          <Text style={styles.text}>{transcription}</Text>
        ) : (
          <Text style={styles.placeholder}>
            Inicia la grabación para ver la transcripción
          </Text>
        )}
        {!!interim && <Text style={styles.interim}>{interim}</Text>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 15,
    marginTop: 12,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  clearLink: { color: '#93c5fd', fontSize: 13, textDecorationLine: 'underline' },

  text: { color: '#fff', fontSize: 16, lineHeight: 24 },
  interim: { color: '#9ca3af', fontStyle: 'italic', marginTop: 6 },
  placeholder: { color: '#9ca3af', fontStyle: 'italic', textAlign: 'left', marginTop: 6 },
});

export default TranscriptionPanel;
