// services/TTSService.ts
import { Platform, Linking } from 'react-native';
import Tts from 'react-native-tts';
import type { TTSOptions, TTSState, TTSVoice } from '../types/tts';

type Listener = (s: TTSState) => void;

/** Preferencias de idioma (Español) para elegir voz por defecto */
const SPANISH_PREFS = ['es-CL', 'es-419', 'es-MX', 'es-ES', 'es-US', 'es'];
const DEFAULT_SPANISH_LANG = 'es-ES';
const GOOGLE_TTS_PKG = 'com.google.android.tts';

class TTSService {
  private static _instance: TTSService;
  static get I() {
    if (!this._instance) this._instance = new TTSService();
    return this._instance;
  }

  private state: TTSState = {
    status: 'idle',
    availableVoices: [],
    autoSpeak: true,
    rate: 0.5,
    pitch: 1.0,
    voiceId: undefined,
    lastText: undefined,
    error: null,
  };

  private listeners = new Set<Listener>();
  private inited = false;

  // === DIAGNÓSTICO ===
  private lastError: string | null = null;
  private logRing: string[] = [];

  private constructor() {}

  // ---------- util de logs ----------
  private log(msg: string, extra?: any) {
    const line = `[TTS] ${msg}${extra !== undefined ? ` ${JSON.stringify(extra)}` : ''}`;
    this.logRing.push(line);
    if (this.logRing.length > 100) this.logRing.shift();
    // eslint-disable-next-line no-console
    console.log(line);
  }

  private emit() {
    const snapshot = { ...this.state };
    this.listeners.forEach((l) => l(snapshot));
  }

