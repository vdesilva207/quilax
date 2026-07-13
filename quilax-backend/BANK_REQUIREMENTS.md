# Requisitos de Documentación Bancaria para Grandes Premios

## 🏦 Configuración con Banco y Stripe

### 1. Acuerdo con Stripe para Gaming Platform
- Configurar cuenta Stripe como "Gaming Platform"
- Activar "High-risk payments" en Stripe Dashboard
- Implementar Stripe Radar para detección de fraude
- Configurar webhooks para eventos de riesgo:
  - `charge.risk_level.elevated`
  - `charge.refunded`
  - `payout.failed`
- Establecer límites de transacción en Stripe

### 2. Acuerdo con Banco para Transacciones Gaming
- Contactar banco para informar sobre plataforma de gaming
- Proporcionar documentación del negocio:
  - Licencia de gaming (si aplica)
  - Términos y condiciones
  - Política de privacidad
  - Procesos de KYC/AML
- Solicitar whitelist de IP del servidor
- Configurar alertas para transacciones grandes

## 📄 Documentación Requerida para Grandes Premios

### Para Premios > 100.000 créditos (100k€)

**Documentación Obligatoria:**
1. **Pasaporte o DNI** - Verificación de identidad
2. **Comprobante de ingresos** - Justificación de capacidad financiera
3. **Identificación fiscal** - NIF/NIE o equivalente
4. **Extracto bancario** - Últimos 3 meses
5. **Declaración de impuestos** - Último año fiscal

**Proceso:**
1. Usuario sube documentos a través de la app
2. Sistema revisa automáticamente con Stripe Identity o Veriff
3. Admin revisa manualmente si es necesario
4. Aprobación/rechazo con notificación al usuario
5. Documentación almacenada de forma segura

### Para Premios > 50.000 créditos (50k€)

**Documentación Simplificada:**
1. **Pasaporte o DNI** - Verificación de identidad
2. **Comprobante de ingresos** - Justificación básica
3. **Identificación fiscal** - NIF/NIE o equivalente

## 🔒 Límites de Retiro para Evitar Problemas Bancarios

### Configuración en SystemSettings
- `maxWithdrawPerMonth`: 50.000€ (por defecto)
- `maxWithdrawPerTransaction`: 10.000€ (por defecto)
- `largePrizeThreshold`: 100.000€ (requiere KYC enhanced)

### Estrategias de Retiro para Grandes Premios

**Para premios > 100.000€:**
1. Retiros fraccionados en el tiempo
2. Máximo 10.000€ por transacción
3. Máximo 50.000€ por mes
4. Requiere KYC enhanced aprobado
5. Confirmación bancaria para cada retiro

**Para premios entre 10.000€ - 100.000€:**
1. Retiros fraccionados recomendados
2. Máximo 10.000€ por transacción
3. Verificación bancaria estándar

**Para premios < 10.000€:**
1. Retiro directo permitido
2. Verificación bancaria estándar

## 📋 Proceso de Verificación KYC Enhanced

### 1. Solicitud de Documentación
- Usuario recibe notificación de premio grande
- Sistema solicita documentación adicional
- Usuario sube documentos a través de la app

### 2. Verificación Automática
- Integración con Stripe Identity o Veriff
- Verificación de autenticidad de documentos
- Detección de fraude

### 3. Revisión Manual (si es necesario)
- Admin revisa documentación
- Aprobación o rechazo con motivo
- Notificación al usuario

### 4. Aprobación
- Usuario marcado como `largePrizeVerified: true`
- Puede retirar premio sin límites adicionales
- Documentación almacenada de forma segura

## ⚠️ Alertas y Monitoreo

### Alertas Automáticas
- Transacciones > 10.000€
- Múltiples retiros en corto tiempo
- Cambios en cuenta bancaria
- Patrones sospechosos

### Revisión Manual
- Todas las transacciones > 50.000€
- Usuarios con comportamiento inusual
- Nuevos usuarios con grandes premios

## 📞 Contacto con Banco

### Información a Proporcionar
- Descripción del modelo de negocio
- Procesos de KYC/AML
- Límites y controles implementados
- Procedimientos para reportar actividades sospechosas
- Contacto de soporte 24/7

### Documentación Legal
- Términos y condiciones
- Política de privacidad
- Política AML
- Procedimientos de compliance

## 🔐 Seguridad de Datos

### Almacenamiento
- Documentación encriptada en reposo
- Acceso restringido a admin
- Retención de documentos según regulación
- Eliminación segura después del período legal

### Transmisión
- HTTPS obligatorio
- Encriptación end-to-end
- No almacenar datos sensibles en logs
- Auditoría de accesos

## 📊 Reportes y Compliance

### Reportes Automáticos
- Transacciones > 10.000€ (regulación SAR)
- Actividades sospechosas
- Grandes premios distribuidos
- Retiros procesados

### Auditoría
- Logs de todas las transacciones
- Logs de accesos a documentación
- Logs de aprobaciones/rechazos
- Retención mínima 5 años

## 🚨 Procedimientos de Emergencia

### Si el Banco Bloquea una Cuenta
1. Contactar inmediatamente al banco
2. Proporcionar documentación del negocio
3. Explicar naturaleza de las transacciones
4. Proporcionar historial del usuario
5. Seguir procedimientos del banco

### Si Stripe Marca Riesgo
1. Revisar motivo del riesgo
2. Solicitar documentación adicional al usuario
3. Aprobar manualmente si es legítimo
4. Actualizar procedimientos de detección
