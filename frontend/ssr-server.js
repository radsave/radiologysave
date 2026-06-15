/**
 * SSR server for the public SEO routes (/centers, /procedures and detail pages).
 *
 * - In dev: uses Vite in middleware mode for HMR + on-the-fly SSR transform.
 * - In prod: serves the built client assets and uses the built server bundle.
 *
 * All OTHER routes fall through to the SPA index.html (client-rendered as before).
 *
 * Run:
 *   dev:  NODE_ENV=development node ssr-server.js
 *   prod: npm run build:ssr && NODE_ENV=production node ssr-server.js
 *
 * Set API_URL to your backend (default http://localhost:4000) for server-side
 * data fetching, and PORT (default 5173).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5173;
const API_URL = process.env.API_URL || 'http://localhost:4000';

// Which paths get SSR. Everything else → SPA.
const SSR_PATHS = [/^\/centers(\/|$)/, /^\/procedures(\/|$)/];
const isSsrPath = (url) => SSR_PATHS.some((re) => re.test(url.split('?')[0]));

// Server-side data fetch per route, mirroring each page's client fetch.
async function fetchSsrData(pathname) {
  const clean = pathname.split('?')[0];
  const get = async (apiPath) => {
    const r = await fetch(`${API_URL}/api${apiPath}`);
    if (!r.ok) throw Object.assign(new Error('not found'), { status: r.status });
    return r.json();
  };
  if (clean === '/centers') return get('/directory/centers');
  if (clean === '/procedures') return get('/directory/procedures');
  const cm = clean.match(/^\/centers\/([^/]+)$/);
  if (cm) return get(`/directory/centers/${cm[1]}`);
  const pm = clean.match(/^\/procedures\/([^/]+)$/);
  if (pm) return get(`/directory/procedures/${pm[1]}`);
  return null;
}

async function createServer() {
  const app = express();
  let vite;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: 24679 } },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use((await import('compression')).default());
    app.use('/assets', express.static(path.resolve(__dirname, 'dist/client/assets')));
    app.use(express.static(path.resolve(__dirname, 'dist/client'), { index: false }));
  }

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;
    try {
      // Non-SSR routes → serve the SPA shell (client renders it)
      if (!isSsrPath(url)) {
        let template = isProd
          ? fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8')
          : fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        if (!isProd) template = await vite.transformIndexHtml(url, template);
        return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      }

      // SSR route: fetch data, render, inject
      let ssrData = null;
      let status = 200;
      try {
        ssrData = await fetchSsrData(url);
      } catch (e) {
        status = e.status === 404 ? 404 : 200; // render the page's own not-found UI
      }

      let template, render;
      if (!isProd) {
        template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        render = (await vite.ssrLoadModule('/src/entry-server.jsx')).render;
      } else {
        template = fs.readFileSync(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8');
        render = (await import('./dist/server/entry-server.js')).render;
      }

      const { html, head } = render(url, ssrData);

      const headTags = [head.title, head.meta, head.jsonLd].filter(Boolean).join('\n    ');
      const dataScript = ssrData
        ? `<script>window.__SSR_DATA__ = ${JSON.stringify(ssrData).replace(/</g, '\\u003c')}</script>`
        : '';

      const finalHtml = template
        .replace('</head>', `    ${headTags}\n    ${dataScript}\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root">${html}</div>`);

      res.status(status).set({ 'Content-Type': 'text/html' }).end(finalHtml);
    } catch (e) {
      if (vite) vite.ssrFixStacktrace(e);
      console.error('[ssr] error:', e);
      next(e);
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🌐 SSR server (public pages) on http://localhost:${PORT}  [${isProd ? 'prod' : 'dev'}]`);
    console.log(`   SSR routes: /centers, /procedures (+ detail pages). All else → SPA.`);
  });
}

createServer();
