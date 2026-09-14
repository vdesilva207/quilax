# Quilax Wallet

App web standalone para depósitos, retiros y verificación (dinero solo en web).

```bash
cd quilax-wallet
cp .env.example .env
npm install
npm run web
```

Abre en `http://127.0.0.1:8082`.

## Entrada desde la app Quilax

Desde la pestaña **Gestión** de la app:

1. La app pide un token a `POST /wallet-access/exchange-token`.
2. Abre esta web con `?token=...`.
3. Gestión guarda la sesión, limpia el token de la URL y te deja dentro sin login manual.

Si el intercambio falla, la web sigue permitiendo login con email/contraseña.

## Requisitos para dinero

- **Añadir créditos / retirar:** Google Authenticator (2FA)
- **Retirar:** además, banco verificado con Stripe Connect

## Qué verás dentro

- Saldo e historial
- Estado de identidad (verificada en la app Quilax; aquí no se sube el DNI)
- Banco con Stripe Connect, depósitos y retiros
