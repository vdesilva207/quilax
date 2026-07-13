# 📱 ESQUEMA COMPLETO DE PANTALLAS - QUIZ APP

## 🎯 **RESUMEN DE SITUACIÓN ACTUAL**

**Estado Backend**: ✅ Optimizado para 2M usuarios pero necesita mejoras
- Login rate: 0.45% éxito (objetivo: 80%)
- Validación quizzes: 100% ✅
- Operaciones sensibles: 0% éxito

---

## 📱 **APP PARA USUARIOS**

### **🏠 MÓDULO AUTENTICACIÓN**
```
1. Splash Screen (/)
   └──→ Login Screen (/login)
   └──→ Register Screen (/register)

2. Login Screen (/login)
   ├──→ Forgot Password (/forgot-password)
   ├──→ Main App (post-login)
   └──→ Register (/register)

3. Register Screen (/register)
   ├──→ Email Verification (/verify-email)
   ├──→ ID document and face scan (/id-verification)
   ├──→ Add Bank account (/add-bank-account)
   ├──→ Complete Profile (/complete-profile)
   └──→ Login (/login)

4. Forgot Password (/forgot-password)
   └──→ Reset Password (/reset-password)

5. Email Verification (/verify-email)
   └──→ Main App (verificado)

### MÓDULO PRINCIPAL - NAVEGACIÓN BOTTOM BAR
```
 BOTTOM NAVIGATION BAR (7 botones deslizables)
┌─────────────────────────────────────────────────────────────┐
│ HOME    BUSCAR    CREAR    PERFIL    GESTIÓN    MENSAJES    CONFIG │
└─────────────────────────────────────────────────────────────┘

6. Home Screen (/home) - 
   ├──→ Hottest quizzes List (/quizzes)
   ├──→ Newest quizzes (/newest)
   ├──→ Season users highest ranking and highest season prices so far
   ├──→ Recent Activity (/recent)
   └──→ Quick Play (/quick-play)

7. Buscador Screen (/search) - 
   ├──→ Search Bar (Multi-type: Quizzes, Categorías, Usuarios)
   │   ├──→ Quiz Results (No jugados primero, luego jugados)
   │   ├──→ Category Results (Similares)
   │   └──→ User Results (Similares)
   ├──→ Category Buttons Grid (25-30 categorías temáticas)
   │   ├──→ Ciencias (Física, Química, Biología, Astronomía)
   │   ├──→ Matemáticas (Álgebra, Geometría, Estadística, Cálculo)
   │   ├──→ Historia (Antigua, Medieval, Moderna, Contemporánea)
   │   ├──→ Geografía (Mundial, Europa, América, Asia, África)
   │   ├──→ Literatura (Clásica, Moderna, Poesía, Novela)
   │   ├──→ Arte (Pintura, Escultura, Arquitectura, Fotografía)
   │   ├──→ Música (Clásica, Pop, Rock, Jazz, Electrónica)
   │   ├──→ Cine (Clásicos, Modernos, Series, Documentales)
   │   ├──→ Deportes (Fútbol, Baloncesto, Tenis, Atletismo)
   │   ├──→ Videojuegos (RPG, FPS, Estrategia, Indie)
   │   ├──→ Tecnología (Programación, IA, Hardware, Software)
   │   ├──→ Idiomas (Inglés, Español, Francés, Chino, Japonés)
   │   ├──→ Gastronomía (Cocina mundial, Repostería, Vinos, Vegano)
   │   ├──→ Viajes (Europa, Asia, América, África, Oceanía)
   │   ├──→ Naturaleza (Animales, Plantas, Ecosistemas, Clima)
   │   ├──→ Psicología (General, Social, Clínica, Evolutiva)
   │   ├──→ Filosofía (Antigua, Moderna, Contemporánea, Ética)
   │   ├──→ Religión (Cristianismo, Islam, Budismo, Hinduismo)
   │   ├──→ Mitología (Griega, Nórdica, Egipcia, Romana)
   │   ├──→ Política (Internacional, Economía, Derecho, Sociología)
   │   ├──→ Economía (Micro, Macro, Finanzas, Emprendimiento)
   │   ├──→ Salud (Medicina, Nutrición, Fitness, Mental)
   │   ├──→ Educación (Primaria, Secundaria, Universidad, Online)
   │   ├──── Moda (Historia, Tendencias, Diseñadores, Sostenible)
   │   ├──→ Artesanías (Cerámica, Tejido, Madera, Metal)
   │   ├──→ Esoterismo (Tarot, Astrología, Numerología, Meditation)
   │   └──→ Otros (General, Misceláneo, Curiosidades)
   ├──→ Filter by Categories (/search/filter-categories)
   │   ├──→ Select Multiple Categories
   │   ├──→ Apply Filters
   │   └──→ Search within Selected Categories
   ├──→ Newest Quizzes Section (/search/newest)
   ├──→ Hottest Quizzes Section (/search/hottest)
   └──── Quiz Details & Join (/quiz/:id/join)
       ├──→ Quiz Information
       │   ├──→ Prizes (Credit amounts - dinámicos)
       │   ├──→ Difficulty Level
       │   ├──→ Category
       │   ├──→ Creator/Admin Messages (opcional)
       │   ├──→ Exact Game Date & Time
       │   ├──→ Countdown Timer
       │   ├──→ Image (opcional)
       │   └──→ Quiz Title
       ├──→ Join Button (UNIRSE)
       ├──→ Confirmation Modal (/quiz/:id/confirm-join)
       │   ├──→ "¿Estás seguro?"
       │   ├──→ Cancel Button
       │   └──→ UNIRSE Button ASISTENTE DE CREACIÓN
       └──── Quiz Details**6. Creator Tools (/creator-tools)**
