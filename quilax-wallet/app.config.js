const isProd = process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

export default {
  expo: {
    name: 'Quilax Wallet',
    slug: 'quilax-wallet',
    scheme: 'quilax-wallet',
    version: '1.0.0',
    web: {
      bundler: 'metro',
      output: 'single',
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: false,
      tsconfigPaths: true,
    },
    extra: {
      API_URL:
        process.env.EXPO_PUBLIC_API_URL ||
        (isProd ? 'https://api.appquilax.com' : 'http://127.0.0.1:3001'),
      APP_ENV: process.env.APP_ENV || (isProd ? 'production' : 'development'),
    },
  },
};
