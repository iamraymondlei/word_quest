import React, { useState, useEffect } from 'react';
import {
  CAREER_TIERS,
  calcRankProgress,
  formatExpNumber,
  formatCompactExp,
  TierId
} from '../utils/rankService';
import { RunnerSprite, normalizeBuddyKey } from './StoryChaseAssets';

interface PeerStudent {
  username: string;
  coins: number;
  avatar?: string;
  is_admin?: number;
}

interface RankRoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: {
    id: number;
    username: string;
    coins: number;
    avatar?: string;
    is_admin?: number;
  };
  peerUsers?: PeerStudent[];
  theme?: 'cyber' | 'bright';
}

export const RankRoadModal: React.FC<RankRoadModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  peerUsers = [],
  theme = 'cyber'
}) => {
  const currentProgress = calcRankProgress(currentUser?.coins || 0);
  const [selectedTierId, setSelectedTierId] = useState<TierId>(currentProgress.tierId);

  // Sync selected tier whenever modal opens or current user tier changes
  useEffect(() => {
    if (isOpen) {
      setSelectedTierId(currentProgress.tierId);
    }
  }, [isOpen, currentProgress.tierId]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectedTier = CAREER_TIERS.find((t) => t.id === selectedTierId) || CAREER_TIERS[0];
  const currentBuddyKey = normalizeBuddyKey(currentUser?.avatar);

  // Group peer users by tier and level
  const peersByTierLevel = new Map<string, PeerStudent[]>();
  peerUsers.forEach((peer) => {
    const peerProgress = calcRankProgress(peer.coins || 0);
    const key = `${peerProgress.tierId}_L${peerProgress.level}`;
    const list = peersByTierLevel.get(key) || [];
    list.push(peer);
    peersByTierLevel.set(key, list);
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-fade-in font-mono"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-scale-up ${
          theme === 'bright'
            ? 'bg-slate-50 text-slate-900 border-slate-300'
            : 'bg-slate-950 text-slate-100 border-cyan-500/40 shadow-cyan-950/40'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. MODAL TOP HEADER ── */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/90 to-slate-900 border-b border-slate-800">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                🎖️
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold tracking-widest uppercase mb-1">
                  <span>CAREER RANK & PROGRESSION ROAD</span>
                </div>
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>学员星际探险军衔晋升谱系</span>
                </h2>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-900/90 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-300 flex items-center justify-center font-bold text-sm transition-all cursor-pointer shadow-sm active:scale-90"
              title="按 ESC 或点击关闭"
            >
              ✕
            </button>
          </div>

          {/* ── CURRENT USER OVERVIEW CAPSULE ── */}
          <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Avatar Platform */}
              <div className="w-13 h-13 rounded-2xl bg-slate-900 border border-cyan-400/50 flex items-center justify-center relative shrink-0 shadow-md">
                <div className="w-full h-full flex items-center justify-center">
                  <RunnerSprite avatar={currentBuddyKey} isSprinting={false} />
                </div>
                <span className="absolute -bottom-1 -right-1 text-sm bg-slate-950 rounded-full border border-slate-800 p-0.5 shadow-sm">
                  {currentProgress.badge}
                </span>
              </div>

              {/* Identity & Rank */}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-black text-white truncate">
                    {currentUser?.username || 'Learner'}
                  </span>
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-lg border font-mono flex items-center gap-1 ${currentProgress.theme.badgeBg} ${currentProgress.theme.badgeBorder} ${currentProgress.theme.badgeText} ${currentProgress.theme.badgeGlow}`}
                  >
                    <span>{currentProgress.badge}</span>
                    <span>{currentProgress.tierName} Lv.{currentProgress.level}</span>
                  </span>
                  {currentProgress.tierId === 'T2' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-500/50">
                      👑 全站首位破茧晋阶先锋
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>累计探险经验: <strong className="text-amber-300 font-mono font-black">{formatExpNumber(currentProgress.currentExp)}</strong> EXP</span>
                </div>
              </div>
            </div>

            {/* Level Progress Bar Capsule */}
            <div className="w-full md:w-80 flex flex-col gap-1.5 shrink-0 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">阶内升级进度:</span>
                <span className="font-black text-cyan-300 tabular-nums font-mono">
                  {formatExpNumber(currentProgress.expInLevel)} / {formatExpNumber(currentProgress.levelSpan)} EXP
                  <span className="text-slate-500 ml-1">({currentProgress.progressPercent}%)</span>
                </span>
              </div>

              {/* Bar Fill */}
              <div className="w-full h-3 rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${currentProgress.theme.progressBarGradient} transition-all duration-500 shadow-sm`}
                  style={{ width: `${Math.max(4, Math.min(100, currentProgress.progressPercent))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Lv.{currentProgress.level} ({formatCompactExp(currentProgress.levelMinExp)})</span>
                <span className="text-amber-400/90 font-bold">
                  {currentProgress.isMaxLevel
                    ? '🌟 极境满星'
                    : `距升下级还需 ${formatExpNumber(currentProgress.remainingExpToNextLevel)} EXP`}
                </span>
                <span>Lv.{Math.min(5, currentProgress.level + 1)} ({formatCompactExp(currentProgress.levelMaxExp)})</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. FIVE CAREER TIER SELECTOR TABS ── */}
        <div className="flex items-center gap-1.5 p-3 sm:px-6 bg-slate-900/90 border-b border-slate-800 overflow-x-auto select-none">
          {CAREER_TIERS.map((tier) => {
            const isSelected = tier.id === selectedTierId;
            const isUserCurrentTier = tier.id === currentProgress.tierId;
            const isTierPassed = currentProgress.currentExp >= tier.maxExp;

            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => setSelectedTierId(tier.id)}
                className={`group flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap border shrink-0 ${
                  isSelected
                    ? `${tier.theme.badgeBg} ${tier.theme.badgeBorder} ${tier.theme.badgeText} shadow-md`
                    : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{tier.badge}</span>
                <div className="flex flex-col text-left leading-none">
                  <div className="flex items-center gap-1.5">
                    <span>{tier.name}</span>
                    {isUserCurrentTier && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500 text-slate-950 font-black">
                        当前
                      </span>
                    )}
                    {isTierPassed && !isUserCurrentTier && (
                      <span className="text-[9px] text-emerald-400">✓</span>
                    )}
                  </div>
                  <span className="text-[9px] opacity-70 mt-1 font-normal">
                    {formatCompactExp(tier.minExp)} ~ {formatCompactExp(tier.maxExp)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── 3. TIER SUMMARY & LEVEL LADDER (SCROLLABLE CONTENT) ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Selected Tier Banner */}
          <div className={`p-4 rounded-2xl border ${selectedTier.theme.cardBg} ${selectedTier.theme.cardBorder} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl p-2 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
                {selectedTier.badge}
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-base sm:text-lg font-black ${selectedTier.theme.accentText}`}>
                    第 {selectedTier.order} 职阶 · {selectedTier.name} ({selectedTier.nameEn})
                  </h3>
                  <span className="text-xs font-mono text-slate-400">
                    [{formatExpNumber(selectedTier.minExp)} ~ {formatExpNumber(selectedTier.maxExp)} EXP]
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-mono leading-relaxed">
                  {selectedTier.summary}
                </p>
              </div>
            </div>

            <div className="sm:text-right shrink-0 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-xs">
              <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-bold">职阶特权 & 解锁奖励:</div>
              <div className={`font-bold text-xs ${selectedTier.theme.accentText}`}>
                {selectedTier.perkSummary}
              </div>
            </div>
          </div>

          {/* 5-Level Detailed Ladder Cards */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
              <span>职阶等级晋升阶梯 (5 LEVELS)</span>
              <span>经验跨度 & 里程碑奖励</span>
            </div>

            {selectedTier.levels.map((lvl) => {
              const isUserAtThisLevel = currentProgress.tierId === selectedTier.id && currentProgress.level === lvl.level;
              const isLevelCompleted = currentProgress.currentExp >= lvl.maxExp;
              const peersHere = peersByTierLevel.get(`${selectedTier.id}_L${lvl.level}`) || [];

              return (
                <div
                  key={lvl.level}
                  className={`p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden ${
                    isUserAtThisLevel
                      ? `bg-slate-900/95 ${selectedTier.theme.cardBorder} shadow-lg ring-1 ring-cyan-400/50`
                      : isLevelCompleted
                      ? 'bg-slate-900/40 border-slate-800/80 text-slate-300'
                      : 'bg-slate-950/40 border-slate-800/40 text-slate-500'
                  }`}
                >
                  {/* Left Color Indicator Stripe */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      isUserAtThisLevel
                        ? `bg-gradient-to-b ${selectedTier.theme.progressBarGradient}`
                        : isLevelCompleted
                        ? 'bg-emerald-500/70'
                        : 'bg-slate-800'
                    }`}
                  />

                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pl-2">
                    {/* Level Title & Desc */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`text-sm font-black font-mono ${
                          isUserAtThisLevel
                            ? selectedTier.theme.accentText
                            : isLevelCompleted
                            ? 'text-slate-200'
                            : 'text-slate-400'
                        }`}>
                          {selectedTier.badge} {lvl.title}
                        </span>

                        {isUserAtThisLevel && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 animate-pulse font-mono shadow-sm">
                            📍 当前所处等级 (YOU ARE HERE)
                          </span>
                        )}

                        {isLevelCompleted && !isUserAtThisLevel && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                            ✓ 已达成通关
                          </span>
                        )}

                        {!isLevelCompleted && !isUserAtThisLevel && (
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            🔒 待探索
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-mono">
                        {lvl.description}
                      </p>

                      {/* Peer Learners Marker */}
                      {peersHere.length > 0 && (
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400">本级探险家:</span>
                          {peersHere.map((p, pIdx) => (
                            <span
                              key={pIdx}
                              className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                p.username.toLowerCase() === 'murphy'
                                  ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-300'
                                  : p.username.toLowerCase() === 'eugenie'
                                  ? 'bg-cyan-950/80 border-cyan-400/50 text-cyan-300'
                                  : 'bg-slate-900 border-slate-700 text-slate-300'
                              }`}
                            >
                              <span>{p.avatar || '👤'}</span>
                              <span>{p.username}</span>
                              <span className="text-amber-400 font-normal">({formatCompactExp(p.coins)} EXP)</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Numeric Requirements & Perks */}
                    <div className="flex flex-row md:flex-col items-end justify-between md:justify-center gap-2 shrink-0 border-t md:border-t-0 border-slate-800/80 pt-2 md:pt-0 w-full md:w-auto text-right">
                      <div>
                        <div className="text-xs font-black text-amber-300 font-mono">
                          {formatExpNumber(lvl.minExp)} ~ {formatExpNumber(lvl.maxExp)} EXP
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          本级跨度: +{formatExpNumber(lvl.span)} EXP
                        </div>
                      </div>

                      {lvl.perk && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md shadow-sm">
                          <span>🎁</span>
                          <span>{lvl.perk}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. FOOTER & PRINCIPLES ── */}
        <div className="p-4 sm:px-6 bg-slate-900/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 font-mono text-[11px] leading-relaxed">
            💡 <strong className="text-cyan-300">成长法则</strong>：完成绘本阅读、追逐战、单词匹配、太空战机与词汇宝库练习均可获得丰厚探险经验（EXP）。历史累计经验永久保留，稳步晋升更高军衔！
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer active:scale-95 shrink-0"
          >
            开启探险 (LET'S QUEST)
          </button>
        </div>
      </div>
    </div>
  );
};
