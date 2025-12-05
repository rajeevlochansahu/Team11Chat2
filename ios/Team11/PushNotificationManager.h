//
//  PushNotificationManager.h
//  Team11
//
//  Native APNs Push Notification Manager
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

NS_ASSUME_NONNULL_BEGIN

@interface PushNotificationManager : RCTEventEmitter <RCTBridgeModule>

/// Shared instance for accessing from AppDelegate
+ (instancetype)sharedInstance;

/// Handle device token registration from AppDelegate
- (void)didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken;

/// Handle registration failure from AppDelegate
- (void)didFailToRegisterForRemoteNotificationsWithError:(NSError *)error;

/// Handle notification received in foreground
- (void)didReceiveRemoteNotification:(NSDictionary *)userInfo;

/// Handle notification tap
- (void)didReceiveNotificationResponse:(UNNotificationResponse *)response;

/// Handle initial notification (app opened from notification)
- (void)handleInitialNotification:(NSDictionary * _Nullable)userInfo;

@end

NS_ASSUME_NONNULL_END

