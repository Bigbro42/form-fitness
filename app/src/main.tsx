import { render } from 'preact';
import { App } from './app';
import './ui/styles.css';

render(<App />, document.getElementById('app')!);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Scope is this folder only, so the legacy app's service worker is not affected.
  navigator.serviceWorker.register('./sw.js', { scope: './' })
    // Each start continues caching photos that are still missing (e.g. after going offline).
    .then(() => navigator.serviceWorker.ready.then((r) => r.active?.postMessage('warm-media')))
    .catch((e) => console.warn('Service worker not registered', e));
}
