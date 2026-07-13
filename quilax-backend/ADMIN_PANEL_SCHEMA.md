# Panel Admin - Esquema de Pantallas

## 📋 Roles y Permisos

### ADMIN (Propietario)
- Acceso completo a todas las funciones
- Gestión de usuarios (incluyendo otros admins)
- Gestión financiera completa
- Configuración del sistema
- Aprobación de KYC enhanced
- Gestión de retiros de la cuenta ADMIN
- Acceso a métricas y reportes avanzados
- Acceso a ver cuenta/pricepool jackpot por temporada

### ADMIN_WORKER (Empleado)
- Acceso restringido a funciones específicas
- Gestión de usuarios (solo bloqueo/desbloqueo)
- Aprobación de quizzes entera pero sin acceso a datos financieros
- Sin acceso a configuración del sistema
- Sin acceso a métricas financieras
- Sin acceso a gestión de otros admins
- Acceso a ver cuenta/pricepool jackpot por temporada

---

## 🔐 Pantallas de Login

### Login Admin Principal
**URL:** `/admin/login`

**Campos:**
- Email
- Contraseña
- 2FA (obligatorio para ADMIN)
- Recordar dispositivo (opcional)

**Funciones:**
- Validación de credenciales
- Verificación 2FA (SMS/Authenticator)
- IP whitelisting (opcional)
- Timeout de sesión (configurable)
- Log de accesos

**Seguridad:**
- Máximo 3 intentos fallidos
- Bloqueo temporal después de fallos
- Notificación de acceso por email
- Sesión expira en 30min de inactividad

---

### Login Admin Empleado
**URL:** `/admin/worker/login`

**Campos:**
- Email
- Contraseña
- 2FA (obligatorio para ADMIN_WORKER)
- Código de empleado (opcional)

**Funciones:**
- Validación de credenciales
- Verificación 2FA
- IP whitelisting (configurable por admin)
- Timeout de sesión (configurable por admin)
- Log de accesos

**Seguridad:**
- Máximo 5 intentos fallidos
- Bloqueo temporal después de fallos
- Notificación de acceso al admin principal
- Sesión expira en 15min de inactividad

---

## 🏠 Panel Admin Principal

### Dashboard Principal
**URL:** `/admin/dashboard`

**Métricas Generales:**
- Usuarios totales (en buscador que me dice al buscar a un usuario cuando estuvo activo por ultima vez y sus logros y trayectoria)
- Quizzes activos
- Ingresos totales actuales en cuenta admin
- Jackpot acumulado por ahora temporada actual y ganadores segun su posicion actual en el ranking global
- Tickets de soporte abiertos ¿que es esto?

**Gráficos:**
- Ingresos vs Retiros (últimos 30 días)
- Usuarios nuevos por día
- Quizzes completados por día
- Distribución de usuarios por país

**Acciones:**
- Revisar->Denegar/Aprobar->Fechar->publicar quizzes pendientes de revision que estan en un inbox
- Procesar retiros urgentes ¿que es esto?
- Ver usuarios baneados
- Revisar KYC pendientes

---

### Gestión de Usuarios
**URL:** `/admin/users`

**Funciones:**
- Lista de usuarios con búsqueda y filtros
- Ver perfil completo de usuario
- Bloquear/desbloquear usuario
- Ver historial de transacciones
- Ver historial de quizzes- trayectoria
- Ver KYC status
- Ver verificación bancaria
- Editar datos de usuario (limitado)
- Eliminar/banear usuario (con confirmación)
- Detectar comportamientos sospechosos de users y de Admin Workers

**Filtros:**
- Por rol (USER, CREATOR, ADMIN, ADMIN_WORKER)
- Por estado (activo, bloqueado, verificado)
- Por rango de fecha de registro
- Por país
- Por balance

**Acciones masivas:**
- Bloquear múltiples usuarios
- Enviar notificación a múltiples usuarios o a todos
- Exportar lista de usuarios
- mensaje de bienvenida a la app cada vez que alguien se cree una cuenta

---

### Gestión de Usuarios - Detalle
**URL:** `/admin/users/:userId`

**Información del usuario:**
- Datos personales
- Balance y puntos
- Cuenta bancaria verificada
- KYC enhanced status
- Historial de transacciones
- Historial de quizzes
- Estadísticas de participación
- Logs de actividad

**Acciones:**
- Bloquear/desbloquear
- Ver documentos KYC
- Aprobar/rechazar KYC enhanced
- Ver retiros
- Ver mensajes enviados
- Banear de la aplicacion
---

### Gestión de Quizzes
**URL:** `/admin/quizzes`

