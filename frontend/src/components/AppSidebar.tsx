import React, { useState, useMemo, useEffect } from 'react';
import {
  BuddySelectorModal,
  BUDDY_CHARACTERS,
  normalizeBuddyKey,
  RunnerSprite
} from './StoryChaseAssets';
import { apiService } from '../utils/apiService';
import {
  calcRankProgress
} from '../utils/rankService';
import { RankRoadModal } from './RankRoadModal';
import { ChangePasswordModal } from './ChangePasswordModal';

export type SidebarMode = 'map' | 'vocab' | 'focus' | 'songs' | 'typing' | 'think' | 'grammar' | 'admin';

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
  onUpdateUser?: (updatedUser: any) => void;
  totalStars?: number;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentMode,
  onNavigate,
  currentUser,
  theme = 'cyber',
  onLogout,
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
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

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
          isCollapsed ? 'w-[68px] p-2' : 'w-52 sm:w-56 p-3'
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
            className="absolute -right-3 top-5 z-50 w-6 h-6 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.7)] border-2 border-slate-950 cursor-pointer transition-transform hover:scale-110 active:scale-95"
            title="Expand Sidebar"
          >
            <span className="text-xs leading-none">›</span>
          </button>
        )}

        {/* ── TOP REGION: BRAND + UNIFIED PROFILE + SINGLE-LINE NAVIGATION ── */}
        <div className="flex flex-col gap-2.5 overflow-x-hidden overflow-y-auto no-scrollbar">
          
          {/* Brand Header & Toggle */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-1.5 min-h-[34px]">
              <div
                onClick={() => onNavigate('map')}
                className="flex items-center gap-2 cursor-pointer group min-w-0"
                title="Story Quest"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.35)] group-hover:scale-105 transition-transform shrink-0">
                  <span className="text-base">🧭</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-black tracking-tight flex items-center leading-none text-white">
                    Word<span className="text-[#00f0ff] drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]">Quest</span>
                  </span>
                </div>
              </div>

              {/* Collapse Toggle Button */}
              <button
                type="button"
                onClick={toggleCollapsed}
                className="w-7 h-7 rounded-lg bg-slate-900/90 hover:bg-cyan-950 border border-slate-700 hover:border-cyan-400 text-cyan-400 flex items-center justify-center text-xs font-black transition-all cursor-pointer shadow-sm shrink-0 active:scale-90"
                title="Collapse Sidebar"
              >
                ‹
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                onClick={() => onNavigate('map')}
                className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-[0_0_12px_rgba(0,240,255,0.35)] hover:scale-105 transition-transform cursor-pointer"
                title="Story Quest"
              >
                <span className="text-lg">🧭</span>
              </div>
            </div>
          )}

          {/* Unified Student Profile + Stars & Rank Capsule */}
          {!isCollapsed ? (
            <div
              className={`p-2.5 rounded-xl border transition-all shadow-sm ${
                theme === 'bright'
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-900/80 border-cyan-500/30'
              }`}
            >
              {/* Row 1: Avatar + Username + Rank Badge */}
              <div className="flex items-center gap-2">
                <div
                  onClick={() => setIsBuddyModalOpen(true)}
                  className="w-9 h-9 rounded-lg bg-slate-950/80 border border-cyan-400/40 flex items-center justify-center relative shrink-0 shadow-inner hover:border-cyan-300 cursor-pointer group/avatar"
                  title="Change Buddy"
                >
                  <div className="relative z-10 w-full h-full flex items-center justify-center transform group-hover/avatar:scale-110 transition-transform duration-300">
                    <RunnerSprite avatar={currentBuddy.key} isSprinting={false} />
                  </div>
                  <span
                    className="absolute -bottom-1 -right-1 text-[10px] bg-slate-950 rounded-full border border-slate-800 px-0.5 shadow-sm"
                    title={rankProgress.fullTitle}
                  >
                    {rankProgress.badge}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-black truncate text-white flex items-center gap-1">
                      {currentUser?.is_admin === 1 && <span title="Admin">👑</span>}
                      <span className="truncate">{currentUser?.username || 'Learner'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRankRoadModalOpen(true)}
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono border flex items-center gap-0.5 shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 ${rankProgress.theme.badgeBg} ${rankProgress.theme.badgeBorder} ${rankProgress.theme.badgeText}`}
                      title="View Rank Roadmap"
                    >
                      <span>Lv.{rankProgress.level}</span>
                    </button>
                  </div>

                  {/* Row 2: Merged Stars & Coins + Buddy Switch */}
                  <div className="flex items-center justify-between text-[10px] mt-1">
                    <div
                      onClick={() => setIsRankRoadModalOpen(true)}
                      className="flex items-center gap-2 cursor-pointer"
                      title="Click to view Rank Roadmap & Achievements"
                    >
                      <span className="text-amber-300 font-black tabular-nums">⭐{availableStars}</span>
                      <span className="text-cyan-300 font-bold tabular-nums">🪙{currentUser?.coins || 0}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBuddyModalOpen(true)}
                      className="text-[9px] text-slate-400 hover:text-cyan-300 shrink-0 cursor-pointer"
                    >
                      换伙伴 ➔
                    </button>
                  </div>
                </div>
              </div>

              {/* Row 3: Compact EXP Bar */}
              <div
                onClick={() => setIsRankRoadModalOpen(true)}
                className="mt-2 pt-1.5 border-t border-slate-800/80 cursor-pointer group/exp"
                title="View Rank Roadmap Details"
              >
                <div className="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${rankProgress.theme.progressBarGradient} transition-all duration-500`}
                    style={{ width: `${Math.max(4, Math.min(100, rankProgress.progressPercent))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-1 leading-none">
                  <span className="truncate">{rankProgress.shortTitle}</span>
                  <span className={`font-bold ${rankProgress.theme.accentText}`}>
                    {rankProgress.progressPercent}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative group w-full flex flex-col items-center gap-1 cursor-pointer">
              <button
                type="button"
                onClick={() => setIsRankRoadModalOpen(true)}
                className="w-10 h-10 rounded-xl bg-slate-950/80 border border-cyan-400/40 hover:border-cyan-300 flex items-center justify-center shadow-inner transition-transform hover:scale-110 relative"
                title={`${currentUser?.username || 'Learner'} · ⭐${availableStars}`}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <RunnerSprite avatar={currentBuddy.key} isSprinting={false} />
                </div>
                <span className="absolute -bottom-1 -right-1 text-[10px] bg-slate-950 rounded-full border border-slate-800 px-0.5 shadow-sm">
                  {rankProgress.badge}
                </span>
              </button>
              <span
                onClick={() => setIsRankRoadModalOpen(true)}
                className="text-[10px] font-black text-amber-300 tabular-nums"
              >
                ⭐{availableStars}
              </span>
            </div>
          )}

          {/* ── COMPACT SINGLE-LINE NAVIGATION MENU ── */}
          <nav className="flex flex-col gap-1 pt-0.5">
            {([
              {
                mode: 'map' as SidebarMode,
                icon: '🗺️',
                label: 'Story Quest',
                activeClass: 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(0,240,255,0.22)] font-black',
                tooltipClass: 'border-cyan-400/50 text-cyan-300',
              },
              {
                mode: 'typing' as SidebarMode,
                icon: '⌨️',
                label: 'Typing Quest',
                activeClass: 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.22)] font-black',
                tooltipClass: 'border-amber-400/50 text-amber-300',
              },
              {
                mode: 'vocab' as SidebarMode,
                icon: '📚',
                label: 'Word Challenge',
                activeClass: 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.22)] font-black',
                tooltipClass: 'border-emerald-400/50 text-emerald-300',
              },
              {
                mode: 'focus' as SidebarMode,
                icon: '🎯',
                label: 'Focus Words',
                activeClass: 'border-rose-400 bg-rose-500/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.22)] font-black',
                tooltipClass: 'border-rose-400/50 text-rose-300',
              },
              {
                mode: 'songs' as SidebarMode,
                icon: '🎵',
                label: 'Song Lab',
                activeClass: 'border-purple-400 bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.22)] font-black',
                tooltipClass: 'border-purple-400/50 text-purple-300',
              },
              {
                mode: 'think' as SidebarMode,
                icon: '📘',
                label: 'Think 清单',
                activeClass: 'border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.22)] font-black',
                tooltipClass: 'border-cyan-400/50 text-cyan-300',
              },
              {
                mode: 'grammar' as SidebarMode,
                icon: '⚡',
                label: 'Grammar Quest',
                activeClass: 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.22)] font-black',
                tooltipClass: 'border-amber-400/50 text-amber-300',
              },
            ]).map((item) => {
              const isActive = currentMode === item.mode;
              return (
                <div key={item.mode} className="relative group">
                  <button
                    type="button"
                    onClick={() => onNavigate(item.mode)}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center cursor-pointer border ${
                      isCollapsed ? 'justify-center px-0' : 'justify-start px-2.5 gap-2.5'
                    } ${
                      isActive
                        ? item.activeClass
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <span className="text-base leading-none shrink-0">{item.icon}</span>
                    {!isCollapsed && (
                      <span className="truncate tracking-wide text-white">{item.label}</span>
                    )}
                  </button>

                  {isCollapsed && (
                    <div
                      className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 px-3 py-1.5 rounded-xl bg-slate-900 border font-mono text-xs whitespace-nowrap shadow-xl z-50 ${item.tooltipClass}`}
                    >
                      {item.icon} {item.label}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 8. 管理员专用后台入口 (Admin Only) */}
            {currentUser?.is_admin === 1 && (
              <div className="relative group pt-1 mt-0.5 border-t border-slate-800/80 flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className={`w-full py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center cursor-pointer border ${
                    isCollapsed ? 'justify-center px-0' : 'justify-start px-2.5 gap-2.5'
                  } ${
                    currentMode === 'admin'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.22)] font-black'
                      : 'border-amber-500/30 bg-amber-950/20 text-amber-300 hover:text-white hover:bg-amber-900/40 hover:border-amber-400'
                  }`}
                  title={isCollapsed ? '管理后台' : undefined}
                >
                  <span className="text-base leading-none shrink-0">⚙️</span>
                  {!isCollapsed && (
                    <span className="truncate tracking-wide font-black">管理后台</span>
                  )}
                </button>

                {isCollapsed && (
                  <div
                    className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-400/50 text-amber-300 font-mono text-xs whitespace-nowrap shadow-xl z-50"
                  >
                    ⚙️ 管理后台
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  className={`w-full py-1.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center cursor-pointer border border-cyan-500/30 bg-cyan-950/20 text-cyan-300 hover:text-white hover:bg-cyan-900/40 hover:border-cyan-400 ${
                    isCollapsed ? 'justify-center px-0' : 'justify-start px-2.5 gap-2.5'
                  }`}
                  title={isCollapsed ? '修改密码' : undefined}
                >
                  <span className="text-base leading-none shrink-0">🔐</span>
                  {!isCollapsed && (
                    <span className="truncate tracking-wide font-bold">修改密码</span>
                  )}
                </button>

                {isCollapsed && (
                  <div
                    className="absolute left-full ml-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 px-3 py-1.5 rounded-xl bg-slate-900 border border-cyan-400/50 text-cyan-300 font-mono text-xs whitespace-nowrap shadow-xl z-50"
                  >
                    🔐 修改密码
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* ── BOTTOM REGION: COMPACT SYSTEM CONTROLS ── */}
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80 shrink-0">
          {/* System Utilities Tray */}
          {!isCollapsed ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-1.5 px-2 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 border border-rose-500/30 hover:border-rose-400 text-rose-300 flex items-center justify-center gap-1 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="Switch User"
              >
                <span>🚪</span>
                <span>Switch</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative group">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-9 h-9 rounded-xl bg-slate-900 hover:bg-rose-950/50 border border-rose-500/30 text-rose-300 flex items-center justify-center text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                  title="Switch User"
                >
                  🚪
                </button>
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

      {/* Admin Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        userId={currentUser?.id}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};
