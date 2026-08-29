import React, { useState, useMemo } from 'react';
import './AdventureMap.css';
import { isIPadOrTabletDevice } from '../utils/device';
import {
  BuddySelectorModal,
  BUDDY_CHARACTERS,
  normalizeBuddyKey,
  RunnerSprite
} from './StoryChaseAssets';

export interface Island {
  id: number;
  name: string;
  group_name?: string;
  story_title: string;
  story_passage: string;
  story_questions: any;
  words?: any[];
  unlocked_stage: number;
  completed_stages_mask?: number;
  assigned_user_ids?: number[];
  story_passage_json?: Array<{
    paragraph_num: number;
    sentence_num: number;
    sentence_text: string;
    translation: string;
  }>;
}

interface AdventureMapProps {
  islands: Island[];
  currentUser: { id: number; username: string; coins: number; avatar?: string; stars?: number; spent_stars?: number; is_admin?: number };
  theme?: 'cyber' | 'bright';
  fontScale?: '100' | '115' | '130';
  onThemeChange?: (theme: 'cyber' | 'bright') => void;
  onFontScaleChange?: (scale: '100' | '115' | '130') => void;
  onStartGame: (island: Island, mode: 'story' | 'listening' | 'translation' | 'falling') => void;
  onLogout: () => void;
  onUpdateUser?: (updatedUser: any) => void;
}

