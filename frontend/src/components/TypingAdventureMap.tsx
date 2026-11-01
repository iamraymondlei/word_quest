import React, { useState, useMemo, useCallback } from 'react';
import { Island } from './AdventureMap';
import { OfflineSyncBadge } from './OfflineSyncBadge';

export interface TypingAdventureMapProps {
  islands: Island[];
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
  onFontScaleChange?: (scale: '100' | '115' | '130') => void;
  onStartGame: (island: Island, mode: 'story' | 'listening' | 'translation' | 'falling') => void;
  onLogout: () => void;
  onUpdateUser?: (user: any) => void;
  hideHeader?: boolean;
}

const normalizeGroupName = (raw?: string): string => {
  const g = (raw && raw.trim()) || 'General';
  if (g.toUpperCase() === 'ALL' || g.toUpperCase() === '__ALL__') return 'General';
  return g;
};

const getSectorMask = (sector: Island): number => {
  const stage = sector.unlocked_stage ?? 1;
  let mask = sector.completed_stages_mask || 0;
  if (mask === 0 && stage > 1) {
    if (stage === 2) mask = 1;
    else if (stage === 3) mask = 3;
    else if (stage === 4) mask = 7;
    else if (stage >= 5) mask = 15;
  }
  return mask & 15;
};

// In Typing Adventure, a sector is fully completed when both Story Chase (mask & 2) and Space Defender (mask & 8) are cleared (2 stars full)
const isSectorCompleted = (sector: Island): boolean => {
  const mask = getSectorMask(sector);
  return (mask & 2) !== 0 && (mask & 8) !== 0;
};

