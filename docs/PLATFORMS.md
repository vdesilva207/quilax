# Plataformas soportadas

## quilax-frontend (app principal)

| Plataforma | Tecnología | Estado |
|------------|------------|--------|
| **Web** | Expo web (Metro, static export) | Operativo |
| **iOS** | Expo / React Native | Operativo (requiere dev build para features nativas) |
| **Android** | Expo / React Native | Operativo |
| **Desktop** | Tauri 2.x | Config pendiente (`src-tauri/` vacío tras rescate) |

Variables de entorno:
- `EXPO_PUBLIC_API_URL` — URL del backend (default `http://127.0.0.1:3001`)
- `API_URL`, `SOCKET_URL`, `CDN_URL` — en `app.config.js`

## quilax-admin (panel de administración)

| Plataforma | Uso principal |
|------------|---------------|
| **Web** | Panel admin principal (`npx expo start --web`) |
| **Desktop** | Tauri (pendiente restauración) |

Acceso restringido a roles `ADMIN` y `ADMIN_WORKER`. 2FA recomendado para admins.

## quilax-wallet (app wallet standalone)

App separada para depósitos, retiros y verificación KYC. En reconstrucción tras pérdida de archivos (jul 2025).

Integración prevista con `quilax-backend` vía rutas `walletAccess`.

## quilax-backend

| Componente | Requisito |
|------------|-----------|
| API REST | Node.js 18+, puerto 3001 |
| WebSockets | Socket.IO (mismo servidor HTTP) |
| Base de datos | PostgreSQL 14+ |
| Cola/cache | Redis (localhost:6379) |
| Pagos | Stripe (opcional en dev) |
| Email | SMTP (Gmail u otro) |

## Despliegue

- `docker-compose.yml` referencia servicios nginx, postgres, redis, prometheus
- Faltan `Dockerfile`, `prometheus.yml`, `ssl/` — pendiente de restaurar
- Docs de infra: `quilax-backend/docs/infrastructure-{aws,gcp,azure}.md`

## URLs de desarrollo típicas

| Servicio | URL |
|----------|-----|
| Backend API | http://127.0.0.1:3001 |
| Frontend Expo | http://localhost:8081 |
| Admin web | http://localhost:19006 |
| Health check | http://127.0.0.1:3001/health |
