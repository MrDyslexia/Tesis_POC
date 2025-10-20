import {useState, useEffect, useCallback, useRef} from 'react';
import {PermissionsAndroid, Platform} from 'react-native';
import AudioStreamService from '../services/AudioStreamService';
import type {AudioStreamState} from '../types/audio';
export const useAudioStream = (serverUrl: string) => {
  const [state, setState] = useState<AudioStreamState>({
    isRecording: false,
    isConnected: false,
    error: null,
  });
  const [transcription, setTranscription] = useState<string>('');
  const isMountedRef = useRef(true);
  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de Micrófono',
            message: 'Esta app necesita acceso al micrófono para grabar audio',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Cancelar',
            buttonPositive: 'Aceptar',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (err) {
      console.error('Error al solicitar permisos:', err);
      return false;
    }
  };
  const connect = useCallback(async () => {
    try {
      setState(prev => ({...prev, error: null}));
      await AudioStreamService.connect(serverUrl);
      const socket = AudioStreamService.getSocket();
      if (socket) {
        socket.on('transcription', (data: {text: string; isFinal: boolean}) => {
          if (!isMountedRef.current) return;
          setTranscription(prev => {
            if (data.isFinal) {
              return prev + (prev ? ' ' : '') + data.text;
            } else {
              return prev;
            }
          });
        });

        socket.on('disconnect', () => {
          console.warn('[useAudioStream] Desconectado');
          if (isMountedRef.current) {
            setState(prev => ({
              ...prev,
              isConnected: false,
              isRecording: false,
            }));
          }
        });
      }
      if (isMountedRef.current) {
        setState(prev => ({...prev, isConnected: true}));
      }
    } catch (error) {
      console.error('[useAudioStream] Error conectando:', error);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Error al conectar',
          isConnected: false,
        }));
      }
    }
  }, [serverUrl]);
  const disconnect = useCallback(() => {
    AudioStreamService.disconnect();
    if (isMountedRef.current) {
      setState(prev => ({...prev, isConnected: false, isRecording: false}));
      setTranscription('');
    }
  }, []);
  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        setState(prev => ({...prev, error: 'Permiso de micrófono denegado'}));
        return;
      }
      if (!AudioStreamService.isConnected()) {
        setState(prev => ({...prev, error: 'No hay conexión con el servidor'}));
        return;
      }

      await AudioStreamService.startStreaming();

      if (isMountedRef.current) {
        setState(prev => ({...prev, isRecording: true, error: null}));
      }
    } catch (error) {
      console.error('[useAudioStream] Error al iniciar grabación:', error);
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          error:
            error instanceof Error
              ? error.message
              : 'Error al iniciar grabación',
          isRecording: false,
        }));
      }
    }
  }, []);
  const stopRecording = useCallback(() => {
    AudioStreamService.stopStreaming();
    if (isMountedRef.current) {
      setState(prev => ({...prev, isRecording: false}));
    }
  }, []);
  const clearTranscription = useCallback(() => {
    setTranscription('');
  }, []);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      AudioStreamService.stopStreaming();
      AudioStreamService.disconnect();
    };
  }, []);

  return {
    ...state,
    transcription,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    clearTranscription,
  };
};
