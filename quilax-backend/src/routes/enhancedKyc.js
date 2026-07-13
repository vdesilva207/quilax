import express from "express";
import { auth, roleMiddleware } from "../middleware/auth.js";
import prisma from "../lib/prisma.js";

const router = express.Router();

// Subir documento KYC enhanced
router.post("/submit", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, documentUrl } = req.body;

    if (!documentType || !documentUrl) {
      return res.status(400).json({ error: "documentType y documentUrl son requeridos" });
    }

    const validTypes = ["PASSPORT", "INCOME_PROOF", "TAX_ID", "BANK_STATEMENT", "ID_CARD", "DRIVERS_LICENSE"];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({ error: "Tipo de documento inválido" });
    }

    const kyc = await prisma.enhancedKyc.create({
      data: {
        userId,
        documentType,
        documentUrl,
        status: "PENDING"
      }
    });

    res.json({
      success: true,
      message: "Documento KYC enviado para revisión",
      kyc
    });
  } catch (error) {
    console.error("Error submitting KYC:", error);
    res.status(500).json({ error: "Error al enviar documento KYC" });
  }
});

// Obtener documentos KYC del usuario
router.get("/my-documents", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const documents = await prisma.enhancedKyc.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, documents });
  } catch (error) {
    console.error("Error getting KYC documents:", error);
    res.status(500).json({ error: "Error al obtener documentos KYC" });
  }
});

// Aprobar documento KYC (ADMIN)
router.post("/:id/approve", auth, roleMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const kycId = Number(req.params.id);

    const kyc = await prisma.enhancedKyc.update({
      where: { id: kycId },
      data: {
        status: "APPROVED",
        verifiedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Documento KYC aprobado",
      kyc
    });
  } catch (error) {
    console.error("Error approving KYC:", error);
    res.status(500).json({ error: "Error al aprobar documento KYC" });
  }
});

// Rechazar documento KYC (ADMIN)
router.post("/:id/reject", auth, roleMiddleware(["ADMIN"]), async (req, res) => {
  try {
    const kycId = Number(req.params.id);
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: "rejectionReason es requerido" });
    }

    const kyc = await prisma.enhancedKyc.update({
      where: { id: kycId },
      data: {
        status: "REJECTED",
        rejectionReason
      },
      include: {
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: "Documento KYC rechazado",
      kyc
    });
  } catch (error) {
    console.error("Error rejecting KYC:", error);
    res.status(500).json({ error: "Error al rechazar documento KYC" });
  }
});

// Verificar si usuario tiene KYC enhanced aprobado
router.get("/check-status", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const approvedKyc = await prisma.enhancedKyc.findFirst({
      where: {
        userId,
        status: "APPROVED"
      }
    });

    const hasApprovedKyc = !!approvedKyc;

    res.json({
      success: true,
      hasApprovedKyc,
      approvedKyc
    });
  } catch (error) {
    console.error("Error checking KYC status:", error);
    res.status(500).json({ error: "Error al verificar estado KYC" });
  }
});

export default router;
