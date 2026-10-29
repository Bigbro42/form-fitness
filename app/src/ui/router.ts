import { useEffect, useState } from 'preact/hooks';

/** Hash routes keep the app working under any GitHub Pages sub path and offline. */
export type Route =
  | { name: 'home' }
  | { name: 'workout' }
  | { name: 'exercise'; id: string }
  | { name: 'summary'; id: string }
  | { name: 'calendar'; month?: string }
  /** New plan (optionally on a date), edit a series, or change a single occurrence. */
  | { name: 'plan'; planId?: string; original?: string; date?: string }
  | { name: 'library' }
  | { name: 'exerciseInfo'; id: string }
  | { name: 'customExercise'; id?: string }
  | { name: 'history' }
  | { name: 'session'; id: string }
  | { name: 'data' };

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query);
  const parts = (path ?? '').split('/').filter(Boolean).map(decodeURIComponent);
  const [a, b, c] = parts;
  if (a === 'kalender') return { name: 'calendar', ...(b && /^\d{4}-\d{2}$/.test(b) ? { month: b } : {}) };
  if (a === 'planen') return { name: 'plan', ...(b ? { planId: b } : {}), ...(c ? { original: c } : {}), ...(params.get('datum') ? { date: params.get('datum')! } : {}) };
  if (a === 'uebungen' && b === 'neu') return { name: 'customExercise' };
  if (a === 'uebungen' && b === 'bearbeiten' && c) return { name: 'customExercise', id: c };
  if (a === 'uebungen' && b) return { name: 'exerciseInfo', id: b };
  if (a === 'uebungen') return { name: 'library' };
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
    case 'calendar': return route.month ? `#/kalender/${route.month}` : '#/kalender';
    case 'plan': {
      const path = ['#/planen', route.planId, route.original].filter(Boolean).map((x, i) => (i ? encodeURIComponent(x!) : x)).join('/');
      return route.date ? `${path}?datum=${route.date}` : path;
    }
    case 'library': return '#/uebungen';
    case 'exerciseInfo': return `#/uebungen/${encodeURIComponent(route.id)}`;
    case 'customExercise': return route.id ? `#/uebungen/bearbeiten/${encodeURIComponent(route.id)}` : '#/uebungen/neu';
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
