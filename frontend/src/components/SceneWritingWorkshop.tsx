import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  SCENE_WRITING_TOPICS,
  SceneWritingId,
  SceneWritingTopic,
} from '../data/sceneWritingData';
import {
  SceneWritingDraft,
  checkSceneWriting,
  composeEssayFromDraft,
} from '../utils/sceneWritingChecker';
import { SceneWritingIllustration } from './SceneWritingIllustration';
import { apiService } from '../utils/apiService';

interface SceneWritingWorkshopProps {
  currentUser?: {
    id: number;
    username: string;
    coins: number;
    stars?: number;
    avatar?: string;
    is_admin?: number;
  } | null;
  initialSceneId?: SceneWritingId;
  onBack?: () => void;
  onUpdateUser?: (updatedUser: Record<string, unknown>) => void;
}

const EMPTY_DRAFT: SceneWritingDraft = {
  title: '',
  beginning: '',
  bodyLocation: '',
  bodyActions: '',
  bodyDetails: '',
  ending: '',
  finalEssay: '',
};

export const SceneWritingWorkshop: React.FC<SceneWritingWorkshopProps> = ({
  currentUser,
  initialSceneId = 'sw_park',
  onBack,
  onUpdateUser,
}) => {
  const [activeSceneId, setActiveSceneId] = useState<SceneWritingId>(initialSceneId);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SceneWritingDraft>(EMPTY_DRAFT);
  const [hasManualFinalEdit, setHasManualFinalEdit] = useState<boolean>(false);
  const [playingText, setPlayingText] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [showModelEssay, setShowModelEssay] = useState<boolean>(false);

  const [lastRecordInfo, setLastRecordInfo] = useState<{
    score: number;
    createdAt: string;
    coinsAwarded: number;
    starsAwarded: number;
    isOfflineSaved?: boolean;
  } | null>(null);

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

  const currentScene: SceneWritingTopic = useMemo(() => {
    return (
      SCENE_WRITING_TOPICS.find((t) => t.quizId === activeSceneId) ||
      SCENE_WRITING_TOPICS[0]
    );
  }, [activeSceneId]);

  const selectedHotspot = useMemo(() => {
    if (!selectedHotspotId) return currentScene.hotspots[0] || null;
    return (
      currentScene.hotspots.find((h) => h.id === selectedHotspotId) ||
      currentScene.hotspots[0] ||
      null
    );
  }, [currentScene, selectedHotspotId]);

  const storageKey = useMemo(
    () => `wordquest_scene_writing_${currentUser?.id || 'guest'}_${activeSceneId}`,
    [currentUser?.id, activeSceneId]
  );

  // Load saved record or local draft when scene changes
  useEffect(() => {
    let cancelled = false;
    setSelectedHotspotId(currentScene.hotspots[0]?.id || null);
    setShowModelEssay(false);

    const loadSceneState = async () => {
      // 1. Check server / offline cache progress first
      if (currentUser?.id) {
        try {
          const summary = await apiService.getGrammarProgress(currentUser.id);
          const rec = summary[activeSceneId];
          if (!cancelled && rec?.latestRecord) {
            const ua = rec.latestRecord.userAnswers || {};
            const restored: SceneWritingDraft = {
              title: ua.title || '',
              beginning: ua.beginning || '',
              bodyLocation: ua.bodyLocation || '',
              bodyActions: ua.bodyActions || '',
              bodyDetails: ua.bodyDetails || '',
              ending: ua.ending || '',
              finalEssay: ua.finalEssay || '',
            };
            setDraft(restored);
            setHasManualFinalEdit(Boolean(ua.finalEssay));
            setHasSubmitted(true);
            setLastRecordInfo({
              score: rec.latestRecord.score,
              createdAt: rec.latestRecord.createdAt,
              coinsAwarded: rec.latestRecord.coinsAwarded,
              starsAwarded: rec.latestRecord.starsAwarded,
            });
            return;
          }
        } catch (err) {
          console.warn('Failed to load scene writing progress:', err);
        }
      }

      if (cancelled) return;
      setHasSubmitted(false);
      setLastRecordInfo(null);

      // 2. Fallback to localStorage draft
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SceneWritingDraft>;
          setDraft({ ...EMPTY_DRAFT, ...parsed });
          setHasManualFinalEdit(Boolean(parsed.finalEssay));
          return;
        }
      } catch {
        // ignore storage errors
      }
      setDraft(EMPTY_DRAFT);
      setHasManualFinalEdit(false);
    };

    loadSceneState();
    return () => {
      cancelled = true;
    };
  }, [activeSceneId, currentUser?.id, currentScene.hotspots, storageKey]);

  // Persist local draft automatically
  useEffect(() => {
    try {
      const hasAnyContent = Object.values(draft).some((v) => v.trim().length > 0);
      if (hasAnyContent) {
        localStorage.setItem(storageKey, JSON.stringify(draft));
      }
    } catch {
      // ignore quota errors
    }
  }, [draft, storageKey]);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'en-US';
    utterance.rate = 0.88;
    utterance.pitch = 1.03;

    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en-') && !v.name.includes('Google'));
    if (enVoice) utterance.voice = enVoice;

    setPlayingText(text);
    utterance.onend = () => setPlayingText(null);
    utterance.onerror = () => setPlayingText(null);
    window.speechSynthesis.speak(utterance);
  }, []);

  const updateField = (field: keyof SceneWritingDraft, value: string) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value };
      if (field !== 'finalEssay' && !hasManualFinalEdit) {
        next.finalEssay = composeEssayFromDraft(next);
      }
      return next;
    });
  };

  const handleComposeFinal = () => {
    const composed = composeEssayFromDraft(draft);
    setDraft((prev) => ({ ...prev, finalEssay: composed }));
    setHasManualFinalEdit(false);
  };

  const handleClearDraft = () => {
    if (!window.confirm('确定要清空当前场景的作文草稿重新写作吗？（已提交的历史记录会保留）')) {
      return;
    }
    setDraft(EMPTY_DRAFT);
    setHasManualFinalEdit(false);
    setHasSubmitted(false);
    setShowModelEssay(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const checkResult = useMemo(() => checkSceneWriting(draft), [draft]);

  const handleSubmit = async () => {
    const finalText = draft.finalEssay.trim() || composeEssayFromDraft(draft);
    if (!finalText) {
      alert('请先写出作文内容再提交哦！');
      return;
    }

    const submissionDraft: SceneWritingDraft = { ...draft, finalEssay: finalText };
    const evalResult = checkSceneWriting(submissionDraft);

    setDraft(submissionDraft);
    setHasSubmitted(true);

    if (!currentUser?.id) {
      alert('请先登录学员账号，以便保存你的作文与通关奖励！');
      return;
    }

    setIsSaving(true);
    try {
      const result = await apiService.submitGrammarQuiz({
        userId: currentUser.id,
        category: 'scene_writing',
        quizId: activeSceneId,
        score: evalResult.score,
        totalQuestions: evalResult.totalChecks,
        correctCount: evalResult.passedCount,
        userAnswers: {
          title: submissionDraft.title,
          beginning: submissionDraft.beginning,
          bodyLocation: submissionDraft.bodyLocation,
          bodyActions: submissionDraft.bodyActions,
          bodyDetails: submissionDraft.bodyDetails,
          ending: submissionDraft.ending,
          finalEssay: submissionDraft.finalEssay,
        },
        wrongDetails: evalResult.issues,
      });

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

      if (evalResult.allPassed) {
        setRewardModal({
          isOpen: true,
          score: result.score,
          coins: result.coinsAwarded,
          stars: result.starsAwarded,
          isFirstPass: result.isFirstPass,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '未知错误';
      console.error('Failed to submit scene writing:', err);
      alert('保存作文失败，请检查网络连接：' + msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-fuchsia-500/30 selection:text-fuchsia-200 pb-20 print:bg-white print:text-black print:pb-0">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#0F172A]/95 backdrop-blur-md border-b border-[#1F2D4A] px-4 sm:px-6 py-3 print:hidden shadow-lg">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer"
              >
                ◀ 返回
              </button>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-rose-300 to-cyan-400">
                ✍️ 场景描写写作工坊 (Describe a Scene)
              </h1>
              <p className="text-3xs font-mono text-slate-400 hidden sm:block">
                Unit 8 写作专项 • 看图观察 → 搭框架 → 成文朗读 → 三大要素自检
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearDraft}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-bold cursor-pointer"
            >
              🗑️ 清空重写
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 font-mono text-xs font-bold cursor-pointer"
            >
              🖨️ 打印
            </button>
          </div>
        </div>

        {/* Scene Selector Tabs */}
        <div className="max-w-6xl mx-auto flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80 overflow-x-auto no-scrollbar">
          {SCENE_WRITING_TOPICS.map((topic) => {
            const isActive = topic.quizId === activeSceneId;
            return (
              <button
                key={topic.quizId}
                type="button"
                onClick={() => setActiveSceneId(topic.quizId)}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-2 whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-gradient-to-r from-fuchsia-500/20 to-cyan-500/20 text-white border-fuchsia-400/80 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{topic.icon}</span>
                <span>
                  {topic.zhTitle} ({topic.title})
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-6 print:p-0 print:max-w-none">
        {/* Status / Last Submission Banner */}
        {lastRecordInfo && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 text-xs font-mono text-slate-300 print:hidden">
            <div className="flex items-center gap-2 flex-wrap">
              <span>💾 已保存上次提交：</span>
              <span className={lastRecordInfo.score >= 80 ? 'text-emerald-400 font-black' : 'text-amber-400 font-black'}>
                {lastRecordInfo.score >= 80 ? '全部达标 🏆' : `自检 ${lastRecordInfo.score}%`}
              </span>
              <span className="text-slate-500">
                ({new Date(lastRecordInfo.createdAt).toLocaleDateString()})
              </span>
              {lastRecordInfo.isOfflineSaved && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-3xs font-bold">
                  📴 已离线暂存（联网后自动同步）
                </span>
              )}
            </div>
            <span className="text-3xs text-slate-400">
              三项要素+结构+字数(≥40词)全过且无语法错，首次获 +50 🪙 +1 ⭐
            </span>
          </div>
        )}

        {/* ================= STEP 0: 观察场景大图 ================= */}
        <section className="bg-[#131B2E] border border-[#1F2D4A] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 print:bg-white print:border-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black font-mono text-cyan-300 print:text-black">
                Step 0 · 观察场景大图：{currentScene.title} ({currentScene.zhTitle})
              </h2>
              <p className="text-2xs font-mono text-slate-400 mt-0.5">
                点击画面中的带圈人物，查看他们的动作、穿着与位置素材（点击仅提示与朗读，需要自己写出完整句子哦）
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl text-3xs font-mono font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
              {currentScene.hotspots.length} 组可点击人物
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2">
              <SceneWritingIllustration
                sceneId={activeSceneId}
                selectedHotspotId={selectedHotspot?.id || null}
                onSelectHotspot={setSelectedHotspotId}
              />
            </div>

            {/* Hotspot Material Card */}
            <div className="bg-[#0B101B] border border-cyan-500/30 rounded-2xl p-4 space-y-3 print:hidden">
              <div className="flex flex-wrap gap-1.5">
                {currentScene.hotspots.map((hs, idx) => (
                  <button
                    key={hs.id}
                    type="button"
                    onClick={() => setSelectedHotspotId(hs.id)}
                    className={`px-2 py-1 rounded-lg text-3xs font-mono font-bold cursor-pointer border transition-all ${
                      selectedHotspot?.id === hs.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {idx + 1}. {hs.zhLabel}
                  </button>
                ))}
              </div>

              {selectedHotspot && (
                <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300">🔍 人物观察卡</span>
                    <button
                      type="button"
                      onClick={() => speak(selectedHotspot.hintSentence)}
                      className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 text-3xs cursor-pointer"
                    >
                      {playingText === selectedHotspot.hintSentence ? '🔊 朗读中' : '🔉 听参考句'}
                    </button>
                  </div>
                  <div className="space-y-1.5 text-2xs">
                    <p className="text-slate-300">
                      <span className="text-slate-500">👤 人物主语：</span>
                      <span className="text-cyan-300 font-bold">{selectedHotspot.subject}</span>
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">⚡ 正在做什么：</span>
                      <span className="text-emerald-300 font-bold">{selectedHotspot.action}</span>
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">👕 穿着服饰：</span>
                      <span className="text-fuchsia-300 font-bold">{selectedHotspot.clothes}</span>
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-500">📍 所在方位：</span>
                      <span className="text-amber-300 font-bold">{selectedHotspot.position}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Click-to-Pronounce Word Bank (Hints only, no auto-insert) */}
          <div className="bg-[#0B101B] border border-slate-800 rounded-2xl p-4 space-y-2.5 print:hidden">
            <div className="text-2xs font-mono text-slate-400 font-bold">
              💡 词汇提示板（点击任意词组只听发音与核对拼写，请自己思考造句）：
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-3xs font-mono">
              {[
                { label: '🌤️ 天气词', words: currentScene.wordBank.weather, color: 'text-sky-300 border-sky-500/30' },
                { label: '📍 地点方位', words: currentScene.wordBank.locations, color: 'text-amber-300 border-amber-500/30' },
                { label: '⚡ 动词 -ing', words: currentScene.wordBank.actions, color: 'text-emerald-300 border-emerald-500/30' },
                { label: '👕 服饰描述', words: currentScene.wordBank.clothes, color: 'text-fuchsia-300 border-fuchsia-500/30' },
                { label: '🎨 形容词', words: currentScene.wordBank.adjectives, color: 'text-cyan-300 border-cyan-500/30' },
                { label: '😊 感受结尾', words: currentScene.wordBank.feelings, color: 'text-rose-300 border-rose-500/30' },
              ].map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="text-slate-400 font-bold">{group.label}</div>
                  <div className="flex flex-wrap gap-1">
                    {group.words.map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => speak(w)}
                        className={`px-2 py-0.5 rounded-lg bg-slate-900 border ${group.color} hover:bg-slate-800 cursor-pointer transition-colors`}
                        title="点击聆听发音"
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= STEP 1: 按结构搭框架 ================= */}
        <section className="bg-[#131B2E] border border-[#1F2D4A] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 print:bg-white print:border-slate-300">
          <div className="border-b border-slate-800 pb-2">
            <h2 className="text-base sm:text-lg font-black font-mono text-amber-300 print:text-black">
              Step 1 · 按结构搭框架 (Title → Beginning → Body → Ending)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-slate-200">
                ① Title 标题 <span className="text-slate-400 font-normal">(首字母大写，简洁点明地点，如 {currentScene.defaultTitleExample})</span>
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => updateField('title', e.target.value)}
                placeholder={currentScene.defaultTitleExample}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-sm font-mono text-white outline-none"
              />
            </div>

            {/* Beginning */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-slate-200">
                ② Beginning 开头（天气） <span className="text-slate-400 font-normal">(例：It's a sunny day today.)</span>
              </label>
              <input
                type="text"
                value={draft.beginning}
                onChange={(e) => updateField('beginning', e.target.value)}
                placeholder="It's a fine / sunny day today."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-sm font-mono text-white outline-none"
              />
            </div>

            {/* Body Where */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-mono font-bold text-slate-200">
                ③ Body 主体（1）Where are you? 你在哪里 & 环境氛围
              </label>
              <input
                type="text"
                value={draft.bodyLocation}
                onChange={(e) => updateField('bodyLocation', e.target.value)}
                placeholder="I'm in the park. The sky is blue and the grass is green."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-sm font-mono text-white outline-none"
              />
            </div>

            {/* Body Actions */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-mono font-bold text-slate-200">
                ③ Body 主体（2）What are people doing? 人物正在做什么（至少 3 句现在进行时）
              </label>
              <textarea
                rows={3}
                value={draft.bodyActions}
                onChange={(e) => updateField('bodyActions', e.target.value)}
                placeholder="Some kids are running near the lake. A boy is riding a bike. I am flying a kite."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-sm font-mono text-white outline-none resize-y"
              />
            </div>

            {/* Body Details */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-mono font-bold text-slate-200">
                ③ Body 主体（3）加分细节：人物穿着服饰 + 形容词 + 方位介词
              </label>
              <textarea
                rows={2}
                value={draft.bodyDetails}
                onChange={(e) => updateField('bodyDetails', e.target.value)}
                placeholder="A girl is wearing a yellow T-shirt and a skirt. She is sitting under the big tree."
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-sm font-mono text-white outline-none resize-y"
              />
            </div>

            {/* Ending */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="block text-xs font-mono font-bold text-slate-200">
                ④ Ending 结尾（感受） <span className="text-slate-400 font-normal">(例：I feel very happy. I have a great time!)</span>
              </label>
              <input
                type="text"
                value={draft.ending}
                onChange={(e) => updateField('ending', e.target.value)}
                placeholder="I feel very happy and relaxed. I have a great time!"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 focus:border-cyan-400 text-sm font-mono text-white outline-none"
              />
            </div>
          </div>
        </section>

        {/* ================= STEP 2: 成文与朗读 ================= */}
        <section className="bg-[#131B2E] border border-[#1F2D4A] rounded-3xl p-5 sm:p-6 shadow-xl space-y-3 print:bg-white print:border-slate-300">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div>
              <h2 className="text-base sm:text-lg font-black font-mono text-emerald-300 print:text-black">
                Step 2 · 完整作文润色与朗读
              </h2>
              <p className="text-3xs font-mono text-slate-400">
                当前正文词数：<strong className={checkResult.wordCount >= checkResult.minWords ? 'text-emerald-400' : 'text-amber-300'}>{checkResult.wordCount} 词</strong>（目标 ≥ {checkResult.minWords} 词）
              </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={handleComposeFinal}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono font-bold text-slate-200 cursor-pointer"
              >
                🔄 从 Step 1 重新合成
              </button>
              <button
                type="button"
                onClick={() => speak(`${draft.title}. ${draft.finalEssay}`)}
                disabled={!draft.finalEssay.trim()}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-xs font-mono font-bold text-cyan-200 cursor-pointer disabled:opacity-40"
              >
                {playingText ? '🔊 朗读中...' : '🔊 全文朗读检查'}
              </button>
            </div>
          </div>

          {draft.title.trim() && (
            <div className="text-center font-mono font-black text-base text-white print:text-black">
              {draft.title}
            </div>
          )}
          <textarea
            rows={6}
            value={draft.finalEssay}
            onChange={(e) => {
              setHasManualFinalEdit(true);
              updateField('finalEssay', e.target.value);
            }}
            placeholder="Step 1 填写后会自动合成到这里，你也可以在这里直接修改润色整篇作文..."
            className="w-full px-4 py-3 rounded-2xl bg-[#0B101B] border border-slate-700 focus:border-emerald-400 text-sm font-mono text-slate-100 leading-relaxed outline-none resize-y print:bg-white print:text-black"
          />
        </section>

        {/* ================= STEP 3: 三大要素实时自检 ================= */}
        <section className="bg-[#131B2E] border border-[#1F2D4A] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <h2 className="text-base sm:text-lg font-black font-mono text-fuchsia-300">
              Step 3 · 三大要素与语法自检 ({checkResult.passedCount}/{checkResult.totalChecks})
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-2xs font-mono font-black border ${
                checkResult.allPassed
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
                  : 'bg-amber-500/20 text-amber-300 border-amber-400/50'
              }`}
            >
              {checkResult.allPassed ? '🏆 已达到高分通关标准！' : '✏️ 继续完善即可通关'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checkResult.items.map((item) => (
              <div
                key={item.key}
                className={`p-3.5 rounded-2xl border font-mono text-xs space-y-1 ${
                  item.passed
                    ? 'bg-emerald-950/25 border-emerald-500/40'
                    : 'bg-slate-900/70 border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  <span>{item.passed ? '✅' : '⚠️'}</span>
                  <span className={item.passed ? 'text-emerald-300' : 'text-amber-300'}>
                    {item.label}
                  </span>
                </div>
                <p className="text-2xs text-slate-300 leading-relaxed">{item.detail}</p>
              </div>
            ))}
          </div>

          {checkResult.issues.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2 font-mono text-xs">
              <div className="font-black text-rose-300">
                🔎 检测到 {checkResult.issues.length} 处常见语法/拼写提醒：
              </div>
              {checkResult.issues.map((issue, idx) => (
                <div key={idx} className="text-2xs text-rose-200 flex flex-col sm:flex-row sm:items-center gap-1">
                  <span>• {issue.message}</span>
                  <span className="text-amber-300">→ {issue.suggestion}</span>
                </div>
              ))}
            </div>
          )}

          {/* Step 4 Submit & Model Essay Actions */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                if (!hasSubmitted) {
                  alert('请先自己完成写作并点击“提交保存作文”，提交后即可打开范文对照学习哦！');
                  return;
                }
                setShowModelEssay((v) => !v);
              }}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200 cursor-pointer"
            >
              {showModelEssay ? '🙈 收起示范范文' : '📖 提交后查看示范范文'}
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-cyan-500 hover:from-fuchsia-400 hover:to-cyan-400 text-slate-950 font-mono font-black text-xs sm:text-sm shadow-lg shadow-fuchsia-500/25 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? '⏳ 正在保存...' : '🚀 提交保存作文并领奖'}
            </button>
          </div>
        </section>

        {/* ================= STEP 4: 示范范文对照 ================= */}
        {hasSubmitted && showModelEssay && (
          <section className="bg-gradient-to-br from-[#1E1B4B] via-[#0F172A] to-[#131B2E] border border-fuchsia-400/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
              <h3 className="text-sm sm:text-base font-black font-mono text-fuchsia-300">
                📖 高分示范范文：{currentScene.modelEssay.title}
              </h3>
              <button
                type="button"
                onClick={() =>
                  speak(
                    `${currentScene.modelEssay.title}. ${currentScene.modelEssay.paragraphs.join(' ')}`
                  )
                }
                className="px-3 py-1 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/40 text-xs font-mono text-fuchsia-200 cursor-pointer"
              >
                🔊 朗读范文
              </button>
            </div>
            <div className="space-y-2.5 font-mono text-xs sm:text-sm text-slate-100 leading-relaxed">
              {currentScene.modelEssay.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <p className="text-2xs font-mono text-amber-300 pt-2 border-t border-slate-800">
              💡 {currentScene.modelEssay.zhSummary}
            </p>
          </section>
        )}
      </main>

      {/* Reward Celebration Modal */}
      {rewardModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131B2E] border border-emerald-400/50 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="text-5xl">🏆</div>
            <h3 className="text-xl font-black font-mono text-emerald-300">
              场景描写写作通关！
            </h3>
            <p className="text-xs font-mono text-slate-300">
              太棒了！你的作文完整运用了现在进行时、服饰描述、形容词与方位介词，且字数达标！
            </p>
            <div className="flex items-center justify-center gap-4 py-2 font-mono font-black text-base">
              <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40">
                +{rewardModal.coins} 🪙
              </span>
              {rewardModal.stars > 0 && (
                <span className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  +{rewardModal.stars} ⭐
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setRewardModal((prev) => ({ ...prev, isOpen: false }))}
              className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-mono font-black text-xs cursor-pointer"
            >
              太棒了，继续查看范文对照 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