- **Herramientas simplificadas para creadores:**
```
�️ HERRAMIENTAS AVANZADAS
┌─────────────────────────────────────────┐
│ 🎨 MEJORAR REDACCIÓN               │
│ ───────────────────────────────────── │
│ • Sugerir dificultad: Sí, dejar pero esto es ya con el quiz creado, cuando se tienen todas las preguntas, después de crearlas se sugiere la dificultad, el Creador pone mensaje/indicaciones (opcionales, recomendadas) y despues de eso se habilita el boton de fechar. │
│ ───────────────────────────────────── │
│ [🎨 USAR ASISTENTE DE REDACCIÓN]   │
└─────────────────────────────────────────┘
           │ • Diferente para cada pregunta      │
           │ • En la primera pregunta: opción de │
           │   establecer misma cantidad para todas │
           │ ───────────────────────────────────── │
           │ CÁLCULO AUTOMÁTICO:           │
           │ • Basado en tiempo ANSWER establecido │
           │ • Calcula puntos para que al final   │
           │   del tiempo sean 0 puntos         │
           │ • Creador puede aceptar o poner    │
           │   cantidad MENOR (no mayor)        │
           │ ───────────────────────────────────── │
           │ Establece cantidad razonable   │
           │ (demasiado baja = rechazo admin)     │
           │ ───────────────────────────────────── │
           │ [+ AÑADIR PREGUNTA] [GUARDAR]     │
           │ [CREAR SIGUIENTE PREGUNTA]         │
           └─────────────────────────────────────────┘
           ├──→ Quiz Settings (/quiz-settings)
           ├──→ Quiz Preview (/quiz-preview)
           └──→ Publish Quiz (/publish-quiz)

   └──── [PANTALLA DE BLOQUEO: Si ha jugado <10 quizzes]
       ├──→ Mis Quizzes (/my-quizzes)
       └──── Progreso para desbloquear creación
           ├──→ Quizzes jugados: X/10
           ├──→ Quizzes restantes: (10-X)
           ├──→ [Jugar más quizzes para desbloquear]
           └──── Mensaje motivacional

   └──── [REGLA DE REINICIO]
       ├──→ Al enviar quiz a admin para revisión
       ├──→ Se reinicia contador a 0
       ├──→ Debe jugar otros 10 quizzes para crear otro
       └──── Notificación de reinicio de progreso

8. Creator Screen (/creator) - 
   ├──→ My Quizzes (/my-quizzes) [SIEMPRE VISIBLE]
   │   ├──→ Quiz Details (/quiz/:id)
   │   ├──→ Edit Quiz (/edit-quiz/:id)
   │   ├──→ Quiz Analytics (/quiz-analytics/:id)
   │   └──→ Delete Quiz (/delete-quiz/:id)
   └──── [CONDICIONAL: Solo si ha jugado 10+ quizzes]
       ├──→ Estadísticas de mis Quizzes (/my-quizzes-stats)
       ├──→ Ranking de Creadores (/creator-ranking)
       └──→ Create Quiz (/create-quiz)
           ├──→ Add Questions (/add-questions)
           │   ┌─────────────────────────────────────────┐
           │ EDITOR DE PREGUNTAS
           │ ───────────────────────────────────── │
           │ TIPO DE PREGUNTA (para cada pregunta):│
           │ ○ Verdadero/Falso                 │
           │ ○ 3-6 opciones, solo 1 correcta   │
           │ ───────────────────────────────────── │
           │ AÑADIR PREGUNTA:                 │
           │ • Se añaden automáticamente al tiempo total:│
           │   - 3 segundos de question correction   │
           │   - 6 segundos de current ranking     │
           │   - **7. Quiz Analytics (/quiz-analytics/:id)**
- **Análisis detallado del rendimiento (solo quizzes ya jugados):**
```
📊 ANÁLISIS DETALLADO
┌─────────────────────────────────────────┐
│ 📈 MÉTRICAS PRINCIPALES            │
│ • Jugadores totales: ESto no lo pueden ver ni los users ni el creador del quiz (que tambien es user) solo ADMIN │
│ • Tasa de finalización: 78% (y tasa de abandono) │
│ • Tiempo de juego: 12.3 min         │
│ • Rating promedio: NO, no se rankea un quiz despues de jugarlo │
│ ───────────────────────────────────── │
│ 🎯 ANÁLISIS DE PREGUNTAS         │
│ ┌─────────────────────────────────────┐
│ │ ❓ P1 (Capital Francia)        │
│ │ ✅ Aciertos: 89%               │
│ │ ⏱️ Tiempo promedio: 8s          │
│ └─────────────────────────────────────┘
│ ┌─────────────────────────────────────┐
│ │ ❓ P5 (Río más largo)          │
│ │ ✅ Aciertos: 54%               │
│ │ ⏱️ Tiempo promedio: 15s         │
│ └─────────────────────────────────────┘
│ ───────────────────────────────────── │
│ 💰 ANÁLISIS ECONÓMICO             │
│ • Ingresos totales propios (al creador): 12,340 créditos │
│ • Premios de jugadores (se puede ver la lista completa de ganadres de premios) │
│ ───────────────────────────────────── │
│ [📥 EXPORTAR REPORTE] [📧 ENVIAR]   │
│ [🔧 EDITAR QUIZ] [🗑️ ELIMINAR]   │
└─────────────────────────────────────────┘

