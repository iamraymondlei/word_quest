import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker for offline support
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('WordQuest: New version available.');
  },
  onOfflineReady() {
    console.log('WordQuest: App is ready for offline use on iPad / tablet!');
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
