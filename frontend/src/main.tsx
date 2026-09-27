import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { registerSW } from 'virtual:pwa-register';
import { finishPendingOfflineSwitch, isForcedOffline } from './utils/offlineMode';

// The service worker blocks resources too; this stops application fetches before dispatch.
if (isForcedOffline()) {
  window.fetch = () => Promise.reject(new Error('离线模式已关闭网络请求'));
}

// Register PWA Service Worker for offline support
if (!isForcedOffline()) registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('WordQuest: New version available.');
  },
  onOfflineReady() {
    console.log('WordQuest: App is ready for offline use on iPad / tablet!');
  },
  onRegisterError(error) {
    console.error('WordQuest: Offline program registration failed:', error);
  },
});

void finishPendingOfflineSwitch();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
