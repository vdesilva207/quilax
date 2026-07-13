# Modelo económico de Quilax

## Créditos

- 1 crédito ≈ 1 EUR (ajustable por configuración)
- Los usuarios compran créditos con dinero real (`BANK_TO_CREDITS`)
- Cada entrada a un quiz cuesta **1 crédito** por jugador
- El crédito de entrada **no se devuelve** — va íntegramente a la **prize pool**

## Prize pool de quiz

Distribución configurable por el admin (`/admin/prize-config`):

| Destino | Por defecto |
|---------|-------------|
| Jackpot admin (temporada) | 5% |
| Beneficio plataforma | 5% |
| Creador del quiz | 10% |
| Ganadores TOP (posiciones) | 80% |

Los premios se muestran a jugadores como **cantidad de créditos**, no como porcentajes.

## Jackpot de temporada

- Se acumula un % de cada quiz (`adminJackpotPercentage`)
- Al cerrar la temporada se distribuye según ranking global
- Configuración en `config/prize-config.json` y panel admin

## Transacciones

| Tipo | Descripción |
|------|-------------|
| `QUIZ_ENTRY` | Entrada a quiz (−1 crédito) |
| `PRIZE_PAYOUT` | Premio a ganador |
| `WITHDRAW` | Retiro a cuenta bancaria |
| `BANK_TO_CREDITS` | Compra de créditos |
| `JACKPOT_DEPOSIT` | Ingreso al jackpot de quiz |
| `SEASON_JACKPOT` | Ingreso al jackpot de temporada |
| `PLATFORM_FEE` | Comisión de la plataforma |

## Retiros

- Mínimo configurable (5 créditos en desarrollo)
- Comisión de procesamiento (~5%)
- Límites en `SystemSettings`: 50k€/transacción, 200k€/mes (cuentas verificadas)
- Premios >100k€ requieren KYC enhanced
- Retiros fraccionados soportados (`isPartOfSeries`, `scheduledFor`)

## Roles y visibilidad

- **USER**: Ve sus créditos y premios ganados
- **ADMIN**: Control total de reparto y finanzas
- **ADMIN_WORKER**: Sin acceso a datos financieros sensibles
- Admin y creador **no ven** el premio total de la pool antes de publicarlo
