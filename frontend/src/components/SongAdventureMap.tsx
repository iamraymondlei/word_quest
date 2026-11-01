import React, { useState, useEffect, useMemo } from 'react';
import './AdventureMap.css';
import { OfflineSyncBadge } from './OfflineSyncBadge';
import { apiService, Song } from '../utils/apiService';
import {
  BUDDY_CHARACTERS,
  normalizeBuddyKey,
  RunnerSprite
} from './StoryChaseAssets';

interface SongAdventureMapProps {
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
  onBackToStories: () => void;
  onOpenWordBank: () => void;
  onSelectSong: (songId: number) => void;
  onLogout?: () => void;
  onUpdateUser?: (updatedUser: any) => void;
  hideHeader?: boolean;
}

const formatDuration = (seconds?: number | null) => {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const SongAdventureMap: React.FC<SongAdventureMapProps> = ({
  currentUser,
  fontScale = '130',
  onFontScaleChange,
  onBackToStories,
  onOpenWordBank,
  onSelectSong,
  onLogout,
  hideHeader = false
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentBuddy = useMemo(() => {
    const key = normalizeBuddyKey(currentUser.avatar);
    return BUDDY_CHARACTERS.find((b) => b.key === key) || BUDDY_CHARACTERS[0];
  }, [currentUser.avatar]);

  const loadSongs = async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await apiService.getSongs(currentUser.id);
      // Filter for ready songs or songs with segments
      const readySongs = items.filter(
        (song) => song.status === 'READY' || (song.segments && song.segments.length > 0)
      );
      setSongs(readySongs);
    } catch (err: any) {
      console.error('Failed to load songs:', err);
      setError(err.message || 'Failed to load songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs();
  }, [currentUser.id]);

  const filteredSongs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(q) ||
        (song.artist && song.artist.toLowerCase().includes(q)) ||
        (song.album && song.album.toLowerCase().includes(q))
    );
  }, [songs, searchQuery]);

  const totalWords = useMemo(() => {
    return songs.reduce((acc, song) => acc + (song.targetWords?.length || 0), 0);
  }, [songs]);

  return (
    <div className="min-h-screen w-full theme-bg theme-text font-mono p-4 sm:p-6 transition-colors duration-300">
      {/* Top Modern Command Bar (Same style as AdventureMap and WordBankMap) */}
      {!hideHeader && (
      <header className="w-full max-w-6xl mx-auto mb-8 relative z-20">
        <div className="theme-card border theme-border rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row items-center justify-between gap-5">
          {/* Left: Adventurer Identity Hero Card */}
          <div className="flex items-center gap-4 w-full lg:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3 bg-gradient-to-br from-slate-900/90 to-purple-950/40 border border-purple-500/30 p-2 pr-3.5 rounded-2xl shadow-lg">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-950/80 border border-purple-500/30 flex items-center justify-center relative shrink-0 shadow-inner">
                <RunnerSprite avatar={currentBuddy.key} isSprinting={false} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base font-black text-white font-mono tracking-wide truncate">
                    {currentUser.username}
                  </span>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-400/40 px-1.5 py-0.5 rounded font-black font-mono">
                    SONG HERO
                  </span>
                </div>
                <div className="text-xs text-purple-400 font-bold font-mono mt-0.5 flex items-center gap-1.5">
                  <span>{currentBuddy.name}</span>
                </div>
              </div>
            </div>

            {/* Navigation Jump Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onBackToStories}
                className="px-3.5 py-2 text-xs rounded-xl font-black transition-all cursor-pointer bg-gradient-to-r from-cyan-600/30 to-indigo-600/30 hover:from-cyan-600/50 hover:to-indigo-600/50 border border-cyan-400/50 text-cyan-300 hover:text-white flex items-center gap-1.5 font-mono shadow-md active:scale-95 shrink-0"
                title="Story Map"
              >
                <span>🗺️</span>
                <span>Story Map</span>
              </button>

              <button
                type="button"
                onClick={onOpenWordBank}
                className="px-3.5 py-2 text-xs rounded-xl font-black transition-all cursor-pointer bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 border border-emerald-400/50 text-emerald-300 hover:text-white flex items-center gap-1.5 font-mono shadow-md active:scale-95 shrink-0"
                title="Word Challenge"
              >
                <span>📚</span>
                <span>Word Quest</span>
              </button>
            </div>
          </div>

          {/* Center: Treasury & Song Stats */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full lg:w-auto">
            {/* Stars Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 shadow-sm font-mono">
              <span className="text-base leading-none">⭐</span>
              <div>
                <div className="text-[10px] uppercase text-amber-400/70 font-black tracking-wider leading-none">Available Stars</div>
                <div className="text-sm font-black text-amber-300 tabular-nums">
                  {currentUser.stars !== undefined ? Math.max(0, currentUser.stars - (currentUser.spent_stars || 0)) : 0}
                </div>
              </div>
            </div>


            {/* Total Songs Capsule */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-200 shadow-sm font-mono">
              <span className="text-base leading-none">🎵</span>
              <div>
                <div className="text-[10px] uppercase text-purple-400/70 font-black tracking-wider leading-none">Songs</div>
                <div className="text-sm font-black text-purple-300 tabular-nums">
                  {songs.length} <span className="text-xs text-purple-400/70 font-normal">Songs ({totalWords} Words)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Offline, Theme & Settings Control Cluster */}
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
            {onLogout && (
              <button
                onClick={onLogout}
                className="p-2 text-xs border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1 font-mono shadow-sm"
                title="Exit"
              >
                🚪
              </button>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Main Content Area */}
      <div className="w-full max-w-6xl mx-auto">
        {/* Compact Header & Search Bar */}
        <div className="flex flex-wrap items-center justify-between mb-4 gap-3 border-b theme-border pb-3">
          <div className="flex items-center gap-3 flex-wrap flex-1">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400 uppercase font-mono shrink-0">
              🎵 Song Lab
            </h1>

            {songs.length > 0 && (
              <>
                <div className="relative flex-1 min-w-[180px] max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search songs or artists..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs font-mono rounded-xl bg-slate-900/80 border border-slate-700/80 text-white placeholder-slate-500 outline-none focus:border-purple-400 transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <span className="text-xs font-mono theme-text-muted">
                  <strong className="text-purple-300 font-bold">{filteredSongs.length}</strong> songs
                </span>
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

        {/* Song Cards Content */}
        {loading ? (
          <div className="py-24 text-center text-slate-500 animate-pulse text-sm">
            🛰️ Loading songs...
          </div>
        ) : error ? (
          <div className="theme-card p-12 rounded-2xl text-center border border-rose-500/30 space-y-4">
            <div className="text-4xl">⚠️</div>
            <h3 className="text-rose-300 font-bold text-base">{error}</h3>
            <button
              type="button"
              onClick={loadSongs}
              className="px-4 py-2 bg-purple-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-purple-400 transition-all"
            >
              🔄 Retry Connection
            </button>
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="theme-card p-12 rounded-2xl text-center border theme-border space-y-4">
            <div className="text-5xl">🎵</div>
            <h3 className="text-slate-200 font-bold text-base">
              {searchQuery ? 'No songs found' : 'No songs available yet'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? 'Try a different search keyword.'
                : 'Please ask parents to add songs in the Parent Portal.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-purple-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-purple-400 transition-all"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={onBackToStories}
                className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-md cursor-pointer hover:bg-cyan-400 transition-all"
              >
                ← Back to Story Map
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSongs.map((song, index) => {
              const segmentCount = song.segments?.length || 0;
              const wordCount = song.targetWords?.length || 0;
              const durationStr = formatDuration(song.duration_seconds);

              return (
                <div
                  key={song.id}
                  onClick={() => onSelectSong(song.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectSong(song.id);
                    }
                  }}
                  className="group relative rounded-2xl border theme-border bg-slate-900/80 hover:bg-slate-900/95 border-purple-500/30 hover:border-purple-400 p-6 transition-all duration-300 hover:shadow-[0_0_35px_rgba(168,85,247,0.28)] hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle Top Accent Beam */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />

                  {/* Card Header: Track Tag & Duration */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[11px] font-mono font-black bg-purple-950/70 border border-purple-500/40 text-purple-300 px-2.5 py-1 rounded-lg">
                      TRACK #{String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                      <span>⏱️</span>
                      <span>{durationStr}</span>
                    </span>
                  </div>

                  {/* Card Center: Vinyl Disc & Song Information */}
                  <div className="space-y-4 my-2">
                    <div className="flex items-center gap-4">
                      {/* Stylized Vinyl Disc Art */}
                      <div className="relative w-16 h-16 rounded-full bg-slate-950 border-2 border-slate-700/80 shadow-inner flex items-center justify-center shrink-0 group-hover:rotate-45 group-hover:scale-105 transition-all duration-500">
                        {/* Vinyl Grooves */}
                        <div className="absolute inset-1.5 rounded-full border border-slate-800/80 pointer-events-none" />
                        <div className="absolute inset-3 rounded-full border border-slate-800/60 pointer-events-none" />
                        {/* Center Label */}
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs text-slate-950 font-black shadow-md">
                          ♫
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors line-clamp-1 tracking-tight">
                          {song.title}
                        </h2>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {song.artist || 'Original Soundtrack'}
                          {song.album ? ` · ${song.album}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* Highlights Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1">
                        <span className="text-cyan-400">🎶</span>
                        <span>{segmentCount} Lyrics</span>
                      </span>
                      {wordCount > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 flex items-center gap-1">
                          <span className="text-amber-400">✨</span>
                          <span>{wordCount} Key Words</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Click to Play Callout */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 group-hover:from-purple-500 group-hover:to-cyan-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.25)] group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                    >
                      <span className="text-sm">▶</span>
                      <span>Play & Learn ▶</span>
                    </button>
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