📅 REGLA DE VISIBILIDAD:
• Se pueden ver de quizzes ya jugados
• Desde el momento que termina y se hace la repartición de premios podrás ver las estadisticas del que acaba de terminar por una semana, 7 dias exactos
• Luego se bloquea y solo podras ver las estadisticas de cada uno de tus quizzes creados si has jugado 10 quizzes desde l ultimo que mandaste, como fijamos al principio
           │ • Basado en tiempo ANSWER establecido │
           │ • Calcula puntos para que al final   │
           │   del tiempo sean 0 puntos         │
           │ • Creador puede aceptar o poner    │
           │   cantidad MENOR (no mayor)        │
           │ ───────────────────────────────────── │
           │ Establece cantidad razonable   │
           │ (demasiado baja = rechazo admin)     │
           │ ───────────────────────────────────── │
           │ [+ AÑADIR PREGUNTA] [GUARDAR]     │
           │ [CREAR SIGUIENTE PREGUNTA]         │
           └─────────────────────────────────────────┘
           ├──→ Quiz Settings (/quiz-settings)
           ├──→ Quiz Preview (/quiz-preview)
           └──→ Publish Quiz (/publish-quiz)

   └──── [PANTALLA DE BLOQUEO: Si ha jugado <10 quizzes]
       ├──→ Mis Quizzes (/my-quizzes)
       └──── Progreso para desbloquear creación
           ├──→ Quizzes jugados: X/10
           ├──→ Quizzes restantes: (10-X)
           ├──→ [Jugar más quizzes para desbloquear]
           └──── Mensaje motivacional

   └──── [REGLA DE REINICIO]
   │   ├──→ Privacy Settings (/privacy-settings)
   │   │   ├──→ Public Profile (visible para todos)
   │   │   └──→ Private Profile (solo user + ADMIN)
   │   └──── Account Settings (/account-settings)
   │       ├──→ Change Password (/change-password)
   │       ├──→ Email Settings (/email-settings)
   │       └──── Notifications (/notification-settings)
   ├──→#### **Pantalla principal del Profile:**

**📱 PERFIL PÚBLICO (ESTILO INSTAGRAM):**
```
📱 PROFILE SCREEN
┌─────────────────────────────────────────┐
│ 👤 [FOTO DE PERFIL - OPCIONAL]    │
│ @username                         │
│ 📝 Bio del usuario                │
│ ───────────────────────────────────── │
│ 📊 ESTADÍSTICAS                 │
│ 🎮 Quizzes jugados: 156           │
│ 🏆 Quizzes creados: 12            │
│ 💰 Premios ganados: 2,340        │
│ ───────────────────────────────────── │
│ 👥 SOCIAL                         │
│ 👥 Seguidores: 234               │
│ 👤 Siguiendo: 89                 │
│ ───────────────────────────────────── │
│ 🏆 LOGROS RECIENTES               │
│ 🥇 Ganador Quiz Historia          │
│ 🎯 Creator Nivel 3               │
│ 💰 Primer Premio                  │
│ ───────────────────────────────────── │
│ [✏️ EDITAR PERFIL] [⚙️ CONFIG]  │
│ [📧 MENSAJE] [📤 COMPARTIR]    │
└─────────────────────────────────────────┘
```

