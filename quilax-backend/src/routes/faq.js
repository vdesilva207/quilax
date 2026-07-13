import express from "express";
import prisma from "../lib/prisma.js";

const router = express.Router();

// Obtener todas las FAQs
router.get("/", async (req, res) => {
  try {
    const category = req.query.category;

    const faqs = [
      {
        id: 1,
        category: "cuenta",
        question: "¿Cómo creo una cuenta?",
        answer: "Para crear una cuenta, descarga la app y haz clic en 'Registrarse'. Completa el formulario con tu email, contraseña y datos personales. Luego verifica tu email siguiendo las instrucciones que te enviaremos.",
        order: 1
      },
      {
        id: 2,
        category: "cuenta",
        question: "¿Cómo verifico mi email?",
        answer: "Después de registrarte, recibirás un email con un enlace de verificación. Haz clic en el enlace para verificar tu cuenta. Si no recibes el email, revisa tu carpeta de spam.",
        order: 2
      },
      {
        id: 3,
        category: "cuenta",
        question: "¿Olvidé mi contraseña, qué hago?",
        answer: "En la pantalla de login, haz clic en '¿Olvidaste tu contraseña?'. Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.",
        order: 3
      },
      {
        id: 4,
        category: "quizzes",
        question: "¿Cómo juego un quiz?",
        answer: "Busca un quiz en la sección de Home o Buscador. Haz clic en el quiz para ver los detalles y luego en 'UNIRSE'. Responde todas las preguntas dentro del tiempo límite para ganar premios.",
        order: 1
      },
      {
        id: 5,
        category: "quizzes",
        question: "¿Cómo creo mi propio quiz?",
        answer: "Para crear un quiz, debes haber jugado al menos 10 quizzes. Luego ve a la sección Creator y haz clic en 'Create Quiz'. Añade preguntas, configura los ajustes y publícalo para que otros puedan jugarlo.",
        order: 2
      },
      {
        id: 6,
        category: "quizzes",
        question: "¿Cómo gano premios?",
        answer: "Los premios se basan en tu puntuación final y en el número de participantes. Cuanto mejor juegues y más gente participe, mayores serán tus premios.",
        order: 3
      },
      {
        id: 7,
        category: "pagos",
        question: "¿Cómo añado fondos a mi cuenta?",
        answer: "Ve a la sección Gestiones y haz clic en 'Añadir Fondos'. Selecciona la cantidad y el método de pago. Confirma el pago y los créditos se añadirán a tu cuenta.",
        order: 1
      },
      {
        id: 8,
        category: "pagos",
        question: "¿Cómo retiro mis ganancias?",
        answer: "Ve a la sección Gestiones y haz clic en 'Retirar'. Ingresa la cantidad que deseas retirar y confirma. Los fondos se transferirán a tu cuenta bancaria asociada.",
        order: 2
      },
      {
        id: 9,
        category: "pagos",
        question: "¿Cuánto tarda un retiro?",
        answer: "Los retiros se procesan automáticamente. El tiempo de llegada a tu cuenta bancaria depende de tu banco, pero generalmente tarda entre 1-3 días hábiles.",
        order: 3
      },
      {
        id: 10,
        category: "seguridad",
        question: "¿Mis datos están seguros?",
        answer: "Sí, utilizamos encriptación de nivel bancario para proteger todos tus datos personales y financieros. Nunca compartimos tu información con terceros sin tu consentimiento.",
        order: 1
      },
      {
        id: 11,
        category: "seguridad",
        question: "¿Cómo cambio mi contraseña?",
        answer: "Ve a Settings > Account Settings > Change Password. Ingresa tu contraseña actual y la nueva. Haz clic en 'Guardar' para actualizarla.",
        order: 2
      },
      {
        id: 12,
        category: "tecnicos",
        question: "La app no funciona, qué hago?",
        answer: "Primero, cierra y vuelve a abrir la app. Si el problema persiste, verifica tu conexión a internet. Si aún así no funciona, contacta a nuestro equipo de soporte.",
        order: 1
      },
      {
        id: 13,
        category: "tecnicos",
        question: "¿Cómo contacto al soporte?",
        answer: "Ve a Settings > Help & Support > Support Tickets. Crea un ticket nuevo con tu problema y nuestro equipo te responderá lo antes posible.",
        order: 2
      }
    ];

    if (category) {
      const filteredFaqs = faqs.filter(faq => faq.category === category);
      res.json({
        success: true,
        faqs: filteredFaqs
      });
    } else {
      res.json({
        success: true,
        faqs
      });
    }
  } catch (error) {
    console.error("Error getting FAQs:", error);
    res.status(500).json({ error: "Error al obtener FAQs" });
  }
});

