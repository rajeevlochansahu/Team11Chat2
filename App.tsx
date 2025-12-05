import React, {useEffect, useRef} from 'react';
import {StatusBar, Platform} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {useNotifications, NotificationData} from './src/features/notifications';

const App: React.FC = () => {
  const initializationAttempted = useRef(false);

  const {initialize, deviceToken, hasPermission, isInitialized} =
    useNotifications({
      showForegroundAlert: true,
      onForegroundMessage: (notification: NotificationData) => {
        console.log('[App] Foreground notification received:', notification);
        // Handle foreground notification (e.g., update UI, show badge, etc.)
      },
      onNotificationOpened: (notification: NotificationData) => {
        console.log('[App] Notification opened:', notification);
        // Handle notification tap (e.g., navigate to specific screen)
        // You can access notification.data to get custom payload
      },
      onInitialNotification: (notification: NotificationData) => {
        console.log('[App] App opened from notification:', notification);
        // Handle when app was opened from a killed state via notification
      },
    });

  useEffect(() => {
    // Only initialize once
    if (initializationAttempted.current) {
      return;
    }

    // Only run on iOS
    if (Platform.OS !== 'ios') {
      return;
    }

    initializationAttempted.current = true;

    const initNotifications = async () => {
      const success = await initialize();
      if (success) {
        console.log('[App] Push notifications initialized successfully');
      } else {
        console.log('[App] Failed to initialize push notifications');
      }
    };

    initNotifications();
  }, [initialize]);

  // Log device token when available (useful for testing)
  useEffect(() => {
    if (deviceToken) {
      console.log('[App] Device Token available:', deviceToken);
      // You can send this token to your backend server here
    }
  }, [deviceToken]);

  // Log permission status
  useEffect(() => {
    if (isInitialized) {
      console.log(
        '[App] Notification permission:',
        hasPermission ? 'Granted' : 'Denied',
      );
    }
  }, [hasPermission, isInitialized]);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B2A" />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
