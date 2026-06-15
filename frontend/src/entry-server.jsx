import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Routes, Route } from 'react-router-dom';

import PatientLayout from './components/shared/PatientLayout';

// Public, SSR-rendered pages only
import CentersDirectoryPage from './pages/public/CentersDirectoryPage';
import CenterDetailPage from './pages/public/CenterDetailPage';
import ProceduresDirectoryPage from './pages/public/ProceduresDirectoryPage';
import ProcedureDetailPage from './pages/public/ProcedureDetailPage';

/**
 * Server-side render entry. Only the public SEO routes are rendered here.
 * `data` is fetched server-side (from the DB via the backend) and injected so
 * components render fully-populated HTML without a client round-trip.
 *
 * The rendered components read SSR data from a global the server sets, falling
 * back to client fetching when not present (so the same components work in the SPA).
 */
export function render(url, ssrData) {
  // Expose SSR data to components via a module-level hook the pages check.
  // (Pages use useSsrData() which reads from globalThis.__SSR_DATA__.)
  globalThis.__SSR_DATA__ = ssrData || null;

  const html = renderToString(
    <React.StrictMode>
      <StaticRouter location={url}>
        <Routes>
          <Route element={<PatientLayout />}>
            <Route path="/centers" element={<CentersDirectoryPage />} />
            <Route path="/centers/:slug" element={<CenterDetailPage />} />
            <Route path="/procedures" element={<ProceduresDirectoryPage />} />
            <Route path="/procedures/:slug" element={<ProcedureDetailPage />} />
          </Route>
        </Routes>
      </StaticRouter>
    </React.StrictMode>
  );

  // Collect any SEO head tags the pages registered during render
  const head = globalThis.__SSR_HEAD__ || { title: '', meta: '', jsonLd: '' };
  globalThis.__SSR_HEAD__ = null;
  globalThis.__SSR_DATA__ = null;

  return { html, head };
}
