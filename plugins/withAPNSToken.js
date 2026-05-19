const { withAppDelegate } = require('@expo/config-plugins');

module.exports = function withAPNSToken(config) {
  return withAppDelegate(config, (config) => {
    const appDelegate = config.modResults.contents;

    // Add import if not present
    if (!appDelegate.includes('#import <FirebaseMessaging/FirebaseMessaging.h>')) {
      config.modResults.contents = appDelegate.replace(
        '#import "AppDelegate.h"',
        '#import "AppDelegate.h"\n#import <FirebaseMessaging/FirebaseMessaging.h>'
      );
    }

    // Add registerForRemoteNotifications call
    if (!appDelegate.includes('registerForRemoteNotifications]')) {
      config.modResults.contents = config.modResults.contents.replace(
        'return [super application:application didFinishLaunchingWithOptions:launchOptions];',
        '[application registerForRemoteNotifications];\n  return [super application:application didFinishLaunchingWithOptions:launchOptions];'
      );
    }

    // Add APNs token forwarding method
    if (!appDelegate.includes('APNSToken')) {
      config.modResults.contents = config.modResults.contents.replace(
        '@end',
        `- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken {
  [FIRMessaging messaging].APNSToken = deviceToken;
  [super application:application didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

@end`
      );
    }

    return config;
  });
};