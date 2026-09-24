import { registerRootComponent } from 'expo';
import App from './App';

// Android-only: the home screen widget task handler (registered in
// index.js) has no web equivalent, so this entry skips that registration
// entirely rather than importing native modules the web bundle can't use.
registerRootComponent(App);
