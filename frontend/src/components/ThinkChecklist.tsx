import React, { useState, useMemo, useCallback } from 'react';
import { THINK_STARTER_UNITS, ThinkUnitData } from '../data/thinkStarterData';
import { GrammarPracticeView } from './GrammarPracticeView';

interface ThinkChecklistProps {
  currentUser?: {
    id: number;
    username: string;
    coins: number;
    avatar?: string;
  } | null;
  onBackToStories?: () => void;
}

export const ThinkChecklist: React.FC<ThinkChecklistProps> = ({
  currentUser,
  onBackToStories,
}) => {
  const [viewMode, setViewMode] = useState<'checklist' | 'grammar'>('checklist');
  const [selectedUnitId, setSelectedUnitId] = useState<number>(1);
  const [isSelfTestMode, setIsSelfTestMode] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingText, setPlayingText] = useState<string | null>(null);

  const currentUnit: ThinkUnitData = useMemo(() => {
    return (
      THINK_STARTER_UNITS.find((u) => u.id === selectedUnitId) ||
      THINK_STARTER_UNITS[0]
    );
  }, [selectedUnitId]);

  // Web Speech API for pronunciation
  const speak = useCallback((text: string, lang = 'en-US') => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Clean brackets or punctuation for better pronunciation
    const cleanText = text.replace(/\[.*?\]/g, '').replace(/[——\/]/g, ' ').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = lang;
    utterance.rate = 0.88; // Slightly slower, ideal for primary/starter learners
    utterance.pitch = 1.05;

    // Try to pick an English voice
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find((v) => v.lang.startsWith('en-') && !v.name.includes('Google'));
    if (enVoice) utterance.voice = enVoice;

    setPlayingText(text);
    utterance.onend = () => setPlayingText(null);
    utterance.onerror = () => setPlayingText(null);

    window.speechSynthesis.speak(utterance);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Filtered vocabulary items if search query is entered
  const normalizedQuery = searchQuery.trim().toLowerCase();

  if (viewMode === 'grammar') {
    return (
      <GrammarPracticeView
        currentUser={currentUser}
        onBack={() => setViewMode('checklist')}
      />
    );
  }

  return (
    <div className="min-h-full bg-[#0B101B] text-slate-100 font-sans pb-24 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 1. Top Fixed/Sticky Toolbar (Print-hidden) */}
      <header className="print:hidden sticky top-0 z-30 bg-[#0F172A]/90 backdrop-blur-md border-b border-[#1E293B] shadow-lg px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back button & Title */}
          <div className="flex items-center gap-3">
            {onBackToStories && (
              <button
                type="button"
                onClick={onBackToStories}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="返回主关卡地图"
              >
                <span>◀</span> <span>返回地图</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="text-2xl animate-pulse">📘</span>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-black tracking-wider uppercase font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400">
                    Think Starter 知识清单
                  </h1>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-3xs font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    CAMBRIDGE ENGLISH
                  </span>
                </div>
                <p className="text-3xs text-slate-400 font-mono hidden md:block">
                  剑桥英语原版 Unit 1 ~ Unit 5 核心词汇、语法表格、情景交际与思维导图
                </p>
              </div>
            </div>
          </div>

          {/* Right: Action Buttons (Self-Test, Search, Print) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {currentUser && (
              <span className="hidden xl:inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-mono text-cyan-300">
                <span>👤</span>
                <span>{currentUser.username}</span>
              </span>
            )}

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索单词 / 语法..."
                className="bg-slate-900/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-xs text-slate-200 placeholder:text-slate-500 rounded-xl px-3 py-1.5 w-32 sm:w-44 transition-all font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1.5 text-xs text-slate-500 hover:text-slate-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Self-Test Toggle */}
            <button
              type="button"
              onClick={() => setIsSelfTestMode((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                isSelfTestMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
              title="隐藏中文翻译，悬停或点击时可揭晓，专供自测复习"
            >
              <span>{isSelfTestMode ? '🙈' : '👁️'}</span>
              <span>{isSelfTestMode ? '自测模式 (ON)' : '隐藏中文自测'}</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-400 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="调起打印机，一键打印整洁 A4 单元复习清单"
            >
              <span>🖨️</span>
              <span className="hidden sm:inline">打印复习单</span>
            </button>
          </div>
        </div>

        {/* Unit Selector Pills */}
        <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {THINK_STARTER_UNITS.map((u) => {
            const isSelected = u.id === selectedUnitId;
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  setSelectedUnitId(u.id);
                  setSearchQuery('');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span className="w-5 h-5 rounded-md bg-black/20 flex items-center justify-center text-3xs font-black">
                  U{u.id}
                </span>
                <span>{u.title}</span>
              </button>
            );
          })}

          <div className="h-4 w-px bg-slate-700/80 mx-1 shrink-0" />

          {/* Grammar Practice Tab */}
          <button
            type="button"
            onClick={() => setViewMode('grammar')}
            className="px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 border bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-purple-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 border-amber-400/70 shadow-[0_0_12px_rgba(245,158,11,0.2)] hover:scale-105 active:scale-95"
            title="点击进入一般现在时专项训练（含动词三单变位、单选、填空、故事改写）"
          >
            <span className="text-sm animate-pulse">⚡</span>
            <span>一般现在时专项训练 (1&2)</span>
            <span className="px-1.5 py-0.2 rounded-full text-3xs bg-amber-400 text-slate-950 font-black">
              实战刷题
            </span>
          </button>
        </div>
      </header>

      {/* 2. Main Content Canvas */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-8 print:p-0 print:max-w-none">
        {/* Unit Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131B2E] via-[#0F172A] to-[#1E1B4B] border border-[#1F2D4A] p-6 sm:p-8 shadow-2xl print:border-none print:shadow-none print:bg-white print:text-black">
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {currentUnit.unit}
                </span>
                <span className="text-2xs font-mono text-slate-400">
                  Cambridge Think Starter Checklist
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white uppercase print:text-black">
                {currentUnit.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-mono max-w-2xl print:text-slate-700">
                {currentUnit.subtitle}
              </p>
            </div>

            {/* Quick Section Anchors */}
            <div className="flex items-center gap-2 flex-wrap print:hidden">
              <a
                href="#section-vocab"
                className="px-3 py-1.5 rounded-lg text-2xs font-mono font-bold bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-cyan-300 transition-colors"
              >
                🔤 核心词汇
              </a>
              <a
                href="#section-grammar"
                className="px-3 py-1.5 rounded-lg text-2xs font-mono font-bold bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-purple-300 transition-colors"
              >
                📐 核心语法
              </a>
              <a
                href="#section-speaking"
                className="px-3 py-1.5 rounded-lg text-2xs font-mono font-bold bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-emerald-300 transition-colors"
              >
                💬 交际口语
              </a>
              {currentUnit.cultureSection && (
                <a
                  href="#section-culture"
                  className="px-3 py-1.5 rounded-lg text-2xs font-mono font-bold bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-amber-300 transition-colors"
                >
                  🌍 文化之窗
                </a>
              )}
              <a
                href="#section-writing"
                className="px-3 py-1.5 rounded-lg text-2xs font-mono font-bold bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-rose-300 transition-colors"
              >
                ✍️ 写作导图
              </a>
            </div>
          </div>
        </div>

        {/* ================= SECTION 1: VOCABULARY ================= */}
        <section id="section-vocab" className="flex flex-col gap-6 scroll-mt-28">
          <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🔤</span>
              <div>
                <h3 className="text-base sm:text-lg font-black font-mono tracking-wider text-cyan-400 uppercase">
                  核心分类词汇 (Vocabulary Mastery)
                </h3>
                <span className="text-3xs text-slate-400 font-mono">
                  点击任意单词或小喇叭图标即可聆听纯正发音
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {currentUnit.vocabularySections.map((sec, secIdx) => {
              // Filter items if query exists
              const filteredItems = normalizedQuery
                ? sec.items.filter(
                    (it) =>
                      it.en.toLowerCase().includes(normalizedQuery) ||
                      it.zh.toLowerCase().includes(normalizedQuery) ||
                      (it.extra && it.extra.toLowerCase().includes(normalizedQuery)) ||
                      (it.antonym && it.antonym.toLowerCase().includes(normalizedQuery))
                  )
                : sec.items;

              if (normalizedQuery && filteredItems.length === 0) return null;

              return (
                <div
                  key={secIdx}
                  className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 print:bg-white print:border-slate-300"
                >
                  <div>
                    <h4 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wide flex items-center gap-2 print:text-black">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span>{sec.title}</span>
                    </h4>
                    {sec.subtitle && (
                      <p className="text-2xs text-slate-400 font-mono mt-0.5 print:text-slate-600">
                        {sec.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Layout Render */}
                  {sec.layout === 'antonyms' ? (
                    /* Antonym Pairs layout (clean <-> dirty) */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredItems.map((item, itIdx) => (
                        <div
                          key={itIdx}
                          className="bg-[#0B101B] border border-[#1F2D4A] hover:border-cyan-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors group print:bg-slate-50 print:border-slate-300"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl shrink-0">{item.icon || '🏷️'}</span>
                            <div className="flex flex-col">
                              <button
                                type="button"
                                onClick={() => speak(item.en)}
                                className="text-left font-mono font-bold text-cyan-300 hover:text-cyan-200 text-sm flex items-center gap-1.5 cursor-pointer print:text-black"
                              >
                                <span>{item.en}</span>
                                <span className="opacity-0 group-hover:opacity-100 text-2xs text-cyan-400 transition-opacity">
                                  🔊
                                </span>
                              </button>
                              <span
                                className={`text-2xs font-mono text-slate-400 transition-all ${
                                  isSelfTestMode
                                    ? 'blur-sm select-none hover:blur-none cursor-pointer'
                                    : ''
                                } print:filter-none print:text-slate-700`}
                                title={isSelfTestMode ? '点击或悬停显示中文释义' : undefined}
                              >
                                {item.zh}
                              </span>
                            </div>
                          </div>

                          {item.antonym && (
                            <div className="flex flex-col items-end pl-3 border-l border-slate-800">
                              <span className="text-3xs text-rose-400 font-mono font-bold">
                                ↔ 反义词
                              </span>
                              <button
                                type="button"
                                onClick={() => speak(item.antonym!.split(' ')[0])}
                                className="text-xs font-mono text-rose-300 hover:text-rose-200 font-bold cursor-pointer print:text-black"
                              >
                                {item.antonym.split(' ')[0]}
                              </button>
                              <span
                                className={`text-3xs font-mono text-slate-500 transition-all ${
                                  isSelfTestMode
                                    ? 'blur-sm select-none hover:blur-none cursor-pointer'
                                    : ''
                                } print:filter-none`}
                              >
                                {item.antonym.substring(item.antonym.indexOf('('))}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : sec.layout === 'tags' ? (
                    /* Tags layout (e.g. Days of the week) */
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                      {filteredItems.map((item, itIdx) => (
                        <div
                          key={itIdx}
                          onClick={() => speak(item.en)}
                          className="bg-[#0B101B] border border-[#1F2D4A] hover:border-indigo-400/50 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1 cursor-pointer group transition-all print:bg-slate-50"
                        >
                          <span className="text-xl">{item.icon || '🗓️'}</span>
                          <span className="font-mono font-bold text-xs text-indigo-300 group-hover:text-indigo-200 print:text-black">
                            {item.en}
                          </span>
                          <span
                            className={`text-3xs font-mono text-slate-400 transition-all ${
                              isSelfTestMode ? 'blur-sm select-none hover:blur-none' : ''
                            } print:filter-none`}
                          >
                            {item.zh}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Default Grid or Pairs layout */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {filteredItems.map((item, itIdx) => (
                        <div
                          key={itIdx}
                          className="bg-[#0B101B] border border-[#1F2D4A] hover:border-cyan-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors group print:bg-slate-50 print:border-slate-300"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.icon && (
                              <span className="text-2xl shrink-0">{item.icon}</span>
                            )}
                            <div className="flex flex-col min-w-0">
                              <button
                                type="button"
                                onClick={() => speak(item.en)}
                                className="text-left font-mono font-bold text-cyan-300 hover:text-cyan-200 text-sm truncate flex items-center gap-1.5 cursor-pointer print:text-black"
                              >
                                <span className="truncate">{item.en}</span>
                                <span className="opacity-0 group-hover:opacity-100 text-2xs text-cyan-400 transition-opacity">
                                  🔊
                                </span>
                              </button>
                              <span
                                className={`text-2xs font-mono text-slate-400 truncate transition-all ${
                                  isSelfTestMode
                                    ? 'blur-sm select-none hover:blur-none cursor-pointer'
                                    : ''
                                } print:filter-none print:text-slate-700`}
                                title={isSelfTestMode ? '点击或悬停查看中文' : undefined}
                              >
                                {item.zh}
                              </span>
                              {item.extra && (
                                <span
                                  onClick={() => speak(item.extra!)}
                                  className={`text-3xs font-mono text-indigo-300 hover:text-indigo-200 cursor-pointer mt-0.5 truncate transition-all ${
                                    isSelfTestMode
                                      ? 'blur-sm select-none hover:blur-none'
                                      : ''
                                  } print:filter-none`}
                                >
                                  {item.extra}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => speak(item.en)}
                            className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 flex items-center justify-center shrink-0 transition-colors text-xs print:hidden"
                            title="播放发音"
                          >
                            {playingText === item.en ? (
                              <span className="animate-spin text-cyan-400">🌀</span>
                            ) : (
                              '🔊'
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= SECTION 2: GRAMMAR ================= */}
        <section id="section-grammar" className="flex flex-col gap-6 scroll-mt-28">
          <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📐</span>
              <div>
                <h3 className="text-base sm:text-lg font-black font-mono tracking-wider text-purple-400 uppercase">
                  核心语法精粹 (Grammar Essentials)
                </h3>
                <span className="text-3xs text-slate-400 font-mono">
                  结构规则、句型变形对比与高频例句
                </span>
              </div>
            </div>
          </div>

          {/* Unit 5 Special Grammar Practice Entry Banner */}
          {selectedUnitId === 5 && (
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-purple-500/15 border border-amber-400/40 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl print:hidden">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shrink-0">
                  ⚡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-mono font-black text-sm sm:text-base text-amber-300">
                      一般现在时（专项训练 1 & 2）实战题库
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-3xs font-mono font-bold bg-amber-400 text-slate-950">
                      配套练习
                    </span>
                  </div>
                  <p className="font-mono text-2xs sm:text-xs text-slate-300 mt-1 max-w-xl">
                    包含 24个动词三单变位打字训练、单选题、动词适当形式填空、Mrs. Black's Day 短文篇章填空与句型转换，支持即时智能判分、发音朗读与考点深度解析。
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('grammar')}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-mono font-black text-xs shadow-lg shadow-amber-500/20 whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95 transition-all shrink-0"
              >
                🎯 立即开启实战刷题 →
              </button>
            </div>
          )}

          <div className="flex flex-col gap-6">
            {currentUnit.grammarPoints.map((gp, gpIdx) => (
              <div
                key={gpIdx}
                className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 print:bg-white print:border-slate-300"
              >
                <div>
                  <h4 className="text-sm font-bold font-mono text-purple-300 uppercase tracking-wide flex items-center gap-2 print:text-black">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span>{gp.title}</span>
                  </h4>
                  {gp.ruleSummary && (
                    <p className="text-xs text-slate-300 font-mono mt-1 bg-purple-950/20 border border-purple-500/20 p-2.5 rounded-xl print:bg-slate-100 print:text-slate-800">
                      💡 <strong>规则口诀：</strong> {gp.ruleSummary}
                    </p>
                  )}
                </div>

                {/* Table Render */}
                {gp.table && (
                  <div className="table-responsive bg-[#0B101B] border border-[#1F2D4A] rounded-xl overflow-hidden shadow-inner print:bg-white print:border-slate-300">
                    <table className="w-full text-xs text-left font-mono border-collapse">
                      <thead>
                        <tr className="bg-purple-950/40 border-b border-[#1F2D4A] text-purple-200 font-bold print:bg-slate-200 print:text-black">
                          {gp.table.headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-3 uppercase tracking-wider">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {gp.table.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className="border-b border-slate-800/60 hover:bg-slate-900/50 transition-colors print:border-slate-200"
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className={`p-3 ${
                                  cIdx === 0
                                    ? 'font-bold text-cyan-300 print:text-black'
                                    : cIdx === 2
                                    ? 'text-purple-300 font-bold print:text-purple-700'
                                    : 'text-slate-300 print:text-slate-700'
                                }`}
                              >
                                {cell.includes('?') || cell.includes('.') ? (
                                  <span
                                    onClick={() => speak(cell.split('(')[0].replace(/——.*/, ''))}
                                    className="cursor-pointer hover:underline flex items-center gap-1 group/cell"
                                    title="点击发音"
                                  >
                                    <span>{cell}</span>
                                    <span className="opacity-0 group-hover/cell:opacity-100 text-3xs text-cyan-400 print:hidden">
                                      🔊
                                    </span>
                                  </span>
                                ) : (
                                  cell
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Grammar Notes */}
                {gp.notes && gp.notes.length > 0 && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-2xs font-mono text-slate-400 print:bg-slate-50 print:text-slate-700">
                    {gp.notes.map((note, nIdx) => (
                      <p key={nIdx}>📌 {note}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ================= SECTION 3: DIALOGUES & SPEAKING ================= */}
        <section id="section-speaking" className="flex flex-col gap-6 scroll-mt-28">
          <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">💬</span>
              <div>
                <h3 className="text-base sm:text-lg font-black font-mono tracking-wider text-emerald-400 uppercase">
                  实用交际与日常功能句 (Functions & Speaking)
                </h3>
                <span className="text-3xs text-slate-400 font-mono">
                  高频生活交际情境对话，随时点击气泡跟读
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentUnit.speakingDialogues.map((sd, sdIdx) => (
              <div
                key={sdIdx}
                className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col gap-4 print:bg-white print:border-slate-300"
              >
                <h4 className="text-sm font-bold font-mono text-emerald-300 uppercase tracking-wide flex items-center gap-2 print:text-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{sd.title}</span>
                </h4>

                <div className="flex flex-col gap-3">
                  {sd.items.map((it, itIdx) => (
                    <div
                      key={itIdx}
                      className="bg-[#0B101B] border border-[#1F2D4A] rounded-xl p-3.5 flex flex-col gap-2 hover:border-emerald-500/40 transition-colors group print:bg-slate-50"
                    >
                      {/* Line 1 / Question */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => speak(it.en)}
                            className="text-left font-mono font-bold text-xs sm:text-sm text-emerald-300 hover:text-emerald-200 cursor-pointer flex items-center gap-1.5 print:text-black"
                          >
                            <span>{it.en}</span>
                            <span className="text-2xs opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity">
                              🔊
                            </span>
                          </button>
                          <span
                            className={`text-2xs font-mono text-slate-400 transition-all ${
                              isSelfTestMode ? 'blur-sm select-none hover:blur-none' : ''
                            } print:filter-none print:text-slate-600`}
                          >
                            {it.zh}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => speak(it.en)}
                          className="text-xs text-slate-500 hover:text-emerald-300 p-1 print:hidden"
                        >
                          🔊
                        </button>
                      </div>

                      {/* Line 2 / Response (if any) */}
                      {it.responseEn && (
                        <div className="pl-4 border-l-2 border-emerald-500/40 flex items-start justify-between gap-2 mt-1">
                          <div className="flex flex-col">
                            <button
                              type="button"
                              onClick={() => speak(it.responseEn!)}
                              className="text-left font-mono font-bold text-xs text-cyan-300 hover:text-cyan-200 cursor-pointer flex items-center gap-1.5 print:text-black"
                            >
                              <span>{it.responseEn}</span>
                              <span className="text-2xs opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity">
                                🔊
                              </span>
                            </button>
                            {it.responseZh && (
                              <span
                                className={`text-2xs font-mono text-slate-400 transition-all ${
                                  isSelfTestMode ? 'blur-sm select-none hover:blur-none' : ''
                                } print:filter-none print:text-slate-600`}
                              >
                                {it.responseZh}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => speak(it.responseEn!)}
                            className="text-xs text-slate-500 hover:text-cyan-300 p-1 print:hidden"
                          >
                            🔊
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SECTION 4: CULTURE (IF APPLICABLE) ================= */}
        {currentUnit.cultureSection && (
          <section id="section-culture" className="flex flex-col gap-6 scroll-mt-28">
            <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🌍</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black font-mono tracking-wider text-amber-400 uppercase">
                    文化视野与全球探索 (Culture Explorer)
                  </h3>
                  <span className="text-3xs text-slate-400 font-mono">
                    开拓国际视野，了解各具特色的民俗与世界景观
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentUnit.cultureSection.cards.map((card, cIdx) => (
                <div
                  key={cIdx}
                  className="bg-[#131B2E] border border-[#1F2D4A] hover:border-amber-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between gap-3 transition-colors print:bg-white print:border-slate-300"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{card.flag || '🚩'}</span>
                      <span className="text-3xs font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {card.country}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold font-mono text-white print:text-black">
                      {card.title}
                    </h4>
                    <ul className="space-y-1.5 text-xs font-mono text-slate-300 print:text-slate-700">
                      {card.details.map((d, dIdx) => (
                        <li key={dIdx} className="flex items-start gap-1.5">
                          <span className="text-amber-400 text-3xs mt-1">▸</span>
                          <span
                            onClick={() => speak(d)}
                            className="cursor-pointer hover:text-amber-200 transition-colors"
                            title="点击朗读"
                          >
                            {d}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ================= SECTION 5: WRITING MIND MAP ================= */}
        <section id="section-writing" className="flex flex-col gap-6 scroll-mt-28">
          <div className="flex items-center justify-between border-b border-[#1F2D4A] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">✍️</span>
              <div>
                <h3 className="text-base sm:text-lg font-black font-mono tracking-wider text-rose-400 uppercase">
                  写作思维导图架构 (Writing Structure & Mind Map)
                </h3>
                <span className="text-3xs text-slate-400 font-mono">
                  结构化小作文构思分支与实用起手句式模版
                </span>
              </div>
            </div>
          </div>

          <div className="bg-[#131B2E] border border-[#1F2D4A] rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-6 print:bg-white print:border-slate-300">
            {/* Center Topic Badge */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs sm:text-sm font-mono font-black uppercase tracking-wider">
                <span>🎯 核心话题：</span>
                <span>{currentUnit.writingGuide.topic}</span>
              </div>
              <p className="text-2xs text-slate-400 font-mono">
                {currentUnit.writingGuide.title}
              </p>
            </div>

            {/* Branches Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {currentUnit.writingGuide.branches.map((b, bIdx) => (
                <div
                  key={bIdx}
                  className="bg-[#0B101B] border border-rose-500/20 hover:border-rose-500/40 rounded-xl p-4 flex flex-col gap-2.5 transition-colors print:bg-slate-50"
                >
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="text-xl">{b.icon || '📌'}</span>
                    <h5 className="text-xs font-bold font-mono text-rose-300 print:text-rose-700">
                      {b.label}
                    </h5>
                  </div>

                  <div className="flex flex-col gap-2">
                    {b.templates.map((tpl, tIdx) => (
                      <div key={tIdx} className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => speak(tpl.en)}
                          className="text-left font-mono font-bold text-xs text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 group/tpl print:text-black"
                          title="点击聆听模版发音"
                        >
                          <span>{tpl.en}</span>
                          <span className="opacity-0 group-hover/tpl:opacity-100 text-3xs text-rose-400 print:hidden">
                            🔊
                          </span>
                        </button>
                        {tpl.zh && (
                          <p
                            className={`text-3xs font-mono text-slate-400 transition-all ${
                              isSelfTestMode ? 'blur-sm select-none hover:blur-none' : ''
                            } print:filter-none print:text-slate-600`}
                          >
                            {tpl.zh}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
