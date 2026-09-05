export default {
  expo: {
    name: 'Quilax Wallet',
    slug: 'quilax-wallet',
    scheme: 'quilax-wallet',
    web: { bundler: 'metro' },
    plugins: ['expo-router', 'expo-secure-store'],
    extra: {
      API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.appquilax.com',
    },
  },
};
