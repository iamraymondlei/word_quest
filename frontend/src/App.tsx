import React, { useState, useEffect } from 'react';
import { AdventureMap, Island } from './components/AdventureMap';
import { UserSelect } from './components/UserSelect';
import { ParentDashboard } from './components/ParentDashboard';
import { GamePlay } from './components/GamePlay';
import { SuspenseState } from './components/SuspenseState';
import { FormBoundary } from './components/FormBoundary';
import './index.css';

type Mode = 'map' | 'admin' | 'game';

export type ThemeType = 'cyber' | 'bright';
export type FontScaleType = '100' | '115' | '130';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('map');
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
  };

  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem('wordquest_user') || localStorage.getItem('melearn_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [islands, setIslands] = useState<Island[]>([]);
  const [selectedIsland, setSelectedIsland] = useState<Island | null>(null);
  const [gameMode, setGameMode] = useState<'story' | 'listening' | 'translation' | 'falling' | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);
  const [versionHistory, setVersionHistory] = useState<any[]>([]);

  const [theme, setTheme] = useState<ThemeType>(() => {
    const saved = localStorage.getItem('wordquest_theme') || localStorage.getItem('melearn_theme');
    if (saved === 'bright') return 'bright';
    return 'cyber';
  });
  const [fontScale, setFontScale] = useState<FontScaleType>(() => {
    const saved = localStorage.getItem('wordquest_font_scale') || localStorage.getItem('melearn_font_scale');
    if (saved === '100' || saved === '115' || saved === '130') return saved as FontScaleType;
    return '130';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-font-scale', fontScale);
    const rootFontSize = fontScale === '130' ? '20.8px' : fontScale === '115' ? '18.4px' : '16px';
    document.documentElement.style.fontSize = rootFontSize;
    localStorage.setItem('wordquest_theme', theme);
    localStorage.setItem('wordquest_font_scale', fontScale);
  }, [theme, fontScale]);

  const loadIslands = async (userId: number, showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const res = await fetch(`/api/islands?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setIslands(data);
      } else {
        console.error('Failed to load islands');
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
      const res = await fetch('/api/users');
      if (res.ok) {
        const users = await res.json();
        const found = users.find((u: any) => u.id === currentUser.id);
        if (found) {
          setCurrentUser(found);
          localStorage.setItem('wordquest_user', JSON.stringify(found));
        } else {
          // If the cached user ID no longer exists in the db, clean it up to prevent FK constraint failures
          handleLogout();
        }
      }
    } catch (err) {
      console.error('Failed to refresh user profile', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadIslands(currentUser.id, true);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      refreshUserProfile();
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    localStorage.setItem('wordquest_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('wordquest_user');
    localStorage.removeItem('melearn_user');
    setMode('map');
    setSelectedIsland(null);
    setGameMode(null);
  };

  const handleStartGame = (island: Island, mode: 'story' | 'listening' | 'translation' | 'falling') => {
    if (!island.words || island.words.length === 0) {
      alert('⚠️ 该岛屿目前没有单词，请联系家长在后台导入单词 CSV！');
      return;
    }
    console.log('Starting game mode:', mode);
    setSelectedIsland(island);
    setGameMode(mode);
    setMode('game');
  };

  const handleGameBack = () => {
    setMode('map');
    setSelectedIsland(null);
    setGameMode(null);
    if (currentUser) {
      loadIslands(currentUser.id, false);
      refreshUserProfile();
    }
  };

  const handleBackToMap = () => {
    setMode('map');
    navigateTo('/');
    if (currentUser) {
      loadIslands(currentUser.id, false);
    }
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

  const renderDevBadge = () => (
    <div className="fixed top-3 right-3 z-50 flex items-center gap-1.5 pointer-events-auto select-none font-mono">
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

  if (currentPath === '/admin' || mode === 'admin') {
    return (
      <div className="app-container relative">
        <FormBoundary>
          <ParentDashboard onBack={handleBackToMap} />
        </FormBoundary>
        {renderDevBadge()}
        {renderVersionModal()}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="app-container relative">
        <SuspenseState isLoading={false}>
          <FormBoundary>
            <UserSelect
              onLogin={handleLogin}
            />
          </FormBoundary>
        </SuspenseState>
        {renderDevBadge()}
        {renderVersionModal()}
      </div>
    );
  }

  return (
    <div className="app-container relative">
      <SuspenseState isLoading={loading}>
        {mode === 'map' && (
          <AdventureMap
            islands={islands}
            currentUser={currentUser}
            theme={theme}
            fontScale={fontScale}
            onThemeChange={setTheme}
            onFontScaleChange={setFontScale}
            onStartGame={handleStartGame}
            onLogout={handleLogout}
            onUpdateUser={(updatedUser) => {
              setCurrentUser(updatedUser);
              localStorage.setItem('wordquest_current_user', JSON.stringify(updatedUser));
            }}
          />
        )}
        {mode === 'game' && selectedIsland && gameMode && (
          <GamePlay
            island={selectedIsland}
            gameMode={gameMode}
            currentUser={currentUser}
            theme={theme}
            fontScale={fontScale}
            onThemeChange={setTheme}
            onFontScaleChange={setFontScale}
            onBack={handleGameBack}
            onProgressUpdated={() => {
              if (currentUser) {
                loadIslands(currentUser.id, false);
              }
            }}
          />
        )}
      </SuspenseState>
      {renderDevBadge()}
      {renderVersionModal()}
    </div>
  );
};

export default App;
