import React, { useState, useEffect } from 'react';
import { SuspenseState } from './SuspenseState';
import { RunnerSprite, BUDDY_CHARACTERS, normalizeBuddyKey } from './StoryChaseAssets';
import './UserSelect.css';

interface User {
  id: number;
  username: string;
  coins: number;
  avatar: string;
}

interface UserSelectProps {
  onLogin: (user: User) => void;
  onAdminClick?: () => void;
}

export const UserSelect: React.FC<UserSelectProps> = ({ onLogin, onAdminClick }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter((u: User) => u.username.toLowerCase() !== 'admin'));
      } else {
        setError('FAILED TO RETRIEVE ACTIVE PROFILES.');
      }
    } catch (err) {
      console.error('Failed to load agent profiles', err);
      setError('TRANSMISSION ERROR. FAILED TO CONNECT TO DATABASE.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 theme-bg theme-text font-mono relative overflow-hidden transition-colors duration-300">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Admin Button Top Right */}
      {onAdminClick && (
        <div className="absolute top-6 right-6 z-20">
          <button
            onClick={onAdminClick}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-amber-400 font-mono text-xs transition-all shadow-lg group cursor-pointer backdrop-blur-md"
          >
            <span className="text-sm group-hover:rotate-12 transition-transform">⚙️</span>
            <span>Parent / Admin</span>
          </button>
        </div>
      )}

      <div className="w-full max-w-2xl theme-card border theme-border shadow-2xl rounded-2xl p-6 sm:p-8 backdrop-blur-md relative z-10 transition-all">
        <div className="flex justify-between items-center mb-8 border-b theme-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse inline-block shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              <h1 className="text-xl sm:text-2xl font-black tracking-wider theme-text font-mono">
                Choose Your Profile 🌟
              </h1>
            </div>
            <p className="text-xs theme-text-muted mt-1 font-mono">
              Pick your adventurer to explore the kingdom stories!
            </p>
          </div>
          <div className="login-datetime-container" data-testid="login-datetime">
            <div className="login-datetime-date">
              📅 {currentTime.toLocaleDateString()}
            </div>
            <div className="login-datetime-time font-bold text-cyan-400">
              ⏰ {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-500/40 text-red-300 text-xs rounded-xl flex items-center gap-2 font-mono">
            <span>⚠️</span> {error}
          </div>
        )}

        <div>
          <h2 className="text-xs uppercase theme-text-muted font-bold mb-4 tracking-widest flex items-center gap-2 font-mono">
            <span className="text-cyan-500 font-black">▶</span> Active Player Profiles
          </h2>
          <SuspenseState isLoading={loading}>
            {users.length === 0 ? (
              <p className="text-xs theme-text-muted italic font-mono">No profiles found. Contact administrator to create player accounts.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {users.map((user) => {
                  const buddy = BUDDY_CHARACTERS.find(b => b.key === normalizeBuddyKey(user.avatar)) || BUDDY_CHARACTERS[0];
                  return (
                    <button
                      key={user.id}
                      onClick={() => onLogin(user)}
                      className="relative flex items-center gap-4 p-4 rounded-2xl theme-card border theme-border shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-400 hover:scale-[1.02] transition-all duration-300 text-left group cursor-pointer overflow-visible"
                    >
                      {/* Full Unclipped Character Display on Micro-Stage */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-cyan-500/20 group-hover:border-cyan-400/50 flex items-center justify-center relative shrink-0 transition-all shadow-inner">
                        {/* Subtle ground shadow */}
                        <div className="absolute bottom-2 w-10 h-1.5 bg-black/60 rounded-full blur-xs pointer-events-none" />
                        <div className="relative z-10 w-full h-full flex items-center justify-center transform group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">
                          <RunnerSprite avatar={user.avatar} isSprinting={false} />
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-base font-black theme-text group-hover:text-cyan-300 transition-colors font-mono truncate">
                          {user.username}
                        </div>
                        <div className="text-xs text-cyan-400 font-mono font-bold mt-0.5 truncate flex items-center gap-1.5">
                          <span>{buddy.name}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 mt-2 bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono text-2xs px-2.5 py-0.5 rounded-full font-bold">
                          <span>🪙</span>
                          <span className="tabular-nums">{user.coins || 0}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SuspenseState>
        </div>
      </div>
    </div>
  );
};
