import React, { useState, useMemo, useEffect } from 'react';
import {
  BuddySelectorModal,
  BUDDY_CHARACTERS,
  normalizeBuddyKey,
  RunnerSprite
} from './StoryChaseAssets';
import { apiService } from '../utils/apiService';
import {
  calcRankProgress,
  formatExpNumber,
  formatCompactExp
} from '../utils/rankService';
import { RankRoadModal } from './RankRoadModal';

export type SidebarMode = 'map' | 'vocab' | 'songs';

interface AppSidebarProps {
  currentMode: SidebarMode;
  onNavigate: (mode: SidebarMode) => void;
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
  onLogout: () => void;
  onOpenAdmin?: () => void;
  onUpdateUser?: (updatedUser: any) => void;
  totalStars?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentMode,
  onNavigate,
  currentUser,
  theme = 'cyber',
  onLogout,
  onOpenAdmin,
  onUpdateUser,
  totalStars = 0
}) => {
  // Collapsed state persisted in localStorage
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wordquest_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('wordquest_sidebar_collapsed', next ? 'true' : 'false');
      } catch {}
      return next;
    });
  };

  // Buddy avatar selection state
  const [isBuddyModalOpen, setIsBuddyModalOpen] = useState(false);
  const [savingBuddy, setSavingBuddy] = useState(false);

  // Career Rank Road modal state & peer users
  const [isRankRoadModalOpen, setIsRankRoadModalOpen] = useState(false);
  const [peerUsers, setPeerUsers] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchPeers = async () => {
      try {
        const users = await apiService.getUsers();
        if (isMounted && Array.isArray(users)) {
          setPeerUsers(users);
        }
      } catch (err) {
        console.warn('Failed to load peers for rank road modal:', err);
      }
    };
    fetchPeers();
    return () => {
      isMounted = false;
    };
  }, []);

  const rankProgress = useMemo(() => {
    return calcRankProgress(currentUser?.coins || 0);
  }, [currentUser?.coins]);

  const currentBuddy = useMemo(() => {
    const key = normalizeBuddyKey(currentUser?.avatar);
    return BUDDY_CHARACTERS.find((b) => b.key === key) || BUDDY_CHARACTERS[0];
  }, [currentUser?.avatar]);

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

  // Calculated star balances
  const availableStars = useMemo(() => {
    if (currentUser?.stars !== undefined) {
      return Math.max(0, currentUser.stars - (currentUser.spent_stars || 0));
    }
    return totalStars;
  }, [currentUser?.stars, currentUser?.spent_stars, totalStars]);

  return (
    <>
      <aside
        id="app-sidebar"
        className={`h-screen shrink-0 relative z-30 flex flex-col justify-between transition-all duration-300 ease-in-out font-mono select-none ${
          isCollapsed ? 'w-[72px] p-2.5' : 'w-60 sm:w-64 p-4'
        } ${
          theme === 'bright'
            ? 'bg-white/95 text-slate-800 border-r border-slate-200 shadow-md'
            : 'bg-slate-950/90 text-slate-100 border-r border-slate-800/80 backdrop-blur-xl shadow-2xl'
        }`}
      >
        {/* Decorative Right Gradient Border Seam */}
        <div className="absolute top-0 right-0 bottom-0 w-[1.5px] bg-gradient-to-b from-cyan-500/40 via-purple-500/20 to-transparent pointer-events-none" />

        {/* Floating Edge Toggle Handle (Prominent when collapsed) */}
        {isCollapsed && (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="absolute -right-3.5 top-6 z-50 w-7 h-7 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.7)] border-2 border-slate-950 cursor-pointer transition-transform hover:scale-110 active:scale-95"
            title="展开侧边栏 (240px)"
          >
            <span className="text-xs leading-none">›</span>
          </button>
        )}

        {/* ── TOP REGION: BRAND + PROFILE + NAVIGATION ── */}
        <div className="flex flex-col gap-4 overflow-x-hidden">
          
          {/* Brand Header & Toggle */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-1.5 min-h-[40px]">
              <div
                onClick={() => onNavigate('map')}
                className="flex items-center gap-2.5 cursor-pointer group min-w-0"
                title="回到故事地图"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)] group-hover:scale-105 transition-transform shrink-0">
                  <span className="text-lg">🧭</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-base font-black tracking-tight flex items-center leading-none text-white">
                    Word<span className="text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">Quest</span>
                  </span>
                  <span className="text-[9px] text-cyan-400/80 tracking-widest uppercase mt-0.5 font-bold">
                    Kids Adventure
                  </span>
                </div>
              </div>

              {/* Collapse Toggle Button */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="w-8 h-8 rounded-xl bg-slate-900/90 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-400 text-cyan-400 flex items-center justify-center text-xs font-black transition-all cursor-pointer shadow-sm shrink-0 active:scale-90"
                title="收起导航栏 (72px 极简轨)"
              >
                ‹
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 w-full">
              {/* Compass Logo */}
              <div
                onClick={() => onNavigate('map')}
                className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)] hover:scale-105 transition-transform cursor-pointer"
                title="回到故事地图"
              >
                <span className="text-xl">🧭</span>
              </div>

              {/* Dedicated Expand Trigger Button */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="w-full py-1.5 px-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 group"
                title="展开侧边栏 (240px)"
              >
                <span>展开</span>
                <span className="text-xs font-black group-hover:translate-x-0.5 transition-transform">›</span>
              </button>
            </div>
          )}

          {/* Student Profile Identity Capsule with Career Rank & EXP Progress */}
          {!isCollapsed ? (
            <div
              className={`p-3 rounded-2xl border transition-all shadow-sm ${
                theme === 'bright'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-900/80 border-cyan-500/30'
              }`}
            >
              {/* Top: Avatar Platform + Username + Rank Tier Badge */}
              <div className="flex items-center gap-2.5">
                {/* 3D Buddy Platform with Rank Corner Badge */}
                <div
                  onClick={() => setIsBuddyModalOpen(true)}
                  className="w-11 h-11 rounded-xl bg-slate-950/80 border border-cyan-400/40 flex items-center justify-center relative shrink-0 shadow-inner hover:border-cyan-300 cursor-pointer group/avatar"
                  title="点击更换探险伙伴角色"
                >
                  <div className="relative z-10 w-full h-full flex items-center justify-center transform group-hover/avatar:scale-110 transition-transform duration-300">
                    <RunnerSprite avatar={currentBuddy.key} isSprinting={false} />
                  </div>
                  {/* Rank Badge Corner Indicator */}
                  <span
                    className="absolute -bottom-1 -right-1 text-xs bg-slate-950 rounded-full border border-slate-800 p-0.5 shadow-sm"
                    title={rankProgress.fullTitle}
                  >
                    {rankProgress.badge}
                  </span>
                </div>

                {/* Name & Dynamic Career Tier Badge */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-black truncate text-white">
                      {currentUser?.username || 'Learner'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRankRoadModalOpen(true)}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono border flex items-center gap-1 shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 ${rankProgress.theme.badgeBg} ${rankProgress.theme.badgeBorder} ${rankProgress.theme.badgeText} ${rankProgress.theme.badgeGlow}`}
                      title="点击查看军衔晋升谱系"
                    >
                      <span>{rankProgress.badge}</span>
                      <span>{rankProgress.shortTitle}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] mt-0.5">
                    <span className="text-cyan-400 font-bold truncate">{currentBuddy.name}</span>
                    <button
                      type="button"
                      onClick={() => setIsBuddyModalOpen(true)}
                      className="text-[9px] text-slate-400 hover:text-cyan-300 shrink-0 cursor-pointer"
                    >
                      更换 ➔
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom: EXP Progress Bar within Current Level */}
              <div
                onClick={() => setIsRankRoadModalOpen(true)}
                className="mt-2.5 pt-2 border-t border-slate-800/80 cursor-pointer group/exp"
                title="点击查看军衔升级谱系详情"
              >
                <div className="flex items-center justify-between text-[10px] font-mono leading-none mb-1">
                  <span className="text-slate-400 group-hover/exp:text-cyan-300 transition-colors">
                    {formatExpNumber(rankProgress.expInLevel)} / {formatExpNumber(rankProgress.levelSpan)} EXP
                  </span>
                  <span className={`font-bold ${rankProgress.theme.accentText}`}>
                    {rankProgress.progressPercent}%
                  </span>
                </div>

                {/* Progress Bar Track */}
                <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden p-0.2 border border-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${rankProgress.theme.progressBarGradient} transition-all duration-500`}
                    style={{ width: `${Math.max(4, Math.min(100, rankProgress.progressPercent))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mt-1">
                  <span>Lv.{rankProgress.level}</span>
                  <span className="text-slate-400 group-hover/exp:text-cyan-300 transition-colors">
                    {rankProgress.isMaxLevel ? '🌟 极境满星' : `还需 ${formatCompactExp(rankProgress.remainingExpToNextLevel)} EXP 升Lv.${rankProgress.level + 1}`}
                  </span>
                  <span>Lv.{Math.min(5, rankProgress.level + 1)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group w-full flex justify-center cursor-pointer">
              <button
                type="button"
                onClick={() => setIsRankRoadModalOpen(true)}
                className="w-11 h-11 rounded-xl bg-slate-950/80 border border-cyan-400/40 hover:border-cyan-300 flex items-center justify-center shadow-inner transition-transform hover:scale-110 relative"
                title={`${currentUser?.username || 'Learner'} · ${rankProgress.fullTitle}`}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <RunnerSprite avatar={currentBuddy.key} isSprinting={false} />
                </div>
                {/* Micro corner badge with rank icon */}
                <span className="absolute -bottom-1 -right-1 text-xs bg-slate-950 rounded-full border border-slate-800 p-0.5 shadow-sm">
                  {rankProgress.badge}
                </span>
              </button>

              {/* Floating Tooltip in collapsed mode */}
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 p-2.5 rounded-xl bg-slate-900 border border-cyan-400/50 text-white font-mono text-xs whitespace-nowrap shadow-xl z-50 flex flex-col gap-1">
                <div className="font-bold flex items-center gap-1.5">
                  <span>{currentUser?.username}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border ${rankProgress.theme.badgeBg} ${rankProgress.theme.badgeBorder} ${rankProgress.theme.badgeText}`}>
                    {rankProgress.badge} {rankProgress.shortTitle}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  经验: {formatExpNumber(rankProgress.expInLevel)} / {formatExpNumber(rankProgress.levelSpan)} EXP ({rankProgress.progressPercent}%)
                </div>
                <div className="text-[9px] text-amber-300">
                  {rankProgress.isMaxLevel ? '🌟 已登顶极境' : `距升下一级还需 ${formatExpNumber(rankProgress.remainingExpToNextLevel)} EXP`}
                </div>
                <div className="text-[9px] text-cyan-400/80 mt-0.5 border-t border-slate-800 pt-1">
                  💡 点击查看星际探险军衔谱系
                </div>
              </div>
            </div>
          )}

          {/* ── 3 CORE EXPLORATION DIMENSIONS NAVIGATION ── */}
          <nav className="flex flex-col gap-2 pt-1">
            {!isCollapsed && (
              <div className="text-[10px] text-slate-400 font-black tracking-wider uppercase px-2 mb-1">
                探险航道 (ROUTES)
              </div>
            )}

            {/* 1. 故事地图 (Story Adventure) */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => onNavigate('map')}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center cursor-pointer border ${
                  isCollapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3'
                } ${
                  currentMode === 'map'
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)] ring-1 ring-cyan-400/50 font-black'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
                title={isCollapsed ? '故事地图 (Story Adventure)' : undefined}
              >
                <span className="text-xl leading-none shrink-0">🗺️</span>
                {!isCollapsed && (
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <span className="font-black tracking-wide text-white dark:text-white">故事地图</span>
                    <span className="text-[9px] opacity-75 font-normal">STORY ADVENTURE</span>
                  </div>
                )}
              </button>

              {/* Floating Tooltip in collapsed mode */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-400/50 text-cyan-300 font-mono text-xs whitespace-nowrap shadow-xl z-50">
                  🗺️ 故事地图 (Story Adventure)
                </div>
              )}
            </div>

            {/* 2. 单词宝库 (Vocab Vault) */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => onNavigate('vocab')}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center cursor-pointer border ${
                  isCollapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3'
                } ${
                  currentMode === 'vocab'
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50 font-black'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
                title={isCollapsed ? '单词宝库 (Vocab Vault)' : undefined}
              >
                <span className="text-xl leading-none shrink-0">📚</span>
                {!isCollapsed && (
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <span className="font-black tracking-wide text-white dark:text-white">单词宝库</span>
                    <span className="text-[9px] opacity-75 font-normal">VOCAB VAULT</span>
                  </div>
                )}
              </button>

              {/* Floating Tooltip in collapsed mode */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-400/50 text-emerald-300 font-mono text-xs whitespace-nowrap shadow-xl z-50">
                  📚 单词宝库 (Vocab Vault)
                </div>
              )}
            </div>

            {/* 3. 歌曲乐园 (Song Lab) */}
            <div className="relative group">
              <button
                type="button"
                onClick={() => onNavigate('songs')}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center cursor-pointer border ${
                  isCollapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3'
                } ${
                  currentMode === 'songs'
                    ? 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)] ring-1 ring-purple-400/50 font-black'
                    : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
                title={isCollapsed ? '歌曲乐园 (Song Lab)' : undefined}
              >
                <span className="text-xl leading-none shrink-0">🎵</span>
                {!isCollapsed && (
                  <div className="flex flex-col text-left leading-tight min-w-0">
                    <span className="font-black tracking-wide text-white dark:text-white">歌曲乐园</span>
                    <span className="text-[9px] opacity-75 font-normal">SONG LAB</span>
                  </div>
                )}
              </button>

              {/* Floating Tooltip in collapsed mode */}
              {isCollapsed && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 px-3 py-1.5 rounded-xl bg-slate-900 border border-pink-400/50 text-pink-300 font-mono text-xs whitespace-nowrap shadow-xl z-50">
                  🎵 歌曲乐园 (Song Lab)
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* ── BOTTOM REGION: ASSETS VAULT & SYSTEM CONTROLS ── */}
        <div className="flex flex-col gap-3 pt-3 border-t border-slate-800/80">
          
          {/* Treasure Box / Rewards summary */}
          {!isCollapsed ? (
            <div
              onClick={() => setIsRankRoadModalOpen(true)}
              className="p-2.5 rounded-xl bg-gradient-to-br from-slate-900/90 to-amber-950/20 border border-amber-500/30 shadow-inner cursor-pointer hover:border-amber-400/60 transition-all group/treasury"
              title="点击查看探险军衔谱系与星星成就"
            >
              <div className="flex items-center justify-between text-[10px] text-amber-400/80 font-black mb-1.5">
                <span>TREASURY</span>
                <span className="group-hover/treasury:text-amber-300 transition-colors">⭐ 探险成就 ➔</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-lg border border-amber-500/20">
                  <span className="text-sm">⭐</span>
                  <div className="min-w-0">
                    <div className="text-[8px] text-slate-400 leading-none">可用星星</div>
                    <div className="text-xs font-black text-amber-300 tabular-nums">
                      {availableStars}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-950/70 p-1.5 rounded-lg border border-cyan-500/20">
                  <span className="text-sm">{rankProgress.badge}</span>
                  <div className="min-w-0">
                    <div className="text-[8px] text-slate-400 leading-none">探险军衔</div>
                    <div className="text-[11px] font-black text-cyan-300 truncate">
                      {rankProgress.shortTitle}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsRankRoadModalOpen(true)}
              className="flex flex-col items-center gap-1 py-1.5 rounded-xl bg-slate-900/80 border border-amber-500/30 text-[10px] font-bold text-amber-300 cursor-pointer hover:border-amber-400 transition-all"
              title={`可用星星: ${availableStars} (点击查看晋升谱系)`}
            >
              <span>⭐{availableStars}</span>
            </div>
          )}

          {/* System Utilities Tray */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              {/* Admin Portal Button (If user is Admin) */}
              {currentUser?.is_admin === 1 && onOpenAdmin && (
                <button
                  type="button"
                  onClick={onOpenAdmin}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-300 text-cyan-300 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                  title="管理后台 (Admin Dashboard)"
                >
                  <span>⚙️</span>
                  <span>管理后台</span>
                </button>
              )}

              {/* Logout / Switch User Button */}
              <button
                type="button"
                onClick={onLogout}
                className={`${
                  currentUser?.is_admin === 1 && onOpenAdmin ? 'flex-1' : 'w-full'
                } py-2 px-2.5 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-400 text-rose-300 flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95`}
                title="退出登录 / 切换档案"
              >
                <span>🚪</span>
                <span>切换档案</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {/* Collapsed Admin Portal Button */}
              {currentUser?.is_admin === 1 && onOpenAdmin && (
                <div className="relative group">
                  <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 flex items-center justify-center text-sm font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                    title="管理后台 (Admin Dashboard)"
                  >
                    ⚙️
                  </button>
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-400/50 text-cyan-300 font-mono text-xs whitespace-nowrap shadow-xl z-50">
                    ⚙️ 管理后台
                  </div>
                </div>
              )}

              {/* Collapsed Logout / Switch User Button */}
              <div className="relative group">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-rose-500/30 text-rose-300 flex items-center justify-center text-sm font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                  title="退出登录 / 切换档案"
                >
                  🚪
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 px-3 py-1.5 rounded-xl bg-slate-900 border border-rose-400/50 text-rose-300 font-mono text-xs whitespace-nowrap shadow-xl z-50">
                  🚪 切换档案 / 退出
                </div>
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* Buddy Selection Modal */}
      <BuddySelectorModal
        isOpen={isBuddyModalOpen}
        currentAvatar={currentUser?.avatar || ''}
        loading={savingBuddy}
        onSelectBuddy={(key) => handleSelectBuddy(key)}
        onClose={() => setIsBuddyModalOpen(false)}
      />

      {/* Career Rank Road Modal */}
      <RankRoadModal
        isOpen={isRankRoadModalOpen}
        onClose={() => setIsRankRoadModalOpen(false)}
        currentUser={currentUser}
        peerUsers={peerUsers}
        theme={theme}
      />
    </>
  );
};
