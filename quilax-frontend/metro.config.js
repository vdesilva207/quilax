const { getDefaultConfig } = require('expo/metro-config');
const { createProxyMiddleware } = require('http-proxy-middleware');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const API_TARGET =
  process.env.EXPO_PUBLIC_API_PROXY_TARGET ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://api.appquilax.com';

// Web dev: same-origin /__api/* → production API (evita CORS en localhost:8081).
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    const proxy = createProxyMiddleware({
      target: API_TARGET.replace(/\/$/, ''),
      changeOrigin: true,
      pathRewrite: { '^/__api': '' },
      secure: true,
    });

    return (req, res, next) => {
      if (req.url?.startsWith('/__api')) {
        return proxy(req, res, next);
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
