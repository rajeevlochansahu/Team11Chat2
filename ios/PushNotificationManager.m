//
//  PushNotificationManager.m
//  Team11
//
//  Native APNs Push Notification Manager - React Native Bridge
//

#import "PushNotificationManager.h"
#import <UserNotifications/UserNotifications.h>
#import <React/RCTLog.h>

static PushNotificationManager *sharedInstance = nil;

@implementation PushNotificationManager {
  BOOL _hasListeners;
  NSString *_pendingDeviceToken;
  NSError *_pendingRegistrationError;
  NSDictionary *_initialNotification;
  BOOL _isInitialized;
}

RCT_EXPORT_MODULE();

+ (instancetype)sharedInstance {
  return sharedInstance;
}

- (instancetype)init {
  self = [super init];
  if (self) {
    sharedInstance = self;
    _hasListeners = NO;
    _isInitialized = NO;
    _pendingDeviceToken = nil;
    _pendingRegistrationError = nil;
    _initialNotification = nil;
  }
  return self;
}

+ (BOOL)requiresMainQueueSetup {
  return YES;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[
    @"onDeviceTokenReceived",
    @"onRegistrationError",
    @"onNotificationReceived",
    @"onNotificationOpened",
    @"onInitialNotification"
  ];
}

- (void)startObserving {
  _hasListeners = YES;
  
  // Send any pending events
  if (_pendingDeviceToken) {
    [self sendEventWithName:@"onDeviceTokenReceived" body:@{@"token": _pendingDeviceToken}];
    _pendingDeviceToken = nil;
  }
  
  if (_pendingRegistrationError) {
    [self sendEventWithName:@"onRegistrationError" body:@{
      @"error": _pendingRegistrationError.localizedDescription ?: @"Unknown error"
    }];
    _pendingRegistrationError = nil;
  }
  
  if (_initialNotification) {
    [self sendEventWithName:@"onInitialNotification" body:_initialNotification];
    _initialNotification = nil;
  }
}

- (void)stopObserving {
  _hasListeners = NO;
}

#pragma mark - Public Methods (Called from AppDelegate)

- (void)didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  // Convert device token to hex string
  NSUInteger length = deviceToken.length;
  if (length == 0) {
      return;
  }
  const unsigned char *buffer = deviceToken.bytes;
  NSMutableString *hexString  = [NSMutableString stringWithCapacity:(length * 2)];
  for (int i = 0; i < length; ++i) {
      [hexString appendFormat:@"%02x", buffer[i]];
  }
  NSString *apnsToken = [hexString copy];
  NSLog(@"2. Push Sync ID is: %@", apnsToken);
    
  RCTLogInfo(@"[PushNotificationManager] Device token: %@", apnsToken);
  
  if (_hasListeners) {
    [self sendEventWithName:@"onDeviceTokenReceived" body:@{@"token": apnsToken}];
  } else {
    _pendingDeviceToken = apnsToken;
  }
}

