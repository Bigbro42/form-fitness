import { start, useAppState } from './state/store';
import { Icon, type IconName } from './ui/icons';
import { href, useRoute, type Route } from './ui/router';
import { Calendar } from './ui/screens/Calendar';
import { CustomExercise } from './ui/screens/CustomExercise';
import { Data } from './ui/screens/Data';
import { ExerciseInfo } from './ui/screens/ExerciseInfo';
import { ExerciseScreen } from './ui/screens/ExerciseScreen';
import { History } from './ui/screens/History';
import { PlanEditor } from './ui/screens/PlanEditor';
import { Home } from './ui/screens/Home';
import { Library } from './ui/screens/Library';
import { SessionDetail } from './ui/screens/SessionDetail';
import { Summary } from './ui/screens/Summary';
import { Workout } from './ui/screens/Workout';
import { RestBar } from './ui/workout-parts';

void start();

const TABS: { route: Route; label: string; icon: IconName; matches: Route['name'][] }[] = [
  { route: { name: 'home' }, label: 'Start', icon: 'home', matches: ['home', 'data'] },
  { route: { name: 'workout' }, label: 'Training', icon: 'dumbbell', matches: ['workout', 'exercise', 'summary'] },
  { route: { name: 'calendar' }, label: 'Kalender', icon: 'calendar', matches: ['calendar', 'plan'] },
  { route: { name: 'library' }, label: 'Übungen', icon: 'body', matches: ['library', 'exerciseInfo', 'customExercise'] },
  { route: { name: 'history' }, label: 'Verlauf', icon: 'history', matches: ['history', 'session'] },
];

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home': return <Home />;
    case 'workout': return <Workout />;
    case 'exercise': return <ExerciseScreen id={route.id} />;
    case 'summary': return <Summary id={route.id} />;
    case 'calendar': return <Calendar month={route.month} />;
    case 'plan': return <PlanEditor planId={route.planId} original={route.original} date={route.date} />;
    case 'library': return <Library />;
    case 'exerciseInfo': return <ExerciseInfo id={route.id} />;
    case 'customExercise': return <CustomExercise id={route.id} />;
    case 'history': return <History />;
    case 'session': return <SessionDetail id={route.id} />;
    case 'data': return <Data />;
  }
}

export function App() {
  const { phase, error, rest } = useAppState();
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
    <div class={`app${route.name === 'exercise' ? ' app-focus' : ''}${rest ? ' has-rest' : ''}`}>
      <Screen key={route.name === 'plan' ? `plan:${route.planId}:${route.original}:${route.date}` : route.name === 'calendar' ? 'calendar' : 'id' in route ? `${route.name}:${route.id ?? ''}` : route.name} route={route} />
      <RestBar />
      {/* Hidden while logging sets: more room, one-handed navigation at the bottom instead. */}
      <nav class="tabbar" aria-label="Hauptnavigation" hidden={route.name === 'exercise'}>
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
