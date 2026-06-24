# Configuración de Email para Quilax

## Estado Actual
El sistema de email está configurado pero usa credenciales de ejemplo. Los emails no se envían hasta que configures credenciales reales.

## Solución Temporal (Desarrollo)
Ya he modificado el código para que cuando falle el envío de email, el código de verificación se muestre en la consola del backend. Esto permite continuar con el desarrollo sin configurar email real.

## Opción 1: Configurar Gmail SMTP (Gratis y Fácil)

### Paso 1: Habilitar 2FA en tu cuenta de Google
1. Ve a https://myaccount.google.com/security
2. En "Iniciar sesión en Google", activa "Verificación en dos pasos"
3. Sigue las instrucciones para configurar 2FA

### Paso 2: Generar una App Password
1. Ve a https://myaccount.google.com/apppasswords
2. En "Seleccionar app", elige "Correo"
3. En "Seleccionar dispositivo", elige "Otro (nombre personalizado)"
4. Escribe "Quilax Backend" y dale a "Generar"
5. Google te mostrará una contraseña de 16 caracteres (ej: `abcd efgh ijkl mnop`)
6. **Copia esta contraseña**, solo se muestra una vez

### Paso 3: Actualizar el archivo .env
Edita `/Users/imac/Desktop/quilax/quilax-backend/.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASSWORD=la-app-password-de-16-caracteres
EMAIL_FROM=Quilax <noreply@quilax.com>
```

**Importante:** 
- Reemplaza `tu-email@gmail.com` con tu email real de Gmail
- Reemplaza `la-app-password-de-16-caracteres` con la App Password que generaste
- No incluyas espacios en la App Password (ej: `abcdefghijklmn` no `abcd efgh ijkl mnop`)

### Paso 4: Probar la configuración
Ejecuta el script de prueba:

```bash
cd quilax-backend
node test-email.js
```

Si todo está correcto, recibirás un email de prueba en tu cuenta de Gmail.

## Opción 2: Usar SendGrid (Recomendado para Producción)

### Paso 1: Crear cuenta en SendGrid
1. Ve a https://sendgrid.com/
2. Regístrate (plan gratuito incluye 100 emails/día)
3. Verifica tu email

### Paso 2: Crear API Key
1. En el dashboard de SendGrid, ve a Settings > API Keys
2. Crea una nueva API Key con permisos "Mail Send"
3. Copia la API Key generada

### Paso 3: Actualizar el archivo .env
Edita `/Users/imac/Desktop/quilax/quilax-backend/.env`:

```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=SG.tu-api-key-aqui
EMAIL_FROM=Quilax <noreply@quilax.com>
```

### Paso 4: Probar la configuración
```bash
cd quilax-backend
node test-email.js
```

## Opción 3: Usar Mailgun

### Paso 1: Crear cuenta en Mailgun
1. Ve a https://www.mailgun.com/
2. Regístrate (plan gratuito incluye 5,000 emails/mes)
3. Verifica tu dominio o usa el sandbox domain

### Paso 2: Obtener credenciales SMTP
1. En el dashboard de Mailgun, ve a Sending > Domains
2. Selecciona tu dominio
3. Copia las credenciales SMTP

### Paso 3: Actualizar el archivo .env
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@tu-dominio.mailgun.org
EMAIL_PASSWORD=tu-smtp-password
EMAIL_FROM=Quilax <noreply@quilax.com>
```

## Opción 4: Usar AWS SES (Económico para Alto Volumen)

### Paso 1: Configurar AWS SES
1. Ve a la consola de AWS
2. Navega a Amazon SES
3. Verifica tu dominio o email
4. Crea credenciales SMTP en Settings > SMTP Credentials

### Paso 2: Actualizar el archivo .env
```env
EMAIL_HOST=email-smtp.us-east-1.amazonaws.com
EMAIL_PORT=587
EMAIL_USER=tu-smtp-username
EMAIL_PASSWORD=tu-smtp-password
EMAIL_FROM=Quilax <noreply@quilax.com>
```

## Verificar que funciona

### Método 1: Script de prueba
```bash
cd quilax-backend
node test-email.js
```

### Método 2: Probar desde el frontend
1. Regístrate en http://localhost:8081
2. Solicita el código de verificación
3. Revisa tu email o la consola del backend

### Método 3: Ver logs del backend
```bash
cd quilax-backend
npm run dev
```
Busca mensajes como:
- `✅ Email de verificación enviado a ...` (éxito)
- `❌ Error enviando email de verificación:` (error)
- `📧 [MODO DESARROLLO] Código de verificación para ...` (fallback)

## Solución de Problemas

### Error: "Invalid login"
- Verifica que el email y contraseña son correctos
- Si usas Gmail, asegúrate de usar una App Password, no tu contraseña normal
- Verifica que 2FA esté activado en tu cuenta de Google

### Error: "Connection timeout"
- Verifica que el puerto es correcto (587 para TLS, 465 para SSL)
- Verifica que tu firewall no bloquee el puerto
- Si usas Gmail, verifica que "Acceso de apps menos seguras" esté activado (aunque App Password es mejor)

### Error: "Self-signed certificate"
- Agrega esto al emailService.js si usas un servidor con certificado auto-firmado:
```javascript
const transporter = nodemailer.createTransport({
  // ... otras opciones
  tls: {
    rejectUnauthorized: false
  }
});
```

## Recomendaciones

### Desarrollo
- Usa el modo fallback (código en consola) para desarrollo rápido
- O usa Gmail con App Password para pruebas más realistas

### Producción
- Usa SendGrid, Mailgun o AWS SES
- Configura dominio propio (noreply@tu-dominio.com)
- Implementa tracking de emails (aperturas, clics)
- Configura SPF, DKIM y DMARC para mejor entregabilidad

### Seguridad
- Nunca commits el archivo .env con credenciales reales
- Usa variables de entorno en producción
- Rota las API Keys regularmente
- Usa credenciales separadas para desarrollo y producción
