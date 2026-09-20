import React, { useState, useEffect } from 'react';
import { apiService, SyncStatus } from '../utils/apiService';

interface OfflineSyncBadgeProps {
  currentUserId?: number;
  onRefreshData?: () => void;
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({ currentUserId, onRefreshData }) => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    storyCount: 0,
    wordCount: 0,
  });
  const [showModal, setShowModal] = useState(false);
  const [isCaching, setIsCaching] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = apiService.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const handleManualCache = async () => {
    if (!currentUserId) return;
    setIsCaching(true);
    setCacheMessage(null);
    try {
      const result = await apiService.cacheAllForOffline(currentUserId);
      if (result.success) {
        setCacheMessage(
          `✅ 成功离线缓存 ${result.storyCount} 个故事，${result.wordCount} 个单词${
            result.illustrationCount ? `，${result.illustrationCount} 张插图` : ''
          }！可在无网时游玩。`
        );
        if (onRefreshData) onRefreshData();
      } else {
        setCacheMessage(`⚠️ 离线缓存失败: ${result.error}`);
      }
    } catch (e: any) {
      setCacheMessage(`⚠️ 离线缓存异常: ${e.message}`);
    } finally {
      setIsCaching(false);
    }
  };

  const handleManualSync = async () => {
    setCacheMessage(null);
    try {
      const res = await apiService.syncOfflineQueue();
      if (res.syncedCount > 0) {
        setCacheMessage(`✅ 已成功同步 ${res.syncedCount} 条离线进度到电脑！`);
        if (onRefreshData) onRefreshData();
      } else if (res.remainingCount > 0) {
        setCacheMessage(`⚠️ 网络未连通，剩余 ${res.remainingCount} 条进度待同步。`);
      } else {
        setCacheMessage('✨ 所有离线数据已与电脑保持最新同步！');
      }
    } catch (e: any) {
      setCacheMessage(`⚠️ 同步失败: ${e.message}`);
    }
  };

  return (
    <>
      {/* Top Bar Badge */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all backdrop-blur-md cursor-pointer border shadow-sm select-none"
        style={{
          backgroundColor: status.isOnline ? 'rgba(6, 78, 59, 0.4)' : 'rgba(120, 53, 15, 0.5)',
          borderColor: status.isOnline ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.5)',
          color: status.isOnline ? '#a7f3d0' : '#fef08a',
        }}
        title="点击查看离线状态与题库同步"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            status.isOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
          }`}
        />
        <span>{status.isOnline ? '在线' : '离线模式'}</span>

        {status.isSyncing && (
          <span className="text-cyan-300 animate-spin text-[10px]">🔄</span>
        )}

        {status.pendingCount > 0 && (
          <span className="bg-amber-500/30 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full border border-amber-400/40">
            {status.pendingCount}待同步
          </span>
        )}
      </button>

      {/* Offline Management Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📲</span>
                <h3 className="font-bold text-base text-white">iPad 离线模式与题库管理</h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCacheMessage(null);
                }}
                className="text-slate-400 hover:text-white text-lg p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Status overview cards */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">当前网络连接</div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className={status.isOnline ? 'text-emerald-400' : 'text-amber-300'}>
                    {status.isOnline ? '已连接局域网/互联网' : '未连接网络 (完全离线)'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">本地已缓存故事</div>
                <div className="font-bold text-cyan-300">
                  {status.storyCount > 0
                    ? `${status.storyCount} 个故事 (${status.wordCount} 词${
                        status.illustrationCount ? ` · ${status.illustrationCount} 张插画` : ''
                      })`
                    : '暂无离线故事'}
                </div>
              </div>
            </div>

            {/* Pending actions */}
            {status.pendingCount > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs space-y-2 text-amber-200">
                <div className="flex items-center justify-between font-bold">
                  <span>📦 有 {status.pendingCount} 条离线进度待同步</span>
                  {status.isOnline && (
                    <button
                      onClick={handleManualSync}
                      disabled={status.isSyncing}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer disabled:opacity-50 text-[11px]"
                    >
                      {status.isSyncing ? '同步中...' : '立即同步'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-amber-300/80">
                  离线游玩的金币、通关成绩已保存在 iPad 本地。连上电脑 Wi-Fi 后会自动同步！
                </p>
              </div>
            )}

            {/* Cache Message */}
            {cacheMessage && (
              <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs rounded-xl">
                {cacheMessage}
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleManualCache}
                disabled={isCaching || !status.isOnline || !currentUserId}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <span>{isCaching ? '⏳ 正在下载题库...' : '📥 离线缓存全部故事与单词 (出门前必备)'}</span>
              </button>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>温馨提示</strong>：外出（如坐车、没 Wi-Fi）前，请在家里点击上方按钮把故事存入 iPad 本地。断网后直接打开 iPad，即可离线畅玩所有关卡！
              </p>
            </div>

            {/* iPad Tip */}
            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300 flex items-center gap-1">
                <span>🎙️</span>
                <span>iPad 离线朗读小贴士:</span>
              </div>
              <p>
                断网时，关卡 4 模仿朗读请直接点击输入框，使用 iPad 键盘右下角的 <strong>🎙️ 自带麦克风</strong> 进行朗读听写，支持苹果端侧离线识别与自动评分。
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
