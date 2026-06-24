import express from "express";
import { auth, roleMiddleware } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";
import { getIO } from "../socket.js";
import { findSimilarTickets, findSimilarHelpArticles } from "../services/ticketSimilarityService.js";

const router = express.Router();

// Verificar si el usuario puede crear tickets (restricción de 2 semanas o 10 quizzes)
async function canCreateTicket(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true }
  });

  if (!user) return false;

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  // Si la cuenta tiene menos de 2 semanas, puede crear tickets
  if (user.createdAt > twoWeeksAgo) {
    return { canCreate: true, reason: null };
  }

  // Si tiene más de 2 semanas, verificar si tiene 10 quizzes jugados
  const quizzesPlayed = await prisma.quizParticipant.count({
    where: { userId }
  });

  if (quizzesPlayed >= 10) {
    return { canCreate: true, reason: null };
  }

  return { 
    canCreate: false, 
    reason: "Solo puedes crear tickets durante las primeras 2 semanas después de registrarte, o después de haber jugado 10 quizzes." 
  };
}

// Crear ticket
router.post("/tickets", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { category, subject, description, priority } = req.body;

    // Verificar restricciones
    const { canCreate, reason } = await canCreateTicket(userId);
    if (!canCreate) {
      return res.status(403).json({ error: reason });
    }

    if (!category || !subject || !description) {
      return res.status(400).json({ error: "category, subject y description son requeridos" });
    }

    const validCategories = ["ACCOUNT", "PAYMENTS", "QUIZZES", "TECHNICAL", "OTHER"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Categoría inválida" });
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: "Prioridad inválida" });
    }

    // Verificar si ya existe respuesta similar en ayuda
    const similarArticles = await findSimilarHelpArticles(subject);
    if (similarArticles.length > 0) {
      return res.json({
        success: true,
        similarArticles: similarArticles.slice(0, 3), // Devolver los 3 más similares
        message: "Esta pregunta ya tiene respuestas similares en la sección de ayuda. Revisa los artículos antes de crear un ticket."
      });
    }

    // Buscar tickets similares para agrupar
    const similarTickets = await findSimilarTickets(subject, description);

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        category,
        subject,
        description,
        priority: priority || "MEDIUM"
      }
    });

    // Notificar a todos los admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "ADMIN_WORKER"] } }
    });

    const io = getIO();
    admins.forEach(admin => {
      io.to(`user:${admin.id}`).emit("support:ticket-created", {
        ticketId: ticket.id,
        userId,
        subject,
        category,
        priority: ticket.priority,
        similarTickets: similarTickets.length > 0 ? similarTickets : null
      });
    });

    res.json({
      success: true,
      message: "Ticket creado exitosamente",
      ticket,
      similarTickets: similarTickets.length > 0 ? similarTickets : null
    });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Error al crear ticket" });
  }
});

// Obtener tickets del usuario
router.get("/tickets/my", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const status = req.query.status;

    const where = { userId };
    if (status) {
      const validStatuses = ["OPEN", "IN_PROGRESS", "CLOSED"];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1 // Solo el primer mensaje
        }
      }
    });

    res.json({ success: true, tickets });
  } catch (error) {
    console.error("Error getting user tickets:", error);
    res.status(500).json({ error: "Error al obtener tickets" });
  }
});

// Obtener detalle de un ticket
router.get("/tickets/:ticketId", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = Number(req.params.ticketId);

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        OR: [
          { userId }, // Es el dueño del ticket
          { assignedTo: userId } // O está asignado a él (admin)
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    res.json({ success: true, ticket });
  } catch (error) {
    console.error("Error getting ticket details:", error);
    res.status(500).json({ error: "Error al obtener detalles del ticket" });
  }
});

// Enviar mensaje a un ticket
router.post("/tickets/:ticketId/messages", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = Number(req.params.ticketId);
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "content es requerido" });
    }

    // Verificar que el usuario tiene acceso al ticket
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: ticketId,
        OR: [
          { userId },
          { assignedTo: userId }
        ]
      }
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket no encontrado" });
    }

    if (ticket.status === "CLOSED") {
      return res.status(400).json({ error: "El ticket está cerrado" });
    }

    // Verificar si el usuario es admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    const isFromAdmin = user.role === "ADMIN" || user.role === "ADMIN_WORKER";

    const message = await prisma.supportMessage.create({
      data: {
        ticketId,
        userId,
        content,
        isFromAdmin
      }
    });

    // Actualizar estado del ticket si es admin respondiendo
    if (isFromAdmin && ticket.status === "OPEN") {
      await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: "IN_PROGRESS" }
      });
    }

    // Notificar al otro lado
    const io = getIO();
    if (isFromAdmin) {
      io.to(`user:${ticket.userId}`).emit("support:new-message", {
        ticketId,
        message
      });
    } else {
      // Notificar al admin asignado o a todos los admins
      if (ticket.assignedTo) {
        io.to(`user:${ticket.assignedTo}`).emit("support:new-message", {
          ticketId,
          message
        });
      } else {
        const admins = await prisma.user.findMany({
          where: { role: { in: ["ADMIN", "ADMIN_WORKER"] } }
        });
        admins.forEach(admin => {
          io.to(`user:${admin.id}`).emit("support:new-message", {
            ticketId,
            message
          });
        });
      }
    }

    res.json({
      success: true,
      message: "Mensaje enviado",
      data: message
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
});

// Cerrar ticket
router.post("/tickets/:ticketId/close", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = Number(req.params.ticketId);

    // Verificar si es admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user.role !== "ADMIN" && user.role !== "ADMIN_WORKER") {
      return res.status(403).json({ error: "Solo admins pueden cerrar tickets" });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: "CLOSED",
        closedAt: new Date()
      }
    });

    // Notificar al usuario
    const io = getIO();
    io.to(`user:${ticket.userId}`).emit("support:ticket-closed", {
      ticketId
    });

    res.json({
      success: true,
      message: "Ticket cerrado",
      ticket
    });
  } catch (error) {
    console.error("Error closing ticket:", error);
    res.status(500).json({ error: "Error al cerrar ticket" });
  }
});

// Obtener todos los tickets (admin)
router.get("/tickets", auth, roleMiddleware(["ADMIN", "ADMIN_WORKER"]), async (req, res) => {
  try {
    const status = req.query.status;
    const category = req.query.category;
    const priority = req.query.priority;

    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        },
        _count: {
          select: { messages: true }
        }
      }
    });

    res.json({ success: true, tickets });
  } catch (error) {
    console.error("Error getting all tickets:", error);
    res.status(500).json({ error: "Error al obtener tickets" });
  }
});

// Asignar ticket a admin
router.post("/tickets/:ticketId/assign", auth, roleMiddleware(["ADMIN", "ADMIN_WORKER"]), async (req, res) => {
  try {
    const adminId = req.user.id;
    const ticketId = Number(req.params.ticketId);

    const ticket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo: adminId,
        status: "IN_PROGRESS"
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true
          }
        }
      }
    });

    // Notificar al usuario
    const io = getIO();
    io.to(`user:${ticket.userId}`).emit("support:ticket-assigned", {
      ticketId,
      assignedTo: adminId
    });

    res.json({
      success: true,
      message: "Ticket asignado",
      ticket
    });
  } catch (error) {
    console.error("Error assigning ticket:", error);
    res.status(500).json({ error: "Error al asignar ticket" });
  }
});

export default router;