**📱 TRAYECTORIA/LOGROS (CON CONTROL DE PRIVACIDAD):**
```
📱 ACHIEVEMENTS & JOURNEY
┌─────────────────────────────────────────┐
│ [🔒/🔓] TRAYECTORIA PRIVADA/PÚBLICA │
│ ───────────────────────────────────── │
│ 🎮 QUIZ HISTORY                  │
│ ───────────────────────────────────── │
│ 📋 Quizzes Jugados (156)         │
│ ┌─────────────────────────────────────┐
│ │ 🧬 Ciencia Básica - Ganado     │
│ │ 🎮 Historia Videojuegos - 2do    │
│ │ 🎨 Arte - Participado           │
│ └─────────────────────────────────────┘
│ ───────────────────────────────────── │
│ 🏆 QUIZZES CREADOS (12)          │
│ ┌─────────────────────────────────────┐
│ │ 📚 Geografía Mundial - 234 jug.  │
│ │ 🎵 Música - 189 jug.          │
│ │ 🎮 Gaming - 156 jug.           │
│ └─────────────────────────────────────┘
│ ───────────────────────────────────── │
│ � PREMIOS GANADOS                │
│ ┌─────────────────────────────────────┐
│ │ 🏆 Quiz Prizes: 1,200 créditos  │
│ │ 🎯 Season Jackpot: 1,140 créditos│
│ │ 🥇 Total: 2,340 créditos       │
│ └─────────────────────────────────────┘
│ ───────────────────────────────────── │
│ �️ BADGES DE LOGROS              │
│ ┌─────────────────────────────────────┐
│ │ 🥇 Quiz Master • 🎯 Creator      │
│ │ 🏆 Season Winner • 💰 Winner     │
│ │ 🎮 Gamer • 🎓 Learner         │
│ └─────────────────────────────────────┘
│ ───────────────────────────────────── │
│ [📊 VER TODOS LOS DETALLES]       │
│ [🏆 VER TODOS LOS PREMIOS]        │
└─────────────────────────────────────────┘

🔒 CONFIRMACIÓN DE PRIVACIDAD:
┌─────────────────────────────────────────┐
│ ¿Seguro que quieres hacer tu        │
│ trayectoria pública/privada?       │
│ ───────────────────────────────────── │
│ [SÍ] [CANCELAR]                 │
└─────────────────────────────────────────┘
```

**📱 CONFIGURACIÓN DE PERFIL:**
```
📱 PROFILE SETTINGS
┌─────────────────────────────────────────┐
│ 📷 EDITAR FOTO DE PERFIL         │
│ ───────────────────────────────────── │
│ [📷 CAMBIAR FOTO] [🗑️ BORRAR]  │
│ ───────────────────────────────────── │
│ ✏️ EDITAR NOMBRE- nombre UNICO cada jugador                  │
│ ───────────────────────────────────── │
│ [📝 NUEVO NOMBRE- UNICo]                │
│ ───────────────────────────────────── │
│ 📝 EDITAR BIOGRAFÍA               │
│ ───────────────────────────────────── │
│ [📝 NUEVA BIO]                  │
│ ───────────────────────────────────── │
│ 🖼️ GESTIÓN DE FOTOS POSTEADAS   │
│ ───────────────────────────────────── │
│ • Ver foto + descripción           │
│ • [🗑️ ELIMINAR] (solo propias)   │
│ ───────────────────────────────────── │
│ 🔔 GESTIÓN DE NOTIFICACIONES      │
│ ───────────────────────────────────── │
│ • Quizzes • Mensajes • Seguidores │
│ ───────────────────────────────────── │
│ [💾 GUARDAR CAMBIOS]            │
└─────────────────────────────────────────┘
```

