# Quilax Admin

Panel de administración web para Quilax (Expo + React Native Web).

## Arranque

```bash
npm install
cp .env.example .env
npx expo start --web
```

API por defecto: `http://127.0.0.1:3001`

## Roles

- **ADMIN** — Acceso completo
- **ADMIN_WORKER** — Vista limitada (usuarios, quizzes, auditoría)

## Pantallas

Las pantallas de negocio viven en `app/panel/`. El shell de navegación (`AdminSidebar`, auth) fue restaurado tras la pérdida de archivos del 10 jul 2025.
