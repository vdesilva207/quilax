# Quilax - Documentación Completa

## 1. Concepto general

Quilax es una plataforma de quizzes online competitivos, donde los usuarios participan en concursos en tiempo real usando créditos que representan dinero real dentro de la app. Cada usuario tiene un saldo de créditos, que puede comprar con dinero real, y con esos créditos puede entrar en quizzes.

- Cada quiz tiene múltiples ganadores, **TOP** (o un rango de ganadores configurables).
- El administrador decide cómo se distribuyen los premios con total libertad, incluyendo un porcentaje para **ADMIN (creador de la app)** y para el **QuizCreator**.
- Cada quiz tiene un coste fijo de entrada: **1 crédito por jugador**, que se destina íntegramente a la **prize pool**.
- Los usuarios pueden ver notas y tips del creador y del admin antes de empezar el quiz.
- Información visible: tipo de contenidos, nivel de dificultad, número de preguntas.

---

## 2. Usuarios y roles

### 2.1 Roles
- **USER**: Puede participar en quizzes, comprar créditos y ver rankings.
- **CREATOR**: Puede definir preguntas, tips, niveles de dificultad, notas, y gestionar sus quizzes. Debe haber jugado un número mínimo de quizzes antes de crear nuevos.
- **ADMIN**: Control total del sistema, puede aprobar quizzes, decidir porcentajes de premio, controlar pagos y paneles internos.

### 2.2 Datos de usuario
Cada usuario tiene:
- id, email, password
- role (USER, CREATOR, ADMIN)
- credits (dinero real convertido a créditos)
- transactions (historial de movimientos: compra de créditos, entrada a quiz, premios recibidos, retiros)
- quizScores, quizAnswers (participación en quizzes)
- Validaciones para menores de 18 años: foto del tutor y vídeo de confirmación.
- Autenticación bancaria real para transacciones de dinero.

---

## 3. Créditos y transacciones

### 3.1 Créditos
- Cada quiz cuesta **1 crédito** por jugador.
- El crédito **no se devuelve**; se destina a la **prize pool**.
- Los créditos se compran con dinero real.
- Premios convertidos a dinero real al retirarlos.

### 3.2 Transacciones
Todas las operaciones monetarias se registran en `Transaction`:
- **QUIZ_ENTRY**: Entrada a un quiz, resta créditos del usuario.
- **PRIZE_PAYOUT**: Pago de premios a ganadores.
- **WITHDRAW**: Retiro a cuenta bancaria.
- **BANK_TO_CREDITS**: Transformación de dinero real a créditos.

---

## 4. Quizzes

### 4.1 Estructura
- **Quiz**: title, description, entryCost, questions, tips, level, contentDescription, notes.
- **QuizRun**: ejecución en tiempo real con fases:
  - PRE_START, QUESTION_READ, QUESTION_ANSWER, QUESTION_CORRECTION, QUESTION_RANKING, FINISHED.
  - `phaseEndsAt` y `currentIndex`.
  - `totalPrizeCredits` para referencia interna (no visible a jugadores ni QuizCreator).
- **QuizParticipant**: relación de usuarios inscritos y créditos gastados.
- **QuizScore**: puntos acumulados en el quiz.
- **QuizAnswer**: registro de respuestas individuales.
- **QuizWinner**: lista de ganadores TOP, configurada manualmente por admin.

### 4.2 Fases de un QuizRun
1. **PRE_START**: 
   - Inscripción, ver tips y notas, aviso de conexión y llegada anticipada.
2. **QUESTION_READ**: 
   - Se muestra la pregunta a todos los jugadores. Duración decide QuizCreator.
3. **QUESTION_ANSWER**: 
   - Registro de respuestas y cálculo de puntos en tiempo real.
4. **QUESTION_CORRECTION**: 
   - Corrección automática, actualización de `QuizScore`.
5. **QUESTION_RANKING**: 
   - Visualización de ranking parcial.
6. **FINISHED**: 
   - Determinación de ganadores, pago de premios (`PRIZE_PAYOUT`), publicación de ranking final y notas.

---

## 5. Seguridad y controles
- Autenticación JWT, validando email y password.
- Middleware `requireRole` para rutas ADMIN o CREATOR.
- Transacciones seguras con `$transaction`.
- Prevención de hacks: créditos no reembolsables, no se revela premio final hasta terminar.

---

## 6. Notificaciones y sockets
- Socket.IO para notificaciones en tiempo real:
  - Actualización de ranking
  - Actualización de prize pool (referencia)
  - Nuevas preguntas y fases del quiz
  - Notificación de countdown antes del quiz
  - Un jugador se puede unir a un quiz hasta 1 minuto antes de que empiece, luego no.

---

## 7. Pagos y dinero real
- Créditos = dinero real (1 crédito ≈ 1 euro, ajustable).
- Entrada a quiz descuenta créditos.
- Premios distribuidos manualmente y controlados por admin.
- Usuarios pueden comprar créditos y retirar dinero.

---

## 8. Funcionalidades pendientes
1. Transferencias al terminar el quiz (premios reales).
2. Multilenguaje / internacionalización.
3. Mostrar premios en créditos antes de iniciar, no en porcentaje.
4. Añadir notas del quiz creator o administrador antes y después del quiz.
5. Tips, nivel y contenidos visibles antes de empezar.
6. Mensajes de advertencia sobre conexión y llegada anticipada.
7. Control anti-hacks avanzado.

---

## 9. Frontend
- **Página principal**: ranking TOP por temporada, HOTTEST QUIZZES.
- **Búsqueda**: por jugador o quiz, categorías de temas.
- **Perfil**: editar datos propios.
- **Balance**: historial de transacciones y operaciones monetarias.
- **Configuración**: ajustes y ayuda.

---

## 10. Reglas de premios y jackpot
- Porcentajes configurables por quiz (cantidad de TOP y rango configurable).
- Jackpot del 5% de cada quiz gestionado por admin.
- Admin y QuizCreator reciben un porcentaje del total.
- Premios visibles para jugadores como **cantidad de créditos**, no porcentaje.
- Admin y QuizCreator no ven el premio total de la prize pool antes de publicarlo.

---

## 11. Escalabilidad
- Soporta hasta 100 quizzes activos a la vez.
- Nuevo quiz cada minuto, duración máxima 10 minutos.
- Fechas de inicio ajustables si hay conflictos de horarios.

---

## 12. Flujo de uso
1. Usuario se registra y añade cuenta bancaria.
2. Compra créditos o transfiere desde su banco.
3. Se une a quizzes (1 crédito por quiz).
4. Contesta preguntas y acumula puntos.
5. Admin decide ganadores y porcentajes.
6. Premios se distribuyen y pueden retirarse a cuentas bancarias.
