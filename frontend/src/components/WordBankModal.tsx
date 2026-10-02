import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { apiService } from '../utils/apiService';
import { isForcedOffline } from '../utils/offlineMode';
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
  reading_passed?: number;
  spelling_passed?: number;
  mastered?: number;
  error_count?: number;
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
}

interface WordBankModalProps {
  currentUser: {
    id: number;
    username: string;
    coins: number;
    stars?: number;
    spent_stars?: number;
    is_admin?: number;
    avatar?: string;
  };
  onClose: () => void;
  onUpdateUser?: (updatedUser: any) => void;
}

type SubMode = 'learn' | 'reading' | 'spelling';

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

export const WordBankModal: React.FC<WordBankModalProps> = ({
  currentUser,
  onClose,
  onUpdateUser
}) => {
  const [books, setBooks] = useState<WordBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<number | null>(() => {
    const saved = localStorage.getItem('wordquest_selected_book_id');
    return saved ? Number(saved) : null;
  });
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [subMode, setSubMode] = useState<SubMode>('learn');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isCaching, setIsCaching] = useState<boolean>(false);

  // Scroll window to top when entering vocab exploration view
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Group books by category
  const groupedBooks = useMemo(() => {
    const groups: { [cat: string]: WordBook[] } = {};
    for (const b of books) {
      const cat = b.category?.trim() || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(b);
    }
    return groups;
  }, [books]);

  // Audio synthesis helper with dual language (en-US / Cantonese zh-HK) support
  const playSpeech = useCallback((text: string, lang: 'en' | 'yue' | 'zh' = 'en') => {
    playBilingualSpeech(text, lang, () => {
      setToastMsg(`🔊 [无法发音]: 设备不支持 Web Speech`);
    });
  }, []);

  const playWordAudio = useCallback((text: string) => {
    playSpeech(text, 'en');
  }, [playSpeech]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // 1. Fetch word books
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await apiService.getWordBooks(currentUser.id);
        if (mounted) {
          setBooks(data);
          if (data.length > 0) {
            const currentSelectedExists = data.some(b => b.id === selectedBookId);
            if (!currentSelectedExists) {
              setSelectedBookId(data[0].id);
              localStorage.setItem('wordquest_selected_book_id', String(data[0].id));
            }
          }
        }
      } catch (err) {
        console.error('Failed to load word books:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [currentUser.id]);

  // 2. Fetch words for selected book
  const loadWords = useCallback(async (bookId: number) => {
    setLoading(true);
    try {
      const data = await apiService.getBookWords(bookId, currentUser.id);
      setWords(data || []);
    } catch (err) {
      console.error('Failed to load words for book:', bookId, err);
      setWords([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedBookId) {
      loadWords(selectedBookId);
    }
  }, [selectedBookId, loadWords]);

  const handleSelectBook = (id: number) => {
    setSelectedBookId(id);
    localStorage.setItem('wordquest_selected_book_id', String(id));
  };

  const handleCacheOffline = async () => {
    if (!selectedBookId) return;
    setIsCaching(true);
    try {
      const wordsData = await apiService.getBookWords(selectedBookId, currentUser.id);
      setWords(wordsData || []);
      showToast('📥 词单已成功保存至本地离线存储，无网亦可探索！');
    } catch (err) {
      console.error('Failed to cache book offline:', err);
      showToast('⚠️ 缓存失败，请检查网络后重试');
    } finally {
      setIsCaching(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // ── Mode 1: Learn Card State ──────────────────────────────────────────
  const [learnIdx, setLearnIdx] = useState<number>(0);
  const currentLearnWord = words[learnIdx] || null;

  // Auto-play audio when navigating to new learn word
  useEffect(() => {
    if (subMode === 'learn' && currentLearnWord) {
      playWordAudio(currentLearnWord.word);
    }
  }, [subMode, learnIdx, currentLearnWord, playWordAudio]);

  // ── Mode 2 & 3: Look & Match / Listen & Match Shared Quiz State ─────────
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

  const initQuizRound = useCallback((_mode?: SubMode) => {
    if (words.length === 0) return;
    // Shuffle words for quiz
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setQuizList(shuffled);
    setQuizIdx(0);
    setCombo(0);
    setRoundCoins(0);
    setQuizCompleted(false);
    setSelectedOptionId(null);
    setQuizAnswered(false);
    setTimeLeft(10);
  }, [words]);

  // Reset round when switching modes
  useEffect(() => {
    if (subMode === 'reading') {
      initQuizRound('reading');
    } else if (subMode === 'spelling') {
      initSpellingRound();
    }
  }, [subMode, words]);

  // Generate options for current question
  const currentQuizWord = quizList[quizIdx] || null;

  const generateOptionsForWord = useCallback((targetWord: VocabularyWord) => {
    const targetMeaning = (targetWord.translation || '').trim();
    const distractors = words
      .filter(w => w.id !== targetWord.id && w.translation && w.translation.trim() && w.translation.trim() !== targetMeaning)
      .map(w => w.translation.trim());
    
    // If not enough distractors from the book, pull from FALLBACK_DISTRACTORS
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
  }, [words]);

  useEffect(() => {
    if (subMode === 'reading' && currentQuizWord && !quizCompleted) {
      generateOptionsForWord(currentQuizWord);
    }
  }, [subMode, quizIdx, currentQuizWord, quizCompleted, generateOptionsForWord]);

  // Question countdown timer
  useEffect(() => {
    if (subMode !== 'reading' || quizCompleted || quizAnswered) {
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
  }, [subMode, quizIdx, quizAnswered, quizCompleted]);

  const handleQuizTimeout = async () => {
    if (quizAnswered || !currentQuizWord) return;
    setQuizAnswered(true);
    setCombo(0);
    showToast('⏱️ 时间到！进入错题记录');
    await apiService.recordVocabularyProgress(currentQuizWord.id, currentUser.id, 'reading', false);

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
      const earnedCoins = nextCombo >= 3 ? 20 : 10;
      setRoundCoins(prev => prev + earnedCoins);
      const updatedCoins = currentUser.coins + earnedCoins;
      onUpdateUser?.({ ...currentUser, coins: updatedCoins });
      showToast(`🎯 正确！Combo x${nextCombo} +${earnedCoins}金币`);
      playWordAudio(currentQuizWord.word);

      await apiService.recordVocabularyProgress(currentQuizWord.id, currentUser.id, 'reading', true);
    } else {
      setCombo(0);
      showToast(`❌ 选错啦，正确释义：${currentQuizWord.translation}`);
      await apiService.recordVocabularyProgress(currentQuizWord.id, currentUser.id, 'reading', false);
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
    }
  };

  // ── Mode 4: Spelling Arena State ──────────────────────────────────────
  const [spellList, setSpellList] = useState<VocabularyWord[]>([]);
  const [spellIdx, setSpellIdx] = useState<number>(0);
  const [typedValue, setTypedValue] = useState<string>('');
  const [spellAnswered, setSpellAnswered] = useState<boolean>(false);
  const [spellIsCorrect, setSpellIsCorrect] = useState<boolean | null>(null);
  const [spellCompleted, setSpellCompleted] = useState<boolean>(false);
  const spellInputRef = useRef<HTMLInputElement>(null);

  const initSpellingRound = useCallback(() => {
    if (words.length === 0) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setSpellList(shuffled);
    setSpellIdx(0);
    setTypedValue('');
    setSpellAnswered(false);
    setSpellIsCorrect(null);
    setSpellCompleted(false);
  }, [words]);

  const currentSpellWord = spellList[spellIdx] || null;

  useEffect(() => {
    if (subMode === 'spelling' && currentSpellWord && !spellCompleted) {
      setTypedValue('');
      setSpellAnswered(false);
      setSpellIsCorrect(null);
      playWordAudio(currentSpellWord.word);
      setTimeout(() => spellInputRef.current?.focus(), 150);
    }
  }, [subMode, spellIdx, currentSpellWord, spellCompleted, playWordAudio]);

  const handleSpellingChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (spellAnswered || !currentSpellWord) return;
    const val = e.target.value.toLowerCase().replace(/[^a-z-]/g, '');
    setTypedValue(val);

    const targetClean = currentSpellWord.word.trim().toLowerCase();
    if (val === targetClean) {
      setSpellAnswered(true);
      setSpellIsCorrect(true);
      const earnedCoins = 25;
      setRoundCoins(prev => prev + earnedCoins);
      const updatedCoins = currentUser.coins + earnedCoins;
      onUpdateUser?.({ ...currentUser, coins: updatedCoins });
      showToast(`🎉 拼写完美匹配！+${earnedCoins}金币`);
      playWordAudio(currentSpellWord.word);

      await apiService.recordVocabularyProgress(currentSpellWord.id, currentUser.id, 'spelling', true);

      setTimeout(() => {
        advanceSpellingWord();
      }, 1500);
    }
  };

  const handleSkipSpelling = async () => {
    if (spellAnswered || !currentSpellWord) return;
    setSpellAnswered(true);
    setSpellIsCorrect(false);
    setTypedValue(currentSpellWord.word.toLowerCase());
    showToast(`💡 正确拼写为: ${currentSpellWord.word}`);
    await apiService.recordVocabularyProgress(currentSpellWord.id, currentUser.id, 'spelling', false);

    setTimeout(() => {
      advanceSpellingWord();
    }, 2000);
  };

  const advanceSpellingWord = () => {
    if (spellIdx + 1 < spellList.length) {
      setSpellIdx(prev => prev + 1);
    } else {
      setSpellCompleted(true);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] text-slate-100 font-mono py-4 px-2 sm:py-6 sm:px-4 transition-colors duration-300">
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div className="bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] rounded-2xl w-full flex flex-col relative overflow-hidden">
          {/* Top Glow Accent Bar */}
          <div className="h-1.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 w-full shrink-0" />

          {/* Modal Header */}
          <div className="sticky top-0 z-30 px-4 py-3 sm:px-6 sm:py-4 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-600 to-indigo-600 flex items-center justify-center text-xl shadow-lg shrink-0">
              📚
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide flex items-center gap-2">
                  单词探索宝库 // VOCAB LAB
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                  {words.length} 词库收录
                </span>
                {isForcedOffline() && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                    ⚡ 离线模式
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                语境探索 · 多维记忆 · 拼读进阶 · 离线发音
              </p>
            </div>
          </div>

          {/* User Treasury & Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
              <span>🪙</span>
              <span>{currentUser.coins}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-rose-500/20 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all cursor-pointer"
              title="关闭 (ESC)"
            >
              ✕ 关闭
            </button>
          </div>
        </div>

        {/* Book Selector & Download Bar */}
        <div className="px-4 py-2.5 sm:px-6 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 font-bold">当前词单:</span>
            {books.length === 0 ? (
              <span className="text-slate-500 italic">暂无可用词单，可在家长后台新建</span>
            ) : (
              <select
                value={selectedBookId || ''}
                onChange={(e) => handleSelectBook(Number(e.target.value))}
                className="bg-slate-950 border border-slate-700 text-cyan-300 font-bold rounded-lg px-3 py-1.5 outline-none focus:border-cyan-400 transition-all cursor-pointer"
              >
                {Object.entries(groupedBooks).map(([cat, bookList]) => (
                  <optgroup key={cat} label={`📚 ${cat}`} className="bg-slate-900 text-slate-300 font-semibold">
                    {bookList.map(b => (
                      <option key={b.id} value={b.id} className="bg-slate-950 text-cyan-300">
                        📄 {b.title} ({b.word_count || 0}词)
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCacheOffline}
              disabled={isCaching || !selectedBookId}
              className="px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="将词单及离线发音完整缓存至本地存储"
            >
              <span>{isCaching ? '⏳' : '📥'}</span>
              <span>{isCaching ? '缓存中...' : '离线缓存此词单'}</span>
            </button>
          </div>
        </div>

        {/* Sub-modes Switcher Tabs */}
        <div className="px-4 pt-3 sm:px-6 bg-slate-900/90 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto shrink-0 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setSubMode('learn')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subMode === 'learn'
                ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-950/40 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>📖</span>
            <span>01 // 学单词 (探索卡片)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('reading')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subMode === 'reading'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-950/40 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>⚡</span>
            <span>02 // 看句选义 (语境推断)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubMode('spelling')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              subMode === 'spelling'
                ? 'bg-purple-400 text-slate-950 shadow-md font-black'
                : 'text-slate-400 hover:text-white bg-slate-950/40 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>✍️</span>
            <span>03 // 听音拼写 (限时打字)</span>
          </button>
        </div>

        {/* Content Body: unconstrained natural height, scrolls via browser window */}
        <div className="p-4 sm:p-6 bg-slate-950/40">
          {loading ? (
            <div className="py-20 text-center text-slate-500 animate-pulse text-sm">
              🛰️ 正在载入生词能量包...
            </div>
          ) : words.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="text-4xl">📭</div>
              <h3 className="text-slate-300 font-bold text-base">此词单目前还是空的</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                可以前往右上角切换到家长管理后台，一键批量粘贴单词并由 AI 丰富例句、反义词和词源故事！
              </p>
            </div>
          ) : (
            <>
              {/* ───────────────────────────────────────────────────────────
                  SUB-MODE 1: 深度学单词卡片 (Learn)
                  ─────────────────────────────────────────────────────────── */}
              {subMode === 'learn' && currentLearnWord && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Word Banner Header */}
                  <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-indigo-500" />
                    
                    <div className="flex items-baseline gap-4 flex-wrap">
                      <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                        {currentLearnWord.word}
                      </h1>
                      {currentLearnWord.phonetic && (
                        <span className="text-base sm:text-lg text-cyan-400 font-mono bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-lg">
                          {currentLearnWord.phonetic}
                        </span>
                      )}
                      <span className="text-sm sm:text-base text-slate-300 font-bold">
                        {currentLearnWord.part_of_speech ? `${currentLearnWord.part_of_speech} ` : ''}
                        {currentLearnWord.translation}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => playWordAudio(currentLearnWord.word)}
                        className="w-12 h-12 rounded-full bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 flex items-center justify-center text-xl transition-all cursor-pointer shadow-lg active:scale-95"
                        title="播放标准发音"
                      >
                        🔊
                      </button>

                      {currentLearnWord.mastered ? (
                        <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold flex items-center gap-1">
                          ✓ 已熟练掌握
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-xs">
                          🌱 探索中
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2-Column Knowledge Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left: 趣味生动例句 (Fun Sentences) */}
                    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-4">
                      <div className="text-xs font-black uppercase text-amber-400 flex items-center justify-between gap-2 tracking-wider">
                        <span className="flex items-center gap-2">
                          <span>✨</span>
                          <span>趣味语境例句 (Humorous Context)</span>
                        </span>
                        <span className="text-[10px] text-slate-500 font-normal lowercase">
                          点击 🔊 发音
                        </span>
                      </div>

                      {(() => {
                        const sentences = getWordSentences(currentLearnWord);
                        if (sentences.length === 0) {
                          return (
                            <div className="text-xs text-slate-500 italic py-6 text-center">
                              暂无例句，可通过后台 AI 一键扩充
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-3">
                            {sentences.map((item, idx) => (
                              <div key={idx} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 group hover:border-cyan-500/40 transition-all">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-sm font-semibold text-slate-100 leading-relaxed flex-1">
                                    {renderSentenceWithHighlight(item.en, currentLearnWord.word)}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => playWordAudio(item.en)}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 transition-all cursor-pointer shrink-0 text-xs"
                                    title="播放例句发音"
                                  >
                                    🔊
                                  </button>
                                </div>
                                {item.zh && (
                                  <div className="text-xs text-slate-400 mt-1.5 pt-1.5 border-t border-slate-900">
                                    {item.zh}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Right: 词根词缀 + 反义词 + 词源 */}
                    <div className="space-y-4">
                      {/* 词根词缀 */}
                      {(() => {
                        const roots = parseBilingual(currentLearnWord.root_affixes);
                        const hasContent = Boolean(roots.en || roots.zh);
                        return (
                          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-black uppercase text-purple-400 flex items-center gap-2 tracking-wider">
                                <span>🧩</span>
                                <span>词根与构词剖析 (Root & Affixes)</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {roots.en && (
                                  <button
                                    type="button"
                                    onClick={() => playSpeech(roots.en, 'en')}
                                    className="px-2 py-0.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                    title="朗读构词英文说明"
                                  >
                                    <span>🔊</span>
                                    <span>EN</span>
                                  </button>
                                )}
                                {roots.zh && (
                                  <button
                                    type="button"
                                    onClick={() => playSpeech(roots.zh, 'yue')}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                    title="朗读构词粤语解析"
                                  >
                                    <span>🔊</span>
                                    <span>粤语</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1.5">
                              {roots.en && (
                                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                                  {roots.en}
                                </p>
                              )}
                              {roots.zh && (
                                <p className={`text-xs text-purple-300/90 leading-relaxed ${roots.en ? 'border-t border-slate-800 pt-1.5' : ''}`}>
                                  {roots.zh}
                                </p>
                              )}
                              {!hasContent && (
                                <p className="text-xs text-slate-500 italic">暂无词根词缀拆解</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* 语义对照网络: 反义词与同义词 */}
                      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-3">
                        <div className="text-xs font-black uppercase text-cyan-400 flex items-center gap-2 tracking-wider">
                          <span>⚖️</span>
                          <span>语义对照网络 (Contrast & Synonyms)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-300">
                            <div className="font-bold text-[10px] text-rose-400 uppercase tracking-wider mb-1">
                              反义词 (Antonym)
                            </div>
                            <div>{currentLearnWord.antonyms || '—'}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300">
                            <div className="font-bold text-[10px] text-emerald-400 uppercase tracking-wider mb-1">
                              同义词 (Synonym)
                            </div>
                            <div>{currentLearnWord.synonyms || '—'}</div>
                          </div>
                        </div>
                      </div>

                      {/* 词源小秘密 */}
                      {(() => {
                        const etym = parseBilingual(currentLearnWord.etymology);
                        const hasContent = Boolean(etym.en || etym.zh);
                        return (
                          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs font-black uppercase text-amber-300 flex items-center gap-2 tracking-wider">
                                <span>📜</span>
                                <span>词源趣谈 (Etymology Story)</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {etym.en && (
                                  <button
                                    type="button"
                                    onClick={() => playSpeech(etym.en, 'en')}
                                    className="px-2 py-0.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                    title="朗读词源英文故事"
                                  >
                                    <span>🔊</span>
                                    <span>EN</span>
                                  </button>
                                )}
                                {etym.zh && (
                                  <button
                                    type="button"
                                    onClick={() => playSpeech(etym.zh, 'yue')}
                                    className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                                    title="朗读词源粤语小故事"
                                  >
                                    <span>🔊</span>
                                    <span>粤语</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="bg-amber-500/5 border-l-2 border-amber-400 p-3 rounded-r-lg space-y-1.5">
                              {etym.en && (
                                <p className="text-xs text-slate-200 leading-relaxed">
                                  {etym.en}
                                </p>
                              )}
                              {etym.zh && (
                                <p className={`text-xs text-amber-200/90 leading-relaxed ${etym.en ? 'border-t border-amber-500/20 pt-1.5' : ''}`}>
                                  {etym.zh}
                                </p>
                              )}
                              {!hasContent && (
                                <p className="text-xs text-slate-400 italic">源自自然演化与语言变迁。</p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Carousel Footer Navigation */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setLearnIdx(prev => Math.max(0, prev - 1))}
                      disabled={learnIdx === 0}
                      className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      ← 上一个单词
                    </button>

                    <div className="text-xs text-slate-400 font-mono">
                      单词进度：
                      <span className="text-cyan-400 font-black"> {learnIdx + 1} </span>
                      / {words.length} 词
                    </div>

                    <button
                      type="button"
                      onClick={() => setLearnIdx(prev => Math.min(words.length - 1, prev + 1))}
                      disabled={learnIdx === words.length - 1}
                      className="px-4 py-2 rounded-xl border border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      下一个单词 →
                    </button>
                  </div>
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────
                  SUB-MODE 2: 看句选义 答题舞台 (Reading / Contextual Sentence Match)
                  ─────────────────────────────────────────────────────────── */}
              {subMode === 'reading' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {quizCompleted ? (
                    <div className="bg-slate-900/90 border border-cyan-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
                      <div className="text-5xl">🏆</div>
                      <h3 className="text-2xl font-black text-white">本轮挑战完成！</h3>
                      <p className="text-xs text-slate-400">
                        共挑战了 <strong className="text-cyan-300">{quizList.length}</strong> 道语境生词关卡
                      </p>
                      <div className="flex items-center justify-center gap-6 py-4">
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          <div className="text-[10px] uppercase font-bold text-amber-400/80">收获金币</div>
                          <div className="text-2xl font-black">+{roundCoins}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => initQuizRound('reading')}
                          className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                        >
                          🔄 再战一轮
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubMode('spelling')}
                          className="px-6 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs transition-all cursor-pointer"
                        >
                          ✍️ 前往拼写闯关
                        </button>
                      </div>
                    </div>
                  ) : currentQuizWord ? (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                      {/* Stats & Timer Header */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          第 <strong className="text-cyan-400">{quizIdx + 1}</strong> / {quizList.length} 题
                        </span>
                        {combo > 1 && (
                          <span className="text-rose-400 font-black animate-pulse">
                            🔥 COMBO x{combo}
                          </span>
                        )}
                        <span className="text-amber-400 font-bold">
                          ⏱️ 倒计时: {timeLeft}s
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
                          <span>CONTEXTUAL READING // 阅读语境句子，选出高亮词的正确中文意思</span>
                        </div>

                        {/* Sentence display with highlighted target word */}
                        <div className="text-base sm:text-xl font-medium text-slate-100 leading-relaxed max-w-xl mx-auto py-2">
                          {renderSentenceWithHighlight(getSentenceForWord(currentQuizWord), currentQuizWord.word)}
                        </div>

                        {/* Audio controls */}
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => playWordAudio(getSentenceForWord(currentQuizWord))}
                            className="px-4 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            title="朗读完整例句"
                          >
                            <span>🔊</span>
                            <span>朗读整句</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => playWordAudio(currentQuizWord.word)}
                            className="px-4 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            title="朗读目标词"
                          >
                            <span>🗣️</span>
                            <span>单词发音</span>
                          </button>
                        </div>
                      </div>

                      {/* 4-Choice Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {quizOptions.map((opt, i) => {
                          const keyLabel = ['A', 'B', 'C', 'D'][i] || '•';
                          let btnStyle = 'bg-slate-950/60 border-slate-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 text-slate-200';
                          if (quizAnswered) {
                            if (opt.isCorrect) {
                              btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-[0_0_15px_rgba(52,211,153,0.3)]';
                            } else if (selectedOptionId === opt.id && !opt.isCorrect) {
                              btnStyle = 'bg-rose-500/20 border-rose-400 text-rose-300 font-bold';
                            } else {
                              btnStyle = 'bg-slate-950/30 border-slate-900 text-slate-600 opacity-60';
                            }
                          }

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              disabled={quizAnswered}
                              onClick={() => handleSelectOption(opt)}
                              className={`p-4 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer text-sm ${btnStyle}`}
                            >
                              <span className="w-6 h-6 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono text-slate-400 shrink-0">
                                {keyLabel}
                              </span>
                              <span className="leading-snug">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* ───────────────────────────────────────────────────────────
                  SUB-MODE 4: 听音拼写闯关 (Spelling on iPad Ergonomics)
                  ─────────────────────────────────────────────────────────── */}
              {subMode === 'spelling' && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {spellCompleted ? (
                    <div className="bg-slate-900/90 border border-purple-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
                      <div className="text-5xl">🎉</div>
                      <h3 className="text-2xl font-black text-white">拼写闯关大捷！</h3>
                      <p className="text-xs text-slate-400">
                        已挑战 <strong className="text-purple-300">{spellList.length}</strong> 个生词拼写
                      </p>
                      <div className="flex items-center justify-center gap-6 py-4">
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          <div className="text-[10px] uppercase font-bold text-amber-400/80">累计奖励</div>
                          <div className="text-2xl font-black">+{roundCoins}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={initSpellingRound}
                          className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                        >
                          🔄 再拼一轮
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubMode('learn')}
                          className="px-6 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all cursor-pointer"
                        >
                          📖 返回深度卡片
                        </button>
                      </div>
                    </div>
                  ) : currentSpellWord ? (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">
                          拼写挑战 · 第 <strong className="text-purple-400">{spellIdx + 1}</strong> / {spellList.length} 词
                        </span>
                        <button
                          type="button"
                          onClick={handleSkipSpelling}
                          disabled={spellAnswered}
                          className="text-xs text-slate-400 hover:text-amber-300 underline cursor-pointer"
                        >
                          [显示提示 / 跳过]
                        </button>
                      </div>

                      {/* Prompt area (safely placed in top half for iPad keyboard) */}
                      <div className="py-6 px-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-4">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                          SPELL WHAT YOU HEAR // 听发音拼单词
                        </div>

                        <button
                          type="button"
                          onClick={() => playWordAudio(currentSpellWord.word)}
                          className="px-6 py-3 rounded-full bg-purple-500/20 border border-purple-400 text-purple-300 hover:bg-purple-400 hover:text-slate-950 font-bold text-sm inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95"
                        >
                          <span>🔊</span>
                          <span>播放发音 (点击重听)</span>
                        </button>

                        <div className="text-xs text-slate-400">
                          中文释义提示: <strong className="text-slate-200">{currentSpellWord.translation}</strong>
                        </div>

                        {/* Letter Slots Display */}
                        <div className="flex items-center justify-center gap-2 flex-wrap py-2">
                          {currentSpellWord.word.split('').map((letter, i) => {
                            const typedLetter = typedValue[i] || '';
                            const isFilled = Boolean(typedLetter);
                            let slotBorder = 'border-purple-500/40 bg-slate-900/50';
                            if (spellIsCorrect === true) {
                              slotBorder = 'border-emerald-400 bg-emerald-500/20 text-emerald-300';
                            } else if (spellIsCorrect === false) {
                              slotBorder = 'border-rose-400 bg-rose-500/20 text-rose-300';
                            } else if (isFilled) {
                              slotBorder = 'border-purple-400 bg-purple-500/10 text-white';
                            }

                            return (
                              <div
                                key={i}
                                className={`w-10 h-12 sm:w-12 sm:h-14 rounded-lg border-2 flex items-center justify-center text-xl sm:text-2xl font-black font-mono shadow-inner transition-all ${slotBorder}`}
                              >
                                {spellAnswered ? letter : typedLetter || '_'}
                              </div>
                            );
                          })}
                        </div>

                        {/* iPad Ergonomic Input (Safe from auto-correction & auto-capitalization) */}
                        <div className="max-w-md mx-auto pt-2">
                          <input
                            ref={spellInputRef}
                            type="text"
                            value={typedValue}
                            onChange={handleSpellingChange}
                            disabled={spellAnswered}
                            placeholder="轻触在此输入单词 (键盘已禁用自动更正)"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            className="w-full bg-slate-950 border-2 border-purple-500/50 rounded-xl px-4 py-3 text-center text-lg sm:text-xl font-mono text-white tracking-widest outline-none focus:border-purple-400 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
                          />
                          <p className="text-[10px] text-slate-500 mt-2 text-center">
                            💡 专为 iPad 触控优化：输入法联想已屏蔽，防遮挡高位视口
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-2.5 rounded-full bg-slate-900 border border-cyan-400 text-white text-xs font-bold shadow-2xl pointer-events-none animate-bounce">
          {toastMsg}
        </div>
      )}
    </div>
  );
};