- (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error {
  RCTLogError(@"[PushNotificationManager] Registration failed: %@", error.localizedDescription);
  
  if (_hasListeners) {
    [self sendEventWithName:@"onRegistrationError" body:@{
      @"error": error.localizedDescription ?: @"Unknown error"
    }];
  } else {
    _pendingRegistrationError = error;
  }
}

- (void)didReceiveRemoteNotification:(NSDictionary *)userInfo {
  RCTLogInfo(@"[PushNotificationManager] Notification received: %@", userInfo);
  
  NSDictionary *notification = [self parseNotification:userInfo];
  
  if (_hasListeners) {
    [self sendEventWithName:@"onNotificationReceived" body:notification];
  }
}

- (void)didReceiveNotificationResponse:(UNNotificationResponse *)response {
  RCTLogInfo(@"[PushNotificationManager] Notification opened");
  
  NSDictionary *userInfo = response.notification.request.content.userInfo;
  NSDictionary *notification = [self parseNotification:userInfo];
  
  // Add action identifier
  NSMutableDictionary *body = [notification mutableCopy];
  body[@"actionIdentifier"] = response.actionIdentifier;
  
  if (_hasListeners) {
    [self sendEventWithName:@"onNotificationOpened" body:body];
  }
}

- (void)handleInitialNotification:(NSDictionary *)userInfo {
  if (userInfo) {
    RCTLogInfo(@"[PushNotificationManager] Initial notification: %@", userInfo);
    
    NSDictionary *notification = [self parseNotification:userInfo];
    
    if (_hasListeners) {
      [self sendEventWithName:@"onInitialNotification" body:notification];
    } else {
      _initialNotification = notification;
    }
  }
}

#pragma mark - Helper Methods

- (NSDictionary *)parseNotification:(NSDictionary *)userInfo {
  NSMutableDictionary *notification = [NSMutableDictionary dictionary];
  
  // Parse APNs payload
  NSDictionary *aps = userInfo[@"aps"];
  if (aps) {
    // Handle alert (can be string or dictionary)
    id alert = aps[@"alert"];
    if ([alert isKindOfClass:[NSString class]]) {
      notification[@"body"] = alert;
    } else if ([alert isKindOfClass:[NSDictionary class]]) {
      if (alert[@"title"]) notification[@"title"] = alert[@"title"];
      if (alert[@"body"]) notification[@"body"] = alert[@"body"];
      if (alert[@"subtitle"]) notification[@"subtitle"] = alert[@"subtitle"];
    }
    
    // Badge
    if (aps[@"badge"]) {
      notification[@"badge"] = aps[@"badge"];
    }
    
    // Sound
    if (aps[@"sound"]) {
      notification[@"sound"] = aps[@"sound"];
    }
    
    // Category
    if (aps[@"category"]) {
      notification[@"category"] = aps[@"category"];
    }
    
    // Content available (silent notification)
    if (aps[@"content-available"]) {
      notification[@"contentAvailable"] = aps[@"content-available"];
    }
  }
  
  // Add custom data (everything except 'aps')
  NSMutableDictionary *data = [NSMutableDictionary dictionary];
  for (NSString *key in userInfo) {
    if (![key isEqualToString:@"aps"]) {
      data[key] = userInfo[key];
    }
  }
  if (data.count > 0) {
    notification[@"data"] = data;
  }
  
  return notification;
}

#pragma mark - React Native Bridge Methods

RCT_EXPORT_METHOD(requestPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    
    UNAuthorizationOptions options = UNAuthorizationOptionAlert | 
                                      UNAuthorizationOptionSound | 
                                      UNAuthorizationOptionBadge;
    
    [center requestAuthorizationWithOptions:options
                          completionHandler:^(BOOL granted, NSError * _Nullable error) {
      if (error) {
        reject(@"PERMISSION_ERROR", error.localizedDescription, error);
        return;
      }
      
      if (granted) {
        dispatch_async(dispatch_get_main_queue(), ^{
          [[UIApplication sharedApplication] registerForRemoteNotifications];
        });
      }
      
      resolve(@{
        @"granted": @(granted),
        @"status": granted ? @"granted" : @"denied"
      });
    }];
  });
}

RCT_EXPORT_METHOD(checkPermission:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  
  [center getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
    NSString *status;
    BOOL granted = NO;
    
    switch (settings.authorizationStatus) {
      case UNAuthorizationStatusAuthorized:
        status = @"granted";
        granted = YES;
        break;
      case UNAuthorizationStatusProvisional:
        status = @"provisional";
        granted = YES;
        break;
      case UNAuthorizationStatusDenied:
        status = @"denied";
        break;
      case UNAuthorizationStatusNotDetermined:
        status = @"not_determined";
        break;
      default:
        status = @"unknown";
        break;
    }
    
    resolve(@{
      @"granted": @(granted),
      @"status": status,
      @"alertSetting": @(settings.alertSetting == UNNotificationSettingEnabled),
      @"badgeSetting": @(settings.badgeSetting == UNNotificationSettingEnabled),
      @"soundSetting": @(settings.soundSetting == UNNotificationSettingEnabled)
    });
  }];
}

RCT_EXPORT_METHOD(registerForRemoteNotifications) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [[UIApplication sharedApplication] registerForRemoteNotifications];
  });
}

RCT_EXPORT_METHOD(unregisterForRemoteNotifications) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [[UIApplication sharedApplication] unregisterForRemoteNotifications];
  });
}

RCT_EXPORT_METHOD(setBadgeCount:(NSInteger)count
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    [UIApplication sharedApplication].applicationIconBadgeNumber = count;
    resolve(@(YES));
  });
}

RCT_EXPORT_METHOD(getBadgeCount:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  dispatch_async(dispatch_get_main_queue(), ^{
    NSInteger count = [UIApplication sharedApplication].applicationIconBadgeNumber;
    resolve(@(count));
  });
}

RCT_EXPORT_METHOD(getInitialNotification:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  if (_initialNotification) {
    NSDictionary *notification = _initialNotification;
    _initialNotification = nil;
    resolve(notification);
  } else {
    resolve([NSNull null]);
  }
}

RCT_EXPORT_METHOD(removeAllDeliveredNotifications) {
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  [center removeAllDeliveredNotifications];
}

RCT_EXPORT_METHOD(removeDeliveredNotifications:(NSArray<NSString *> *)identifiers) {
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  [center removeDeliveredNotificationsWithIdentifiers:identifiers];
}

RCT_EXPORT_METHOD(getDeliveredNotifications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  
  [center getDeliveredNotificationsWithCompletionHandler:^(NSArray<UNNotification *> * _Nonnull notifications) {
    NSMutableArray *result = [NSMutableArray array];
    
    for (UNNotification *notification in notifications) {
      UNNotificationContent *content = notification.request.content;
      [result addObject:@{
        @"identifier": notification.request.identifier,
        @"title": content.title ?: @"",
        @"body": content.body ?: @"",
        @"data": content.userInfo ?: @{}
      }];
    }
    
    resolve(result);
  }];
}

@end

