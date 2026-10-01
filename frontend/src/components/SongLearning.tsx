import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiService, Song, SongSegment } from '../utils/apiService';
import './SongLearning.css';

interface Props {
  songId?: number;
  userId?: number;
  isAdmin?: boolean;
  onBack?: () => void;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export const SongLearning: React.FC<Props> = ({ songId, userId, isAdmin, onBack }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [activeSegment, setActiveSegment] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loopSegment, setLoopSegment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswer, setPracticeAnswer] = useState('');
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
  const [translationHint, setTranslationHint] = useState<{ original: string; translation: string; phonetic?: string; kind: 'word' | 'sentence' } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiService.getSongs(userId).then((items) => {
      if (cancelled) return;
      setSongs(items.filter((item) => item.status === 'READY' && item.segments.length > 0));
      const initial = songId ? items.find((item) => item.id === songId) : items[0];
      setSelectedSong(initial || null);
    }).catch((err) => !cancelled && setError(err.message)).finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [songId, userId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedSong) return;
    const handleTimeUpdate = () => {
      const current = audio.currentTime;
      setCurrentTime(current);
      const index = selectedSong.segments.findIndex((segment) => current >= segment.startTime && current < segment.endTime);
      if (index >= 0) setActiveSegment(index);
      const segment = activeSegment >= 0 ? selectedSong.segments[activeSegment] : undefined;
      if (segment && current >= segment.endTime - 0.04) {
        if (loopSegment) {
          audio.currentTime = segment.startTime;
          void audio.play();
        } else {
          audio.pause();
          setIsPlaying(false);
        }
      }
    };
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedSong, activeSegment, loopSegment]);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  const vocabulary = useMemo(() => {
    if (!selectedSong) return [];
    if (selectedSong.targetWords.length > 0) return selectedSong.targetWords;
    const words = selectedSong.segments.flatMap((segment) => segment.text.toLowerCase().match(/[a-z']+/g) || []);
    return Array.from(new Set(words)).filter((word) => word.length > 3).slice(0, 8);
  }, [selectedSong]);

  const practiceWord = vocabulary[practiceIndex % Math.max(vocabulary.length, 1)] || '';
  const checkPractice = () => {
    setPracticeFeedback(practiceAnswer.trim().toLowerCase() === practiceWord ? '答对了！' : `再听一遍歌词，答案是 ${practiceWord}`);
  };

  const wordTranslations = useMemo(() => new Map((selectedSong?.translations?.words || []).map((item) => [item.word.toLowerCase(), item])), [selectedSong]);
  const showSentenceTranslation = (index: number, event: React.SyntheticEvent) => {
    event.stopPropagation();
    const translation = selectedSong?.translations?.sentences[index]?.zh;
    if (translation) setTranslationHint({ original: selectedSong?.segments[index]?.text || '', translation, kind: 'sentence' });
  };

  const playSegment = (segment: SongSegment, index: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    setActiveSegment(index);
    audio.currentTime = segment.startTime;
    void audio.play().then(() => setIsPlaying(true)).catch(() => setError('请先点击播放按钮，浏览器阻止了自动播放。'));
  };

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play().then(() => setIsPlaying(true));
    else audio.pause();
  };

  const songDuration = Number(selectedSong?.duration_seconds) || 0;
  const progress = songDuration > 0 ? Math.min(100, (currentTime / songDuration) * 100) : 0;
  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || songDuration <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(songDuration, ((event.clientX - rect.left) / rect.width) * songDuration));
  };

  const translatedWords = selectedSong?.translations?.words || [];
  const featuredWord = translationHint?.kind === 'word'
    ? translatedWords.find((item) => item.word.toLowerCase() === translationHint.original.toLowerCase())
    : translatedWords[practiceIndex % Math.max(translatedWords.length, 1)];

  if (loading) return <div className="song-lab-state">正在加载歌曲库...</div>;
  if (error) return <div className="song-lab-state song-lab-error">{error}</div>;
  if (!selectedSong) return <div className="song-lab-state">暂无可学习歌曲。</div>;

  return (
    <div className="song-lab">
      <main className="song-shell">
        <header className="song-topbar">
          <button type="button" onClick={onBack} className="song-brand" aria-label="返回歌曲乐园">
            <span className="song-brand-mark">‹</span>
            <span>返回歌曲乐园 · SONG LAB</span>
          </button>
          <div className="song-top-actions">
            {songs.length > 1 && (
              <select
                value={selectedSong.id}
                onChange={(event) => {
                  setSelectedSong(songs.find((item) => item.id === Number(event.target.value)) || selectedSong);
                  setActiveSegment(-1);
                }}
              >
                <option value={selectedSong.id}>{selectedSong.title}</option>
                {songs.filter((item) => item.id !== selectedSong.id).map((item) => (
                  <option key={item.id} value={item.id}>{item.title} · {item.artist}</option>
                ))}
              </select>
            )}
            <span>{isAdmin ? '管理员预览' : '🎵 原声乐园'}</span>
            <span>原声速度 1.0×</span>
          </div>
        </header>

        <section className="song-hero">
          <div><h1>Sing it.<br/><em>Learn it.</em></h1><p>把喜欢的歌变成一条会发光的学习路径。点击一句歌词，听它在原曲里的声音，再点亮其中的单词。</p></div>
          <div className="song-hero-note">{activeSegment >= 0 ? `正在播放第 ${String(activeSegment + 1).padStart(2, '0')} 句。` : '点击任意一句歌词开始。'}歌曲仍是一份完整 MP3，每一句只是一个精准的时间区间。</div>
        </section>

        <section className="song-workspace">
          <article className="song-card song-player">
            <div className="song-meta"><div><small>MY FIRST SONG</small><h2>{selectedSong.title}</h2><p>{selectedSong.artist}{selectedSong.album ? ` · ${selectedSong.album}` : ''}</p></div><div className="song-album-art">♫</div></div>
            <div className={`song-wave ${isPlaying ? 'is-playing' : ''}`} aria-label="音频波形">{Array.from({ length: 46 }, (_, index) => <i key={index} style={{ height: `${24 + ((index * 17) % 68)}%` }} />)}</div>
            <div className="song-progress" onClick={seek} role="slider" aria-label="歌曲播放进度" aria-valuemin={0} aria-valuemax={songDuration} aria-valuenow={currentTime} tabIndex={0}><span style={{ width: `${progress}%` }} /></div>
            <div className="song-time"><span>{formatTime(currentTime)}</span><span>{formatTime(songDuration)}</span></div>
            <div className="song-controls"><button type="button" onClick={() => activeSegment > 0 && playSegment(selectedSong.segments[activeSegment - 1], activeSegment - 1)} aria-label="上一句">‹</button><button type="button" onClick={togglePlayback} className="song-play" aria-label={isPlaying ? '暂停' : '播放'}>{isPlaying ? 'Ⅱ' : '▶'}</button><button type="button" onClick={() => activeSegment < selectedSong.segments.length - 1 && playSegment(selectedSong.segments[Math.max(0, activeSegment + 1)], Math.max(0, activeSegment + 1))} aria-label="下一句">›</button><button type="button" onClick={() => setLoopSegment((value) => !value)} className={loopSegment ? 'active' : ''} aria-pressed={loopSegment}>↻</button></div>
            <audio ref={audioRef} src={selectedSong.audio_url} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} />
            <div className="song-section-label"><span>逐句歌词 · 点击播放</span><span>{activeSegment >= 0 ? String(activeSegment + 1).padStart(2, '0') : '00'} / {String(selectedSong.segments.length).padStart(2, '0')}</span></div>
            <div className="song-lyrics">{selectedSong.segments.map((segment, index) => <button key={`${segment.id}-${segment.startTime}`} type="button" onClick={() => playSegment(segment, index)} className={`song-lyric ${activeSegment === index ? 'active' : ''}`}><span className="song-lyric-num">{String(index + 1).padStart(2, '0')}</span><span className="song-lyric-text">{segment.text.split(/(\s+)/).map((part, partIndex) => { const word = wordTranslations.get(part.toLowerCase().replace(/[^a-z']/g, '')); return word ? <span key={`${part}-${partIndex}`} role="button" tabIndex={0} className="song-word" onClick={(event) => { event.stopPropagation(); setTranslationHint({ original: word.word, translation: word.meaning, phonetic: word.phonetic, kind: 'word' }); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); setTranslationHint({ original: word.word, translation: word.meaning, phonetic: word.phonetic, kind: 'word' }); } }}>{part}</span> : part; })}<span className="song-lyric-zh" role="button" tabIndex={0} onClick={(event) => showSentenceTranslation(index, event)}>{selectedSong.translations?.sentences[index]?.zh || '点击播放这句歌词'}</span></span><span className="song-lyric-stamp">{formatTime(segment.startTime)}</span></button>)}</div>
          </article>

          <aside className="song-side">
            <section className="song-card song-vocab"><h3>Words to notice</h3><p>点击歌词里带下划线的词，看看它在这首歌里的意思。</p>{featuredWord ? <div className="song-word-card"><div className="song-word-top"><strong>{featuredWord.word}</strong><span>{featuredWord.phonetic}</span></div><div className="song-meaning">{featuredWord.meaning}</div>{featuredWord.example && <div className="song-example">{featuredWord.example}</div>}</div> : <div className="song-empty-word">还没有单词释义，请先在管理页运行 AI 翻译。</div>}{translationHint?.kind === 'sentence' && <div className="song-sentence-hint"><strong>{translationHint.original}</strong><span>{translationHint.translation}</span></div>}<div className="song-word-nav"><span>{translatedWords.length ? `${practiceIndex % translatedWords.length + 1} / ${translatedWords.length}` : '0 / 0'}</span><button type="button" onClick={() => { setPracticeIndex((value) => value + 1); setTranslationHint(null); }}>下一个单词 →</button></div></section>
            <section className="song-card song-practice"><h3>Quick practice</h3><p>听完当前歌词后，拼出你记住的目标词。</p><div className="song-practice-row"><span>♪</span><div><strong>逐句精听</strong><small>点击左侧歌词重复原声</small></div></div><div className="song-practice-row"><span>Aa</span><div><strong>拼写检查</strong><small>输入当前目标单词</small></div></div><div className="song-answer"><input value={practiceAnswer} onChange={(event) => setPracticeAnswer(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && checkPractice()} placeholder="输入英文单词"/><button type="button" onClick={checkPractice}>检查</button></div>{practiceFeedback && <p className="song-feedback">{practiceFeedback}</p>}</section>
          </aside>
        </section>
      </main>
    </div>
  );
};
