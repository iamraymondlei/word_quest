import React, { useEffect, useRef, useState } from 'react';
import { apiService, Song, SongSegment } from '../utils/apiService';

const toLrc = (segments: SongSegment[]) => segments.map((line) => {
  const minutes = Math.floor(line.startTime / 60);
  const seconds = (line.startTime - minutes * 60).toFixed(2).padStart(5, '0');
  return `[${String(minutes).padStart(2, '0')}:${seconds}]${line.text}`;
}).join('\n');

export const updateLinkedSegment = (
  segments: SongSegment[],
  index: number,
  field: keyof SongSegment,
  value: string,
): SongSegment[] => {
  if (field === 'text') {
    return segments.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, text: value } : segment);
  }

  const time = Number(value);
  if (!Number.isFinite(time) || time < 0 || !segments[index]) return segments;

  const next = segments.map((segment) => ({ ...segment }));
  next[index][field] = time;

  if (field === 'endTime' && next[index + 1]) {
    next[index + 1].startTime = time;
  }
  if (field === 'startTime' && next[index - 1]) {
    next[index - 1].endTime = time;
  }

  return next;
};

export const SongManager: React.FC = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [selected, setSelected] = useState<Song | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lrcFile, setLrcFile] = useState<File | null>(null);
  const [lrcText, setLrcText] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [candidates, setCandidates] = useState<Array<{ id?: number; trackName?: string; artistName?: string; albumName?: string; duration?: number; syncedLyrics?: string; plainLyrics?: string }>>([]);
  const [lrcSource, setLrcSource] = useState<'lrclib' | 'manual'>('manual');
  const [lrclibId, setLrclibId] = useState<number | null>(null);
  const [matchDuration, setMatchDuration] = useState<number | null>(null);
  const [targetWordsText, setTargetWordsText] = useState('');
  const [segments, setSegments] = useState<SongSegment[]>([]);
  const [busy, setBusy] = useState(false);
  const audioProbe = useRef<HTMLAudioElement | null>(null);

  const loadSongs = async () => { try { setSongs(await apiService.getSongs()); } catch (error: any) { setStatus({ type: 'error', text: error.message }); } };
  useEffect(() => { void loadSongs(); }, []);

  const chooseSong = (song: Song) => { setSelected(song); setTitle(song.title); setArtist(song.artist); setAlbum(song.album); setLrcText(song.lrc_text || toLrc(song.segments)); setSegments(song.segments); setLrcSource(song.lrc_source === 'lrclib' ? 'lrclib' : 'manual'); setLrclibId(song.lrclib_id); setMatchDuration(song.match_duration_seconds); setTargetWordsText(song.targetWords.join(', ')); setStatus(null); };

  const readDuration = (file: File): Promise<number> => new Promise((resolve, reject) => {
    const audio = audioProbe.current || document.createElement('audio');
    audioProbe.current = audio;
    audio.onloadedmetadata = () => resolve(audio.duration);
    audio.onerror = () => reject(new Error('无法读取 MP3 时长'));
    audio.src = URL.createObjectURL(file);
  });

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!audioFile || !title.trim() || !artist.trim()) { setStatus({ type: 'error', text: '请填写歌曲名、歌手并选择 MP3' }); return; }
    setBusy(true); setStatus(null);
    try {
      const duration = await readDuration(audioFile);
      const form = new FormData();
      form.append('audio', audioFile); form.append('title', title); form.append('artist', artist); form.append('album', album); form.append('duration', String(duration));
      form.append('target_words', targetWordsText);
      if (lrcFile) form.append('lrc', lrcFile);
      if (lrcText.trim()) form.append('lrc_text', lrcText);
      const result = await apiService.uploadSong(form);
      setCandidates(result.candidates || []);
      setStatus({ type: 'success', text: result.candidates?.length ? '歌曲已上传，但需要从候选歌词中确认版本。' : '歌曲上传并完成歌词匹配。' });
      setAudioFile(null); setLrcFile(null); setLrcText(result.song.lrc_text || ''); await loadSongs(); chooseSong(result.song);
    } catch (error: any) { setStatus({ type: 'error', text: error.message }); } finally { setBusy(false); }
  };

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try { const parsedSegments = segments.length > 0 ? segments : await apiService.parseSongLrc(lrcText, selected.duration_seconds || undefined); const updated = await apiService.updateSong(selected.id, { title, artist, album, lrc_text: lrcText, lrc_source: lrcSource, lrclib_id: lrclibId, match_duration_seconds: matchDuration, segments: parsedSegments, target_words: targetWordsText.split(',').map((word) => word.trim()).filter(Boolean) }); chooseSong(updated); await loadSongs(); setStatus({ type: 'success', text: '歌曲和歌词已保存。' }); }
    catch (error: any) { setStatus({ type: 'error', text: error.message }); } finally { setBusy(false); }
  };

  const translate = async () => {
    if (!selected || segments.length === 0) return;
    setBusy(true);
    try {
      const result = await apiService.translateSong(selected.id, { sentences: segments.map((segment) => segment.text), words: targetWordsText.split(',').map((word) => word.trim()).filter(Boolean) });
      chooseSong(result.song);
      await loadSongs();
      setStatus({ type: 'success', text: '整句中文和单词释义已生成并保存。' });
    } catch (error: any) { setStatus({ type: 'error', text: error.message }); } finally { setBusy(false); }
  };

  const remove = async (song: Song) => {
    if (!window.confirm(`确认删除歌曲「${song.title}」？\n\n歌曲记录、歌词翻译和上传的 MP3 文件都会被删除。`)) return;
    setBusy(true);
    try {
      await apiService.deleteSong(song.id);
      setSelected(null);
      setStatus({ type: 'success', text: `歌曲「${song.title}」已删除。` });
      await loadSongs();
    } catch (error: any) {
      setStatus({ type: 'error', text: error.message });
    } finally { setBusy(false); }
  };

  const chooseCandidate = (candidate: typeof candidates[number]) => {
    if (!candidate.syncedLyrics || !selected) {
      setStatus({ type: 'error', text: '该候选只有普通歌词，无法作为逐句播放歌词。' });
      return;
    }
    setLrcText(candidate.syncedLyrics);
    setLrcSource('lrclib'); setLrclibId(candidate.id || null); setMatchDuration(candidate.duration || null);
    setStatus({ type: 'success', text: `已选择 ${candidate.trackName || title}，请点击“保存编辑”确认。` });
  };

  const reparseLyrics = async () => {
    if (!lrcText.trim()) return;
    try { setSegments(await apiService.parseSongLrc(lrcText, selected?.duration_seconds || undefined)); setStatus({ type: 'success', text: 'LRC 已重新解析，请检查每句边界后保存。' }); }
    catch (error: any) { setStatus({ type: 'error', text: error.message }); }
  };

  const updateSegment = (index: number, field: keyof SongSegment, value: string) => {
    setSegments((current) => updateLinkedSegment(current, index, field, value));
  };

  return <div className="space-y-6 animate-fade-in">
    <div className="grid lg:grid-cols-[0.7fr_1.3fr] gap-5">
      <div className="theme-card border theme-border rounded-2xl p-5">
        <h2 className="text-sm font-black text-cyan-300 mb-4">🎵 歌曲库</h2>
        <div className="space-y-2">{songs.map((song) => <button type="button" key={song.id} onClick={() => chooseSong(song)} className={`w-full text-left rounded-xl border px-3 py-3 cursor-pointer ${selected?.id === song.id ? 'border-cyan-400/60 bg-cyan-950/30' : 'border-slate-800 bg-slate-950/20'}`}><div className="text-sm font-bold">{song.title}</div><div className="text-[10px] text-slate-500">{song.artist} · {song.status === 'READY' ? '歌词已确认' : '待补充歌词'}</div></button>)}{songs.length === 0 && <p className="text-xs text-slate-500">还没有歌曲。</p>}</div>
      </div>
      <form onSubmit={upload} className="theme-card border theme-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-black text-violet-300">➕ 上传歌曲并匹配歌词</h2>
        <div className="grid sm:grid-cols-3 gap-3"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="歌曲名" className="field" /><input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="歌手" className="field" /><input value={album} onChange={(e) => setAlbum(e.target.value)} placeholder="专辑（可选）" className="field" /></div>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-xs text-slate-400">MP3 文件<input required type="file" accept="audio/mpeg,.mp3" onChange={(e) => setAudioFile(e.target.files?.[0] || null)} className="block w-full mt-2 text-xs" /></label><label className="text-xs text-slate-400">自有 LRC（可选）<input type="file" accept=".lrc,text/plain" onChange={(e) => setLrcFile(e.target.files?.[0] || null)} className="block w-full mt-2 text-xs" /></label></div>
        <textarea value={lrcText} onChange={(e) => setLrcText(e.target.value)} placeholder="也可以直接粘贴 LRC；留空则自动查询 LRCLIB" rows={5} className="field w-full" />
        <input value={targetWordsText} onChange={(e) => setTargetWordsText(e.target.value)} placeholder="目标单词（用逗号分隔，最多 20 个）" className="field w-full" />
        {status && <div className={`text-xs rounded-lg border p-3 ${status.type === 'success' ? 'border-emerald-500/40 text-emerald-300 bg-emerald-950/20' : 'border-rose-500/40 text-rose-300 bg-rose-950/20'}`}>{status.text}</div>}
        <div className="flex flex-wrap gap-2"><button disabled={busy} type="submit" className="rounded-lg bg-cyan-400 text-slate-950 px-4 py-2 text-xs font-black cursor-pointer disabled:opacity-50">{busy ? '处理中...' : '上传并匹配'}</button>{selected && <><button disabled={busy} type="button" onClick={save} className="rounded-lg border border-violet-400/40 text-violet-200 px-4 py-2 text-xs cursor-pointer">保存编辑</button><button disabled={busy || segments.length === 0} type="button" onClick={translate} className="rounded-lg border border-emerald-400/40 text-emerald-200 px-4 py-2 text-xs cursor-pointer">AI 翻译歌词</button><button type="button" onClick={() => { localStorage.setItem('wordquest_song_preview_admin', '1'); window.location.assign(`/songs/${selected.id}?preview=admin`); }} className="rounded-lg border border-cyan-400/40 text-cyan-200 px-4 py-2 text-xs font-bold cursor-pointer">👁 预览学员页面</button><button disabled={busy} type="button" onClick={() => remove(selected)} className="rounded-lg border border-rose-400/40 text-rose-200 px-4 py-2 text-xs cursor-pointer">删除歌曲</button></>}</div>
      </form>
    </div>
    {candidates.length > 0 && <div className="theme-card border border-amber-500/30 rounded-2xl p-5"><h3 className="text-sm font-bold text-amber-300 mb-3">LRCLIB 候选版本</h3><div className="space-y-2">{candidates.map((candidate) => <div key={candidate.id || `${candidate.trackName}-${candidate.duration}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/30 p-3"><div><div className="text-xs font-bold">{candidate.trackName} · {candidate.artistName}</div><div className="text-[10px] text-slate-500">{candidate.albumName || '未知专辑'} · {candidate.duration ? `${Math.round(candidate.duration)} 秒` : '未知时长'} · {candidate.syncedLyrics ? '有同步歌词' : '只有普通歌词'}</div></div><button type="button" onClick={() => chooseCandidate(candidate)} className="shrink-0 rounded-lg border border-amber-400/40 px-3 py-1.5 text-[10px] text-amber-100 cursor-pointer">选择</button></div>)}</div></div>}
    {selected && <div className="theme-card border theme-border rounded-2xl p-5"><div className="flex flex-wrap justify-between items-center gap-2 mb-3"><div><h3 className="text-sm font-bold text-amber-300">歌词预览与逐句校对</h3><p className="mt-1 text-[10px] text-slate-500">相邻歌词共享时间边界：修改本句结束时间，会同步下一句开始时间。</p></div><div className="flex items-center gap-3"><span className="text-[10px] text-slate-500">来源：{selected.lrc_source || '待匹配'} · {selected.duration_seconds ? `${Math.round(selected.duration_seconds)} 秒` : '未知时长'}</span><button type="button" onClick={reparseLyrics} className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-[10px] text-cyan-200 cursor-pointer">重新解析</button></div></div><textarea value={lrcText} onChange={(e) => setLrcText(e.target.value)} rows={8} className="field w-full font-mono text-xs mb-4" /><div className="grid grid-cols-[4rem_4rem_1fr] gap-2 px-1 mb-1 text-[10px] text-slate-500"><span>开始（秒）</span><span>结束（秒）</span><span>歌词</span></div><div className="space-y-2 max-h-96 overflow-y-auto">{segments.map((segment, index) => <div key={segment.id} className="grid grid-cols-[4rem_4rem_1fr] gap-2 items-center"><input type="number" step="0.01" min="0" value={segment.startTime} onChange={(event) => updateSegment(index, 'startTime', event.target.value)} className="field tabular-nums" aria-label={`第 ${index + 1} 句开始秒数`} title={index > 0 ? '修改后会同步上一句结束时间' : '开始秒数'} /><input type="number" step="0.01" min="0" value={segment.endTime} onChange={(event) => updateSegment(index, 'endTime', event.target.value)} className="field tabular-nums" aria-label={`第 ${index + 1} 句结束秒数`} title={index < segments.length - 1 ? '修改后会同步下一句开始时间' : '结束秒数'} /><input value={segment.text} onChange={(event) => updateSegment(index, 'text', event.target.value)} className="field" aria-label={`第 ${index + 1} 句歌词`} /></div>)}</div></div>}
  </div>;
};
