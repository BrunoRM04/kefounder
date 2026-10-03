import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/components.css';
import './styles/shell.css';
import './styles/discover.css';
import './styles/detail.css';
import './styles/inbox.css';
import './styles/screens.css';
import './styles/pages.css';
import './styles/help.css';
import './styles/desktop.css';

// Preferencias guardadas con el nombre anterior (FOUND) pasan a las claves de KeFounder!.
try {
  for (const key of Object.keys(window.localStorage)) {
    if (!key.startsWith('found:')) continue;
    const next = `kefounder:${key.slice('found:'.length)}`;
    if (window.localStorage.getItem(next) === null) window.localStorage.setItem(next, window.localStorage.getItem(key));
    window.localStorage.removeItem(key);
  }
} catch { /* sin storage disponible */ }

createRoot(document.getElementById('root')).render(<App />);
