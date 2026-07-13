// Configuración dinámica para variables de entorno
const config = {
  extra: {
    API_URL: process.env.API_URL || 'http://localhost:3001',
    CDN_URL: process.env.CDN_URL || 'https://cdn.quilax.com',
    SOCKET_URL: process.env.SOCKET_URL || 'ws://localhost:3001',
  },
};

export default config;
