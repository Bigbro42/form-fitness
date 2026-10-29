import { useEffect, useState } from 'preact/hooks';

/** Hash routes keep the app working under any GitHub Pages sub path and offline. */
export type Route =
  | { name: 'home' }
  | { name: 'history' }
  | { name: 'session'; id: string }
  | { name: 'data' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'verlauf' && parts[1]) return { name: 'session', id: parts[1] };
  if (parts[0] === 'verlauf') return { name: 'history' };
  if (parts[0] === 'daten') return { name: 'data' };
  return { name: 'home' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'history': return '#/verlauf';
    case 'session': return `#/verlauf/${encodeURIComponent(route.id)}`;
    case 'data': return '#/daten';
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
