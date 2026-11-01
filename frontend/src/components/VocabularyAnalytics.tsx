import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../utils/apiService';

interface User {
  id: number;
  username: string;
  avatar: string;
  coins?: number;
  stars?: number;
  is_admin?: number;
}

interface WordBook {
  id: number;
  title: string;
  category: string;
}

interface VocabStatWord {
  vocab_id: number;
  word: string;
  phonetic: string | null;
  translation: string;
  book_id: number;
  book_title: string;
  mode: 'reading' | 'listening' | 'spelling';
  correct_count: number;
  error_count: number;
  total_attempts: number;
  error_rate: number;
  streak: number;
  mastered: boolean;
  last_result: number | null;
  last_practiced_at: string;
  weak_score: number;
  is_weak: boolean;
  is_qualified: boolean;
}

interface VocabStatsSummary {
  total_practiced: number;
  mastered_count: number;
  weak_count: number;
}

interface VocabularyAnalyticsProps {
  users?: User[];
}

export const VocabularyAnalytics: React.FC<VocabularyAnalyticsProps> = ({ users = [] }) => {
  const learnerUsers = useMemo(() => {
    return users.filter(u => !u.is_admin || u.username !== 'Admin');
  }, [users]);

  const [selectedUserId, setSelectedUserId] = useState<number>(
    learnerUsers[0]?.id || users[0]?.id || 1
  );
  const [selectedMode, setSelectedMode] = useState<'all' | 'reading' | 'spelling'>('all');
  const [selectedBookId, setSelectedBookId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'weak' | 'error' | 'recent'>('weak');

  const [books, setBooks] = useState<WordBook[]>([]);
  const [statsSummary, setStatsSummary] = useState<VocabStatsSummary>({
    total_practiced: 0,
    mastered_count: 0,
    weak_count: 0
  });
  const [wordList, setWordList] = useState<VocabStatWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load word books for dropdown filter
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await apiService.getWordBooks();
        if (Array.isArray(data)) {
          setBooks(data);
        }
      } catch (err) {
        console.warn('Failed to fetch books for analytics filter:', err);
      }
    };
    fetchBooks();
  }, []);

  // Update selected user when list changes
  useEffect(() => {
    if (learnerUsers.length > 0 && !learnerUsers.some(u => u.id === selectedUserId)) {
      setSelectedUserId(learnerUsers[0].id);
    }
  }, [learnerUsers, selectedUserId]);

  // Fetch stats data
  const loadStats = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const options: any = { sort: sortBy };
      if (selectedMode !== 'all') options.mode = selectedMode;
      if (selectedBookId !== 'all') options.bookId = Number(selectedBookId);

      const res = await apiService.getVocabularyStats(selectedUserId, options);
      if (res) {
        setStatsSummary(res.summary || { total_practiced: 0, mastered_count: 0, weak_count: 0 });
        setWordList(res.words || []);
      }
    } catch (err: any) {
      console.error('Failed to load vocabulary stats:', err);
      setErrorMsg(err.message || '加载学情数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedUserId, selectedMode, selectedBookId, sortBy]);

  const playSpeech = (word: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <h2 className="text-xl font-black text-white tracking-wide">
                单词宝库学情与生词弱项看板
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                TASK-12.1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              实时追踪学员在“看句选义”与“听音拼写”中的作答明细、每词答对/答错频次与连续连击数，基于不熟悉度加权智能排查薄弱词汇。
            </p>
          </div>

          {/* Student Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            {learnerUsers.map(user => {
              const isSelected = user.id === selectedUserId;
              return (
                <button
                  key={user.id}
                  onClick={() => setSelectedUserId(user.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20 scale-105'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                  }`}
                >
                  <span className="text-base">{user.avatar}</span>
                  <span>{user.username}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4 Summary Stat Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs font-semibold text-slate-400">总练习词次</div>
            <div className="text-2xl font-black text-white mt-1">
              {statsSummary.total_practiced}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">参与过测试的词汇</div>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
              <span>已掌握单词</span>
              <span>⭐</span>
            </div>
            <div className="text-2xl font-black text-emerald-300 mt-1">
              {statsSummary.mastered_count}
            </div>
            <div className="text-[10px] text-emerald-400/70 mt-1">连对 3 次以上</div>
          </div>

          <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs font-semibold text-rose-400 flex items-center justify-between">
              <span>薄弱待攻坚词</span>
              <span>⚠️</span>
            </div>
            <div className="text-2xl font-black text-rose-300 mt-1">
              {statsSummary.weak_count}
            </div>
            <div className="text-[10px] text-rose-400/70 mt-1">错误率高需专项巩固</div>
          </div>

          <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-xs font-semibold text-cyan-400 flex items-center justify-between">
              <span>掌握率</span>
              <span>🎯</span>
            </div>
            <div className="text-2xl font-black text-cyan-300 mt-1">
              {statsSummary.total_practiced > 0
                ? Math.round((statsSummary.mastered_count / statsSummary.total_practiced) * 100)
                : 0}%
            </div>
            <div className="text-[10px] text-cyan-400/70 mt-1">熟练词汇占比</div>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Mode Switch Pills */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedMode('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedMode === 'all'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              全部模式
            </button>
            <button
              onClick={() => setSelectedMode('reading')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedMode === 'reading'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📖 看句选义
            </button>
            <button
              onClick={() => setSelectedMode('spelling')}
              className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                selectedMode === 'spelling'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ✍️ 听音拼写
            </button>
          </div>

          {/* Book Filter */}
          <select
            value={selectedBookId}
            onChange={e => setSelectedBookId(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">📚 全部词单</option>
            {books.map(b => (
              <option key={b.id} value={b.id}>
                {b.title} ({b.category})
              </option>
            ))}
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">排序依据：</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="weak">⚡ 不熟悉度 (弱项优先)</option>
            <option value="error">❌ 答错次数降序</option>
            <option value="recent">⏱️ 最近练习时间</option>
          </select>

          <button
            onClick={loadStats}
            title="刷新数据"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer text-xs"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Main Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <div className="inline-block animate-spin text-2xl mb-2">⚡</div>
            <p className="text-sm font-medium">正在拉取 {selectedUser?.username} 的答题学情分析...</p>
          </div>
        ) : errorMsg ? (
          <div className="p-8 text-center text-rose-400">
            <p className="text-sm">⚠️ {errorMsg}</p>
            <button
              onClick={loadStats}
              className="mt-3 px-4 py-1.5 bg-slate-800 text-slate-200 text-xs rounded-lg hover:bg-slate-700 cursor-pointer"
            >
              重试
            </button>
          </div>
        ) : wordList.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <div className="text-4xl mb-3">🌱</div>
            <h3 className="text-base font-bold text-slate-300">暂无针对该筛选条件的练习记录</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              学员在单词宝库完成“看句选义”或“听音拼写”闯关后，作答对错、连击与弱项权重将自动记录并在此排行呈现。
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-mono uppercase tracking-wider">
                  <th className="py-3 px-4">单词与音标</th>
                  <th className="py-3 px-4">中文核心释义</th>
                  <th className="py-3 px-3">所属词单</th>
                  <th className="py-3 px-3">练习模式</th>
                  <th className="py-3 px-3 text-center">答对 / 答错</th>
                  <th className="py-3 px-3 text-center">错误率</th>
                  <th className="py-3 px-3 text-center">连对星数</th>
                  <th className="py-3 px-3 text-center">不熟悉度</th>
                  <th className="py-3 px-4 text-center">掌握状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {wordList.map(item => {
                  return (
                    <tr
                      key={`${item.vocab_id}_${item.mode}`}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Word & Audio */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => playSpeech(item.word)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-indigo-600/30 text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                            title="朗读发音"
                          >
                            🔊
                          </button>
                          <div>
                            <div className="font-bold text-white text-sm tracking-wide">
                              {item.word}
                            </div>
                            {item.phonetic && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                {item.phonetic}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Translation */}
                      <td className="py-3 px-4 text-slate-300 font-medium">
                        {item.translation}
                      </td>

                      {/* Book Title */}
                      <td className="py-3 px-3 text-slate-400 text-[11px] truncate max-w-[140px]">
                        {item.book_title}
                      </td>

                      {/* Mode Badge */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.mode === 'reading'
                              ? 'bg-blue-950/60 text-blue-300 border border-blue-500/30'
                              : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                          }`}
                        >
                          {item.mode === 'reading' ? '📖 看句选义' : '✍️ 听音拼写'}
                        </span>
                      </td>

                      {/* Correct / Error Counts */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-500/30">
                            +{item.correct_count}
                          </span>
                          <span className="text-slate-600">/</span>
                          <span className={`px-1.5 py-0.5 rounded font-bold border ${
                            item.error_count > 0
                              ? 'bg-rose-950 text-rose-400 border-rose-500/40'
                              : 'bg-slate-950 text-slate-500 border-slate-800'
                          }`}>
                            -{item.error_count}
                          </span>
                        </div>
                      </td>

                      {/* Error Rate */}
                      <td className="py-3 px-3 text-center">
                        <div className="w-20 mx-auto">
                          <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                            <span>{item.error_rate}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.error_rate > 50
                                  ? 'bg-rose-500'
                                  : item.error_rate > 20
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, item.error_rate)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Streak */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-0.5 font-mono font-bold text-amber-400 text-xs">
                          {item.streak >= 3 ? (
                            <span title={`连续达标 ${item.streak} 次`} className="text-emerald-400 font-bold">
                              🔥 {item.streak}
                            </span>
                          ) : item.streak > 0 ? (
                            <span>⭐ {item.streak}</span>
                          ) : (
                            <span className="text-slate-600 font-normal">0</span>
                          )}
                        </div>
                      </td>

                      {/* Weak Score */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-mono font-black text-xs ${
                            item.weak_score >= 60
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : item.weak_score >= 35
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {item.weak_score}
                        </span>
                      </td>

                      {/* Mastery Status */}
                      <td className="py-3 px-4 text-center">
                        {item.mastered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            ✓ 已掌握
                          </span>
                        ) : item.is_weak ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                            ⚡ 待攻坚
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            进行中
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default VocabularyAnalytics;
