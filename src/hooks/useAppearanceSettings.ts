/**
 * useAppearanceSettings — Font and send behavior preferences (#196)
 */
import { useState, useCallback } from 'react';

export type ChatFont = 'default' | 'system' | 'dyslexic';
export type SendBehavior = 'enter' | 'cmd-enter';

const FONT_KEY = 'isa_chat_font';
const SEND_KEY = 'isa_send_behavior';

function read<T extends string>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try { return (localStorage.getItem(key) as T) || fallback; } catch { return fallback; }
}

export function useAppearanceSettings() {
  const [font, setFontState] = useState<ChatFont>(() => read(FONT_KEY, 'default'));
  const [sendBehavior, setSendState] = useState<SendBehavior>(() => read(SEND_KEY, 'enter'));

  const setFont = useCallback((f: ChatFont) => {
    setFontState(f);
    try { localStorage.setItem(FONT_KEY, f); } catch {}
  }, []);

  const setSendBehavior = useCallback((s: SendBehavior) => {
    setSendState(s);
    try { localStorage.setItem(SEND_KEY, s); } catch {}
  }, []);

  return { font, setFont, sendBehavior, setSendBehavior };
}
