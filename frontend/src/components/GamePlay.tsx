import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Island } from './AdventureMap';
import { FormBoundary } from './FormBoundary';
import { SuspenseState } from './SuspenseState';
import {
  PixelHeart,
  DifficultyCard,
  CastleSidePillars,
  CastleRoofCanvas,
  CastleFloorRow,
  MonsterSprite
} from './StoryChaseAssets';
import { isIPadOrTabletDevice } from '../utils/device';
import './GamePlay.css';

export interface GameSettings {
  monster_speed_slow: number;
  monster_speed_medium: number;
  monster_speed_fast: number;
  monster_retreat_distance: number;
  monster_wait_seconds: number;
  consecutive_error_limit: number;
  max_lines_per_page: number;
  initial_hearts: number;
  coins_completion: number;
  coins_speed_bonus: number;
  coins_full_hearts_bonus: number;
  monster_emojis: string[];
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  monster_speed_slow: 1.5,
  monster_speed_medium: 2.5,
  monster_speed_fast: 4.0,
  monster_retreat_distance: 5,
  monster_wait_seconds: 5,
  consecutive_error_limit: 10,
  max_lines_per_page: 5,
  initial_hearts: 3,
  coins_completion: 150,
  coins_speed_bonus: 50,
  coins_full_hearts_bonus: 30,
  monster_emojis: ['👻']
};

export interface StoryChaseLine {
  lineIndex: number;
  text: string;
  startCharGlobal: number;
  endCharGlobal: number;
}

export interface StoryChasePage {
  pageIndex: number;
  lines: StoryChaseLine[];
  pageText: string;
  totalChars: number;
}

interface Props {
  island: Island;
  gameMode: 'story' | 'listening' | 'translation' | 'falling';
  currentUser: {
    id: number;
    username: string;
    avatar: string;
    coins: number;
  };
  theme?: 'cyber' | 'bright';
  fontScale?: '100' | '115' | '130';
  onThemeChange?: (theme: 'cyber' | 'bright') => void;
  onFontScaleChange?: (scale: '100' | '115' | '130') => void;
  onBack: () => void;
  onProgressUpdated: () => void;
}

