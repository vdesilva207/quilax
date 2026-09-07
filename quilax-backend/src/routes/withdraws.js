import express from 'express';
import speakeasy from 'speakeasy';
import prisma from '../lib/prisma.js';
import { auth, roleMiddleware } from '../middleware/auth.js';
import {
  createWithdrawRequest,
  getUserWithdrawHistory,
  getPendingWithdraws,
  updateWithdrawStatus
} from '../services/withdrawService.js';

const router = express.Router();

// ============================
// RETIROS DE USUARIOS
// ============================

// Solicitar retiro
router.post('/request', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, totpCode } = req.body;

    if (req.user.twoFactorEnabled) {
      if (!totpCode) {
        return res.status(403).json({
          requires2FA: true,
          error: 'Se requiere código 2FA',
        });
      }
      const ok = speakeasy.totp.verify({
        secret: req.user.twoFactorSecret,
        encoding: 'base32',
        token: String(totpCode).trim(),
        window: 1,
      });
      if (!ok) {
        return res.status(401).json({ error: 'Código 2FA inválido' });
      }
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    const result = await createWithdrawRequest(userId, parseFloat(amount));
    
    res.json({
      success: true,
      withdraw: result.withdraw,
      processingFee: result.processingFee,
      totalAmount: result.totalAmount,
      estimatedTime: result.estimatedTime
    });
  } catch (error) {
    console.error('Error creating withdraw request:', error);
    res.status(400).json({ error: error.message });
  }
});

// Obtener historial de retiros del usuario
router.get('/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const history = await getUserWithdrawHistory(userId, page, limit);
    
    res.json({
      success: true,
      ...history
    });
  } catch (error) {
    console.error('Error getting withdraw history:', error);
    res.status(500).json({ error: 'Error al obtener historial de retiros' });
  }
});

// ============================
// ADMIN - GESTIÓN DE RETIROS
// ============================

// Obtener retiros pendientes (solo admin)
router.get('/pending', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const pending = await getPendingWithdraws(page, limit);
    
    res.json({
      success: true,
      ...pending
    });
  } catch (error) {
    console.error('Error getting pending withdraws:', error);
    res.status(500).json({ error: 'Error al obtener retiros pendientes' });
  }
});

// Aprobar retiro (solo admin)
router.post('/:withdrawId/approve', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { withdrawId } = req.params;
    const userId = req.user.id; // Admin que aprueba

    const result = await updateWithdrawStatus(parseInt(withdrawId), 'COMPLETED');
    
    // Registrar acción del admin
    await prisma.transaction.create({
      data: {
        userId,
        type: 'PLATFORM_FEE',
        amount: 0,
        currency: 'EUR',
        // Aquí podríamos añadir metadata sobre la acción
      }
    });
    
    res.json({
      success: true,
      message: 'Retiro aprobado y procesado',
      ...result
    });
  } catch (error) {
    console.error('Error approving withdraw:', error);
    res.status(400).json({ error: error.message });
  }
});

// Rechazar retiro (solo admin)
router.post('/:withdrawId/reject', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { withdrawId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id; // Admin que rechaza

    const result = await updateWithdrawStatus(parseInt(withdrawId), 'REJECTED', reason);
    
    res.json({
      success: true,
      message: 'Retiro rechazado',
      ...result
    });
  } catch (error) {
    console.error('Error rejecting withdraw:', error);
    res.status(400).json({ error: error.message });
  }
});

// Obtener detalles de un retiro específico (admin)
router.get('/:withdrawId', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { withdrawId } = req.params;
    
    const withdraw = await prisma.withdraw.findUnique({
      where: { id: parseInt(withdrawId) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isBankVerified: true,
            bankAccountName: true,
            bankAccountIban: true
          }
        }
      }
    });

    if (!withdraw) {
      return res.status(404).json({ error: 'Retiro no encontrado' });
    }

    // Ocultar IBAN completo por seguridad
    const maskedIban = withdraw.user.bankAccountIban 
      ? withdraw.user.bankAccountIban.replace(/.(?=.{4})/g, '*')
      : null;

    res.json({
      success: true,
      withdraw: {
        ...withdraw,
        user: {
          ...withdraw.user,
          bankAccountIban: maskedIban
        }
      }
    });
  } catch (error) {
    console.error('Error getting withdraw details:', error);
    res.status(500).json({ error: 'Error al obtener detalles del retiro' });
  }
});

export default router;
