import express from "express";
import { getSiteContent, getSiteContentMeta } from "../services/siteContentService.js";

const router = express.Router();

const TERMS_OF_SERVICE = `# Términos y condiciones de Quilax

## 1. Qué es este documento
Estos términos regulan el uso de Quilax: la aplicación móvil, la web de juego y la versión web de Gestión (Quilax Wallet), donde se gestionan depósitos, retiros y operaciones con dinero.
Al crear una cuenta, iniciar sesión o usar cualquier parte del servicio, aceptas estos términos y la Política de privacidad (Configuración → Privacidad).
Si no estás de acuerdo, no uses Quilax.
Última actualización: 29 de agosto de 2026.
El contacto con Quilax se realiza dentro de la app (Centro de ayuda y Soporte por tickets) o por email en quilax@appquilax.com.

## 2. Quién presta el servicio
Quilax (nombre comercial) es una plataforma de quizzes competitivos con premios en créditos.
Operado por **Cristina Ortiz Seidel**, persona física en régimen de autónoma/a.
- NIF: 28896321H
- Domicilio fiscal: C/Puentezuelas 51, 4º, 18002 Granada (Granada), España
- Email de contacto: quilax@appquilax.com
El canal principal de soporte es la app: Configuración → Centro de ayuda / Soporte (tickets).

## 3. Qué puedes hacer en Quilax
- Jugar quizzes en directo o programados.
- Inscribirte pagando la entrada en créditos.
- Crear quizzes propios (si cumples los requisitos) para que el equipo los revise y, si procede, los publique.
- Consultar rankings de temporada, mensajes, perfil social y centro de ayuda.
- Depositar y retirar valor monetario solo desde la web de Gestión (Wallet), no desde el chat ni desde el flujo de juego embebido.
Quilax no es un casino ni un juego de azar puro: el resultado depende de conocimiento, rapidez y acierto en las preguntas, según las reglas de cada partida.

## 4. Edad y quién puede usar la app
Debes tener al menos **18 años cumplidos** para registrarte y usar Quilax.
El registro exige fecha de nacimiento y rechaza menores. Además, el servidor bloquea depósitos, partidas con entrada de créditos y retiros si no eres mayor de edad.
No hay cuentas de menores ni flujo de tutor.
Debes tener capacidad legal para contratar en tu país de residencia. El servicio está pensado principalmente para usuarios en España / UE; el acceso desde otras jurisdicciones puede restringirse si la normativa lo exige.

## 5. Tu cuenta
- Debes registrarte con datos verdaderos (nombre, email, etc.).
- Eres responsable de la confidencialidad de tu contraseña y de cualquier código 2FA.
- No compartas tu cuenta ni permitas que terceros jueguen o retiren en tu nombre.
- Una persona física = una cuenta. Las multi-cuentas para abusar de premios, bonos o rankings están prohibidas.
- Podemos pedir verificación adicional (email, KYC, teléfono, etc.) antes de permitir depósitos, retiros o premios altos.
- Si detectamos fraude, abuso o riesgo de seguridad, podemos limitar, suspender o cerrar la cuenta.
Puedes solicitar el cierre o borrado de cuenta desde Configuración → Información personal (o por soporte), sin perjuicio de conservar datos anonimizados cuando la ley lo exija (facturación, fraude, reclamaciones).

## 6. Créditos: qué son
Los créditos son la unidad de valor dentro de Quilax.
Referencia habitual: 1 crédito ≈ 1 euro, salvo que se indique otra cosa de forma clara en la app o en Gestión.
Al comprar créditos con tarjeta, el importe cobrado puede incluir la comisión de procesamiento del proveedor de pagos (p. ej. Stripe); recibes los créditos indicados y el desglose se muestra en Gestión antes de pagar.
Los créditos sirven para:
- Pagar la entrada a quizzes.
- Recibir premios.
- Reflejar tu saldo disponible para jugar o retirar (según reglas de Wallet).
Los créditos no son un depósito bancario tradicional ni un valor negociable fuera de Quilax, salvo el derecho a solicitar retiro conforme a estos términos y a la normativa aplicable.

## 7. Cómo funciona un quiz (reglas de juego)
### Entrada
- Entrar a un quiz cuesta normalmente 1 crédito por jugador (salvo que el quiz indique otro precio publicado).
- El cobro se realiza al unirte / confirmar la inscripción.
- Salvo error técnico demostrado de Quilax, la entrada no se reembolsa una vez unido o iniciado el quiz.
### Antes de empezar
- Los quizzes solo son visibles y unibles cuando están aprobados / programados / publicados. Un quiz en borrador, pendiente de revisión o rechazado no está disponible para el público.
- Conviene permanecer en la pantalla del quiz con algo de margen antes del inicio para no perder el comienzo.
- Se recomienda conexión estable. Una desconexión total puede expulsarte de la partida.
### Durante la partida
- Las fases (lectura, respuesta, corrección, ranking) las controla el servidor.
- Debes responder dentro del tiempo indicado.
- No abandones la app ni esa partida si quieres seguir compitiendo: normalmente no podrás volver a unirte a la misma sesión.
- El ranking en vivo puede ser orientativo; el resultado oficial se fija al cerrar la partida.
### Al terminar
- Se calcula la clasificación final y el reparto de premios según las reglas del quiz.
- Si hubo un fallo técnico grave demostrado, Quilax podrá anular, repetir o ajustar la partida según el caso.

## 8. Premios, bote y reparto
Cada quiz tiene (o hereda) reglas de premio: posiciones ganadoras y porcentajes / importes.
Parte de lo asociado a la economía del quiz puede destinarse, según la configuración vigente, a:
- Premios de los jugadores (bote de ganadores).
- Comisión o parte de la plataforma.
- Parte del creador del quiz (si aplica).
- Contribuciones al jackpot / bolsa de temporada (si aplica en esa temporada).
El detalle concreto de porcentajes puede variar por temporada o por configuración administrativa; lo mostrado en la ficha del quiz y en el cierre de partida es la referencia del momento.
Quilax puede anular o retener premios si hay indicios de:
- Bots, automatización o trampas.
- Multi-cuenta o colusión.
- Uso de vulnerabilidades.
- Fallo grave del sistema que invalide el resultado.
- Incumplimiento de KYC cuando el premio lo requiera.

## 9. Temporadas, ranking y jackpot
Quilax organiza temporadas (duración típica: 45 días, salvo cambio comunicado).
Durante la temporada puedes acumular puntos / posición en el ranking según tu actividad y resultados.
Al cierre de temporada puede haber repartos adicionales (incluido jackpot de temporada) según las reglas publicadas para esa temporada.
Los criterios exactos de ranking y reparto de temporada se comunican en la app / panel de temporada. Si hay conflicto entre un mensaje promocional y las reglas técnicas de cierre, prevalecen las reglas de cierre aplicadas por el sistema y/o las publicadas para esa temporada.

## 10. Crear quizzes
Si cumples los requisitos (por ejemplo, haber participado en un número mínimo de quizzes), puedes crear contenido.
Todo quiz creado pasa por revisión del equipo. Hasta que esté aprobado:
- No aparece en el descubrimiento público.
- Nadie puede unirse.
Podemos rechazar quizzes por calidad, legalidad, derechos de terceros, seguridad o política de contenido.
Tras un rechazo (y, si el admin te escribe al aprobar, también tras esa aprobación con mensaje), puedes contactar al panel admin dentro de la ventana indicada (normalmente 72 horas) desde Mensajes → Panel Admin.
Eres responsable del contenido de tus preguntas (no copies ilegalmente, no publiques contenido ilícito, discriminatorio, engañoso o que infrinja derechos).

## 11. Depósitos (Gestión / Wallet)
- Los depósitos se realizan solo en la versión web de Gestión (Quilax Wallet).
- La app móvil no procesa tarjetas a propósito (seguridad).
- El procesador habitual es Stripe u otro proveedor equivalente.
- Al depositar aceptas también las condiciones del procesador de pagos.
- Los plazos de abono en saldo dependen del método y de las comprobaciones anti-fraude.

## 12. Retiros
- Los retiros se solicitan desde Gestión / Wallet hacia una cuenta bancaria asociada y verificada.
- La cuenta bancaria debe estar a tu nombre (titular coincidente con tu identidad en Quilax).
- Podemos exigir KYC completo, 2FA y revisión manual o automática anti-fraude antes de liberar fondos.
- Los retiros de importe elevado o con señales de riesgo quedan en revisión manual (PENDING_REVIEW) hasta que un administrador los apruebe o rechace.
- Los plazos bancarios son variables y no dependen solo de Quilax.
- Podemos retrasar, retener o rechazar un retiro si hay sospecha razonable de fraude, blanqueo, cargo indebido, disputa de pago, multi-cuenta o incumplimiento de estos términos.
- No hay “aprobación arbitraria” de retiros legítimos: el flujo está pensado para ser automático salvo riesgo o umbral de importe; la intervención humana sirve para proteger la plataforma y a los usuarios.

## 12 bis. Impuestos y obligaciones fiscales
- Eres el único responsable de declarar e ingresar los impuestos que te correspondan por los premios o ingresos obtenidos en Quilax (por ejemplo IRPF u otras obligaciones según tu residencia y situación).
- Quilax no practica retención fiscal automática sobre tus retiros salvo que una obligación legal o un asesor fiscal profesional determine lo contrario y se implemente de forma expresa.
- Puedes descargar un justificante de premios y retiros desde Gestión → Historial para tu banco o tu asesor.
- Este apartado no es asesoramiento fiscal. Consulta a un asesor / gestor antes de operar con importes relevantes.

## 13. Verificación de identidad (KYC) y prevención de fraude
Para operar con dinero podemos pedirte:
- Documento de identidad oficial.
- Selfie / prueba de vida.
- Datos bancarios coherentes con tu identidad.
- Información adicional en premios elevados o actividad inusual.
El uso de documentos de terceros, identidades falsas o datos manipulados está prohibido y puede implicar cierre de cuenta y retención de fondos cuando la ley lo permita.
Quilax puede aplicar medidas de prevención de blanqueo de capitales y financiación del terrorismo cuando resulte exigible.

## 14. Reembolsos, errores y chargebacks
- Entrada de quiz: no reembolsable salvo error técnico demostrado imputable a Quilax.
- Depósito duplicado o cobro erróneo: contacta soporte con el justificante; revisaremos caso a caso.
- Si abres una disputa / chargeback con tu banco o Stripe de forma abusiva o injustificada, podemos suspender la cuenta y compensar saldos pendientes.
- Premios ya abonados por error pueden revertirse si se demuestra el error o el fraude.

## 15. Notificaciones y avisos del juego
Quilax usa avisos dentro de la app y, cuando activas el permiso, notificaciones push del dispositivo.
Una vez inscrito en un quiz, los recordatorios de countdown se envían en estas marcas antes del inicio: 2 días, 1 día, 2 horas, 1 hora, 30 minutos, 10 minutos, 5 minutos y 1 minuto.
Es muy recomendable no desactivar los avisos de countdown de quizzes: sin ellos es fácil perder el inicio. Eso no genera, por sí solo, derecho a reembolso de la entrada.
Al pulsar un aviso de quiz se abre la ficha / pantalla de ese quiz.
Puedes gestionar preferencias en Configuración → Notificaciones (solo dentro de la app).

## 16. Normas de comunidad y contenido social
Quilax es una comunidad de juego competitivo. Debes tratar a los demás con respeto en perfiles, publicaciones, mensajes, quizzes y tickets de soporte.
Está prohibido, entre otras conductas:
- Acoso, amenazas, intimidación o doxxing.
- Discurso de odio, discriminación o contenido que incite a la violencia.
- Contenido sexual explícito, pornográfico o que involucre a menores (tolerancia cero).
- Contenido ilegal, spam, phishing, malware o engaños.
- Publicar datos personales de terceros sin consentimiento.
Puedes bloquear usuarios y reportar contenido. El equipo de moderación puede permitir, ocultar o borrar publicaciones y suspender cuentas.
El soporte se gestiona por centro de ayuda, FAQ y tickets. Los tiempos de respuesta no están garantizados 24/7.
Los avisos generales (a todos los usuarios) no se responden como chat privado, salvo que se indique un canal concreto.

## 16 bis. Suspensión de cuenta y recuperación de saldo
Podemos suspender o banear una cuenta de forma temporal o permanente por incumplimiento de estos términos o de las normas de comunidad.
Al intentar entrar en la app de juego verás el mensaje de suspensión que te indiquemos.
**Contenido inapropiado (publicaciones / comunidad):** si la suspensión es por contenido inapropiado en publicaciones u otras infracciones de las normas de comunidad, tienes derecho a **recuperar el saldo de créditos restante** iniciando sesión en la web de Gestión (Wallet) con tu email y contraseña, y solicitando el retiro hacia tu cuenta Stripe Connect ya vinculada. Mientras dure la suspensión no podrás jugar ni depositar.
**Actividad sospechosa (fraude, multi-cuenta, abuso económico, blanqueo, chargebacks abusivos, manipulación de premios, etc.):** si la suspensión es por actividad sospechosa o fraude, **no puedes recuperar el saldo**. El acceso a la app y a Gestión queda bloqueado y los fondos pueden retenerse cuando la ley lo permita.
La categoría de la suspensión (contenido vs actividad sospechosa) la determina el equipo de moderación / administración según los hechos.

## 17. Conducta prohibida
Entre otras, está prohibido:
- Hacer trampas, usar bots, scripts o ayuda automatizada.
- Manipular resultados o coludir con otros jugadores.
- Crear o usar varias cuentas para beneficio indebido.
- Atacar, escanear o vulnerar la seguridad de Quilax.
- Usar la plataforma para actividades ilícitas o blanqueo.
- Publicar o distribuir malware, phishing o engaños.
- Infringir propiedad intelectual de terceros en quizzes o perfiles.
El incumplimiento puede conllevar advertencia, pérdida de premios, suspensión temporal o cierre definitivo.

## 18. Propiedad intelectual
El software, marca, diseño y bases de datos de Quilax están propiedad de Quilax o de sus licenciantes.
Tú conservas los derechos sobre el contenido original que creas (p. ej. preguntas), pero nos concedes licencia no exclusiva para alojarlo, mostrarlo, moderarlo y operarlo dentro del servicio.
Si un tercero reclama derechos sobre tu contenido, podemos retirarlo y pedirte acreditación.

## 19. Disponibilidad y cambios del servicio
Nos esforzamos por mantener Quilax disponible, pero no garantizamos un servicio ininterrumpido, libre de errores o de mantenimientos.
Podemos modificar funciones, porcentajes de temporada, interfaces o reglas técnicas con aviso razonable cuando el cambio sea relevante.
Podemos retirar quizzes, funciones beta o contenidos que generen riesgo legal o técnico.

## 20. Limitación de responsabilidad
En la medida permitida por la ley aplicable:
- Quilax no responde de daños indirectos, lucro cesante, pérdida de oportunidad de premio por desconexión del usuario, o fallos de terceros (operadores de red, bancos, Stripe, tiendas de apps).
- No respondemos del uso indebido de tu cuenta si no proteges tus credenciales.
- Nada en estos términos limita derechos imperativos de consumidores que no puedan excluirse por contrato.
Si resultara responsabilidad directa demostrada por fallo grave nuestro, el alcance se limitará, cuando la ley lo permita, al importe de la operación afectada (p. ej. la entrada del quiz o el depósito concreto).

## 21. Cookies y tecnologías similares
En entornos web podemos usar cookies o almacenamiento local necesarios para sesión, seguridad y preferencias.
En la app móvil usamos almacenamiento local (p. ej. token de sesión, preferencias) para el funcionamiento.
Puedes gestionar cookies del navegador en tu dispositivo; desactivar las esenciales puede impedir el login o el pago en Wallet.

## 22. Juego responsable
Quilax es entretenimiento competitivo con dinero real.
Establece límites personales de gasto y tiempo. Si sientes que el uso deja de ser saludable, deja de depositar y contacta soporte.
No fomentamos el juego compulsivo. Podemos aplicar límites o revisiones adicionales ante patrones de riesgo.

## 23. Suspensión, cancelación y consecuencias
Podemos suspender o cancelar el acceso si incumples estos términos o si lo exige la seguridad / la ley.
El derecho a recuperar el saldo restante vía Gestión aplica solo en suspensiones por **contenido inapropiado**, conforme a la sección 16 bis. En suspensiones por **actividad sospechosa** no hay recuperación de saldo.
Tras el cierre, podremos liquidar saldo legítimo pendiente de retiro sujeto a verificaciones (cuando corresponda), o retener fondos cuando haya disputa, fraude o obligación legal.
Los contenidos y datos se tratarán según la Política de privacidad.

## 24. Modificación de estos términos
Podemos actualizar este documento. Los cambios relevantes se comunicarán en la app o por email cuando sea razonable.
El uso continuado tras la entrada en vigor implica aceptación de la versión actualizada, salvo que la ley exija un consentimiento específico.

## 25. Ley aplicable y reclamaciones
Estos términos se rigen por la legislación española.
Para consumidores de la UE, también aplican los derechos imperativos de tu país de residencia habitual cuando corresponda.
Reclamaciones y privacidad: solo a través de la app (Soporte por tickets / Centro de ayuda). También puedes acudir a la Agencia Española de Protección de Datos (AEPD) si procede.

## 26. Contacto
- Configuración → Centro de ayuda
- Configuración → FAQ
- Configuración → Soporte (tickets)
- Email: quilax@appquilax.com
`;

