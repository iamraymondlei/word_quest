import React, { useState, useEffect } from 'react';
import { AdventureMap, Island } from './components/AdventureMap';
import { UserSelect } from './components/UserSelect';
import { ParentDashboard } from './components/ParentDashboard';
import { SongLearning } from './components/SongLearning';
import { GamePlay } from './components/GamePlay';
import { SuspenseState } from './components/SuspenseState';
import { FormBoundary } from './components/FormBoundary';
import { WordBankMap } from './components/WordBankMap';
import { SongAdventureMap } from './components/SongAdventureMap';
import { TypingAdventureMap } from './components/TypingAdventureMap';
import { AppSidebar, SidebarMode } from './components/AppSidebar';
import { apiService } from './utils/apiService';
import { OfflineSyncBadge } from './components/OfflineSyncBadge';
import { ThinkChecklist } from './components/ThinkChecklist';
import { GrammarAdventureMap } from './components/GrammarAdventureMap';
import './index.css';

type Mode = 'map' | 'admin' | 'game' | 'vocab' | 'songs' | 'typing' | 'think' | 'grammar';

export type ThemeType = 'cyber' | 'bright';
export type FontScaleType = '100' | '115' | '130';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const p = window.location.pathname;
    if (p === '/admin') {
      const isAuth = sessionStorage.getItem('wordquest_admin_authenticated') === 'true';
      const savedUser = localStorage.getItem('wordquest_user');
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      if (isAuth && parsedUser?.is_admin === 1) {
        return '/admin';
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/');
      }
      return '/';
    }
    return p;
  });
  const [selectedSongId, setSelectedSongId] = useState<number | null>(() => {
    const match = window.location.pathname.match(/^\/songs\/(\d+)/);
    return match ? Number(match[1]) : null;
  });
  const [returnMode, setReturnMode] = useState<'map' | 'typing'>('map');
  const [isFocusDrillOpen, setIsFocusDrillOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('wordquest_user') || localStorage.getItem('melearn_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('wordquest_admin_authenticated') === 'true';
  });

  const [mode, setMode] = useState<Mode>(() => {
    const p = window.location.pathname;
    if (p === '/vocab') return 'vocab';
    if (p === '/typing') return 'typing';
    if (p.startsWith('/songs')) return 'songs';
    if (p === '/think') return 'think';
    if (p === '/grammar') return 'grammar';
    if (p === '/admin') {
      const isAuth = sessionStorage.getItem('wordquest_admin_authenticated') === 'true';
      const savedUser = localStorage.getItem('wordquest_user');
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      if (isAuth && parsedUser?.is_admin === 1) {
        return 'admin';
      }
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', '/');
      }
      return 'map';
    }
    return 'map';
  });

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p);
      if (p === '/') {
        setMode('map');
        setSelectedSongId(null);
      } else if (p === '/typing') {
        setMode('typing');
        setSelectedSongId(null);
      } else if (p === '/vocab') {
        setMode('vocab');
        setSelectedSongId(null);
      } else if (p === '/think') {
        setMode('think');
        setSelectedSongId(null);
      } else if (p === '/grammar') {
        setMode('grammar');
        setSelectedSongId(null);
      } else if (p.startsWith('/songs')) {
        setMode('songs');
        const match = p.match(/^\/songs\/(\d+)/);
        setSelectedSongId(match ? Number(match[1]) : null);
      } else if (p === '/admin') {
        const isAuth = sessionStorage.getItem('wordquest_admin_authenticated') === 'true';
        if (isAuth && currentUser?.is_admin === 1) {
          setMode('admin');
          setSelectedSongId(null);
        } else {
          setMode('map');
          setSelectedSongId(null);
          navigateTo('/');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);
  const [islands, setIslands] = useState<Island[]>([]);
  const [selectedIsland, setSelectedIsland] = useState<Island | null>(null);
  const [gameMode, setGameMode] = useState<'story' | 'listening' | 'translation' | 'falling' | null>(null);
  const [selectedSubMode, setSelectedSubMode] = useState<'reading' | 'testing' | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);

  const [theme] = useState<ThemeType>('cyber');
  const [fontScale, setFontScale] = useState<FontScaleType>(() => {
    const saved = localStorage.getItem('wordquest_font_scale_v2');
    if (saved === '100' || saved === '115' || saved === '130') return saved as FontScaleType;
    return '100';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-scale', fontScale);
    const rootFontSize = fontScale === '130' ? '20.8px' : fontScale === '115' ? '18.4px' : '16px';
    document.documentElement.style.fontSize = rootFontSize;
    localStorage.setItem('wordquest_theme', theme);
    localStorage.setItem('wordquest_font_scale_v2', fontScale);
  }, [theme, fontScale]);

  const totalStars = React.useMemo(() => {
    return islands.reduce((acc, sector) => {
      const stage = sector.unlocked_stage ?? 1;
      let mask = sector.completed_stages_mask || 0;
      if (mask === 0 && stage > 1) {
        if (stage === 2) mask = 1;
        else if (stage === 3) mask = 3;
        else if (stage === 4) mask = 7;
        else if (stage >= 5) mask = 15;
      }
      const stars = (mask & 1 ? 1 : 0) + (mask & 2 ? 1 : 0) + (mask & 4 ? 1 : 0) + (mask & 8 ? 1 : 0) + (mask & 16 ? 1 : 0);
      return acc + stars;
    }, 0);
  }, [islands]);

  const loadIslands = async (userId: number, showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const data = await apiService.getIslands(userId);
      if (data) {
        setIslands(data);
      }
    } catch (err) {
      console.error('Failed to load islands', err);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const refreshUserProfile = async () => {
    if (!currentUser) return;
    try {
      const users = await apiService.getUsers();
      if (users && users.length > 0) {
        const found = users.find((u: any) => u.id === currentUser.id);
        if (found) {
          setCurrentUser(found);
          localStorage.setItem('wordquest_user', JSON.stringify(found));
        }
      }
    } catch (err) {
      console.error('Failed to refresh user profile', err);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      loadIslands(currentUser.id, true);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      refreshUserProfile();
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('wordquest_user', JSON.stringify(user));
    if (user.is_admin === 1 || user.username?.toLowerCase() === 'admin') {
      setIsAdminAuthenticated(true);
      sessionStorage.setItem('wordquest_admin_authenticated', 'true');
    } else {
      setIsAdminAuthenticated(false);
      sessionStorage.removeItem('wordquest_admin_authenticated');
    }
    // Always enter the frontend adventure map on login (never directly enter admin dashboard)
    setMode('map');
    setSelectedSongId(null);
    navigateTo('/');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('wordquest_admin_authenticated');
    setIsAdminAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('wordquest_user');
    localStorage.removeItem('melearn_user');
    setMode('map');
    setSelectedIsland(null);
    setGameMode(null);
    setSelectedSubMode(null);
    setSelectedSongId(null);
    navigateTo('/');
  };

  const handleStartGame = (
    island: Island,
    mode: 'story' | 'listening' | 'translation' | 'falling',
    subMode?: 'reading' | 'testing'
  ) => {
    if (!island.words || island.words.length === 0) {
      alert('⚠️ This story has no words yet. Please import words in the Parent Portal.');
      return;
    }
    console.log('Starting game mode:', mode, subMode);
    setSelectedIsland(island);
    setGameMode(mode);
    setSelectedSubMode(subMode || null);
    setMode('game');
  };

  const handleGameBack = () => {
    const targetMode = returnMode === 'typing' ? 'typing' : 'map';
    setMode(targetMode);
    setSelectedIsland(null);
    setGameMode(null);
    setSelectedSubMode(null);
    setSelectedSongId(null);
    navigateTo(targetMode === 'typing' ? '/typing' : '/');
    if (currentUser) {
      loadIslands(currentUser.id, false);
      refreshUserProfile();
    }
  };

  const handleBackToMap = () => {
    setMode('map');
    setSelectedSongId(null);
    navigateTo('/');
    if (currentUser) {
      loadIslands(currentUser.id, false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('wordquest_admin_authenticated');
    localStorage.setItem('wordquest_admin_tab_v2', 'dashboard');
    setIsAdminAuthenticated(false);
    if (currentUser?.is_admin === 1 || currentUser?.username?.toLowerCase() === 'admin') {
      setCurrentUser(null);
      localStorage.removeItem('wordquest_user');
      localStorage.removeItem('wordquest_current_user');
    }
    setMode('map');
    setSelectedSongId(null);
    navigateTo('/');
  };

  // Listen for Escape key to close version modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowVersionModal(false);
      }
    };
    if (showVersionModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showVersionModal]);

  const handleVersionClick = async () => {
    setShowVersionModal(true);
    try {
      const res = await fetch('/api/versions');
      if (res.ok) {
        const data = await res.json();
        setVersionHistory(data);
      }
    } catch (err) {
      console.error('Failed to load version history:', err);
    }
  };

  const showDevBadge = import.meta.env.VITE_SHOW_DEV_MODE !== undefined
    ? import.meta.env.VITE_SHOW_DEV_MODE === 'true'
    : import.meta.env.DEV;

  const appVersion = import.meta.env.VITE_APP_VERSION || 'V1.1.1';

  const showVersionBadge = import.meta.env.VITE_SHOW_VERSION_BADGE !== 'false';

  const renderOfflineBadge = () => (
    <div className="fixed left-4 z-50 pointer-events-auto select-none font-mono" style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <OfflineSyncBadge
        currentUserId={currentUser?.id}
        onRefreshData={() => currentUser && loadIslands(currentUser.id, false)}
      />
    </div>
  );

  const renderDevBadge = () => (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-2 pointer-events-auto select-none font-mono">
      {showDevBadge && (
        <span className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[9px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_rgba(245,158,11,0.1)] uppercase tracking-wider">
          DEV MODE
        </span>
      )}
      {showVersionBadge && (
        <button
          type="button"
          onClick={handleVersionClick}
          className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[9px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_rgba(6,182,212,0.1)] hover:bg-cyan-500/25 active:scale-95 transition-all cursor-pointer outline-none focus:ring-1 focus:ring-cyan-500/30"
          title="View System Changelogs"
        >
          {appVersion}
        </button>
      )}
    </div>
  );

  const renderVersionModal = () => {
    if (!showVersionModal) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
        <div className="bg-slate-900 border border-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.2)] rounded-2xl w-full max-w-lg overflow-hidden flex flex-col relative max-h-[85vh] font-mono">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-500 to-cyan-500"></div>
          
          <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950/40">
            <h3 className="text-sm font-black text-cyan-400 tracking-wider uppercase flex items-center gap-2">
              🖥️ SYSTEM_VERSION_LOGS.EXE
            </h3>
            <button
              type="button"
              className="text-slate-400 hover:text-rose-400 transition-all font-bold text-xs bg-transparent border-0 cursor-pointer"
              onClick={() => setShowVersionModal(false)}
            >
              [ESC_CLOSE]
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {versionHistory.length === 0 ? (
               <div className="text-center py-8 text-slate-500 text-xs animate-pulse">
                 🛰️ FETCHING VERSION DATA PACKETS...
               </div>
            ) : (
              versionHistory.map((item, idx) => (
                <div key={item.id || idx} className="border border-slate-800 bg-slate-950/20 rounded-xl p-4 space-y-3 relative hover:border-cyan-500/30 transition-all duration-300">
                  <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                    <span className="text-xs font-black text-emerald-400 font-mono bg-emerald-950/30 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                      {item.version}
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      📅 {new Date(item.release_date).toISOString().split('T')[0]}
                    </span>
                  </div>
                  
                  <ul className="space-y-2">
                    {(() => {
                      let featuresArray = [];
                      try {
                        featuresArray = typeof item.features === 'string' ? JSON.parse(item.features) : item.features;
                      } catch (e) {
                        featuresArray = Array.isArray(item.features) ? item.features : [];
                      }
                      return featuresArray.map((feat: string, fIdx: number) => (
                        <li key={fIdx} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                          <span className="text-cyan-500 mt-0.5 select-none font-bold">&gt;</span>
                          <span>{feat}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                </div>
              ))
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 text-center">
            <button
              type="button"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-6 py-2.5 rounded-xl text-[10px] tracking-widest uppercase transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer"
              onClick={() => setShowVersionModal(false)}
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Guard /admin route: strictly require authenticated Admin user
  const isAuthorizedAdmin = isAdminAuthenticated && currentUser?.is_admin === 1;

  if (currentPath === '/admin' || mode === 'admin') {
    if (isAuthorizedAdmin && mode === 'admin') {
      return (
        <div className="app-container relative">
          <FormBoundary>
            <ParentDashboard onBack={handleBackToMap} onLogout={handleAdminLogout} />
          </FormBoundary>
          {renderOfflineBadge()}
          {renderDevBadge()}
          {renderVersionModal()}
        </div>
      );
    }

    // Block unauthorized address bar entry: rewrite URL to / and reset mode
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      window.history.replaceState({}, '', '/');
    }
    if (currentPath !== '/') {
      setCurrentPath('/');
    }
    if (mode !== 'map') {
      setMode('map');
    }
  }

  const adminSongPreview = new URLSearchParams(window.location.search).get('preview') === 'admin'
    || localStorage.getItem('wordquest_song_preview_admin') === '1';
  if (currentPath.startsWith('/songs') && adminSongPreview) {
    if (adminSongPreview) localStorage.removeItem('wordquest_song_preview_admin');
    const songIdMatch = currentPath.match(/^\/songs\/(\d+)/);
    return (
      <SongLearning
        songId={songIdMatch ? Number(songIdMatch[1]) : undefined}
        userId={currentUser?.id}
        isAdmin={true}
        onBack={() => {
          if (currentUser?.is_admin === 1) {
            setMode('admin');
            navigateTo('/admin');
          } else {
            navigateTo('/');
          }
        }}
      />
    );
  }

  if (!currentUser) {
    return (
      <div className="app-container relative">
        <SuspenseState isLoading={false}>
          <FormBoundary>
            <UserSelect onLogin={handleLogin} />
          </FormBoundary>
        </SuspenseState>
        {renderDevBadge()}
        {renderVersionModal()}
      </div>
    );
  }

  const isSongRoute = mode === 'songs' || currentPath.startsWith('/songs');
  const activeSongId = selectedSongId || (currentPath.match(/^\/songs\/(\d+)/) ? Number(currentPath.match(/^\/songs\/(\d+)/)![1]) : null);

  // Full-screen dedicated game immersion modes (no sidebar)
  if (mode === 'game' && selectedIsland && gameMode) {
    return (
      <div className="app-container relative">
        <FormBoundary
          fallback={
            <div className="p-8 text-center text-rose-400 bg-slate-900 border border-rose-500/30 rounded-xl m-6 max-w-lg mx-auto">
              <h2 className="text-lg font-bold mb-2">⚠️ 游戏界面遇到异常</h2>
              <p className="text-sm text-slate-300 mb-4">发生了一个小错误，点击下方按钮可返回故事选择页或重试。</p>
              <button
                type="button"
                onClick={handleGameBack}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold cursor-pointer"
              >
                返回故事地图
              </button>
            </div>
          }
        >
          <GamePlay
            island={selectedIsland}
            gameMode={gameMode}
            initialMatchingSubMode={selectedSubMode || undefined}
            currentUser={currentUser}
            theme={theme}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
            onBack={handleGameBack}
            onProgressUpdated={() => {
              if (currentUser) {
                loadIslands(currentUser.id, false);
              }
            }}
          />
        </FormBoundary>
        {renderOfflineBadge()}
        {renderDevBadge()}
        {renderVersionModal()}
      </div>
    );
  }

  const currentSidebarMode: SidebarMode =
    isFocusDrillOpen
      ? 'focus'
      : mode === 'typing' || currentPath === '/typing'
      ? 'typing'
      : mode === 'vocab' || currentPath === '/vocab'
      ? 'vocab'
      : isSongRoute
      ? 'songs'
      : mode === 'think' || currentPath === '/think'
      ? 'think'
      : mode === 'grammar' || currentPath === '/grammar'
      ? 'grammar'
      : mode === 'admin' || currentPath === '/admin'
      ? 'admin'
      : 'map';

  return (
    <div className="flex h-screen w-screen overflow-hidden theme-bg theme-text select-none relative">
      <AppSidebar
        currentMode={currentSidebarMode}
        onNavigate={(navMode) => {
          if (navMode === 'map') {
            setIsFocusDrillOpen(false);
            setMode('map');
            setSelectedSongId(null);
            navigateTo('/');
            if (currentUser) loadIslands(currentUser.id, false);
          } else if (navMode === 'admin') {
            setIsFocusDrillOpen(false);
            setMode('admin');
            setSelectedSongId(null);
            navigateTo('/admin');
          } else if (navMode === 'typing') {
            setIsFocusDrillOpen(false);
            setMode('typing');
            setSelectedSongId(null);
            navigateTo('/typing');
            if (currentUser) loadIslands(currentUser.id, false);
          } else if (navMode === 'vocab') {
            setIsFocusDrillOpen(false);
            setMode('vocab');
            setSelectedSongId(null);
            navigateTo('/vocab');
          } else if (navMode === 'focus') {
            setIsFocusDrillOpen(true);
            setMode('vocab');
            setSelectedSongId(null);
            navigateTo('/vocab');
          } else if (navMode === 'songs') {
            setIsFocusDrillOpen(false);
            setMode('songs');
            setSelectedSongId(null);
            navigateTo('/songs');
          } else if (navMode === 'think') {
            setIsFocusDrillOpen(false);
            setMode('think');
            setSelectedSongId(null);
            navigateTo('/think');
          } else if (navMode === 'grammar') {
            setIsFocusDrillOpen(false);
            setMode('grammar');
            setSelectedSongId(null);
            navigateTo('/grammar');
          }
        }}
        currentUser={currentUser}
        theme={theme}
        fontScale={fontScale}
        onFontScaleChange={setFontScale}
        onLogout={handleLogout}
        onUpdateUser={(updatedUser) => {
          setCurrentUser(updatedUser);
          localStorage.setItem('wordquest_current_user', JSON.stringify(updatedUser));
          localStorage.setItem('wordquest_user', JSON.stringify(updatedUser));
        }}
        totalStars={totalStars}
      />

      {/* Main Content Canvas (Scrollable viewport) */}
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
        {mode === 'map' && currentPath !== '/vocab' && currentPath !== '/typing' && currentPath !== '/think' && currentPath !== '/grammar' && !isSongRoute && (
          <SuspenseState isLoading={loading}>
            <AdventureMap
              islands={islands}
              currentUser={currentUser}
              theme={theme}
              fontScale={fontScale}
              onFontScaleChange={setFontScale}
              onStartGame={(island, gMode, subMode) => {
                setReturnMode('map');
                handleStartGame(island, gMode, subMode);
              }}
              onLogout={handleLogout}
              onOpenWordBank={() => {
                setMode('vocab');
                setSelectedSongId(null);
                navigateTo('/vocab');
              }}
              onOpenSongs={() => {
                setMode('songs');
                setSelectedSongId(null);
                navigateTo('/songs');
              }}
              onUpdateUser={(updatedUser) => {
                setCurrentUser(updatedUser);
                localStorage.setItem('wordquest_current_user', JSON.stringify(updatedUser));
                localStorage.setItem('wordquest_user', JSON.stringify(updatedUser));
              }}
              hideHeader={true}
            />
          </SuspenseState>
        )}

        {(mode === 'typing' || currentPath === '/typing') && !isSongRoute && (
          <SuspenseState isLoading={loading}>
            <TypingAdventureMap
              islands={islands}
              currentUser={currentUser}
              theme={theme}
              fontScale={fontScale}
              onFontScaleChange={setFontScale}
              onStartGame={(island, gMode) => {
                setReturnMode('typing');
                handleStartGame(island, gMode);
              }}
              onLogout={handleLogout}
              onUpdateUser={(updatedUser) => {
                setCurrentUser(updatedUser);
                localStorage.setItem('wordquest_current_user', JSON.stringify(updatedUser));
                localStorage.setItem('wordquest_user', JSON.stringify(updatedUser));
              }}
              hideHeader={true}
            />
          </SuspenseState>
        )}

        {(mode === 'vocab' || currentPath === '/vocab') && !isSongRoute && (
          <WordBankMap
            currentUser={currentUser}
            theme={theme}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
            onBackToStories={() => {
              setIsFocusDrillOpen(false);
              setMode('map');
              setSelectedSongId(null);
              navigateTo('/');
            }}
            onOpenSongs={() => {
              setIsFocusDrillOpen(false);
              setMode('songs');
              setSelectedSongId(null);
              navigateTo('/songs');
            }}
            onLogout={handleLogout}
            onUpdateUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem('wordquest_current_user', JSON.stringify(updatedUser));
              localStorage.setItem('wordquest_user', JSON.stringify(updatedUser));
            }}
            hideHeader={true}
            autoOpenWeakWords={isFocusDrillOpen}
            onCloseWeakWords={() => setIsFocusDrillOpen(false)}
          />
        )}

        {isSongRoute && activeSongId === null && (
          <SongAdventureMap
            currentUser={currentUser}
            theme={theme}
            fontScale={fontScale}
            onFontScaleChange={setFontScale}
            onBackToStories={() => {
              setMode('map');
              setSelectedSongId(null);
              navigateTo('/');
            }}
            onOpenWordBank={() => {
              setMode('vocab');
              setSelectedSongId(null);
              navigateTo('/vocab');
            }}
            onSelectSong={(songId) => {
              setSelectedSongId(songId);
              setMode('songs');
              navigateTo(`/songs/${songId}`);
            }}
            onLogout={handleLogout}
            onUpdateUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem('wordquest_current_user', JSON.stringify(updatedUser));
              localStorage.setItem('wordquest_user', JSON.stringify(updatedUser));
            }}
            hideHeader={true}
          />
        )}

        {isSongRoute && activeSongId !== null && (
          <SongLearning
            songId={activeSongId}
            userId={currentUser.id}
            isAdmin={currentUser.is_admin === 1}
            onBack={() => {
              setSelectedSongId(null);
              setMode('songs');
              navigateTo('/songs');
            }}
          />
        )}

        {(mode === 'think' || currentPath === '/think') && (
          <ThinkChecklist
            currentUser={currentUser}
            onBackToStories={() => {
              setMode('map');
              setSelectedSongId(null);
              navigateTo('/');
            }}
          />
        )}

        {(mode === 'grammar' || currentPath === '/grammar') && (
          <GrammarAdventureMap
            currentUser={currentUser}
            onUpdateUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem('wordquest_current_user', JSON.stringify(updatedUser));
              localStorage.setItem('wordquest_user', JSON.stringify(updatedUser));
            }}
            onBackToStories={() => {
              setMode('map');
              setSelectedSongId(null);
              navigateTo('/');
            }}
          />
        )}
      </main>

      {renderDevBadge()}
      {renderVersionModal()}
    </div>
  );
};

export default App;
