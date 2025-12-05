#import "AppDelegate.h"
#import "PushNotificationManager.h"

#import <React/RCTBundleURLProvider.h>
#import <UserNotifications/UserNotifications.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Set up notification delegate
  [UNUserNotificationCenter currentNotificationCenter].delegate = self;
  
  self.moduleName = @"Team11";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  BOOL result = [super application:application didFinishLaunchingWithOptions:launchOptions];
  
  // Check if app was opened from a notification
  NSDictionary *remoteNotification = launchOptions[UIApplicationLaunchOptionsRemoteNotificationKey];
  if (remoteNotification) {
    [[PushNotificationManager sharedInstance] handleInitialNotification:remoteNotification];
  }
  
  return result;
}

// Handle notification when app is in foreground
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler
{
  // Notify React Native about the notification
  NSDictionary *userInfo = notification.request.content.userInfo;
  [[PushNotificationManager sharedInstance] didReceiveRemoteNotification:userInfo];
  
  // Show notification banner, sound, and badge even when app is in foreground
  completionHandler(UNNotificationPresentationOptionBanner | 
                    UNNotificationPresentationOptionSound | 
                    UNNotificationPresentationOptionBadge);
}

// Handle notification tap
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler
{
  // Notify React Native about the notification tap
  [[PushNotificationManager sharedInstance] didReceiveNotificationResponse:response];
  
  completionHandler();
}

// Handle device token registration
- (void)application:(UIApplication *)application didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [[PushNotificationManager sharedInstance] didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Handle registration failure
- (void)application:(UIApplication *)application didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  [[PushNotificationManager sharedInstance] didFailToRegisterForRemoteNotificationsWithError:error];
}

// Handle remote notification received while app is running
- (void)application:(UIApplication *)application didReceiveRemoteNotification:(NSDictionary *)userInfo
    fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  [[PushNotificationManager sharedInstance] didReceiveRemoteNotification:userInfo];
  completionHandler(UIBackgroundFetchResultNewData);
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
