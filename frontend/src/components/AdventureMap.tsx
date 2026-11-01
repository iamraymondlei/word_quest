import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './AdventureMap.css';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import { apiService } from '../utils/apiService';
import {
  BuddySelectorModal,
  BUDDY_CHARACTERS,
  normalizeBuddyKey,
  RunnerSprite
} from './StoryChaseAssets';
import { WordBankMap } from './WordBankMap';

export interface Island {
  id: number;
  name: string;
  group_name?: string;
  story_title: string;
  story_passage: string;
  story_questions: any;
  words?: any[];
  word_book_id?: number | null;
  unlocked_stage: number;
  completed_stages_mask?: number;
  stage1_answers?: string[];
  assigned_user_ids?: number[];
  story_passage_json?: Array<{
    paragraph_num: number;
    sentence_num: number;
    sentence_text: string;
    translation: string;
    illustration_url?: string | null;
  }>;
}

interface AdventureMapProps {
  islands: Island[];
  currentUser: { id: number; username: string; coins: number; avatar?: string; stars?: number; spent_stars?: number; is_admin?: number };
  theme?: 'cyber' | 'bright';
  fontScale?: '100' | '115' | '130';
  onThemeChange?: (theme: 'cyber' | 'bright') => void;
  onFontScaleChange?: (scale: '100' | '115' | '130') => void;
  onStartGame: (island: Island, mode: 'story' | 'listening' | 'translation' | 'falling', subMode?: 'reading' | 'testing') => void;
  onLogout: () => void;
  onUpdateUser?: (updatedUser: any) => void;
  onOpenWordBank?: () => void;
  onOpenSongs?: () => void;
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
  if ((mask & 4) !== 0) {
    mask |= 16;
  }
  return mask & 31;
};

const isSectorCompleted = (sector: Island): boolean => {
  const mask = getSectorMask(sector);
  return (mask & 1) !== 0 && (mask & 4) !== 0 && (mask & 16) !== 0;
};

