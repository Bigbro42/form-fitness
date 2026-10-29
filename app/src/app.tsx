import { start, useAppState } from './state/store';
import { Icon, type IconName } from './ui/icons';
import { href, useRoute, type Route } from './ui/router';
import { Data } from './ui/screens/Data';
import { History } from './ui/screens/History';
import { Home } from './ui/screens/Home';
import { SessionDetail } from './ui/screens/SessionDetail';

void start();

const TABS: { route: Route; label: string; icon: IconName; matches: Route['name'][] }[] = [
  { route: { name: 'home' }, label: 'Start', icon: 'home', matches: ['home'] },
  { route: { name: 'history' }, label: 'Verlauf', icon: 'history', matches: ['history', 'session'] },
  { route: { name: 'data' }, label: 'Daten', icon: 'data', matches: ['data'] },
];

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home': return <Home />;
    case 'history': return <History />;
    case 'session': return <SessionDetail id={route.id} />;
    case 'data': return <Data />;
  }
}

export function App() {
  const { phase, error } = useAppState();
  const route = useRoute();

  if (phase === 'loading') {
    return <div class="center-screen" aria-busy="true"><div><div class="spinner" /><p class="muted">Daten werden geladen …</p></div></div>;
  }
  if (phase === 'error') {
    return (
      <div class="center-screen">
        <div style={{ maxWidth: '36ch' }}>
          <h1 class="h2">FORM. kann nicht starten</h1>
          <p class="muted">{error}</p>
          <button class="btn btn-primary" onClick={() => location.reload()}>Erneut versuchen</button>
        </div>
      </div>
    );
  }
  return (
    <div class="app">
      <Screen key={route.name === 'session' ? route.id : route.name} route={route} />
      <nav class="tabbar" aria-label="Hauptnavigation">
        <div class="tabbar-inner">
          {TABS.map((t) => (
            <a key={t.label} class="tab" href={href(t.route)} aria-current={t.matches.includes(route.name) ? 'page' : undefined}>
              <Icon name={t.icon} size={24} />
              {t.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
