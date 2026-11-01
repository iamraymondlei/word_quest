import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiService, SyncStatus } from '../utils/apiService';
import { offlineStorage } from '../utils/offlineStorage';
import { consumeOfflineSwitchError, isForcedOffline, setForcedOffline } from '../utils/offlineMode';

interface OfflineSyncBadgeProps {
  currentUserId?: number;
  onRefreshData?: () => void;
  variant?: 'badge' | 'map';
  fontScale?: '100' | '115' | '130';
  onFontScaleChange?: (scale: '100' | '115' | '130') => void;
}

export const OfflineSyncBadge: React.FC<OfflineSyncBadgeProps> = ({
  currentUserId,
  onRefreshData,
  variant = 'badge',
  fontScale,
  onFontScaleChange
}) => {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine && !isForcedOffline() : true,
    forcedOffline: isForcedOffline(),
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    storyCount: 0,
    wordCount: 0,
  });
  const [initialSwitchError] = useState(() => consumeOfflineSwitchError());
  const [showModal, setShowModal] = useState(Boolean(initialSwitchError));
  const [isCaching, setIsCaching] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<string | null>(initialSwitchError);

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
          `✅ Cached ${result.storyCount} stories, ${result.wordCount} words${
            result.illustrationCount ? `, ${result.illustrationCount} pictures` : ''
          }!`
        );
        if (onRefreshData) onRefreshData();
      } else {
        setCacheMessage(`⚠️ Cache failed: ${result.error}`);
      }
    } catch (e: any) {
      setCacheMessage(`⚠️ Cache error: ${e.message}`);
    } finally {
      setIsCaching(false);
    }
  };

  const handleManualSync = async () => {
    setCacheMessage(null);
    try {
      const res = await apiService.syncOfflineQueue();
      if (res.syncedCount > 0) {
        setCacheMessage(`✅ Synced ${res.syncedCount} records to server!`);
        if (onRefreshData) onRefreshData();
      } else if (res.remainingCount > 0) {
        setCacheMessage(`⚠️ Offline: ${res.remainingCount} records pending sync.`);
      } else {
        setCacheMessage('✨ All data is in sync with server!');
      }
    } catch (e: any) {
      setCacheMessage(`⚠️ Sync failed: ${e.message}`);
    }
  };

  const handleModeSwitch = async () => {
    setCacheMessage(null);
    setIsSwitching(true);
    try {
      if (!status.forcedOffline) {
        const users = await offlineStorage.getCachedUsers();
        const candidates = currentUserId
          ? users.filter((user) => user.id === currentUserId)
          : users.filter((user) => user.username?.toLowerCase() !== 'admin');
        let hasCompleteCache = false;
        for (const user of candidates) {
          const stories = await offlineStorage.getCachedIslands(user.id);
          if (stories.length === 0) continue;
          const illustrationUrls = new Set<string>();
          for (const story of stories) {
            for (const page of story.story_passage_json || []) {
              if (page?.illustration_url) illustrationUrls.add(page.illustration_url);
            }
          }
          const illustrations = await Promise.all(
            [...illustrationUrls].map((url) => offlineStorage.getIllustrationBlob(url))
          );
          if (illustrations.every(Boolean)) {
            hasCompleteCache = true;
            break;
          }
        }
        if (!hasCompleteCache) {
          throw new Error('Incomplete offline cache. Please connect to Wi-Fi to download stories & art first.');
        }
      }
      await setForcedOffline(!status.forcedOffline);
    } catch (error) {
      setCacheMessage(`⚠️ ${error instanceof Error ? error.message : 'Switch failed'}`);
      setIsSwitching(false);
    }
  };

  return (
    <>
      {variant === 'map' ? (
        <div className="flex flex-wrap items-center gap-2 font-mono">
          {/* Font Scale Selector */}
          {fontScale && onFontScaleChange && (
            <div className="flex items-center p-1 rounded-xl bg-slate-950/70 border border-slate-800 shadow-sm font-mono">
              <span className="text-[10px] text-slate-400 font-bold px-1.5 select-none">
                Font
              </span>
              {(['100', '115', '130'] as const).map((scale) => (
                <button
                  key={scale}
                  type="button"
                  onClick={() => onFontScaleChange(scale)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                    fontScale === scale
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/50 shadow-sm font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={`Set font scale: ${scale}%`}
                >
                  {scale === '130' ? '130%' : `${scale}%`}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-xl border theme-border bg-slate-950/50 px-3 py-2 text-xs font-bold theme-text cursor-pointer hover:border-cyan-400 flex items-center gap-2 shadow-sm"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status.forcedOffline
                  ? 'bg-amber-400'
                  : status.isOnline
                  ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                  : 'bg-rose-400'
              }`}
            />
            <span>{status.forcedOffline ? 'Offline · Manage' : status.isOnline ? 'Online · Manage' : 'No Network · Manage'}</span>
            {status.pendingCount > 0 && <span className="text-amber-400">({status.pendingCount} pending)</span>}
          </button>
        </div>
      ) : <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all backdrop-blur-md cursor-pointer border shadow-sm select-none"
        style={{
          backgroundColor: status.isOnline ? 'rgba(6, 78, 59, 0.4)' : 'rgba(120, 53, 15, 0.5)',
          borderColor: status.isOnline ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 191, 36, 0.5)',
          color: status.isOnline ? '#a7f3d0' : '#fef08a',
        }}
        title="Offline status & data sync"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            status.isOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]' : 'bg-amber-400'
          }`}
        />
        <span>{status.forcedOffline ? 'Offline' : status.isOnline ? 'Online' : 'Offline (No Net)'}</span>

        {status.isSyncing && (
          <span className="text-cyan-300 animate-spin text-[10px]">🔄</span>
        )}

        {status.pendingCount > 0 && (
          <span className="bg-amber-500/30 text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full border border-amber-400/40">
            {status.pendingCount} pending
          </span>
        )}
      </button>}

      {/* Offline Management Modal */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-100 font-mono space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📲</span>
                <h3 className="font-bold text-base text-white">iPad Offline & Data Management</h3>
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
                <div className="text-slate-400">Network Status</div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status.isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span className={status.isOnline ? 'text-emerald-400' : 'text-amber-300'}>
                    {status.forcedOffline ? 'Offline mode enabled' : status.isOnline ? 'Connected' : 'No connection'}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="text-slate-400">Cached Stories</div>
                <div className="font-bold text-cyan-300">
                  {status.storyCount > 0
                    ? `${status.storyCount} stories (${status.wordCount} words${
                        status.illustrationCount ? `, ${status.illustrationCount} pictures` : ''
                      })`
                    : 'No cached stories'}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-slate-950/60 p-3 space-y-2 text-xs">
              <div className="font-bold text-cyan-200">Mode</div>
              <button
                type="button"
                role="switch"
                aria-checked={status.forcedOffline}
                onClick={handleModeSwitch}
                disabled={isSwitching || isCaching}
                className="w-full rounded-lg border border-cyan-500/50 px-3 py-2 font-bold text-white hover:bg-cyan-900/50 disabled:opacity-50 cursor-pointer"
              >
                {isSwitching ? 'Switching...' : status.forcedOffline ? 'Offline Active · Tap to Go Online' : 'Online Active · Tap to Go Offline'}
              </button>
              <p className="text-slate-400">Offline mode stays saved on this device. Closing the browser will keep using cached data until switched back to online.</p>
            </div>

            {/* Pending actions */}
            {status.pendingCount > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs space-y-2 text-amber-200">
                <div className="flex items-center justify-between font-bold">
                  <span>📦 {status.pendingCount} records pending sync</span>
                  {status.isOnline && (
                    <button
                      onClick={handleManualSync}
                      disabled={status.isSyncing}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer disabled:opacity-50 text-[11px]"
                    >
                      {status.isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Progress and coins earned offline are saved locally on iPad and will sync once back online.
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
                <span>{isCaching ? '⏳ Downloading...' : '📥 Cache All Stories & Words (For Offline)'}</span>
              </button>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 <strong>Tip</strong>: Click the button above to cache all stories to iPad before heading out without Wi-Fi.
              </p>
            </div>

            {/* iPad Tip */}
            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-300 flex items-center gap-1">
                <span>🎙️</span>
                <span>iPad Offline Dictation Tip:</span>
              </div>
              <p>
                When offline, tap the text input and use the <strong>🎙️ Mic button</strong> on the iPad keyboard for on-device speech recognition.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