  onChange(listener: Listener) {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  getState(): TTSState {
    return { ...this.state };
  }

  getOptions(): TTSOptions {
    const { voiceId, rate, pitch, autoSpeak } = this.state;
    return { voiceId, rate, pitch, autoSpeak };
  }

  isSpeaking() {
    return this.state.status === 'speaking';
  }

  // ---------- Detectores / CTAs ----------
  private isNoEngineError(msg?: string) {
    const m = (msg ?? this.lastError ?? '').toLowerCase();
    return m.includes('no tts engine installed') || m.includes('not bound to tts engine');
  }

  /** URL de instalación del motor de Google TTS (Speech Services) */
  getEngineInstallUrl() {
    return {
      market: 'market://details?id=com.google.android.tts',
      https: 'https://play.google.com/store/apps/details?id=com.google.android.tts',
    };
  }

  /** Abre la tienda para instalar el motor TTS en el dispositivo (Wear/Android) */
  async openEngineInstall() {
    const { market, https } = this.getEngineInstallUrl();
    try {
      const canMarket = await Linking.canOpenURL(market);
      if (canMarket) return Linking.openURL(market);
    } catch {}
    return Linking.openURL(https);
  }

  // ---------- Preferencia voz/español ----------
  private pickSpanishVoice(voices: TTSVoice[]): TTSVoice | undefined {
    if (!voices?.length) return undefined;
    const esVoices = voices.filter(v => (v.language ?? '').toLowerCase().startsWith('es'));
    if (!esVoices.length) return undefined;
    for (const pref of SPANISH_PREFS) {
      const found = esVoices.find(v => (v.language ?? '').toLowerCase() === pref.toLowerCase());
      if (found) return found;
    }
    return esVoices[0];
  }

  // ---------- Engine / Init ----------
  private async ensureInit() {
    try {
      // @ts-ignore (método Android)
      if (typeof (Tts as any).getInitStatus === 'function') {
        await (Tts as any).getInitStatus();
        this.log('Engine init OK');
      }
    } catch (e: any) {
      const msg = e?.message ?? 'TTS no inicializado';
      this.lastError = msg;
      this.state.status = 'error';
      this.state.error = this.isNoEngineError(msg)
        ? 'No hay motor TTS instalado. Instala "Speech Services by Google" en el reloj y elige Español.'
        : msg;
      this.emit();
      this.log('Engine init FAIL', { msg });
      throw e;
    }
  }

  private async ensureEngine() {
    if (Platform.OS !== 'android') return;
    try {
      // @ts-ignore (método Android)
      if (typeof (Tts as any).setDefaultEngine === 'function') {
        await (Tts as any).setDefaultEngine(GOOGLE_TTS_PKG);
        this.log('Intento setDefaultEngine Google OK');
      }
    } catch (e: any) {
      this.log('setDefaultEngine Google FAIL', { msg: e?.message });
    }
  }

  // ---------- Voces / Español ----------
  async refreshVoices() {
    try {
      const raw = (await Tts.voices()) as any[];
      const voices: TTSVoice[] = (raw || []).map((v) => ({
        id: v.id,
        name: v.name,
        language: v.language,
      }));
      this.state.availableVoices = voices;
      this.emit();
      this.log('Voices loaded', { count: voices.length });
      return voices;
    } catch (e: any) {
      const msg = e?.message ?? 'Error listando voces';
      this.lastError = msg;
      this.state.availableVoices = [];
      this.state.error = msg;
      this.emit();
      this.log('Voices FAIL', { msg });
      return [];
    }
  }

  private async ensureSpanishDefaults() {
    try {
      const voices = this.state.availableVoices;
      const preferred = this.pickSpanishVoice(voices);
      if (preferred?.id) {
        await Tts.setDefaultVoice(preferred.id);
        this.state.voiceId = preferred.id;
        this.emit();
        this.log('Default voice set', { voiceId: preferred.id, lang: preferred.language });
        return;
      }
      // Fallback idioma
      try {
        await Tts.setDefaultLanguage(DEFAULT_SPANISH_LANG);
        this.log('Default language set', { lang: DEFAULT_SPANISH_LANG });
      } catch (e: any) {
        this.log('setDefaultLanguage FAIL', { msg: e?.message });
      }

      if (!voices?.length) {
        const msg = 'No hay motor/voces TTS en el dispositivo. Instala "Speech Services by Google".';
        this.lastError = msg;
        this.state.error = msg;
        this.emit();
      } else {
        const msg = 'No se encontró voz de Español. Descarga un paquete es-* en el motor TTS.';
        this.lastError = msg;
        this.state.error = msg;
        this.emit();
      }
    } catch (e: any) {
      this.log('ensureSpanishDefaults FAIL', { msg: e?.message });
    }
  }

  // ---------- Opciones ----------
  async applyOptions(opts: Partial<TTSOptions>) {
    const next: TTSOptions = { ...this.getOptions(), ...opts };
    this.state.voiceId = next.voiceId;
    this.state.rate = next.rate;
    this.state.pitch = next.pitch;
    this.state.autoSpeak = next.autoSpeak;
    try {
      if (typeof next.rate === 'number') await Tts.setDefaultRate(next.rate);
      if (typeof next.pitch === 'number') await Tts.setDefaultPitch(next.pitch);
      if (next.voiceId) await Tts.setDefaultVoice(next.voiceId);
      this.emit();
      this.log('applyOptions OK', next as any);
    } catch (e: any) {
      const raw = e?.message ?? 'Error al aplicar opciones TTS';
      const msg = this.isNoEngineError(raw)
        ? 'No hay motor TTS instalado. Instala "Speech Services by Google" en el reloj y elige Español.'
        : raw;
      this.lastError = msg;
      this.state.error = msg;
      this.emit();
      this.log('applyOptions FAIL', { msg: raw });
    }
  }

  // ---------- Init ----------
  async init() {
    if (this.inited) return;
    this.inited = true;

    // Eventos nativos
    Tts.addEventListener('tts-start', () => {
      this.state.status = 'speaking';
      this.state.error = null;
      this.emit();
      this.log('event tts-start');
    });
    Tts.addEventListener('tts-finish', () => {
      this.state.status = 'idle';
      this.emit();
      this.log('event tts-finish');
    });
    Tts.addEventListener('tts-cancel', () => {
      this.state.status = 'stopped';
      this.emit();
      this.log('event tts-cancel');
    });
    Tts.addEventListener('tts-error', (e: any) => {
      const raw = e?.message ?? 'TTS error';
      const msg = this.isNoEngineError(raw)
        ? 'No hay motor TTS instalado. Instala "Speech Services by Google" en el reloj y elige Español.'
        : raw;
      this.state.status = 'error';
      this.state.error = msg;
      this.lastError = msg;
      this.emit();
      this.log('event tts-error', { msg: raw });
    });

    await this.applyOptions(this.getOptions());

    // Asegura init; si falla por no engine, intenta Google y reintenta
    try {
      await this.ensureInit();
    } catch (e: any) {
      if (this.isNoEngineError(e?.message)) {
        await this.ensureEngine();
        await this.ensureInit().catch(() => {});
      } else {
        throw e;
      }
    }

    // 1) cargar voces
    let voices = await this.refreshVoices();

    // 2) si no hay voces en Android/Wear, probar motor Google y reintentar
    if (Platform.OS === 'android' && (!voices || voices.length === 0)) {
      await this.ensureEngine();
      await this.ensureInit().catch(() => {});
      voices = await this.refreshVoices();
    }

    // 3) preferencia Español
    await this.ensureSpanishDefaults();
  }

  // ---------- Hablar ----------
  async speak(text: string) {
    try {
      await this.init();
      await this.ensureInit();
      if (!text || !text.trim()) return;

      // Si no hay voces aún, reintenta motor Google
      if (!this.state.availableVoices || this.state.availableVoices.length === 0) {
        await this.ensureEngine();
        await this.ensureInit().catch(() => {});
        await this.refreshVoices();
      }

      await this.ensureSpanishDefaults();

      try { await Tts.stop(); } catch {}
      this.state.lastText = text;
      this.emit();

      await Tts.speak(text);
      this.log('speak OK');
    } catch (e: any) {
      const raw = e?.message ?? 'Error al hablar';
      const msg = this.isNoEngineError(raw)
        ? 'No hay motor TTS instalado. Instala "Speech Services by Google" en el reloj y elige Español.'
        : raw;
      this.state.status = 'error';
      this.state.error = msg;
      this.lastError = msg;
      this.emit();
      this.log('speak FAIL', { msg: raw });
    }
  }

  async stop() {
    try {
      await this.init();
      await Tts.stop();
      this.state.status = 'stopped';
      this.emit();
      this.log('stop OK');
    } catch (e: any) {
      const msg = e?.message ?? 'Error al detener';
      this.state.status = 'error';
      this.state.error = msg;
      this.lastError = msg;
      this.emit();
      this.log('stop FAIL', { msg });
    }
  }

  async repeatLast() {
    if (this.state.lastText) {
      await this.speak(this.state.lastText);
    }
  }

  // ---------- Atajos ----------
  async setAutoSpeak(v: boolean) { await this.applyOptions({ autoSpeak: v }); }
  async setRate(v: number) { await this.applyOptions({ rate: v }); }
  async setPitch(v: number) { await this.applyOptions({ pitch: v }); }
  async setVoice(id?: string) {
    await this.applyOptions({ voiceId: id });
    if (!id) await this.ensureSpanishDefaults();
  }

  // ---------- DIAGNÓSTICO PÚBLICO ----------
  /** Devuelve foto del estado + últimos logs para depurar en UI/console */
  getDebugInfo() {
    return {
      state: { ...this.state },
      lastError: this.lastError,
      logs: [...this.logRing],
      platform: Platform.OS,
      install: this.getEngineInstallUrl(),
    };
  }

  /**
   * Prueba integral: init -> voces -> español -> speak(sample)
   * Devuelve resultado paso a paso para detectar el corte.
   */
  async selfTest(sample: string = 'Hola, soy ALMA hablando en Español.') {
    const steps: { step: string; ok: boolean; note?: string }[] = [];
    const record = (step: string, ok: boolean, note?: string) => steps.push({ step, ok, note });

    try {
      await this.init();
      record('init', true);
    } catch (e: any) {
      record('init', false, e?.message);
      return { ok: false, steps, info: this.getDebugInfo() };
    }

    try {
      await this.ensureInit();
      record('ensureInit', true);
    } catch (e: any) {
      record('ensureInit', false, e?.message);
      return { ok: false, steps, info: this.getDebugInfo() };
    }

    let voices = await this.refreshVoices();
    record('voices_loaded', voices.length > 0, `count=${voices.length}`);

    if (Platform.OS === 'android' && voices.length === 0) {
      await this.ensureEngine();
      try { await this.ensureInit(); } catch {}
      voices = await this.refreshVoices();
      record('engine_retry', voices.length > 0, `count=${voices.length}`);
    }

    try {
      await this.ensureSpanishDefaults();
      record('spanish_defaults', true, this.state.voiceId ? `voice=${this.state.voiceId}` : 'lang=fallback');
    } catch (e: any) {
      record('spanish_defaults', false, e?.message);
    }

    try {
      await this.speak(sample);
      record('speak', true);
    } catch (e: any) {
      record('speak', false, e?.message);
    }

    return { ok: true, steps, info: this.getDebugInfo() };
  }
}

export default TTSService.I;
