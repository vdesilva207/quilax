# Quilax — Índice del Monorepo

Plataforma de quizzes competitivos en tiempo real con créditos (≈1 EUR), premios configurables y panel de administración.

**Ruta del proyecto:** `/Volumes/Almacen/Desarrollo/quilax`

---

## Estructura

```
quilax/
├── QUILAX_SPEC.md              # Especificación de producto
├── FRONTEND_ARCHITECTURE.md    # Arquitectura frontend (parcialmente desactualizada)
├── FRONTEND_DESIGN_PLAN.md     # Plan de diseño UI
├── ADMIN_PANEL_STATUS.md       # Estado API del panel admin
├── EMAIL_SETUP.md              # Configuración de email
├── docs/
│   ├── MONEY_MODEL.md          # Modelo económico
│   └── PLATFORMS.md            # Plataformas soportadas
├── quilax-backend/             # API REST + Socket.IO + workers
├── quilax-frontend/            # App principal (Expo + Tauri)
├── quilax-admin/               # Panel admin (Expo web + Tauri)
└── quilax-wallet/              # App wallet standalone (en reconstrucción)
```

---

## Subproyectos

| Proyecto | Stack | Puerto / URL | Estado |
|----------|-------|--------------|--------|
| **quilax-backend** | Node ESM, Express, Prisma, PostgreSQL, Redis, Socket.IO, Stripe | `http://localhost:3001` | ~90% operativo |
| **quilax-frontend** | Expo 54, React Native 0.74, expo-router, i18next, Tauri | Expo `:8081` / web `:19006` | Core OK; quiz en vivo y wallet parcial |
| **quilax-admin** | Expo 54, React Native Web, expo-router, Tauri | Expo web | Pantallas panel OK; shell restaurado |
| **quilax-wallet** | Expo (planificado) | — | ~94% perdido; solo layout raíz |

---

## Cómo arrancar

### Backend (requiere PostgreSQL + Redis)

```bash
cd quilax-backend
cp .env.example .env   # editar DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma generate
npm run dev            # nodemon, puerto 3001
```

### Frontend principal

```bash
cd quilax-frontend
cp .env.example .env
npm install
npm start              # expo start
```

Variables: `EXPO_PUBLIC_API_URL=http://127.0.0.1:3001`

### Panel admin

```bash
cd quilax-admin
cp .env.example .env
npm install
npx expo start --web
```

### Wallet (pendiente de restauración completa)

```bash
cd quilax-wallet
npm install
npx expo start
```

---

## Puntos de entrada

| Área | Archivo |
|------|---------|
| API servidor | `quilax-backend/src/index.js` |
| Socket.IO | `quilax-backend/src/socket.js` |
| Motor de quiz | `quilax-backend/src/services/quizEngine.js` |
| Schema DB | `quilax-backend/prisma/schema.prisma` |
| App usuario (router) | `quilax-frontend/src/app/_layout.tsx` |
| Auth usuario | `quilax-frontend/src/context/AuthContext.js` |
| API cliente frontend | `quilax-frontend/src/lib/api.js` |
| Panel admin (router) | `quilax-admin/app/_layout.tsx` |
| API cliente admin | `quilax-admin/src/lib/api.js` |

---

## Roles y dominio

- **USER** — Participa en quizzes, compra créditos, retira premios
- **ADMIN** — Control total: quizzes, premios, KYC, finanzas, temporadas
- **ADMIN_WORKER** — Empleado con permisos limitados

### Flujo de quiz en vivo

`PRE_START` → `QUESTION_READ` → `QUESTION_ANSWER` → `QUESTION_CORRECTION` → `QUESTION_RANKING` → `FINISHED`

### Transacciones monetarias

`QUIZ_ENTRY`, `PRIZE_PAYOUT`, `WITHDRAW`, `BANK_TO_CREDITS`, `JACKPOT_DEPOSIT`, `PLATFORM_FEE`

---

## Recuperación (jul 2025)

Muchos archivos quedaron en **0 bytes** tras operaciones de rescate (10 jul). Patrón: directorios y `node_modules` intactos; contenido de ficheros borrado.

### Fuentes de recuperación usadas

1. `quilax-backend/node_modules/.prisma/client/schema.prisma` → `prisma/schema.prisma`
2. `quilax-backend/backup.sql` — dump PostgreSQL con schema y datos
3. `quilax-backend/prisma/migrations/` — 15 migraciones SQL intactas
4. `quilax-admin/dist/` — export estático (2 jul) con 41 páginas HTML
5. Archivos vecinos intactos + imports en rutas para reconstruir servicios

### Archivos críticos restaurados en esta sesión

- `quilax-backend/prisma/schema.prisma`
- `quilax-backend/src/services/prizeConfigService.js`
- `quilax-backend/src/services/season.service.js`
- `quilax-backend/src/controllers/seasonsController.js`
- `quilax-backend/src/services/withdrawService.js`
- `quilax-admin/package.json` y shell de navegación/auth
- Docs `MONEY_MODEL.md`, `PLATFORMS.md`
- `.env.example` en cada subproyecto

### Pendiente (requiere backup externo o máquina origen)

- `quilax-wallet/` — casi todo el código
- Pantallas frontend de quiz en vivo (`quiz/run/[runId].tsx`, `QuizRunView.tsx`)
- Onboarding KYC (`face-scan`, `id-verification`, etc.)
- Tauri configs (`src-tauri/*`) en frontend y admin
- Docker: `Dockerfile`, `prometheus.yml`, `ssl/` referenciados en `docker-compose.yml`
- Git history muy superficial (2 commits, sin contenido útil)

---

## Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| [QUILAX_SPEC.md](./QUILAX_SPEC.md) | Reglas de negocio, roles, fases de quiz |
| [ADMIN_PANEL_STATUS.md](./ADMIN_PANEL_STATUS.md) | Endpoints admin implementados |
| [quilax-backend/ADMIN_PANEL_SCHEMA.md](./quilax-backend/ADMIN_PANEL_SCHEMA.md) | Pantallas del panel |
| [quilax-backend/APP_SCREENS_SCHEMA.md](./quilax-backend/APP_SCREENS_SCHEMA.md) | Pantallas app pública |
| [docs/MONEY_MODEL.md](./docs/MONEY_MODEL.md) | Créditos, premios, jackpot |
| [docs/PLATFORMS.md](./docs/PLATFORMS.md) | Web, iOS, Android, Tauri |

---

*Última actualización del índice: julio 2025*
