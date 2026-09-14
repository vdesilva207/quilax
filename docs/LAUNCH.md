# Quilax — lanzamiento interno / TestFlight

Documento vivo para el **primer corte jugable** (soft launch).  
Stripe Connect / Gestión completo = **Fase 2** (después del test cerrado). No bloquean este lanzamiento.

---

## 0) Arranque local (un comando)

```bash
./scripts/dev-up.sh
```


| Servicio | URL / puerto                                                 |
| -------- | ------------------------------------------------------------ |
| App web  | [http://127.0.0.1:8081](http://127.0.0.1:8081)               |
| API      | [http://127.0.0.1:3001/health](http://127.0.0.1:3001/health) |
| Postgres | `127.0.0.1:5433`                                             |
| Redis    | `127.0.0.1:6379`                                             |


Opciones: `SKIP_EXPO=1` · `SKIP_MIGRATE=1` · `SKIP_EMAIL=true` (default).

Semilla de partida de prueba (opcional):

```bash
cd quilax-backend && DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5433/quilax_dev?schema=public' \
  node scripts/seed-cultura-visual-quiz.mjs
```

---



## 1) Checklist “listo para TestFlight / internal”



### Producto / playtest (bloqueante)

- [x] Flujo completo: registro/login → Home → enroll → lobby → preguntas → ranking → fin *(código + smoke local; falta validar en device iOS)*
- [x] Early-join bonus coherente con posición
- [x] Scoring (puntos decaen con tiempo; no a 0 tras 1s)
- [x] Imágenes de pregunta en API/seed (HTTPS) *(falta confirmar render en device iOS)*
- [x] Reconexión suave / no “capacidad máxima” falsa
- [x] Countdown T−1 min / auto-entrada T−30s
- [x] Historial de partidas en perfil
- [ ] Sin crashes en 2–3 partidas seguidas (**device real iOS**)

### Backend / infra (bloqueante para build que apunte a prod)

- [x] API prod `https://api.appquilax.com` healthy *(OK ahora; fallos previos = cold start Render)*
- [x] Postgres prod OK (`/health/db`) — Redis: verificar en Render Dashboard + tras deploy `/health/ready`
- [x] Keep-alive GitHub Action `prod-keepalive` (cada 5 min) — activar en el repo remoto
- [x] `EXPO_PUBLIC_*` del profile EAS apuntan a prod (`eas.json`)
- [ ] CORS / sockets OK desde app nativa *(probar tras build; `render.yaml` ya incluye gestion + www)*
- [ ] Emails reales en Render: `SKIP_EMAIL=false` + `EMAIL_*` (revisar Dashboard)
- [ ] Secrets prod confirmados en Render: `JWT_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`, `REDIS_URL`

### App iOS (bloqueante EAS)

- [x] Cuenta Expo logueada (`vdesilvaaa`)
- [ ] Apple Developer Program activo + App Store Connect app `com.quilax.app`
- [ ] Certificados / provisioning (primera `eas build` / credentials)
- [x] Icon + splash presentes (`assets/images/…`) — revisar si son los **finales** de marca
- [x] `bundleIdentifier` = `com.quilax.app`
- [x] Privacy: cámara / fotos textos OK
- [x] `ITSAppUsesNonExemptEncryption: false`
- [ ] `ascAppId` en App Store Connect listo para `eas submit` (interactivo OK)

### No bloqueante para el primer internal

- [ ] Stripe Connect (retiradas / IBAN)
- [ ] Gestión (wallet web) pulida al 100 %
- [ ] Depósitos con tarjeta en producción
- [ ] Admin panel / moderación avanzada
- [ ] Android store listing

---



## 2) Build EAS



### A) Internal (más rápido — testers por link Expo)

```bash
./scripts/eas-ios-internal.sh preview
```

Profile `preview`: distribution **internal**, API prod, sin skip onboarding.

### B) TestFlight

```bash
./scripts/eas-ios-internal.sh testflight
# cuando el build termine:
cd quilax-frontend && npx eas-cli@latest submit --platform ios --profile testflight --latest
```

Profile `testflight`: distribution **store**, autoIncrement, mismos env de prod.

### NPM (equivalente)

```bash
cd quilax-frontend
npm run eas:ios:preview
npm run eas:ios:testflight
```

---



## 3) Fase 2 — Stripe / Gestión (post test cerrado)

Objetivo: no frenar TestFlight. El core del soft launch es **jugar quizzes**.


| Área                                        | Estado actual                                   | Tras test cerrado                                 |
| ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Stripe Identity (KYC)                       | Integrado en onboarding; se puede saltar en dev | Activar obligatorio en prod si compliance lo pide |
| Stripe Connect (banco)                      | Código en wallet / settings                     | Verificar onboarding Connect + webhooks           |
| Depósitos PI                                | `paymentService` + wallet deposit               | Probar end-to-end con claves live                 |
| Gestión (web :8082 / gestion.appquilax.com) | App separada `quilax-wallet`                    | Pulir UX, sesión segura, retiros                  |
| Premios → créditos → cashout                | Motor de créditos en quiz                       | Conectar cashout real solo con Connect verificado |


**Regla:** un fallo de Stripe/Gestión **no** debe impedir jugar. Si Connect no está listo, la app debe mostrar “próximamente” en retiros y seguir el loop de quiz.

Checklist Fase 2 (cuando toque):

- [ ] Webhooks Stripe (payment_intent, account.updated, identity) en prod
- [ ] `business_profile.url` público (no localhost)
- [ ] Gestión HTTPS + cookie/sesión
- [ ] Test depósito mínimo + retiro sandbox → live
- [ ] Copy legal / términos de créditos

---



## 4) Criterio de “sí, lanzamos internal”

1. Checklist §1 producto en verde (al menos un playtest en device).
2. API prod up.
3. `./scripts/eas-ios-internal.sh preview` (o testflight) sin error de credentials.
4. 3–10 testers internos juegan ≥1 partida sin bloqueo crítico.

Stripe/Gestión: **después**.