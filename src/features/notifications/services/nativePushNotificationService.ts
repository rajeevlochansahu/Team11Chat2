import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import type {
  NotificationData,
  NotificationHandlers,
  PermissionStatus,
  DeliveredNotification,
} from '../types';

const {PushNotificationManager} = NativeModules;

// Event emitter for receiving native events
const eventEmitter = PushNotificationManager
  ? new NativeEventEmitter(PushNotificationManager)
  : null;

/**
 * Native APNs Push Notification Service
 * Uses native iOS implementation via React Native bridge
 */
class NativePushNotificationService {
  private isInitialized: boolean = false;
  private handlers: NotificationHandlers = {};
  private subscriptions: Array<{remove: () => void}> = [];
  private deviceToken: string | null = null;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('[NativePushNotificationService] Only iOS is supported');
      return false;
    }

    if (!PushNotificationManager) {
      console.error(
        '[NativePushNotificationService] Native module not available',
      );
      return false;
    }

    if (this.isInitialized) {
      console.log('[NativePushNotificationService] Already initialized');
      return true;
    }

    try {
      console.log('[NativePushNotificationService] Initializing...');

      // Set up event listeners
      this.setupEventListeners();

      // Request permission
      const permissionResult = await this.requestPermission();
      if (!permissionResult.granted) {
        console.log('[NativePushNotificationService] Permission denied');
        return false;
      }

      // Check for initial notification
      await this.checkInitialNotification();

      this.isInitialized = true;
      console.log('[NativePushNotificationService] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[NativePushNotificationService] Initialization error:', error);
      return false;
    }
  }

  /**
   * Set up native event listeners
   */
  private setupEventListeners(): void {
    if (!eventEmitter) {
      return;
    }

    // Device token received
    const tokenSubscription = eventEmitter.addListener(
      'onDeviceTokenReceived',
      (event: {token: string}) => {
        console.log('[NativePushNotificationService] Device token:', event.token);
        this.deviceToken = event.token;
      },
    );
    this.subscriptions.push(tokenSubscription);

    // Registration error
    const errorSubscription = eventEmitter.addListener(
      'onRegistrationError',
      (event: {error: string}) => {
        console.error(
          '[NativePushNotificationService] Registration error:',
          event.error,
        );
      },
    );
    this.subscriptions.push(errorSubscription);

    // Notification received in foreground
    const notificationSubscription = eventEmitter.addListener(
      'onNotificationReceived',
      (notification: NotificationData) => {
        console.log(
          '[NativePushNotificationService] Notification received:',
          notification,
        );
        if (this.handlers.onForegroundMessage) {
          this.handlers.onForegroundMessage(notification);
        }
      },
    );
    this.subscriptions.push(notificationSubscription);

    // Notification opened (tapped)
    const openedSubscription = eventEmitter.addListener(
      'onNotificationOpened',
      (notification: NotificationData) => {
        console.log(
          '[NativePushNotificationService] Notification opened:',
          notification,
        );
        if (this.handlers.onNotificationOpened) {
          this.handlers.onNotificationOpened(notification);
        }
      },
    );
    this.subscriptions.push(openedSubscription);

    // Initial notification (app opened from notification)
    const initialSubscription = eventEmitter.addListener(
      'onInitialNotification',
      (notification: NotificationData) => {
        console.log(
          '[NativePushNotificationService] Initial notification:',
          notification,
        );
        if (this.handlers.onInitialNotification) {
          this.handlers.onInitialNotification(notification);
        }
      },
    );
    this.subscriptions.push(initialSubscription);
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<PermissionStatus> {
    try {
      const result = await PushNotificationManager.requestPermission();
      console.log('[NativePushNotificationService] Permission result:', result);
      return result;
    } catch (error) {
      console.error(
        '[NativePushNotificationService] Permission request error:',
        error,
      );
      return {
        granted: false,
        status: 'denied',
      };
    }
  }

  /**
   * Check current permission status
   */
  async checkPermission(): Promise<PermissionStatus> {
    try {
      const result = await PushNotificationManager.checkPermission();
      return result;
    } catch (error) {
      console.error(
        '[NativePushNotificationService] Check permission error:',
        error,
      );
      return {
        granted: false,
        status: 'unknown',
      };
    }
  }

  /**
   * Check for initial notification (app opened from notification)
   */
  private async checkInitialNotification(): Promise<void> {
    try {
      const notification = await PushNotificationManager.getInitialNotification();
      if (notification && this.handlers.onInitialNotification) {
        console.log(
          '[NativePushNotificationService] Initial notification:',
          notification,
        );
        this.handlers.onInitialNotification(notification);
      }
    } catch (error) {
      console.error(
        '[NativePushNotificationService] Error checking initial notification:',
        error,
      );
    }
  }

  /**
   * Get the device token
   */
  getDeviceToken(): string | null {
    return this.deviceToken;
  }

  /**
   * Set notification handlers
   */
  setHandlers(handlers: NotificationHandlers): void {
    this.handlers = {...this.handlers, ...handlers};
  }

  /**
   * Set app badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await PushNotificationManager.setBadgeCount(count);
    } catch (error) {
      console.error('[NativePushNotificationService] Set badge error:', error);
    }
  }

  /**
   * Get app badge count
   */
  async getBadgeCount(): Promise<number> {
    try {
      return await PushNotificationManager.getBadgeCount();
    } catch (error) {
      console.error('[NativePushNotificationService] Get badge error:', error);
      return 0;
    }
  }

  /**
   * Remove all delivered notifications
   */
  removeAllDeliveredNotifications(): void {
    PushNotificationManager.removeAllDeliveredNotifications();
  }

  /**
   * Remove specific delivered notifications
   */
  removeDeliveredNotifications(identifiers: string[]): void {
    PushNotificationManager.removeDeliveredNotifications(identifiers);
  }

  /**
   * Get all delivered notifications
   */
  async getDeliveredNotifications(): Promise<DeliveredNotification[]> {
    try {
      return await PushNotificationManager.getDeliveredNotifications();
    } catch (error) {
      console.error(
        '[NativePushNotificationService] Get delivered notifications error:',
        error,
      );
      return [];
    }
  }

  /**
   * Unregister from remote notifications
   */
  unregister(): void {
    PushNotificationManager.unregisterForRemoteNotifications();
    this.deviceToken = null;
  }

  /**
   * Clean up listeners
   */
  cleanup(): void {
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
    this.isInitialized = false;
    console.log('[NativePushNotificationService] Cleaned up');
  }
}

// Export singleton instance
export const nativePushNotificationService = new NativePushNotificationService();

