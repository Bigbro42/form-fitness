import { useEffect, useState } from 'preact/hooks';

/** Hash routes keep the app working under any GitHub Pages sub path and offline. */
export type Route =
  | { name: 'home' }
  | { name: 'workout' }
  | { name: 'exercise'; id: string }
  | { name: 'summary'; id: string }
  | { name: 'history' }
  | { name: 'session'; id: string }
  | { name: 'data' };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b] = parts;
  if (a === 'training' && b) return { name: 'exercise', id: b };
  if (a === 'training') return { name: 'workout' };
  if (a === 'geschafft' && b) return { name: 'summary', id: b };
  if (a === 'verlauf' && b) return { name: 'session', id: b };
  if (a === 'verlauf') return { name: 'history' };
  if (a === 'daten') return { name: 'data' };
  return { name: 'home' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'workout': return '#/training';
    case 'exercise': return `#/training/${encodeURIComponent(route.id)}`;
    case 'summary': return `#/geschafft/${encodeURIComponent(route.id)}`;
    case 'history': return '#/verlauf';
    case 'session': return `#/verlauf/${encodeURIComponent(route.id)}`;
    case 'data': return '#/daten';
  }
}

export function navigate(route: Route, replace = false) {
  const target = href(route);
  if (replace) location.replace(target);
  else location.hash = target;
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
