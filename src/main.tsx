import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import {StatusBar, Style} from '@capacitor/status-bar';
import {SplashScreen} from '@capacitor/splash-screen';
import {App as CapacitorApp} from '@capacitor/app';
import {defineCustomElements} from '@ionic/pwa-elements/loader';

// Initialize Capacitor PWA Elements for web browser camera support
defineCustomElements(window);

// Initialize Capacitor native overlays if running in native app environment
try {
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
  SplashScreen.hide().catch(() => {});
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.history.length > 1) {
      window.history.back();
    } else {
      void CapacitorApp.exitApp();
    }
  });
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
        // Check for a newly deployed shell immediately so an older cached PWA
        // cannot serve stale auth/recovery code on the next navigation.
        return registration.update();
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed: ', error);
      });
  });
}
