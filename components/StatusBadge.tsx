// components/StatusBadge.tsx
'use client';

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';

export type ConnectionStatus = 'connected' | 'disconnected' | 'recording';

type Props = {
  status: ConnectionStatus;
  label?: string;
  large?: boolean;              // true: círculo grande (teléfono), false/undefined: compacto (reloj)
  style?: ViewStyle;            // estilos extra para el contenedor
  labelStyle?: TextStyle;       // estilos extra para el texto de label
  onPress?: () => void;         // opcional: acción al tocar el círculo
};

function getColors(status: ConnectionStatus) {
  switch (status) {
    case 'connected':
      return { bg: '#10b981', icon: '✓' };
    case 'recording':
      return { bg: '#f59e0b', icon: '●' };
    case 'disconnected':
    default:
      return { bg: '#ef4444', icon: '✕' };
  }
}

const StatusBadge: React.FC<Props> = ({ status, label, large = false, style, labelStyle, onPress }) => {
  const { bg, icon } = getColors(status);
  const size = large ? 80 : 50;

  const Circle = (
    <View
      style={[
        styles.indicator,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.iconText, { fontSize: large ? 32 : 24 }]}>{icon}</Text>
    </View>
  );

  return (
    <View style={[styles.container, style]}>
      {onPress ? (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
          {Circle}
        </TouchableOpacity>
      ) : (
        Circle
      )}
      {!!label && <Text style={[styles.label, labelStyle]}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 10,
  },
  iconText: { color: '#fff', fontWeight: 'bold' },
  label: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default StatusBadge;