export const AdventureMap: React.FC<AdventureMapProps> = ({
  islands,
  currentUser,
  theme = 'cyber',
  fontScale = '130',
  onFontScaleChange,
  onStartGame,
  onLogout,
  onUpdateUser,
  onOpenWordBank,
  onOpenSongs,
  hideHeader = false
}) => {
  const [isBuddyModalOpen, setIsBuddyModalOpen] = useState(false);
  const [isWordBankModalOpen, setIsWordBankModalOpen] = useState(false);
  const [savingBuddy, setSavingBuddy] = useState(false);

  const currentBuddy = useMemo(() => {
    const key = normalizeBuddyKey(currentUser.avatar);
    return BUDDY_CHARACTERS.find((b) => b.key === key) || BUDDY_CHARACTERS[0];
  }, [currentUser.avatar]);

  const handleSelectBuddy = async (buddyKey: string) => {
    setSavingBuddy(true);
    try {
      await apiService.updateAvatar(currentUser.id, buddyKey);
      onUpdateUser?.({ ...currentUser, avatar: buddyKey });
    } catch (err) {
      console.error('Failed to update buddy:', err);
    } finally {
      setSavingBuddy(false);
      setIsBuddyModalOpen(false);
    }
  };

  // Persistent selected group state (null means ALL stories / No filter)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(() => {
    try {
      const saved = localStorage.getItem('wordquest_selected_group');
      if (!saved || saved === 'ALL' || saved === '__ALL__' || saved.trim() === '') return null;
      return saved;
    } catch {
      return null;
    }
  });

  const handleSelectGroup = (group: string | null) => {
    setSelectedGroup(group);
    try {
      if (group === null) {
        localStorage.setItem('wordquest_selected_group', 'ALL');
      } else {
        localStorage.setItem('wordquest_selected_group', group);
      }
    } catch (e) {
      console.error('Failed to save selected group to localStorage', e);
    }
  };

  // "Show 4-Star Completed Stories" toggle state per user (default: false -> 4-star completed cards are hidden)
  const showCompletedStorageKey = `wordquest_show_completed_4star_${currentUser.id}`;
  const [showCompletedCards, setShowCompletedCards] = useState<boolean>(() => {
    try {
      return localStorage.getItem(showCompletedStorageKey) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      setShowCompletedCards(localStorage.getItem(showCompletedStorageKey) === 'true');
    } catch {
      setShowCompletedCards(false);
    }
  }, [showCompletedStorageKey]);

  const handleToggleShowCompleted = () => {
    setShowCompletedCards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(showCompletedStorageKey, String(next));
      } catch (e) {
        console.error('Failed to save showCompleted state', e);
      }
      return next;
    });
  };

  // Group statistics (count, stars, maxStars, completed stories)
  const { allStats, groupStats } = useMemo(() => {
    const all = {
      count: islands.length,
      totalStars: 0,
      maxStars: islands.length * 3,
      completedCount: 0
    };
    const groups: Record<string, { count: number; totalStars: number; maxStars: number; completedCount: number }> = {};

    islands.forEach((sector) => {
      const mask = getSectorMask(sector);
      const stars = (mask & 1 ? 1 : 0) + (mask & 4 ? 1 : 0) + (mask & 16 ? 1 : 0);
      const isCompleted = isSectorCompleted(sector);

      all.totalStars += stars;
      if (isCompleted) all.completedCount += 1;

      const g = normalizeGroupName(sector.group_name);
      if (!groups[g]) {
        groups[g] = { count: 0, totalStars: 0, maxStars: 0, completedCount: 0 };
      }
      groups[g].count += 1;
      groups[g].totalStars += stars;
      groups[g].maxStars += 3;
      if (isCompleted) groups[g].completedCount += 1;
    });

    return { allStats: all, groupStats: groups };
  }, [islands]);

  // Check whether a group is 100% completed (all stories in the group have 3 stars)
  const isGroupCompleted = useCallback(
    (groupName: string): boolean => {
      const stat = groupStats[groupName];
      return Boolean(stat && stat.count > 0 && stat.completedCount === stat.count);
    },
    [groupStats]
  );

  // Extract unique groups from islands, sorting active groups first and completed groups to the end
  const availableGroups = useMemo(() => {
    const groupSet = new Set<string>();
    islands.forEach((sector) => {
      groupSet.add(normalizeGroupName(sector.group_name));
    });
    return Array.from(groupSet).sort((a, b) => {
      const aDone = isGroupCompleted(a);
      const bDone = isGroupCompleted(b);
      if (aDone !== bDone) return aDone ? 1 : -1;
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
  }, [islands, isGroupCompleted]);

  // Filtered islands based on selected group and showCompletedCards toggle (default hides 3-star completed cards)
  const displayedIslands = useMemo(() => {
    const byGroup = selectedGroup === null
      ? islands
      : islands.filter((sector) => normalizeGroupName(sector.group_name) === selectedGroup);
    if (showCompletedCards) return byGroup;
    return byGroup.filter((sector) => !isSectorCompleted(sector));
  }, [islands, selectedGroup, showCompletedCards]);

  // Overall Progress calculations: total stars and max stars (Story Map has 3 stages: Reading & 2 Word Matching modes)
  const totalStars = useMemo(() => {
    return islands.reduce((acc, sector) => {
      const mask = getSectorMask(sector);
      const stars = (mask & 1 ? 1 : 0) + (mask & 4 ? 1 : 0) + (mask & 16 ? 1 : 0);
      return acc + stars;
    }, 0);
  }, [islands]);

  const maxStars = islands.length * 3;

  const currentGroupStat = selectedGroup !== null ? (groupStats[selectedGroup] || { count: 0, totalStars: 0, maxStars: 0, completedCount: 0 }) : allStats;

  // Active playing sector calculation (the first unlocked sector that is not yet 4-star completed)
  const activeSectorId = useMemo(() => {
    const activeSector = displayedIslands.find(
      (sector) => (sector.unlocked_stage ?? 1) > 0 && !isSectorCompleted(sector)
    );
    if (activeSector) return activeSector.id;
    const unlocked = displayedIslands.filter((sector) => (sector.unlocked_stage ?? 1) > 0);
    if (unlocked.length > 0) return unlocked[unlocked.length - 1].id;
    return displayedIslands[0]?.id;
  }, [displayedIslands]);

  if (isWordBankModalOpen) {
    return (
      <WordBankMap
        currentUser={currentUser}
        theme={theme}
        fontScale={fontScale}
        onFontScaleChange={onFontScaleChange}
        onBackToStories={() => setIsWordBankModalOpen(false)}
        onLogout={onLogout}
        onUpdateUser={onUpdateUser}
      />
    );
  }

  return (
    <div className="min-h-screen w-full theme-bg theme-text font-mono p-4 sm:p-6 transition-colors duration-300">
      {/* Redesigned Modern Adventure Command Bar */}
      {!hideHeader && (
      <header className="w-full max-w-6xl mx-auto mb-8 relative z-20">
        <div className="theme-card border theme-border rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-5">
          
          {/* Left: Adventurer Identity Hero Card */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between sm:justify-start">
            {/* Interactive Buddy Pod / Stage */}
            <div
              onClick={() => setIsBuddyModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsBuddyModalOpen(true); }}
              title="Change Buddy"
              className="group relative flex items-center gap-3 bg-gradient-to-br from-slate-900/90 to-cyan-950/40 hover:from-cyan-950/60 hover:to-blue-950/60 border border-cyan-500/30 hover:border-cyan-400 p-2 pr-3.5 rounded-2xl cursor-pointer shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Unclipped Full Buddy Display Platform */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-950/80 border border-cyan-500/30 flex items-center justify-center relative shrink-0 shadow-inner group-hover:border-cyan-400">
                <div className="absolute bottom-1 w-8 h-1 bg-black/70 rounded-full blur-xs pointer-events-none" />
                <div className="relative z-10 w-full h-full flex items-center justify-center transform group-hover:scale-110 group-hover:-translate-y-0.5 transition-transform duration-300">
                  <RunnerSprite avatar={currentBuddy.key} isSprinting={false} />
                </div>
              </div>

              {/* Player Name & Buddy Meta */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black text-white font-mono tracking-wide truncate">
                    {currentUser.username}
                  </span>
                  <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-1.5 py-0.5 rounded font-black font-mono">
                    LV.{(currentUser.stars || totalStars) > 10 ? 'HERO' : 'NOVICE'}
                  </span>
                </div>
                <div className="text-xs text-cyan-400 font-bold font-mono mt-0.5 flex items-center gap-1.5">
                  <span>{currentBuddy.name}</span>
                  <span className="text-[10px] text-cyan-300/80 group-hover:text-cyan-200 underline">Change ➔</span>
                </div>
              </div>
            </div>

            {/* Profile Switch Button */}
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 text-xs rounded-xl font-bold transition-all cursor-pointer bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 font-mono shadow-sm shrink-0"
              title="Switch User"
            >
              <span>👤</span>
              <span className="hidden sm:inline">Switch</span>
            </button>

            {/* Word Bank & Exploration Lab Button */}
            <button
              type="button"
              onClick={() => {
                if (onOpenWordBank) {
                  onOpenWordBank();
                } else {
                  setIsWordBankModalOpen(true);
                }
              }}
              className="px-3.5 py-2 text-xs rounded-xl font-black transition-all cursor-pointer bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 hover:from-cyan-600/50 hover:to-indigo-600/50 border border-cyan-400/50 text-cyan-300 hover:text-white flex items-center gap-1.5 font-mono shadow-md active:scale-95 shrink-0"
              title="Word Challenge"
            >
              <span className="text-sm">📚</span>
              <span>Word Quest</span>
            </button>

            {/* Song Adventure Map Button */}
            {onOpenSongs && (
              <button
                type="button"
                onClick={onOpenSongs}
                className="px-3.5 py-2 text-xs rounded-xl font-black transition-all cursor-pointer bg-gradient-to-r from-purple-600/30 to-pink-600/30 hover:from-purple-600/50 hover:to-pink-600/50 border border-purple-400/50 text-purple-300 hover:text-white flex items-center gap-1.5 font-mono shadow-md active:scale-95 shrink-0"
                title="Song Quest"
              >
                <span className="text-sm">🎵</span>
                <span>Song Quest</span>
              </button>
            )}
          </div>

          {/* Center: Treasury & Stars Mastery Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
            {/* Stars Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-mono">
              <span className="text-base leading-none">⭐</span>
              <div>
                <div className="text-[10px] uppercase text-amber-400/70 font-black tracking-wider leading-none">Available Stars</div>
                <div className="text-sm font-black text-amber-300 tabular-nums">
                  {currentUser.stars !== undefined ? Math.max(0, currentUser.stars - (currentUser.spent_stars || 0)) : totalStars}
                </div>
              </div>
            </div>

            {/* Quest Completion Progress Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 shadow-sm font-mono">
              <span className="text-base leading-none">🌟</span>
              <div>
                <div className="text-[10px] uppercase text-cyan-400/70 font-black tracking-wider leading-none">Total Stars</div>
                <div className="text-sm font-black text-cyan-300 tabular-nums">
                  {totalStars} <span className="text-xs text-cyan-500/60 font-normal">/ {maxStars}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Theme & Settings Control Cluster */}
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
            <button
              onClick={onLogout}
              className="p-2 text-xs border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1 font-mono shadow-sm"
              title="Exit"
            >
              🚪
            </button>
          </div>

        </div>
      </header>
      )}

      {/* Sector Map Main Content */}
      <div className="w-full max-w-6xl mx-auto">
        {/* Compact Header & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3 border-b theme-border pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 uppercase font-mono">
              🗺️ Story Adventure
            </h1>

            {islands.length > 0 && (
              <>
                <select
                  value={selectedGroup === null ? '__ALL__' : selectedGroup}
                  onChange={(e) => handleSelectGroup(e.target.value === '__ALL__' ? null : e.target.value)}
                  className="bg-slate-900/90 border border-slate-700 hover:border-cyan-400/60 focus:border-cyan-400 text-cyan-300 text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl outline-none cursor-pointer transition-all"
                  title="Select Story Group"
                >
                  <option value="__ALL__">
                    🌐 All Stories ({allStats.count})
                  </option>
                  {availableGroups.map((group) => {
                    const stat = groupStats[group] || { count: 0, totalStars: 0, maxStars: 0, completedCount: 0 };
                    const isClearedGroup = isGroupCompleted(group);
                    return (
                      <option key={group} value={group}>
                        {isClearedGroup ? '🏆' : '📂'} {group} ({stat.count}){stat.totalStars > 0 ? ` · ⭐${stat.totalStars}` : ''}
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
                        : 'theme-border bg-black/20 dark:bg-white/10 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300'
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

        {islands.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md">
            <p className="text-sm theme-text-muted italic">
              No story islands available yet. Open parent console to add stories.
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
                  handleSelectGroup(null);
                }
              }}
              className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider font-mono hover:bg-cyan-400 cursor-pointer shadow-md"
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
              const isActive = !isLocked && sector.id === activeSectorId;
              const completedMask = getSectorMask(sector);
              const isCleared1 = (completedMask & 1) !== 0;
              const isCleared2 = (completedMask & 4) !== 0;
              const isCleared3 = (completedMask & 16) !== 0;
              const starsCount = (isCleared1 ? 1 : 0) + (isCleared2 ? 1 : 0) + (isCleared3 ? 1 : 0);
              const isStoryFullyCleared = isSectorCompleted(sector);

              // Determine card styling based on state specs
              let cardStyle = "relative group rounded-xl p-6 transition-all duration-300 border backdrop-blur-md flex flex-col justify-between ";
              if (isLocked) {
                cardStyle += "opacity-60 theme-card border-slate-700 cursor-not-allowed";
              } else if (isStoryFullyCleared) {
                cardStyle += "theme-card border-emerald-500/40 hover:border-emerald-400/70";
              } else if (isActive) {
                cardStyle += "theme-card border-cyan-500/80 shadow-lg shadow-cyan-500/20 hover:border-cyan-400";
              } else {
                cardStyle += "theme-card border-slate-700 hover:border-cyan-500/40";
              }

              return (
                <div
                  key={sector.id}
                  className={cardStyle}
                  onClick={() => {
                    if (!isLocked) {
                      onStartGame(sector, 'story');
                    }
                  }}
                >
                  <div>
                    {/* Card Top Address & Badge with Header Controls */}
                    <div className="border-b theme-border pb-3 mb-4 flex justify-between items-start gap-2 min-h-[4rem]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[0.65rem] uppercase tracking-widest theme-text-muted font-bold">
                            Story Island #{index + 1}
                          </span>
                          <span className="text-[0.6rem] px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono font-semibold">
                            📁 {sector.group_name || 'General'}
                          </span>
                        </div>
                        <h2
                          className="text-base font-bold theme-text group-hover:text-cyan-500 transition-colors mt-0.5 truncate leading-snug"
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
                        ) : isActive ? (
                          <span className="bg-cyan-500/20 text-cyan-400 animate-pulse font-mono border border-cyan-500/40 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                            ▶ PLAYING
                          </span>
                        ) : (
                          <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-mono text-xs px-2.5 py-1 rounded-full font-medium">
                            UNLOCKED
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
                            {starsCount === 3 ? '⭐⭐⭐' : starsCount === 2 ? '⭐⭐☆' : starsCount === 1 ? '⭐☆☆' : '☆☆☆'}
                          </span>
                        </div>

                        {/* EXP Reward Indicator */}
                        <div className="text-cyan-400 font-mono font-extrabold flex items-center gap-1">
                          ⚡ +300 EXP
                        </div>
                      </div>
                    )}

                    {/* Full Stage Buttons - Direct Access Unlocked (3 Tasks) */}
                    <div className="flex flex-col gap-2.5">
                      {/* Stage 1 Button: Reading & Typing */}
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLocked) onStartGame(sector, 'story');
                        }}
                        aria-label={`Stage 01: Reading and Typing for ${sector.name}`}
                        className={`w-full flex justify-between items-center h-10 px-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-1 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                          isLocked
                            ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                            : isCleared1
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                            : 'bg-cyan-500/20 border-cyan-500/80 text-cyan-600 dark:text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
                        }`}
                      >
                        <span className="truncate whitespace-nowrap">01 // Reading & Typing 📖</span>
                        <span className="shrink-0 ml-2 text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                          {isLocked ? 'Locked 🔒' : isCleared1 ? 'Done ⭐' : 'Play ▶'}
                        </span>
                      </button>

                      {/* Stage 2 Button: Read Aloud */}
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLocked) onStartGame(sector, 'translation', 'reading');
                        }}
                        aria-label={`Stage 02: Read Aloud for ${sector.name}`}
                        className={`w-full flex justify-between items-center h-10 px-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-2 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                          isLocked
                            ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                            : isCleared2
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                            : 'bg-cyan-500/20 border-cyan-500/80 text-cyan-600 dark:text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
                        }`}
                      >
                        <span className="truncate whitespace-nowrap">02 // Read Aloud 🎙️</span>
                        <span className="shrink-0 ml-2 text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                          {isLocked ? 'Locked 🔒' : isCleared2 ? 'Done ⭐' : 'Play ▶'}
                        </span>
                      </button>

                      {/* Stage 3 Button: Challenge */}
                      <button
                        type="button"
                        disabled={isLocked}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLocked) onStartGame(sector, 'translation', 'testing');
                        }}
                        aria-label={`Stage 03: Challenge for ${sector.name}`}
                        className={`w-full flex justify-between items-center h-10 px-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-3 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                          isLocked
                            ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                            : isCleared3
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                            : 'bg-purple-500/20 border-purple-500/80 text-purple-600 dark:text-purple-200 font-bold shadow-sm shadow-purple-500/20 hover:bg-purple-500/30'
                        }`}
                      >
                        <span className="truncate whitespace-nowrap">03 // Challenge 🎯</span>
                        <span className="shrink-0 ml-2 text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                          {isLocked ? 'Locked 🔒' : isCleared3 ? 'Done ⭐' : 'Play ▶'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Buddy Selection Modal */}
        <BuddySelectorModal
          isOpen={isBuddyModalOpen}
          onClose={() => setIsBuddyModalOpen(false)}
          currentAvatar={currentUser.avatar || 'dino'}
          onSelectBuddy={handleSelectBuddy}
          loading={savingBuddy}
        />

      </div>
    </div>
  );
};
