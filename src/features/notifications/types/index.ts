export interface NotificationData {
  title?: string;
  body?: string;
  subtitle?: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
  category?: string;
  contentAvailable?: boolean;
  actionIdentifier?: string;
}

export interface NotificationHandlers {
  onForegroundMessage?: (notification: NotificationData) => void;
  onNotificationOpened?: (notification: NotificationData) => void;
  onInitialNotification?: (notification: NotificationData) => void;
}

export interface PermissionStatus {
  granted: boolean;
  status: 'granted' | 'denied' | 'provisional' | 'not_determined' | 'unknown';
  alertSetting?: boolean;
  badgeSetting?: boolean;
  soundSetting?: boolean;
}

export interface NotificationState {
  isInitialized: boolean;
  hasPermission: boolean;
  deviceToken: string | null;
  error: string | null;
}

export interface DeliveredNotification {
  identifier: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
}
