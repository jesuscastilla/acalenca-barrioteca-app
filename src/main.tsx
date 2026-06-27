import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Registro del Service Worker para habilitar capacidades de PWA
// Usamos ruta relativa para que funcione tanto en la raíz como en subrutas (ej: /barrioteca/)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.error('El registro del Service Worker ha fallado:', err);
    });
  });
}
