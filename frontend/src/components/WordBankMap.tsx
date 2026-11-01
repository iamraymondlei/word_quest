import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './AdventureMap.css';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import { apiService } from '../utils/apiService';
import { isIPadOrTabletDevice } from '../utils/device';
import {
  BUDDY_CHARACTERS,
  normalizeBuddyKey,
  RunnerSprite
} from './StoryChaseAssets';
import { parseBilingual, playBilingualSpeech } from '../utils/bilingual';

export interface SentenceItem {
  en: string;
  zh: string;
}

export interface VocabularyWord {
  id: number;
  book_id: number;
  word: string;
  phonetic?: string;
  part_of_speech?: string;
  translation: string;
  fun_sentences?: SentenceItem[];
  fun_sentences_json?: any;
  root_affixes?: string;
  antonyms?: string;
  synonyms?: string;
  etymology?: string;
  reading_passed?: number | boolean;
  spelling_passed?: number | boolean;
  mastered?: number | boolean;
  error_count?: number;
  correct_count?: number;
  weak_score?: number;
  streak?: number;
}

export interface WordBook {
  id: number;
  category?: string;
  title: string;
  description?: string;
  tags?: string;
  sort_order?: number;
  word_count?: number;
  mastered_count?: number;
  started_count?: number;
  completed_stages_mask?: number;
  assigned_user_ids?: number[];
}

interface WordBankMapProps {
  currentUser: {
    id: number;
    username: string;
    coins: number;
    avatar?: string;
    stars?: number;
    spent_stars?: number;
    is_admin?: number;
  };
  theme?: 'cyber' | 'bright';
  fontScale?: '100' | '115' | '130';
  onThemeChange?: (theme: 'cyber' | 'bright') => void;
  onFontScaleChange?: (scale: '100' | '115' | '130') => void;
  onBackToStories: () => void;
  onOpenSongs?: () => void;
  onLogout?: () => void;
  onUpdateUser?: (updatedUser: any) => void;
  hideHeader?: boolean;
  autoOpenWeakWords?: boolean;
  onCloseWeakWords?: () => void;
}

type StageMode = 'learn' | 'reading' | 'spelling';

const FALLBACK_DISTRACTORS = [
  '微小的；不重要的',
  '迅速敏捷的；灵活的',
  '危险可怖的',
  '平静安详的',
  '明亮耀眼的',
  '坚强不屈的',
  '神秘莫测的',
  '古老而深奥的',
  '勇敢无畏的',
  '充满好奇心的',
  '疲倦衰竭的',
  '精致脆弱的'
];

export const getWordSentences = (word: VocabularyWord | null): SentenceItem[] => {
  if (!word) return [];
  if (Array.isArray(word.fun_sentences) && word.fun_sentences.length > 0) {
    return word.fun_sentences.filter(s => s && (s.en || s.zh));
  }
  if (word.fun_sentences_json) {
    try {
      const parsed = typeof word.fun_sentences_json === 'string'
        ? JSON.parse(word.fun_sentences_json)
        : word.fun_sentences_json;
      if (Array.isArray(parsed)) return parsed.filter((s: any) => s && (s.en || s.zh));
    } catch {
      // ignore
    }
  }
  return [];
};

export const getSentenceForWord = (word: VocabularyWord | null): string => {
  if (!word) return '';
  const sList = getWordSentences(word);
  const found = sList.find(s => s && s.en && s.en.toLowerCase().includes(word.word.toLowerCase()));
  if (found && found.en) return found.en;
  if (sList.length > 0 && sList[0].en) return sList[0].en;
  return `The story hero is very curious about the word "${word.word}".`;
};