export const GamePlay: React.FC<Props> = ({
  island,
  gameMode,
  currentUser,
  theme = 'cyber',
  fontScale = '130',
  onThemeChange,
  onFontScaleChange,
  onBack,
  onProgressUpdated
}) => {
  const [translationMode, setTranslationMode] = useState<'word' | 'sentence' | 'off'>('word');

  interface BubbleState {
    top: number;
    left: number;
    type: 'word' | 'sentence';
    original: string;
    translation: string;
    sentence?: string;
    sentence_translation?: string;
  }
  const [activeBubble, setActiveBubble] = useState<BubbleState | null>(null);

  const [userInputs, setUserInputs] = useState<string[]>([]);
  const [stage, setStage] = useState<'story' | 'listening' | 'translation' | 'falling' | 'success' | 'listening_success' | 'translation_success' | 'falling_success'>('story');
  const [feedback, setFeedback] = useState<{ isError: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Audio Hint state & Slot focus state
  const [audioRates, setAudioRates] = useState<Record<number, number>>({});
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const [focusedInputIdx, setFocusedInputIdx] = useState<number | null>(null);
  const [cursorPosMap, setCursorPosMap] = useState<Record<number, number>>({});
  const [selectionEndMap, setSelectionEndMap] = useState<Record<number, number>>({});
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const updateCursorPos = (idx: number, target: HTMLInputElement) => {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    setCursorPosMap(prev => {
      if (prev[idx] === start && selectionEndMap[idx] === end) return prev;
      return { ...prev, [idx]: start };
    });
    setSelectionEndMap(prev => {
      if (prev[idx] === end) return prev;
      return { ...prev, [idx]: end };
    });
  };

  const handleSlotClick = (idx: number, globalCharIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const inputEl = inputRefs.current[idx];
    if (inputEl) {
      inputEl.focus();
      inputEl.setSelectionRange(globalCharIdx, globalCharIdx);
      setCursorPosMap(prev => ({ ...prev, [idx]: globalCharIdx }));
      setSelectionEndMap(prev => ({ ...prev, [idx]: globalCharIdx }));
      setFocusedInputIdx(idx);
    }
  };

  const handlePlayAudioHint = (idx: number, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('⚠️ Your browser does not support Speech Synthesis API.');
      return;
    }

    window.speechSynthesis.cancel(); // Stop any active playback

    const rate = audioRates[idx] ?? 1.0;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate;

    utterance.onstart = () => setPlayingIdx(idx);
    utterance.onend = () => setPlayingIdx(null);
    utterance.onerror = () => setPlayingIdx(null);

    window.speechSynthesis.speak(utterance);
  };

  // --- Story Chase (Stage 2) state and refs ---
  const [chaseGameSettings, setChaseGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [chaseSelectedSpeed, setChaseSelectedSpeed] = useState<'slow' | 'medium' | 'fast' | null>(null);
  const [chaseHearts, setChaseHearts] = useState<number>(3);
  const [chasePageIdx, setChasePageIdx] = useState<number>(0);
  const [chaseTypedText, setChaseTypedText] = useState<string>('');
  const [chaseMonsterPos, setChaseMonsterPos] = useState<number>(0);
  const [chaseMonsterWaiting, setChaseMonsterWaiting] = useState<boolean>(true);
  const [chaseWaitCountdown, setChaseWaitCountdown] = useState<number>(5);
  const [, setChaseMonsterPool] = useState<string[]>(DEFAULT_GAME_SETTINGS.monster_emojis);
  const [chaseCurrentMonster, setChaseCurrentMonster] = useState<string>('👾');
  const [chaseIsGameOver, setChaseIsGameOver] = useState<boolean>(false);
  const [chaseIsSuccess, setChaseIsSuccess] = useState<boolean>(false);
  const [chaseShakeEffect, setChaseShakeEffect] = useState<boolean>(false);
  const [chaseEarnedCoins, setChaseEarnedCoins] = useState<number>(0);
  const [chaseConsecutiveErrors, setChaseConsecutiveErrors] = useState<number>(0);
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const ttsSpeedRef = useRef<number>(1.0);
  const chaseInputRef = useRef<HTMLInputElement>(null);
  const chaseLastTickRef = useRef<number>(Date.now());

  // --- translation drill mode state and refs ---

  const playChineseTTS = (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('⚠️ Your browser does not support Speech Synthesis API.');
      return;
    }

    window.speechSynthesis.cancel(); // Stop any active playback

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-HK';
    utterance.rate = ttsSpeedRef.current;

    const voices = window.speechSynthesis.getVoices();
    const matchedVoice = voices.find(v => {
      const lang = v.lang.toLowerCase();
      const name = v.name.toLowerCase();
      return lang.includes('zh-hk') || lang.includes('cantonese') || name.includes('cantonese') || name.includes('hong kong') || name.includes('yue');
    });

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  interface SentenceStatItem {
    successCount: number;
    bestTimeSeconds: number | null;
    lastTimeSeconds: number | null;
  }

  interface WordToken {
    id: number;
    raw: string;
    prefix: string;
    clean: string;
    suffix: string;
  }

  const [translationSentenceIdx, setTranslationSentenceIdx] = useState<number>(0);
  const [translationStats, setTranslationStats] = useState<Record<number, SentenceStatItem>>({});
  const [translationStartTime, setTranslationStartTime] = useState<number | null>(null);
  const [translationElapsedTime, setTranslationElapsedTime] = useState<number>(0);
  const [translationTypedText, setTranslationTypedText] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [spokenTranscript, setSpokenTranscript] = useState<string>('');
  const [passedEffect, setPassedEffect] = useState<boolean>(false);
  const [matchingSubMode, setMatchingSubMode] = useState<'reading' | 'testing' | null>(null);
  const recognitionRef = useRef<any>(null);
  const translationInputRef = useRef<HTMLInputElement>(null);
  const translationNavItemRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const handleSwitchSubMode = useCallback((mode: 'reading' | 'testing' | null) => {
    setMatchingSubMode(mode);
    setTranslationTypedText('');
    setSpokenTranscript('');
    setSpeechError(null);
    setPassedEffect(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (gameMode !== 'translation' || stage !== 'translation') return;

    translationNavItemRefs.current[translationSentenceIdx]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  }, [gameMode, stage, translationSentenceIdx]);

  const translationStatsStorageKey = React.useMemo(() => {
    return `wordquest_translation_stats_${currentUser?.id || 0}_${island?.id || 0}`;
  }, [currentUser?.id, island?.id]);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      if (!currentUser?.id || !island?.id) return;
      try {
        const res = await fetch(`/api/progress/get-translation-stats?user_id=${currentUser.id}&island_id=${island.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.stats && Object.keys(data.stats).length > 0) {
            if (isMounted) setTranslationStats(data.stats);
            try {
              localStorage.setItem(translationStatsStorageKey, JSON.stringify(data.stats));
            } catch (e) {}
            return;
          }
        }
      } catch (err) {
        console.error('Failed to fetch translation stats from API, fallback to localStorage:', err);
      }
      try {
        const saved = localStorage.getItem(translationStatsStorageKey);
        if (saved && isMounted) {
          setTranslationStats(JSON.parse(saved));
        } else if (isMounted) {
          setTranslationStats({});
        }
      } catch (err) {
        console.error('Failed to load translation stats from localStorage', err);
      }
    }
    loadStats();
    return () => { isMounted = false; };
  }, [currentUser?.id, island?.id, translationStatsStorageKey]);

  useEffect(() => {
    if (gameMode === 'translation' && stage === 'translation') {
      setTranslationStartTime(Date.now());
      setTranslationElapsedTime(0);
    }
  }, [translationSentenceIdx, gameMode, stage]);

  useEffect(() => {
    let timer: any;
    if (gameMode === 'translation' && stage === 'translation' && translationStartTime) {
      timer = setInterval(() => {
        setTranslationElapsedTime(Math.floor((Date.now() - translationStartTime) / 100) / 10);
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameMode, stage, translationStartTime]);

  // --- word falling game state and refs ---
  interface Bullet {
    id: number;
    currentX: number;
    currentY: number;
    targetX: number;
    targetY: number;
    targetWordId: number;
    wordText: string;
  }
  interface Explosion {
    id: number;
    x: number;
    y: number;
  }

  const [fallingGameState, setFallingGameState] = useState<'setup' | 'playing' | 'gameover' | 'victory'>('setup');
  const [difficulty, setDifficulty] = useState({ label: 'NORMAL', speed: 1.0, multiplier: 1.0 });
  const [shield, setShield] = useState<number>(5);
  const [score, setScore] = useState<number>(0);
  const [fallingInputText, setFallingInputText] = useState<string>('');
  const [fallingWords, setFallingWords] = useState<any[]>([]);
  const [earnedCoins, setEarnedCoins] = useState<number>(0);

  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const [isBaseHit, setIsBaseHit] = useState<boolean>(false);

  const difficultyRef = useRef(difficulty);
  const fallingWordsRef = useRef<any[]>([]);
  const shieldRef = useRef(5);
  const scoreRef = useRef(0);
  const totalSpawnedRef = useRef(0);
  const bulletsRef = useRef<Bullet[]>([]);

  // Play TTS voice
  const playTTS = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = ttsSpeedRef.current;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Generate title, passage and questions
  const { title, passage, questions } = React.useMemo(() => {
    const title = island.story_title?.trim() || `Welcome to ${island.name}!`;

    let passage = island.story_passage?.trim();
    if (!passage) {
      const wordListStr = (island.words || []).map(w => w.word).join(', ');
      passage = `Welcome to ${island.name}! Let's learn these words: ${wordListStr}. Can you read the sentences and answer the questions?`;
      const sentences = (island.words || []).map(w => w.sentence).filter(Boolean).join(' ');
      if (sentences) {
        passage += ' ' + sentences;
      }
    }

    let questions = [];
    if (island.story_questions && Array.isArray(island.story_questions) && island.story_questions.length > 0) {
      questions = island.story_questions;
    } else {
      questions = (island.words || []).slice(0, 3).map(w => {
        const hint = w.sentence.replace(new RegExp(`\\b${w.word}\\b`, 'gi'), '______');
        return {
          question: `Translate this sentence: "${w.sentence_translation}"`,
          hint: hint,
          answer: w.sentence
        };
      });
    }

    return { title, passage, questions };
  }, [island]);



  // Reset state on island or gameMode changes
  useEffect(() => {
    setUserInputs(new Array(questions.length).fill(''));
    setActiveBubble(null);
    setStage(gameMode);
    setFeedback(null);

    // Reset Story Chase (Stage 2) state
    setChaseSelectedSpeed(null);
    setChaseHearts(chaseGameSettings.initial_hearts || 3);
    setChasePageIdx(0);
    setChaseTypedText('');
    setChaseMonsterPos(0);
    setChaseMonsterWaiting(true);
    setChaseWaitCountdown(chaseGameSettings.monster_wait_seconds || 5);
    setChaseIsGameOver(false);
    setChaseIsSuccess(false);
    setChaseConsecutiveErrors(0);
    setChaseShakeEffect(false);
    setChaseEarnedCoins(0);

    // Reset translation state
    setTranslationSentenceIdx(0);
    setTranslationTypedText('');
    setMatchingSubMode(null);
    setIsListening(false);
    setSpeechError(null);
    setSpokenTranscript('');
    setPassedEffect(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    // Reset falling state
    setFallingGameState('setup');
    setDifficulty({ label: 'NORMAL', speed: 1.0, multiplier: 1.0 });
    setShield(5);
    setScore(0);
    setFallingWords([]);
    setFallingInputText('');
    setEarnedCoins(0);
    setBullets([]);
    setExplosions([]);
    bulletsRef.current = [];
  }, [island, gameMode, questions.length]);

  // Clear bubble when translation mode switches
  useEffect(() => {
    setActiveBubble(null);
  }, [translationMode]);

  const cleanText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/[’‘`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[，。！？；：]/g, ' ')
      .replace(/[\p{P}\p{S}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const isQuestionCorrect = (input: string, expected: string) => {
    if (!input || !expected) return false;
    return cleanText(input).toLowerCase() === cleanText(expected).toLowerCase();
  };

  const allCorrect = questions.length > 0 && questions.every((q, idx) => isQuestionCorrect(userInputs[idx], q.answer));

  const handleInputChange = (idx: number, val: string) => {
    const maxLen = (questions[idx]?.answer?.length || 0) + 35;
    const capped = maxLen > 0 && val.length > maxLen ? val.slice(0, maxLen) : val;
    setUserInputs(prev => {
      const next = [...prev];
      next[idx] = capped;
      return next;
    });
  };


  const handleTouchClear = (idx: number) => {
    const inputEl = inputRefs.current[idx];
    setUserInputs(prev => {
      const next = [...prev];
      next[idx] = '';
      return next;
    });
    setCursorPosMap(prev => ({ ...prev, [idx]: 0 }));
    setSelectionEndMap(prev => ({ ...prev, [idx]: 0 }));

    if (inputEl) {
      inputEl.focus();
      setTimeout(() => inputEl.setSelectionRange(0, 0), 0);
    }
  };

  const renderUnderlineSlots = (idx: number, answer: string, userInput: string, disabled?: boolean) => {
    if (!answer) return null;

    const targetSentence = answer;
    const len = targetSentence.length;
    const isFocused = focusedInputIdx === idx;
    const start = cursorPosMap[idx] ?? userInput.length;
    const end = selectionEndMap[idx] ?? start;
    const isSelectingRange = isFocused && end > start;

    // Word count & letter count statistics for hint badge
    const targetWords = targetSentence.split(' ').filter(Boolean);
    const wordLengths = targetWords.map(w => w.replace(/[^a-zA-Z0-9]/g, '').length || w.length);

    const renderCaret = () => (
      <span className="bg-cyan-400 animate-pulse w-0.5 h-6 align-middle inline-block mx-px shadow-[0_0_10px_rgba(0,240,255,0.8)] font-mono"></span>
    );

    const displayLen = Math.max(len, userInput.length);

    const chars = [];
    for (let i = 0; i < displayLen; i++) {
      if (isFocused && !isSelectingRange && start === i) {
        chars.push(
          <React.Fragment key={`cursor-${i}`}>
            {renderCaret()}
          </React.Fragment>
        );
      }

      const char = userInput[i];
      const targetChar = targetSentence[i];

      if (isSelectingRange && i >= start && i < end) {
        const displayChar = char !== undefined ? (char === ' ' ? '\u00A0' : char) : (targetChar === ' ' ? '\u00A0' : (/^[a-zA-Z0-9]$/.test(targetChar) ? '\u00A0' : targetChar));
        chars.push(
          <span
            key={i}
            onClick={(e) => handleSlotClick(idx, i, e)}
            className="bg-sky-500 text-white rounded shadow-sm ring-1 ring-sky-300 font-mono inline-block font-bold cursor-pointer pointer-events-auto mx-0.5 text-center min-w-[0.85rem]"
          >
            {displayChar}
          </span>
        );
      } else if (char !== undefined) {
        const isWithinTarget = i < len;
        const isMatch = isWithinTarget && (char.toLowerCase() === targetChar?.toLowerCase() || (cleanText(char) === '' && cleanText(targetChar) === ''));
        let styleClass = '';
        if (isMatch) {
          if (targetChar === ' ') {
            styleClass = 'w-3 sm:w-4 font-mono inline-block text-center';
          } else {
            styleClass = 'text-emerald-400 font-extrabold font-mono border-b-2 border-emerald-400 shadow-sm mx-0.5 inline-block min-w-[0.85rem] sm:min-w-[1rem] text-center';
          }
        } else {
          styleClass = 'text-rose-500 font-extrabold border-b-2 border-rose-500 animate-pulse font-mono mx-0.5 inline-block min-w-[0.85rem] sm:min-w-[1rem] text-center';
        }

        chars.push(
          <span
            key={i}
            onClick={(e) => handleSlotClick(idx, i, e)}
            className={`transition-all inline-block cursor-pointer pointer-events-auto ${styleClass}`}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      } else {
        const isAlphanumeric = /^[a-zA-Z0-9]$/.test(targetChar);
        const isSpace = targetChar === ' ';
        chars.push(
          <span
            key={i}
            onClick={(e) => handleSlotClick(idx, i, e)}
            className={`font-mono cursor-pointer pointer-events-auto transition-all inline-block text-center ${
              isAlphanumeric
                ? 'mx-0.5 min-w-[0.85rem] sm:min-w-[1rem] inline-block text-center border-b-2 border-slate-600 font-mono text-slate-400 hover:border-cyan-400'
                : (isSpace ? 'w-3 sm:w-4' : 'text-slate-400 font-bold mx-0.5')
            }`}
          >
            {isAlphanumeric ? '\u00A0' : (isSpace ? '\u00A0' : targetChar)}
          </span>
        );
      }
    }

    if (isFocused && !isSelectingRange && start >= displayLen) {
      chars.push(
        <React.Fragment key={`cursor-end`}>
          {renderCaret()}
        </React.Fragment>
      );
    }

    return (
      <div className="mb-4">
        {/* Audio Hint Bar with Play & Speed Rate Controls + Touch Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 theme-card p-2.5 rounded-xl border theme-border shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePlayAudioHint(idx, answer);
              }}
              aria-label="播放当前句子原声提示 (Play audio hint)"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors flex items-center gap-1.5 cursor-pointer relative z-20 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                playingIdx === idx
                  ? 'bg-amber-500 text-white shadow-md animate-pulse'
                  : 'theme-accent-btn shadow-sm'
              }`}
            >
              <span>{playingIdx === idx ? '🔊 Playing…' : '🔊 Audio Hint'}</span>
            </button>

            {/* iPad Touch Action Buttons */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleTouchClear(idx);
              }}
              aria-label="清空并重填当前句子"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors bg-slate-700/60 hover:bg-slate-700 text-slate-300 border border-slate-600 flex items-center gap-1 cursor-pointer relative z-20 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              🗑️ 重填
            </button>
          </div>

          <div className="flex items-center gap-1 relative z-20">
            <span className="text-[10px] font-mono theme-text-muted mr-1 hidden sm:inline">Rate:</span>
            {[0.5, 0.75, 1.0, 1.25].map((rate) => {
              const currentRate = audioRates[idx] ?? 1.0;
              const isActive = currentRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAudioRates(prev => ({ ...prev, [idx]: rate }));
                  }}
                  aria-label={`朗读语速 ${rate} 倍速`}
                  aria-pressed={isActive}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums transition-colors cursor-pointer border focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                    isActive
                      ? 'theme-accent-btn shadow-sm'
                      : 'bg-black/10 dark:bg-white/10 theme-text border-white/10'
                  }`}
                >
                  {rate === 1.0 ? '1.0x' : rate === 0.5 ? '0.5x' : rate === 0.75 ? '0.75x' : '1.25x'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Header Info Badge */}
        <div className="flex items-center justify-between text-[11px] font-mono theme-text-muted mb-2">
          <span className="flex items-center gap-1 font-bold theme-text">
            📊 Structure Hint: {targetWords.length} Words
          </span>
          <span className="theme-text-muted">
            ({wordLengths.join(', ')} letters)
          </span>
        </div>

        {/* Direct Slot Typing Grid with Focus Ring & Hidden Overlay Input */}
        <div className="relative group cursor-text p-3 sm:p-4 theme-card rounded-xl border theme-border focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/40 transition-all shadow-inner">
          <input
            type="text"
            ref={(el) => { inputRefs.current[idx] = el; }}
            value={userInput}
            maxLength={len}
            onChange={(e) => {
              handleInputChange(idx, e.target.value);
              updateCursorPos(idx, e.target);
            }}
            onBeforeInput={(e: any) => {
              const inputType = e.nativeEvent?.inputType || e.inputType;
              if (inputType === 'insertFromDictation' || inputType === 'insertDictationPhrase') {
                e.preventDefault();
              }
            }}
            onSelect={(e) => updateCursorPos(idx, e.currentTarget)}
            onClick={(e) => updateCursorPos(idx, e.currentTarget)}
            onKeyUp={(e) => updateCursorPos(idx, e.currentTarget)}
            onKeyDown={(e) => updateCursorPos(idx, e.currentTarget)}
            onFocus={(e) => {
              setFocusedInputIdx(idx);
              updateCursorPos(idx, e.currentTarget);
            }}
            onBlur={() => setFocusedInputIdx(prev => prev === idx ? null : prev)}
            disabled={disabled}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10 outline-none"
            aria-label={`Decryption slot input ${idx + 1}`}
          />

          <div className="flex flex-wrap items-center gap-y-2 text-base sm:text-lg font-mono relative z-0 leading-relaxed">
            {chars}
          </div>
        </div>
      </div>
    );
  };

  // Word tokenization
  const tokenizePassage = (text: string, wordsList: any[]) => {
    const regex = /([a-zA-Z'-]+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          text: text.substring(lastIndex, match.index),
          isWord: false
        });
      }
      const wordText = match[0];
      const cleaned = wordText.toLowerCase().replace(/'s?$/i, "");

      const matchedWord = wordsList.find(
        w => w.word.toLowerCase().replace(/'s?$/i, "").trim() === cleaned ||
             w.word.toLowerCase().trim() === wordText.toLowerCase().trim()
      );

      parts.push({
        text: wordText,
        isWord: true,
        matchedWord: matchedWord || null
      });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push({
        text: text.substring(lastIndex),
        isWord: false
      });
    }

    return parts;
  };


  const findSentenceTranslation = (sentenceText: string, wordsList: any[]) => {
    const cleaned = cleanText(sentenceText).toLowerCase();
    
    let match = wordsList.find(w => cleanText(w.sentence).toLowerCase() === cleaned);
    if (match) return match.sentence_translation;

    match = wordsList.find(w => cleaned.includes(cleanText(w.sentence).toLowerCase()) || cleanText(w.sentence).toLowerCase().includes(cleaned));
    if (match) return match.sentence_translation;

    return null;
  };

  // Click handlers
  const handleWordClick = (wordObj: any, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + window.scrollX + (rect.width / 2);
    setActiveBubble({
      top,
      left,
      type: 'word',
      original: wordObj.word,
      translation: wordObj.translation,
      sentence: wordObj.sentence,
      sentence_translation: wordObj.sentence_translation
    });
  };

  const handleSentenceClick = (
    sentenceObjOrText: string | { sentence_text: string; translation: string },
    e: React.MouseEvent
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + window.scrollX + (rect.width / 2);

    let original = '';
    let translation = '';

    if (typeof sentenceObjOrText === 'string') {
      original = sentenceObjOrText;
      const trans = findSentenceTranslation(sentenceObjOrText, island.words || []);
      translation = trans || 'No translation available for this sentence. Click the core words to translate!';
    } else {
      original = sentenceObjOrText.sentence_text;
      translation = sentenceObjOrText.translation || 'No translation available for this sentence. Click the core words to translate!';
    }

    setActiveBubble({
      top,
      left,
      type: 'sentence',
      original,
      translation
    });
  };

  // Stage clear updates
  const handleCompleteStory = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/progress/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          island_id: island.id,
          completed_stage: 1,
          stage: 2
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setFeedback({ isError: true, message: `❌ Progress update failed: ${errData.error || 'Server Error'}` });
        setIsSaving(false);
        return;
      }

      const coinRes = await fetch('/api/users/add-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          coins: 100
        })
      });

      if (!coinRes.ok) {
        const errData = await coinRes.json().catch(() => ({}));
        setFeedback({ isError: true, message: `❌ Coin reward save failed: ${errData.error || 'Server Error'}` });
        setIsSaving(false);
        return;
      }

      onProgressUpdated();
      setStage('success');
    } catch (err) {
      setFeedback({ isError: true, message: '❌ Network connection failed. Please check your network and try again!' });
    } finally {
      setIsSaving(false);
    }
  };

  // Group sentences in story_passage_json by paragraph_num into paragraphs
  const paragraphs = React.useMemo(() => {
    if (!island.story_passage_json || island.story_passage_json.length === 0) {
      return null;
    }

    const groupedMap = new Map<number, typeof island.story_passage_json>();
    island.story_passage_json.forEach((item) => {
      const pNum = item.paragraph_num || 1;
      if (!groupedMap.has(pNum)) {
        groupedMap.set(pNum, []);
      }
      groupedMap.get(pNum)!.push(item);
    });

    const sortedParagraphNums = Array.from(groupedMap.keys()).sort((a, b) => a - b);
    return sortedParagraphNums.map((pNum) => {
      const sentences = groupedMap.get(pNum)!;
      return sentences.sort((a, b) => (a.sentence_num || 1) - (b.sentence_num || 1));
    });
  }, [island.story_passage_json]);

  const splitParagraphsAndSentences = (text: string) => {
    if (!text) return [];
    const rawParagraphs = text.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);
    return rawParagraphs.map((paraText) => {
      const matches = paraText.match(/[^.!?]+(?:[.!?]+['"’”)]*|(?=$))/g) || [paraText];
      return matches.map((s) => s.trim()).filter(Boolean);
    });
  };

  // Render passage content with Spotlight Reading Mode
  const renderPassage = () => {
    if (paragraphs && paragraphs.length > 0) {
      return (
        <div className="space-y-6">
          {paragraphs.map((paraSentences, paraIdx) => (
            <div
              key={paraIdx}
              className="paragraph-block p-4 sm:p-5 rounded-2xl theme-card border theme-border shadow-md leading-relaxed theme-text font-mono font-medium text-base sm:text-lg lg:text-xl transition-all"
            >
              {paraSentences.map((sentence, sentIdx) => {
                const isSelected = activeBubble?.original === sentence.sentence_text;
                if (translationMode === 'off') {
                  return (
                    <span key={sentIdx} className="theme-text">
                      {sentence.sentence_text}{' '}
                    </span>
                  );
                }
                if (translationMode === 'sentence') {
                  return (
                    <span
                      key={sentIdx}
                      className={`cursor-pointer px-1 rounded transition-all duration-200 relative inline-block group ${
                        isSelected
                          ? 'bg-cyan-500/20 border-b-2 border-cyan-400 theme-text font-bold shadow-[0_0_10px_rgba(0,240,255,0.3)] opacity-100'
                          : 'opacity-70 hover:opacity-100 hover:bg-cyan-500/10 hover:border-b-2 hover:border-cyan-400 theme-text font-medium'
                      }`}
                      onClick={(e) => handleSentenceClick(sentence, e)}
                      title="Click to view spotlight translation"
                    >
                      {sentence.sentence_text}{' '}
                    </span>
                  );
                }
                // word mode
                return (
                  <span key={sentIdx}>
                    {tokenizePassage(sentence.sentence_text, island.words || []).map((token, tokenIdx) => {
                      if (token.isWord && token.matchedWord) {
                        const isWordSelected = activeBubble?.original === token.matchedWord.word;
                        return (
                          <span
                            key={tokenIdx}
                            className={`cursor-pointer px-1 rounded transition-all duration-150 inline-block font-bold ${
                              isWordSelected
                                ? 'bg-cyan-500/30 text-cyan-400 border-b-2 border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.4)] opacity-100'
                                : 'text-cyan-500 border-b border-dashed border-cyan-500/50 hover:bg-cyan-500/20 opacity-90 hover:opacity-100'
                            }`}
                            onClick={(e) => handleWordClick(token.matchedWord, e)}
                          >
                            {token.text}
                          </span>
                        );
                      }
                      return <span key={tokenIdx}>{token.text}</span>;
                    })}
                    {' '}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    const paraGroups = splitParagraphsAndSentences(passage);
    if (paraGroups.length > 0) {
      return (
        <div className="space-y-6">
          {paraGroups.map((sentences, paraIdx) => (
            <div
              key={paraIdx}
              className="paragraph-block p-4 sm:p-5 rounded-2xl theme-card border theme-border shadow-md leading-relaxed theme-text font-mono font-medium text-base sm:text-lg lg:text-xl transition-all"
            >
              {sentences.map((sentText, sentIdx) => {
                const isSelected = activeBubble?.original === sentText;
                if (translationMode === 'off') {
                  return (
                    <span key={sentIdx} className="theme-text">
                      {sentText}{' '}
                    </span>
                  );
                }
                if (translationMode === 'sentence') {
                  return (
                    <span
                      key={sentIdx}
                      className={`cursor-pointer px-1 rounded transition-all duration-200 relative inline-block group ${
                        isSelected
                          ? 'bg-cyan-500/20 border-b-2 border-cyan-400 text-white font-medium shadow-[0_0_10px_rgba(0,240,255,0.3)] opacity-100'
                          : 'opacity-60 hover:opacity-100 hover:bg-cyan-500/20 hover:border-b-2 hover:border-cyan-400 hover:text-white font-medium'
                      }`}
                      onClick={(e) => handleSentenceClick(sentText, e)}
                      title="Click to view Cyberpunk spotlight translation"
                    >
                      {sentText}{' '}
                    </span>
                  );
                }
                // word mode
                return (
                  <span key={sentIdx}>
                    {tokenizePassage(sentText, island.words || []).map((token, tokenIdx) => {
                      if (token.isWord && token.matchedWord) {
                        const isWordSelected = activeBubble?.original === token.matchedWord.word;
                        return (
                          <span
                            key={tokenIdx}
                            className={`cursor-pointer px-1 rounded transition-all duration-150 inline-block font-bold ${
                              isWordSelected
                                ? 'bg-cyan-500/30 text-cyan-300 border-b-2 border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.4)] opacity-100'
                                : 'text-cyan-300/90 border-b border-dashed border-cyan-500/50 hover:bg-cyan-500/20 hover:text-white opacity-80 hover:opacity-100'
                            }`}
                            onClick={(e) => handleWordClick(token.matchedWord, e)}
                          >
                            {token.text}
                          </span>
                        );
                      }
                      return <span key={tokenIdx}>{token.text}</span>;
                    })}
                    {' '}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  // Fetch global game settings on mount
  useEffect(() => {
    const loadGameSettings = async () => {
      try {
        const res = await fetch('/api/game-settings');
        if (res.ok) {
          const data = await res.json();
          setChaseGameSettings(data);
          setChaseHearts(data.initial_hearts || 3);
          setChaseMonsterPool(data.monster_emojis || DEFAULT_GAME_SETTINGS.monster_emojis);
        }
      } catch (err) {
        console.error('Failed to load global game settings', err);
      }
    };
    loadGameSettings();
  }, []);

  // Utility: shuffle array helper
  const shuffleList = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Build structured story pages
  const storyChasePages = React.useMemo<StoryChasePage[]>(() => {
    let rawSentences: string[] = [];
    if (island.story_passage_json && island.story_passage_json.length > 0) {
      rawSentences = island.story_passage_json.map(s => s.sentence_text.trim()).filter(Boolean);
    } else if (island.story_passage && island.story_passage.trim()) {
      const splits = island.story_passage.match(/[^.!?]+[.!?]+|\S+/g) || [island.story_passage];
      rawSentences = splits.map(s => s.trim()).filter(Boolean);
    } else if (island.words && island.words.length > 0) {
      rawSentences = island.words.map(w => w.sentence || `${w.word}: ${w.translation}`).filter(Boolean);
    } else {
      rawSentences = [
        "The brave little explorer stepped into the mysterious ancient forest.",
        "A friendly blue dinosaur was looking for shining golden stars.",
        "They ran together across the rainbow bridge before sunset.",
        "The magical treasure chest opened with bright sparkling light."
      ];
    }

    // Split raw text into natural, non-wrapping single-line floor chunks (<= 50 chars per floor)
    const floorLinesText: string[] = [];
    const maxCharsPerFloor = 50;

    for (const raw of rawSentences) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      if (trimmed.length <= maxCharsPerFloor) {
        floorLinesText.push(trimmed);
      } else {
        // Split by punctuation clauses first (e.g. comma, semicolon, dash)
        const clauses = trimmed.split(/([,;:\-]\s+)/);
        let cur = '';
        for (const cl of clauses) {
          if (!cl) continue;
          if ((cur + cl).length <= maxCharsPerFloor) {
            cur += cl;
          } else {
            if (cur.trim()) {
              floorLinesText.push(cur.trim());
              cur = '';
            }
            if (cl.length > maxCharsPerFloor) {
              const words = cl.split(/\s+/);
              for (const w of words) {
                if (!w) continue;
                if ((cur ? cur + ' ' + w : w).length <= maxCharsPerFloor) {
                  cur = cur ? cur + ' ' + w : w;
                } else {
                  if (cur.trim()) floorLinesText.push(cur.trim());
                  cur = w;
                }
              }
            } else {
              cur = cl;
            }
          }
        }
        if (cur.trim()) floorLinesText.push(cur.trim());
      }
    }

    // Prepend 4 spaces indent ONLY to the very first line of the entire story
    if (floorLinesText.length > 0 && !floorLinesText[0].startsWith('    ')) {
      floorLinesText[0] = '    ' + floorLinesText[0];
    }

    const maxLines = chaseGameSettings.max_lines_per_page || 5;
    const pages: StoryChasePage[] = [];

    for (let i = 0; i < floorLinesText.length; i += maxLines) {
      const pageSentences = floorLinesText.slice(i, i + maxLines);
      let charOffset = 0;
      const lines: StoryChaseLine[] = [];
      const joinedTexts: string[] = [];

      pageSentences.forEach((lineText, lineIdx) => {
        const lineLen = lineText.length;
        lines.push({
          lineIndex: lineIdx,
          text: lineText,
          startCharGlobal: charOffset,
          endCharGlobal: charOffset + lineLen
        });
        joinedTexts.push(lineText);
        charOffset += lineLen + 1; // single space connector
      });

      const fullPageText = joinedTexts.join(' ');
      pages.push({
        pageIndex: Math.floor(i / maxLines),
        lines,
        pageText: fullPageText,
        totalChars: fullPageText.length
      });
    }

    return pages.length > 0 ? pages : [{
      pageIndex: 0,
      lines: [{
        lineIndex: 0,
        text: "    The brave little explorer stepped into the magic world.",
        startCharGlobal: 0,
        endCharGlobal: 60
      }],
      pageText: "    The brave little explorer stepped into the magic world.",
      totalChars: 60
    }];
  }, [island, chaseGameSettings.max_lines_per_page]);

  const currentChasePage = storyChasePages[chasePageIdx] || storyChasePages[0];

  // Helper: compute length of strictly correct prefix
  const getChaseCorrectPrefixLen = useCallback((typed: string, target: string): number => {
    let len = 0;
    while (len < typed.length && len < target.length && typed[len] === target[len]) {
      len++;
    }
    return len;
  }, []);

  const chaseCorrectLen = getChaseCorrectPrefixLen(chaseTypedText, currentChasePage.pageText);

  // Helper: start or restart game with selected speed
  const handleStartStoryChase = (speed: 'slow' | 'medium' | 'fast') => {
    setChaseSelectedSpeed(speed);
    setChaseHearts(chaseGameSettings.initial_hearts || 3);
    setChasePageIdx(0);
    setChaseTypedText('');
    setChaseMonsterPos(0);
    setChaseMonsterWaiting(true);
    setChaseWaitCountdown(chaseGameSettings.monster_wait_seconds || 5);
    setChaseIsGameOver(false);
    setChaseIsSuccess(false);
    setChaseConsecutiveErrors(0);
    setChaseEarnedCoins(0);

    const pool = chaseGameSettings.monster_emojis && chaseGameSettings.monster_emojis.length > 0
      ? chaseGameSettings.monster_emojis
      : DEFAULT_GAME_SETTINGS.monster_emojis;
    const shuffled = shuffleList(pool);
    setChaseMonsterPool(shuffled);
    setChaseCurrentMonster(shuffled[0] || '👾');
    chaseLastTickRef.current = Date.now();

    setTimeout(() => {
      chaseInputRef.current?.focus();
    }, 100);
  };

  // Helper: reset on page change
  const handleNextChasePage = () => {
    const nextIdx = chasePageIdx + 1;
    if (nextIdx < storyChasePages.length) {
      setChasePageIdx(nextIdx);
      setChaseTypedText('');
      setChaseMonsterPos(0);
      setChaseMonsterWaiting(true);
      setChaseWaitCountdown(chaseGameSettings.monster_wait_seconds || 5);
      setChaseConsecutiveErrors(0);

      // Pick next monster from pool without repeating
      setChaseMonsterPool(prev => {
        let remaining = prev.slice(1);
        if (remaining.length === 0) {
          remaining = shuffleList(chaseGameSettings.monster_emojis && chaseGameSettings.monster_emojis.length > 0 ? chaseGameSettings.monster_emojis : DEFAULT_GAME_SETTINGS.monster_emojis);
        }
        setChaseCurrentMonster(remaining[0] || '👾');
        return remaining;
      });

      setTimeout(() => {
        chaseInputRef.current?.focus();
      }, 150);
    }
  };

  // Helper: completion of all pages
  const handleCompleteStoryChase = async () => {
    setIsSaving(true);
    setFeedback(null);

    // Calculate coins: base + speed bonus + full hearts bonus
    const baseCoins = chaseGameSettings.coins_completion || 150;
    const speedBonus = chaseSelectedSpeed === 'fast' ? (chaseGameSettings.coins_speed_bonus || 50) : 0;
    const fullHeartsBonus = chaseHearts === (chaseGameSettings.initial_hearts || 3) ? (chaseGameSettings.coins_full_hearts_bonus || 30) : 0;
    const totalCoins = baseCoins + speedBonus + fullHeartsBonus;
    setChaseEarnedCoins(totalCoins);

    try {
      const res = await fetch('/api/progress/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          island_id: island.id,
          completed_stage: 2,
          stage: 3
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setFeedback({ isError: true, message: `❌ Progress update failed: ${errData.error || 'Server Error'}` });
        setIsSaving(false);
        return;
      }

      const coinRes = await fetch('/api/users/add-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          coins: totalCoins
        })
      });

      if (!coinRes.ok) {
        const errData = await coinRes.json().catch(() => ({}));
        setFeedback({ isError: true, message: `❌ Failed to save coin reward: ${errData.error || 'Server Error'}` });
        setIsSaving(false);
        return;
      }

      onProgressUpdated();
      setChaseIsSuccess(true);
      setStage('listening_success');
    } catch (err) {
      setFeedback({ isError: true, message: '❌ Network connection failed. Please check your connection!' });
    } finally {
      setIsSaving(false);
    }
  };

  // Monster movement and chase game tick loop
  useEffect(() => {
    if (gameMode !== 'listening' || stage !== 'listening' || !chaseSelectedSpeed || chaseIsGameOver || chaseIsSuccess) {
      return;
    }

    chaseLastTickRef.current = Date.now();

    const speedMap: Record<string, number> = {
      slow: chaseGameSettings.monster_speed_slow || 1.5,
      medium: chaseGameSettings.monster_speed_medium || 2.5,
      fast: chaseGameSettings.monster_speed_fast || 4.0
    };
    const speedPerSec = speedMap[chaseSelectedSpeed] || 2.0;

    const intervalId = setInterval(() => {
      const now = Date.now();
      const dt = Math.min(0.2, (now - chaseLastTickRef.current) / 1000);
      chaseLastTickRef.current = now;

      // Waiting countdown logic
      if (chaseMonsterWaiting) {
        setChaseWaitCountdown(prev => {
          const next = prev - dt;
          if (next <= 0) {
            setChaseMonsterWaiting(false);
            return 0;
          }
          return next;
        });
        return;
      }

      // Advance monster
      setChaseMonsterPos(prevPos => {
        const targetText = currentChasePage.pageText;
        const currentCorrectLen = getChaseCorrectPrefixLen(chaseTypedText, targetText);
        const newPos = prevPos + speedPerSec * dt;

        // Collision detection: Monster caught up with Buddy
        if (newPos >= currentCorrectLen && currentCorrectLen < targetText.length) {
          // Trigger shake and sound / vibration
          setChaseShakeEffect(true);
          if ('vibrate' in navigator) {
            navigator.vibrate(200);
          }
          setTimeout(() => setChaseShakeEffect(false), 400);

          setChaseHearts(prevHearts => {
            const nextHearts = prevHearts - 1;
            if (nextHearts <= 0) {
              setChaseIsGameOver(true);
              return 0;
            }
            return nextHearts;
          });

          // Retreat monster and start cooldown countdown
          const retreatDist = chaseGameSettings.monster_retreat_distance || 5;
          const retreatedPos = Math.max(0, currentCorrectLen - retreatDist);
          setChaseMonsterWaiting(true);
          setChaseWaitCountdown(chaseGameSettings.monster_wait_seconds || 5);
          return retreatedPos;
        }

        return newPos;
      });
    }, 50);

    return () => clearInterval(intervalId);
  }, [gameMode, stage, chaseSelectedSpeed, chaseIsGameOver, chaseIsSuccess, chaseMonsterWaiting, currentChasePage.pageText, chaseTypedText, chaseGameSettings, getChaseCorrectPrefixLen]);

  // Handle typing in Story Chase
  const handleChaseTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (chaseIsGameOver || chaseIsSuccess) return;

    const val = e.target.value;
    const targetText = currentChasePage.pageText;
    const correctPrefix = getChaseCorrectPrefixLen(val, targetText);
    const consecutiveErrors = val.length - correctPrefix;

    // Strict consecutive error limit check
    const errorLimit = chaseGameSettings.consecutive_error_limit || 10;
    if (consecutiveErrors >= errorLimit && val.length > chaseTypedText.length) {
      setChaseShakeEffect(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      setTimeout(() => setChaseShakeEffect(false), 300);
      return; // Block appending further incorrect characters
    }

    setChaseTypedText(val);
    setChaseConsecutiveErrors(consecutiveErrors);

    // Page cleared check
    if (correctPrefix === targetText.length && targetText.length > 0) {
      if (chasePageIdx < storyChasePages.length - 1) {
        // Auto transition to next page after short celebratory delay
        setTimeout(() => {
          handleNextChasePage();
        }, 600);
      } else {
        // All pages cleared! Final victory
        setTimeout(() => {
          handleCompleteStoryChase();
        }, 800);
      }
    }
  };

  // Helper: map global character index to (lineIndex, colIndex)
  const getLineAndColForGlobalChar = (globalCharIdx: number, lines: StoryChaseLine[]) => {
    if (lines.length === 0) return { lineIndex: 0, col: 0, lineLength: 1 };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLen = line.text.length;
      const lineEnd = line.startCharGlobal + lineLen;

      if (globalCharIdx >= line.startCharGlobal && globalCharIdx < lineEnd) {
        return {
          lineIndex: i,
          col: globalCharIdx - line.startCharGlobal,
          lineLength: Math.max(1, lineLen)
        };
      }

      if (globalCharIdx === lineEnd || (i < lines.length - 1 && globalCharIdx < lines[i + 1].startCharGlobal)) {
        if (i < lines.length - 1) {
          return {
            lineIndex: i + 1,
            col: 0,
            lineLength: Math.max(1, lines[i + 1].text.length)
          };
        } else {
          return {
            lineIndex: i,
            col: lineLen,
            lineLength: Math.max(1, lineLen)
          };
        }
      }
    }
    const lastLine = lines[lines.length - 1];
    return {
      lineIndex: lines.length - 1,
      col: lastLine.text.length,
      lineLength: Math.max(1, lastLine.text.length)
    };
  };

  // Translation Drill sentences list (with fallbacks)
  const translationSentences = React.useMemo(() => {
    if (island.story_passage_json && island.story_passage_json.length > 0) {
      const validSentences = island.story_passage_json.filter(
        item => item.sentence_text && item.sentence_text.trim().length > 0 && item.translation && item.translation.trim().length > 0
      );
      if (validSentences.length > 0) {
        return validSentences.map(item => ({
          sentence: item.sentence_text.trim(),
          translation: item.translation.trim()
        }));
      }
    }
    const wordSentences = (island.words || []).filter(
      w => w.sentence && w.sentence.trim().length > 0 && w.sentence_translation && w.sentence_translation.trim().length > 0
    );
    if (wordSentences.length > 0) {
      return wordSentences.map(w => ({
        sentence: w.sentence.trim(),
        translation: w.sentence_translation.trim()
      }));
    }
    return [
      {
        sentence: "Hello, welcome to this island!",
        translation: "你好，欢迎来到这个岛屿！"
      }
    ];
  }, [island]);

  const currentTranslationItem = translationSentences[translationSentenceIdx] || translationSentences[0];
  const targetEngSentence = (currentTranslationItem?.sentence || '').trim();
  const targetZhTranslation = (currentTranslationItem?.translation || '').trim();

  const CONTRACTION_EXPANSIONS: Record<string, string[]> = {
    "it's": ["it", "is"],
    "its": ["it", "is"],
    "don't": ["do", "not"],
    "dont": ["do", "not"],
    "doesn't": ["does", "not"],
    "doesnt": ["does", "not"],
    "didn't": ["did", "not"],
    "didnt": ["did", "not"],
    "can't": ["can", "not"],
    "cant": ["can", "not"],
    "cannot": ["can", "not"],
    "won't": ["will", "not"],
    "wont": ["will", "not"],
    "i'm": ["i", "am"],
    "im": ["i", "am"],
    "you're": ["you", "are"],
    "youre": ["you", "are"],
    "we're": ["we", "are"],
    "were": ["we", "are"],
    "they're": ["they", "are"],
    "theyre": ["they", "are"],
    "that's": ["that", "is"],
    "thats": ["that", "is"],
    "what's": ["what", "is"],
    "whats": ["what", "is"],
    "there's": ["there", "is"],
    "theres": ["there", "is"],
    "he's": ["he", "is"],
    "hes": ["he", "is"],
    "she's": ["she", "is"],
    "shes": ["she", "is"],
    "let's": ["let", "us"],
    "lets": ["let", "us"]
  };

  const levenshteinDistance = (a: string, b: string): number => {
    if (a === b) return 0;
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const tokenizeSentence = (text: string): WordToken[] => {
    if (!text) return [];
    const rawWords = text.trim().split(/\s+/).filter(Boolean);
    const tokens: WordToken[] = [];

    rawWords.forEach((raw, idx) => {
      const match = raw.match(/^([^\w]*)([\w’'‘\-]+)([^\w]*)$/);
      let prefix = '';
      let core = raw;
      let suffix = '';

      if (match) {
        prefix = match[1] || '';
        core = match[2] || raw;
        suffix = match[3] || '';
      } else {
        core = raw.replace(/^[^\w]+|[^\w]+$/g, '');
        const prefixMatch = raw.match(/^[^\w]+/);
        const suffixMatch = raw.match(/[^\w]+$/);
        prefix = prefixMatch ? prefixMatch[0] : '';
        suffix = suffixMatch ? suffixMatch[0] : '';
      }

      const clean = core
        .toLowerCase()
        .replace(/[’‘`]/g, "'")
        .replace(/[\p{P}\p{S}]/gu, '')
        .trim();

      tokens.push({
        id: idx,
        raw,
        prefix,
        clean,
        suffix,
      });
    });

    return tokens;
  };

  const matchWords = (
    targetTokens: WordToken[],
    inputRaw: string
  ): {
    matchedIndices: Set<number>;
    isAllMatched: boolean;
    matchScore: number;
  } => {
    if (!inputRaw || targetTokens.length === 0) {
      return { matchedIndices: new Set(), isAllMatched: false, matchScore: 0 };
    }

    const rawInputWords = inputRaw
      .replace(/[’‘`]/g, "'")
      .replace(/[\p{P}\p{S}]/gu, ' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const inputWords: string[] = [];
    rawInputWords.forEach(w => {
      if (CONTRACTION_EXPANSIONS[w]) {
        inputWords.push(...CONTRACTION_EXPANSIONS[w]);
      } else {
        inputWords.push(w);
      }
    });

    const matchedIndices = new Set<number>();
    let inputPtr = 0;

    for (let i = 0; i < targetTokens.length; i++) {
      const targetClean = targetTokens[i].clean;
      if (!targetClean) {
        matchedIndices.add(i);
        continue;
      }

      const targetExpanded = CONTRACTION_EXPANSIONS[targetClean] || [targetClean];
      let found = false;

      for (let j = inputPtr; j < Math.min(inputWords.length, inputPtr + 4); j++) {
        if (targetExpanded.length === 1 && inputWords[j] === targetExpanded[0]) {
          matchedIndices.add(i);
          inputPtr = j + 1;
          found = true;
          break;
        } else if (targetExpanded.length === 2 && j + 1 < inputWords.length) {
          if (inputWords[j] === targetExpanded[0] && inputWords[j + 1] === targetExpanded[1]) {
            matchedIndices.add(i);
            inputPtr = j + 2;
            found = true;
            break;
          }
        } else if (targetExpanded.length === 1 && targetClean.length > 3) {
          if (levenshteinDistance(inputWords[j], targetClean) <= 1) {
            matchedIndices.add(i);
            inputPtr = j + 1;
            found = true;
            break;
          }
        }
      }

      if (!found) {
        const idx = inputWords.indexOf(targetClean, inputPtr);
        if (idx !== -1 && idx < inputPtr + 6) {
          matchedIndices.add(i);
          inputPtr = idx + 1;
        }
      }
    }

    const validTokens = targetTokens.filter(t => t.clean.length > 0);
    const validTokenCount = validTokens.length;
    const matchedCount = Array.from(matchedIndices).filter(idx => targetTokens[idx]?.clean?.length > 0).length;
    const matchScore = validTokenCount > 0 ? (matchedCount / validTokenCount) * 100 : 0;
    const isAllMatched =
      validTokenCount > 0 &&
      (matchedCount === validTokenCount || (validTokenCount >= 6 && matchedCount >= validTokenCount - 1));

    return { matchedIndices, isAllMatched, matchScore };
  };

  const targetTokens = React.useMemo(() => {
    return tokenizeSentence(targetEngSentence);
  }, [targetEngSentence]);

  const activeInputText = (translationTypedText || spokenTranscript || '').trim();

  const { matchedIndices, isAllMatched } = React.useMemo(() => {
    return matchWords(targetTokens, activeInputText);
  }, [targetTokens, activeInputText]);

  const levelProgress = React.useMemo(() => {
    if (gameMode === 'story') {
      if (questions.length === 0) return 0;
      const correctCount = questions.filter((q, idx) => isQuestionCorrect(userInputs[idx] || '', q.answer)).length;
      return (correctCount / questions.length) * 100;
    }
    if (gameMode === 'listening') {
      if (storyChasePages.length === 0) return 0;
      const currentPage = storyChasePages[chasePageIdx] || storyChasePages[0];
      const pageFraction = chaseCorrectLen / Math.max(1, currentPage.totalChars);
      return Math.min(100, ((chasePageIdx + pageFraction) / storyChasePages.length) * 100);
    }
    if (gameMode === 'translation') {
      if (translationSentences.length === 0) return 0;
      return ((translationSentenceIdx + (isAllMatched ? 1 : 0)) / translationSentences.length) * 100;
    }
    if (gameMode === 'falling') {
      return Math.min(100, (score / 300) * 100);
    }
    return 0;
  }, [gameMode, questions, userInputs, storyChasePages, chasePageIdx, chaseCorrectLen, translationSentences, translationSentenceIdx, isAllMatched, score]);

  const streak = React.useMemo(() => {
    if (gameMode === 'story') {
      const correctCount = questions.filter((q, idx) => isQuestionCorrect(userInputs[idx] || '', q.answer)).length;
      return Math.max(3, correctCount * 2);
    }
    if (gameMode === 'listening') {
      return Math.max(3, (chasePageIdx + 1) * 2);
    }
    if (gameMode === 'translation') {
      return Math.max(3, (translationSentenceIdx + 1) * 2);
    }
    return 3;
  }, [gameMode, questions, userInputs, chasePageIdx, translationSentenceIdx]);

  // Check speech recognition support on mount
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      setSpeechSupported(true);
    } else {
      setSpeechSupported(false);
    }
  }, []);

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Start listening trigger
  const startListening = useCallback(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setSpeechSupported(false);
      setSpeechError('⚠️ 您的浏览器未开启语音识别功能，建议直接在输入框打字或使用 iPad 键盘自带麦克风。');
      setIsListening(false);
      return;
    }

    // Cancel any speech synthesis that might lock audio session
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setSpeechError(null);
    setSpokenTranscript('');
    setTranslationTypedText('');

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentFinal = '';
        let currentInterim = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript + ' ';
          } else {
            currentInterim += item[0].transcript;
          }
        }

        const combined = (currentFinal || currentInterim || '').trim();
        if (combined) {
          setSpokenTranscript(combined);
          setTranslationTypedText(combined);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'permission-denied') {
          setSpeechError('⚠️ 麦克风权限未开启：请点击 Safari 顶部地址栏左侧【aA / 大小 ➔ 网站设置 ➔ 麦克风 ➔ 改为“允许”】，或在 iPad【设置 ➔ Safari ➔ 麦克风】中设为“允许”并刷新页面。');
        } else if (event.error === 'no-speech') {
          setSpeechError('⚠️ 未检测到发音，请靠近麦克风大声朗读，点击录音按钮重试。');
        } else if (event.error === 'audio-capture') {
          setSpeechError('⚠️ 未找到可用麦克风或麦克风被其他应用占用。');
        } else if (event.error === 'network') {
          setSpeechError('⚠️ 语音网络连接异常，请重试或使用键盘输入。');
        } else if (event.error !== 'aborted') {
          setSpeechError(`⚠️ 识别提示: ${event.error || '请重试'}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('⚠️ 启动语音识别失败，请检查麦克风权限。');
      setIsListening(false);
    }
  }, []);

  // Clean up recognition on sentence change or unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [translationSentenceIdx, gameMode, stage, stopListening]);

  const handlePlayTranslationEngHint = () => {
    if (!('speechSynthesis' in window)) {
      alert('⚠️ Your browser does not support Speech Synthesis API.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(targetEngSentence);
    utterance.lang = 'en-US';
    utterance.rate = ttsSpeedRef.current;
    window.speechSynthesis.speak(utterance);
  };

  const handleTranslationTouchClear = () => {
    setTranslationTypedText('');
    setSpokenTranscript('');
    setSpeechError(null);
    if (translationInputRef.current) {
      translationInputRef.current.focus();
    }
  };

  const handleTranslationTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTranslationTypedText(val);
    setSpokenTranscript(val);
  };

  const handleCompleteTranslation = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/progress/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          island_id: island.id,
          completed_stage: 3,
          stage: 4
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setFeedback({ isError: true, message: `❌ Progress update failed: ${errData.error || 'Server Error'}` });
        setIsSaving(false);
        return;
      }

      const coinRes = await fetch('/api/users/add-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          coins: 100
        })
      });

      if (!coinRes.ok) {
        const errData = await coinRes.json().catch(() => ({}));
        setFeedback({ isError: true, message: `❌ Failed to save coin reward: ${errData.error || 'Server Error'}` });
        setIsSaving(false);
        return;
      }

      onProgressUpdated();
      setStage('translation_success');
    } catch (err) {
      setFeedback({ isError: true, message: '❌ Network connection failed. Please check your connection!' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSentencePass = useCallback((sentenceIdx: number) => {
    if (passedEffect) return;
    setPassedEffect(true);
    stopListening();

    const elapsedSec = translationStartTime ? Math.max(0.1, Math.round(((Date.now() - translationStartTime) / 1000) * 10) / 10) : 0;
    setTranslationStats(prev => {
      const existing = prev[sentenceIdx] || { successCount: 0, bestTimeSeconds: null, lastTimeSeconds: null };
      const newBest = existing.bestTimeSeconds === null ? elapsedSec : Math.min(existing.bestTimeSeconds, elapsedSec);
      const updated = {
        ...prev,
        [sentenceIdx]: {
          successCount: existing.successCount + 1,
          bestTimeSeconds: newBest,
          lastTimeSeconds: elapsedSec,
        }
      };
      try {
        localStorage.setItem(translationStatsStorageKey, JSON.stringify(updated));
        if (currentUser?.id && island?.id) {
          fetch('/api/progress/update-translation-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: currentUser.id,
              island_id: island.id,
              stats: updated,
            }),
          }).catch(err => console.error('Failed to sync translation stats to DB:', err));
        }
      } catch (err) {
        console.error('Failed to save translation stats to localStorage', err);
      }
      return updated;
    });
  }, [passedEffect, stopListening, translationStartTime, translationStatsStorageKey, currentUser?.id, island?.id]);

  const handlePrevSentence = () => {
    if (translationSentenceIdx > 0) {
      setTranslationSentenceIdx(prev => prev - 1);
      setTranslationTypedText('');
      setSpokenTranscript('');
      setSpeechError(null);
      setPassedEffect(false);
      stopListening();
    }
  };

  const handleNextSentence = () => {
    if (translationSentenceIdx < translationSentences.length - 1) {
      setTranslationSentenceIdx(prev => prev + 1);
      setTranslationTypedText('');
      setSpokenTranscript('');
      setSpeechError(null);
      setPassedEffect(false);
      stopListening();
    }
  };

  // Trigger pass when all words match
  useEffect(() => {
    if (gameMode === 'translation' && stage === 'translation' && isAllMatched && !passedEffect) {
      handleSentencePass(translationSentenceIdx);
    }
  }, [gameMode, stage, isAllMatched, passedEffect, translationSentenceIdx, handleSentencePass]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    ttsSpeedRef.current = ttsSpeed;
  }, [ttsSpeed]);

  // Falling game core loop
  useEffect(() => {
    if (stage !== 'falling' || fallingGameState !== 'playing') {
      return;
    }

    fallingWordsRef.current = [];
    shieldRef.current = 5;
    scoreRef.current = 0;
    totalSpawnedRef.current = 0;
    setShield(5);
    setScore(0);
    setFallingWords([]);
    setFallingInputText('');
    setBullets([]);
    setExplosions([]);
    bulletsRef.current = [];

    let animationFrameId: number;
    let lastSpawnTime = 0;
    const spawnInterval = 3000 / difficultyRef.current.speed;
    const maxWords = 20;

    const gameLoop = (timestamp: number) => {
      if (!lastSpawnTime) lastSpawnTime = timestamp;

      // 1. Spawning
      const elapsed = timestamp - lastSpawnTime;
      if (elapsed >= spawnInterval && totalSpawnedRef.current < maxWords) {
        const vocab = island.words || [];
        if (vocab.length > 0) {
          const randWord = vocab[Math.floor(Math.random() * vocab.length)];
          const LANES = [15, 32, 50, 68, 85];
          // Find lanes where no active falling word is near the top (y < 22)
          const safeLanes = LANES.filter(laneX => {
            return !fallingWordsRef.current.some(w => Math.abs(w.x - laneX) < 10 && w.y < 22);
          });

          let chosenX: number;
          if (safeLanes.length > 0) {
            chosenX = safeLanes[Math.floor(Math.random() * safeLanes.length)];
          } else {
            // Find lane whose top-most word has fallen the furthest down
            let bestLane = LANES[0];
            let maxTopY = -1;
            for (const laneX of LANES) {
              const topWordInLane = fallingWordsRef.current
                .filter(w => Math.abs(w.x - laneX) < 10)
                .sort((a, b) => a.y - b.y)[0];
              const topY = topWordInLane ? topWordInLane.y : 100;
              if (topY > maxTopY) {
                maxTopY = topY;
                bestLane = laneX;
              }
            }
            chosenX = bestLane;
          }

          const newFalling = {
            id: Date.now() + Math.random(),
            word: randWord.word,
            translation: randWord.translation,
            x: chosenX,
            y: 0,
            targeted: false
          };
          fallingWordsRef.current.push(newFalling);
          totalSpawnedRef.current += 1;
          lastSpawnTime = timestamp;
        }
      }

      // 2. Move Words
      let shieldDeducted = 0;
      let scoreDeducted = 0;
      const remaining: any[] = [];
      let triggeredBaseHit = false;

      for (const w of fallingWordsRef.current) {
        w.y += 0.04 * difficultyRef.current.speed;
        if (w.y >= 85) {
          shieldDeducted += 1;
          scoreDeducted += 50;
          triggeredBaseHit = true;
        } else {
          remaining.push(w);
        }
      }

      if (shieldDeducted > 0) {
        shieldRef.current = Math.max(0, shieldRef.current - shieldDeducted);
        setShield(shieldRef.current);

        scoreRef.current = Math.max(0, scoreRef.current - scoreDeducted);
        setScore(scoreRef.current);

        if (triggeredBaseHit) {
          setIsBaseHit(true);
          setTimeout(() => {
            setIsBaseHit(false);
          }, 300);
        }

        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
      }

      fallingWordsRef.current = remaining;
      setFallingWords([...remaining]);

      // Update Bullets
      const activeBullets: Bullet[] = [];
      let fallingWordsChanged = false;
      for (const bullet of bulletsRef.current) {
        const targetWord = fallingWordsRef.current.find(w => w.id === bullet.targetWordId);
        let tx = bullet.targetX;
        let ty = bullet.targetY;
        if (targetWord) {
          tx = targetWord.x;
          ty = targetWord.y;
          bullet.targetX = tx;
          bullet.targetY = ty;
        }

        const dx = tx - bullet.currentX;
        const dy = ty - bullet.currentY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 3) {
          // Bullet hits target
          const newExplosion = {
            id: Date.now() + Math.random(),
            x: tx,
            y: ty
          };
          setExplosions(prev => [...prev, newExplosion]);
          setTimeout(() => {
            setExplosions(prev => prev.filter(exp => exp.id !== newExplosion.id));
          }, 500);

          if (targetWord) {
            const points = targetWord.word.length * 10;
            scoreRef.current += points;
            setScore(scoreRef.current);
            playTTS(targetWord.word);

            fallingWordsRef.current = fallingWordsRef.current.filter(w => w.id !== targetWord.id);
            fallingWordsChanged = true;
          }
        } else {
          const step = 3;
          bullet.currentX += (dx / dist) * step;
          bullet.currentY += (dy / dist) * step;
          activeBullets.push(bullet);
        }
      }
      bulletsRef.current = activeBullets;
      setBullets([...activeBullets]);
      if (fallingWordsChanged) {
        setFallingWords([...fallingWordsRef.current]);
      }

      // End Checks
      if (shieldRef.current <= 0) {
        setFallingGameState('gameover');
        handleFinishFalling(scoreRef.current, false);
        return;
      }

      if (totalSpawnedRef.current >= maxWords && remaining.length === 0) {
        setFallingGameState('victory');
        handleFinishFalling(scoreRef.current, true);
        return;
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [stage, fallingGameState, island]);

  const handleDosInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typed = fallingInputText.trim().toLowerCase();
    if (!typed) return;

    const matches = fallingWordsRef.current.filter(
      w => w.word.toLowerCase() === typed && !w.targeted
    );

    if (matches.length > 0) {
      const targetWord = matches.reduce((prev, current) =>
        (prev.y > current.y) ? prev : current
      );

      fallingWordsRef.current = fallingWordsRef.current.map(w =>
        w.id === targetWord.id ? { ...w, targeted: true } : w
      );
      setFallingWords([...fallingWordsRef.current]);

      const newBullet: Bullet = {
        id: Date.now() + Math.random(),
        currentX: 50,
        currentY: 90,
        targetX: targetWord.x,
        targetY: targetWord.y,
        targetWordId: targetWord.id,
        wordText: targetWord.word
      };

      bulletsRef.current.push(newBullet);
      setBullets([...bulletsRef.current]);

      setFallingInputText('');
    } else {
      const el = document.getElementById('space-battle-console-input');
      if (el) {
        el.classList.add('space-battle-input-error');
        setTimeout(() => el.classList.remove('space-battle-input-error'), 300);
      }
    }
  };

  const handleFinishFalling = async (finalScore: number, isVictory: boolean) => {
    setIsSaving(true);
    setFeedback(null);
    const coinsReward = Math.round(finalScore * difficulty.multiplier);
    setEarnedCoins(coinsReward);

    try {
      if (isVictory) {
        const res = await fetch('/api/progress/update-stage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            island_id: island.id,
            completed_stage: 4,
            stage: 5
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setFeedback({ isError: true, message: `❌ Progress save failed: ${errData.error || 'Server Error'}` });
          return;
        }
      }

      if (coinsReward > 0) {
        const coinRes = await fetch('/api/users/add-coins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: currentUser.id,
            coins: coinsReward
          })
        });

        if (!coinRes.ok) {
          const errData = await coinRes.json().catch(() => ({}));
          setFeedback({ isError: true, message: `❌ Coins sync failed: ${errData.error || 'Server Error'}` });
          return;
        }
      }

      onProgressUpdated();
    } catch (err) {
      setFeedback({ isError: true, message: '❌ Network connection failed. Please check your connection!' });
    } finally {
      setIsSaving(false);
    }
  };

  const renderWordWithHighlight = (wordStr: string, inputStr: string) => {
    if (inputStr && wordStr.toLowerCase().startsWith(inputStr.toLowerCase())) {
      const matchLen = inputStr.length;
      return (
        <>
          <span className="text-cyan-400 drop-shadow-[0_0_4px_rgba(34,211,238,0.7)] font-black">{wordStr.substring(0, matchLen)}</span>
          <span>{wordStr.substring(matchLen)}</span>
        </>
      );
    }
    return <span>{wordStr}</span>;
  };

  return (
    <div className="w-full max-w-7xl mx-auto min-h-screen theme-bg theme-text flex flex-col font-mono p-4 sm:p-6 md:p-8 relative transition-colors duration-300">
      
      <style>{`
        .glass-card {
          background-color: var(--bg-card);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border-card);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.15);
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes console-error-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes thruster-flame {
          0% { transform: translateX(-50%) scaleY(0.8) scaleX(0.9); opacity: 0.7; }
          100% { transform: translateX(-50%) scaleY(1.3) scaleX(1.1); opacity: 1; }
        }
        @keyframes shake-animation {
          0%, 100% { transform: translate(0, 0) translateX(-50%); }
          25% { transform: translate(-4px, -2px) translateX(-50%); }
          75% { transform: translate(4px, 2px) translateX(-50%); }
        }
        @keyframes defending-shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-4px, -2px); }
          75% { transform: translate(4px, 2px); }
        }
        @keyframes laser-pulse {
          from { box-shadow: 0 0 8px #22d3ee, 0 0 15px #0891b2; }
          to { box-shadow: 0 0 14px #22d3ee, 0 0 25px #0891b2; }
        }
        @keyframes explosion-burst {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
          50% { opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
        @keyframes base-shake-anim {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-8px, -4px); }
          75% { transform: translate(8px, 4px); }
        }
        
        .shake-effect {
          animation: shake 0.15s ease-in-out 0s 2;
        }
        .space-battle-input-error {
          animation: console-error-shake 0.15s ease-in-out 0s 2;
          color: #f43f5e !important;
          text-shadow: 0 0 8px rgba(244, 63, 94, 0.8);
        }
        .base-hit-shake {
          animation: base-shake-anim 0.15s ease-in-out 0s 2;
          border-color: #f43f5e !important;
        }
        .laser-bullet-glow {
          animation: laser-pulse 0.4s infinite alternate;
        }
        .explosion-burst-effect {
          animation: explosion-burst 0.5s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
        .spaceship-base-shake {
          animation: shake-animation 0.1s ease-in-out infinite;
        }
        .defending-spaceship-shake {
          animation: defending-shake 0.1s ease-in-out infinite;
        }
        .thruster-flame-anim {
          animation: thruster-flame 0.15s infinite alternate;
        }
      `}</style>

      {/* iPad / Tablet Restriction Guard Screen for Story Chase & Space Defender */}
      {isIPadOrTabletDevice() && (gameMode === 'listening' || gameMode === 'falling') ? (
        <div className="w-full flex-grow flex flex-col items-center justify-center py-12 px-4 text-center font-mono">
          <div className="w-full max-w-lg p-8 sm:p-10 bg-slate-950/95 border border-cyan-500/40 rounded-3xl shadow-2xl flex flex-col items-center gap-6 relative overflow-hidden animate-fade-in">
            {/* Ambient artwork */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none filter saturate-150 scale-105"
              style={{ backgroundImage: `url('/assets/story-chase/story-chase-cyber-bg.jpg')` }}
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/90 to-slate-950/98 pointer-events-none" />

            <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-4xl shadow-inner relative z-10">
              💻
            </div>

            <div className="space-y-3 relative z-10">
              <h2 className="text-xl sm:text-2xl font-black text-cyan-300 tracking-wide text-balance">
                该模式仅支持在电脑端游玩
              </h2>
              <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-2 text-left">
                <p>
                  • <strong>{gameMode === 'listening' ? '02 // Story Chase 打字追逐' : '04 // Space Defender 太空防卫'}</strong> 需要配合电脑实体键盘进行高速键入或按键操作，iPad 设备无法获得最佳操作体验。
                </p>
                <p className="text-amber-300">
                  • <strong>建议</strong>：请在电脑端浏览器登录进入本模式；在 iPad 上请体验 <strong>01 绘本阅读</strong> 与 <strong>03 朗读匹配</strong>！
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onBack}
              aria-label="返回探险地图"
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:opacity-95 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:scale-102 active:scale-98 transition-all cursor-pointer relative z-10 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            >
              🗺️ 返回探险地图 (Back to Map)
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full flex-grow flex flex-col">
          {/* Top HUD Bar */}
          <header className="glass-card p-4 rounded-2xl mb-6 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <button
              type="button"
              className="bg-rose-600/90 hover:bg-rose-500 text-white font-bold px-3.5 py-2 rounded-xl shadow-md transition-all active:translate-y-0.5 text-xs tracking-wider uppercase cursor-pointer flex items-center gap-1.5 border border-rose-500/40"
              onClick={onBack}
              disabled={isSaving}
            >
              🏃 Exit Game
            </button>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-cyan-400 tracking-wider font-mono">
                STORY: {island.name}
              </span>
              <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest font-mono">
                {gameMode === 'story' && '📖 Story Reading'}
                {gameMode === 'listening' && '🏃💨 Story Chase'}
                {gameMode === 'translation' && '🎙️ Word Matching'}
                {gameMode === 'falling' && '👾 Space Defender'}
              </span>
            </div>
          </div>

          {/* Level completion energy bar */}
          <div className="w-full md:w-64 flex flex-col gap-1">
            <div className="flex justify-between items-center text-[10px] font-mono theme-text-muted font-bold">
              <span>PROGRESS</span>
              <span className="text-cyan-400 font-bold">{Math.round(levelProgress)}%</span>
            </div>
            <div className="bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden relative w-full">
              <div
                className="bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full animate-pulse h-full transition-all duration-500"
                style={{ width: `${Math.max(5, Math.min(100, levelProgress))}%` }}
              />
            </div>
          </div>

          {/* Badges: Streak & Coin Counter */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
              ⚡ {streak}x STREAK
            </div>
            <div className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
              🪙 {(currentUser.coins + (earnedCoins || 0)).toLocaleString()} COINS
            </div>
          </div>
        </header>

        {/* Compact Settings & Voice Controller Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-[#0F172A]/80 p-1 rounded-xl border border-cyan-500/20 font-mono">
              <button
                type="button"
                onClick={() => onThemeChange?.('cyber')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  theme === 'cyber' || theme !== 'bright' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Dark Mode"
              >
                🌙 Dark
              </button>
              <button
                type="button"
                onClick={() => onThemeChange?.('bright')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  theme === 'bright' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Bright Mode"
              >
                ☀️ Bright
              </button>
            </div>

            <div className="flex items-center gap-1 bg-[#0F172A]/80 p-1 rounded-xl border border-cyan-500/20">
              <button
                type="button"
                onClick={() => onFontScaleChange?.('100')}
                className={`px-2 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  fontScale === '100' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => onFontScaleChange?.('115')}
                className={`px-2 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  fontScale === '115' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                115%
              </button>
              <button
                type="button"
                onClick={() => onFontScaleChange?.('130')}
                className={`px-2 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  fontScale === '130' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                130% Kids
              </button>
            </div>
          </div>

          <div className="glass-card rounded-xl px-3 py-1.5 flex items-center gap-3 font-mono">
            <span className="text-cyan-400 text-xs font-bold flex items-center gap-1">
              🔊 <span className="hidden sm:inline text-[10px] text-slate-300">TTS Speed</span>
            </span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={ttsSpeed}
              onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
              className="w-24 sm:w-32 accent-cyan-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-[10px] font-bold text-cyan-300 min-w-[36px]">
              {ttsSpeed.toFixed(2)}x
            </span>
          </div>
        </div>

        {feedback && (
          <div className={`p-4 rounded-xl text-center font-bold mb-6 text-sm border shadow-lg ${
            feedback.isError
              ? 'bg-rose-950/40 border-rose-500/30 text-rose-400 shadow-rose-500/5'
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 shadow-emerald-500/5'
          }`}>
            {feedback.message}
          </div>
        )}

        <SuspenseState isLoading={isSaving}>
          <FormBoundary>
            <div className="flex-grow flex flex-col justify-center">
              {/* === STAGE 1: STORY MODE === */}
              {gameMode === 'story' && stage === 'story' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  
                  {/* Left Column: Passage Card */}
                  <div className="theme-card border theme-border rounded-2xl p-6 shadow-xl flex flex-col w-full">
                    <h2 className="text-xl font-bold theme-text mb-6 text-center tracking-tight flex items-center justify-center gap-2 border-b theme-border pb-3 font-mono">
                      📖 {title}
                    </h2>

                    {/* Translation Switcher Bar */}
                    <div className="flex bg-black/10 dark:bg-white/10 border theme-border p-1 rounded-xl mb-6">
                      <button
                        type="button"
                        className={`flex-grow border-0 bg-transparent py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          translationMode === 'word' ? 'theme-accent-btn font-black shadow-sm' : 'theme-text-muted hover:theme-text'
                        }`}
                        onClick={() => setTranslationMode('word')}
                      >
                        Word Translation
                      </button>
                      <button
                        type="button"
                        className={`flex-grow border-0 bg-transparent py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          translationMode === 'sentence' ? 'theme-accent-btn font-black shadow-sm' : 'theme-text-muted hover:theme-text'
                        }`}
                        onClick={() => setTranslationMode('sentence')}
                      >
                        Sentence Translation
                      </button>
                      <button
                        type="button"
                        className={`flex-grow border-0 bg-transparent py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          translationMode === 'off' ? 'theme-accent-btn font-black shadow-sm' : 'theme-text-muted hover:theme-text'
                        }`}
                        onClick={() => setTranslationMode('off')}
                      >
                        Disable Hints
                      </button>
                    </div>

                    {/* Story Passage Content */}
                    <div className="min-h-[150px] mb-6">
                      {renderPassage()}
                    </div>
                  </div>

                  {/* Right Column: Q&A Section */}
                  <div className="theme-card rounded-2xl p-6 flex flex-col w-full shadow-xl border theme-border">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <h3 className="text-lg font-bold theme-text flex items-center gap-2 font-mono">
                        ✍️ Decryption Key Matrix Matching
                      </h3>
                      <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold px-3 py-1 rounded-lg text-xs flex items-center gap-1.5 shadow-sm">
                        ✨ PERFECT MATCH COMBO X2
                      </div>
                    </div>
                    <p className="text-xs theme-text-muted mb-6 font-mono leading-relaxed">
                      Enter the complete sentence corresponding to each structural prompt. Cards will turn emerald upon matching.
                    </p>

                    <div className="space-y-6">
                      {questions.map((q, idx) => {
                        const isCorrect = isQuestionCorrect(userInputs[idx] || '', q.answer);
                        return (
                          <div
                            key={idx}
                            className={`theme-card border rounded-xl p-5 transition-all duration-300 ${
                              isCorrect ? 'border-emerald-500/60 bg-emerald-950/20 shadow-sm' : 'theme-border'
                            }`}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <span className="text-xs font-bold theme-text-muted uppercase tracking-widest">
                                Decryption Unit {idx + 1}
                              </span>
                              {isCorrect && (
                                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 font-mono">
                                  🟢 Decoded Successfully
                                </span>
                              )}
                            </div>
                            <p className="text-base sm:text-lg font-semibold theme-text mb-3">{q.question}</p>
                            {renderUnderlineSlots(idx, q.answer, userInputs[idx] || '', isSaving)}
                          </div>
                        );
                      })}
                    </div>

                    {/* Submission Action Bar */}
                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        className={`w-full py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider transition-all duration-300 flex justify-center items-center gap-2 border ${
                          allCorrect
                            ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.4)] cursor-pointer hover:bg-cyan-400 hover:scale-[1.01]'
                            : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                        disabled={!allCorrect || isSaving}
                        onClick={handleCompleteStory}
                      >
                        {isSaving
                          ? 'Saving progress & rewards...'
                          : allCorrect
                          ? '🎉 Clear Story Mode (+100 🪙)'
                          : '🔒 Complete all decryption units to proceed'}
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Story Stage Success Overlay */}
              {gameMode === 'story' && stage === 'success' && (
                <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500"></div>
                  <div className="text-5xl mb-4 animate-bounce text-yellow-400 select-none">👑</div>
                  <div className="text-4xl mb-4 animate-pulse select-none">🚀💨</div>
                  <h2 className="text-2xl font-black text-cyan-400 mb-3 tracking-wider">🎉 SECTOR SECURED!</h2>
                  <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    You have successfully decrypted the story passage of **{island.name}**!
                  </p>
                  
                  <div className="w-full space-y-3 mb-8">
                    <div className="bg-yellow-950/20 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                      🪙 +100 Coins Secured
                    </div>
                    <div className="bg-cyan-950/20 border border-cyan-500/30 text-cyan-400 px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                      ⛵ Acoustic Capture Decryption Unlocked
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-lg transition-all active:translate-y-0.5 cursor-pointer hover:shadow-cyan-500/20"
                    onClick={onBack}
                    disabled={isSaving}
                  >
                    🗺️ Return to Navigation Graph
                  </button>
                </div>
              )}

              {/* === STAGE 2: STORY CHASE TYPING GAME === */}
              {gameMode === 'listening' && stage === 'listening' && (
                <div className="w-full max-w-5xl mx-auto bg-slate-900/70 backdrop-blur-md border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500 z-20"></div>

                  {chaseSelectedSpeed === null ? (
                    /* Entry Speed Selection Screen */
                    <div className="w-full max-w-3xl mx-auto my-4 p-6 sm:p-8 bg-slate-950/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-fade-in text-center relative overflow-hidden">
                      {/* Ambient background artwork */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none filter saturate-150 scale-105"
                        style={{ backgroundImage: `url('/assets/story-chase/story-chase-cyber-bg.jpg')` }}
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/85 to-slate-950/95 pointer-events-none" />

                      <div className="flex flex-col items-center gap-2 relative z-10">
                        <div className="flex items-center gap-3">
                          <span className="text-4xl sm:text-5xl animate-bounce">🏃💨</span>
                          <span className="text-3xl sm:text-4xl text-purple-400 animate-pulse">👾</span>
                        </div>
                        <h3 className="text-xl sm:text-3xl font-black theme-text tracking-wide font-mono bg-gradient-to-r from-cyan-400 via-teal-300 to-purple-400 bg-clip-text text-transparent text-balance">
                          STORY CHASE 打字追逐大冒险
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-lg font-mono leading-relaxed">
                          根据故事原文逐字符打字。打对变绿，打错标红！怪兽在后方持续追击，被追上会扣除一颗生命心。请选择探险难度：
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 w-full relative z-10">
                        <DifficultyCard
                          speed="slow"
                          charsPerSec={chaseGameSettings.monster_speed_slow}
                          onClick={() => handleStartStoryChase('slow')}
                        />
                        <DifficultyCard
                          speed="medium"
                          charsPerSec={chaseGameSettings.monster_speed_medium}
                          onClick={() => handleStartStoryChase('medium')}
                        />
                        <DifficultyCard
                          speed="fast"
                          charsPerSec={chaseGameSettings.monster_speed_fast}
                          speedBonus={chaseGameSettings.coins_speed_bonus || 50}
                          onClick={() => handleStartStoryChase('fast')}
                        />
                      </div>
                    </div>
                  ) : chaseIsGameOver ? (
                    /* Game Over Screen */
                    <div className="w-full max-w-md mx-auto my-6 p-8 bg-slate-950/95 border border-rose-500/50 rounded-3xl shadow-2xl flex flex-col items-center text-center animate-fade-in gap-4 relative overflow-hidden">
                      {/* Ambient background artwork */}
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none filter grayscale contrast-125"
                        style={{ backgroundImage: `url('/assets/story-chase/story-chase-cyber-bg.jpg')` }}
                      />
                      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-rose-950/30 to-slate-950/95 pointer-events-none" />

                      <div className="text-6xl animate-bounce filter drop-shadow-[0_0_12px_rgba(244,63,94,0.7)] select-none relative z-10">
                        👾
                      </div>
                      <h3 className="text-2xl font-black text-rose-400 font-mono tracking-wide relative z-10 text-balance">
                        逃跑失败！被怪兽追上了
                      </h3>
                      <p className="text-xs text-slate-300 font-mono leading-relaxed relative z-10">
                        怪兽抓住了你的小探险家。不要灰心，深呼吸多练习指法，重新选择速度再战！
                      </p>
                      <button
                        type="button"
                        onClick={() => setChaseSelectedSpeed(null)}
                        aria-label="重新选择难度再试一次"
                        className="w-full mt-4 py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 hover:opacity-95 text-slate-950 font-mono font-black text-xs uppercase tracking-widest shadow-lg hover:scale-103 active:scale-98 transition-all cursor-pointer shadow-rose-500/20 relative z-10 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
                      >
                        🔄 重新选择难度再试一次 (Retry Chase)
                      </button>
                    </div>
                  ) : (
                    /* Active Story Chase Castle Tower Escape Play Area */
                    <div className="w-full bg-castle-wall border-4 border-slate-700 rounded-3xl p-0 relative overflow-hidden transition-all shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col select-none">
                      
                      {/* Top: Procedural Canvas Castle Spires Skyline & Floating HUD */}
                      <div className="relative w-full overflow-visible z-20">
                        <CastleRoofCanvas />

                        {/* Floating Glass HUD Bar on Rooftop */}
                        <div className="absolute bottom-2 left-4 right-4 sm:left-6 sm:right-6 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2 flex flex-wrap items-center justify-between gap-3 shadow-2xl z-30 font-mono text-xs">
                          {/* Hearts Bar */}
                          <div className="flex items-center gap-1.5 bg-black/70 px-3 py-1 rounded-xl border border-slate-700 shadow-inner tabular-nums">
                            <span className="text-[11px] font-bold text-slate-400">HEARTS:</span>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: chaseGameSettings.initial_hearts || 3 }).map((_, i) => (
                                <PixelHeart
                                  key={i}
                                  status={i < chaseHearts ? (chaseShakeEffect && i === chaseHearts - 1 ? 'cracking' : 'full') : 'empty'}
                                  size="sm"
                                />
                              ))}
                            </div>
                          </div>

                          {/* Monster Threat Radar */}
                          <div
                            className={`flex items-center gap-2 px-3 py-1 rounded-xl font-bold text-xs shadow-md tabular-nums ${
                              chaseCorrectLen - Math.floor(chaseMonsterPos) <= 3 && !chaseMonsterWaiting
                                ? 'bg-rose-950/90 border border-rose-500/70 text-rose-300 animate-pulse'
                                : 'bg-purple-950/80 border border-purple-500/50 text-purple-300'
                            }`}
                          >
                            <span className="w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden">
                              <MonsterSprite emoji={chaseCurrentMonster} isWaiting={false} />
                            </span>
                            <span>
                              {chaseMonsterWaiting
                                ? `⏳ 怪兽即将在 ${Math.ceil(chaseWaitCountdown)}s 后出现...`
                                : `怪兽追击中 (距离: ${Math.max(0, chaseCorrectLen - Math.floor(chaseMonsterPos))} 字符)`}
                            </span>
                          </div>

                          {/* Floor Height & Speed Badge */}
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2.5 py-1 rounded-xl font-bold flex items-center gap-1">
                              <span>🏰</span>
                              <span className="text-white font-black">
                                {(() => {
                                  const buddyLoc = getLineAndColForGlobalChar(chaseCorrectLen, currentChasePage.lines);
                                  const isRoof = buddyLoc.lineIndex === currentChasePage.lines.length - 1;
                                  return isRoof
                                    ? `${buddyLoc.lineIndex + 1}F ROOF // 观星天台 👑`
                                    : `${buddyLoc.lineIndex + 1}F // 城堡${['地牢大门 🏰', '魔法长廊 🪟', '骑士大厅 ⚔️', '藏书阁 📜'][buddyLoc.lineIndex % 4]}`;
                                })()}
                              </span>
                            </span>

                            <span className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-slate-800 text-cyan-300 border border-slate-700 shadow-sm">
                              {chaseSelectedSpeed === 'slow' ? '🐢 慢速' : chaseSelectedSpeed === 'medium' ? '🦊 中速' : '⚡ 快速'}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setChaseTypedText('');
                                setChaseConsecutiveErrors(0);
                                chaseInputRef.current?.focus();
                              }}
                              aria-label="重填当前页面"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-colors bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer font-mono shadow-sm hover:scale-102 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                              title="重填当前页面"
                            >
                              🗑️ 重填
                            </button>
                            <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-widest tabular-nums pl-1">
                              PAGE {chasePageIdx + 1}/{storyChasePages.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main Castle Interior with Side Stone Pillars */}
                      <div
                        className={`relative flex w-full cursor-text ${
                          chaseShakeEffect ? 'shake-effect border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.4)]' : ''
                        }`}
                        onClick={() => chaseInputRef.current?.focus()}
                      >
                        {/* Hidden Native Input */}
                        <input
                          ref={chaseInputRef}
                          type="text"
                          aria-label="Story chase typing input"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-text z-30"
                          value={chaseTypedText}
                          onChange={handleChaseTypingChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Tab') {
                              e.preventDefault();
                              if (chaseIsGameOver || chaseIsSuccess) return;
                              const target = currentChasePage.pageText;
                              const curLen = chaseTypedText.length;
                              let spacesToAdd = '    ';
                              if (curLen < 4 && target.startsWith('    ')) {
                                spacesToAdd = ' '.repeat(4 - curLen);
                              }
                              const nextVal = chaseTypedText + spacesToAdd;
                              setChaseTypedText(nextVal);
                            }
                          }}
                          onBeforeInput={(e: any) => {
                            const inputType = e.nativeEvent?.inputType || e.inputType;
                            if (inputType === 'insertFromDictation' || inputType === 'insertDictationPhrase') {
                              e.preventDefault();
                            }
                          }}
                          onCompositionStart={(e) => e.preventDefault()}
                          maxLength={currentChasePage.pageText.length + (chaseGameSettings.consecutive_error_limit || 10) + 5}
                          autoComplete="off"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          inputMode="text"
                          lang="en"
                        />

                        {/* Left Castle Pillar */}
                        <CastleSidePillars side="left" />

                        {/* Central Multi-Floor Hallways with DOM-Measured Exact Character Tracking */}
                        <div className="flex-grow p-3 sm:p-4 space-y-2.5 relative z-10 font-mono">
                          {currentChasePage.lines.map((line, lineIdx) => (
                            <CastleFloorRow
                              key={lineIdx}
                              line={line}
                              lineIdx={lineIdx}
                              totalLines={currentChasePage.lines.length}
                              chaseCorrectLen={chaseCorrectLen}
                              chaseTypedText={chaseTypedText}
                              chaseMonsterPos={chaseMonsterPos}
                              chaseMonsterWaiting={chaseMonsterWaiting}
                              chaseWaitCountdown={chaseWaitCountdown}
                              chaseCurrentMonster={chaseCurrentMonster}
                              chasePageIdx={chasePageIdx}
                              storyChasePagesLength={storyChasePages.length}
                              currentUserAvatar={currentUser.avatar || '🦖'}
                              lines={currentChasePage.lines}
                            />
                          ))}
                        </div>

                        {/* Right Castle Pillar */}
                        <CastleSidePillars side="right" />
                      </div>

                      {/* Consecutive Error Warning Banner */}
                      {chaseConsecutiveErrors >= (chaseGameSettings.consecutive_error_limit || 10) - 2 && (
                        <div role="alert" aria-live="polite" className="bg-rose-950/80 border border-rose-500/60 px-4 py-2.5 mx-6 rounded-xl text-center text-xs font-mono text-rose-300 font-bold animate-pulse shadow-md shadow-rose-500/20 tabular-nums">
                          ⚠️ 连续错字达到上限 ({chaseConsecutiveErrors} / {chaseGameSettings.consecutive_error_limit || 10})！请按退格键删除错字后继续打字。
                        </div>
                      )}

                      {/* Bottom: Sea of Molten Lava & Danger Moat */}
                      <div className="bg-castle-lava-sea px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono z-20 relative shadow-2xl">
                        {/* Animated Rising Lava Embers & Heat sparks */}
                        <div aria-hidden="true" className="absolute inset-0 pointer-events-none flex items-center justify-around opacity-75">
                          <span className="text-lg anim-ember text-amber-400">🔥</span>
                          <span className="text-sm anim-ember text-orange-500 delay-100">💥</span>
                          <span className="text-xl anim-ember text-rose-500 delay-300">🔥</span>
                          <span className="text-sm anim-ember text-amber-300 delay-200">✨</span>
                          <span className="text-lg anim-ember text-orange-400 delay-500">🔥</span>
                        </div>

                        <div className="text-xs text-amber-200 flex items-center gap-2 w-full sm:w-auto relative z-10">
                          <span className="font-black text-amber-300 shrink-0 bg-red-950/80 border border-orange-500/60 px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1">
                            <span>🌋 熔岩火海</span>
                            <span className="text-orange-400">| 地牢底部</span>
                          </span>
                          <span className="text-slate-300 text-[11px] hidden sm:inline">
                            底层翻滚着滚烫岩浆！快速打字沿石阶一路爬上 5 楼天台脱出！
                          </span>
                        </div>

                        {/* Page Portal Badges */}
                        <div className="flex items-center gap-2 relative z-10">
                          {storyChasePages.map((_, idx) => {
                            const isPassed = idx < chasePageIdx;
                            const isCurrent = idx === chasePageIdx;
                            const isLast = idx === storyChasePages.length - 1;

                            return (
                              <div
                                key={idx}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                                  isPassed
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                    : isCurrent
                                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20 scale-105'
                                    : 'bg-slate-900/90 border-slate-800 text-slate-500'
                                }`}
                              >
                                {isPassed ? '✓' : isLast ? '🏆 终点' : `🚪 关卡 ${idx + 1}`}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Story Chase Stage Victory & Reward Overlay */}
              {gameMode === 'listening' && stage === 'listening_success' && (
                <div className="max-w-lg mx-auto bg-slate-900/95 border border-amber-500/40 rounded-3xl p-8 text-center flex flex-col items-center shadow-2xl relative overflow-hidden animate-fade-in">
                  {/* Ambient Victory Background Artwork */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none filter brightness-95 saturate-150 scale-105"
                    style={{ backgroundImage: `url('/assets/story-chase/story-chase-forest-bg.jpg')` }}
                  />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/85 to-slate-950/95 pointer-events-none" />

                  {/* Rotating radiant light beams in background */}
                  <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 overflow-hidden">
                    <div className="w-[600px] h-[600px] rounded-full bg-gradient-to-r from-amber-400 via-cyan-400 to-purple-400 blur-3xl victory-beam"></div>
                  </div>

                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-500 to-amber-500 z-10"></div>
                  
                  <div className="text-7xl mb-4 victory-chest-burst select-none filter drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] relative z-10">
                    🏆✨
                  </div>
                  <div className="text-2xl mb-2 select-none animate-pulse relative z-10">
                    🎉 🏃💨 💨
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-amber-400 mb-2 tracking-wider font-mono relative z-10 text-balance">
                    CHASE ESCAPED! 逃脱成功
                  </h2>
                  <p className="text-slate-300 text-xs mb-6 font-mono leading-relaxed relative z-10">
                    你成功甩开了所有追击怪兽，完成了故事 **{island.name}** 的全部打字挑战！
                  </p>

                  {/* Coin & Reward Breakdown */}
                  <div className="w-full space-y-2.5 mb-6 font-mono relative z-10 tabular-nums">
                    <div className="bg-amber-950/40 border border-amber-500/40 text-amber-300 px-4 py-2.5 rounded-xl font-bold text-xs flex justify-between items-center shadow-sm">
                      <span>🪙 基础通关奖励:</span>
                      <span className="font-extrabold text-sm">+{chaseGameSettings.coins_completion || 150}</span>
                    </div>

                    {chaseSelectedSpeed === 'fast' && (
                      <div className="bg-purple-950/40 border border-purple-500/40 text-purple-300 px-4 py-2.5 rounded-xl font-bold text-xs flex justify-between items-center shadow-sm">
                        <span>⚡ 极速冲刺奖励:</span>
                        <span className="font-extrabold text-sm">+{chaseGameSettings.coins_speed_bonus || 50}</span>
                      </div>
                    )}

                    {chaseHearts === (chaseGameSettings.initial_hearts || 3) && (
                      <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 px-4 py-2.5 rounded-xl font-bold text-xs flex justify-between items-center shadow-sm">
                        <span>💖 满血无伤逃脱奖励:</span>
                        <span className="font-extrabold text-sm">+{chaseGameSettings.coins_full_hearts_bonus || 30}</span>
                      </div>
                    )}

                    <div className="bg-gradient-to-r from-amber-500/25 to-emerald-500/25 border border-amber-400/70 text-amber-200 px-4 py-3 rounded-xl font-black text-sm flex justify-between items-center shadow-lg">
                      <span>✨ 总计获得金币:</span>
                      <span className="text-base text-amber-300">🪙 +{chaseEarnedCoins} Coins</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:opacity-95 text-slate-950 font-mono font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] cursor-pointer hover:shadow-cyan-500/20 relative z-10"
                    onClick={onBack}
                    disabled={isSaving}
                  >
                    🗺️ 返回故事探险地图 (Return to Map)
                  </button>
                </div>
              )}

              {/* === STAGE 3: WORD MATCHING & ORAL SPEECH CHALLENGE === */}
              {gameMode === 'translation' && stage === 'translation' && (
                <div className="w-full max-w-5xl mx-auto bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-amber-500"></div>

                  {matchingSubMode === null ? (
                    /* Mode Selection Screen on Entry */
                    <div className="w-full max-w-2xl mx-auto my-4 p-6 sm:p-8 bg-slate-950/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center gap-6 animate-fade-in text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-4xl sm:text-5xl">🔤</span>
                        <h3 className="text-xl sm:text-2xl font-black theme-text tracking-wide">
                          请选择 Word Matching 练习模式
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                          根据当前的口语学习需求，选择适合的练习模式开始挑战：
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-2">
                        {/* Reading Mode Card */}
                        <button
                          type="button"
                          onClick={() => handleSwitchSubMode('reading')}
                          className="group p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-cyan-500/40 hover:border-cyan-400 hover:shadow-[0_0_25px_rgba(34,211,238,0.25)] transition-all flex flex-col items-center text-center gap-3 cursor-pointer active:scale-95"
                        >
                          <span className="text-4xl group-hover:scale-110 transition-transform">📖</span>
                          <div className="font-black text-lg text-cyan-300">阅读模式</div>
                          <div className="text-xs text-slate-400 leading-relaxed min-h-[48px]">
                            显示英文原句与中文释义，对着麦克风自由朗读跟读，实时高亮读准的单词与发音纠音。
                          </div>
                          <span className="mt-2 text-xs font-mono font-bold px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-colors">
                            进入阅读模式 ▶
                          </span>
                        </button>

                        {/* Testing Mode Card */}
                        <button
                          type="button"
                          onClick={() => handleSwitchSubMode('testing')}
                          className="group p-6 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-purple-500/40 hover:border-purple-400 hover:shadow-[0_0_25px_rgba(168,85,247,0.25)] transition-all flex flex-col items-center text-center gap-3 cursor-pointer active:scale-95"
                        >
                          <span className="text-4xl group-hover:scale-110 transition-transform">📝</span>
                          <div className="font-black text-lg text-purple-300">测试模式</div>
                          <div className="text-xs text-slate-400 leading-relaxed min-h-[48px]">
                            仅显示中文释义，挑战背诵英文句子！提供发音得分与挖空填词反馈，全部读准方可通关。
                          </div>
                          <span className="mt-2 text-xs font-mono font-bold px-4 py-2 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            进入测试模式 ▶
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Header Control Bar */}
                      <div className="flex flex-wrap justify-between items-center gap-4 mb-4 border-b border-slate-800 pb-3">
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                          <span className="bg-amber-950 border border-amber-500/40 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            🎙️ Word Matching
                          </span>

                          {/* SubMode Toggle Switch: Reading Mode vs Testing Mode */}
                          <div className="flex items-center p-0.5 bg-slate-950/90 border border-slate-800 rounded-xl shadow-inner">
                            <button
                              type="button"
                              onClick={() => handleSwitchSubMode('reading')}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                                matchingSubMode === 'reading'
                                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                              }`}
                            >
                              <span>📖 阅读模式</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwitchSubMode('testing')}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                                matchingSubMode === 'testing'
                                  ? 'bg-purple-600 text-white font-black shadow-md'
                                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                              }`}
                            >
                              <span>📝 测试模式</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-widest bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                            Sentence {translationSentenceIdx + 1} / {translationSentences.length}
                          </span>
                        </div>
                      </div>

                      {/* Standalone Full-Width Single Row for Sentence Navigation (S1, S2, S3...) */}
                      <div className="w-full bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 shadow-inner mb-4">
                        <nav
                          className="translation-sentence-nav flex items-center justify-center gap-2 overflow-x-auto overscroll-x-contain py-1 touch-pan-x scrollbar-none"
                          aria-label="Sentence navigation"
                        >
                          {translationSentences.map((_, idx) => {
                            const isCurrent = idx === translationSentenceIdx;
                            const stat = translationStats[idx];
                            const hasPassed = stat && stat.successCount > 0;
                            return (
                              <button
                                key={idx}
                                ref={(element) => {
                                  translationNavItemRefs.current[idx] = element;
                                }}
                                type="button"
                                onClick={() => {
                                  setTranslationSentenceIdx(idx);
                                  setTranslationTypedText('');
                                  setSpokenTranscript('');
                                  setSpeechError(null);
                                  setPassedEffect(false);
                                  stopListening();
                                }}
                                aria-label={`切换到第 ${idx + 1} 句`}
                                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tabular-nums transition-colors border flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                                  isCurrent
                                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md scale-105 font-black'
                                    : hasPassed
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-850'
                                }`}
                                title={`Jump to Sentence ${idx + 1}`}
                                aria-current={isCurrent ? 'step' : undefined}
                              >
                                <span>{isCurrent ? `▶ S${idx + 1}` : hasPassed ? `✓ S${idx + 1}` : `S${idx + 1}`}</span>
                                {hasPassed && (
                                  <span className="text-[9px] bg-black/40 px-1.5 py-0.5 rounded-full font-sans font-bold text-amber-300 tabular-nums">
                                    x{stat.successCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Main Translation Cards */}
                      <div className="space-y-6 flex flex-col items-stretch">
                        {/* Live Timer & Best Pass Speed Stats Card */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 border border-slate-800 p-3.5 rounded-xl tabular-nums">
                          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                            <span>⏱️ LIVE TIMER:</span>
                            <span className="text-sm font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-1 rounded-lg font-mono tabular-nums">
                              {translationElapsedTime.toFixed(1)}s
                            </span>
                          </div>

                          {translationStats[translationSentenceIdx] && translationStats[translationSentenceIdx].successCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold tabular-nums">
                              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg">
                                🏆 PASS COUNT: {translationStats[translationSentenceIdx].successCount}x
                              </span>
                              {translationStats[translationSentenceIdx].bestTimeSeconds !== null && (
                                <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 px-2.5 py-1 rounded-lg">
                                  ⚡ BEST SPEED: {translationStats[translationSentenceIdx].bestTimeSeconds}s
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Main Sentence Display Card: English sentence in Reading Mode; Chinese translation in Testing Mode */}
                        {matchingSubMode === 'reading' ? (
                          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl text-center shadow-inner relative group flex flex-col items-center">
                            <div className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest uppercase mb-2">
                              ENGLISH ORIGINAL SENTENCE (英文原句)
                            </div>
                            <div className="flex items-center justify-center gap-3 flex-wrap my-1">
                              <p className="text-xl sm:text-2xl font-bold theme-text leading-relaxed tracking-wide font-mono text-balance">
                                {targetEngSentence}
                              </p>
                              <button
                                type="button"
                                onClick={handlePlayTranslationEngHint}
                                title="点击播放英文原句发音 🔊"
                                aria-label="播放英文原句发音"
                                className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 transition-colors cursor-pointer select-none active:scale-95 shrink-0 flex items-center gap-1 text-xs font-bold font-mono focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
                              >
                                <span className="text-base">🔊</span>
                                <span>英文原声</span>
                              </button>
                            </div>
                            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                              <span className="text-xs sm:text-sm text-slate-400 font-sans">
                                {targetZhTranslation}
                              </span>
                              <button
                                type="button"
                                onClick={() => playChineseTTS(targetZhTranslation)}
                                title="点击播放粤语释义朗读 🔊"
                                aria-label="播放粤语释义朗读"
                                className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-colors text-xs font-bold font-sans flex items-center gap-1 cursor-pointer select-none active:scale-95 shrink-0 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                              >
                                <span>🔊</span>
                                <span>粤语朗读</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-950 border border-slate-800 p-6 rounded-xl text-center shadow-inner relative group flex flex-col items-center">
                            <div className="text-[10px] font-mono text-amber-500/80 font-bold tracking-widest uppercase mb-2">
                              CHINESE SOURCE TEXT (中文释义)
                            </div>
                            <div className="flex items-center justify-center gap-3 flex-wrap my-1">
                              <p className="text-xl sm:text-2xl font-bold theme-text leading-relaxed tracking-wide text-balance">
                                {targetZhTranslation}
                              </p>
                              <button
                                type="button"
                                onClick={() => playChineseTTS(targetZhTranslation)}
                                title="点击播放粤语释义朗读 🔊"
                                aria-label="播放粤语释义朗读"
                                className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400 transition-colors cursor-pointer select-none active:scale-95 shrink-0 flex items-center gap-1.5 text-xs font-bold focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none"
                              >
                                <span className="text-base">🔊</span>
                                <span>粤语朗读</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Hero Speech Recognition Section */}
                        <div className="flex flex-col items-center justify-center my-2">
                          {speechSupported ? (
                            <button
                              type="button"
                              onClick={isListening ? stopListening : startListening}
                              aria-label={isListening ? "停止语音录音 (Stop listening)" : "点击开始朗读英语 (Tap to speak)"}
                              aria-pressed={isListening}
                              className={`relative group px-8 py-4 sm:py-5 rounded-2xl font-black text-sm sm:text-base uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer select-none shadow-xl focus-visible:ring-4 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                                isListening
                                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-2 border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse scale-105'
                                  : 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 border-2 border-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.4)] hover:scale-[1.02] active:scale-95'
                              }`}
                            >
                              {isListening ? (
                                <>
                                  <span className="relative flex h-3.5 w-3.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
                                  </span>
                                  <span>🔴 正在倾听… 请对着 iPad 朗读 (点击停止)</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-xl sm:text-2xl">🎙️</span>
                                  <span>点击开始读英语 (Tap to Speak)</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <div className="text-xs text-amber-300 bg-amber-950/50 border border-amber-500/40 p-4 rounded-xl max-w-xl text-left space-y-1.5 shadow-inner">
                              <div className="font-bold flex items-center gap-1.5 text-amber-400">
                                <span>⚠️ 当前环境未开启屏幕大麦克风（Web 语音接口）</span>
                              </div>
                              <div className="text-[11px] text-slate-300 leading-relaxed space-y-1">
                                <p>• <strong>原因</strong>：iPad Safari 仅在 <strong>HTTPS 安全连接</strong> 下才授权网页调用麦克风，局域网 HTTP（http://192.168.x.x）会被 Safari 默认禁用。</p>
                                <p>• <strong>最简使用方案</strong>：点击下方输入框唤起 iPad 键盘，点击键盘右下角的 <strong>🎙️ 自带麦克风</strong> 进行朗读听写（无需 HTTPS，同样支持逐词比对！）。</p>
                                <p>• <strong>开启大麦克风</strong>：请使用 <strong>https://</strong> 地址访问本站并信任证书，或在 iPad【设置 ➔ Safari ➔ 麦克风】中设为“允许”。</p>
                              </div>
                            </div>
                          )}

                          {/* Spoken real-time stream feedback */}
                          {spokenTranscript && (
                            <div className="mt-3 px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2 max-w-xl text-center shadow-inner">
                              <span className="text-slate-400 shrink-0">🗣️ 识别到:</span>
                              <span className="font-bold text-slate-100 tracking-wide break-all">{spokenTranscript}</span>
                            </div>
                          )}

                          {speechError && (
                            <div className="mt-3 px-4 py-2 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs font-medium text-rose-300 max-w-xl text-center">
                              {speechError}
                            </div>
                          )}

                          {/* Reading Mode Post-Speech: Direct Interactive Word Structure Chips */}
                          {matchingSubMode === 'reading' && (activeInputText.length > 0 || isListening) && (
                            <div className="w-full flex flex-col items-center bg-slate-950/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-inner animate-fade-in mt-3 max-w-2xl">
                              <div className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest uppercase mb-3 text-center">
                                ENGLISH SENTENCE STRUCTURE (点击单词可单独听发音)
                              </div>

                              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 my-2 max-w-3xl">
                                {targetTokens.map((token, idx) => {
                                  const isMatched = matchedIndices.has(idx);
                                  const isProblematic = !isListening && activeInputText.length > 0 && !isMatched;
                                  return (
                                    <button
                                      key={token.id}
                                      type="button"
                                      onClick={() => playTTS(token.clean)}
                                      title="点击单听发音 🔊"
                                      className={`group px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border text-base sm:text-lg font-bold font-mono transition-all duration-300 flex items-center gap-1.5 cursor-pointer select-none active:scale-95 ${
                                        isMatched
                                          ? 'bg-emerald-500/20 border-emerald-400/80 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.35)] scale-105'
                                          : isProblematic
                                          ? 'bg-rose-500/20 border-rose-500/80 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.3)] animate-pulse'
                                          : 'bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-400/60 hover:bg-slate-800/90'
                                      }`}
                                    >
                                      {token.prefix && <span className="opacity-70">{token.prefix}</span>}
                                      <span>{token.clean}</span>
                                      {token.suffix && <span className="opacity-70">{token.suffix}</span>}
                                      {isMatched ? (
                                        <span className="text-xs bg-emerald-500/30 text-emerald-300 rounded-full px-1.5 py-0.5 ml-1">
                                          ✓
                                        </span>
                                      ) : isProblematic ? (
                                        <span className="text-xs bg-rose-500/30 text-rose-300 rounded-full px-1.5 py-0.5 ml-1">
                                          ⚠️ 需纠音 🔊
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-500 group-hover:text-cyan-300 ml-1 transition-colors">
                                          🔊
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="text-center text-xs text-slate-400 font-mono mt-3">
                                💡 提示：点击任意单词卡片可单听发音 🔊，读准的单词自动点亮为绿色 ✓
                              </div>
                            </div>
                          )}

                          {/* Testing Mode Post-Speech: Cloze Sentence & Pronunciation Score Card */}
                          {matchingSubMode === 'testing' && !isListening && activeInputText.length > 0 && !isAllMatched && (() => {
                            const validTokens = targetTokens.filter(t => t.clean.length > 0);
                            const matchedCount = targetTokens.filter(t => matchedIndices.has(t.id)).length;
                            const scorePct = validTokens.length > 0 ? Math.round((matchedCount / validTokens.length) * 100) : 0;

                            return (
                              <div className="w-full max-w-2xl mt-4 p-5 rounded-2xl bg-slate-950/90 border border-cyan-500/30 shadow-xl flex flex-col items-center gap-4 animate-fade-in">
                                {/* Score & Progress Header */}
                                <div className="flex flex-wrap items-center justify-between w-full border-b border-slate-800 pb-3 px-1 gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider">🎯 本次发音得分:</span>
                                    <span className={`px-2.5 py-1 rounded-lg font-mono font-black text-sm border ${
                                      scorePct >= 80
                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                        : scorePct >= 50
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                    }`}>
                                      {scorePct}分
                                    </span>
                                  </div>
                                  <div className="text-xs font-mono text-slate-400">
                                    准确命中: <span className="text-emerald-400 font-bold">{matchedCount}</span> / <span className="text-slate-300 font-bold">{validTokens.length}</span> 词
                                  </div>
                                </div>

                                {/* Cloze / Blank Sentence Display */}
                                <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-5 text-center shadow-inner">
                                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-3">
                                    SENTENCE RECOGNITION (挖空部分为读音有误或未读出的单词)
                                  </div>
                                  <div className="text-base sm:text-lg font-mono leading-loose flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
                                    {targetTokens.map((token, idx) => {
                                      const isMatched = matchedIndices.has(idx);
                                      return isMatched ? (
                                        <span key={token.id} className="inline-flex items-center text-emerald-300 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg shadow-sm">
                                          {token.prefix}
                                          <span>{token.clean}</span>
                                          {token.suffix}
                                          <span className="text-[10px] text-emerald-400 ml-1 font-bold">✓</span>
                                        </span>
                                      ) : (
                                        <span
                                          key={token.id}
                                          className="inline-flex items-center text-slate-400 font-bold bg-slate-950/80 border border-dashed border-amber-500/40 px-3 py-1 rounded-lg select-none"
                                        >
                                          {token.prefix}
                                          <span className="text-amber-400/90 tracking-widest font-black">______</span>
                                          {token.suffix}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div className="text-[11px] text-slate-400 font-mono text-center flex items-center gap-1.5">
                                  <span>💡</span>
                                  <span>提示：将挖空 <strong>______</strong> 处的单词读准，点击大麦克风重新朗读整句！</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Success Card on Complete Match */}
                          {isAllMatched && (
                            <div className="w-full max-w-2xl mt-4 p-5 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.4)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce">
                              <div className="flex items-center gap-3">
                                <span className="text-3xl">🎉</span>
                                <div>
                                  <div className="font-black text-base sm:text-lg text-emerald-200">
                                    PERFECT! 本句全部单词发音正确！
                                  </div>
                                  <div className="text-xs text-emerald-400/90 font-mono">
                                    请点击右侧按钮进入下一句。
                                  </div>
                                </div>
                              </div>

                              {translationSentenceIdx < translationSentences.length - 1 ? (
                                <button
                                  type="button"
                                  onClick={handleNextSentence}
                                  className="shrink-0 px-6 py-3 rounded-xl font-black text-xs sm:text-sm font-mono uppercase tracking-wider bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                  Next Sentence ▶
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleCompleteTranslation}
                                  disabled={isSaving}
                                  className="shrink-0 px-6 py-3 rounded-xl font-black text-xs sm:text-sm font-mono uppercase tracking-wider bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-lg transition-all cursor-pointer hover:scale-105 active:scale-95"
                                >
                                  {isSaving ? 'Saving...' : '🎉 完成关卡 (+100 🪙)'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Explicit iPad Keyboard / Manual Input Fallback (Testing Mode Only) */}
                        {matchingSubMode === 'testing' && (
                          <div className="w-full bg-slate-950/90 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-center text-xs font-mono text-slate-400">
                              <span className="flex items-center gap-1.5">
                                ⌨️ 键盘备用输入（支持 iPad 键盘自带麦克风听写）：
                              </span>
                              {(translationTypedText || spokenTranscript) && (
                                <button
                                  type="button"
                                  onClick={handleTranslationTouchClear}
                                  className="text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer bg-transparent border-0 font-bold text-xs"
                                >
                                  🗑️ 清空重试
                                </button>
                              )}
                            </div>
                            <input
                              ref={translationInputRef}
                              type="text"
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
                              placeholder="点击此处在输入框打字..."
                              value={translationTypedText}
                              onChange={handleTranslationTypingChange}
                              autoComplete="off"
                              autoCapitalize="off"
                              autoCorrect="off"
                              spellCheck={false}
                            />
                          </div>
                        )}

                        {/* Next / Previous Sentence Navigation Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                          <button
                            type="button"
                            disabled={translationSentenceIdx === 0}
                            onClick={handlePrevSentence}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all border flex items-center gap-1.5 ${
                              translationSentenceIdx > 0
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                                : 'bg-slate-900/40 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-50'
                            }`}
                          >
                            ◀ Previous Sentence
                          </button>

                          {translationSentenceIdx < translationSentences.length - 1 ? (
                            <button
                              type="button"
                              onClick={handleNextSentence}
                              className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all border flex items-center gap-1.5 shadow-md cursor-pointer active:translate-y-0.5 ${
                                matchingSubMode === 'reading'
                                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 border-cyan-400 font-black'
                                  : isAllMatched
                                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 border-cyan-400 animate-pulse font-black scale-105'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                              }`}
                              title="Go to next sentence"
                            >
                              Next Sentence ▶
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={matchingSubMode === 'testing' ? (!isAllMatched || isSaving) : isSaving}
                              onClick={handleCompleteTranslation}
                              className={`px-5 py-2 rounded-xl text-xs font-bold font-mono transition-all border flex items-center gap-1.5 shadow-md ${
                                matchingSubMode === 'reading' || isAllMatched
                                  ? 'bg-gradient-to-r from-cyan-500 via-emerald-400 to-teal-400 text-slate-950 border-cyan-400 cursor-pointer font-black'
                                  : 'bg-slate-900/40 text-slate-600 border-slate-800/50 cursor-not-allowed opacity-50'
                              }`}
                            >
                              {isSaving ? 'Saving...' : '🎉 完成关卡 (+100 🪙)'}
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Translation Stage Success Overlay */}
              {gameMode === 'translation' && stage === 'translation_success' && (
                <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-cyan-500 to-amber-500"></div>
                  <div className="text-5xl mb-4 animate-bounce text-yellow-400 select-none">👑</div>
                  <div className="text-4xl mb-4 animate-pulse select-none">🚀💨</div>
                  <h2 className="text-2xl font-black text-cyan-400 mb-3 tracking-wider">🎉 TRANSLATION MASTERED!</h2>
                  <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    You have successfully completed the Chinese-to-English translation drill for **{island.name}**!
                  </p>
                  
                  <div className="w-full space-y-3 mb-8">
                    <div className="bg-yellow-950/20 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                      🪙 +100 Coins Secured
                    </div>
                    <div className="bg-cyan-950/20 border border-cyan-500/30 text-cyan-400 px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                      👾 Intrusion Matrix Decryption Unlocked
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-lg transition-all active:translate-y-0.5 cursor-pointer hover:shadow-cyan-500/20"
                    onClick={onBack}
                    disabled={isSaving}
                  >
                    🗺️ Return to Navigation Graph
                  </button>
                </div>
              )}

              {/* === STAGE 3: WORD FALLING DEFENDER MODE === */}
              {gameMode === 'falling' && (
                <div className="w-full max-w-5xl mx-auto flex flex-col gap-6 transition-all duration-300">
                  {fallingGameState === 'setup' && (
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 sm:p-8 text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-cyan-500 to-rose-500"></div>
                      <h2 className="text-xl font-black text-cyan-400 mb-4 tracking-wider uppercase">
                        👾 INTRUSION MATRIX TERMINAL (WORD DEFENDER)
                      </h2>
                      <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-8">
                        Word data packets are descending from the top. Enter the exact word text and press Enter to vaporize them before they breach the red defense shield boundary.
                      </p>
                      
                      <div className="w-full space-y-4 mb-8">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-black">
                          Select execution speed (difficulty coefficient):
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { label: 'BABY', speed: 0.3, multiplier: 0.3 },
                            { label: 'EASY', speed: 0.6, multiplier: 0.6 },
                            { label: 'NORMAL', speed: 1.0, multiplier: 1.0 },
                            { label: 'HARD', speed: 1.8, multiplier: 1.8 }
                          ].map((diff) => (
                            <button
                              key={diff.label}
                              type="button"
                              className={`py-3 px-2 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                                difficulty.label === diff.label
                                  ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-black'
                                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                              }`}
                              onClick={() => setDifficulty(diff)}
                            >
                              {diff.label} ({diff.multiplier}x)
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-8 py-4 rounded-xl text-xs tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] animate-pulse hover:scale-[1.02] cursor-pointer"
                        onClick={() => setFallingGameState('playing')}
                      >
                        &gt; RUN WORD_DEFENDER.EXE
                      </button>
                    </div>
                  )}

                  {fallingGameState === 'playing' && (
                    <div className={`relative w-full min-h-[520px] h-[65vh] max-h-[750px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col transition-all duration-300 ${isBaseHit ? 'base-hit-shake' : ''}`}>
                      {/* Grid background effect */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none"></div>
                      
                      {/* Safety line indicator */}
                      <div className="absolute bottom-[15%] left-0 right-0 border-t-2 border-dashed border-rose-500/30 pointer-events-none"></div>

                      {/* HUD Dashboard */}
                      <div className="relative flex justify-between items-center p-4 bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-sm z-10 select-none">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shield:</span>
                          <div className="w-24 h-2 bg-slate-950 border border-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                shield >= 4 ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : shield === 3 ? 'bg-yellow-500 shadow-[0_0_8px_#f59e0b]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                              }`}
                              style={{ width: `${(shield / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-400 font-mono">{shield}/5</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-extrabold text-slate-500 tracking-wider">SCORE</span>
                          <span className="text-xl font-black text-cyan-400 font-mono drop-shadow-[0_0_5px_rgba(6,182,212,0.4)]">{String(score).padStart(4, '0')}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-extrabold text-slate-500 tracking-wider">SPEED</span>
                          <span className="text-xs font-black text-emerald-400 font-mono">{difficulty.label}</span>
                        </div>
                      </div>

                      {/* Falling Space Area */}
                      <div className="relative flex-1 w-full overflow-hidden select-none">
                        {fallingWords.map((w) => (
                          <div
                            key={w.id}
                            className={`absolute transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 border px-3 py-1.5 rounded-xl shadow-lg text-center flex flex-col items-center min-w-[110px] z-10 backdrop-blur-sm cursor-default ${
                              w.targeted
                                ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/50'
                                : 'border-cyan-500/30 hover:border-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.05)]'
                            }`}
                            style={{ left: `${w.x}%`, top: `${w.y}%` }}
                          >
                            <div className="text-xs sm:text-sm font-extrabold text-slate-100 tracking-wide font-mono">
                              {renderWordWithHighlight(w.word, fallingInputText)}
                            </div>
                          </div>
                        ))}

                        {bullets.map((b) => (
                          <div
                            key={b.id}
                            className="absolute w-1 h-3 bg-cyan-400 rounded-full laser-bullet-glow transform -translate-x-1/2 -translate-y-1/2 z-20"
                            style={{ left: `${b.currentX}%`, top: `${b.currentY}%` }}
                          />
                        ))}

                        {explosions.map((exp) => (
                          <div
                            key={exp.id}
                            className="absolute w-8 h-8 bg-amber-500 rounded-full explosion-burst-effect transform -translate-x-1/2 -translate-y-1/2 z-20"
                            style={{ left: `${exp.x}%`, top: `${exp.y}%` }}
                          />
                        ))}

                        {/* Defending Spaceship Base */}
                        <div
                          className={`absolute bottom-[2%] left-1/2 transform -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none ${
                            isBaseHit ? 'spaceship-base-shake' : ''
                          }`}
                        >
                          <div className={`text-2xl relative inline-block transition-transform duration-100 ${isBaseHit ? 'defending-spaceship-shake' : ''}`}>
                            🚀
                            <span className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 text-xs thruster-flame-anim">🔥</span>
                          </div>
                        </div>
                      </div>

                      {/* Command Console Input Form */}
                      <form className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center z-10" onSubmit={handleDosInputSubmit}>
                        <span className="text-cyan-400 font-mono text-sm font-bold mr-2 select-none">guest@wordquest:~#</span>
                        <input
                          id="space-battle-console-input"
                          type="text"
                          className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-sm font-mono focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/35 outline-none placeholder:text-slate-700"
                          value={fallingInputText}
                          onChange={(e) => {
                            const val = e.target.value;
                            // Block sudden multi-character insertion (e.g. iPad voice dictation chunk)
                            if (val.length > fallingInputText.length + 1) {
                              return;
                            }
                            if (/^[a-zA-Z\s'-]*$/.test(val)) {
                              setFallingInputText(val);
                            }
                          }}
                          onBeforeInput={(e: any) => {
                            const inputType = e.nativeEvent?.inputType || e.inputType;
                            const data = e.nativeEvent?.data ?? e.data;
                            // Block all WebKit dictation & composition inputTypes
                            if (
                              inputType === 'insertFromDictation' ||
                              inputType === 'insertDictationPhrase' ||
                              inputType === 'insertCompositionText' ||
                              inputType === 'insertFromComposition' ||
                              inputType === 'insertReplacementText'
                            ) {
                              e.preventDefault();
                              return;
                            }
                            // Block multi-character voice burst
                            if (data && typeof data === 'string' && data.length > 1) {
                              e.preventDefault();
                              return;
                            }
                          }}
                          onCompositionStart={(e) => e.preventDefault()}
                          onCompositionUpdate={(e) => e.preventDefault()}
                          onCompositionEnd={(e) => e.preventDefault()}
                          onPaste={(e) => e.preventDefault()}
                          onDrop={(e) => e.preventDefault()}
                          placeholder="ENTER WORD TO VAPORIZE (TYPING ONLY)..."
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          autoFocus
                        />
                      </form>
                    </div>
                  )}

                  {(fallingGameState === 'gameover' || fallingGameState === 'victory') && (
                    <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-cyan-500 to-rose-500"></div>
                      <div className={`text-2xl font-black mb-4 tracking-widest uppercase ${
                        fallingGameState === 'victory'
                          ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                          : 'text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                      }`}>
                        {fallingGameState === 'victory' ? 'MISSION ACCOMPLISHED' : 'SYSTEM DEFENSE BREAK'}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed mb-6 font-mono">
                        {fallingGameState === 'victory'
                          ? '🏆 Threat neutralized! You have successfully defended the core sector!'
                          : '🛡️ Defenses penetrated. Shield depleted. System collapsed!'}
                      </p>
                      
                      <div className="w-full max-w-xs bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 mb-8">
                        <div className="flex justify-between text-xs font-bold text-slate-400 font-mono">
                          <span>Base Score:</span>
                          <span>{score}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-slate-400 font-mono">
                          <span>Speed Multiplier:</span>
                          <span>{difficulty.label} ({difficulty.multiplier}x)</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-emerald-400 border-t border-slate-800 pt-2 font-mono">
                          <span>Coins Earned:</span>
                          <span>🪙 +{earnedCoins}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-4 rounded-xl text-xs tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02] cursor-pointer"
                        onClick={onBack}
                        disabled={isSaving}
                      >
                        {isSaving ? 'SAVING DATA_PACKETS...' : '> EXIT_TO_MAP.EXE'}
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </FormBoundary>
        </SuspenseState>
      </div>
      )}

      {activeBubble && createPortal(
        <div
          className="absolute z-50 bg-[#0B0F19]/95 border border-cyan-500/50 shadow-2xl shadow-cyan-500/20 rounded-xl p-3 text-xs w-80 text-slate-200 transform -translate-x-1/2 transition-all duration-300 font-mono backdrop-blur-md"
          style={{ top: activeBubble.top, left: activeBubble.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-cyan-500/20">
            <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
              {activeBubble.type === 'word' ? '💡 Word Decryption' : '💡 Sentence Translation'}
            </span>
            <button
              id="btn-close-bubble"
              className="text-slate-400 hover:text-cyan-400 transition-colors font-bold text-sm bg-transparent border-0 cursor-pointer"
              onClick={() => setActiveBubble(null)}
            >
              ✕
            </button>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-black text-white tracking-wide">{activeBubble.original}</span>
              <button
                type="button"
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded px-2 py-0.5 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                onClick={() => playTTS(activeBubble.original)}
                title="Pronounce"
              >
                🔊 Play
              </button>
            </div>
            <div className="text-cyan-300 text-xs font-bold leading-relaxed flex flex-col gap-1">
              <span>{activeBubble.translation}</span>
              <button
                type="button"
                className="self-start bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded px-2 py-0.5 text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer mt-0.5"
                onClick={() => playChineseTTS(activeBubble.translation)}
                title="粤语朗读"
              >
                🗣️ 粤语朗读
              </button>
            </div>
            {activeBubble.type === 'word' && activeBubble.sentence && (
              <div className="bg-[#070A12] border border-slate-800 p-2 rounded-lg text-[10px] leading-relaxed space-y-1">
                <div className="text-slate-500 font-extrabold uppercase tracking-widest text-[9px]">Context:</div>
                <div className="text-slate-200 font-semibold">{activeBubble.sentence}</div>
                <div className="text-slate-400 italic">{activeBubble.sentence_translation}</div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
