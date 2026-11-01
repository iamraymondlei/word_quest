import React, { useState, useEffect } from 'react';
import { SuspenseState } from './SuspenseState';
import { RunnerSprite, BUDDY_CHARACTERS, normalizeBuddyKey } from './StoryChaseAssets';
import { apiService } from '../utils/apiService';
import { isForcedOffline } from '../utils/offlineMode';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import './UserSelect.css';

interface User {
  id: number;
  username: string;
  coins: number;
  avatar: string;
  is_admin?: number;
}

interface UserSelectProps {
  onLogin: (user: User) => void;
  onAdminClick?: () => void;
}

export const UserSelect: React.FC<UserSelectProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<User | null>(null);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

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
      const data = await apiService.getUsers();
      if (data && data.length > 0) {
        // Ensure Admin user is included in the list
        const allUsers: User[] = [...data];
        const hasAdmin = allUsers.some(
          (u) => u.username?.toLowerCase() === 'admin' || u.is_admin === 1
        );
        if (!hasAdmin) {
          allUsers.push({
            id: 999999,
            username: 'Admin',
            coins: 0,
            avatar: '👑',
            is_admin: 1,
          });
        }
        setUsers(allUsers);
      } else {
        if (isForcedOffline() || (typeof navigator !== 'undefined' && !navigator.onLine)) {
          setError('Offline mode: No cached player profiles found. Please connect to Wi-Fi to load profiles.');
        } else {
          setError('FAILED TO RETRIEVE ACTIVE PROFILES.');
        }
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

  const handleUserClick = (user: User) => {
    if (user.is_admin === 1 || user.username?.toLowerCase() === 'admin') {
      setSelectedAdminUser(user);
      setAdminPassword('');
      setPasswordError('');
      setShowPasswordModal(true);
      return;
    }
    onLogin(user);
  };

  const handleAdminPasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminPassword) {
      setPasswordError('Please enter password (请输入管理员密码)');
      return;
    }
    setVerifying(true);
    setPasswordError('');
    try {
      const res = await apiService.adminLogin(selectedAdminUser?.username || 'Admin', adminPassword);
      if (res && res.user) {
        setShowPasswordModal(false);
        onLogin(res.user);
      } else {
        setPasswordError('Invalid password, please try again (密码错误，请重新输入)');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Invalid password (密码错误)');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 theme-bg theme-text font-mono relative overflow-hidden transition-colors duration-300">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

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
            <div className="login-datetime-time font-bold text-cyan-400">
              ⏰ {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border theme-border bg-slate-950/30 px-3 py-2.5">
          <span className="text-xs font-bold theme-text-muted">Network Mode</span>
          <OfflineSyncBadge onRefreshData={fetchUsers} />
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
                      type="button"
                      onClick={() => handleUserClick(user)}
                      className="relative flex items-center gap-4 p-4 rounded-2xl theme-card border theme-border shadow-lg hover:shadow-cyan-500/10 hover:border-cyan-400 hover:scale-[1.02] transition-all duration-300 text-left group cursor-pointer overflow-visible"
                    >
                      {/* Full Unclipped Character Display on Micro-Stage */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-b from-slate-900/80 to-slate-950 border border-cyan-500/20 group-hover:border-cyan-400/50 flex items-center justify-center relative shrink-0 transition-all shadow-inner">
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

      {/* Admin Password Verification Modal */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => {
            if (!verifying) {
              setShowPasswordModal(false);
              setAdminPassword('');
              setPasswordError('');
            }
          }}
        >
          <div
            className="w-full max-w-sm theme-card border border-amber-500/40 rounded-2xl p-6 shadow-2xl shadow-amber-500/10 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">👑</span>
              <h3 className="text-base font-black font-mono text-amber-300">
                Admin Verification
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Please enter the administrator password to log in.
            </p>

            <form onSubmit={handleAdminPasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  autoFocus
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Enter admin password..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 font-mono text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
                  disabled={verifying}
                />
                {passwordError && (
                  <div className="text-rose-400 text-xs font-mono flex items-center gap-1.5 mt-2">
                    <span>⚠️</span>
                    <span>{passwordError}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setAdminPassword('');
                    setPasswordError('');
                  }}
                  disabled={verifying}
                  className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="px-5 py-2 rounded-xl text-xs font-mono font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow transition-all cursor-pointer hover:scale-102 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? 'Verifying...' : 'Log In 🔐'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
