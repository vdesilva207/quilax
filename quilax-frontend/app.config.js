/**
 * Expo config — producción via EXPO_PUBLIC_* / EAS env.
 * Este archivo manda sobre app.json.
 */
const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
const isPreview = process.env.APP_ENV === 'preview';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.API_URL ||
  (isProd ? 'https://api.appquilax.com' : undefined);

const WALLET_URL =
  process.env.EXPO_PUBLIC_WALLET_URL ||
  (isProd ? 'https://gestion.appquilax.com' : undefined);

const SOCKET_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL ||
  process.env.SOCKET_URL ||
  (isProd ? 'https://api.appquilax.com' : undefined);

// Preview/prod: never bake skip flags into the binary even if present in the shell.
const skipOnboardingAllowed = !isProd && !isPreview;
const envSkipOnboarding =
  skipOnboardingAllowed && process.env.EXPO_PUBLIC_DEV_SKIP_ONBOARDING === 'true'
    ? 'true'
    : 'false';
const envSkipEmail =
  skipOnboardingAllowed && process.env.EXPO_PUBLIC_SKIP_EMAIL_VERIFICATION === 'true'
    ? 'true'
    : 'false';

export default {
  expo: {
    name: 'Quilax',
    slug: 'quilax-frontend',
    scheme: 'quilax',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    icon: './assets/images/icon.png',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#FFFCF8',
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      'expo-localization',
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Quilax necesita acceso a tus fotos para el perfil, documentos de identidad y portadas de quizzes.',
          cameraPermission:
            'Quilax necesita la cámara para el escaneo facial de verificación y fotos de perfil.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Quilax usa la cámara para la verificación de identidad (selfie / prueba de vida).',
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-notifications',
        {
          color: '#E85D04',
        },
      ],
      [
        'expo-splash-screen',
        {
          backgroundColor: '#FFFCF8',
          image: './assets/images/splash-icon.png',
        },
      ],
    ],
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.quilax.app',
      buildNumber: '1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['remote-notification'],
        NSCameraUsageDescription:
          'Quilax usa la cámara para verificación de identidad (selfie) y foto de perfil.',
        NSPhotoLibraryUsageDescription:
          'Quilax accede a tus fotos para perfil, documento de identidad y portadas de quizzes.',
        NSPhotoLibraryAddUsageDescription:
          'Quilax puede guardar imágenes que elijas compartir desde la app.',
        // Preview/dev: allow HTTP to LAN backend (ATS blocks cleartext by default).
        ...(!isProd
          ? {
              NSLocalNetworkUsageDescription:
                'Quilax se conecta a tu Mac en la red local para desarrollo y pruebas.',
              NSAppTransportSecurity: {
                NSAllowsArbitraryLoads: true,
                NSAllowsLocalNetworking: true,
              },
            }
          : {}),
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
            NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
          },
        ],
        NSPrivacyCollectedDataTypes: [
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            ],
          },
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeName',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            ],
          },
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePhotosOrVideos',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            ],
          },
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypePaymentInfo',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            ],
          },
          {
            NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeUserID',
            NSPrivacyCollectedDataTypeLinked: true,
            NSPrivacyCollectedDataTypeTracking: false,
            NSPrivacyCollectedDataTypePurposes: [
              'NSPrivacyCollectedDataTypePurposeAppFunctionality',
            ],
          },
        ],
        NSPrivacyTracking: false,
      },
    },
    android: {
      package: 'com.quilax.app',
      versionCode: 1,
      // Preview/dev: allow http://LAN API. Production builds should use HTTPS.
      usesCleartextTraffic: !isProd,
      adaptiveIcon: {
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
        backgroundColor: '#FFFFFF',
      },
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || './google-services.json',
      permissions: ['CAMERA', 'READ_MEDIA_IMAGES', 'POST_NOTIFICATIONS'],
    },
    notification: {
      color: '#E85D04',
      icon: './assets/images/icon.png',
    },
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
    extra: {
      API_URL: API_URL || 'http://127.0.0.1:3001',
      WALLET_URL: WALLET_URL || 'http://127.0.0.1:8082',
      SOCKET_URL: SOCKET_URL || 'http://127.0.0.1:3001',
      CDN_URL: process.env.CDN_URL || process.env.EXPO_PUBLIC_CDN_URL || '',
      APP_ENV: process.env.APP_ENV || (isProd ? 'production' : 'development'),
      // Explicit so runtime gate can read them from Constants; prod/preview forced false
      EXPO_PUBLIC_DEV_SKIP_ONBOARDING: envSkipOnboarding,
      EXPO_PUBLIC_SKIP_EMAIL_VERIFICATION: envSkipEmail,
      eas: {
        // Expo project @vdesilvaaa/quilax-frontend
        projectId:
          process.env.EAS_PROJECT_ID || '457aecec-7e2e-468c-bb97-b84b2b54f3e1',
      },
    },
  },
};