export const TypingAdventureMap: React.FC<TypingAdventureMapProps> = ({
  islands,
  currentUser,
  fontScale,
  onFontScaleChange,
  onStartGame
}) => {
  // Filter by story group
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // Toggle hiding completed cards (default: hidden when full 2 stars)
  const [showCompletedCards, setShowCompletedCards] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wordquest_typing_show_completed_cards');
      if (saved !== null) return saved === 'true';
    } catch {}
    return false;
  });

  const handleToggleShowCompleted = () => {
    setShowCompletedCards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wordquest_typing_show_completed_cards', String(next));
      } catch {}
      return next;
    });
  };

  // Tablet / iPad device detection
  const isTabletOrIPad = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
    return isIPad || isAndroidTablet;
  }, []);

  const [desktopOnlyPrompt, setDesktopOnlyPrompt] = useState<string | null>(null);

  // Group statistics (count, stars, maxStars, completed stories)
  const { allStats, groupStats } = useMemo(() => {
    const all = {
      count: islands.length,
      totalStars: 0,
      maxStars: islands.length * 2,
      completedCount: 0
    };
    const groups: Record<string, { count: number; totalStars: number; maxStars: number; completedCount: number }> = {};

    islands.forEach((sector) => {
      const mask = getSectorMask(sector);
      const stars = (mask & 2 ? 1 : 0) + (mask & 8 ? 1 : 0);
      const isCompleted = isSectorCompleted(sector);

      all.totalStars += stars;
      if (isCompleted) all.completedCount += 1;

      const g = normalizeGroupName(sector.group_name);
      if (!groups[g]) {
        groups[g] = { count: 0, totalStars: 0, maxStars: 0, completedCount: 0 };
      }
      groups[g].count += 1;
      groups[g].totalStars += stars;
      groups[g].maxStars += 2;
      if (isCompleted) groups[g].completedCount += 1;
    });

    return { allStats: all, groupStats: groups };
  }, [islands]);

  const isGroupCompleted = useCallback(
    (groupName: string): boolean => {
      const stat = groupStats[groupName];
      return Boolean(stat && stat.count > 0 && stat.completedCount === stat.count);
    },
    [groupStats]
  );

  // Available groups
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    islands.forEach((s) => set.add(normalizeGroupName(s.group_name)));
    return Array.from(set).sort((a, b) => {
      const completedA = isGroupCompleted(a);
      const completedB = isGroupCompleted(b);
      if (completedA && !completedB) return 1;
      if (!completedA && completedB) return -1;
      return a.localeCompare(b);
    });
  }, [islands, isGroupCompleted]);

  // Filtered islands based on selected group and showCompletedCards toggle
  const displayedIslands = useMemo(() => {
    const byGroup = selectedGroup === null
      ? islands
      : islands.filter((sector) => normalizeGroupName(sector.group_name) === selectedGroup);
    if (showCompletedCards) return byGroup;
    return byGroup.filter((sector) => !isSectorCompleted(sector));
  }, [islands, selectedGroup, showCompletedCards]);

  const currentGroupStat = selectedGroup !== null ? (groupStats[selectedGroup] || { count: 0, totalStars: 0, maxStars: 0, completedCount: 0 }) : allStats;

  return (
    <div className="w-full min-h-screen p-4 sm:p-6 lg:p-8 flex flex-col items-center">
      {/* Desktop-only Keyboard Modal for Tablet/iPad */}
      {desktopOnlyPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl">
              ⌨️
            </div>
            <h3 className="text-lg font-black text-amber-400 font-mono tracking-wide">
              Physical Keyboard Required
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {desktopOnlyPrompt}
            </p>
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => setDesktopOnlyPrompt(null)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs font-mono transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="w-full max-w-6xl mx-auto">
        {/* Compact Header & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3 border-b theme-border pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-cyan-400 uppercase font-mono">
              ⌨️ Typing Adventure
            </h1>

            {islands.length > 0 && (
              <>
                <select
                  value={selectedGroup === null ? '__ALL__' : selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value === '__ALL__' ? null : e.target.value)}
                  className="bg-slate-900/90 border border-slate-700 hover:border-amber-400/60 focus:border-amber-400 text-amber-300 text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl outline-none cursor-pointer transition-all"
                  title="Select Story Group"
                >
                  <option value="__ALL__">
                    🌐 All Stories ({allStats.count})
                  </option>
                  {availableGroups.map((groupName) => {
                    const stat = groupStats[groupName] || { count: 0, totalStars: 0, maxStars: 0, completedCount: 0 };
                    const isFullyCleared = isGroupCompleted(groupName);
                    return (
                      <option key={groupName} value={groupName}>
                        {isFullyCleared ? '🎓' : '📁'} {groupName} ({stat.count}){stat.totalStars > 0 ? ` · ⭐${stat.totalStars}` : ''}
                      </option>
                    );
                  })}
                </select>

                <div className="text-xs font-mono theme-text-muted flex items-center gap-2.5 flex-wrap">
                  <span>
                    🏆 <strong className="text-emerald-400 font-bold">{currentGroupStat.completedCount}/{currentGroupStat.count}</strong>
                  </span>
                  <span>
                    🌟 <strong className="text-amber-400 font-bold">{currentGroupStat.totalStars}/{currentGroupStat.maxStars}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={handleToggleShowCompleted}
                    className={`px-2 py-1 rounded-lg border text-[11px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                      showCompletedCards
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30'
                        : 'theme-border bg-black/20 dark:bg-white/10 text-slate-300 hover:bg-amber-500/20 hover:text-amber-300'
                    }`}
                    title={showCompletedCards ? "Hide completed stories" : "Show completed stories"}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${showCompletedCards ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                    <span>
                      Completed ({currentGroupStat.completedCount}): {showCompletedCards ? 'ON' : 'OFF'}
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

        {/* Sector Grid or Empty State */}
        {islands.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md">
            <p className="text-sm theme-text-muted italic mb-4">
              No typing levels available yet.
            </p>
          </div>
        ) : displayedIslands.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md">
            <p className="text-sm theme-text-muted italic mb-4">
              {!showCompletedCards && currentGroupStat.completedCount > 0
                ? `🎉 Awesome! All ${currentGroupStat.completedCount} stories in this category are completed!`
                : `No stories found in group "${selectedGroup}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!showCompletedCards && currentGroupStat.completedCount > 0) {
                  handleToggleShowCompleted();
                } else {
                  setSelectedGroup(null);
                }
              }}
              className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider font-mono hover:bg-amber-400 cursor-pointer shadow-md"
            >
              {!showCompletedCards && currentGroupStat.completedCount > 0
                ? `👁️ Show Completed Stories (${currentGroupStat.completedCount})`
                : 'View All Stories'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {displayedIslands.map((sector, index) => {
              const unlockedStage = sector.unlocked_stage ?? (index === 0 ? 1 : 0);
              const isLocked = unlockedStage === 0;
              const completedMask = getSectorMask(sector);

              const isClearedChase = (completedMask & 2) !== 0;
              const isClearedDefender = (completedMask & 8) !== 0;
              const starsCount = (isClearedChase ? 1 : 0) + (isClearedDefender ? 1 : 0);
              const isStoryFullyCleared = isSectorCompleted(sector);

              let cardStyle = "relative group rounded-xl p-6 transition-all duration-300 border backdrop-blur-md flex flex-col justify-between ";
              if (isLocked) {
                cardStyle += "opacity-60 theme-card border-slate-700 cursor-not-allowed";
              } else if (isStoryFullyCleared) {
                cardStyle += "theme-card border-emerald-500/40 hover:border-emerald-400/70";
              } else {
                cardStyle += "theme-card border-slate-700 hover:border-amber-500/40";
              }

              return (
                <div
                  key={sector.id}
                  className={cardStyle}
                >
                  <div>
                    {/* Card Top Address & Badge with Header Controls */}
                    <div className="border-b theme-border pb-3 mb-4 flex justify-between items-start gap-2 min-h-[4rem]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[0.65rem] uppercase tracking-widest theme-text-muted font-bold font-mono">
                            Typing Sector #{index + 1}
                          </span>
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-500/30 text-amber-300 font-mono font-semibold">
                            📁 {sector.group_name || 'General'}
                          </span>
                        </div>
                        <h2
                          className="text-base font-bold theme-text group-hover:text-amber-400 transition-colors mt-0.5 truncate leading-snug"
                          title={sector.story_title || sector.name}
                        >
                          {sector.story_title || sector.name}
                        </h2>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLocked ? (
                          <span className="bg-slate-900/80 text-slate-400 border border-slate-800 font-mono text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                            🔒 LOCKED
                          </span>
                        ) : isStoryFullyCleared ? (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            🎓 Cleared
                          </span>
                        ) : (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono text-xs px-2.5 py-1 rounded-full font-medium">
                            READY
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Sector Stats Bar: Star Badges & Coin Rewards */}
                    {!isLocked && (
                      <div className="flex justify-between items-center mb-4 px-3 py-2 bg-black/5 dark:bg-white/10 rounded-lg border theme-border text-xs">
                        {/* Star Badges */}
                        <div className="flex items-center gap-1 font-bold">
                          <span className="theme-text-muted mr-1 font-bold">STARS:</span>
                          <span className="tracking-widest">
                            {starsCount === 2 ? '⭐⭐' : starsCount === 1 ? '⭐☆' : '☆☆'}
                          </span>
                        </div>

                        {/* EXP Reward Indicator */}
                        <div className="text-amber-400 font-mono font-extrabold flex items-center gap-1">
                          ⚡ +300 EXP
                        </div>
                      </div>
                    )}

                    {/* Both Typing Modes Directly Accessible */}
                    <div className="flex flex-col gap-2.5">
                      {/* Stage 1: Story Chase */}
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLocked) return;
                          if (isTabletOrIPad) {
                            setDesktopOnlyPrompt('Story Chase requires a physical keyboard for typing practice. Please use a desktop browser.');
                            return;
                          }
                          onStartGame(sector, 'listening');
                        }}
                        aria-label={`Stage 01: Story Chase for ${sector.name}`}
                        className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-1 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
                          isLocked
                            ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                            : isTabletOrIPad
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                            : isClearedChase
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                            : 'bg-amber-500/20 border-amber-500/80 text-amber-600 dark:text-amber-200 font-bold shadow-sm shadow-amber-500/20 hover:bg-amber-500/30'
                        }`}
                      >
                        <span>01 // Story Chase 🏃💨</span>
                        <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                          {isLocked ? 'Locked 🔒' : isTabletOrIPad ? '💻 Desktop' : isClearedChase ? 'Done ⭐' : 'Play ▶'}
                        </span>
                      </button>

                      {/* Stage 2: Space Defender */}
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLocked) return;
                          if (isTabletOrIPad) {
                            setDesktopOnlyPrompt('Space Defender requires arrow keys and keyboard typing. Please use a desktop browser.');
                            return;
                          }
                          onStartGame(sector, 'falling');
                        }}
                        aria-label={`Stage 02: Space Defender for ${sector.name}`}
                        className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-2 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none ${
                          isLocked
                            ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                            : isTabletOrIPad
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                            : isClearedDefender
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                            : 'bg-orange-500/20 border-orange-500/80 text-orange-600 dark:text-orange-200 font-bold shadow-sm shadow-orange-500/20 hover:bg-orange-500/30'
                        }`}
                      >
                        <span>02 // Space Defender 👾</span>
                        <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                          {isLocked ? 'Locked 🔒' : isTabletOrIPad ? '💻 Desktop' : isClearedDefender ? 'Done ⭐' : 'Play ▶'}
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
    </div>
  );
};