**📱 FUNCIONES SOCIALES:**
```
📱 SOCIAL FEATURES
┌─────────────────────────────────────────┐
│ � SEGUIDORES                    │
│ ───────────────────────────────────── │
│ • Lista completa                  │
│ • [🗑️ ELIMINAR SEGUIDOR]         │
│ • [🚫 BLOQUEAR USUARIO]          │
│ ───────────────────────────────────── │
│ 👤 SIGUIENDO                     │
│ ───────────────────────────────────── │
│ • Lista completa                  │
│ • [❌ DEJAR DE SEGUIR]          │
│ ───────────────────────────────────── │
│ 🚨 REPORTAR PERFIL               │
│ ───────────────────────────────────── │
│ 📝 Motivo del reporte:           │
│ ───────────────────────────────────── │
│ [📤 ENVIAR A ADMIN]             │
│ ───────────────────────────────────── │
│ [� MENSAJE DIRECTO]             │
│ [📤 COMPARTIR PERFIL]            │
└─────────────────────────────────────────┘

📝 NOTA: ADMIN puede ver todas las trayectorias incluso si son privadas
```

9. Profile Screen (/profile) - 👤feed)
   │   ├──→ Profile Info Card (/profile-info)
   │   │   ├──→ Profile Photo (si pública)
   │   │   ├──→ Username (si pública)
   │   │   ├──→ Bio/Description
   │   │   ├──→ Followers Count
   │   │   ├──→ Following Count
   │   │   └──── Profile Type Badge
   │   └──── Profile Actions
   │       ├──→ Follow/Unfollow (/follow/:userId)
   │       ├──→ Message (/message/:userId)
   │       └──── Share Profile (/share-profile/:userId)
   ├──→ Achievements & Journey (/achievements)
   │   ├──→ Quiz History (/quiz-history)
   │   │   ├──→ Quizzes Played (lista completa)
   │   │   ├──→ Quizzes Created (lista completa)
   │   │   ├──→ Win Rate Statistics (/win-rate)
   │   │   └──── Quiz Details (/quiz/:id/results)
   │   ├──→ Prizes Won (/prizes-won)
   │   │   ├──→ Quiz Prizes (premios de quizzes)
   │   │   ├──→ Season Jackpot Prizes (jackpot global)
   │   │   ├──→ Prize History (/prize-history)
   │   │   └──── Prize Details (/prize/:id)
   │   └──── Achievement Badges (/achievement-badges)
   │       ├──→ Quiz Master Badges
   │       ├──→ Creator Badges
   │       ├──→ Season Winner Badges
   │       └──── Special Achievement Badges
   ├──→ Social Features (/social)
   │   ├──→ Followers (/followers)
   │   │   ├──→ Follower List (/followers/list)
   │   │   ├──→ Remove Follower (/remove-follower/:userId)
   │   │   └──── Block User (/block/:userId)
   │   ├──→ Following (/following)
   │   │   ├──→ Following List (/following/list)
   │   │   ├──→ Unfollow User (/unfollow/:userId)
   │   │   └──── View Profile (/user/:userId)
   │   └──── Friend Requests (/friend-requests)
   │       ├──→ Pending Requests (/pending-requests)
   │       ├──→ Accept Request (/accept-request/:userId)
   │       ├──→ Decline Request (/decline-request/:userId)
   │       └──── Send Request (/send-request/:userId)
   └──── Profile Views (/profile-views)
       ├──→ View Statistics (/view-stats) [solo para dueño del perfil]
       ├──→ Recent Visitors (/recent-visitors)
       └──── Profile Analytics (/profile-analytics)

#### **Pantalla principal de Gestiones/Dinero:**

**📱 WALLET SCREEN**
```
📱 GESTIONES (DINERO)
┌─────────────────────────────────────────┐
│ 💰 SALDO ACTUAL                  │
│ ───────────────────────────────────── │
│ • Créditos disponibles: 2,450 créditos │
│ • (24.50 € - equivalente en tu moneda)│
│ ───────────────────────────────────── │
│ 💳 AÑADIR FONDOS                │
│ ───────────────────────────────────── │
│ [💳 AÑADIR CRÉDITOS]           │
│ ───────────────────────────────────── │
│ 💸 RETIRAR FONDOS               │
│ ───────────────────────────────────── │
│ [💸 RETIRAR A CUENTA BANCARIA]  │
│ ───────────────────────────────────── │
│ 📊 HISTORIAL DE TRANSACCIONES   │
│ ───────────────────────────────────── │
│ • +500 créditos (compra)          │
│ • -1 crédito (inscripción quiz)   │
│ • +1,200 créditos (premio)       │
│ • -50 créditos (retiro banco)    │
│ ───────────────────────────────────── │
│ [📋 VER HISTORIAL COMPLETO]       │
└─────────────────────────────────────────┘
```