export const renderSentenceWithHighlight = (sentence: string, targetWord: string) => {
  if (!sentence || !targetWord) return <span>{sentence}</span>;
  const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(\\b${escaped}\\b|${escaped})`, 'gi');
  const parts = sentence.split(regex);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.toLowerCase() === targetWord.toLowerCase()) {
          return (
            <span
              key={idx}
              className="text-cyan-300 font-black underline decoration-cyan-400 decoration-4 underline-offset-4 bg-cyan-950/80 px-2 py-0.5 rounded-lg shadow-[0_0_12px_rgba(6,182,212,0.35)] mx-1 inline-block"
            >
              {part}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
};

export const WordBankMap: React.FC<WordBankMapProps> = ({
  currentUser,
  fontScale = '130',
  onFontScaleChange,
  onBackToStories,
  onOpenSongs,
  onLogout,
  onUpdateUser,
  hideHeader = false,
  autoOpenWeakWords,
  onCloseWeakWords
}) => {
  // Books & Category state
  const [books, setBooks] = useState<WordBook[]>([]);
  const [loadingBooks, setLoadingBooks] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('wordquest_selected_vocab_series');
      if (!saved || saved === 'ALL' || saved === '__ALL__' || saved.trim() === '') return null;
      return saved;
    } catch {
      return null;
    }
  });

  const [hideThreeStars, setHideThreeStars] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wordquest_hide_completed_vocab_books') === 'true';
    } catch {
      return false;
    }
  });

  const toggleHideThreeStars = () => {
    setHideThreeStars(prev => {
      const next = !prev;
      try {
        localStorage.setItem('wordquest_hide_completed_vocab_books', String(next));
      } catch {}
      return next;
    });
  };

  // Active Stage Game State (null = on Map View, non-null = playing chapter stage)
  const [activePlayingBook, setActivePlayingBook] = useState<WordBook | null>(null);
  const [activeStage, setActiveStage] = useState<StageMode | null>(null);
  const [chapterWords, setChapterWords] = useState<VocabularyWord[]>([]);
  const [loadingWords, setLoadingWords] = useState<boolean>(false);
  const [learnCompleted, setLearnCompleted] = useState<boolean>(false);

  // Weak words targeted practice modal (TASK-12.1)
  const [showWeakWordsModal, setShowWeakWordsModal] = useState<boolean>(false);
  const [weakWordsList, setWeakWordsList] = useState<any[]>([]);
  const [loadingWeakWords, setLoadingWeakWords] = useState<boolean>(false);

  // General feedback toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Buddy identity
  const currentBuddy = useMemo(() => {
    const key = normalizeBuddyKey(currentUser.avatar);
    return BUDDY_CHARACTERS.find((b) => b.key === key) || BUDDY_CHARACTERS[0];
  }, [currentUser.avatar]);

  // Audio synthesis helper with dual language (en-US / Cantonese zh-HK) support
  const playSpeech = useCallback((text: string, lang: 'en' | 'yue' | 'zh' = 'en') => {
    playBilingualSpeech(text, lang, () => {
      showToast(`🔊 [Cannot speak]: Speech not supported on this device`);
    });
  }, []);

  const playWordAudio = useCallback((text: string) => {
    playSpeech(text, 'en');
  }, [playSpeech]);

  const [gameSettings, setGameSettings] = useState<{ coins_vocab_reading: number; coins_vocab_spelling: number }>({
    coins_vocab_reading: 10,
    coins_vocab_spelling: 20
  });

  // 1. Fetch word books & game settings
  const loadBooks = useCallback(async () => {
    try {
      setLoadingBooks(true);
      const [data, settings] = await Promise.all([
        apiService.getWordBooks(currentUser.id),
        apiService.getGameSettings().catch(() => null)
      ]);
      setBooks(data || []);
      if (settings) {
        setGameSettings({
          coins_vocab_reading: Number(settings.coins_vocab_reading) || 10,
          coins_vocab_spelling: Number(settings.coins_vocab_spelling) || 20
        });
      }
    } catch (err) {
      console.error('Failed to load word books:', err);
    } finally {
      setLoadingBooks(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Scroll window to top when mounting or changing view
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activePlayingBook]);

  // Category groupings
  const { availableCategories, categoryStats, allStats } = useMemo(() => {
    const catSet = new Set<string>();
    const stats: Record<string, { count: number; totalWords: number; masteredWords: number; startedWords: number }> = {};
    const all = { count: books.length, totalWords: 0, masteredWords: 0, startedWords: 0 };

    books.forEach((b) => {
      const c = (b.category && b.category.trim()) || 'General';
      catSet.add(c);
      if (!stats[c]) {
        stats[c] = { count: 0, totalWords: 0, masteredWords: 0, startedWords: 0 };
      }
      const wCount = b.word_count || 0;
      const mCount = b.mastered_count || 0;
      const sCount = b.started_count || 0;

      stats[c].count += 1;
      stats[c].totalWords += wCount;
      stats[c].masteredWords += mCount;
      stats[c].startedWords += sCount;

      all.totalWords += wCount;
      all.masteredWords += mCount;
      all.startedWords += sCount;
    });

    const sortedCats = Array.from(catSet).sort((a, b) => {
      if (a === 'General') return 1;
      if (b === 'General') return -1;
      return a.localeCompare(b);
    });

    return { availableCategories: sortedCats, categoryStats: stats, allStats: all };
  }, [books]);

  const handleSelectCategory = (cat: string | null) => {
    setSelectedCategory(cat);
    try {
      if (cat === null) {
        localStorage.setItem('wordquest_selected_vocab_series', 'ALL');
      } else {
        localStorage.setItem('wordquest_selected_vocab_series', cat);
      }
    } catch {
      // ignore
    }
  };

  const displayedBooks = useMemo(() => {
    let list = selectedCategory === null ? books : books.filter(b => ((b.category && b.category.trim()) || 'General') === selectedCategory);
    if (hideThreeStars) {
      list = list.filter(b => {
        const mask = b.completed_stages_mask || 0;
        const stars = (mask & 1 ? 1 : 0) + (mask & 2 ? 1 : 0) + (mask & 4 ? 1 : 0);
        return stars < 3;
      });
    }
    return list;
  }, [books, selectedCategory, hideThreeStars]);

  const currentCategoryStat = selectedCategory !== null
    ? (categoryStats[selectedCategory] || { count: 0, totalWords: 0, masteredWords: 0, startedWords: 0 })
    : allStats;

  // Launch Stage Gameplay
  const handleStartStage = async (book: WordBook, stage: StageMode) => {
    if ((book.word_count || 0) === 0) {
      showToast('⚠️ No words in this chapter yet. Please import words in Parent Portal!');
      return;
    }
    setActivePlayingBook(book);
    setActiveStage(stage);
    setLearnCompleted(false);

    if (book.id === -1) {
      // Virtual weak words drill mode
      setLearnIdx(0);
      if (stage === 'reading') {
        initQuizRound(chapterWords);
      } else if (stage === 'spelling') {
        initSpellingRound(chapterWords);
      }
      return;
    }

    setLoadingWords(true);
    try {
      const data = await apiService.getBookWords(book.id, currentUser.id);
      setChapterWords(data || []);
      // Reset stage game states
      setLearnIdx(0);
      if (stage === 'reading') {
        initQuizRound(data || []);
      } else if (stage === 'spelling') {
        initSpellingRound(data || []);
      }
    } catch (err) {
      console.error('Failed to load words for chapter stage:', err);
      showToast('⚠️ Failed to load chapter words');
    } finally {
      setLoadingWords(false);
    }
  };

  // Completion recording helper for Stage 1, 2, 3
  const recordStageCompletion = async (stage: 1 | 2 | 3) => {
    if (!activePlayingBook || activePlayingBook.id <= 0) return;
    try {
      const res = await apiService.recordWordBookProgress(activePlayingBook.id, currentUser.id, stage);
      if (res) {
        const stageBit = 1 << (stage - 1);
        const newMask = res.completed_stages_mask ?? (((activePlayingBook.completed_stages_mask || 0) | stageBit) & 7);
        setActivePlayingBook(prev => prev ? { ...prev, completed_stages_mask: newMask } : null);
        setBooks(prev => prev.map(b => b.id === activePlayingBook.id ? { ...b, completed_stages_mask: newMask } : b));

        if (res.is_new_clear) {
          const addedStars = res.stars_awarded ?? 1;
          const addedCoins = res.coins_awarded ?? 50;
          const updatedStars = (currentUser.stars || 0) + addedStars;
          const updatedCoins = (currentUser.coins || 0) + addedCoins;
          onUpdateUser?.({
            ...currentUser,
            stars: updatedStars,
            coins: updatedCoins
          });
          showToast(`⭐ Stage Cleared! +1 Star! +${addedCoins} EXP!`);
        }
      }
    } catch (e) {
      console.warn('Failed to record word book stage completion:', e);
    }
  };

  const handleFinishLearn = async () => {
    setLearnCompleted(true);
    await recordStageCompletion(1);
  };

  // Back to Map from stage
  const handleBackToMap = async () => {
    setActivePlayingBook(null);
    setActiveStage(null);
    setChapterWords([]);
    setShowWordDrawer(false);
    setLearnCompleted(false);
    await loadBooks();
  };

  // ── Stage 1: Learn Flashcard State ─────────────────────────────────────
  const [learnIdx, setLearnIdx] = useState<number>(0);
  const [showWordDrawer, setShowWordDrawer] = useState<boolean>(false);
  const wordPillsRef = useRef<HTMLDivElement | null>(null);
  const currentLearnWord = chapterWords[learnIdx] || null;

  useEffect(() => {
    if (activeStage === 'learn' && currentLearnWord) {
      playWordAudio(currentLearnWord.word);
    }
  }, [activeStage, learnIdx, currentLearnWord, playWordAudio]);

  // Auto-scroll active pill into view in the top quick picker bar
  useEffect(() => {
    if (activeStage === 'learn' && wordPillsRef.current) {
      const activePill = wordPillsRef.current.querySelector(`[data-pill-idx="${learnIdx}"]`);
      if (activePill) {
        activePill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [learnIdx, activeStage]);

  // Keyboard navigation for Learn mode: ArrowLeft, ArrowRight, Space
  useEffect(() => {
    if (activeStage !== 'learn') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLearnIdx(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLearnIdx(prev => Math.min(chapterWords.length - 1, prev + 1));
      } else if (e.key === ' ' || e.code === 'Space') {
        if (currentLearnWord) {
          e.preventDefault();
          playWordAudio(currentLearnWord.word);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeStage, chapterWords.length, currentLearnWord, playWordAudio]);

  // ── Stage 2: Reading Context Quiz State ────────────────────────────────
  const [quizIdx, setQuizIdx] = useState<number>(0);
  const [quizList, setQuizList] = useState<VocabularyWord[]>([]);
  const [quizOptions, setQuizOptions] = useState<{ id: string; text: string; isCorrect: boolean }[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [quizAnswered, setQuizAnswered] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [combo, setCombo] = useState<number>(0);
  const [roundCoins, setRoundCoins] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  const initQuizRound = (wordsList: VocabularyWord[]) => {
    if (wordsList.length === 0) return;
    const shuffled = [...wordsList].sort(() => Math.random() - 0.5);
    setQuizList(shuffled);
    setQuizIdx(0);
    setCombo(0);
    setRoundCoins(0);
    setQuizCompleted(false);
    setSelectedOptionId(null);
    setQuizAnswered(false);
    setTimeLeft(10);
  };

  const currentQuizWord = quizList[quizIdx] || null;

  const generateOptionsForWord = useCallback((targetWord: VocabularyWord) => {
    const targetMeaning = (targetWord.translation || '').trim();
    const distractors = chapterWords
      .filter(w => w.id !== targetWord.id && w.translation && w.translation.trim() && w.translation.trim() !== targetMeaning)
      .map(w => w.translation.trim());
    
    const pool = Array.from(new Set([...distractors, ...FALLBACK_DISTRACTORS]))
      .filter(d => d && d !== targetMeaning)
      .sort(() => Math.random() - 0.5);

    const chosenDistractors = pool.slice(0, 3);
    const allOptions = [
      { id: 'correct', text: targetMeaning, isCorrect: true },
      ...chosenDistractors.map((text, i) => ({ id: `distractor-${i}`, text, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    setQuizOptions(allOptions);
    setSelectedOptionId(null);
    setQuizAnswered(false);
    setTimeLeft(10);
  }, [chapterWords]);

  useEffect(() => {
    if (activeStage === 'reading' && currentQuizWord && !quizCompleted) {
      generateOptionsForWord(currentQuizWord);
    }
  }, [activeStage, quizIdx, currentQuizWord, quizCompleted, generateOptionsForWord]);

  // Quiz timer
  useEffect(() => {
    if (activeStage !== 'reading' || quizCompleted || quizAnswered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleQuizTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeStage, quizIdx, quizAnswered, quizCompleted]);

  const handleQuizTimeout = async () => {
    if (quizAnswered || !currentQuizWord) return;
    setQuizAnswered(true);
    setCombo(0);
    showToast("⏱️ Time's up! Missed question recorded");
    await apiService.recordVocabularyProgress(currentQuizWord.id, currentUser.id, 'reading', false, { answer: 'TIMEOUT' });
    setTimeout(() => {
      advanceQuizQuestion();
    }, 1800);
  };

  const handleSelectOption = async (option: { id: string; text: string; isCorrect: boolean }) => {
    if (quizAnswered || !currentQuizWord) return;
    setQuizAnswered(true);
    setSelectedOptionId(option.id);
    if (timerRef.current) clearInterval(timerRef.current);

    if (option.isCorrect) {
      const nextCombo = combo + 1;
      setCombo(nextCombo);
      const isNewlyPassed = !currentQuizWord.reading_passed;
      const baseReward = gameSettings.coins_vocab_reading || 10;
      const earnedCoins = isNewlyPassed ? baseReward : Math.max(1, Math.round(baseReward * 0.2));
      setRoundCoins(prev => prev + earnedCoins);
      const updatedCoins = currentUser.coins + earnedCoins;
      onUpdateUser?.({ ...currentUser, coins: updatedCoins });
      showToast(isNewlyPassed ? `🎯 Correct! Combo x${nextCombo} +${earnedCoins} EXP` : `🎯 Review Correct! Combo x${nextCombo} +${earnedCoins} EXP`);
      playWordAudio(currentQuizWord.word);
      apiService.recordVocabularyProgress(currentQuizWord.id, currentUser.id, 'reading', true, { answer: option.text }).then(res => {
        if (res && typeof res.coins_awarded === 'number' && res.coins_awarded !== earnedCoins) {
          // Sync exact server awarded amount if different
          const diff = res.coins_awarded - earnedCoins;
          onUpdateUser?.({ ...currentUser, coins: updatedCoins + diff });
        }
      }).catch(() => {});
    } else {
      setCombo(0);
      showToast(`❌ Incorrect! Correct meaning: ${currentQuizWord.translation}`);
      await apiService.recordVocabularyProgress(currentQuizWord.id, currentUser.id, 'reading', false, { answer: option.text });
    }

    setTimeout(() => {
      advanceQuizQuestion();
    }, 1600);
  };

  const advanceQuizQuestion = () => {
    if (quizIdx + 1 < quizList.length) {
      setQuizIdx(prev => prev + 1);
    } else {
      setQuizCompleted(true);
      recordStageCompletion(2);
    }
  };

  // ── Stage 3: Spelling Arena State ──────────────────────────────────────
  const [spellList, setSpellList] = useState<VocabularyWord[]>([]);
  const [spellIdx, setSpellIdx] = useState<number>(0);
  const [typedValue, setTypedValue] = useState<string>('');
  const [spellAnswered, setSpellAnswered] = useState<boolean>(false);
  const [spellIsCorrect, setSpellIsCorrect] = useState<boolean | null>(null);
  const [spellCompleted, setSpellCompleted] = useState<boolean>(false);
  const spellInputRef = useRef<HTMLInputElement>(null);

  const initSpellingRound = (wordsList: VocabularyWord[]) => {
    if (wordsList.length === 0) return;
    const shuffled = [...wordsList].sort(() => Math.random() - 0.5);
    setSpellList(shuffled);
    setSpellIdx(0);
    setTypedValue('');
    setSpellAnswered(false);
    setSpellIsCorrect(null);
    setSpellCompleted(false);
  };

  const currentSpellWord = spellList[spellIdx] || null;
  const isTablet = useMemo(() => isIPadOrTabletDevice(), []);

  useEffect(() => {
    if (activeStage === 'spelling' && currentSpellWord && !spellCompleted) {
      setTypedValue('');
      setSpellAnswered(false);
      setSpellIsCorrect(null);

      // Safe audio play
      try {
        playWordAudio(currentSpellWord.word);
      } catch (err) {
        console.warn('Auto playWordAudio skipped:', err);
      }

      // On desktop PC with physical keyboard, auto-focus input for convenience.
      // On iPad / touch devices, DO NOT force programmatic focus in setTimeout (blocks iOS WebKit & freezes audio session).
      if (!isTablet) {
        setTimeout(() => {
          spellInputRef.current?.focus();
        }, 150);
      }
    }
  }, [activeStage, spellIdx, currentSpellWord, spellCompleted, playWordAudio, isTablet]);

  const processSpellingInput = (rawVal: string) => {
    if (spellAnswered || !currentSpellWord) return;
    const targetClean = currentSpellWord.word.trim().toLowerCase();

    // Allow a-z, spaces, hyphens, and apostrophes
    let cleanVal = rawVal.toLowerCase().replace(/[^a-z\s\-']/g, '');

    // Prevent leading spaces or multiple consecutive spaces
    cleanVal = cleanVal.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');

    // Smart auto-completion of separators (space, hyphen, apostrophe):
    // If target has a separator at the current position, and user typed the next letter directly:
    // e.g. target is "ice cream" (pos 3 is ' '), child typed "icec" (len 4) -> auto-insert space -> "ice c"
    if (cleanVal.length > 0 && cleanVal.length <= targetClean.length) {
      const prevIdx = cleanVal.length - 1;
      const expectedSep = targetClean[prevIdx];
      if ((expectedSep === ' ' || expectedSep === '-' || expectedSep === "'") && cleanVal[prevIdx] !== expectedSep) {
        cleanVal = cleanVal.slice(0, prevIdx) + expectedSep + cleanVal.slice(prevIdx);
      }
    }

    if (cleanVal.length > targetClean.length) {
      cleanVal = cleanVal.slice(0, targetClean.length);
    }
    setTypedValue(cleanVal);

    if (cleanVal === targetClean) {
      setSpellAnswered(true);
      setSpellIsCorrect(true);
      const isNewlyPassed = !currentSpellWord.spelling_passed;
      const baseReward = gameSettings.coins_vocab_spelling || 20;
      const earnedCoins = isNewlyPassed ? baseReward : Math.max(1, Math.round(baseReward * 0.2));
      setRoundCoins(prev => prev + earnedCoins);
      const updatedCoins = currentUser.coins + earnedCoins;
      onUpdateUser?.({ ...currentUser, coins: updatedCoins });
      showToast(isNewlyPassed ? `🎉 Perfect spelling! +${earnedCoins} EXP` : `🎉 Review spelling cleared! +${earnedCoins} EXP`);
      playWordAudio(currentSpellWord.word);
      apiService.recordVocabularyProgress(currentSpellWord.id, currentUser.id, 'spelling', true, { answer: cleanVal }).then(res => {
        if (res && typeof res.coins_awarded === 'number' && res.coins_awarded !== earnedCoins) {
          const diff = res.coins_awarded - earnedCoins;
          onUpdateUser?.({ ...currentUser, coins: updatedCoins + diff });
        }
      }).catch(() => {});
      setTimeout(() => {
        advanceSpellingWord();
      }, 1500);
    }
  };

  const handleSpellingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSpellingInput(e.target.value);
  };

  const handleVirtualKeyInput = (char: string) => {
    if (spellAnswered || !currentSpellWord) return;
    const targetClean = currentSpellWord.word.trim().toLowerCase();
    if (typedValue.length >= targetClean.length) return;
    const nextVal = typedValue + char.toLowerCase();
    processSpellingInput(nextVal);
  };

  const handleVirtualBackspace = () => {
    if (spellAnswered) return;
    setTypedValue(prev => prev.slice(0, -1));
  };

  const handleVirtualClear = () => {
    if (spellAnswered) return;
    setTypedValue('');
  };

  // Global physical keyboard capture for Spelling mode
  useEffect(() => {
    if (activeStage !== 'spelling' || spellAnswered || !currentSpellWord) return;

    const handleSpellingKeyDown = (e: KeyboardEvent) => {
      // Allow browser shortcuts (Cmd/Ctrl/Alt)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Space key
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        e.stopPropagation();
        handleVirtualKeyInput(' ');
        return;
      }

      // Backspace key
      if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        handleVirtualBackspace();
        return;
      }

      // Letters a-z
      if (/^[a-zA-Z]$/.test(e.key)) {
        if (document.activeElement !== spellInputRef.current) {
          e.preventDefault();
          handleVirtualKeyInput(e.key.toLowerCase());
        }
        return;
      }

      // Hyphen '-'
      if (e.key === '-') {
        if (document.activeElement !== spellInputRef.current) {
          e.preventDefault();
          handleVirtualKeyInput('-');
        }
        return;
      }

      // Apostrophe "'"
      if (e.key === "'") {
        if (document.activeElement !== spellInputRef.current) {
          e.preventDefault();
          handleVirtualKeyInput("'");
        }
        return;
      }
    };

    window.addEventListener('keydown', handleSpellingKeyDown, true);
    return () => window.removeEventListener('keydown', handleSpellingKeyDown, true);
  }, [activeStage, spellAnswered, currentSpellWord, typedValue]);

  const handleSkipSpelling = async () => {
    if (spellAnswered || !currentSpellWord) return;
    setSpellAnswered(true);
    setSpellIsCorrect(false);
    setTypedValue(currentSpellWord.word.toLowerCase());
    showToast(`💡 Correct spelling: ${currentSpellWord.word}`);
    await apiService.recordVocabularyProgress(currentSpellWord.id, currentUser.id, 'spelling', false, { answer: typedValue || 'SKIP' });
    setTimeout(() => {
      advanceSpellingWord();
    }, 2000);
  };

  const advanceSpellingWord = () => {
    if (spellIdx + 1 < spellList.length) {
      setSpellIdx(prev => prev + 1);
    } else {
      setSpellCompleted(true);
      recordStageCompletion(3);
    }
  };

  const handleOpenWeakWordsModal = async (targetBookId?: number) => {
    setShowWeakWordsModal(true);
    setLoadingWeakWords(true);
    try {
      const bId = targetBookId !== undefined ? targetBookId : (activePlayingBook && activePlayingBook.id > 0 ? activePlayingBook.id : undefined);
      const res = await apiService.getPracticeWords(currentUser.id, {
        bookId: bId,
        limit: 15
      });
      if (res && Array.isArray(res.words)) {
        setWeakWordsList(res.words);
      } else {
        setWeakWordsList([]);
      }
    } catch (e) {
      console.warn('Failed to load weak practice words:', e);
      setWeakWordsList([]);
    } finally {
      setLoadingWeakWords(false);
    }
  };

  const handleCloseWeakWordsModal = () => {
    setShowWeakWordsModal(false);
    onCloseWeakWords?.();
  };

  useEffect(() => {
    if (autoOpenWeakWords) {
      handleOpenWeakWordsModal();
    }
  }, [autoOpenWeakWords]);

  const handleStartWeakPractice = (mode: 'reading' | 'spelling') => {
    if (weakWordsList.length === 0) return;
    setShowWeakWordsModal(false);
    if (!activePlayingBook || activePlayingBook.id === -1) {
      setActivePlayingBook({
        id: -1,
        title: '🎯 Focus Stars',
        category: 'Focus Drill',
        description: 'Targeted practice for weak words',
        word_count: weakWordsList.length,
        mastered_count: 0
      } as any);
    }
    setChapterWords(weakWordsList as any);
    setActiveStage(mode);
    if (mode === 'reading') {
      initQuizRound(weakWordsList as any);
    } else {
      initSpellingRound(weakWordsList as any);
    }
    showToast(`🔥 Focus Drill: Selected ${weakWordsList.length} priority words!`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW A: STAGE GAMEPLAY VIEW (When a chapter stage is active)
  // ─────────────────────────────────────────────────────────────────────────
  if (activePlayingBook && activeStage) {
    return (
      <div className="min-h-screen w-full theme-bg theme-text font-mono p-4 sm:p-6 transition-colors duration-300">
        <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">
          {/* Top Sticky Stage Control Bar */}
          <header className="sticky top-0 z-30 bg-[#0a0f1d]/90 border border-white/10 rounded-2xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToMap}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-102"
                title="Back to Chapter Map"
              >
                <span>‹</span>
                <span>Map</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                  Word<span className="text-[#00f0ff] drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">Quest</span>
                </span>
                <span className="text-slate-600">/</span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  {activePlayingBook.category || 'General'}
                </span>
                <span className="text-slate-600 hidden sm:inline">/</span>
                <span className="text-xs font-bold text-cyan-300 truncate max-w-[180px] sm:max-w-[260px]">
                  {activePlayingBook.title}
                </span>
                {(() => {
                  const m = activePlayingBook.completed_stages_mask || 0;
                  const s = (m & 1 ? 1 : 0) + (m & 2 ? 1 : 0) + (m & 4 ? 1 : 0);
                  return (
                    <span className="text-xs font-mono text-amber-300 hidden sm:inline ml-1 tracking-wider">
                      {s === 3 ? '⭐⭐⭐' : s === 2 ? '⭐⭐☆' : s === 1 ? '⭐☆☆' : '☆☆☆'}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Quick Switch Stage Pills & Coin Counter */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center p-1 rounded-xl bg-[#070b14] border border-white/10 text-xs font-bold">
                {(() => {
                  const m = activePlayingBook.completed_stages_mask || 0;
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartStage(activePlayingBook, 'learn')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          activeStage === 'learn'
                            ? 'bg-[#00f0ff] text-slate-950 font-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>01 Study</span>
                        {(m & 1) !== 0 && <span className="text-amber-300 text-[10px]">⭐</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartStage(activePlayingBook, 'reading')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          activeStage === 'reading'
                            ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>02 Quiz</span>
                        {(m & 2) !== 0 && <span className="text-amber-300 text-[10px]">⭐</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartStage(activePlayingBook, 'spelling')}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          activeStage === 'spelling'
                            ? 'bg-purple-400 text-slate-950 font-black shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>03 Spelling</span>
                        {(m & 4) !== 0 && <span className="text-amber-300 text-[10px]">⭐</span>}
                      </button>
                    </>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => handleOpenWeakWordsModal()}
                  className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                  title="View priority words and start focus drill"
                >
                  <span>🎯</span>
                  <span>Focus Words</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                <span>⚡</span>
                <span>{currentUser.coins} EXP</span>
              </div>

              <div className="flex items-center gap-1.5 p-1 pl-1 pr-2.5 rounded-full bg-slate-800/80 border border-slate-700">
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-400 to-indigo-500 flex items-center justify-center text-[10px] font-black text-slate-950">
                  {currentUser.username ? currentUser.username.slice(0, 1).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-bold text-slate-200 hidden md:inline">
                  {currentUser.username}
                </span>
              </div>
            </div>
          </header>

          {/* Stage Body */}
          <main className="w-full flex flex-col gap-6">
            {loadingWords ? (
              <div className="py-24 text-center text-slate-500 animate-pulse text-sm">
                🛰️ Loading chapter vocabulary...
              </div>
            ) : chapterWords.length === 0 ? (
              <div className="theme-card p-12 rounded-2xl text-center border theme-border space-y-4">
                <div className="text-4xl">📭</div>
                <h3 className="text-slate-200 font-bold text-base">No words in this chapter yet</h3>
                <button
                  type="button"
                  onClick={handleBackToMap}
                  className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-cyan-400 transition-all"
                >
                  ← Back to Map
                </button>
              </div>
            ) : (
              <>
                {/* ── STAGE 1: 学单词探索卡片 ── */}
                {activeStage === 'learn' && (
                  learnCompleted ? (
                    <div className="theme-card border border-emerald-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
                      <div className="text-5xl">🏆</div>
                      <h3 className="text-2xl font-black text-white">Chapter Explored!</h3>
                      <p className="text-xs text-slate-400">
                        You explored all <strong className="text-emerald-300">{chapterWords.length}</strong> key words in this chapter
                      </p>
                      <div className="flex items-center justify-center gap-6 py-4">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                          <div className="text-[10px] uppercase font-bold text-emerald-400/80">Stage Star</div>
                          <div className="text-2xl font-black">⭐ +1</div>
                        </div>
                        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                          <div className="text-[10px] uppercase font-bold text-cyan-400/80">Reward (EXP)</div>
                          <div className="text-2xl font-black">+50</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setLearnIdx(0);
                            setLearnCompleted(false);
                          }}
                          className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                        >
                          🔄 Review Again
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartStage(activePlayingBook, 'reading')}
                          className="px-6 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition-all cursor-pointer"
                        >
                          ⚡ Go to Quiz
                        </button>
                        <button
                          type="button"
                          onClick={handleBackToMap}
                          className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                        >
                          ← Back to Map
                        </button>
                      </div>
                    </div>
                  ) : currentLearnWord ? (
                    <div className="space-y-6">
                    {/* ── 1. Top Word Quick Picker Bar ── */}
                    <div className="bg-[#0d1424]/90 border border-white/10 p-2 sm:p-2.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 sm:gap-3">
                      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[#00f0ff] text-xs font-bold font-mono">
                        <span>🧭</span>
                        <span>Quick Select</span>
                      </div>

                      {/* Scrollable Pills Container */}
                      <div
                        ref={wordPillsRef}
                        className="flex-1 flex items-center gap-2 overflow-x-auto py-1 scroll-smooth select-none"
                        style={{ scrollbarWidth: 'none' }}
                      >
                        {chapterWords.map((w, idx) => {
                          const isActive = idx === learnIdx;
                          return (
                            <button
                              key={w.id || idx}
                              type="button"
                              data-pill-idx={idx}
                              onClick={() => setLearnIdx(idx)}
                              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isActive
                                  ? 'border-[#00f0ff] bg-[#00f0ff]/15 text-[#00f0ff] shadow-[0_0_16px_rgba(0,240,255,0.5)] ring-1 ring-cyan-400'
                                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-white/10 hover:border-slate-500 hover:text-white'
                              }`}
                              title={`${idx + 1}. ${w.word} - ${w.translation || ''}`}
                            >
                              <span className={`text-[10px] font-black ${isActive ? 'text-[#00f0ff]' : 'text-slate-500'}`}>
                                #{idx + 1}.
                              </span>
                              <span className="tracking-tight">{w.word}</span>
                              {w.mastered ? (
                                <span className={`text-[11px] ${isActive ? 'text-emerald-400 font-black' : 'text-emerald-400'}`}>
                                  ✓
                                </span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      {/* Open All Words Directory Button */}
                      <button
                        type="button"
                        onClick={() => setShowWordDrawer(true)}
                        className="shrink-0 px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                        title="View all words list"
                      >
                        <span>📋</span>
                        <span className="hidden sm:inline">Word List</span>
                        <span className="text-[10px] font-mono opacity-80">({chapterWords.length})</span>
                      </button>
                    </div>

                    {/* ── 2. Hero Word Card (with Centered Floating Speaker FAB) ── */}
                    <div className="relative mb-8 sm:mb-10">
                      <div className="border-[1.5px] border-cyan-400/40 rounded-3xl p-8 sm:p-12 text-center relative shadow-[0_0_35px_rgba(0,240,255,0.14)] bg-gradient-to-b from-[#0f172a]/95 to-[#0b101d]/95 transition-all">
                        {/* Subtle Top Accent Beam */}
                        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_12px_#00f0ff]" />

                        {/* Mastery Badge (Top Right) */}
                        <div className="absolute top-4 right-5 sm:top-6 sm:right-7 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono transition-all">
                          {currentLearnWord.mastered ? (
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1 shadow-sm">
                              ✓ Mastered
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs">
                              🌱 Exploring
                            </span>
                          )}
                        </div>

                        {/* Word Index Tag (Top Left) */}
                        <div className="absolute top-4 left-5 sm:top-6 sm:left-7 text-xs font-mono font-bold text-slate-500">
                          #{String(learnIdx + 1).padStart(2, '0')} / {chapterWords.length}
                        </div>

                        {/* Main Word Title */}
                        <div className="pt-2 sm:pt-4 pb-2">
                          <h1
                            onClick={() => playWordAudio(currentLearnWord.word)}
                            className="text-5xl sm:text-7xl md:text-8xl font-black text-white tracking-tight cursor-pointer hover:text-cyan-200 transition-colors drop-shadow-md inline-block"
                            title="Play standard audio"
                          >
                            {currentLearnWord.word}
                          </h1>
                        </div>

                        {/* Phonetic Badge & POS */}
                        <div className="my-3 flex items-center justify-center gap-2">
                          {currentLearnWord.phonetic && (
                            <span className="px-4 py-1.5 rounded-xl bg-[#00f0ff]/15 border border-[#00f0ff]/40 text-[#00f0ff] text-base sm:text-xl font-mono font-semibold tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                              {currentLearnWord.phonetic}
                            </span>
                          )}
                          {currentLearnWord.part_of_speech && (
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs sm:text-sm font-mono font-bold">
                              {currentLearnWord.part_of_speech}
                            </span>
                          )}
                        </div>

                        {/* Chinese Translation (Large & High Legibility) */}
                        <div className="mt-4 pb-4 sm:pb-6">
                          <p className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-100 tracking-wide">
                            {currentLearnWord.translation}
                          </p>
                        </div>

                        {/* Overlapping Floating Action Speaker Button (Centered on bottom border, unclipped) */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                          <button
                            type="button"
                            onClick={() => playWordAudio(currentLearnWord.word)}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#00f0ff] to-[#38bdf8] text-slate-950 flex items-center justify-center text-2xl sm:text-3xl transition-transform duration-200 cursor-pointer shadow-[0_0_28px_rgba(0,240,255,0.65),0_8px_20px_rgba(0,0,0,0.6)] hover:scale-105 active:scale-90 group"
                            title="Play pronunciation (Space)"
                          >
                            <span className="group-hover:scale-110 transition-transform">🔊</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ── 3. 2-Column Knowledge Panels (Sentences & Roots) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3">
                      {/* Left: 趣味生动例句 (Fun Sentences) */}
                      <div className="bg-[#0d1424]/90 border border-white/10 hover:border-white/20 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md space-y-4 transition-colors">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                          <h3 className="text-sm uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            <span>Context Sentences</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              const sList = getWordSentences(currentLearnWord);
                              if (sList.length > 0) playWordAudio(sList[0].en);
                            }}
                            className="w-8 h-8 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] flex items-center justify-center text-sm transition-colors cursor-pointer"
                            title="Listen to sentence"
                          >
                            🔊
                          </button>
                        </div>
                        {(() => {
                          const sList = getWordSentences(currentLearnWord);
                          if (sList.length === 0) {
                            return <p className="text-sm text-slate-500 italic py-4">No example sentences yet</p>;
                          }
                          return (
                            <div className="space-y-4 pt-1">
                              {sList.map((item, idx) => (
                                <div key={idx} className="bg-[#121a2f]/80 p-4 sm:p-5 rounded-2xl border border-white/5 space-y-1.5">
                                  <div className="flex items-start justify-between gap-3">
                                    <p className="text-base sm:text-lg md:text-xl text-slate-100 font-semibold leading-relaxed">
                                      {renderSentenceWithHighlight(item.en, currentLearnWord.word)}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => playWordAudio(item.en)}
                                      className="p-1.5 rounded-xl text-[#00f0ff] hover:bg-cyan-500/20 text-sm shrink-0 cursor-pointer transition-colors"
                                      title="Listen to sentence"
                                    >
                                      🔊
                                    </button>
                                  </div>
                                  <p className="text-xs sm:text-sm text-slate-400 leading-normal">
                                    {item.zh}
                                  </p>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Right: 词根剖析 & 词源趣谈 */}
                      <div className="bg-[#0d1424]/90 border border-white/10 hover:border-white/20 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md space-y-6 transition-colors">
                        {/* 构词与词根 */}
                        {(() => {
                          const roots = parseBilingual(currentLearnWord.root_affixes);
                          const hasContent = Boolean(roots.en || roots.zh);
                          return (
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-2">
                                  <span className="text-lg">🧩</span>
                                  <span>Roots & Affixes</span>
                                </h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {roots.en && (
                                    <button
                                      type="button"
                                      onClick={() => playSpeech(roots.en, 'en')}
                                      className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                      title="Listen to English notes"
                                    >
                                      <span>🔊</span>
                                      <span>EN</span>
                                    </button>
                                  )}
                                  {roots.zh && (
                                    <button
                                      type="button"
                                      onClick={() => playSpeech(roots.zh, 'yue')}
                                      className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                      title="Listen to Cantonese notes"
                                    >
                                      <span>🔊</span>
                                      <span>Yue</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="bg-[#121a2f]/80 p-4 rounded-2xl border border-white/5 space-y-2">
                                {roots.en && (
                                  <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                                    {roots.en}
                                  </p>
                                )}
                                {roots.zh && (
                                  <p className={`text-xs sm:text-sm text-emerald-300/90 leading-relaxed ${roots.en ? 'border-t border-white/5 pt-2' : ''}`}>
                                    {roots.zh}
                                  </p>
                                )}
                                {!hasContent && (
                                  <p className="text-sm text-slate-400 italic">
                                    Roots breakdown not generated yet
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* 反义词 & 同义词 */}
                        {(currentLearnWord.antonyms || currentLearnWord.synonyms) && (
                          <div className="space-y-2.5">
                            <h3 className="text-sm uppercase tracking-wider font-extrabold text-rose-400 flex items-center gap-2">
                              <span className="text-lg">⚖️</span>
                              <span>Synonyms & Antonyms</span>
                            </h3>
                            <div className="flex flex-wrap gap-2.5 text-sm">
                              {currentLearnWord.antonyms && (
                                <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold">
                                  Ant: {currentLearnWord.antonyms}
                                </span>
                              )}
                              {currentLearnWord.synonyms && (
                                <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
                                  Syn: {currentLearnWord.synonyms}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 词源趣谈 */}
                        {(() => {
                          const etym = parseBilingual(currentLearnWord.etymology);
                          if (!etym.en && !etym.zh) return null;
                          return (
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <h3 className="text-sm uppercase tracking-wider font-extrabold text-purple-400 flex items-center gap-2">
                                  <span className="text-lg">📜</span>
                                  <span>Etymology & Memory</span>
                                </h3>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {etym.en && (
                                    <button
                                      type="button"
                                      onClick={() => playSpeech(etym.en, 'en')}
                                      className="px-2.5 py-1 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                      title="Listen to English story"
                                    >
                                      <span>🔊</span>
                                      <span>EN</span>
                                    </button>
                                  )}
                                  {etym.zh && (
                                    <button
                                      type="button"
                                      onClick={() => playSpeech(etym.zh, 'yue')}
                                      className="px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                      title="Listen to Cantonese story"
                                    >
                                      <span>🔊</span>
                                      <span>Yue</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="bg-[#121a2f]/80 p-4 rounded-2xl border border-white/5 space-y-2">
                                {etym.en && (
                                  <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed">
                                    {etym.en}
                                  </p>
                                )}
                                {etym.zh && (
                                  <p className={`text-xs sm:text-sm text-purple-300/90 leading-relaxed ${etym.en ? 'border-t border-white/5 pt-2' : ''}`}>
                                    {etym.zh}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* ── 4. Card Navigation Footer ── */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
                      <button
                        type="button"
                        onClick={() => setLearnIdx(prev => Math.max(0, prev - 1))}
                        disabled={learnIdx === 0}
                        className="px-6 py-3 rounded-2xl bg-[#121a2f] hover:bg-[#18233e] border border-white/10 text-slate-200 text-sm font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <span>‹</span>
                        <span>Previous</span>
                        <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">(Left)</span>
                      </button>

                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono text-slate-400">
                          Word <strong className="text-[#00f0ff]">{learnIdx + 1}</strong> of {chapterWords.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setShowWordDrawer(true)}
                          className="px-4 py-3 rounded-2xl bg-[#121a2f] hover:bg-[#18233e] border border-cyan-500/40 text-cyan-300 text-sm font-bold flex items-center gap-2.5 cursor-pointer transition-all active:scale-95"
                        >
                          <span>Word List</span>
                          <div className="w-8 h-4.5 rounded-full bg-cyan-950 border border-cyan-400 flex items-center px-0.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400" />
                          </div>
                        </button>

                        {learnIdx === chapterWords.length - 1 ? (
                          <button
                            type="button"
                            onClick={handleFinishLearn}
                            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 text-sm font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-[0_0_25px_rgba(16,185,129,0.5)] animate-pulse"
                          >
                            <span>Complete & Claim ⭐ (+50 EXP)</span>
                            <span>✓</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLearnIdx(prev => Math.min(chapterWords.length - 1, prev + 1))}
                            className="px-7 py-3 rounded-2xl bg-[#00f0ff] hover:bg-[#38bdf8] text-slate-950 text-sm font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                          >
                            <span>Next</span>
                            <span>›</span>
                            <span className="text-[10px] font-mono text-slate-900 hidden sm:inline">(Right)</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── 5. All Words Directory Grid Drawer / Modal (5-Column) ── */}
                    {showWordDrawer && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#070b14]/80 backdrop-blur-md">
                        <div className="bg-[#0d1424] border border-[#1e2e4a] rounded-3xl w-full max-w-6xl max-h-[88vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.8)] ring-1 ring-cyan-500/30 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                          {/* Modal Top Header */}
                          <div className="p-6 sm:p-7 border-b border-white/10 flex items-center justify-between gap-4 bg-[#0a0f1d]/80">
                            <div>
                              <h2 className="text-2xl sm:text-3xl font-black text-[#00f0ff] tracking-tight flex items-center gap-2">
                                <span>Word List</span>
                              </h2>
                              <p className="text-xs sm:text-sm font-mono text-slate-400 mt-1">
                                {activePlayingBook.title} · {chapterWords.length} Words · Tap any card to jump
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowWordDrawer(false)}
                              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                            >
                              <span>Back</span>
                              <span>✕</span>
                            </button>
                          </div>

                          {/* 5-Column Responsive Grid Container */}
                          <div className="flex-1 overflow-y-auto p-5 sm:p-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                            {chapterWords.map((w, idx) => {
                              const isActive = idx === learnIdx;
                              return (
                                <button
                                  key={w.id || idx}
                                  type="button"
                                  onClick={() => {
                                    setLearnIdx(idx);
                                    setShowWordDrawer(false);
                                  }}
                                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 group relative ${
                                    isActive
                                      ? 'border-2 border-[#00f0ff] shadow-[0_0_25px_rgba(0,240,255,0.38)] bg-[#131d31] text-cyan-200'
                                      : 'bg-[#101728] hover:bg-[#152038] border-white/10 hover:border-cyan-500/40'
                                  }`}
                                >
                                  <div className="flex items-center justify-between w-full">
                                    <span className={`text-xs font-mono font-bold ${isActive ? 'text-[#00f0ff]' : 'text-slate-500'}`}>
                                      #{String(idx + 1).padStart(2, '0')}
                                    </span>
                                    {isActive ? (
                                      <span className="text-[#00f0ff] text-xs">✦</span>
                                    ) : w.mastered ? (
                                      <span className="text-emerald-400 font-bold text-xs">✓</span>
                                    ) : (
                                      <span className="text-slate-600 text-xs">○</span>
                                    )}
                                  </div>

                                  <div>
                                    <h4 className={`text-base sm:text-lg font-black tracking-tight ${isActive ? 'text-[#00f0ff]' : 'text-white group-hover:text-cyan-200'}`}>
                                      {w.word}
                                    </h4>
                                    {w.phonetic && (
                                      <p className="text-xs font-mono text-cyan-400/80 truncate">
                                        {w.phonetic}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                                    <span className="text-slate-300 font-medium truncate max-w-[85%]">
                                      {w.part_of_speech ? <span className="text-indigo-400 mr-1 font-mono">{w.part_of_speech}</span> : null}
                                      {w.translation || '-'}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Modal Footer */}
                          <div className="p-4 sm:p-5 border-t border-white/10 bg-[#0a0f1d]/80 flex items-center justify-between text-xs text-slate-400">
                            <div>
                              Keyboard: <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Esc</kbd> Close · <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Space</kbd> Audio
                            </div>
                            <div className="text-cyan-300 font-mono font-bold">
                              Selected: #{String(learnIdx + 1).padStart(2, '0')} {currentLearnWord.word}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  ) : null
                )}

                {/* ── STAGE 2: 看句选义 语境推断关卡 ── */}
                {activeStage === 'reading' && (
                  <div className="w-full space-y-6">
                    {quizCompleted ? (
                      <div className="theme-card border border-cyan-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
                        <div className="text-5xl">🏆</div>
                        <h3 className="text-2xl font-black text-white">Round Complete!</h3>
                        <p className="text-xs text-slate-400">
                          Completed <strong className="text-cyan-300">{quizList.length}</strong> context quiz questions
                        </p>
                        <div className="flex items-center justify-center gap-6 py-4">
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            <div className="text-[10px] uppercase font-bold text-amber-400/80">Stage Star</div>
                            <div className="text-2xl font-black">⭐ +1</div>
                          </div>
                          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                            <div className="text-[10px] uppercase font-bold text-cyan-400/80">Reward (EXP)</div>
                            <div className="text-2xl font-black">+{roundCoins}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => initQuizRound(chapterWords)}
                            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                          >
                            🔄 Play Again
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartStage(activePlayingBook, 'spelling')}
                            className="px-6 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs transition-all cursor-pointer"
                          >
                            ✍️ Go to Spelling
                          </button>
                          <button
                            type="button"
                            onClick={handleBackToMap}
                            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                          >
                            ← Back to Map
                          </button>
                        </div>
                      </div>
                    ) : currentQuizWord ? (
                      <div className="theme-card border theme-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                        {/* Stats & Timer Header */}
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">
                            Question <strong className="text-cyan-400">{quizIdx + 1}</strong> / {quizList.length}
                          </span>
                          {combo > 1 && (
                            <span className="text-rose-400 font-black animate-pulse">
                              🔥 COMBO x{combo}
                            </span>
                          )}
                          <span className="text-amber-400 font-bold">
                            ⏱️ Timer: {timeLeft}s
                          </span>
                        </div>

                        {/* Smooth countdown track */}
                        <div className="w-full h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-1000 ease-linear"
                            style={{ width: `${(timeLeft / 10) * 100}%` }}
                          />
                        </div>

                        {/* Question Prompt Center Card: Contextual Sentence */}
                        <div className="py-6 px-5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-4">
                          <div className="text-[10px] text-amber-400 uppercase tracking-widest font-black flex items-center justify-center gap-2">
                            <span>🔍</span>
                            <span>CONTEXTUAL READING // Read sentence and pick correct meaning</span>
                          </div>

                          {/* Sentence display with highlighted target word */}
                          <div className="text-base sm:text-xl font-medium text-slate-100 leading-relaxed max-w-2xl mx-auto py-2">
                            {renderSentenceWithHighlight(getSentenceForWord(currentQuizWord), currentQuizWord.word)}
                          </div>

                          {/* Audio controls */}
                          <div className="flex items-center justify-center gap-3">
                            <button
                              type="button"
                              onClick={() => playWordAudio(getSentenceForWord(currentQuizWord))}
                              className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Listen to full sentence"
                            >
                              <span>🔊</span>
                              <span>Sentence</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => playWordAudio(currentQuizWord.word)}
                              className="px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Listen to target word"
                            >
                              <span>🎯</span>
                              <span>Word</span>
                            </button>
                          </div>
                        </div>

                        {/* 4 Choices Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                          {quizOptions.map((opt) => {
                            let btnStyle = 'bg-slate-950/70 border-slate-800 text-slate-200 hover:border-cyan-500/50 hover:bg-slate-900';
                            if (quizAnswered) {
                              if (opt.isCorrect) {
                                btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse';
                              } else if (selectedOptionId === opt.id) {
                                btnStyle = 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold';
                              } else {
                                btnStyle = 'opacity-40 border-slate-800 text-slate-500';
                              }
                            }

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={quizAnswered}
                                onClick={() => handleSelectOption(opt)}
                                className={`p-4 rounded-xl border text-sm text-left transition-all cursor-pointer flex items-center justify-between font-sans ${btnStyle}`}
                              >
                                <span className="font-semibold leading-snug">{opt.text}</span>
                                {quizAnswered && opt.isCorrect && (
                                  <span className="text-emerald-400 font-bold text-base shrink-0 ml-2">✓</span>
                                )}
                                {quizAnswered && !opt.isCorrect && selectedOptionId === opt.id && (
                                  <span className="text-rose-400 font-bold text-base shrink-0 ml-2">✕</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* ── STAGE 3: 听音拼写关卡 ── */}
                {activeStage === 'spelling' && (
                  <div className="w-full space-y-6">
                    {spellCompleted ? (
                      <div className="theme-card border border-purple-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
                        <div className="text-5xl">🎖️</div>
                        <h3 className="text-2xl font-black text-white">Spelling Challenge Cleared!</h3>
                        <p className="text-xs text-slate-400">
                          Completed <strong className="text-purple-300">{spellList.length}</strong> spelling challenges
                        </p>
                        <div className="flex items-center justify-center gap-6 py-4">
                          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
                            <div className="text-[10px] uppercase font-bold text-purple-400/80">Stage Star</div>
                            <div className="text-2xl font-black">⭐ +1</div>
                          </div>
                          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300">
                            <div className="text-[10px] uppercase font-bold text-purple-400/80">Reward (EXP)</div>
                            <div className="text-2xl font-black">+{roundCoins}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => initSpellingRound(chapterWords)}
                            className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                          >
                            🔄 Play Again
                          </button>
                          <button
                            type="button"
                            onClick={handleBackToMap}
                            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                          >
                            ← Back to Map
                          </button>
                        </div>
                      </div>
                    ) : currentSpellWord ? (
                      <div className="theme-card border theme-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">
                            Word <strong className="text-purple-400">{spellIdx + 1}</strong> / {spellList.length}
                          </span>
                          <span className="text-xs text-purple-300 font-bold">
                            ✍️ Listen & type the word
                          </span>
                        </div>

                        {/* Pronunciation & Prompt Stage */}
                        <div className="py-6 px-5 sm:px-6 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-4">
                          <button
                            type="button"
                            onClick={() => playWordAudio(currentSpellWord.word)}
                            className="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-400 text-purple-300 hover:bg-purple-400 hover:text-slate-950 text-2xl mx-auto flex items-center justify-center transition-all cursor-pointer shadow-[0_0_25px_rgba(168,85,247,0.3)] active:scale-95"
                            title="Replay audio"
                          >
                            🔊
                          </button>
                          <p className="text-xs text-slate-400 font-mono">Tap speaker to replay audio</p>

                          <div className="space-y-1">
                            {currentSpellWord.phonetic && (
                              <div className="text-xs text-cyan-400 font-mono">
                                [{currentSpellWord.phonetic}]
                              </div>
                            )}
                            <div className="text-base font-bold text-slate-200">
                              {currentSpellWord.translation}
                            </div>
                          </div>

                          {/* Letter Slots Box Display */}
                          <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 flex-wrap pt-2">
                            {currentSpellWord.word.split('').map((targetLetter, i) => {
                              const isHyphen = targetLetter === '-';
                              const isSpace = targetLetter === ' ';
                              const isApostrophe = targetLetter === "'";
                              const typedChar = typedValue[i] || '';
                              const isFilled = Boolean(typedChar);
                              const isCurrent = i === typedValue.length && !spellAnswered;

                              // Special renderer for Space in multi-word phrases
                              if (isSpace) {
                                const isSpaceFilled = typedChar === ' ';
                                return (
                                  <div
                                    key={i}
                                    className={`w-7 sm:w-12 h-11 sm:h-14 flex flex-col items-center justify-center select-none transition-all ${
                                      isCurrent
                                        ? 'border-2 border-dashed border-cyan-400 bg-cyan-950/50 text-cyan-300 animate-pulse ring-2 ring-cyan-400/50 rounded-xl'
                                        : isSpaceFilled || spellAnswered
                                        ? 'border-2 border-emerald-500/60 bg-emerald-950/40 text-emerald-300 rounded-xl shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                                        : 'border-2 border-dashed border-slate-700 bg-slate-900/40 text-slate-600 rounded-xl'
                                    }`}
                                    title={isCurrent ? "Current slot: Press [SPACE]" : "Space"}
                                  >
                                    <span className="text-xs sm:text-sm font-mono font-black leading-none">
                                      {isSpaceFilled || spellAnswered ? '✓' : '␣'}
                                    </span>
                                    <span className="text-[8px] sm:text-[9px] font-mono font-bold uppercase mt-1 opacity-90">
                                      SPACE
                                    </span>
                                  </div>
                                );
                              }

                              // Special renderer for Hyphen
                              if (isHyphen) {
                                return (
                                  <div
                                    key={i}
                                    className="w-4 sm:w-6 h-11 sm:h-14 flex items-center justify-center font-bold text-slate-400 font-mono text-xl sm:text-2xl select-none"
                                  >
                                    -
                                  </div>
                                );
                              }

                              // Special renderer for Apostrophe
                              if (isApostrophe) {
                                return (
                                  <div
                                    key={i}
                                    className="w-3 sm:w-5 h-11 sm:h-14 flex items-center justify-center font-bold text-slate-400 font-mono text-xl sm:text-2xl select-none"
                                  >
                                    '
                                  </div>
                                );
                              }

                              let slotStyle = 'border-purple-500/40 bg-slate-900/50 text-purple-300';
                              if (spellIsCorrect === true) {
                                slotStyle = 'border-emerald-400 bg-emerald-500/20 text-emerald-300 scale-105 shadow-[0_0_15px_rgba(52,211,153,0.4)]';
                              } else if (spellIsCorrect === false) {
                                slotStyle = 'border-amber-400 bg-amber-500/20 text-amber-300';
                              } else if (isFilled) {
                                slotStyle = 'border-purple-400 bg-purple-500/10 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]';
                              } else if (isCurrent) {
                                slotStyle = 'border-cyan-400 bg-cyan-950/40 text-cyan-300 animate-pulse ring-2 ring-cyan-400/50';
                              }

                              return (
                                <div
                                  key={i}
                                  className={`w-9 h-11 sm:w-12 sm:h-14 rounded-xl border-2 flex items-center justify-center text-lg sm:text-2xl font-black font-mono shadow-inner transition-all duration-200 select-none ${slotStyle}`}
                                >
                                  {spellAnswered ? targetLetter : typedChar || (isCurrent ? '•' : '')}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ── 儿童触控拼写软键盘 (iPad / 移动端原生防卡死虚拟键盘) ── */}
                        <div className="w-full max-w-xl mx-auto space-y-1.5 sm:space-y-2 select-none">
                          {/* Row 1 */}
                          <div className="flex justify-center gap-1 sm:gap-1.5">
                            {['Q','W','E','R','T','Y','U','I','O','P'].map(k => (
                              <button
                                key={k}
                                type="button"
                                disabled={spellAnswered}
                                onClick={() => handleVirtualKeyInput(k)}
                                className="flex-1 max-w-[48px] h-10 sm:h-12 rounded-xl bg-slate-800/90 hover:bg-purple-600 active:bg-purple-500 active:scale-95 border border-slate-700/80 hover:border-purple-400 text-white font-mono font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer disabled:opacity-30 touch-manipulation"
                              >
                                {k}
                              </button>
                            ))}
                          </div>

                          {/* Row 2 */}
                          <div className="flex justify-center gap-1 sm:gap-1.5 px-2">
                            {['A','S','D','F','G','H','J','K','L'].map(k => (
                              <button
                                key={k}
                                type="button"
                                disabled={spellAnswered}
                                onClick={() => handleVirtualKeyInput(k)}
                                className="flex-1 max-w-[48px] h-10 sm:h-12 rounded-xl bg-slate-800/90 hover:bg-purple-600 active:bg-purple-500 active:scale-95 border border-slate-700/80 hover:border-purple-400 text-white font-mono font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer disabled:opacity-30 touch-manipulation"
                              >
                                {k}
                              </button>
                            ))}
                          </div>

                          {/* Row 3 */}
                          <div className="flex justify-center gap-1 sm:gap-1.5">
                            {/* Backspace */}
                            <button
                              type="button"
                              disabled={spellAnswered || typedValue.length === 0}
                              onClick={handleVirtualBackspace}
                              className="px-2.5 sm:px-3 h-10 sm:h-12 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 active:scale-95 border border-rose-500/40 text-rose-300 font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-20 touch-manipulation"
                              title="Backspace"
                            >
                              <span>⌫</span>
                              <span className="hidden sm:inline">Del</span>
                            </button>

                            {['Z','X','C','V','B','N','M'].map(k => (
                              <button
                                key={k}
                                type="button"
                                disabled={spellAnswered}
                                onClick={() => handleVirtualKeyInput(k)}
                                className="flex-1 max-w-[48px] h-10 sm:h-12 rounded-xl bg-slate-800/90 hover:bg-purple-600 active:bg-purple-500 active:scale-95 border border-slate-700/80 hover:border-purple-400 text-white font-mono font-bold text-sm sm:text-base shadow-sm transition-all cursor-pointer disabled:opacity-30 touch-manipulation"
                              >
                                {k}
                              </button>
                            ))}

                            {/* If target word has hyphen, include hyphen button */}
                            {currentSpellWord.word.includes('-') && (
                              <button
                                type="button"
                                disabled={spellAnswered}
                                onClick={() => handleVirtualKeyInput('-')}
                                className="w-8 sm:w-10 h-10 sm:h-12 rounded-xl bg-slate-800/90 hover:bg-purple-600 active:scale-95 border border-slate-700 text-white font-mono font-bold text-sm shadow-sm transition-all cursor-pointer touch-manipulation"
                              >
                                -
                              </button>
                            )}

                            {/* Clear */}
                            <button
                              type="button"
                              disabled={spellAnswered || typedValue.length === 0}
                              onClick={handleVirtualClear}
                              className="px-2 sm:px-3 h-10 sm:h-12 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 active:scale-95 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-20 touch-manipulation"
                              title="Clear all"
                            >
                              <span>🗑️</span>
                            </button>
                          </div>

                          {/* Row 4: Space bar & Apostrophe (for phrases and contracted words) */}
                          {(currentSpellWord.word.includes(' ') || currentSpellWord.word.includes("'")) && (
                            <div className="flex justify-center gap-1.5 sm:gap-2 pt-0.5">
                              {currentSpellWord.word.includes("'") && (
                                <button
                                  type="button"
                                  disabled={spellAnswered}
                                  onClick={() => handleVirtualKeyInput("'")}
                                  className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-slate-800/90 hover:bg-purple-600 active:scale-95 border border-slate-700 text-white font-mono font-bold text-base shadow-sm transition-all cursor-pointer touch-manipulation"
                                  title="Apostrophe"
                                >
                                  '
                                </button>
                              )}
                              {currentSpellWord.word.includes(' ') && (
                                <button
                                  type="button"
                                  disabled={spellAnswered}
                                  onClick={() => handleVirtualKeyInput(' ')}
                                  className="flex-1 max-w-sm h-10 sm:h-12 rounded-xl bg-slate-800/90 hover:bg-purple-600 active:bg-purple-500 active:scale-98 border border-purple-500/40 hover:border-purple-300 text-purple-300 hover:text-white font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-30 touch-manipulation"
                                  title="Space"
                                >
                                  <span className="text-base leading-none">␣</span>
                                  <span>SPACE</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Physical Keyboard / System Keyboard Input (Optimized for iPad & Physical Keyboards) */}
                        <div className="max-w-xl mx-auto w-full pt-1 space-y-2">
                          <div className="relative">
                            <input
                              ref={spellInputRef}
                              type="text"
                              inputMode="text"
                              value={typedValue}
                              onChange={handleSpellingChange}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.code === 'Space') {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleVirtualKeyInput(' ');
                                }
                              }}
                              disabled={spellAnswered}
                              placeholder={isTablet ? "Tap for keyboard, or use on-screen keys" : "Type target word or phrase..."}
                              autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              enterKeyHint="done"
                              className={`w-full bg-slate-950/90 border-2 rounded-xl px-4 py-2.5 text-center text-sm sm:text-base font-mono tracking-widest outline-none transition-all ${
                                spellAnswered
                                  ? spellIsCorrect
                                    ? 'border-emerald-400 bg-emerald-950/20 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                                    : 'border-amber-400 bg-amber-950/20 text-amber-300'
                                  : 'border-purple-500/40 text-white focus:border-purple-400 focus:shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                              }`}
                            />
                            {spellAnswered && (
                              <p className={`text-xs mt-2 text-center font-bold ${spellIsCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {spellIsCorrect ? '🎉 Perfect spelling!' : `💡 Correct: ${currentSpellWord.word}`}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono text-slate-500 px-1">
                            <span>💡 Supports touch & physical keyboard</span>
                            <button
                              type="button"
                              onClick={handleSkipSpelling}
                              disabled={spellAnswered}
                              className="text-slate-400 hover:text-amber-400 underline cursor-pointer disabled:opacity-30"
                            >
                              Need help? View hint ➔
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </main>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-slate-900 border border-cyan-400 text-white text-xs font-bold shadow-2xl pointer-events-none animate-bounce">
            {toastMsg}
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIEW B: VOCAB ADVENTURE MAP (Main Standalone Map Page)
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full theme-bg theme-text font-mono p-4 sm:p-6 transition-colors duration-300">
      {/* Top Modern Command Bar (Same style as AdventureMap) */}
      {!hideHeader && (
      <header className="w-full max-w-6xl mx-auto mb-8 relative z-20">
        <div className="theme-card border theme-border rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-5">
          {/* Left: Adventurer Identity Hero Card */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3 bg-gradient-to-br from-slate-900/90 to-cyan-950/40 border border-cyan-500/30 p-2 pr-3.5 rounded-2xl shadow-lg">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-center relative shrink-0 shadow-inner">
                <RunnerSprite avatar={currentBuddy.key} isSprinting={false} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black text-white font-mono tracking-wide truncate">
                    {currentUser.username}
                  </span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.5 rounded font-black font-mono">
                    VOCAB HERO
                  </span>
                </div>
                <div className="text-xs text-cyan-400 font-bold font-mono mt-0.5 flex items-center gap-1.5">
                  <span>{currentBuddy.name}</span>
                </div>
              </div>
            </div>

            {/* Back to Story Map Button */}
            <button
              type="button"
              onClick={onBackToStories}
              className="px-3.5 py-2 text-xs rounded-xl font-black transition-all cursor-pointer bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 hover:from-cyan-600/50 hover:to-indigo-600/50 border border-cyan-400/50 text-cyan-300 hover:text-white flex items-center gap-1.5 font-mono shadow-md active:scale-95 shrink-0"
              title="Back to Story Quest Map"
            >
              <span>🗺️</span>
              <span>Stories</span>
            </button>

            {/* Song Adventure Map Button */}
            {onOpenSongs && (
              <button
                type="button"
                onClick={onOpenSongs}
                className="px-3.5 py-2 text-xs rounded-xl font-black transition-all cursor-pointer bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-400/50 text-purple-300 hover:text-white flex items-center gap-1.5 font-mono shadow-md active:scale-95 shrink-0"
                title="Enter Song Quest Map"
              >
                <span>🎵</span>
                <span>Songs</span>
              </button>
            )}
          </div>

          {/* Center: Treasury & Vocabulary Mastery Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
            {/* Stars Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-mono">
              <span className="text-base leading-none">⭐</span>
              <div>
                <div className="text-[10px] uppercase text-amber-400/70 font-black tracking-wider leading-none">AVAILABLE STARS</div>
                <div className="text-sm font-black text-amber-300 tabular-nums">
                  {currentUser.stars !== undefined ? Math.max(0, currentUser.stars - (currentUser.spent_stars || 0)) : 0}
                </div>
              </div>
            </div>

            {/* Total Vocabulary Mastery Progress Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 shadow-sm font-mono">
              <span className="text-base leading-none">📚</span>
              <div>
                <div className="text-[10px] uppercase text-cyan-400/70 font-black tracking-wider leading-none">WORDS MASTERED</div>
                <div className="text-sm font-black text-cyan-300 tabular-nums">
                  {allStats.masteredWords} <span className="text-xs text-cyan-500/60 font-normal">/ {allStats.totalWords}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Offline, Theme & Settings Control Cluster */}
          <div className="flex items-center justify-end gap-2.5 w-full lg:w-auto">

            {/* Font Scale Selector */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950/60 border border-slate-800 font-mono">
              {(['100', '115', '130'] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => onFontScaleChange?.(scale)}
                  className={`px-2 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                    fontScale === scale
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-black'
                      : 'theme-text-muted hover:theme-text'
                  }`}
                >
                  {scale === '130' ? '130%' : `${scale}%`}
                </button>
              ))}
            </div>

            {/* Logout Action */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-xs border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1 font-mono shadow-sm"
                title="Logout"
              >
                🚪
              </button>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Main Content Area */}
      <div className="w-full max-w-6xl mx-auto">
        {/* Compact Header & Series Filter Bar */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3 border-b theme-border pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 uppercase font-mono">
              📚 Vocab Challenge
            </h1>

            {books.length > 0 && (
              <>
                <select
                  value={selectedCategory === null ? '__ALL__' : selectedCategory}
                  onChange={(e) => handleSelectCategory(e.target.value === '__ALL__' ? null : e.target.value)}
                  className="bg-slate-900/90 border border-slate-700 hover:border-cyan-400/60 focus:border-cyan-400 text-cyan-300 text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl outline-none cursor-pointer transition-all"
                  title="Select Book Series"
                >
                  <option value="__ALL__">
                    🌐 ALL SERIES ({books.length} Ch · {allStats.totalWords} W)
                  </option>
                  {availableCategories.map((category) => {
                    const stat = categoryStats[category] || { count: 0, totalWords: 0, masteredWords: 0, startedWords: 0 };
                    return (
                      <option key={category} value={category}>
                        📚 {category} ({stat.count} Ch · {stat.totalWords} W){stat.masteredWords > 0 ? ` · ✓${stat.masteredWords}` : ''}
                      </option>
                    );
                  })}
                </select>

                <div className="text-xs font-mono theme-text-muted flex items-center gap-2.5 flex-wrap">
                  <span>
                    🏆 Mastered: <strong className="text-emerald-400 font-bold">{currentCategoryStat.masteredWords}/{currentCategoryStat.totalWords}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={toggleHideThreeStars}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      !hideThreeStars
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30'
                        : 'theme-border bg-black/20 dark:bg-white/10 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300'
                    }`}
                    title={!hideThreeStars ? "Click to hide 3-star completed chapters" : "Click to show 3-star completed chapters"}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${!hideThreeStars ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span>
                      Completed: {!hideThreeStars ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          <OfflineSyncBadge
            currentUserId={currentUser.id}
            variant="map"
            fontScale={fontScale}
            onFontScaleChange={onFontScaleChange}
          />
        </div>

        {/* ── 卡片就是 章节目录 (Chapter Cards Grid) ── */}
        {loadingBooks ? (
          <div className="py-24 text-center text-slate-500 animate-pulse text-sm">
            🛰️ Loading word challenge map...
          </div>
        ) : books.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md space-y-3">
            <div className="text-4xl">📭</div>
            <h3 className="text-slate-200 font-bold text-base">No book chapters available</h3>
            <p className="text-sm theme-text-muted italic">
              Please create books and import words in Parent Portal!
            </p>
          </div>
        ) : displayedBooks.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md">
            <p className="text-sm theme-text-muted italic mb-4">
              No chapters found in series "{selectedCategory}".
            </p>
            <button
              type="button"
              onClick={() => handleSelectCategory(null)}
              className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider font-mono hover:bg-cyan-400 cursor-pointer shadow-md"
            >
              View All Series
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {displayedBooks.map((book, index) => {
              const wordCount = book.word_count || 0;
              const masteredCount = book.mastered_count || 0;
              const completedMask = book.completed_stages_mask || 0;
              const starsCount = (completedMask & 1 ? 1 : 0) + (completedMask & 2 ? 1 : 0) + (completedMask & 4 ? 1 : 0);
              const isThreeStars = starsCount === 3;
              const isStarted = (book.started_count || 0) > 0 || starsCount > 0;

              const isStage1Done = (completedMask & 1) !== 0;
              const isStage2Done = (completedMask & 2) !== 0;
              const isStage3Done = (completedMask & 4) !== 0;

              let cardStyle = 'relative group rounded-xl p-6 transition-all duration-300 border backdrop-blur-md flex flex-col justify-between ';
              if (wordCount === 0) {
                cardStyle += 'opacity-60 theme-card border-slate-700 cursor-not-allowed';
              } else if (isThreeStars) {
                cardStyle += 'theme-card border-emerald-500/80 shadow-lg shadow-emerald-500/20 hover:border-emerald-400';
              } else if (isStarted) {
                cardStyle += 'theme-card border-cyan-500/80 shadow-lg shadow-cyan-500/20 hover:border-cyan-400';
              } else {
                cardStyle += 'theme-card border-slate-700 hover:border-cyan-500/40';
              }

              return (
                <div
                  key={book.id}
                  className={cardStyle}
                  onClick={() => {
                    if (wordCount > 0) {
                      handleStartStage(book, 'learn');
                    }
                  }}
                >
                  <div>
                    {/* Card Top: Chapter Index & Badges */}
                    <div className="border-b theme-border pb-3 mb-4 flex justify-between items-start gap-2 min-h-[4rem]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[0.65rem] uppercase tracking-widest theme-text-muted font-bold">
                            Chapter #{index + 1}
                          </span>
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono font-semibold">
                            📚 {book.category || 'General'}
                          </span>
                        </div>
                        <h2
                          className="text-base font-bold theme-text group-hover:text-cyan-500 transition-colors mt-0.5 line-clamp-2 leading-snug"
                          title={book.title}
                        >
                          📖 {book.title}
                        </h2>
                        {book.description && (
                          <p className="text-[11px] theme-text-muted line-clamp-1 mt-0.5">
                            {book.description}
                          </p>
                        )}
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {wordCount === 0 ? (
                          <span className="bg-slate-900/80 text-slate-500 border border-slate-800 font-mono text-xs px-2.5 py-1 rounded-full font-semibold">
                            📭 Empty
                          </span>
                        ) : isThreeStars ? (
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 font-mono text-xs px-2.5 py-1 rounded-full font-black flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                            ✓ Cleared ⭐⭐⭐
                          </span>
                        ) : starsCount > 0 ? (
                          <span className="bg-cyan-500/20 text-cyan-400 animate-pulse font-mono border border-cyan-500/40 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            ▶ In Progress ({starsCount}/3★)
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono text-xs px-2.5 py-1 rounded-full font-medium">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Chapter Stats Bar */}
                    <div className="flex justify-between items-center mb-4 px-3 py-2 bg-black/5 dark:bg-white/10 rounded-lg border theme-border text-xs">
                      <div className="flex items-center gap-1 font-bold">
                        <span className="theme-text-muted mr-1 font-bold">MASTERED:</span>
                        <span className="text-cyan-400 font-mono">
                          {masteredCount} / {wordCount} Words
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-amber-300 tracking-wider font-bold">
                          {starsCount === 3 ? '⭐⭐⭐' : starsCount === 2 ? '⭐⭐☆' : starsCount === 1 ? '⭐☆☆' : '☆☆☆'}
                        </span>
                        <span className="text-cyan-400 font-extrabold text-[11px]">
                          ({starsCount}/3)
                        </span>
                      </div>
                    </div>

                    {/* ── 卡片内对应三个关卡 ── */}
                    <div className="flex flex-col gap-2.5">
                        {/* Stage 1: 学单词探索卡片 */}
                        <button
                          type="button"
                          disabled={wordCount === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (wordCount > 0) handleStartStage(book, 'learn');
                          }}
                          className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-all cursor-pointer font-mono stage-stagger-1 ${
                            wordCount === 0
                              ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                              : isStage1Done
                                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-bold hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                                : 'bg-cyan-500/20 border-cyan-500/80 text-cyan-600 dark:text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>01 // Study Cards 📖</span>
                          </div>
                          <span className={`text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded border tabular-nums ${
                            isStage1Done
                              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : 'bg-black/10 dark:bg-white/10 border-theme-border'
                          }`}>
                            {wordCount === 0 ? 'Empty' : isStage1Done ? 'Done ⭐' : 'Play ▶'}
                          </span>
                        </button>

                        {/* Stage 2: 看句选义语境推断 */}
                        <button
                          type="button"
                          disabled={wordCount === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (wordCount > 0) handleStartStage(book, 'reading');
                          }}
                          className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-all cursor-pointer font-mono stage-stagger-2 ${
                            wordCount === 0
                              ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                              : isStage2Done
                                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-bold hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                                : 'bg-amber-500/20 border-amber-500/80 text-amber-600 dark:text-amber-200 font-bold shadow-sm shadow-amber-500/20 hover:bg-amber-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>02 // Context Quiz 🎯</span>
                          </div>
                          <span className={`text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded border tabular-nums ${
                            isStage2Done
                              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : 'bg-black/10 dark:bg-white/10 border-theme-border'
                          }`}>
                            {wordCount === 0 ? 'Empty' : isStage2Done ? 'Done ⭐' : 'Play ▶'}
                          </span>
                        </button>

                        {/* Stage 3: 听音拼写限时打字 */}
                        <button
                          type="button"
                          disabled={wordCount === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (wordCount > 0) handleStartStage(book, 'spelling');
                          }}
                          className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-all cursor-pointer font-mono stage-stagger-3 ${
                            wordCount === 0
                              ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                              : isStage3Done
                                ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-bold hover:bg-emerald-500/25 shadow-sm shadow-emerald-500/10'
                                : 'bg-purple-500/20 border-purple-500/80 text-purple-600 dark:text-purple-200 font-bold shadow-sm shadow-purple-500/20 hover:bg-purple-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>03 // Spelling Test ✍️</span>
                          </div>
                          <span className={`text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded border tabular-nums ${
                            isStage3Done
                              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : 'bg-black/10 dark:bg-white/10 border-theme-border'
                          }`}>
                            {wordCount === 0 ? 'Empty' : isStage3Done ? 'Done ⭐' : 'Play ▶'}
                          </span>
                        </button>
                      </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 重点星词攻坚弹窗 (TASK-12.1 Weak Words Targeted Practice Modal) ── */}
      {showWeakWordsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="theme-card w-full max-w-2xl max-h-[90vh] rounded-2xl border theme-border shadow-2xl flex flex-col overflow-hidden bg-[#0d1527]/95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b theme-border flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⭐</span>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>Focus Stars</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/30">
                      Focus Stars
                    </span>
                  </h3>
                  <p className="text-xs theme-text-muted mt-0.5">
                    Practice priority words to master them through focused challenges!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseWeakWordsModal}
                className="w-8 h-8 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {loadingWeakWords ? (
                <div className="py-16 text-center text-slate-400 space-y-3">
                  <div className="text-3xl animate-bounce">🛰️</div>
                  <p className="text-sm font-bold">Selecting words that need more practice...</p>
                </div>
              ) : weakWordsList.length === 0 ? (
                <div className="py-12 px-4 text-center space-y-3">
                  <div className="text-4xl">🎉</div>
                  <h4 className="text-base font-bold text-emerald-400">Awesome! No priority words right now</h4>
                  <p className="text-xs theme-text-muted max-w-md mx-auto">
                    You have mastered all words, or have no recorded mistakes. Keep it up!
                  </p>
                  <button
                    type="button"
                    onClick={handleCloseWeakWordsModal}
                    className="mt-2 px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 cursor-pointer shadow-md"
                  >
                    Back to Quest
                  </button>
                </div>
              ) : (
                <>
                  {/* Top Action Bar for Drill */}
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 font-mono">
                        🎯 Focus: {weakWordsList.length} Words
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleStartWeakPractice('reading')}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer transition-all hover:scale-102"
                      >
                        <span>⚡</span>
                        <span>Context Quiz Drill</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartWeakPractice('spelling')}
                        className="px-3.5 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-400 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-purple-500/20 cursor-pointer transition-all hover:scale-102"
                      >
                        <span>✍️</span>
                        <span>Spelling Drill</span>
                      </button>
                    </div>
                  </div>

                  {/* Word List */}
                  <div className="space-y-2.5">
                    {weakWordsList.map((w: any, idx: number) => {
                      const totalAttempts = (w.error_count || 0) + (w.correct_count || 0);
                      const hasSentence = w.fun_sentences && Array.isArray(w.fun_sentences) && w.fun_sentences.length > 0 && w.fun_sentences[0].en;
                      return (
                        <div
                          key={w.id || idx}
                          className="p-3.5 rounded-xl border border-white/10 bg-slate-900/60 hover:border-amber-400/50 transition-all flex flex-col gap-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-baseline gap-2.5 flex-wrap">
                              <span className="text-base font-black text-cyan-300 tracking-wide font-mono">
                                {w.word}
                              </span>
                              {w.phonetic && (
                                <span className="text-xs text-slate-400 font-mono">
                                  {w.phonetic}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => playSpeech(w.word)}
                                className="w-6 h-6 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-300 flex items-center justify-center text-xs transition-all cursor-pointer"
                                title="Pronounce"
                              >
                                🔊
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              {w.streak > 0 && (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  🔥 Streak {w.streak}
                                </span>
                              )}
                              {totalAttempts > 0 ? (
                                <span
                                  className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                                    w.mode === 'spelling'
                                      ? 'bg-purple-950/70 text-purple-300 border-purple-500/40'
                                      : w.mode === 'reading'
                                      ? 'bg-amber-950/70 text-amber-300 border-amber-500/40'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}
                                  title={w.error_count > 0 ? `Missed ${w.error_count} times, correct ${w.correct_count} times` : undefined}
                                >
                                  {w.mode === 'spelling' && <span>✍️ Spelling</span>}
                                  {w.mode === 'reading' && <span>📖 Quiz</span>}
                                  <span>Needs practice ({totalAttempts} tries)</span>
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600">
                                  Not practiced yet
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-xs font-bold text-slate-200">
                            {w.translation}
                          </div>

                          {hasSentence && (
                            <div className="text-xs text-slate-400 bg-black/20 p-2 rounded-lg border border-white/5 font-mono">
                              <div className="text-slate-300">{w.fun_sentences[0].en}</div>
                              {w.fun_sentences[0].zh && (
                                <div className="text-slate-500 text-[11px] mt-0.5">{w.fun_sentences[0].zh}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t theme-border bg-black/30 flex items-center justify-between text-xs theme-text-muted">
              <span className="flex items-center gap-1">
                <span>💡</span>
                <span>Answer correctly 3 times in a row to master a word!</span>
              </span>
              <button
                type="button"
                onClick={handleCloseWeakWordsModal}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-slate-900 border border-cyan-400 text-white text-xs font-bold shadow-2xl pointer-events-none animate-bounce">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
