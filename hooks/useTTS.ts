// hooks/useTTS.ts
import { useCallback, useEffect, useState } from 'react';
import TTSService from '../services/TTSService';
import type { TTSState } from '../types/tts';

export function useTTS() {
  const [state, setState] = useState<TTSState>(TTSService.getState());

  useEffect(() => {
    let un: (() => void) | null = null;
    (async () => {
      await TTSService.init();
      un = TTSService.onChange((s) => setState(s));
    })();
    return () => { if (un) un(); };
  }, []);

  const speak = useCallback(async (text: string) => {
    await TTSService.speak(text);
  }, []);

  const stop = useCallback(async () => {
    await TTSService.stop();
  }, []);

  const repeatLast = useCallback(async () => {
    await TTSService.repeatLast();
  }, []);

  const setAutoSpeak = useCallback(async (v: boolean) => {
    await TTSService.setAutoSpeak(v);
  }, []);

  const setRate = useCallback(async (v: number) => {
    await TTSService.setRate(v);
  }, []);

  const setPitch = useCallback(async (v: number) => {
    await TTSService.setPitch(v);
  }, []);

  const setVoice = useCallback(async (id?: string) => {
    await TTSService.setVoice(id);
  }, []);

  return {
    ...state,
    speak,
    stop,
    repeatLast,
    setAutoSpeak,
    setRate,
    setPitch,
    setVoice,
  };
}
