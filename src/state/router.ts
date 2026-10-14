import { useEffect, useState } from 'react';

/** Minimal hash router: "#/log/abc" → ["log", "abc"]. Works on static hosting without config. */
export function parseHash(hash: string): string[] {
  return hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
}

export function useRoute(): string[] {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', on);
    window.addEventListener('popstate', on);
    return () => {
      window.removeEventListener('hashchange', on);
      window.removeEventListener('popstate', on);
    };
  }, []);
  return route;
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const hash = `#/${path.replace(/^\//, '')}`;
  // Update history synchronously so route and data changes made in the same
  // handler render together (assigning location.hash fires hashchange later).
  if (opts.replace) window.history.replaceState(null, '', hash);
  else if (window.location.hash !== hash) window.history.pushState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.scrollTo({ top: 0 });
}

export function href(path: string): string {
  return `#/${path.replace(/^\//, '')}`;
}