export const AdventureMap: React.FC<AdventureMapProps> = ({
  islands,
  currentUser,
  theme = 'cyber',
  fontScale = '130',
  onThemeChange,
  onFontScaleChange,
  onStartGame,
  onLogout,
  onUpdateUser
}) => {
  const [isBuddyModalOpen, setIsBuddyModalOpen] = useState(false);
  const [savingBuddy, setSavingBuddy] = useState(false);

  const currentBuddy = useMemo(() => {
    const key = normalizeBuddyKey(currentUser.avatar);
    return BUDDY_CHARACTERS.find((b) => b.key === key) || BUDDY_CHARACTERS[0];
  }, [currentUser.avatar]);

  const handleSelectBuddy = async (buddyKey: string) => {
    setSavingBuddy(true);
    try {
      const res = await fetch('/api/users/update-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id, avatar: buddyKey })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          onUpdateUser?.(data.user);
        }
      }
    } catch (err) {
      console.error('Failed to update buddy:', err);
    } finally {
      setSavingBuddy(false);
      setIsBuddyModalOpen(false);
    }
  };
  // Extract unique groups from islands (excluding reserved ALL and __ALL__)
  const availableGroups = useMemo(() => {
    const groupSet = new Set<string>();
    islands.forEach((sector) => {
      let g = (sector.group_name && sector.group_name.trim()) || 'General';
      if (g.toUpperCase() === 'ALL' || g.toUpperCase() === '__ALL__') g = 'General';
      groupSet.add(g);
    });
    return Array.from(groupSet).sort((a, b) => {
      if (a === 'General') return -1;
      if (b === 'General') return 1;
      return a.localeCompare(b);
    });
  }, [islands]);

  // Persistent selected group state (null means ALL stories / No filter, outside user string namespace)
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

  // Device detection: detect iPad / tablet to restrict desktop-only stages
  const isTabletOrIPad = useMemo(() => isIPadOrTabletDevice(), []);
  const [desktopOnlyPrompt, setDesktopOnlyPrompt] = useState<string | null>(null);

  // Card Folding State: Set of collapsed island IDs
  const [collapsedCardIds, setCollapsedCardIds] = useState<Set<number>>(() => new Set());

  const toggleCardCollapse = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setCollapsedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Group statistics (count, stars, maxStars, completed stories)
  const { allStats, groupStats } = useMemo(() => {
    const all = {
      count: islands.length,
      totalStars: 0,
      maxStars: islands.length * 4,
      completedCount: 0
    };
    const groups: Record<string, { count: number; totalStars: number; maxStars: number; completedCount: number }> = {};

    islands.forEach((sector) => {
      const stage = sector.unlocked_stage ?? 1;
      let mask = sector.completed_stages_mask || 0;
      if (mask === 0 && stage > 1) {
        if (stage === 2) mask = 1;
        else if (stage === 3) mask = 3;
        else if (stage === 4) mask = 7;
        else if (stage >= 5) mask = 15;
      }
      const stars = (mask & 1 ? 1 : 0) + (mask & 2 ? 1 : 0) + (mask & 4 ? 1 : 0) + (mask & 8 ? 1 : 0);
      const isCompleted = (mask & 15) === 15 || stage >= 5;

      all.totalStars += stars;
      if (isCompleted) all.completedCount += 1;

      let g = (sector.group_name && sector.group_name.trim()) || 'General';
      if (g.toUpperCase() === 'ALL' || g.toUpperCase() === '__ALL__') g = 'General';
      if (!groups[g]) {
        groups[g] = { count: 0, totalStars: 0, maxStars: 0, completedCount: 0 };
      }
      groups[g].count += 1;
      groups[g].totalStars += stars;
      groups[g].maxStars += 4;
      if (isCompleted) groups[g].completedCount += 1;
    });

    return { allStats: all, groupStats: groups };
  }, [islands]);

  // Filtered islands based on selected group
  const displayedIslands = useMemo(() => {
    if (selectedGroup === null) return islands;
    return islands.filter((sector) => {
      let g = (sector.group_name && sector.group_name.trim()) || 'General';
      if (g.toUpperCase() === 'ALL' || g.toUpperCase() === '__ALL__') g = 'General';
      return g === selectedGroup;
    });
  }, [islands, selectedGroup]);

  // Global Expand / Collapse All control
  const allAreCollapsed = displayedIslands.length > 0 && displayedIslands.every((sector) => collapsedCardIds.has(sector.id));
  const handleToggleCollapseAll = () => {
    if (allAreCollapsed) {
      setCollapsedCardIds(new Set());
    } else {
      setCollapsedCardIds(new Set(displayedIslands.map((s) => s.id)));
    }
  };

  // Overall Progress calculations: total stars and max stars
  const totalStars = useMemo(() => {
    return islands.reduce((acc, sector) => {
      const stage = sector.unlocked_stage ?? 1;
      let mask = sector.completed_stages_mask || 0;
      if (mask === 0 && stage > 1) {
        if (stage === 2) mask = 1;
        else if (stage === 3) mask = 3;
        else if (stage === 4) mask = 7;
        else if (stage >= 5) mask = 15;
      }
      const stars = (mask & 1 ? 1 : 0) + (mask & 2 ? 1 : 0) + (mask & 4 ? 1 : 0) + (mask & 8 ? 1 : 0);
      return acc + stars;
    }, 0);
  }, [islands]);

  const maxStars = islands.length * 4;

  const currentGroupStat = selectedGroup !== null ? (groupStats[selectedGroup] || { count: 0, totalStars: 0, maxStars: 0, completedCount: 0 }) : allStats;

  // Active playing sector calculation (the first sector in progress or active)
  const activeSectorId = useMemo(() => {
    const activeSector = displayedIslands.find(
      (sector) => (sector.unlocked_stage ?? 1) > 0 && (sector.unlocked_stage ?? 1) <= 4
    );
    if (activeSector) return activeSector.id;
    const unlocked = displayedIslands.filter((sector) => (sector.unlocked_stage ?? 1) > 0);
    if (unlocked.length > 0) return unlocked[unlocked.length - 1].id;
    return displayedIslands[0]?.id;
  }, [displayedIslands]);

  return (
    <div className="min-h-screen w-full theme-bg theme-text font-mono p-4 sm:p-6 transition-colors duration-300">
      {/* Redesigned Modern Adventure Command Bar */}
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
              title="点击更换探险伙伴角色"
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
                  <span className="text-[10px] text-cyan-300/80 group-hover:text-cyan-200 underline">更改 ➔</span>
                </div>
              </div>
            </div>

            {/* Profile Switch Button */}
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 text-xs rounded-xl font-bold transition-all cursor-pointer bg-slate-900/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 font-mono shadow-sm shrink-0"
              title="切换玩家档案"
            >
              <span>👤</span>
              <span className="hidden sm:inline">切换档案</span>
            </button>
          </div>

          {/* Center: Treasury & Stars Mastery Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
            {/* Stars Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-mono">
              <span className="text-base leading-none">⭐</span>
              <div>
                <div className="text-[10px] uppercase text-amber-400/70 font-black tracking-wider leading-none">可用星星</div>
                <div className="text-sm font-black text-amber-300 tabular-nums">
                  {currentUser.stars !== undefined ? Math.max(0, currentUser.stars - (currentUser.spent_stars || 0)) : totalStars}
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

            {/* Quest Completion Progress Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 shadow-sm font-mono">
              <span className="text-base leading-none">🌟</span>
              <div>
                <div className="text-[10px] uppercase text-cyan-400/70 font-black tracking-wider leading-none">探险总星数</div>
                <div className="text-sm font-black text-cyan-300 tabular-nums">
                  {totalStars} <span className="text-xs text-cyan-500/60 font-normal">/ {maxStars}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Theme & Settings Control Cluster */}
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
            <button
              onClick={onLogout}
              className="p-2 text-xs border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1 font-mono shadow-sm"
              title="退出登录"
            >
              🚪
            </button>
          </div>

        </div>
      </header>

      {/* Sector Map Main Content */}
      <div className="w-full max-w-6xl mx-auto">
        {/* Header Summary */}
        <div className="flex flex-wrap justify-between items-end mb-6 gap-4 border-b theme-border pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 uppercase font-mono">
              Story Adventure Map 🗺️
            </h1>
            <p className="text-xs theme-text-muted font-mono mt-1">
              Pick a story to start reading and playing!
            </p>
          </div>
        </div>

        {/* Story Group Selector Tabs & Summary */}
        {islands.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs font-bold font-mono tracking-wider theme-text-muted">
                <span>📁 STORY GROUPS:</span>
                <span className="text-cyan-400 font-extrabold">
                  {selectedGroup === null ? `ALL STORIES (${islands.length})` : `${selectedGroup} (${currentGroupStat.count})`}
                </span>
              </div>
              <div className="text-xs font-mono theme-text-muted flex items-center gap-3 flex-wrap">
                <span>
                  🏆 Completed: <strong className="text-emerald-400 font-bold">{currentGroupStat.completedCount} / {currentGroupStat.count}</strong>
                </span>
                <span>
                  🌟 Group Stars: <strong className="text-amber-400 font-bold">{currentGroupStat.totalStars} / {currentGroupStat.maxStars}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleToggleCollapseAll}
                  className="px-2.5 py-1 rounded-lg border theme-border bg-black/20 dark:bg-white/10 text-[0.7rem] text-cyan-400 font-mono font-bold hover:bg-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title={allAreCollapsed ? "Expand all cards" : "Collapse all cards"}
                >
                  <span>{allAreCollapsed ? '📂' : '📁'}</span>
                  <span>{allAreCollapsed ? 'EXPAND ALL (展开全部)' : 'COLLAPSE ALL (折叠全部)'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable / Wrap Tab Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-black/10 dark:bg-white/5 p-2 rounded-xl border theme-border">
              {/* ALL Tab */}
              <button
                type="button"
                onClick={() => handleSelectGroup(null)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 border story-group-tab-pill ${
                  selectedGroup === null
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                    : 'bg-black/20 dark:bg-white/10 theme-border theme-text-muted hover:theme-text hover:border-cyan-500/40'
                }`}
              >
                <span>🌐 全部故事 (ALL)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                  selectedGroup === null ? 'bg-slate-950/40 text-cyan-200' : 'bg-black/30 text-slate-400'
                }`}>
                  {allStats.count}
                </span>
              </button>

              {/* Group Tabs */}
              {availableGroups.map((group) => {
                const stat = groupStats[group] || { count: 0, totalStars: 0, maxStars: 0 };
                const isSelected = selectedGroup === group;
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => handleSelectGroup(group)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 border story-group-tab-pill ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md shadow-cyan-500/20 scale-[1.02]'
                        : 'bg-black/20 dark:bg-white/10 theme-border theme-text-muted hover:theme-text hover:border-cyan-500/40'
                    }`}
                  >
                    <span>📂 {group}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isSelected ? 'bg-slate-950/40 text-cyan-200' : 'bg-black/30 text-slate-400'
                    }`}>
                      {stat.count}
                    </span>
                    {stat.totalStars > 0 && (
                      <span className={`text-[10px] ${isSelected ? 'text-slate-950 font-black' : 'text-amber-400 font-bold'}`}>
                        ⭐{stat.totalStars}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {islands.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md">
            <p className="text-sm theme-text-muted italic">
              No story islands available yet. Open parent console to add stories.
            </p>
          </div>
        ) : displayedIslands.length === 0 ? (
          <div className="theme-card p-12 rounded-xl text-center border theme-border shadow-md">
            <p className="text-sm theme-text-muted italic mb-4">
              No stories found in group "{selectedGroup}".
            </p>
            <button
              type="button"
              onClick={() => handleSelectGroup(null)}
              className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg uppercase tracking-wider font-mono hover:bg-cyan-400 cursor-pointer shadow-md"
            >
              View All Stories (查看全部故事)
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
            {displayedIslands.map((sector, index) => {
              const unlockedStage = sector.unlocked_stage ?? (index === 0 ? 1 : 0);
              const isLocked = unlockedStage === 0;
              const isActive = !isLocked && sector.id === activeSectorId;
              let completedMask = sector.completed_stages_mask || 0;
              if (completedMask === 0 && unlockedStage > 1) {
                if (unlockedStage === 2) completedMask = 1;
                else if (unlockedStage === 3) completedMask = 3;
                else if (unlockedStage === 4) completedMask = 7;
                else if (unlockedStage >= 5) completedMask = 15;
              }
              const starsCount = (completedMask & 1 ? 1 : 0) + (completedMask & 2 ? 1 : 0) + (completedMask & 4 ? 1 : 0) + (completedMask & 8 ? 1 : 0);
              const isCollapsed = collapsedCardIds.has(sector.id);

              // Determine card styling based on state specs
              let cardStyle = "relative group rounded-xl p-6 transition-all duration-300 border backdrop-blur-md flex flex-col justify-between story-card-collapsible ";
              if (isLocked) {
                cardStyle += "opacity-60 theme-card border-slate-700 cursor-not-allowed";
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
                    if (isCollapsed) {
                      setCollapsedCardIds((prev) => {
                        const next = new Set(prev);
                        next.delete(sector.id);
                        return next;
                      });
                    } else if (!isLocked) {
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
                          className="text-base font-bold theme-text group-hover:text-cyan-500 transition-colors mt-0.5 line-clamp-2 leading-snug"
                          title={sector.story_title || sector.name}
                        >
                          {sector.story_title || sector.name}
                        </h2>
                      </div>

                      {/* Status Badges & Collapse Toggle Chevron */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isLocked ? (
                          <span className="bg-slate-900/80 text-slate-400 border border-slate-800 font-mono text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                            🔒 LOCKED
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

                        <button
                          type="button"
                          onClick={(e) => toggleCardCollapse(e, sector.id)}
                          className="w-7 h-7 rounded-lg border theme-border bg-black/10 dark:bg-white/10 hover:bg-cyan-500/20 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 transition-all flex items-center justify-center cursor-pointer text-xs font-bold font-mono"
                          title={isCollapsed ? "展开关卡 (Expand Stages)" : "折叠关卡 (Collapse Stages)"}
                        >
                          {isCollapsed ? '▼' : '▲'}
                        </button>
                      </div>
                    </div>

                    {/* Sector Stats Bar: Star Badges & Coin Rewards */}
                    {!isLocked && (
                      <div className="flex justify-between items-center mb-4 px-3 py-2 bg-black/5 dark:bg-white/10 rounded-lg border theme-border text-xs">
                        {/* Star Badges */}
                        <div className="flex items-center gap-1 font-bold">
                          <span className="theme-text-muted mr-1 font-bold">STARS:</span>
                          <span className="tracking-widest">
                            {starsCount === 4 ? '⭐⭐⭐⭐' : starsCount === 3 ? '⭐⭐⭐☆' : starsCount === 2 ? '⭐⭐☆☆' : starsCount === 1 ? '⭐☆☆☆' : '☆☆☆☆'}
                          </span>
                        </div>

                        {/* Coin Reward Indicator */}
                        <div className="text-amber-500 dark:text-amber-400 font-mono font-extrabold flex items-center gap-1">
                          🪙 +300 Coins
                        </div>
                      </div>
                    )}

                    {/* Collapsed / Folded View vs Expanded Stage Buttons */}
                    {isCollapsed ? (
                      <div className="mt-2 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={(e) => toggleCardCollapse(e, sector.id)}
                          className="w-full flex justify-between items-center px-4 py-2.5 rounded-lg border theme-border bg-black/10 dark:bg-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/40 text-xs font-mono font-bold text-cyan-400 transition-all cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <span>▼ 关卡已折叠 (Stages Folded)</span>
                          </span>
                          <span className="text-[0.65rem] px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                            点击展开 4 个关卡 (Expand) ▾
                          </span>
                        </button>
                      </div>
                    ) : (
                      /* Full Stage Buttons - Direct Access Unlocked */
                      (() => {
                        let completedMask = sector.completed_stages_mask || 0;
                        if (completedMask === 0 && unlockedStage > 1) {
                          if (unlockedStage === 2) completedMask = 1;
                          else if (unlockedStage === 3) completedMask = 3;
                          else if (unlockedStage === 4) completedMask = 7;
                          else if (unlockedStage >= 5) completedMask = 15;
                        }

                        const isCleared1 = (completedMask & 1) !== 0;
                        const isCleared2 = (completedMask & 2) !== 0;
                        const isCleared3 = (completedMask & 4) !== 0;
                        const isCleared4 = (completedMask & 8) !== 0;

                        return (
                          <div className="flex flex-col gap-2.5">
                            {/* Stage 1 Button */}
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isLocked) onStartGame(sector, 'story');
                              }}
                              aria-label={`Stage 01: Reading and Typing for ${sector.name}`}
                              className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-1 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                                isLocked
                                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                                  : isCleared1
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                                  : 'bg-cyan-500/20 border-cyan-500/80 text-cyan-600 dark:text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
                              }`}
                            >
                              <span>01 // Reading & Typing 📖</span>
                              <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                                {isLocked ? 'Locked 🔒' : isCleared1 ? 'Done ⭐' : 'Play ▶'}
                              </span>
                            </button>

                            {/* Stage 2 Button */}
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isLocked) return;
                                if (isTabletOrIPad) {
                                  setDesktopOnlyPrompt('【02 // Story Chase 打字追逐大冒险】需要电脑实体键盘进行高速打字练习，iPad 暂不支持进入。请在电脑浏览器上打开本关卡，或在 iPad 上体验【01 绘本阅读】与【03 朗读匹配】！');
                                  return;
                                }
                                onStartGame(sector, 'listening');
                              }}
                              aria-label={`Stage 02: Story Chase for ${sector.name}`}
                              className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-2 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                                isLocked
                                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                                  : isTabletOrIPad
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                  : isCleared2
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                                  : 'bg-cyan-500/20 border-cyan-500/80 text-cyan-600 dark:text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
                              }`}
                            >
                              <span>02 // Story Chase 🏃💨</span>
                              <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                                {isLocked ? 'Locked 🔒' : isTabletOrIPad ? '💻 仅支持电脑' : isCleared2 ? 'Done ⭐' : 'Play ▶'}
                              </span>
                            </button>

                            {/* Stage 3 Button */}
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isLocked) onStartGame(sector, 'translation');
                              }}
                              aria-label={`Stage 03: Word Matching for ${sector.name}`}
                              className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-3 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                                isLocked
                                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                                  : isCleared3
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                                  : 'bg-cyan-500/20 border-cyan-500/80 text-cyan-600 dark:text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
                              }`}
                            >
                              <span>03 // Word Matching 🔤</span>
                              <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                                {isLocked ? 'Locked 🔒' : isCleared3 ? 'Done ⭐' : 'Play ▶'}
                              </span>
                            </button>

                            {/* Stage 4 Button */}
                            <button
                              type="button"
                              disabled={isLocked}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isLocked) return;
                                if (isTabletOrIPad) {
                                  setDesktopOnlyPrompt('【04 // Space Defender 太空防卫大作战】需要电脑实体键盘方向键与按键配合防卫太空战机，iPad 暂不支持进入。请在电脑浏览器上打开本关卡，或在 iPad 上体验【01 绘本阅读】与【03 朗读匹配】！');
                                  return;
                                }
                                onStartGame(sector, 'falling');
                              }}
                              aria-label={`Stage 04: Space Defender for ${sector.name}`}
                              className={`w-full flex justify-between items-center p-3 rounded-lg border text-xs transition-colors cursor-pointer font-mono stage-stagger-4 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                                isLocked
                                  ? 'bg-slate-900/40 border-slate-800/60 text-slate-600 cursor-not-allowed'
                                  : isTabletOrIPad
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                  : isCleared4
                                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-bold hover:bg-emerald-500/20'
                                  : 'bg-cyan-500/20 border-cyan-500/80 text-cyan-600 dark:text-cyan-200 font-bold shadow-sm shadow-cyan-500/20 hover:bg-cyan-500/30'
                              }`}
                            >
                              <span>04 // Space Defender 👾</span>
                              <span className="text-[0.65rem] uppercase font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10 border theme-border tabular-nums">
                                {isLocked ? 'Locked 🔒' : isTabletOrIPad ? '💻 仅支持电脑' : isCleared4 ? 'Done ⭐' : 'Play ▶'}
                              </span>
                            </button>
                          </div>
                        );
                      })()
                    )}
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

        {/* Desktop-Only Device Restriction Guidance Modal */}
        {desktopOnlyPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0F172A] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center gap-5 relative">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-3xl shadow-inner">
                💻
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-cyan-300 font-mono tracking-wide">
                  仅支持在电脑端游玩 (Desktop Only)
                </h3>
                <p className="text-xs text-slate-300 font-mono leading-relaxed text-left bg-slate-900/90 p-4 rounded-xl border border-slate-800">
                  {desktopOnlyPrompt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDesktopOnlyPrompt(null)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:opacity-95 text-slate-950 font-mono font-bold text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all active:scale-98 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
              >
                我知道了 (OK)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