**Funciones:**
- Lista de todos los quizzes en diferentes ventanas (pending, published, finished,rejected)
- Filtros por estado 
- Aprobar/rechazar quizzes pendientes
- Ver contenido del quiz
- Ver datos del quiz- dificultad, creador, duracion, fecha solicitada al minuto
- Fechar los quizzes (recuerda que solo se puede uno al minuto. Si el minuto solicitado ya esta fechado, fechar en la fecha mas proxima posible)
- Rechazar quiz- con mensaje opcional al creador
- Ver creador del quiz


---

### Gestión de Quizzes - Detalle
**URL:** `/admin/quizzes/:quizId`

**Información del quiz:**
- Título y descripción
- Creador
- Estado actual
- Créditos requeridos
- Dificultad
- Categoría
- Número de preguntas
- Estadísticas de participación
- Ganadores anteriores
- Reglas de premio

**Acciones:**
- Aprobar/rechazar
- Programar fecha/hora
- Establecer reparto de premio (total 100% para poder publicarlo)
- Ver preguntas (con respuestas)
- Ver logs del quiz
- Ver comentarios del creador
- Ver notas del admin

---

### Gestión de Temporadas
**URL:** `/admin/seasons`

**Funciones:**
- Lista de todas las temporadas
- Ver temporada activa, cuantos dias lleva y cuanto le queda. (3 meses exacto, al acabar una empieza automaticamente la siguiente)
- Ver ranking actual
- Ver ganadores de temporadas anteriores
- Cerrar temporada actual
- Crear nueva temporada
- Ver jackpot acumulado
- Ver distribución de premios

**Acciones:**
- Ver usuarios top por temporada (los 1000 con puntuaciones mas altas de puntos en ese momento para esa temporada. al acabar una temporada los puntos vuelven a 0)
- terminar temporada manualmente

---

### Gestión de Temporadas - Detalle
**URL:** `/admin/seasons/:seasonId`

**Información de las temporada:**
- Nombre y fechas de comienzo y de fin (al minuto) (seran fechas exactas como 1 de enero a las 00:00)
- Jackpot acumulado en cada una (los de temporadas anteriores y el de ese momento por ahora)
- Número de participantes
- Ranking completo
- Ganadores con premios

**Acciones:**
- Ver detalles de ganadores
- Ver distribución de premios
- Exportar ranking
- Cerrar temporada y  Crear siguiente temporada y repartir jackpot entre ganadores son cosas que se hacen automaticamente


---

### Gestión Financiera
**URL:** `/admin/finance`

**Funciones:**
- Ver todas las transacciones
- Ver ingresos totales
- Ver retiros procesados
- Ver balance de la plataforma
- Ver fees cobrados
- Ver reportes financieros

**Filtros:**
- Por tipo de transacción
- Por rango de fechas
- Por usuario
- Por monto

**Acciones:**
- Exportar reportes- a email o guardar en archivos
- Ver detalles de transacción
- Revertir transacción (con autorización)

---

### Auditoría de Admin Workers
**URL:** `/admin/worker-audit`

**Funciones:**
- Lista completa de todas las acciones realizadas por admin workers
- Ver detalles de cada acción
- Filtrar por admin worker específico
- Filtrar por tipo de acción
- Filtrar por rango de fechas
- Ver logs de accesos
- Ver cambios de estado
- Exportar logs

**Tipos de acciones registradas:**
- Aprobación/rechazo de quizzes
- Aprobación de retiros
- Respuesta a tickets de soporte
- Cierre de tickets
- Bloqueo/desbloqueo de usuarios
- Cambios en configuración (si tiene permisos)
- Acciones sensibles

**Información de cada acción:**
- Admin worker que realizó la acción
- Tipo de acción
- Fecha y hora exacta
- Detalles de la acción (qué se modificó, qué se aprobó, etc.)
- IP desde donde se realizó
- Usuario afectado (si aplica)
- Resultado de la acción (éxito/fallo)

**Filtros:**
- Por admin worker
- Por tipo de acción
- Por rango de fechas
- Por resultado (éxito/fallo)
- Por usuario afectado

**Acciones:**
- Ver detalles completos de la acción
- Ver contexto de la acción
- Exportar logs a CSV/PDF
- Programar reportes automáticos de actividad

**Alertas automáticas:**
- Acciones fuera de horario laboral
- Múltiples acciones fallidas consecutivas
- Acciones en usuarios específicos (ej: amigos/familia)
- Cambios bruscos en patrones de actividad

---

### Gestión de Retiros
**URL:** `/admin/withdrawals`

**Funciones:**
- Lista de retiros procesados (automáticos)
- Lista de retiros fallidos
- Lista de retiros programados
- Ver retiros fraccionados
- Programar retiros de cantidad especifica a cuenta de banco en una fecha especifica (al minuto) - SOLO PARA CUENTA ADMIN

