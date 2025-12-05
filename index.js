/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

// Background notifications are now handled natively via APNs
// The native PushNotificationManager will emit events when notifications arrive

AppRegistry.registerComponent(appName, () => App);
