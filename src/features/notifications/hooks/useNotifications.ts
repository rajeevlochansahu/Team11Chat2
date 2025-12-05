import {useState, useEffect, useCallback, useRef} from 'react';
import {Alert, Platform, Linking} from 'react-native';
import {nativePushNotificationService} from '../services/nativePushNotificationService';
import type {NotificationData, NotificationState} from '../types';

interface UseNotificationsOptions {
  onForegroundMessage?: (notification: NotificationData) => void;
  onNotificationOpened?: (notification: NotificationData) => void;
  onInitialNotification?: (notification: NotificationData) => void;
  showForegroundAlert?: boolean;
}

interface UseNotificationsReturn extends NotificationState {
  initialize: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
  getDeviceToken: () => string | null;
  setBadgeCount: (count: number) => Promise<void>;
  getBadgeCount: () => Promise<number>;
  removeAllDeliveredNotifications: () => void;
}

/**
 * Hook for managing native APNs push notifications in React components
 */
export const useNotifications = (
  options: UseNotificationsOptions = {},
): UseNotificationsReturn => {
  const [state, setState] = useState<NotificationState>({
    isInitialized: false,
    hasPermission: false,
    deviceToken: null,
    error: null,
  });

  // Use refs for callbacks to avoid re-initialization loops
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const {showForegroundAlert = true} = options;

  // Initialize notifications - stable callback that doesn't change
  const initialize = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') {
      console.log('[useNotifications] Only iOS is supported');
      setState(prev => ({
        ...prev,
        isInitialized: true,
        error: 'Only iOS is supported',
      }));
      return false;
    }

    try {
      setState(prev => ({...prev, error: null}));

      // Set up handlers before initializing - use refs to get latest values
      nativePushNotificationService.setHandlers({
        onForegroundMessage: (notification: NotificationData) => {
          const currentOptions = optionsRef.current;
          if (showForegroundAlert && notification.title) {
            Alert.alert(
              notification.title,
              notification.body || '',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    if (currentOptions.onForegroundMessage) {
                      currentOptions.onForegroundMessage(notification);
                    }
                  },
                },
              ],
              {cancelable: true},
            );
          } else if (currentOptions.onForegroundMessage) {
            currentOptions.onForegroundMessage(notification);
          }
        },
        onNotificationOpened: (notification: NotificationData) => {
          const currentOptions = optionsRef.current;
          if (currentOptions.onNotificationOpened) {
            currentOptions.onNotificationOpened(notification);
          }
        },
        onInitialNotification: (notification: NotificationData) => {
          const currentOptions = optionsRef.current;
          if (currentOptions.onInitialNotification) {
            currentOptions.onInitialNotification(notification);
          }
        },
      });

      const success = await nativePushNotificationService.initialize();

      if (success) {
        const token = nativePushNotificationService.getDeviceToken();
        setState({
          isInitialized: true,
          hasPermission: true,
          deviceToken: token,
          error: null,
        });
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isInitialized: true,
          hasPermission: false,
          error: 'Failed to initialize notifications',
        }));
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isInitialized: false,
        error: errorMessage,
      }));
      return false;
    }
  }, [showForegroundAlert]); // Only depend on showForegroundAlert, not the callbacks

  // Request permission manually
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const result = await nativePushNotificationService.requestPermission();
      setState(prev => ({...prev, hasPermission: result.granted}));

      if (!result.granted) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to receive important updates.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openURL('app-settings:');
              },
            },
          ],
        );
      }

      return result.granted;
    } catch (error) {
      console.error('[useNotifications] Request permission error:', error);
      return false;
    }
  }, []);

  // Get device token
  const getDeviceToken = useCallback((): string | null => {
    return nativePushNotificationService.getDeviceToken();
  }, []);

  // Set badge count
  const setBadgeCount = useCallback(async (count: number): Promise<void> => {
    await nativePushNotificationService.setBadgeCount(count);
  }, []);

  // Get badge count
  const getBadgeCount = useCallback(async (): Promise<number> => {
    return await nativePushNotificationService.getBadgeCount();
  }, []);

  // Remove all delivered notifications
  const removeAllDeliveredNotifications = useCallback((): void => {
    nativePushNotificationService.removeAllDeliveredNotifications();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      nativePushNotificationService.cleanup();
    };
  }, []);

  return {
    ...state,
    initialize,
    requestPermission,
    getDeviceToken,
    setBadgeCount,
    getBadgeCount,
    removeAllDeliveredNotifications,
  };
};