**NOTA:** Los retiros de usuarios se procesan automáticamente con Stripe sin aprobación de admin. Solo se detectan transacciones sospechosas.

**Filtros:**
- Por estado (COMPLETED/FAILED/PROCESSING/SCHEDULED)
- Por monto
- Por usuario
- Por fecha

**Acciones:**
- Ver detalles del usuario
- Ver cuenta bancaria
- Ver historial de retiros del usuario
- Ver transacciones sospechosas marcadas
- Programar retiro de cuenta admin (solo admin principal) 

---

### Gestión de Retiros - Detalle
**URL:** `/admin/withdrawals/:withdrawId`

**Información del retiro:**
- Monto y fee
- Usuario
- Cuenta bancaria
- Estado actual
- Fecha de solicitud
- Si es parte de serie fraccionada
- Historial de cambios

**Acciones:**
- Aprobar
- Rechazar
- Ver documentos KYC del usuario
- Ver historial del usuario
- Ver transacción asociada

---

### Gestión de KYC Enhanced
**URL:** `/admin/kyc`

**Funciones:**
- Lista de documentos pendientes
- Lista de documentos aprobados
- Lista de documentos rechazados
- Aprobar documento
- Rechazar documento (con motivo)
- Ver documentos subidos
- Ver usuario asociado

**Filtros:**
- Por estado    
- Por tipo de documento
- Por usuario
- Por fecha

**Acciones:**
- Aprobar documento
- Rechazar documento
- Ver documento completo
- Ver perfil del usuario
- Ver historial de KYC del usuario

---

### Gestión de Pagos
**URL:** `/admin/payments`

**Funciones:**
- Lista de todos los pagos 
- Ver pagos exitosos
- Ver pagos fallidos
- Ver pagos pendientes
- Ver detalles de Stripe
- Ver refunds

**Filtros:**
- Por estado
- Por monto
- Por usuario
- Por fecha

**Acciones:**
- Ver detalles del pago
- Ver usuario
- Ver detalles de Stripe
- Procesar refund (con autorización)

---

### Gestión de Notificaciones
**URL:** `/admin/notifications`

**Funciones:**
- Enviar notificación global
- Enviar notificación a usuario específico
- Enviar notificación a grupo de usuarios (ejemplo, los apuntados a un quiz o los ganadores de la season)
- Ver historial de notificaciones
- Ver estadísticas de apertura

**Tipos de notificación:**
- Anuncios
- Mantenimiento
- Promociones
- Alertas
- Recordatorios
- Mensajes especificos

---

### Gestión de Soporte
**URL:** `/admin/support`

**Funciones:**
- Lista de tickets de soporte
- Ver ticket detallado
- Responder ticket
- Cerrar ticket
- Asignar ticket a empleado
- Ver estadísticas de soporte

**Filtros:**
- Por estado (abierto, en progreso, cerrado)
- Por prioridad
- Por usuario
- Por categoría

---

### Configuración del Sistema
**URL:** `/admin/settings`

**Secciones:**

**General:**
- Nombre de la plataforma
- Logo
- Colores de marca
- Idioma por defecto
- Zona horaria

**Límites:**
- Máximo quizzes por minuto
- Máximo quizzes por hora
- Puntos por defecto por pregunta

**Financiera:**
- Límite de retiro por transacción
- Límite de retiro por mes
- Threshold para KYC enhanced
- Fee fijo de retiro
- Fee porcentual de retiro

**Seguridad:**
- Timeout de sesión admin
- Timeout de sesión empleado
- Máximo intentos de login
- IP whitelisting
- 2FA obligatorio

**Temporadas:**
- Duración de temporada (meses)
- Reglas de jackpot
- Número de premios

**Centro de Ayuda:**
- Gestión de artículos de ayuda
- Crear artículos desde respuestas de tickets
- Editar artículos existentes
- Ver estadísticas de uso (views, votos útiles/no útiles)
- Gestionar categorías de ayuda
- Buscar y organizar artículos

---

### Gestión de Logs
**URL:** `/admin/logs`

**Funciones:**
- Ver logs de accesos
- Ver logs de acciones
- Ver logs de errores
- Ver logs de transacciones
- Ver logs de quizzes
- Exportar logs

**Filtros:**
- Por tipo de log
- Por usuario
- Por fecha
- Por nivel de severidad

---

### Reportes y Métricas
**URL:** `/admin/reports`

**Reportes disponibles:**
- Reporte financiero mensual
- Reporte de usuarios
- Reporte de quizzes
- Reporte de temporadas
- Reporte de retiros
- Reporte de KYC
- Reporte de soporte

