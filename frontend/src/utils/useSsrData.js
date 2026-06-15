import { useState, useEffect } from 'react';

/**
 * Isomorphic data hook for public pages.
 *
 * On the SERVER: returns data pre-injected into globalThis.__SSR_DATA__ by the
 * SSR server (already fetched from the DB), so renderToString produces full HTML.
 *
 * On the CLIENT:
 *  - If the page was SSR'd, window.__SSR_DATA__ is present from the inlined
 *    script — use it immediately (no loading flash, no refetch on first paint).
 *  - Otherwise (SPA navigation), call `fetcher` to load the data.
 *
 * @param {Function} fetcher - async () => data  (client-side fetch)
 * @returns {{ data, loading, error }}
 */
export function useSsrData(fetcher) {
  const isServer = typeof window === 'undefined';

  // Read any injected data (server global, or client-inlined global)
  const injected = isServer
    ? (globalThis.__SSR_DATA__ ?? null)
    : (window.__SSR_DATA__ ?? null);

  const [data, setData] = useState(injected);
  const [loading, setLoading] = useState(!injected);
  const [error, setError] = useState(null);

  useEffect(() => {
    // On the client: if we already have injected data, consume it once and stop.
    if (injected) {
      // Clear it so client-side navigations don't reuse stale SSR data
      if (typeof window !== 'undefined') window.__SSR_DATA__ = null;
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.resolve(fetcher())
      .then((d) => { if (!cancelled) { setData(d); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error };
}
