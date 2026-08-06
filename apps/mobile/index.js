import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import notifee from '@notifee/react-native';
import { focusWidgetTaskHandler } from './src/widget/focusWidgetTaskHandler';
import { focusNotificationBackgroundHandler } from './src/notification/focusNotificationHandler';

// Both registrations must run at module top-level, synchronously, since
// Android can invoke either handler headlessly (via HeadlessJsTaskService)
// with the app process otherwise dead — the JS bundle loads, these run,
// and App below never mounts at all in that case.
registerWidgetTaskHandler(focusWidgetTaskHandler);
notifee.onBackgroundEvent(focusNotificationBackgroundHandler);

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
