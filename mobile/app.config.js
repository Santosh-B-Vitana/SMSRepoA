let schoolConfigs = {};
try {
  schoolConfigs = require('./scripts/school-configs.json');
} catch {
  // school-configs.json not yet created — fall back to vitana defaults
}

module.exports = ({ config }) => {
  const schoolId = process.env.SCHOOL_ID || 'vitana';
  const school = schoolConfigs[schoolId] || {
    schoolId: 'vitana',
    appName: 'Vitana SMS',
    slug: 'vitana-sms',
    androidPackage: 'com.vitana.sms',
    iosBundleId: 'com.vitana.sms',
    apiDomain: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.vitanasms.com/api',
    colors: { primary: '#1a6fd8', accent: '#17a2b8' },
    isWhiteLabel: false,
    easProjectId: process.env.EAS_PROJECT_ID,
  };

  const assetBase = `./assets/school-assets/${schoolId}`;

  return {
    ...config,
    name: school.appName,
    slug: school.slug,
    version: process.env.APP_VERSION || '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'vitanasms',
    newArchEnabled: true,

    icon: `${assetBase}/app-icon-1024.png`,

    splash: {
      image: `${assetBase}/splash-screen.png`,
      backgroundColor: school.colors.primary,
      resizeMode: 'contain',
    },

    android: {
      ...(config.android || {}),
      package: school.androidPackage,
      versionCode: parseInt(process.env.BUILD_NUMBER || '1', 10),
      adaptiveIcon: {
        foregroundImage: `${assetBase}/adaptive-icon.png`,
        backgroundColor: school.colors.primary,
      },
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      permissions: [
        'android.permission.USE_BIOMETRIC',
        'android.permission.USE_FINGERPRINT',
        'android.permission.CAMERA',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
      ],
    },

    ios: {
      ...(config.ios || {}),
      bundleIdentifier: school.iosBundleId,
      buildNumber: process.env.BUILD_NUMBER || '1',
      supportsTablet: true,
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST || './GoogleService-Info.plist',
      infoPlist: {
        NSCameraUsageDescription: 'Camera is used to upload photos.',
        NSFaceIDUsageDescription: 'Face ID is used to unlock the app securely.',
        NSPhotoLibraryUsageDescription: 'Photo library access is needed for uploading images.',
      },
    },

    plugins: [
      'expo-router',
      ['expo-secure-store', {}],
      [
        'expo-local-authentication',
        {
          faceIDPermission: 'Vitana SMS uses Face ID to securely unlock the app.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: `${assetBase}/notification-icon.png`,
          color: school.colors.primary,
          sounds: [],
          enableBackgroundRemoteNotifications: true,
        },
      ],
      'expo-sqlite',
      '@react-native-firebase/app',
    ],

    experiments: {
      typedRoutes: true,
    },

    extra: {
      schoolId,
      apiBaseUrl: school.apiDomain,
      schoolName: school.schoolName || school.appName,
      isWhiteLabel: school.isWhiteLabel ?? schoolId !== 'vitana',
      schoolDomain: school.schoolDomain ?? null,
      buildTimePrimaryColor: school.colors.primary,
      buildTimeAccentColor: school.colors.accent,
      buildTimeAppName: school.appName,
      eas: {
        projectId: school.easProjectId || process.env.EAS_PROJECT_ID,
      },
    },

    updates: {
      url: `https://u.expo.dev/${school.easProjectId || process.env.EAS_PROJECT_ID || 'YOUR_EAS_PROJECT_ID'}`,
      enabled: true,
      fallbackToCacheTimeout: 0,
    },

    runtimeVersion: {
      policy: 'sdkVersion',
    },
  };
};
