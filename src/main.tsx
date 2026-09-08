import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);

// Registrar Service Worker para permitir instalação na tela inicial (PWA)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registrado:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Falha ao registrar Service Worker:', err);
      });
  });
}

