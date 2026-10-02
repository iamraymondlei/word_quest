export interface BilingualText {
  en: string;
  zh: string;
}

/**
 * Robustly parses bilingual content from database text, JSON string, or object.
 * Supports:
 * - Direct object: { en: "...", zh: "..." }
 * - JSON string: '{"en":"...","zh":"..."}'
 * - Dual tags: "EN: ... \nZH: ..." or "英文: ... \n中文: ..."
 * - Pure Chinese string (returns { en: '', zh: string })
 * - Pure English string (returns { en: string, zh: '' })
 */
export function parseBilingual(raw: any): BilingualText {
  if (!raw) return { en: '', zh: '' };

  if (typeof raw === 'object' && raw !== null) {
    return {
      en: typeof raw.en === 'string' ? raw.en.trim() : '',
      zh: typeof raw.zh === 'string' ? raw.zh.trim() : ''
    };
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return { en: '', zh: '' };

    // Try parsing as JSON object
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const obj = JSON.parse(trimmed);
        if (obj && typeof obj === 'object') {
          return {
            en: typeof obj.en === 'string' ? obj.en.trim() : '',
            zh: typeof obj.zh === 'string' ? obj.zh.trim() : ''
          };
        }
      } catch (_) {
        // Not valid JSON, continue with regex parsing
      }
    }

    // Try dual tags: EN:... ZH:... or 英文:... 中文/粤语:...
    const enMatch = trimmed.match(/(?:^|\n)(?:EN|English|英文)[:：]\s*([\s\S]*?)(?=(?:\n(?:ZH|Chinese|中文|粤语|粵語|Cantonese)[:：])|$)/i);
    const zhMatch = trimmed.match(/(?:^|\n)(?:ZH|Chinese|中文|粤语|粵語|Cantonese)[:：]\s*([\s\S]*?)(?=(?:\n(?:EN|English|英文)[:：])|$)/i);
    if (enMatch || zhMatch) {
      return {
        en: enMatch ? enMatch[1].trim() : '',
        zh: zhMatch ? zhMatch[1].trim() : ''
      };
    }

    // If string has Chinese characters:
    const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
    if (hasChinese) {
      return { en: '', zh: trimmed };
    }

    // Otherwise treat as English
    return { en: trimmed, zh: '' };
  }

  return { en: '', zh: '' };
}

/**
 * Formats a bilingual object to a compact JSON string for database storage.
 */
export function formatBilingual(entry: BilingualText | string): string {
  if (typeof entry === 'string') {
    const parsed = parseBilingual(entry);
    if (!parsed.en && !parsed.zh) return '';
    return JSON.stringify(parsed);
  }
  if (!entry || (!entry.en && !entry.zh)) return '';
  return JSON.stringify({ en: entry.en.trim(), zh: entry.zh.trim() });
}

/**
 * Formats bilingual text for plain single-line or summary preview in tables.
 */
export function formatBilingualSummary(raw: any): { en: string; zh: string; isBilingual: boolean } {
  const parsed = parseBilingual(raw);
  return {
    en: parsed.en,
    zh: parsed.zh,
    isBilingual: Boolean(parsed.en && parsed.zh)
  };
}

/**
 * Web Speech API player prioritizing native Cantonese (zh-HK / yue) and English (en-US).
 */
export function playBilingualSpeech(
  text: string,
  lang: 'en' | 'yue' | 'zh' = 'en',
  onUnsupported?: () => void
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    onUnsupported?.();
    return;
  }
  if (!text || !text.trim()) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  if (lang === 'yue' || lang === 'zh') {
    utter.lang = 'zh-HK';
    utter.rate = 0.92;

    // 1. Prioritize Cantonese-specific locale identifiers
    const cantoneseLocales = ['zh-hk', 'yue-hant-hk', 'yue-hk', 'zh-yue', 'zh-mo', 'yue'];
    let voice = voices.find(v => {
      const l = v.lang.toLowerCase().replace('_', '-');
      return cantoneseLocales.some(c => l === c || l.startsWith(c));
    });

    // 2. Prioritize voice names explicitly indicating Cantonese / Hong Kong / 粤语 / 廣東話
    if (!voice) {
      const cantoneseKeywords = ['cantonese', 'hong kong', '粤语', '廣東話', 'sin-ji', 'sinji', 'tracy', 'danny', 'hiugaai', 'hiumaan'];
      voice = voices.find(v => {
        const n = v.name.toLowerCase();
        return cantoneseKeywords.some(k => n.includes(k));
      });
    }

    // 3. Fallback to any voice with 'hk' in its locale code
    if (!voice) {
      voice = voices.find(v => v.lang.toLowerCase().includes('hk'));
    }

    // 4. Fallback to general Chinese voice if device has no Cantonese voice installed
    if (!voice) {
      voice = voices.find(v => v.lang.toLowerCase().startsWith('zh'));
    }

    if (voice) utter.voice = voice;
  } else {
    utter.lang = 'en-US';
    utter.rate = 0.88;
    const enVoice = voices.find(v => v.lang.startsWith('en') && (v.localService || !v.voiceURI.includes('Google')))
                 || voices.find(v => v.lang.startsWith('en'));
    if (enVoice) utter.voice = enVoice;
  }

  window.speechSynthesis.speak(utter);
}
