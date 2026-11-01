import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService, Song, SongSegment } from '../utils/apiService';
import './SongLearning.css';

interface Props {
  songId?: number;
  userId?: number;
  isAdmin?: boolean;
  onBack?: () => void;
}

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export const SongLearning: React.FC<Props> = ({ songId, userId, isAdmin, onBack }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [activeSegment, setActiveSegment] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Playback Mode: 'continuous' (连续整曲播放) vs 'single' (一句一句播放)
  const [playMode, setPlayMode] = useState<'continuous' | 'single'>(() => {
    try {
      const saved = localStorage.getItem('wordquest_song_play_mode');
      if (saved === 'continuous' || saved === 'single') return saved;
    } catch {}
    return 'continuous';
  });

  const [loopSegment, setLoopSegment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
  const [translationHint, setTranslationHint] = useState<{
    original: string;
    translation: string;
    phonetic?: string;
    kind: 'word' | 'sentence';
  } | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('wordquest_song_play_mode', playMode);
    } catch {}
  }, [playMode]);

  useEffect(() => {
    let cancelled = false;
    apiService
      .getSongs(userId)
      .then((items) => {
        if (cancelled) return;
        const readyItems = items.filter((item) => item.status === 'READY' && item.segments.length > 0);
        setSongs(readyItems);
        const initial = songId ? readyItems.find((item) => item.id === songId) : readyItems[0];
        setSelectedSong(initial || null);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [songId, userId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedSong) return;

    const handleTimeUpdate = () => {
      const current = audio.currentTime;
      setCurrentTime(current);

      // Track active segment based on current playback time
      const index = selectedSong.segments.findIndex(
        (segment) => current >= segment.startTime && current < segment.endTime
      );
      if (index >= 0 && index !== activeSegment) {
        setActiveSegment(index);
      }

      // In single-sentence mode, pause or loop at the end of the current sentence
      if (playMode === 'single') {
        const targetIndex = activeSegment >= 0 ? activeSegment : index;
        const segment = targetIndex >= 0 ? selectedSong.segments[targetIndex] : undefined;
        if (segment && current >= segment.endTime - 0.05) {
          if (loopSegment) {
            audio.currentTime = segment.startTime;
            void audio.play();
          } else {
            audio.pause();
            setIsPlaying(false);
          }
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setActiveSegment(-1);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedSong, activeSegment, loopSegment, playMode]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // Smooth scroll active lyric into view
  useEffect(() => {
    if (activeSegment >= 0 && lyricsContainerRef.current) {
      const activeEl = lyricsContainerRef.current.querySelector(`.song-lyric.active`);
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeSegment]);

  const vocabulary = useMemo(() => {
    if (!selectedSong) return [];
    if (selectedSong.targetWords.length > 0) return selectedSong.targetWords;
    const words = selectedSong.segments.flatMap(
      (segment) => segment.text.toLowerCase().match(/[a-z']+/g) || []
    );
    return Array.from(new Set(words)).filter((word) => word.length > 3).slice(0, 8);
  }, [selectedSong]);

  const practiceWord = vocabulary[practiceIndex % Math.max(vocabulary.length, 1)] || '';
  const checkPractice = () => {
    setPracticeFeedback(
      practiceAnswer.trim().toLowerCase() === practiceWord
        ? 'Correct! 🎉 太棒了！'
        : `再试一次哦！目标单词是: ${practiceWord}`
    );
  };

  const wordTranslations = useMemo(
    () => new Map((selectedSong?.translations?.words || []).map((item) => [item.word.toLowerCase(), item])),
    [selectedSong]
  );

  const showSentenceTranslation = (index: number, event: React.SyntheticEvent) => {
    event.stopPropagation();
    const translation = selectedSong?.translations?.sentences[index]?.zh;
    if (translation) {
      setTranslationHint({
        original: selectedSong?.segments[index]?.text || '',
        translation,
        kind: 'sentence'
      });
    }
  };

  const playSegment = (segment: SongSegment, index: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    setActiveSegment(index);
    audio.currentTime = segment.startTime;
    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setError('Please click play button to allow audio playback.'));
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (activeSegment < 0 && selectedSong && selectedSong.segments.length > 0) {
        setActiveSegment(0);
        audio.currentTime = selectedSong.segments[0].startTime;
      }
      void audio.play().then(() => setIsPlaying(true));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handlePrevSegment = () => {
    if (!selectedSong || selectedSong.segments.length === 0) return;
    const targetIndex = activeSegment > 0 ? activeSegment - 1 : 0;
    playSegment(selectedSong.segments[targetIndex], targetIndex);
  };

  const handleNextSegment = () => {
    if (!selectedSong || selectedSong.segments.length === 0) return;
    const targetIndex =
      activeSegment < selectedSong.segments.length - 1 ? activeSegment + 1 : activeSegment;
    playSegment(selectedSong.segments[targetIndex], targetIndex);
  };

  const songDuration = Number(selectedSong?.duration_seconds) || 0;
  const progress = songDuration > 0 ? Math.min(100, (currentTime / songDuration) * 100) : 0;
  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || songDuration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(
      0,
      Math.min(songDuration, ((event.clientX - rect.left) / rect.width) * songDuration)
    );
  };

  const translatedWords = selectedSong?.translations?.words || [];
  const featuredWord =
    translationHint?.kind === 'word'
      ? translatedWords.find((item) => item.word.toLowerCase() === translationHint.original.toLowerCase())
      : translatedWords[practiceIndex % Math.max(translatedWords.length, 1)];

  if (loading) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center font-mono text-cyan-400">
        <div className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          <span>Loading song library...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full p-6 font-mono text-rose-400">
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center justify-between">
          <span>⚠️ {error}</span>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1 bg-slate-800 text-white rounded text-xs cursor-pointer"
            >
              返回
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!selectedSong) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center font-mono text-slate-400">
        <span>No songs available.</span>
      </div>
    );
  }

  return (
    <div className="song-lab w-full">
      <div className="song-shell">
        {/* ── Top Header Bar (Integrated with Application Layout) ── */}
        <header className="w-full mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-3 font-mono">
          {/* Left: Back to Songs button & Title */}
          <div className="flex items-center gap-3 flex-wrap">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-purple-500/40 hover:border-purple-300 text-purple-300 flex items-center gap-1.5 text-xs font-mono font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                title="返回歌曲大厅 / Back to Song Quest"
              >
                <span className="text-sm font-black">‹</span>
                <span>返回歌曲库</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400 truncate max-w-xs sm:max-w-md">
                🎵 {selectedSong.title}
              </h1>
              <span className="text-xs text-slate-400 truncate hidden sm:inline">
                · {selectedSong.artist}
              </span>
            </div>
          </div>

          {/* Right: Playback Mode Switcher & Song Selector */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* 连续播放 vs 一句一句播放 Segmented Switch */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-950/80 border border-slate-700/80 shadow-inner">
              <button
                type="button"
                onClick={() => setPlayMode('continuous')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  playMode === 'continuous'
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="连续播放整首歌曲，歌词逐句实时高亮"
              >
                <span>🔁</span>
                <span>连续播放</span>
              </button>
              <button
                type="button"
                onClick={() => setPlayMode('single')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  playMode === 'single'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="一句一句精听研习，每句播放完毕自动暂停"
              >
                <span>🎯</span>
                <span>一句一句播放</span>
              </button>
            </div>

            {/* In single mode: show loop line toggle */}
            {playMode === 'single' && (
              <button
                type="button"
                onClick={() => setLoopSegment((v) => !v)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer ${
                  loopSegment
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="单句循环：本句播放完后自动重播"
              >
                <span>↻</span>
                <span className="hidden sm:inline">单句循环</span>
              </button>
            )}

            {/* Song Switcher Dropdown */}
            {songs.length > 1 && (
              <select
                value={selectedSong.id}
                onChange={(e) => {
                  const found = songs.find((item) => item.id === Number(e.target.value));
                  if (found) {
                    setSelectedSong(found);
                    setActiveSegment(-1);
                    setIsPlaying(false);
                  }
                }}
                className="px-2.5 py-1 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:border-purple-400 max-w-[140px] sm:max-w-[180px] truncate cursor-pointer"
              >
                <option value={selectedSong.id}>{selectedSong.title}</option>
                {songs
                  .filter((item) => item.id !== selectedSong.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} · {item.artist}
                    </option>
                  ))}
              </select>
            )}

            {isAdmin && (
              <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Admin
              </span>
            )}
          </div>
        </header>

        {/* ── Compact Playback Mode Banner ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-base">{playMode === 'continuous' ? '🔁' : '🎯'}</span>
            <span className="font-bold text-slate-200">
              {playMode === 'continuous'
                ? '全曲连续播放模式：跟随音乐连贯唱诵，歌词逐句实时高亮跟随'
                : '单句精听研习模式：每句唱完自动暂停，方便跟读、回放与拼写练习'}
            </span>
          </div>
          <div className="text-cyan-400 font-bold">
            {activeSegment >= 0
              ? `正在播放第 ${String(activeSegment + 1).padStart(2, '0')} 句`
              : '点击任意歌词行立即开始播放'}
          </div>
        </div>

        {/* ── Main Workspace ── */}
        <section className="song-workspace">
          <article className="song-card song-player">
            <div className="song-meta">
              <div>
                <small>SONG LAB · 歌词研习</small>
                <h2>{selectedSong.title}</h2>
                <p>
                  {selectedSong.artist}
                  {selectedSong.album ? ` · ${selectedSong.album}` : ''}
                </p>
              </div>
              <div className="song-album-art">♫</div>
            </div>

            {/* Audio Waveform */}
            <div className={`song-wave ${isPlaying ? 'is-playing' : ''}`} aria-label="Audio waveform">
              {Array.from({ length: 46 }, (_, index) => (
                <i key={index} style={{ height: `${24 + ((index * 17) % 68)}%` }} />
              ))}
            </div>

            {/* Seek Bar */}
            <div
              className="song-progress"
              onClick={seek}
              role="slider"
              aria-label="Playback progress"
              aria-valuemin={0}
              aria-valuemax={songDuration}
              aria-valuenow={currentTime}
              tabIndex={0}
            >
              <span style={{ width: `${progress}%` }} />
            </div>

            {/* Time stamps */}
            <div className="song-time">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(songDuration)}</span>
            </div>

            {/* Player Controls */}
            <div className="song-controls">
              <button
                type="button"
                onClick={handlePrevSegment}
                aria-label="Previous Sentence"
                title="上一句"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={togglePlayback}
                className="song-play"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? '暂停' : '播放'}
              >
                {isPlaying ? 'Ⅱ' : '▶'}
              </button>
              <button
                type="button"
                onClick={handleNextSegment}
                aria-label="Next Sentence"
                title="下一句"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setLoopSegment((value) => !value)}
                className={loopSegment ? 'active' : ''}
                aria-pressed={loopSegment}
                title={loopSegment ? '已开启单句循环' : '开启单句循环'}
              >
                ↻
              </button>
            </div>

            <audio
              ref={audioRef}
              src={selectedSong.audio_url}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Lyrics Section Label */}
            <div className="song-section-label">
              <span>Lyrics · 点击任意行播放</span>
              <span>
                {activeSegment >= 0 ? String(activeSegment + 1).padStart(2, '0') : '00'} /{' '}
                {String(selectedSong.segments.length).padStart(2, '0')}
              </span>
            </div>

            {/* Lyrics Scrollable List */}
            <div className="song-lyrics" ref={lyricsContainerRef}>
              {selectedSong.segments.map((segment, index) => (
                <button
                  key={`${segment.id}-${segment.startTime}`}
                  type="button"
                  onClick={() => playSegment(segment, index)}
                  className={`song-lyric ${activeSegment === index ? 'active' : ''}`}
                >
                  <span className="song-lyric-num">{String(index + 1).padStart(2, '0')}</span>
                  <span className="song-lyric-text">
                    {segment.text.split(/(\s+)/).map((part, partIndex) => {
                      const word = wordTranslations.get(part.toLowerCase().replace(/[^a-z']/g, ''));
                      return word ? (
                        <span
                          key={`${part}-${partIndex}`}
                          role="button"
                          tabIndex={0}
                          className="song-word"
                          onClick={(event) => {
                            event.stopPropagation();
                            setTranslationHint({
                              original: word.word,
                              translation: word.meaning,
                              phonetic: word.phonetic,
                              kind: 'word'
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              setTranslationHint({
                                original: word.word,
                                translation: word.meaning,
                                phonetic: word.phonetic,
                                kind: 'word'
                              });
                            }
                          }}
                        >
                          {part}
                        </span>
                      ) : (
                        part
                      );
                    })}
                    <span
                      className="song-lyric-zh"
                      role="button"
                      tabIndex={0}
                      onClick={(event) => showSentenceTranslation(index, event)}
                    >
                      {selectedSong.translations?.sentences[index]?.zh || '点击播放本句'}
                    </span>
                  </span>
                  <span className="song-lyric-stamp">{formatTime(segment.startTime)}</span>
                </button>
              ))}
            </div>
          </article>

          {/* Side Panel: Vocabulary & Quick Practice */}
          <aside className="song-side">
            <section className="song-card song-vocab">
              <h3>Words to notice</h3>
              <p>点击歌词中带下划线的生词，可快速查看释义与例句。</p>
              {featuredWord ? (
                <div className="song-word-card">
                  <div className="song-word-top">
                    <strong>{featuredWord.word}</strong>
                    <span>{featuredWord.phonetic}</span>
                  </div>
                  <div className="song-meaning">{featuredWord.meaning}</div>
                  {featuredWord.example && <div className="song-example">{featuredWord.example}</div>}
                </div>
              ) : (
                <div className="song-empty-word">暂无单词释义数据。</div>
              )}
              {translationHint?.kind === 'sentence' && (
                <div className="song-sentence-hint">
                  <strong>{translationHint.original}</strong>
                  <span>{translationHint.translation}</span>
                </div>
              )}
              <div className="song-word-nav">
                <span>
                  {translatedWords.length
                    ? `${(practiceIndex % translatedWords.length) + 1} / ${translatedWords.length}`
                    : '0 / 0'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPracticeIndex((value) => value + 1);
                    setTranslationHint(null);
                  }}
                >
                  下一个单词 →
                </button>
              </div>
            </section>

            <section className="song-card song-practice">
              <h3>Quick practice</h3>
              <p>听句子发音，拼写出歌词中的目标生词。</p>
              <div className="song-practice-row">
                <span>♪</span>
                <div>
                  <strong>Listen</strong>
                  <small>点击左侧歌词行随时重听</small>
                </div>
              </div>
              <div className="song-practice-row">
                <span>Aa</span>
                <div>
                  <strong>Spelling</strong>
                  <small>拼写当前目标单词</small>
                </div>
              </div>
              <div className="song-answer">
                <input
                  value={practiceAnswer}
                  onChange={(event) => setPracticeAnswer(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && checkPractice()}
                  placeholder="输入单词拼写..."
                />
                <button type="button" onClick={checkPractice}>
                  检查
                </button>
              </div>
              {practiceFeedback && <p className="song-feedback">{practiceFeedback}</p>}
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
};