**📱 AÑADIR FONDOS:**
```
📱 ADD FUNDS
┌─────────────────────────────────────────┐
│ 💳 MÉTODO DE PAGO               │
│ ───────────────────────────────────── │
│ ○ Cuenta bancaria asociada (Stripe)  │
│   (Confirmación requerida en cuenta  │
│    bancaria para primera vez y       │
│    cada transacción)                │
│ ───────────────────────────────────── │
│ 💰 CANTIDAD A AÑADIR            │
│ ───────────────────────────────────── │
│ [100] [500] [1,000] [5,000]    │
│ (100 € - 500 € - 1,000 € - 5,000 €)│
│ [💳 PROCESAR PAGO]              │
└─────────────────────────────────────────┘
```

**📱 RETIRAR FONDOS:**
```
📱 WITHDRAW
┌─────────────────────────────────────────┐
│ 💸 MÉTODO DE RETIRO             │
│ ───────────────────────────────────── │
│ ○ Cuenta bancaria registrada       │
│ ───────────────────────────────────── │
│ 💰 CANTIDAD A RETIRAR          │
│ ───────────────────────────────────── │
│ Saldo disponible: 2,450 créditos (24.50 €)│
│ ───────────────────────────────────── │
│ [💸 RETIRAR]                   │
│ Ejemplo: 300 créditos (3.00 €)      │
└─────────────────────────────────────────┘
```

**📱 HISTORIAL DE TRANSACCIONES:**
```
📱 TRANSACTION HISTORY
┌─────────────────────────────────────────┐
│ 📊 HISTORIAL COMPLETO           │
│ ───────────────────────────────────── │
│ 📅 FECHA      │ 💰 CANTIDAD │ TIPO │
│ ───────────────────────────────────── │
│ 10/05/2026   │ +500 créditos │ Compra │
│ 09/05/2026   │ -1 crédito   │ Quiz │
│ 08/05/2026   │ +1,200      │ Premio │
│ 07/05/2026   │ -50 créditos  │ Retiro │
│ ───────────────────────────────────── │
│ [🔍 FILTRAR: Tipo/Período]       │
│ [📥 EXPORTAR HISTORIAL]          │
│   → Guardar en archivo del móvil   │
│   → Enviar a email asociado       │
└─────────────────────────────────────────┘
```

10. Gestiones (Dinero) Screen (/wallet) - 💰
    ├──→ Balance Overview (/balance)
    ├──→ Add Funds (/add-funds)
    │   ├──→ Payment Method (/payment-method)
    │   ├──→ Confirm Payment (/confirm-payment)
    │   └──── Payment Success (/payment-success)
    ├──→ Withdraw (/withdraw)
    │   ├──→ Withdraw Method (/withdraw-method)
    │   ├──→ Withdraw Confirmation (/withdraw-confirm)
    │   └──── Withdraw Success (/withdraw-success)
    ├──→ Transaction History (/transaction-history)
    │   ├──→ Transaction Details (/transaction/:transactionId)
    │   ├──→ Filter Transactions (/filter-transactions)
    │   │   ├──→ Filter by Type (QUIZ_ENTRY, PRIZE_PAYOUT, PLATFORM_FEE, WITHDRAW)
    │   │   ├──→ Filter by Period (daily, weekly, monthly, yearly, all-time)
    │   │   └──── Filter by Category (quiz, payments, fees)
    │   └──── Export History (/export-history)
    │       ├──→ Save to Device (/save-device)
    │       └──── Send to Email (/send-email)

11. Messages Screen (/messages) - 💬
    ├──→ Chat List (/chat-list)
    ├──→ Chat (/chat/:userId)
    │   ├──→ Chat Settings (/chat-settings/:userId)
    │   ├──→ Chat Media (/chat-media/:userId)
    │   └──── Chat Info (/chat-info/:userId)
    ├──→ New Message (/new-message)
    │   └──→ Select User (/select-user)
    ├──→ First Message Request (/first-message-request)
    │   ├──→ Accept Request (/accept-message-request/:userId)
    │   ├──→ Reject Request (/reject-message-request/:userId)
    │   └──── Block User (/block-user/:userId)
    ├──→ Admin Messages (/admin-messages)
    │   ├──→ Quiz Approved (/quiz-approved/:quizId)
    │   ├──→ Quiz Rejected (/quiz-rejected/:quizId)
    │   └──── System Notifications (/system-notifications)
    └──── Quiz Messages (/quiz-messages)
        ├──→ Quiz Creator Messages (/quiz-creator-messages/:quizId)
        └──── Quiz Status Updates (/quiz-status-updates/:quizId)

#### **Pantalla principal de Messages:**

