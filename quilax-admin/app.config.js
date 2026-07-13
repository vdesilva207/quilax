export default {
  expo: {
    name: 'Quilax Admin',
    slug: 'quilax-admin',
    version: '1.0.0',
    orientation: 'portrait',
    scheme: 'quilax-admin',
    userInterfaceStyle: 'automatic',
    web: {
      bundler: 'metro',
      output: 'static',
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      API_URL: process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001',
    },
  },
};
