import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import './AdventureMap.css';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import { apiService } from '../utils/apiService';
import {
  BUDDY_CHARACTERS,
  normalizeBuddyKey,
  RunnerSprite
} from './StoryChaseAssets';

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
  started_count?: number;
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
  theme = 'cyber',
  fontScale = '130',
  onThemeChange,
  onFontScaleChange,
  onBackToStories,
  onOpenSongs,
  onLogout,
  onUpdateUser
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

  // Card Folding State
  const [collapsedCardIds, setCollapsedCardIds] = useState<Set<number>>(() => new Set());

  // Active Stage Game State (null = on Map View, non-null = playing chapter stage)
  const [activePlayingBook, setActivePlayingBook] = useState<WordBook | null>(null);
  const [activeStage, setActiveStage] = useState<StageMode | null>(null);
  const [chapterWords, setChapterWords] = useState<VocabularyWord[]>([]);
  const [loadingWords, setLoadingWords] = useState<boolean>(false);

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

  // Audio synthesis helper
  const playWordAudio = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      showToast(`🔊 [无法发音]: 设备不支持 Web Speech`);
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 0.88;
    const voices = window.speechSynthesis.getVoices();
    const offlineVoice = voices.find(v => v.lang.startsWith('en') && (v.localService || !v.voiceURI.includes('Google'))) || voices.find(v => v.lang.startsWith('en'));
    if (offlineVoice) utter.voice = offlineVoice;
    window.speechSynthesis.speak(utter);
  }, []);

  // 1. Fetch word books
  const loadBooks = useCallback(async () => {
    try {
      setLoadingBooks(true);
      const data = await apiService.getWordBooks(currentUser.id);
      setBooks(data || []);
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
    if (selectedCategory === null) return books;
    return books.filter(b => ((b.category && b.category.trim()) || 'General') === selectedCategory);
  }, [books, selectedCategory]);

  const currentCategoryStat = selectedCategory !== null
    ? (categoryStats[selectedCategory] || { count: 0, totalWords: 0, masteredWords: 0, startedWords: 0 })
    : allStats;

  // Toggle Collapse All Cards
  const allAreCollapsed = displayedBooks.length > 0 && displayedBooks.every(b => collapsedCardIds.has(b.id));

  const handleToggleCollapseAll = () => {
    if (allAreCollapsed) {
      setCollapsedCardIds(new Set());
    } else {
      setCollapsedCardIds(new Set(displayedBooks.map(b => b.id)));
    }
  };

  const toggleCardCollapse = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setCollapsedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Launch Stage Gameplay
  const handleStartStage = async (book: WordBook, stage: StageMode) => {
    if ((book.word_count || 0) === 0) {
      showToast('⚠️ 当前章节词单尚未录入单词，请先在家长后台导入！');
      return;
    }
    setActivePlayingBook(book);
    setActiveStage(stage);
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
      showToast('⚠️ 加载章节单词失败');
    } finally {
      setLoadingWords(false);
    }
  };

  // Back to Map from stage
  const handleBackToMap = async () => {
    setActivePlayingBook(null);
    setActiveStage(null);
    setChapterWords([]);
    setShowWordDrawer(false);
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
    showToast('⏱️ 时间到！已记录错题');
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

  useEffect(() => {
    if (activeStage === 'spelling' && currentSpellWord && !spellCompleted) {
      setTypedValue('');
      setSpellAnswered(false);
      setSpellIsCorrect(null);
      playWordAudio(currentSpellWord.word);
      setTimeout(() => spellInputRef.current?.focus(), 150);
    }
  }, [activeStage, spellIdx, currentSpellWord, spellCompleted, playWordAudio]);

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
                title="返回章节探索地图"
              >
                <span>‹</span>
                <span>返回章节地图</span>
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
              </div>
            </div>

            {/* Quick Switch Stage Pills & Coin Counter */}
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <div className="flex items-center p-1 rounded-xl bg-[#070b14] border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleStartStage(activePlayingBook, 'learn')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeStage === 'learn'
                      ? 'bg-[#00f0ff] text-slate-950 font-black shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  01 学单词
                </button>
                <button
                  type="button"
                  onClick={() => handleStartStage(activePlayingBook, 'reading')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeStage === 'reading'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  02 看句选义
                </button>
                <button
                  type="button"
                  onClick={() => handleStartStage(activePlayingBook, 'spelling')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    activeStage === 'spelling'
                      ? 'bg-purple-400 text-slate-950 font-black shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  03 听音拼写
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                <span>🪙</span>
                <span>{currentUser.coins}</span>
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
                🛰️ 正在载入章节词库能量包...
              </div>
            ) : chapterWords.length === 0 ? (
              <div className="theme-card p-12 rounded-2xl text-center border theme-border space-y-4">
                <div className="text-4xl">📭</div>
                <h3 className="text-slate-200 font-bold text-base">此章节暂未录入生词</h3>
                <button
                  type="button"
                  onClick={handleBackToMap}
                  className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-cyan-400 transition-all"
                >
                  ← 返回章节地图
                </button>
              </div>
            ) : (
              <>
                {/* ── STAGE 1: 学单词探索卡片 ── */}
                {activeStage === 'learn' && currentLearnWord && (
                  <div className="space-y-6">
                    {/* ── 1. Top Word Quick Picker Bar ── */}
                    <div className="bg-[#0d1424]/90 border border-white/10 p-2 sm:p-2.5 rounded-2xl shadow-xl backdrop-blur-md flex items-center gap-2 sm:gap-3">
                      <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-[#00f0ff] text-xs font-bold font-mono">
                        <span>🧭</span>
                        <span>快速选词</span>
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
                        title="展开全章所有单词目录列表"
                      >
                        <span>📋</span>
                        <span className="hidden sm:inline">全词目录</span>
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
                              ✓ 已掌握
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs">
                              🌱 探索中
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
                            title="点击播放标准发音"
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
                            title="播放标准真人发音 (快捷键: 空格 Space)"
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
                            <span>生动情境例句 (Sentences)</span>
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              const sList = getWordSentences(currentLearnWord);
                              if (sList.length > 0) playWordAudio(sList[0].en);
                            }}
                            className="w-8 h-8 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-[#00f0ff] flex items-center justify-center text-sm transition-colors cursor-pointer"
                            title="朗读当前例句"
                          >
                            🔊
                          </button>
                        </div>
                        {(() => {
                          const sList = getWordSentences(currentLearnWord);
                          if (sList.length === 0) {
                            return <p className="text-sm text-slate-500 italic py-4">暂无例句，可在后台 AI 丰富</p>;
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
                                      title="朗读此例句"
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
                        <div className="space-y-2.5">
                          <h3 className="text-sm uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-2">
                            <span className="text-lg">🧩</span>
                            <span>构词奥秘 (Roots & Affixes)</span>
                          </h3>
                          <p className="text-sm sm:text-base text-slate-200 leading-relaxed bg-[#121a2f]/80 p-4 rounded-2xl border border-white/5">
                            {currentLearnWord.root_affixes || '词根拆解尚未生成，可通过后台 AI 智能丰富'}
                          </p>
                        </div>

                        {/* 反义词 & 同义词 */}
                        {(currentLearnWord.antonyms || currentLearnWord.synonyms) && (
                          <div className="space-y-2.5">
                            <h3 className="text-sm uppercase tracking-wider font-extrabold text-rose-400 flex items-center gap-2">
                              <span className="text-lg">⚖️</span>
                              <span>同义 / 反义联想</span>
                            </h3>
                            <div className="flex flex-wrap gap-2.5 text-sm">
                              {currentLearnWord.antonyms && (
                                <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-semibold">
                                  反: {currentLearnWord.antonyms}
                                </span>
                              )}
                              {currentLearnWord.synonyms && (
                                <span className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-semibold">
                                  同: {currentLearnWord.synonyms}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 词源趣谈 */}
                        {currentLearnWord.etymology && (
                          <div className="space-y-2.5">
                            <h3 className="text-sm uppercase tracking-wider font-extrabold text-purple-400 flex items-center gap-2">
                              <span className="text-lg">📜</span>
                              <span>词源与记忆挂钩 (Etymology)</span>
                            </h3>
                            <p className="text-sm sm:text-base text-slate-200 leading-relaxed bg-[#121a2f]/80 p-4 rounded-2xl border border-white/5">
                              {currentLearnWord.etymology}
                            </p>
                          </div>
                        )}
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
                          <span>All Words Directory</span>
                          <div className="w-8 h-4.5 rounded-full bg-cyan-950 border border-cyan-400 flex items-center px-0.5">
                            <div className="w-3.5 h-3.5 rounded-full bg-cyan-400" />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setLearnIdx(prev => Math.min(chapterWords.length - 1, prev + 1))}
                          disabled={learnIdx === chapterWords.length - 1}
                          className="px-7 py-3 rounded-2xl bg-[#00f0ff] hover:bg-[#38bdf8] text-slate-950 text-sm font-black flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-30 disabled:pointer-events-none"
                        >
                          <span>Next</span>
                          <span>›</span>
                          <span className="text-[10px] font-mono text-slate-900 hidden sm:inline">(Right)</span>
                        </button>
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
                                <span>All Words Directory</span>
                              </h2>
                              <p className="text-xs sm:text-sm font-mono text-slate-400 mt-1">
                                {activePlayingBook.title} · {chapterWords.length} Words · 点击任意单词卡片直接跳转
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowWordDrawer(false)}
                              className="px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-white/10 text-slate-300 hover:text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
                            >
                              <span>Back to Card</span>
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
                              键盘支持：<kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Esc</kbd> 关闭目录 · <kbd className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Space</kbd> 听发音
                            </div>
                            <div className="text-cyan-300 font-mono font-bold">
                              当前选中：#{String(learnIdx + 1).padStart(2, '0')} {currentLearnWord.word}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── STAGE 2: 看句选义 语境推断关卡 ── */}
                {activeStage === 'reading' && (
                  <div className="w-full space-y-6">
                    {quizCompleted ? (
                      <div className="theme-card border border-cyan-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl">
                        <div className="text-5xl">🏆</div>
                        <h3 className="text-2xl font-black text-white">本轮挑战完成！</h3>
                        <p className="text-xs text-slate-400">
                          共完成了 <strong className="text-cyan-300">{quizList.length}</strong> 道语境词汇挑战关卡
                        </p>
                        <div className="flex items-center justify-center gap-6 py-4">
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            <div className="text-[10px] uppercase font-bold text-amber-400/80">收获金币</div>
                            <div className="text-2xl font-black">+{roundCoins}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => initQuizRound(chapterWords)}
                            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                          >
                            🔄 再战一轮
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartStage(activePlayingBook, 'spelling')}
                            className="px-6 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 font-bold text-xs transition-all cursor-pointer"
                          >
                            ✍️ 前往拼写闯关
                          </button>
                          <button
                            type="button"
                            onClick={handleBackToMap}
                            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                          >
                            ← 返回章节地图
                          </button>
                        </div>
                      </div>
                    ) : currentQuizWord ? (
                      <div className="theme-card border theme-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
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
                          <div className="text-base sm:text-xl font-medium text-slate-100 leading-relaxed max-w-2xl mx-auto py-2">
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
                              className="px-4 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              title="单读生词"
                            >
                              <span>🎯</span>
                              <span>仅读目标词</span>
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
                        <h3 className="text-2xl font-black text-white">拼写大挑战达成！</h3>
                        <p className="text-xs text-slate-400">
                          本轮完成了 <strong className="text-purple-300">{spellList.length}</strong> 个单词盲听盲打记忆
                        </p>
                        <div className="flex items-center justify-center gap-6 py-4">
                          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
                            <div className="text-[10px] uppercase font-bold text-amber-400/80">金币奖励</div>
                            <div className="text-2xl font-black">+{roundCoins}</div>
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => initSpellingRound(chapterWords)}
                            className="px-6 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg"
                          >
                            🔄 再战一轮拼写
                          </button>
                          <button
                            type="button"
                            onClick={handleBackToMap}
                            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all cursor-pointer"
                          >
                            ← 返回章节地图
                          </button>
                        </div>
                      </div>
                    ) : currentSpellWord ? (
                      <div className="theme-card border theme-border rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">
                            第 <strong className="text-purple-400">{spellIdx + 1}</strong> / {spellList.length} 词
                          </span>
                          <span className="text-xs text-purple-300 font-bold">
                            ✍️ 听音输入英文字母
                          </span>
                        </div>

                        {/* Pronunciation & Prompt Stage */}
                        <div className="py-8 px-6 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-4">
                          <button
                            type="button"
                            onClick={() => playWordAudio(currentSpellWord.word)}
                            className="w-16 h-16 rounded-full bg-purple-500/20 border-2 border-purple-400 text-purple-300 hover:bg-purple-400 hover:text-slate-950 text-2xl mx-auto flex items-center justify-center transition-all cursor-pointer shadow-[0_0_25px_rgba(168,85,247,0.3)] active:scale-95"
                            title="重新播放发音"
                          >
                            🔊
                          </button>
                          <p className="text-xs text-slate-400 font-mono">点击喇叭重新播放发音</p>

                          <div className="space-y-1 pt-2">
                            {currentSpellWord.phonetic && (
                              <div className="text-xs text-cyan-400 font-mono">
                                [{currentSpellWord.phonetic}]
                              </div>
                            )}
                            <div className="text-base font-bold text-slate-200">
                              {currentSpellWord.translation}
                            </div>
                          </div>
                        </div>

                        {/* Typing Arena Input */}
                        <div className="max-w-xl mx-auto w-full space-y-3">
                          <div className="relative">
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
                              className={`w-full bg-slate-950 border-2 rounded-xl px-4 py-3 text-center text-lg sm:text-xl font-mono tracking-widest outline-none transition-all ${
                                spellAnswered
                                  ? spellIsCorrect
                                    ? 'border-emerald-400 bg-emerald-950/20 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                                    : 'border-amber-400 bg-amber-950/20 text-amber-300'
                                  : 'border-purple-500/50 text-white focus:border-purple-400 focus:shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                              }`}
                            />
                            {spellAnswered && (
                              <p className={`text-xs mt-2 text-center font-bold ${spellIsCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {spellIsCorrect ? '🎉 拼写完美匹配！' : `💡 正确拼写: ${currentSpellWord.word}`}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500 mt-2 text-center">
                              💡 专为 iPad 触控优化：输入法联想已屏蔽，防遮挡高位视口
                            </p>
                          </div>

                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={handleSkipSpelling}
                              disabled={spellAnswered}
                              className="text-xs text-slate-500 hover:text-amber-400 underline font-mono cursor-pointer disabled:opacity-40"
                            >
                              不会拼写？查看提示 ➔
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
              title="返回故事主探险地图 (Story Adventure Map)"
            >
              <span>🗺️</span>
              <span>故事地图</span>
            </button>

            {/* Song Adventure Map Button */}
            {onOpenSongs && (
              <button
                type="button"
                onClick={onOpenSongs}
                className="px-3.5 py-2 text-xs rounded-xl font-black transition-all cursor-pointer bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-400/50 text-purple-300 hover:text-white flex items-center gap-1.5 font-mono shadow-md active:scale-95 shrink-0"
                title="进入歌曲乐园探险 (Song Adventure Map)"
              >
                <span>🎵</span>
                <span>歌曲乐园</span>
              </button>
            )}
          </div>

          {/* Center: Treasury & Vocabulary Mastery Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
            {/* Stars Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-mono">
              <span className="text-base leading-none">⭐</span>
              <div>
                <div className="text-[10px] uppercase text-amber-400/70 font-black tracking-wider leading-none">可用星星</div>
                <div className="text-sm font-black text-amber-300 tabular-nums">
                  {currentUser.stars !== undefined ? Math.max(0, currentUser.stars - (currentUser.spent_stars || 0)) : 0}
                </div>
              </div>
            </div>

            {/* Coins Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-amber-200 shadow-sm font-mono">
              <span className="text-base leading-none">🪙</span>
              <div>
                <div className="text-[10px] uppercase text-yellow-400/70 font-black tracking-wider leading-none">金币奖励</div>
                <div className="text-sm font-black text-amber-300 tabular-nums">
                  {currentUser.coins}
                </div>
              </div>
            </div>

            {/* Total Vocabulary Mastery Progress Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 shadow-sm font-mono">
              <span className="text-base leading-none">📚</span>
              <div>
                <div className="text-[10px] uppercase text-cyan-400/70 font-black tracking-wider leading-none">已掌握单词</div>
                <div className="text-sm font-black text-cyan-300 tabular-nums">
                  {allStats.masteredWords} <span className="text-xs text-cyan-500/60 font-normal">/ {allStats.totalWords} 词</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Offline, Theme & Settings Control Cluster */}
          <div className="flex items-center justify-end gap-2.5 w-full lg:w-auto">
            {/* 2-Way Theme Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-950/60 border border-slate-800 font-mono">
              <button
                type="button"
                onClick={() => onThemeChange?.('cyber')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  theme === 'cyber' || theme !== 'bright'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                    : 'theme-text-muted hover:theme-text'
                }`}
                title="深色模式"
              >
                🌙
              </button>
              <button
                type="button"
                onClick={() => onThemeChange?.('bright')}
                className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  theme === 'bright'
                    ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                    : 'theme-text-muted hover:theme-text'
                }`}
                title="浅色模式"
              >
                ☀️
              </button>
            </div>

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
                title="退出登录"
              >
                🚪
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-6xl mx-auto">
        {/* Header Summary */}
        <div className="flex flex-wrap justify-between items-end mb-6 gap-4 border-b theme-border pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 uppercase font-mono">
              Vocab Adventure Map 🗺️ 单词宝库探险
            </h1>
            <p className="text-xs theme-text-muted font-mono mt-1">
              以书本与章节为单位，探索深度例句、语境推断与拼写打字！
            </p>
          </div>
          <OfflineSyncBadge currentUserId={currentUser.id} variant="map" />
        </div>

        {/* ── STORY GROUPS 即是 书本系列 (Book Series Bar) ── */}
        {books.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider theme-text-muted">
                <span>📚 书本系列 (SERIES):</span>
                <span className="text-cyan-400 font-extrabold">
                  {selectedCategory === null ? `ALL SERIES (全部 ${books.length} 章节 · ${allStats.totalWords} 词)` : `${selectedCategory} (${currentCategoryStat.count} 章节 · ${currentCategoryStat.totalWords} 词)`}
                </span>
              </div>
              <div className="text-xs font-mono theme-text-muted flex items-center gap-3 flex-wrap">
                <span>
                  🏆 Mastered: <strong className="text-emerald-400 font-bold">{currentCategoryStat.masteredWords} / {currentCategoryStat.totalWords} 词</strong>
                </span>
                <button
                  type="button"
                  onClick={handleToggleCollapseAll}
                  className="px-2.5 py-1 rounded-lg border theme-border bg-black/20 dark:bg-white/10 text-[0.7rem] text-cyan-400 font-mono font-bold hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title={allAreCollapsed ? 'Expand all cards' : 'Collapse all cards'}
                >
                  <span>{allAreCollapsed ? '📂' : '📁'}</span>
                  <span>{allAreCollapsed ? 'EXPAND ALL (展开全部)' : 'COLLAPSE ALL (折叠全部)'}</span>
                </button>
              </div>
            </div>

            {/* Series Tab Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-black/10 dark:bg-white/5 p-2 rounded-xl border theme-border">
              {/* ALL Tab */}
              <button
                type="button"
                onClick={() => handleSelectCategory(null)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 border story-group-tab-pill ${
                  selectedCategory === null
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                    : 'bg-black/20 dark:bg-white/10 theme-border theme-text-muted hover:theme-text hover:border-cyan-500/40'
                }`}
              >
                <span>🌐 全部书本 (ALL)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  selectedCategory === null ? 'bg-slate-950/40 text-cyan-200' : 'bg-black/30 text-slate-400'
                }`}>
                  {books.length}章 · {allStats.totalWords}词
                </span>
              </button>

              {/* Specific Series Tabs */}
              {availableCategories.map((category) => {
                const stat = categoryStats[category] || { count: 0, totalWords: 0, masteredWords: 0, startedWords: 0 };
                const isSelected = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleSelectCategory(category)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 border story-group-tab-pill ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                        : 'bg-black/20 dark:bg-white/10 theme-border theme-text-muted hover:theme-text hover:border-cyan-500/40'
                    }`}
                  >
                    <span>📚 {category}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isSelected ? 'bg-slate-950/40 text-cyan-200' : 'bg-black/30 text-slate-400'
                    }`}>
                      {stat.count}章 · {stat.totalWords}词
                    </span>
                    {stat.masteredWords > 0 && (
                      <span className={`text-[10px] ${isSelected ? 'text-slate-950 font-black' : 'text-emerald-400 font-bold'}`}>
                        ✓{stat.masteredWords}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 卡片就是 章节目录 (Chapter Cards Grid) ── */}
        {loadingBooks ? (
          <div className="py-24 text-center text-slate-500 animate-pulse text-sm">
            🛰️ 正在载入单词宝库地图...
          </div>
        ) : books.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md space-y-3">
            <div className="text-4xl">📭</div>
            <h3 className="text-slate-200 font-bold text-base">暂无可用的词单书本</h3>
            <p className="text-sm theme-text-muted italic">
              请联系家长在教学管理后台创建书本并导入生词！
            </p>
          </div>
        ) : displayedBooks.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md">
            <p className="text-sm theme-text-muted italic mb-4">
              在系列 "{selectedCategory}" 中未找到任何章节。
            </p>
            <button
              type="button"
              onClick={() => handleSelectCategory(null)}
              className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider font-mono hover:bg-cyan-400 cursor-pointer shadow-md"
            >
              查看全部系列 (View All Series)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {displayedBooks.map((book, index) => {
              const wordCount = book.word_count || 0;
              const masteredCount = book.mastered_count || 0;
              const isFullyMastered = wordCount > 0 && masteredCount >= wordCount;
              const isStarted = (book.started_count || 0) > 0;
              const isCollapsed = collapsedCardIds.has(book.id);

              let cardStyle = 'relative group rounded-xl p-6 transition-all duration-300 border backdrop-blur-md flex flex-col justify-between story-card-collapsible ';
              if (wordCount === 0) {
                cardStyle += 'opacity-60 theme-card border-slate-700 cursor-not-allowed';
              } else if (isFullyMastered) {
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
                    if (isCollapsed) {
                      setCollapsedCardIds((prev) => {
                        const next = new Set(prev);
                        next.delete(book.id);
                        return next;
                      });
                    } else if (wordCount > 0) {
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

                      {/* Status Badges & Collapse Chevron */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {wordCount === 0 ? (
                          <span className="bg-slate-900/80 text-slate-500 border border-slate-800 font-mono text-xs px-2.5 py-1 rounded-full font-semibold">
                            📭 暂无词
                          </span>
                        ) : isFullyMastered ? (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 font-mono text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            ✓ 已通关
                          </span>
                        ) : isStarted ? (
                          <span className="bg-cyan-500/20 text-cyan-400 animate-pulse font-mono border border-cyan-500/40 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            ▶ 探索中
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono text-xs px-2.5 py-1 rounded-full font-medium">
                            NEW
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={(e) => toggleCardCollapse(e, book.id)}
                          className="w-7 h-7 rounded-lg border theme-border bg-black/10 dark:bg-white/10 hover:bg-cyan-500/20 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all flex items-center justify-center cursor-pointer text-xs font-bold font-mono"
                          title={isCollapsed ? '展开关卡 (Expand Stages)' : '折叠关卡 (Collapse Stages)'}
                        >
                          {isCollapsed ? '▼' : '▲'}
                        </button>
                      </div>
                    </div>

                    {/* Chapter Stats Bar */}
                    <div className="flex justify-between items-center mb-4 px-3 py-2 bg-black/5 dark:bg-white/10 rounded-lg border theme-border text-xs">
                      <div className="flex items-center gap-1 font-bold">
                        <span className="theme-text-muted mr-1 font-bold">MASTERED:</span>
                        <span className="text-cyan-400 font-mono">
                          {masteredCount} / {wordCount} 词
                        </span>
                      </div>

                      <div className="text-amber-500 dark:text-amber-400 font-mono font-extrabold flex items-center gap-1">
                        🪙 +150 Coins
                      </div>
                    </div>

                    {/* ── 卡片内对应三个关卡 (Collapsed vs Expanded) ── */}
                    {isCollapsed ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={(e) => toggleCardCollapse(e, book.id)}
                          className="w-full flex justify-between items-center px-4 py-2.5 rounded-lg border theme-border bg-black/10 dark:bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-xs font-mono font-bold text-cyan-400 transition-all cursor-pointer"
                        >
                          <span>▼ 关卡已折叠 (Stages Folded)</span>
                          <span className="text-[0.65rem] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                            展开 3 个关卡 ▾
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {/* Stage 1: 学单词探索卡片 */}
                        <button
                          type="button"
                          disabled={wordCount === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (wordCount > 0) handleStartStage(book, 'learn');
                          }}
                          className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-1 ${
                            wordCount === 0
                              ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                              : 'bg-cyan-500/20 border-cyan-500/80 text-cyan-600 dark:text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>01 // 学单词 (探索卡片)</span>
                            <span>📖</span>
                          </div>
                          <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                            {wordCount === 0 ? 'Empty' : 'Play ▶'}
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
                          className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-2 ${
                            wordCount === 0
                              ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                              : 'bg-amber-500/20 border-amber-500/80 text-amber-600 dark:text-amber-200 font-bold shadow-sm shadow-amber-500/20 hover:bg-amber-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>02 // 看句选义 (语境推断)</span>
                            <span>⚡</span>
                          </div>
                          <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                            {wordCount === 0 ? 'Empty' : 'Play ▶'}
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
                          className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-3 ${
                            wordCount === 0
                              ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                              : 'bg-purple-500/20 border-purple-500/80 text-purple-600 dark:text-purple-200 font-bold shadow-sm shadow-purple-500/20 hover:bg-purple-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>03 // 听音拼写 (限时打字)</span>
                            <span>✍️</span>
                          </div>
                          <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                            {wordCount === 0 ? 'Empty' : 'Play ▶'}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
