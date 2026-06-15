import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/globals.css';

const root = document.getElementById('root');

// If the root already has SSR'd markup (public pages), hydrate it.
// Otherwise (SPA shell), do a fresh client render.
if (root.hasChildNodes()) {
  ReactDOM.hydrateRoot(root, <React.StrictMode><App /></React.StrictMode>);
} else {
  ReactDOM.createRoot(root).render(<React.StrictMode><App /></React.StrictMode>);
}
