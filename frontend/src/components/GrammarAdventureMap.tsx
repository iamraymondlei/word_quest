import React, { useState, useEffect } from 'react';
import { apiService } from '../utils/apiService';
import { GrammarPracticeView } from './GrammarPracticeView';

interface GrammarAdventureMapProps {
  currentUser?: {
    id: number;
    username: string;
    coins: number;
    stars?: number;
    avatar?: string;
    is_admin?: number;
  } | null;
  onUpdateUser?: (updatedUser: any) => void;
  onBackToStories?: () => void;
}

export const GrammarAdventureMap: React.FC<GrammarAdventureMapProps> = ({
  currentUser,
  onUpdateUser,
}) => {
  const [selectedQuizId, setSelectedQuizId] = useState<'unit1' | 'unit2' | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('present_simple');
  const [progressSummary, setProgressSummary] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user's grammar progress
  const fetchProgress = async () => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }
    try {
      const data = await apiService.getGrammarProgress(currentUser.id);
      setProgressSummary(data || {});
    } catch (err) {
      console.warn('Could not fetch grammar progress summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [currentUser?.id]);

  // If a quiz card is opened, render the drill view
  if (selectedQuizId) {
    return (
      <GrammarPracticeView
        currentUser={currentUser}
        initialQuizId={selectedQuizId}
        onBack={() => {
          setSelectedQuizId(null);
          fetchProgress();
        }}
        onUpdateUser={onUpdateUser}
      />
    );
  }

  const u1Progress = progressSummary['unit1'];
  const u2Progress = progressSummary['unit2'];

  return (
    <div className="w-full min-h-full bg-[#0B101B] text-slate-100 font-sans p-4 sm:p-6 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Compact Header & Category Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-lg sm:text-xl font-black font-mono tracking-tight text-white uppercase flex items-center gap-2">
              <span>⚡</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-300 to-cyan-400">
                Grammar Quest (综合训练)
              </span>
            </h1>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedCategory('present_simple')}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
                  selectedCategory === 'present_simple'
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-400/80 shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⚡</span>
                <span>一般现在时</span>
                <span className="px-1.5 py-0.2 rounded-full text-3xs bg-amber-400 text-slate-950 font-black">
                  2 专练
                </span>
              </button>

              <button
                type="button"
                disabled
                className="px-2.5 py-1 rounded-xl text-xs font-mono text-slate-500 bg-slate-950/60 border border-slate-800/60 flex items-center gap-1.5 cursor-not-allowed opacity-60"
              >
                <span>⏳</span>
                <span>现在进行时</span>
              </button>

              <button
                type="button"
                disabled
                className="px-2.5 py-1 rounded-xl text-xs font-mono text-slate-500 bg-slate-950/60 border border-slate-800/60 flex items-center gap-1.5 cursor-not-allowed opacity-60"
              >
                <span>⏳</span>
                <span>一般过去时</span>
              </button>
            </div>
          </div>

          <span className="text-xs font-mono text-slate-400 hidden lg:inline">
            满 80% 获通关金币与星星奖励
          </span>
        </div>

        {/* Cards Grid (Story Quest Style) */}
        {isLoading ? (
          <div className="py-16 text-center text-xs font-mono text-cyan-300 animate-pulse flex items-center justify-center gap-2">
            <span className="text-xl">🌀</span>
            <span>正在同步语法关卡与战绩数据...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: 专题专练 1 */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131B2E] via-[#0F172A] to-[#181D38] border border-[#1F2D4A] hover:border-amber-400/60 transition-all duration-300 p-6 sm:p-7 shadow-xl hover:shadow-[0_0_25px_rgba(245,158,11,0.2)] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl text-3xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  STAGE 01
                </span>
                {u1Progress?.isPassed ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span>🏆</span>
                    <span>已通关 (最高 {u1Progress.bestScore}%)</span>
                  </span>
                ) : u1Progress ? (
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    已练 {u1Progress.attemptsCount} 次 (最高 {u1Progress.bestScore}%)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono text-slate-400 bg-slate-800/60 border border-slate-700">
                    未开始 ⏳
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-mono text-white group-hover:text-amber-300 transition-colors">
                      专题专练 1：动词变位与基础句型
                    </h3>
                    <p className="text-2xs text-slate-400 font-mono mt-0.5">
                      Present Simple Fundamentals & Verb Inflexion
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-mono mt-3 leading-relaxed">
                  系统练习动词第三人称单数加 -s/-es/变y为i 规则，掌握单选考点辨析、主谓一致动词填空与否定句/疑问句转换。
                </p>
              </div>

              {/* Badges/Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-3xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300">
                  🔤 24动词三单变位
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-purple-300">
                  🎯 5单选题
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-emerald-300">
                  ✏️ 7动词填空
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300">
                  🔄 4句型转换
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="text-3xs font-mono text-slate-400">
                通关奖励：<span className="text-amber-300 font-bold">+50 🪙</span>{' '}
                <span className="text-cyan-300 font-bold">+1 ⭐</span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedQuizId('unit1')}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-mono font-black text-xs shadow-lg shadow-amber-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>{u1Progress ? '复习 / 重做' : '开始挑战'}</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Card 2: 专题专练 2 */}
          <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131B2E] via-[#0F172A] to-[#181D38] border border-[#1F2D4A] hover:border-cyan-400/60 transition-all duration-300 p-6 sm:p-7 shadow-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-xl text-3xs font-mono font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  STAGE 02
                </span>
                {u2Progress?.isPassed ? (
                  <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span>🏆</span>
                    <span>已通关 (最高 {u2Progress.bestScore}%)</span>
                  </span>
                ) : u2Progress ? (
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    已练 {u2Progress.attemptsCount} 次 (最高 {u2Progress.bestScore}%)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono text-slate-400 bg-slate-800/60 border border-slate-700">
                    未开始 ⏳
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                    🚀
                  </div>
                  <div>
                    <h3 className="text-lg font-black font-mono text-white group-hover:text-cyan-300 transition-colors">
                      专题专练 2：短文填空与同义转换
                    </h3>
                    <p className="text-2xs text-slate-400 font-mono mt-0.5">
                      Story Cloze & Advanced Syntax Transformations
                    </p>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-mono mt-3 leading-relaxed">
                  巩固动词主谓一致形态，在生动的《Mrs. Black’s Day》短文语篇中实战应用，熟练掌握同义句转换与一般疑问句简略回答。
                </p>
              </div>

              {/* Badges/Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1 font-mono text-3xs">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-emerald-300">
                  ✏️ 8动词填空
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300">
                  📖 9篇章填空
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-cyan-300">
                  🔄 5同义句转换
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <div className="text-3xs font-mono text-slate-400">
                通关奖励：<span className="text-amber-300 font-bold">+50 🪙</span>{' '}
                <span className="text-cyan-300 font-bold">+1 ⭐</span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedQuizId('unit2')}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-mono font-black text-xs shadow-lg shadow-cyan-500/25 cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>{u2Progress ? '复习 / 重做' : '开始挑战'}</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
};
