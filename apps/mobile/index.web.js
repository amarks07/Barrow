import { registerRootComponent } from 'expo';
import App from './App';

// Android-only: notifee background events and the home screen widget task
// handler (registered in index.js) have no web equivalent, so this entry
// skips both registrations entirely rather than importing native modules
// the web bundle can't use.
registerRootComponent(App);
