import express from "express";

const router = express.Router();

// Terms of Service
router.get("/terms-of-service", async (req, res) => {
  try {
    const termsOfService = `
# Términos de Servicio

## 1. Aceptación de los Términos
Al descargar y utilizar la aplicación Quilax, aceptas estos términos de servicio y nuestra política de privacidad. Si no estás de acuerdo con estos términos, no debes utilizar nuestra aplicación.

## 2. Descripción del Servicio
Quilax es una aplicación de quizzes que permite a los usuarios crear, jugar y compartir quizzes sobre diversos temas. Los usuarios pueden ganar premios basados en su rendimiento en los quizzes.

## 3. Requisitos de Edad
Debes tener al menos 18 años para utilizar esta aplicación y participar en actividades que involucren dinero real. Los menores de 18 años pueden utilizar la aplicación con supervisión parental pero no pueden participar en actividades monetarias.

## 4. Cuenta de Usuario
- Debes proporcionar información verídica y actualizada al crear tu cuenta
- Eres responsable de mantener la confidencialidad de tu contraseña
- No puedes compartir tu cuenta con otras personas
- Nos reservamos el derecho de suspender o cerrar cuentas que violen estos términos

## 5. Creación de Quizzes
- Para crear quizzes, debes haber jugado al menos 10 quizzes
- Los quizzes deben cumplir con nuestras directrices de contenido
- Nos reservamos el derecho de aprobar, rechazar o eliminar cualquier quiz
- El contenido que viola las leyes o derechos de terceros será eliminado

## 6. Pagos y Retiros
- Todos los pagos se procesan a través de Stripe
- Los retiros se procesan automáticamente a tu cuenta bancaria verificada
- Los tiempos de procesamiento pueden variar según tu banco
- Nos reservamos el derecho de investigar transacciones sospechosas

## 7. Conducta del Usuario
No puedes:
- Utilizar la aplicación para actividades ilegales
- Acosar, intimidar o abusar de otros usuarios
- Publicar contenido ofensivo, discriminatorio o inapropiado
- Intentar hackear o comprometer la seguridad de la aplicación
- Crear múltiples cuentas para abusar del sistema

## 8. Propiedad Intelectual
Todo el contenido de la aplicación, incluyendo但不限于 texto, gráficos, logotipos, y software, es propiedad de Quilax y está protegido por leyes de propiedad intelectual.

## 9. Limitación de Responsabilidad
Quilax no se hace responsable por:
- Pérdidas directas o indirectas derivadas del uso de la aplicación
- Interrupciones del servicio
- Acciones de terceros
- Errores técnicos

## 10. Modificaciones
Nos reservamos el derecho de modificar estos términos en cualquier momento. Los usuarios serán notificados de cambios importantes.

## 11. Terminación
Podemos terminar tu acceso a la aplicación en cualquier momento si violas estos términos.

## 12. Ley Aplicable
Estos términos se rigen por las leyes de España. Cualquier disputa se resolverá en los tribunales de España.

## 13. Contacto
Para cualquier pregunta sobre estos términos, contáctanos en support@quilax.com
`;

    res.json({
      success: true,
      content: termsOfService
    });
  } catch (error) {
    console.error("Error getting terms of service:", error);
    res.status(500).json({ error: "Error al obtener términos de servicio" });
  }
});

// Privacy Policy
router.get("/privacy-policy", async (req, res) => {
  try {
    const privacyPolicy = `
# Política de Privacidad

## 1. Información que Recopilamos
Recopilamos la siguiente información personal:
- Nombre y dirección de email
- Fecha de nacimiento
- Información bancaria (para procesar pagos)
- Datos de uso de la aplicación
- Información de ubicación (opcional)

## 2. Cómo Utilizamos tu Información
Utilizamos tu información para:
- Proporcionar y mejorar nuestros servicios
- Procesar pagos y retiros
- Comunicarnos contigo sobre actualizaciones
- Prevenir fraudes y abusos
- Cumplir con obligaciones legales

## 3. Compartición de Información
No compartimos tu información personal con terceros excepto:
- Con proveedores de servicios necesarios (Stripe, etc.)
- Cuando sea requerido por ley
- Para proteger nuestros derechos y propiedad
- Con tu consentimiento explícito

## 4. Seguridad de Datos
Implementamos medidas de seguridad de nivel bancario:
- Encriptación de datos en tránsito y en reposo
- Autenticación de dos factores
- Monitoreo continuo de seguridad
- Auditorías de seguridad regulares

## 5. Tus Derechos
Tienes derecho a:
- Acceder a tus datos personales
- Corregir información inexacta
- Eliminar tu cuenta y datos
- Oponerte al procesamiento de tus datos
- Solicitar una copia de tus datos

## 6. Cookies
Utilizamos cookies para:
- Mejorar la experiencia del usuario
- Analizar el uso de la aplicación
- Personalizar contenido
Puedes gestionar tus preferencias de cookies en la configuración de la aplicación.

## 7. Retención de Datos
Conservamos tus datos personales mientras sea necesario para:
- Proporcionar nuestros servicios
- Cumplir con obligaciones legales
- Resolver disputas
- Prevenir fraudes

## 8. Menores
No recopilamos información de menores de 18 años sin consentimiento parental. Los datos de menores se procesan de acuerdo con la legislación aplicable.

## 9. Cambios a esta Política
Actualizaremos esta política periódicamente. Te notificaremos de cambios importantes.

## 10. Contacto
Para preguntas sobre privacidad, contáctanos en privacy@quilax.com
`;

    res.json({
      success: true,
      content: privacyPolicy
    });
  } catch (error) {
    console.error("Error getting privacy policy:", error);
    res.status(500).json({ error: "Error al obtener política de privacidad" });
  }
});

export default router;
