import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import {StatusBar, Style} from '@capacitor/status-bar';
import {SplashScreen} from '@capacitor/splash-screen';

// Initialize Capacitor native overlays if running in native app environment
try {
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  SplashScreen.hide().catch(() => {});
} catch {
  // Ignore in browser
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });
}