**Funciones:**
- Generar reporte
- Exportar a PDF/Excel
- Programar reportes automáticos
- Enviar reportes por email

---

### Gestión de Admins
**URL:** `/admin/admins`

**Funciones:**
- Lista de todos los admins
- Crear nuevo admin 
- Editar admin existente
- Eliminar admin
- Eliminar admin worker
- Ver permisos de admin
- Ver actividad de admin

**Acciones:**
- Crear ADMIN (solo ADMIN principal)
- Crear ADMIN_WORKER
- Asignar permisos específicos
- Revocar acceso
- Ver logs de actividad

---

## 👷 Panel Admin Empleado

### Dashboard Empleado
**URL:** `/admin/worker/dashboard`

**Métricas limitadas:**
- Retiros pendientes
- Tickets de soporte abiertos al completo igual que ADMIN 
- Usuarios activos hoy

**Sin acceso a:**
- Ingresos totales
- Balance de plataforma
- Métricas financieras
- Configuración del sistema

---

### Gestión de Usuarios (Limitado)
**URL:** `/admin/worker/users`

**Funciones permitidas:**
- Ver lista de usuarios
- Buscar usuarios
- Ver perfil básico
- Bloquear/desbloquear usuario
- Ver historial de quizzes y de cada user
- Acceso a balance de usuarios (excepto ADMIN principal)
- Banear a USERS de la app

**Sin acceso a:**
- Balance de ADMIN principal
- Historial de transacciones de ADMIN
- KYC enhanced
- Datos financieros de ADMIN
- Crear o eliminar ADMIN

---

### Gestión de Quizzes
**URL:** `/admin/worker/quizzes`

**Funciones permitidas:**
- Ver lista de quizzes
- Aprobar/rechazar quizzes pendientes
- Ver contenido del quiz
- Ver estadísticas básicas
- Crear reglas de premio y fechar y publicar quizzes. todo esto igual que ADMIN normal
- Ver datos financieros del quiz
- Eliminar quizzes
- Ver logs detallados

---

### Gestión de Retiros (Limitado)
**URL:** `/admin/worker/withdrawals`

**Funciones permitidas:**
- Ver retiros procesados (automáticos)
- Ver retiros fallidos
- Ver retiros programados
- Ver detalles básicos del usuario

**NOTA:** Los retiros de usuarios se procesan automáticamente con Stripe sin aprobación de admin. Solo se detectan transacciones sospechosas.

**Sin acceso a:**
- Programar retiros de cuenta admin
- Ver balance de plataforma
- Ver métricas financieras de ADMIN
- Ver retiros de otros empleados

---

### Gestión de Soporte
**URL:** `/admin/worker/support`

**Funciones permitidas:**
- Ver todos los tickets (dirigidos a admin en general)
- Responder tickets
- Cerrar tickets
- Ver historial de tickets
- Asignar tickets
- Ver estadísticas de soporte
- Ver tickets de otros empleados

---

### Mi Perfil
**URL:** `/admin/worker/profile`

**Funciones:**
- Ver mis datos
- Cambiar contraseña
- Ver mi actividad
- Configurar 2FA
- Ver mis permisos

---

## 🔒 Seguridad Adicional

### Para ADMIN Principal:
- IP whitelisting obligatorio
- 2FA obligatorio
- Sesión expira en 30min de inactividad
- Log de todas las acciones
- Notificación de acciones sensibles
- Requerir re-autenticación para acciones críticas

### Para ADMIN_WORKER:
- IP whitelisting configurable
- 2FA obligatorio
- Sesión expira en 15min de inactividad
- Log de todas las acciones
- Notificación al admin principal de acciones
- Límites de aprobación configurables
- Sin acceso a datos financieros

---

## 📊 Diferencias Resumidas

| Función | ADMIN | ADMIN_WORKER |
|---------|-------|--------------|
| Gestión usuarios completa | ✅ | ✅ |
| Gestión usuarios básica | ✅ | ✅ |
| Aprobar quizzes | ✅ | ✅ |
| Crear reglas premios quizzes | ✅ | ✅ |
| Gestión retiros completa | ✅ | ❌ |
| Ver retiros usuarios | ✅ | ✅ |
| Gestión KYC enhanced | ✅ | ❌ |
| Configuración sistema | ✅ | ❌ |
| Métricas financieras | ✅ | ❌ |
| Gestión admins | ✅ | ❌ |
| Auditoría admin workers | ✅ | ❌ |
| Reportes avanzados users| ✅ | ✅ |
| Reportes avanzados admin workers| ✅ | ❌ |
| Soporte completo | ✅ | ✅ |