const PRIVACY_POLICY = `# Política de privacidad de Quilax

## 1. Responsable del tratamiento
**Responsable:** Cristina Ortiz Seidel (persona física, autónoma/a), operadora de Quilax (nombre comercial).
- Identidad: Cristina Ortiz Seidel
- NIF: 28896321H
- Domicilio fiscal: C/Puentezuelas 51, 4º, 18002 Granada (Granada), España
- Email: quilax@appquilax.com
- Contacto en la app: Configuración → Soporte / tickets

## 2. Datos que tratamos
- Identidad y contacto: nombre, email, usuario, idioma, zona horaria.
- Cuenta y seguridad: contraseñas cifradas/hasheadas, 2FA, eventos de acceso.
- Datos de juego: inscripciones, respuestas, puntuaciones, rankings, historial de partidas.
- Contenido que publicas: quizzes, posts, mensajes, tickets de soporte.
- KYC: documento de identidad, selfie / prueba de vida, resultado de revisión (incl. Stripe Identity cuando aplique).
- Pagos y retiros: importes, estados, identificadores de Stripe; datos bancarios necesarios para retirar (vía Stripe Connect).
- Datos técnicos: dispositivo, logs de error, IP y señales anti-fraude en la medida necesaria.
- Preferencias: idioma y ajustes que guardes en la app.

## 3. Finalidades
- Crear y gestionar tu cuenta.
- Operar quizzes, rankings, temporadas y premios.
- Procesar depósitos, entradas y retiros.
- Prevenir fraude, abuso, multi-cuenta y, cuando aplique, blanqueo de capitales.
- Atender soporte y reclamaciones.
- Enviar avisos del servicio (p. ej. recordatorios de quiz, mensajes del panel, avisos de seguridad).
- Cumplir obligaciones legales y defendernos ante reclamaciones.
- Mejorar estabilidad y experiencia del producto (de forma agregada o pseudonimizada cuando sea posible).

## 4. Bases legales (RGPD)
- Ejecución del contrato (prestar Quilax).
- Interés legítimo (seguridad, anti-fraude, mejora del servicio).
- Obligación legal (conservación fiscal/contable, requerimientos de autoridad).
- Consentimiento, cuando lo pidamos de forma específica (p. ej. ciertas comunicaciones no esenciales).

## 5. Con quién compartimos datos
No vendemos tus datos personales.
Podemos compartirlos con:
- Proveedores de pago (p. ej. Stripe).
- Hosting, bases de datos, email transaccional e infraestructura técnica.
- Herramientas de verificación de identidad si se usan proveedores externos.
- Autoridades competentes cuando la ley lo exija.
Todos los encargados deben tratar los datos bajo instrucciones y con medidas de seguridad adecuadas.

## 6. Transferencias internacionales
Si algún proveedor trata datos fuera del EEE, aplicaremos garantías adecuadas (p. ej. cláusulas contractuales tipo) cuando sea necesario.

## 7. Conservación y borrado de cuenta
Puedes eliminar tu cuenta desde Configuración → Información personal.
Al eliminar la cuenta:
- Borramos o anonimizamos datos personales identificativos (nombre, email, foto, bio, documento, selfie, datos bancarios, 2FA).
- Tus publicaciones visibles se ocultan/eliminan del feed.
- Podemos conservar, sin asociarlos a tu identidad, registros de partidas, pagos y retiros durante los plazos legales de facturación, prevención de fraude y reclamaciones.
Si solicitas acceso o portabilidad, usa Configuración → Información personal → Exportar mis datos, o un ticket de soporte.

## 8. Tus derechos
Puedes ejercer acceso, rectificación, borrado, oposición, limitación y portabilidad desde la app (exportación de datos y borrado de cuenta) o abriendo un ticket de soporte (Configuración → Soporte).
También puedes reclamar ante la AEPD (www.aepd.es).

## 9. Seguridad
Cifrado en tránsito (HTTPS), controles de acceso, revisión de operaciones sensibles y 2FA en flujos de Gestión (depósito/retiro) si lo activas.
Ningún sistema es 100 % seguro; te pedimos proteger tu dispositivo y credenciales.

## 10. Menores
Quilax es solo para mayores de 18 años. El registro exige fecha de nacimiento y rechaza menores. Depósitos, partidas con entrada y retiros también comprueban la mayoría de edad en el servidor.

## 11. Decisiones automatizadas
Podemos usar reglas automáticas anti-fraude y verificación de identidad automatizada (p. ej. Stripe Identity). Cuando una decisión automatizada te afecte de forma significativa, puedes solicitar revisión humana vía soporte.

## 12. Cookies y almacenamiento local
En web: cookies/almacenamiento necesarios de sesión y seguridad.
En app: almacenamiento local para sesión y preferencias.
Puedes gestionar cookies no esenciales en tu navegador.

## 13. Cambios
Podemos actualizar esta política. Te avisaremos de cambios relevantes en la app o por email.

## 14. Contacto
Dentro de la app: Configuración → Centro de ayuda / Soporte (tickets).
Email: quilax@appquilax.com
`;

router.get("/terms-of-service", async (req, res) => {
  try {
    const content = await getSiteContent("legal.terms", TERMS_OF_SERVICE);
    const meta = await getSiteContentMeta("legal.terms");
    res.json({
      success: true,
      updatedAt: meta?.updatedAt?.toISOString?.()?.slice(0, 10) || "2026-08-29",
      content,
    });
  } catch (error) {
    console.error("Error getting terms of service:", error);
    res.status(500).json({ error: "Error al obtener términos de servicio" });
  }
});

router.get("/privacy-policy", async (req, res) => {
  try {
    const content = await getSiteContent("legal.privacy", PRIVACY_POLICY);
    const meta = await getSiteContentMeta("legal.privacy");
    res.json({
      success: true,
      updatedAt: meta?.updatedAt?.toISOString?.()?.slice(0, 10) || "2026-08-29",
      content,
    });
  } catch (error) {
    console.error("Error getting privacy policy:", error);
    res.status(500).json({ error: "Error al obtener política de privacidad" });
  }
});

export default router;