// Obtener FAQ por ID
router.get("/:id", async (req, res) => {
  try {
    const faqId = parseInt(req.params.id);

    const faqs = [
      {
        id: 1,
        category: "cuenta",
        question: "¿Cómo creo una cuenta?",
        answer: "Para crear una cuenta, descarga la app y haz clic en 'Registrarse'. Completa el formulario con tu email, contraseña y datos personales. Luego verifica tu email siguiendo las instrucciones que te enviaremos.",
        order: 1
      },
      {
        id: 2,
        category: "cuenta",
        question: "¿Cómo verifico mi email?",
        answer: "Después de registrarte, recibirás un email con un enlace de verificación. Haz clic en el enlace para verificar tu cuenta. Si no recibes el email, revisa tu carpeta de spam.",
        order: 2
      },
      {
        id: 3,
        category: "cuenta",
        question: "¿Olvidé mi contraseña, qué hago?",
        answer: "En la pantalla de login, haz clic en '¿Olvidaste tu contraseña?'. Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.",
        order: 3
      },
      {
        id: 4,
        category: "quizzes",
        question: "¿Cómo juego un quiz?",
        answer: "Busca un quiz en la sección de Home o Buscador. Haz clic en el quiz para ver los detalles y luego en 'UNIRSE'. Responde todas las preguntas dentro del tiempo límite para ganar premios.",
        order: 1
      },
      {
        id: 5,
        category: "quizzes",
        question: "¿Cómo creo mi propio quiz?",
        answer: "Para crear un quiz, debes haber jugado al menos 10 quizzes. Luego ve a la sección Creator y haz clic en 'Create Quiz'. Añade preguntas, configura los ajustes y publícalo para que otros puedan jugarlo.",
        order: 2
      },
      {
        id: 6,
        category: "quizzes",
        question: "¿Cómo gano premios?",
        answer: "Los premios se basan en tu puntuación final y en el número de participantes. Cuanto mejor juegues y más gente participe, mayores serán tus premios.",
        order: 3
      },
      {
        id: 7,
        category: "pagos",
        question: "¿Cómo añado fondos a mi cuenta?",
        answer: "Ve a la sección Gestiones y haz clic en 'Añadir Fondos'. Selecciona la cantidad y el método de pago. Confirma el pago y los créditos se añadirán a tu cuenta.",
        order: 1
      },
      {
        id: 8,
        category: "pagos",
        question: "¿Cómo retiro mis ganancias?",
        answer: "Ve a la sección Gestiones y haz clic en 'Retirar'. Ingresa la cantidad que deseas retirar y confirma. Los fondos se transferirán a tu cuenta bancaria asociada.",
        order: 2
      },
      {
        id: 9,
        category: "pagos",
        question: "¿Cuánto tarda un retiro?",
        answer: "Los retiros se procesan automáticamente. El tiempo de llegada a tu cuenta bancaria depende de tu banco, pero generalmente tarda entre 1-3 días hábiles.",
        order: 3
      },
      {
        id: 10,
        category: "seguridad",
        question: "¿Mis datos están seguros?",
        answer: "Sí, utilizamos encriptación de nivel bancario para proteger todos tus datos personales y financieros. Nunca compartimos tu información con terceros sin tu consentimiento.",
        order: 1
      },
      {
        id: 11,
        category: "seguridad",
        question: "¿Cómo cambio mi contraseña?",
        answer: "Ve a Settings > Account Settings > Change Password. Ingresa tu contraseña actual y la nueva. Haz clic en 'Guardar' para actualizarla.",
        order: 2
      },
      {
        id: 12,
        category: "tecnicos",
        question: "La app no funciona, qué hago?",
        answer: "Primero, cierra y vuelve a abrir la app. Si el problema persiste, verifica tu conexión a internet. Si aún así no funciona, contacta a nuestro equipo de soporte.",
        order: 1
      },
      {
        id: 13,
        category: "tecnicos",
        question: "¿Cómo contacto al soporte?",
        answer: "Ve a Settings > Help & Support > Support Tickets. Crea un ticket nuevo con tu problema y nuestro equipo te responderá lo antes posible.",
        order: 2
      }
    ];

    const faq = faqs.find(f => f.id === faqId);

    if (!faq) {
      return res.status(404).json({ error: "FAQ no encontrada" });
    }

    res.json({
      success: true,
      faq
    });
  } catch (error) {
    console.error("Error getting FAQ:", error);
    res.status(500).json({ error: "Error al obtener FAQ" });
  }
});

// Obtener categorías de FAQ
router.get("/categories/list", async (req, res) => {
  try {
    const categories = [
      { id: "cuenta", name: "Cuenta y Registro", description: "Preguntas sobre creación de cuenta, verificación y acceso" },
      { id: "quizzes", name: "Quizzes y Juego", description: "Preguntas sobre cómo jugar y crear quizzes" },
      { id: "pagos", name: "Pagos y Retiros", description: "Preguntas sobre añadir fondos y retirar ganancias" },
      { id: "seguridad", name: "Seguridad y Privacidad", description: "Preguntas sobre protección de datos y seguridad" },
      { id: "tecnicos", name: "Problemas Técnicos", description: "Preguntas sobre problemas técnicos y soporte" }
    ];

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error("Error getting FAQ categories:", error);
    res.status(500).json({ error: "Error al obtener categorías de FAQ" });
  }
});

export default router;
