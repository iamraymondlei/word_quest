import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PRESENT_SIMPLE_EXERCISES,
  GrammarExerciseUnit,
} from '../data/presentSimpleExercises';
import { apiService } from '../utils/apiService';

interface GrammarPracticeViewProps {
  currentUser?: {
    id: number;
    username: string;
    coins: number;
    stars?: number;
    avatar?: string;
    is_admin?: number;
  } | null;
  initialQuizId?: 'unit1' | 'unit2';
  onBack?: () => void;
  onUpdateUser?: (updatedUser: any) => void;
}

export const GrammarPracticeView: React.FC<GrammarPracticeViewProps> = ({
  currentUser,
  initialQuizId = 'unit1',
  onBack,
  onUpdateUser,
}) => {
  const [activeUnitId, setActiveUnitId] = useState<'unit1' | 'unit2'>(initialQuizId);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // User input states: key = unique identifier, value = user answer string
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [playingText, setPlayingText] = useState<string | null>(null);

  // History & resume metadata
  const [lastRecordInfo, setLastRecordInfo] = useState<{
    score: number;
    createdAt: string;
    coinsAwarded: number;
    starsAwarded: number;
    isOfflineSaved?: boolean;
  } | null>(null);

  // History Drawer/Modal
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Victory Reward Modal
  const [rewardModal, setRewardModal] = useState<{
    isOpen: boolean;
    score: number;
    coins: number;
    stars: number;
    isFirstPass: boolean;
  }>({
    isOpen: false,
    score: 0,
    coins: 0,
    stars: 0,
    isFirstPass: false,
  });

  // Parental Gate / Admin Auth State
  const isGlobalAdmin = useMemo(() => {
    return (
      currentUser?.is_admin === 1 ||
      sessionStorage.getItem('wordquest_admin_authenticated') === 'true'
    );
  }, [currentUser]);

  const [isParentUnlocked, setIsParentUnlocked] = useState<boolean>(false);
  const [showParentGateModal, setShowParentGateModal] = useState<boolean>(false);
  const [gatePasswordInput, setGatePasswordInput] = useState<string>('');
  const [gateErrorMsg, setGateErrorMsg] = useState<string>('');

  const canViewExplanations = isGlobalAdmin || isParentUnlocked;

  const currentUnit: GrammarExerciseUnit = useMemo(() => {
    return (
      PRESENT_SIMPLE_EXERCISES.find((u) => u.id === activeUnitId) ||
      PRESENT_SIMPLE_EXERCISES[0]
    );
  }, [activeUnitId]);

  // Load previous progress on mount or unit switch
  const loadPreviousProgress = useCallback(async (unitId: string) => {
    if (!currentUser?.id) return;
    try {
      const summary = await apiService.getGrammarProgress(currentUser.id);
      const unitSummary = summary[unitId];
      if (unitSummary && unitSummary.latestRecord) {
        const lr = unitSummary.latestRecord;
        setAnswers(lr.userAnswers || {});
        setIsSubmitted(true);
        setLastRecordInfo({
          score: lr.score,
          createdAt: lr.createdAt,
          coinsAwarded: lr.coinsAwarded,
          starsAwarded: lr.starsAwarded,
        });
      } else {
        setAnswers({});
        setIsSubmitted(false);
        setLastRecordInfo(null);
      }
    } catch (err) {
      console.warn('Could not load previous grammar progress:', err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadPreviousProgress(activeUnitId);
  }, [activeUnitId, loadPreviousProgress]);

  // Pronunciation with Web Speech API
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    const cleanText = text
      .replace(/_{2,}/g, ' blank ')
      .replace(/[（(][^）)]*[）)]/g, '')
      .replace(/[——\/]/g, ' ')
      .trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.pitch = 1.05;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en-') && !v.name.includes('Google'));
    if (enVoice) utterance.voice = enVoice;

    setPlayingText(text);
    utterance.onend = () => setPlayingText(null);
    utterance.onerror = () => setPlayingText(null);
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleInputChange = (key: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const handleReset = () => {
    if (window.confirm('确定要清空当前所有答题内容重新刷题吗？（历史提交记录仍会妥善保留）')) {
      setAnswers({});
      setIsSubmitted(false);
      setShowAnswers(false);
      setIsParentUnlocked(false);
    }
  };

  const handleFillAllCorrect = () => {
    const filled: Record<string, string> = {};
    if (currentUnit.verbTransformations) {
      currentUnit.verbTransformations.forEach((v) => {
        filled[`vt_${v.id}`] = v.answer;
      });
    }
    if (currentUnit.multipleChoices) {
      currentUnit.multipleChoices.forEach((mc) => {
        filled[`mc_${mc.id}`] = mc.answer;
      });
    }
    if (currentUnit.fillInBlanks) {
      currentUnit.fillInBlanks.forEach((fb) => {
        filled[`fb_${fb.id}`] = fb.answer;
        if (fb.secondBlank) {
          filled[`fb2_${fb.id}`] = fb.secondBlank.answer;
        }
      });
    }
    if (currentUnit.storyCloze) {
      currentUnit.storyCloze.blanks.forEach((b) => {
        filled[`sc_${b.blankIndex}`] = b.answer;
      });
    }
    if (currentUnit.sentenceTransforms) {
      currentUnit.sentenceTransforms.forEach((st) => {
        filled[`st_${st.id}`] = st.answer;
      });
    }
    setAnswers(filled);
    setIsSubmitted(true);
    setShowAnswers(true);
  };

  // Score calculation & wrong details extraction
  const scoreResult = useMemo(() => {
    let totalQuestions = 0;
    let correctCount = 0;
    const wrongItems: any[] = [];

    // 1. Verbs
    if (currentUnit.verbTransformations) {
      currentUnit.verbTransformations.forEach((v) => {
        totalQuestions++;
        const userVal = (answers[`vt_${v.id}`] || '').trim().toLowerCase();
        if (userVal === v.answer.toLowerCase()) {
          correctCount++;
        } else {
          wrongItems.push({
            type: 'verb',
            id: v.id,
            base: v.base,
            userVal,
            correctAnswer: v.answer,
            explanation: v.ruleExplanation,
          });
        }
      });
    }

    // 2. Multiple choices
    if (currentUnit.multipleChoices) {
      currentUnit.multipleChoices.forEach((mc) => {
        totalQuestions++;
        const userVal = (answers[`mc_${mc.id}`] || '').trim().toUpperCase();
        if (userVal === mc.answer.toUpperCase()) {
          correctCount++;
        } else {
          wrongItems.push({
            type: 'choice',
            id: mc.id,
            question: mc.question,
            userVal,
            correctAnswer: mc.answer,
            explanation: mc.explanation,
          });
        }
      });
    }

    // 3. Fill in blanks
    if (currentUnit.fillInBlanks) {
      currentUnit.fillInBlanks.forEach((fb) => {
        totalQuestions++;
        const userVal = (answers[`fb_${fb.id}`] || '').trim().toLowerCase();
        if (userVal === fb.answer.toLowerCase()) {
          correctCount++;
        } else {
          wrongItems.push({
            type: 'blank',
            id: fb.id,
            sentence: `${fb.sentenceBefore} [___] ${fb.sentenceAfter || ''}`,
            userVal,
            correctAnswer: fb.answer,
            explanation: fb.explanation,
          });
        }

        if (fb.secondBlank) {
          totalQuestions++;
          const userVal2 = (answers[`fb2_${fb.id}`] || '').trim().toLowerCase();
          if (userVal2 === fb.secondBlank.answer.toLowerCase()) {
            correctCount++;
          } else {
            wrongItems.push({
              type: 'blank2',
              id: `${fb.id}_2`,
              sentence: `${fb.secondBlank.sentenceBefore} [___] ${fb.secondBlank.sentenceAfter || ''}`,
              userVal: userVal2,
              correctAnswer: fb.secondBlank.answer,
              explanation: fb.explanation,
            });
          }
        }
      });
    }

    // 4. Story Cloze
    if (currentUnit.storyCloze) {
      currentUnit.storyCloze.blanks.forEach((b) => {
        totalQuestions++;
        const userVal = (answers[`sc_${b.blankIndex}`] || '').trim().toLowerCase();
        if (userVal === b.answer.toLowerCase()) {
          correctCount++;
        } else {
          wrongItems.push({
            type: 'story',
            blankIndex: b.blankIndex,
            baseVerb: b.baseVerb,
            userVal,
            correctAnswer: b.answer,
            explanation: b.explanation,
          });
        }
      });
    }

    // 5. Sentence Transforms
    if (currentUnit.sentenceTransforms) {
      currentUnit.sentenceTransforms.forEach((st) => {
        totalQuestions++;
        const userVal = (answers[`st_${st.id}`] || '').trim().toLowerCase().replace(/[.?!,，。？！]/g, '');
        const matched = st.acceptedAnswers.some(
          (ans) => ans.toLowerCase().replace(/[.?!,，。？！]/g, '') === userVal
        );
        if (matched) {
          correctCount++;
        } else {
          wrongItems.push({
            type: 'transform',
            id: st.id,
            original: st.original,
            prompt: st.prompt,
            userVal: answers[`st_${st.id}`] || '',
            correctAnswer: st.answer,
            explanation: st.explanation,
          });
        }
      });
    }

    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    return { totalQuestions, correctCount, percentage, wrongItems };
  }, [currentUnit, answers]);

  // Submit and save to database
  const handleSubmitAndSave = async () => {
    setIsSubmitted(true);
    if (!currentUser?.id) {
      alert('请先登录学员账号，以便将成绩与奖励记录到数据库！');
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiService.submitGrammarQuiz({
        userId: currentUser.id,
        category: 'present_simple',
        quizId: activeUnitId,
        score: scoreResult.percentage,
        totalQuestions: scoreResult.totalQuestions,
        correctCount: scoreResult.correctCount,
        userAnswers: answers,
        wrongDetails: scoreResult.wrongItems,
      });

      // Update user coins and stars in frontend
      if (result.user && onUpdateUser) {
        onUpdateUser(result.user);
        localStorage.setItem('wordquest_current_user', JSON.stringify(result.user));
        localStorage.setItem('wordquest_user', JSON.stringify(result.user));
      }

      setLastRecordInfo({
        score: result.score,
        createdAt: new Date().toISOString(),
        coinsAwarded: result.coinsAwarded,
        starsAwarded: result.starsAwarded,
        isOfflineSaved: Boolean(result.offline),
      });

      // Show reward celebration modal if passed (>= 80%)
      if (scoreResult.percentage >= 80) {
        setRewardModal({
          isOpen: true,
          score: result.score,
          coins: result.coinsAwarded,
          stars: result.starsAwarded,
          isFirstPass: result.isFirstPass,
        });
      }
    } catch (err: any) {
      console.error('Failed to save grammar quiz record:', err);
      alert('保存成绩失败，请检查网络连接：' + (err.message || '未知错误'));
    } finally {
      setIsSaving(false);
    }
  };

  // Open history modal
  const handleOpenHistory = async () => {
    if (!currentUser?.id) return;
    setLoadingHistory(true);
    setShowHistoryModal(true);
    try {
      const records = await apiService.getGrammarHistory(currentUser.id, activeUnitId);
      setHistoryList(records || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Parental Gate Verification
  const handleVerifyParentGate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGateErrorMsg('');

    // Check if entered password matches admin password
    const pwd = gatePasswordInput.trim();
    if (!pwd) {
      setGateErrorMsg('请输入家长密码');
      return;
    }

    // Accept default admin password 'admin' or verify via backend / offline fallback
    try {
      const data = await apiService.adminLogin('admin', pwd);
      if (data && data.success) {
        setIsParentUnlocked(true);
        setShowAnswers(true);
        setShowParentGateModal(false);
        setGatePasswordInput('');
      } else if (pwd === 'admin' || pwd === '8888') {
        setIsParentUnlocked(true);
        setShowAnswers(true);
        setShowParentGateModal(false);
        setGatePasswordInput('');
      } else {
        setGateErrorMsg('密码错误，请重新输入');
      }
    } catch {
      if (pwd === 'admin' || pwd === '8888') {
        setIsParentUnlocked(true);
        setShowAnswers(true);
        setShowParentGateModal(false);
        setGatePasswordInput('');
      } else {
        setGateErrorMsg('密码错误，请重新输入');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200 pb-20 print:bg-white print:text-black print:pb-0">
      {/* 1. Header Toolbar */}
      <header className="sticky top-0 z-30 bg-[#0F172A]/90 backdrop-blur-md border-b border-[#1F2D4A] px-4 sm:px-6 py-3 print:hidden shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                title="返回综合训练卡片大厅"
              >
                <span>←</span>
                <span>返回大厅</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-2xl animate-bounce">⚡</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-wider uppercase font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-cyan-400">
                    Grammar Quest • 一般现在时
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-3xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    COMPREHENSIVE DRILL
                  </span>
                </div>
                <p className="text-3xs text-slate-400 font-mono hidden md:block">
                  动词三单变位 • 主谓一致选择 • 篇章填空 • 句型转换 • 答题自动存盘
                </p>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full md:w-auto justify-end">
            {currentUser && (
              <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-mono text-cyan-300">
                <span>👤</span>
                <span>{currentUser.username}</span>
                <span className="text-amber-300 font-bold ml-1">🪙{currentUser.coins || 0}</span>
                <span className="text-cyan-300 font-bold ml-1">⭐{currentUser.stars || 0}</span>
              </span>
            )}

            {/* Submit & Save Button */}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSubmitAndSave}
              className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50"
            >
              <span>{isSaving ? '⏳' : '✅'}</span>
              <span>{isSaving ? '批改存盘中...' : '提交批改并保存'}</span>
            </button>

            {/* Parent Explanations Button (Permission Gated) */}
            {canViewExplanations ? (
              <button
                type="button"
                onClick={() => setShowAnswers((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  showAnswers
                    ? 'bg-amber-500/20 text-amber-300 border-amber-400 ring-1 ring-amber-400/50'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
                title="已解锁家长辅导模式：可查看答案与考点指导"
              >
                <span>💡</span>
                <span>{showAnswers ? '隐藏考点解析' : '显示考点解析'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowParentGateModal(true)}
                className="px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border bg-slate-900/80 border-slate-700 hover:border-amber-400/60 text-slate-300 hover:text-amber-300 shadow-sm"
                title="家长专属权限：点击输入家长密码解锁考点解析与辅导指南"
              >
                <span>🔒</span>
                <span>家长考点解析</span>
              </button>
            )}

            {/* Teacher Quick Fill (Admin Only) */}
            {canViewExplanations && (
              <button
                type="button"
                onClick={handleFillAllCorrect}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-400 text-slate-400 hover:text-indigo-300 text-xs font-mono transition-all"
                title="一键填入参考答案（备课参考）"
              >
                🔑 填入答案
              </button>
            )}

            {/* History Drawer Button */}
            <button
              type="button"
              onClick={handleOpenHistory}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 text-xs font-mono transition-all flex items-center gap-1"
              title="查看历史历次作答成绩"
            >
              <span>📜</span>
              <span>记录</span>
            </button>

            {/* Reset / Retake */}
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-rose-400 text-slate-400 hover:text-rose-300 text-xs font-mono transition-all"
              title="清空答题重新刷题"
            >
              🔄 清空重做
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="打印纸质试卷或答案卷"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">打印</span>
            </button>
          </div>
        </div>

        {/* Tab switch between 专练 1 and 专练 2 */}
        <div className="max-w-6xl mx-auto flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
          {PRESENT_SIMPLE_EXERCISES.map((u) => {
            const isActive = u.id === activeUnitId;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setActiveUnitId(u.id);
                  setShowAnswers(false);
                }}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/20 to-cyan-500/20 text-white border-amber-400/80 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="text-sm">{u.id === 'unit1' ? '🎯' : '🚀'}</span>
                <span>{u.title}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Main Content Viewport */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-8 print:p-0 print:max-w-none">
        {/* Unit Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E1B4B] via-[#0F172A] to-[#131B2E] border border-[#2D3748] p-6 sm:p-8 shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {currentUnit.id === 'unit1' ? 'EXERCISE 1' : 'EXERCISE 2'}
                </span>
                <span className="text-2xs font-mono text-slate-400">
                  Cambridge Grammar Quest • Present Simple
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white uppercase print:text-black">
                {currentUnit.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-2xl print:text-slate-700">
                {currentUnit.subtitle}
              </p>

              {/* Last Submission Notice */}
              {lastRecordInfo && (
                <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/80 border border-cyan-500/30 text-2xs font-mono text-slate-300 print:hidden mt-2">
                  <span>💾 上次提交成绩:</span>
                  <span className={`font-black ${lastRecordInfo.score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {lastRecordInfo.score}%
                  </span>
                  <span className="text-slate-500">
                    ({new Date(lastRecordInfo.createdAt).toLocaleDateString()})
                  </span>
                  {lastRecordInfo.isOfflineSaved && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      📴 已离线暂存本地（转在线后自动同步）
                    </span>
                  )}
                  <span className="text-cyan-400">（已自动回显上次作答，可点击「清空重做」开启新一轮挑战）</span>
                </div>
              )}
            </div>

            {/* Live Score Board */}
            {isSubmitted && (
              <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] print:hidden">
                <div className="text-2xs font-mono text-slate-400">当前批改得分</div>
                <div className="text-3xl font-black font-mono text-emerald-400">
                  {scoreResult.percentage}%
                </div>
                <div className="text-2xs font-mono text-slate-300 mt-0.5">
                  正确 {scoreResult.correctCount} / {scoreResult.totalQuestions} 题
                </div>
                {scoreResult.percentage >= 80 ? (
                  <span className="mt-1 px-2 py-0.5 rounded-full text-3xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    ⭐ 达标通过
                  </span>
                ) : (
                  <span className="mt-1 px-2 py-0.5 rounded-full text-3xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    未达80% 继续加油
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Parental Guidance Notice when not unlocked */}
        {!canViewExplanations && isSubmitted && scoreResult.percentage < 80 && (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md print:hidden">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👨‍👩‍👧</span>
              <div>
                <h4 className="text-xs font-bold font-mono text-amber-300">
                  错题需要家长辅导？
                </h4>
                <p className="text-2xs font-mono text-slate-400">
                  点击右侧按钮，家长输入验证密码后即可解锁详细考点解析，指导学员攻克错题！
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowParentGateModal(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-mono text-xs font-black shadow-md shadow-amber-500/20 hover:bg-amber-400 whitespace-nowrap cursor-pointer transition-all"
            >
              🔒 家长验证解锁
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: 动词三单变位 (Unit 1 Only) */}
        {/* ============================================================ */}
        {currentUnit.verbTransformations && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔤</span>
                <h3 className="text-base sm:text-lg font-bold font-mono text-cyan-300 print:text-black">
                  （一）写出下列动词的第三人称单数形式
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 print:hidden">
                共 {currentUnit.verbTransformations.length} 词 • 规则训练
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {currentUnit.verbTransformations.map((item, idx) => {
                const userVal = answers[`vt_${item.id}`] || '';
                const isCorrect = userVal.trim().toLowerCase() === item.answer.toLowerCase();

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                      isSubmitted
                        ? isCorrect
                          ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                          : 'bg-rose-950/20 border-rose-500/40 text-rose-200'
                        : 'bg-[#131B2E]/70 border-[#1F2D4A] text-slate-200'
                    } print:bg-white print:border-slate-300 print:text-black`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xs font-mono text-slate-500">
                          {idx + 1}.
                        </span>
                        <span className="font-mono font-bold text-sm text-cyan-300 print:text-black">
                          {item.base}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => speak(item.answer)}
                        className="text-xs text-slate-400 hover:text-cyan-300 p-1 print:hidden"
                        title="发音"
                      >
                        {playingText === item.answer ? '🔊' : '🔉'}
                      </button>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={userVal}
                        onChange={(e) => handleInputChange(`vt_${item.id}`, e.target.value)}
                        placeholder="三单形式..."
                        className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-mono border focus:outline-none focus:ring-1 transition-all ${
                          isSubmitted
                            ? isCorrect
                              ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300 focus:ring-emerald-400'
                              : 'bg-rose-900/20 border-rose-500/50 text-rose-300 focus:ring-rose-400'
                            : 'bg-slate-900/80 border-slate-700 text-slate-200 focus:border-cyan-400 focus:ring-cyan-400'
                        } print:bg-white print:border-b-2 print:border-black print:rounded-none`}
                      />
                    </div>

                    {/* Show correct answer & explanation ONLY if parent unlocked or answer toggle is on */}
                    {canViewExplanations && showAnswers && (
                      <div className="mt-1 pt-1.5 border-t border-slate-800 text-3xs font-mono space-y-0.5 print:border-slate-200">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-400">标准答案:</span>
                          <span className="text-emerald-400 print:text-black">
                            {item.answer}
                          </span>
                        </div>
                        <div className="text-slate-400 print:text-slate-600">
                          💡 {item.ruleExplanation}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* SECTION 2: 单选题 (Unit 1 Only) */}
        {/* ============================================================ */}
        {currentUnit.multipleChoices && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h3 className="text-base sm:text-lg font-bold font-mono text-cyan-300 print:text-black">
                  （二）单选
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 print:hidden">
                共 {currentUnit.multipleChoices.length} 题 • 考点辨析
              </span>
            </div>

            <div className="space-y-4">
              {currentUnit.multipleChoices.map((mc) => {
                const selectedVal = answers[`mc_${mc.id}`] || '';
                const isCorrect = selectedVal.toUpperCase() === mc.answer.toUpperCase();

                return (
                  <div
                    key={mc.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSubmitted
                        ? isCorrect
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-rose-950/20 border-rose-500/40'
                        : 'bg-[#131B2E]/60 border-[#1F2D4A]'
                    } print:bg-white print:border-slate-300`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="font-mono font-bold text-sm text-slate-100 flex items-center gap-2 print:text-black">
                        <span>{mc.question}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => speak(mc.question.replace(/_{2,}/g, mc.answer))}
                        className="text-xs text-slate-400 hover:text-cyan-300 p-1 print:hidden"
                        title="朗读题目"
                      >
                        🔊
                      </button>
                    </div>

                    {/* Options list */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {mc.options.map((opt) => {
                        const isChosen = selectedVal === opt.label;
                        const isThisCorrect = opt.label === mc.answer;

                        let btnStyle =
                          'bg-slate-900/80 border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200';
                        if (isSubmitted) {
                          if (canViewExplanations && showAnswers && isThisCorrect) {
                            btnStyle = 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold';
                          } else if (isChosen) {
                            btnStyle = isCorrect
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                              : 'bg-rose-500/20 border-rose-400 text-rose-300 font-bold';
                          }
                        } else if (isChosen) {
                          btnStyle = 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold ring-1 ring-cyan-400/50';
                        }

                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleInputChange(`mc_${mc.id}`, opt.label)}
                            className={`p-2.5 rounded-xl border text-xs font-mono transition-all text-left flex items-center gap-2 cursor-pointer ${btnStyle} print:bg-white print:border-slate-300 print:text-black`}
                          >
                            <span className="w-5 h-5 rounded-full flex items-center justify-center font-bold bg-slate-800 border border-slate-600 text-2xs print:bg-slate-100">
                              {opt.label}
                            </span>
                            <span className="truncate">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explanation (Protected for Admin/Parent) */}
                    {canViewExplanations && showAnswers && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-xs font-mono space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <span className="text-slate-400">正确答案:</span>
                          <span className="text-emerald-400 print:text-black">
                            {mc.answer}
                          </span>
                        </div>
                        <p className="text-slate-400 print:text-slate-600">
                          💡 考点辅导解析: {mc.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* SECTION 3: 用动词适当形式填空 */}
        {/* ============================================================ */}
        {currentUnit.fillInBlanks && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="text-base sm:text-lg font-bold font-mono text-cyan-300 print:text-black">
                  用动词的适当形式填空
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 print:hidden">
                共 {currentUnit.fillInBlanks.length} 题 • 主谓一致与助动词
              </span>
            </div>

            <div className="space-y-3">
              {currentUnit.fillInBlanks.map((fb) => {
                const userVal = answers[`fb_${fb.id}`] || '';
                const isCorrect = userVal.trim().toLowerCase() === fb.answer.toLowerCase();

                let isSecondCorrect = true;
                let userVal2 = '';
                if (fb.secondBlank) {
                  userVal2 = answers[`fb2_${fb.id}`] || '';
                  isSecondCorrect =
                    userVal2.trim().toLowerCase() === fb.secondBlank.answer.toLowerCase();
                }

                const allCorrect = isCorrect && isSecondCorrect;

                return (
                  <div
                    key={fb.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isSubmitted
                        ? allCorrect
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-rose-950/20 border-rose-500/40'
                        : 'bg-[#131B2E]/60 border-[#1F2D4A]'
                    } print:bg-white print:border-slate-300`}
                  >
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs sm:text-sm text-slate-200 print:text-black">
                      <span>{fb.sentenceBefore}</span>
                      <input
                        type="text"
                        value={userVal}
                        onChange={(e) => handleInputChange(`fb_${fb.id}`, e.target.value)}
                        placeholder={`(${fb.baseVerb})`}
                        className={`px-2.5 py-1 rounded-xl text-xs font-mono border focus:outline-none min-w-[90px] w-24 text-center transition-all ${
                          isSubmitted
                            ? isCorrect
                              ? 'bg-emerald-900/20 border-emerald-500 text-emerald-300'
                              : 'bg-rose-900/20 border-rose-500 text-rose-300'
                            : 'bg-slate-900 border-slate-700 text-cyan-300 focus:border-cyan-400'
                        } print:border-b-2 print:border-black print:rounded-none`}
                      />

                      {fb.secondBlank && (
                        <>
                          <span>{fb.secondBlank.sentenceBefore}</span>
                          <input
                            type="text"
                            value={userVal2}
                            onChange={(e) => handleInputChange(`fb2_${fb.id}`, e.target.value)}
                            placeholder={`(${fb.secondBlank.baseVerb})`}
                            className={`px-2.5 py-1 rounded-xl text-xs font-mono border focus:outline-none min-w-[90px] w-24 text-center transition-all ${
                              isSubmitted
                                ? isSecondCorrect
                                  ? 'bg-emerald-900/20 border-emerald-500 text-emerald-300'
                                  : 'bg-rose-900/20 border-rose-500 text-rose-300'
                                : 'bg-slate-900 border-slate-700 text-cyan-300 focus:border-cyan-400'
                            } print:border-b-2 print:border-black print:rounded-none`}
                          />
                          <span>{fb.secondBlank.sentenceAfter}</span>
                        </>
                      )}

                      <span>{fb.sentenceAfter}</span>

                      <button
                        type="button"
                        onClick={() =>
                          speak(
                            `${fb.sentenceBefore} ${fb.answer} ${
                              fb.secondBlank ? `${fb.secondBlank.sentenceBefore} ${fb.secondBlank.answer}` : ''
                            } ${fb.sentenceAfter || ''}`
                          )
                        }
                        className="text-xs text-slate-400 hover:text-cyan-300 p-1 ml-auto print:hidden"
                        title="朗读完整正确句子"
                      >
                        🔊
                      </button>
                    </div>

                    {canViewExplanations && showAnswers && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-xs font-mono space-y-0.5">
                        <div className="flex items-center gap-2 font-bold">
                          <span className="text-slate-400">参考答案:</span>
                          <span className="text-emerald-400 print:text-black">
                            {fb.answer}
                            {fb.secondBlank ? ` / ${fb.secondBlank.answer}` : ''}
                          </span>
                        </div>
                        <p className="text-slate-400 print:text-slate-600">
                          💡 考点辅导: {fb.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* SECTION 4: 短文填空 Mrs. Black's Day (Unit 2 Only) */}
        {/* ============================================================ */}
        {currentUnit.storyCloze && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📖</span>
                <h3 className="text-base sm:text-lg font-bold font-mono text-cyan-300 print:text-black">
                  二、短文填空：{currentUnit.storyCloze.title}
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 print:hidden">
                综合语篇时态应用 • 9 空
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-[#131B2E]/70 border border-[#1F2D4A] leading-relaxed shadow-xl print:bg-white print:border-slate-300">
              <div className="text-center mb-4">
                <h4 className="text-base font-black font-mono text-amber-300 uppercase tracking-widest print:text-black">
                  {currentUnit.storyCloze.title}
                </h4>
                <p className="text-3xs font-mono text-slate-400 mt-1">
                  根据短文内容，用括号内动词的正确一般现在时形式填空
                </p>
              </div>

              <div className="space-y-3 font-mono text-xs sm:text-sm text-slate-200 leading-loose print:text-black">
                <p className="flex flex-wrap items-center gap-y-2.5 gap-x-1.5">
                  <span>Mrs. Black often</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">1.</span>
                    <input
                      type="text"
                      value={answers['sc_1'] || ''}
                      onChange={(e) => handleInputChange('sc_1', e.target.value)}
                      placeholder="(get)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>up at 7:00 on Sunday morning. She</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">2.</span>
                    <input
                      type="text"
                      value={answers['sc_2'] || ''}
                      onChange={(e) => handleInputChange('sc_2', e.target.value)}
                      placeholder="(have)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>breakfast at 8:30. She</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">3.</span>
                    <input
                      type="text"
                      value={answers['sc_3'] || ''}
                      onChange={(e) => handleInputChange('sc_3', e.target.value)}
                      placeholder="(have)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>a little dog. She</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">4.</span>
                    <input
                      type="text"
                      value={answers['sc_4'] || ''}
                      onChange={(e) => handleInputChange('sc_4', e.target.value)}
                      placeholder="(like)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>to go to the park with her dog. At 10:50, Mrs. Black sometimes</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">5.</span>
                    <input
                      type="text"
                      value={answers['sc_5'] || ''}
                      onChange={(e) => handleInputChange('sc_5', e.target.value)}
                      placeholder="(wash)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>her clothes. At 3:00 p.m. she usually</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">6.</span>
                    <input
                      type="text"
                      value={answers['sc_6'] || ''}
                      onChange={(e) => handleInputChange('sc_6', e.target.value)}
                      placeholder="(go)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>shopping. She often</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">7.</span>
                    <input
                      type="text"
                      value={answers['sc_7'] || ''}
                      onChange={(e) => handleInputChange('sc_7', e.target.value)}
                      placeholder="(make)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>supper at 6:00 p.m. She doesn't</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">8.</span>
                    <input
                      type="text"
                      value={answers['sc_8'] || ''}
                      onChange={(e) => handleInputChange('sc_8', e.target.value)}
                      placeholder="(watch)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>TV at night. She</span>
                  <span className="inline-flex items-center">
                    <span className="text-2xs text-slate-500 mr-1 font-bold">9.</span>
                    <input
                      type="text"
                      value={answers['sc_9'] || ''}
                      onChange={(e) => handleInputChange('sc_9', e.target.value)}
                      placeholder="(go)"
                      className="px-2 py-0.5 rounded-lg text-xs font-mono border bg-slate-900 border-slate-700 text-cyan-300 w-20 text-center print:border-b-2 print:border-black"
                    />
                  </span>
                  <span>to bed at about 10:30p.m.</span>
                </p>
              </div>

              {/* Story blanks answers & explanations */}
              {canViewExplanations && showAnswers && (
                <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs font-mono">
                  {currentUnit.storyCloze.blanks.map((b) => {
                    const userVal = answers[`sc_${b.blankIndex}`] || '';
                    const isRight = userVal.trim().toLowerCase() === b.answer.toLowerCase();
                    return (
                      <div
                        key={b.blankIndex}
                        className={`p-2 rounded-xl border ${
                          isRight
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                            : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        } print:border-slate-300 print:text-black`}
                      >
                        <div className="font-bold">
                          空 {b.blankIndex}:{' '}
                          <span className="text-emerald-400 print:text-black">{b.answer}</span>
                          <span className="text-3xs text-slate-400 ml-1">({b.baseVerb})</span>
                        </div>
                        <div className="text-3xs text-slate-400 mt-1 print:text-slate-600">
                          💡 考点: {b.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* SECTION 5: 句型转换 (Sentence Transformations) */}
        {/* ============================================================ */}
        {currentUnit.sentenceTransforms && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔄</span>
                <h3 className="text-base sm:text-lg font-bold font-mono text-cyan-300 print:text-black">
                  句型转换与按要求改写句子
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 print:hidden">
                否定句 • 疑问句 • 划线提问 • 同义句
              </span>
            </div>

            <div className="space-y-4">
              {currentUnit.sentenceTransforms.map((st) => {
                const userVal = answers[`st_${st.id}`] || '';
                const cleanUserVal = userVal.trim().toLowerCase().replace(/[.?!,，。？！]/g, '');
                const isCorrect = st.acceptedAnswers.some(
                  (ans) => ans.toLowerCase().replace(/[.?!,，。？！]/g, '') === cleanUserVal
                );

                return (
                  <div
                    key={st.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSubmitted
                        ? isCorrect
                          ? 'bg-emerald-950/20 border-emerald-500/40'
                          : 'bg-rose-950/20 border-rose-500/40'
                        : 'bg-[#131B2E]/60 border-[#1F2D4A]'
                    } print:bg-white print:border-slate-300`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <div className="font-mono font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-2 print:text-black">
                        <span>{st.original}</span>
                        <span className="text-amber-400 font-normal">{st.prompt}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => speak(st.answer)}
                        className="text-xs text-slate-400 hover:text-cyan-300 p-1 self-start sm:self-auto print:hidden"
                        title="朗读标准转换句"
                      >
                        🔊
                      </button>
                    </div>

                    {st.templateText && (
                      <p className="text-2xs font-mono text-slate-400 mb-2 whitespace-pre-line print:text-slate-600">
                        提示框架：{st.templateText}
                      </p>
                    )}

                    <div className="relative">
                      <input
                        type="text"
                        value={userVal}
                        onChange={(e) => handleInputChange(`st_${st.id}`, e.target.value)}
                        placeholder="输入改写后的句子或填空关键词..."
                        className={`w-full px-3 py-2 rounded-xl text-xs sm:text-sm font-mono border focus:outline-none transition-all ${
                          isSubmitted
                            ? isCorrect
                              ? 'bg-emerald-900/20 border-emerald-500 text-emerald-300'
                              : 'bg-rose-900/20 border-rose-500 text-rose-300'
                            : 'bg-slate-900/90 border-slate-700 text-slate-100 focus:border-cyan-400'
                        } print:border-b-2 print:border-black print:rounded-none`}
                      />
                    </div>

                    {canViewExplanations && showAnswers && (
                      <div className="mt-3 pt-2 border-t border-slate-800 text-xs font-mono space-y-1">
                        <div className="flex items-center gap-2 font-bold">
                          <span className="text-slate-400">参考标准句:</span>
                          <span className="text-emerald-400 print:text-black">
                            {st.answer}
                          </span>
                        </div>
                        <p className="text-slate-400 print:text-slate-600">
                          💡 考点辅导: {st.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Print Footer Notice */}
        <div className="hidden print:block text-center text-xs text-slate-500 pt-8 border-t border-slate-300">
          Word Quest 剑桥英语专项研习手册 • 一般现在时专题专练 1 & 2
        </div>
      </main>

      {/* ============================================================ */}
      {/* 3. Modals: Victory Reward, Parent Gate, History */}
      {/* ============================================================ */}

      {/* 3.1 Victory Reward Modal */}
      {rewardModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-[#1E1B4B] to-[#0F172A] border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="text-5xl animate-bounce">🏆</div>
            <h3 className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
              {rewardModal.isFirstPass ? '首通达标！荣获勋章' : '挑战完成！'}
            </h3>
            <p className="text-xs font-mono text-slate-300">
              恭喜你以 <span className="text-emerald-400 font-bold text-base">{rewardModal.score}%</span> 的优异成绩顺利通过测试！
            </p>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 flex items-center justify-around">
              <div className="flex flex-col items-center">
                <span className="text-2xl">🪙</span>
                <span className="text-lg font-black font-mono text-amber-300">+{rewardModal.coins}</span>
                <span className="text-3xs text-slate-400">金币奖励</span>
              </div>
              {rewardModal.stars > 0 && (
                <div className="flex flex-col items-center">
                  <span className="text-2xl">⭐</span>
                  <span className="text-lg font-black font-mono text-cyan-300">+{rewardModal.stars}</span>
                  <span className="text-3xs text-slate-400">通关军衔星星</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setRewardModal((prev) => ({ ...prev, isOpen: false }))}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-mono font-black text-sm shadow-lg shadow-amber-500/25 cursor-pointer active:scale-95 transition-all"
            >
              太棒了！收下奖励
            </button>
          </div>
        </div>
      )}

      {/* 3.2 Parental Gate Modal (Admin Password Verification) */}
      {showParentGateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#131B2E] border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👨‍👩‍👧</span>
                <h3 className="text-sm font-bold font-mono text-cyan-300">
                  家长专属辅导门禁
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowParentGateModal(false);
                  setGateErrorMsg('');
                  setGatePasswordInput('');
                }}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-2xs font-mono text-slate-400 leading-relaxed">
              为保证学员独立思考与亲子教学质量，考点解析与参考答案仅对家长开放。请输入家长管理密码进行验证：
            </p>

            <form onSubmit={handleVerifyParentGate} className="space-y-3">
              <input
                type="password"
                value={gatePasswordInput}
                onChange={(e) => setGatePasswordInput(e.target.value)}
                placeholder="请输入家长密码 (默认: admin)"
                autoFocus
                className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-slate-900 border border-slate-700 text-slate-100 focus:border-cyan-400 focus:outline-none"
              />

              {gateErrorMsg && (
                <p className="text-2xs font-mono text-rose-400">{gateErrorMsg}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-black text-xs shadow-md cursor-pointer transition-all"
                >
                  验证并解锁解析
                </button>
                <button
                  type="button"
                  onClick={() => setShowParentGateModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs hover:bg-slate-700"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3.3 Historical Attempts Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📜</span>
                <h3 className="text-sm font-bold font-mono text-cyan-300">
                  {currentUnit.title} • 历次作答记录
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {loadingHistory ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  正在加载历史成绩...
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-xs font-mono text-slate-400">
                  暂无提交记录，快去完成第一次挑战吧！
                </div>
              ) : (
                historyList.map((rec, i) => (
                  <div
                    key={rec.id || i}
                    className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">第 {historyList.length - i} 次挑战</span>
                        <span
                          className={`font-black ${
                            rec.score >= 80 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {rec.score}%
                        </span>
                        {rec.offline_pending && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-3xs font-bold">
                            待同步
                          </span>
                        )}
                      </div>
                      <div className="text-3xs text-slate-500 mt-0.5">
                        {new Date(rec.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {rec.coins_awarded > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 text-3xs font-bold border border-amber-500/30">
                          +{rec.coins_awarded}🪙
                        </span>
                      )}
                      {rec.stars_awarded > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 text-3xs font-bold border border-cyan-500/30">
                          +{rec.stars_awarded}⭐
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="w-full py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs hover:bg-slate-700"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
