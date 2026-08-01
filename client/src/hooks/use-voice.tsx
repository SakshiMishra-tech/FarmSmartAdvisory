import { useState, useCallback } from 'react';

interface VoiceSettings {
  enabled: boolean;
  language: string;
  rate: number;
  pitch: number;
}

export function useVoice() {
  const [isSupported] = useState(() => 'speechSynthesis' in window);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('voice-settings');
    return saved ? JSON.parse(saved) : {
      enabled: true,
      language: 'en-US',
      rate: 1,
      pitch: 1
    };
  });

  const speak = useCallback((text: string, language?: string) => {
    if (!isSupported || !settings.enabled) return;

    // Stop any current speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || settings.language;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, [isSupported, settings]);

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const updateSettings = useCallback((newSettings: Partial<VoiceSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem('voice-settings', JSON.stringify(updated));
  }, [settings]);

  return {
    isSupported,
    isSpeaking,
    settings,
    speak,
    stop,
    updateSettings
  };
}