**📱 MESSAGES SCREEN**
```
📱 MENSAJES
┌─────────────────────────────────────────┐
│ 📨 CHATS ACTIVOS                │
│ ───────────────────────────────────── │
│ ┌─────────────────────────────────────┐
│ │ 👤 [FOTO] @username         │
│ │ Último mensaje: Hola!          │
│ │ 🕒 Hace 5 min               │
│ │ [🔴 2] [📝 Escribiendo...] │
│ └─────────────────────────────────────┘
│ ┌─────────────────────────────────────┐
│ │ 🏢 ADMIN                      │
│ │ Nuevo quiz aprobado              │
│ │ 🕒 Hace 1 hora              │
│ │ [🔵 1]                       │
│ └─────────────────────────────────────┘
│ ───────────────────────────────────── │
│ [📝 NUEVO MENSAJE]             │
│ [🔍 BUSCAR CHATS]              │
└─────────────────────────────────────────┘
```

**📱 CHAT INDIVIDUAL:**
```
📱 CHAT
┌─────────────────────────────────────────┐
│ 👤 @username                     │
│ ───────────────────────────────────── │
│ HOY                             │
│ ───────────────────────────────────── │
│ Tú: Hola!                       │
│ 🕒 14:30                        │
│ ───────────────────────────────────── │
│ User: Qué tal?                   │
│ 🕒 14:32                        │
│ ───────────────────────────────────── │
│ Tú: Todo bien                   │
│ 🕒 14:35                        │
│ ───────────────────────────────────── │
│ [📝 ESCRIBIR MENSAJE]          │
│ [📎 ADJUNTAR ARCHIVO]          │
│ [⚙️ CONFIGURACIÓN CHAT]         │
│ [🚫 BLOQUEAR USUARIO]           │
└─────────────────────────────────────────┘
```

**📱 PRIMER MENSAJE (SOLICITUD):**
```
📱 PRIMERA VEZ
┌─────────────────────────────────────────┐
│ 👤 username quiere enviarte mensajes │
│ ───────────────────────────────────── │
│ ¿Permitir que te escriba?          │
│ ───────────────────────────────────── │
│ [✅ ACEPTAR] [❌ RECHAZAR]      │
│ ───────────────────────────────────── │
│ ❌ RECHAZAR → BLOQUEAR USUARIO   │
│ ───────────────────────────────────── │
│ ✅ ACEPTAR → PODRÁN ESCRIBIR   │
└─────────────────────────────────────────┘
```

**📱 MENSAJES ESPECIALES:**
```
📱 MENSAJES ADMIN/QUIZ
┌─────────────────────────────────────────┐
│ 🏢 MENSAJE DE ADMIN             │
│ ───────────────────────────────────── │
│ Tu quiz "Geografía Mundial" ha sido   │
│ aprobado y publicado              │
│ ───────────────────────────────────── │
│ [📋 VER QUIZ] [✅ ENTENDIDO] │
│ ───────────────────────────────────── │
│ 🏆 MENSAJE DE QUIZ             │
│ ───────────────────────────────────── │
│ Tu quiz "Ciencia Básica" ha sido   │
│ rechazado por:                   │
│ • Preguntas muy difíciles         │
│ • Tiempo excesivo                │
│ ───────────────────────────────────── │
│ [📝 EDITAR QUIZ] [✅ ENTENDIDO] │
│ ───────────────────────────────────── │
│ (Solo visible durante 1 día)        │
└─────────────────────────────────────────┘
```

