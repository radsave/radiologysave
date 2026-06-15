import { useEffect } from 'react';

/**
 * Lightweight SEO hook for a client-rendered SPA. Sets the document title,
 * meta description, canonical link, and injects a JSON-LD structured-data
 * block. Cleans up the JSON-LD on unmount so pages don't accumulate it.
 *
 * NOTE: because this runs client-side, crawlers that execute JS will see it.
 * For full crawlability by non-JS bots, server-side rendering would be needed.
 */
export function useSeo({ title, description, canonical, jsonLd }) {
  useEffect(() => {
    if (title) document.title = title;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }

    let canonicalTag;
    if (canonical) {
      canonicalTag = document.querySelector('link[rel="canonical"]') || document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      canonicalTag.setAttribute('href', canonical);
      if (!canonicalTag.parentNode) document.head.appendChild(canonicalTag);
    }

    let script;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      script.setAttribute('data-seo-jsonld', 'true');
      document.head.appendChild(script);
    }

    return () => {
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, [title, description, canonical, JSON.stringify(jsonLd)]);
}

export const SITE_URL = import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5173';