12. Settings Screen (/settings) - ⚙️
    ├──→ Account Settings (/account-settings)
    │   ├──→ Personal Information (/personal-info)
    │   │   ├──→ Update Name (/update-name)
    │   │   ├──→ Update Date of Birth (/update-dob)
    │   │   └──── Update Profile (/update-profile)
    │   ├──→ Security Settings (/security-settings)
    │   │   ├──→ Change Password (/change-password)
    │   │   └──── Password Confirmation (/password-confirm)
    │   └──── Bank Account Settings (/bank-account)
    │       ├──→ Update Bank Account (/update-bank-account)
    │       │   └──── Bank Confirmation Required (confirmación en cuenta bancaria nueva)
    │       ├──→ Verify Bank Account (/verify-bank-account)
    │       └──── Bank Account Status (/bank-account-status)
    │           └──── Note: App registra asociación cuenta-perfil, al cambiar cuenta y hacer primera transacción con nueva, se asume desvinculación de cuenta antigua
    ├──→ Notification Settings (/notification-settings)
    │   ├──→ View Notifications (/view-notifications)
    │   ├──→ Mark as Read (/mark-read/:notificationId)
    │   └──── Notification Details (/notification/:notificationId)
    ├──→ Language Settings (/language-settings)
    │   ├──→ Select Language (/select-language)
    │   └──── Available Languages (español, inglés, francés, alemán, italiano, portugués, etc.)
    ├──→ Help & Support (/help-support)
    │   ├──→ Centro de Ayuda (/help-center)
    │   │   ├──→ Buscador de ayuda (/help-search)
    │   │   │   ├──→ Buscar por palabras clave
    │   │   │   ├──→ Resultados en tiempo real según escribes
    │   │   │   ├──→ Resultados similares ordenados por relevancia
    │   │   │   └──── Filtrar por categoría
    │   │   ├──→ Artículos de ayuda (/help-articles)
    │   │   │   ├──→ Ver todos los artículos
    │   │   │   ├──→ Ver artículo detallado (/help-article/:id)
    │   │   │   ├──→ Votar si fue útil (útil/no útil)
    │   │   │   └──── Ver artículos por categoría
    │   │   └──── Categorías de ayuda (/help-categories)
    │   ├──→ FAQ (/faq)
    │   │   ├──→ Preguntas frecuentes sobre cuenta y registro
    │   │   ├──→ Preguntas frecuentes sobre quizzes y juego
    │   │   ├──→ Preguntas frecuentes sobre pagos y retiros
    │   │   ├──→ Preguntas frecuentes sobre creación de quizzes
    │   │   ├──→ Preguntas frecuentes sobre premios y ganancias
    │   │   ├──→ Preguntas frecuentes sobre seguridad y privacidad
    │   │   ├──→ Preguntas frecuentes sobre problemas técnicos
    │   │   └──── Guías paso a paso para resolver problemas comunes
    │   └──── Support Tickets (/support-tickets)
    │       ├──→ Create Ticket (/create-ticket)
    │       │   ├──→ Select Category (cuenta, pagos, quizzes, técnicos, otros)
    │       │   ├──→ Write Subject
    │       │   ├──→ Write Description
    │       │   ├──→ Attach Screenshots (opcional)
    │       │   └──── Submit Ticket
    │       ├──→ My Tickets (/my-tickets)
    │       │   ├──→ View Ticket List (abiertos, en progreso, cerrados)
    │       │   ├──→ View Ticket Details (/ticket/:ticketId)
    │       │   │   ├──→ View Messages
    │       │   │   ├──→ Send Message
    │       │   │   └──── Close Ticket
    │       │   └──── Create New Ticket
    │       └──── Contact Support (/contact-support)
    │
    │   **RESTRICCIONES:**
    │   - Solo disponible durante las primeras 2 semanas después de crear cuenta
    │   - Después de 2 semanas, se bloquea hasta tener 10 quizzes jugados
    │   - Al tener 10 quizzes jugados, se desbloquea permanentemente
    │   - Mensaje informativo cuando está bloqueado
    ├──→ Blocked Users (/blocked-users)
    │   ├──→ View Blocked Users (/view-blocked-users)
    │   └──── Unblock User (/unblock/:userId)
    ├──→ Legal (/legal)
    │   ├──→ Terms of Service (/terms-of-service)
    │   └──── Privacy Policy (/privacy-policy)
    └──── Logout (/logout-confirmation)
```

### **🎯 MÓDULO QUIZZES - ACCESIBLE DESDE BOTTOM BAR**
```
📱 QUIZ FLOW (Desde Home, Buscador o Creator)
└──→ Quiz List (/quizzes)
    ├──→ Quiz Details (/quiz/:id)
    │   ├──→ Play Quiz (/quiz-play/:id)
    │   ├──→ Share Quiz (/share-quiz/:id)
    │   ├──→ Report Quiz (/report-quiz/:id)
    │   └──→ Back to List (/quizzes)
    ├──→ Quiz Preview (/quiz-preview/:id)
    ├──→ Quiz Play (/quiz-play/:id)
    │   ├──→ Question Screen (/question/:questionId)
    │   ├──→ Results Screen (/quiz-results/:id)
    │   └──→ Exit Confirmation (/exit-quiz)
    ├──→ Quiz Results (/quiz-results/:id)
    │   ├──→ Share Results (/share-results)
    │   ├──→ Play Again (/quiz-play/:id)
    │   ├──→ Review Answers (/review-answers/:id)
    │   └──→ Home (/home)
    └──→ Create Quiz (/create-quiz) [También accesible desde Creator]
        ├──→ Add Questions (/add-questions)
        ├──→ Quiz Settings (/quiz-settings)
        ├──→ Quiz Preview (/quiz-preview)
        └──→ Publish Quiz (/publish-quiz)
```

---

