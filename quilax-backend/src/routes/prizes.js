import express from 'express';
import prisma from '../lib/prisma.js';
import { auth, roleMiddleware } from '../middleware/auth.js';
import {
  distributePrizes,
  getQuizWinners,
  getPendingPrizeDistributions,
} from '../services/prizeDistributionService.js';
import { getPrizeStatistics } from '../services/prizeConfigService.js';

const router = express.Router();

// ============================
// DISTRIBUCIÓN DE PREMIOS
// ============================

// Distribuir premios manualmente (admin)
router.post('/distribute/:quizRunId', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { quizRunId } = req.params;
    
    const distribution = await distributePrizes(parseInt(quizRunId));
    
    res.json({
      success: true,
      message: 'Premios distribuidos exitosamente',
      distribution
    });
  } catch (error) {
    console.error('Error distributing prizes:', error);
    res.status(400).json({ error: error.message });
  }
});

// Obtener ganadores de un quiz específico
router.get('/quiz/:quizRunId/winners', auth, async (req, res) => {
  try {
    const { quizRunId } = req.params;
    
    const winners = await getQuizWinners(parseInt(quizRunId));
    
    res.json({
      success: true,
      winners
    });
  } catch (error) {
    console.error('Error getting quiz winners:', error);
    res.status(500).json({ error: 'Error al obtener ganadores' });
  }
});

// ============================
// ESTADÍSTICAS DE PREMIOS
// ============================

// Obtener estadísticas generales de premios
router.get('/statistics', auth, async (req, res) => {
  try {
    const userId = req.user.role === 'ADMIN' ? null : req.user.id;
    
    const stats = await getPrizeStatistics(userId);
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error getting prize statistics:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Obtener estadísticas de premios del usuario actual
router.get('/my-statistics', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const stats = await getPrizeStatistics(userId);
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error getting user prize statistics:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de premios' });
  }
});

// ============================
// ADMIN - GESTIÓN DE PREMIOS
// ============================

// Obtener distribuciones pendientes (admin)
router.get('/pending-distributions', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const pending = await getPendingPrizeDistributions();
    
    res.json({
      success: true,
      pending
    });
  } catch (error) {
    console.error('Error getting pending distributions:', error);
    res.status(500).json({ error: 'Error al obtener distribuciones pendientes' });
  }
});

// Obtener todos los ganadores recientes (admin)
router.get('/recent-winners', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const stats = await getPrizeStatistics(null);
    const recentWinners = stats.recentWinners;
    
    // Paginar resultados
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWinners = recentWinners.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      winners: paginatedWinners,
      pagination: {
        page,
        limit,
        total: recentWinners.length,
        totalPages: Math.ceil(recentWinners.length / limit)
      }
    });
  } catch (error) {
    console.error('Error getting recent winners:', error);
    res.status(500).json({ error: 'Error al obtener ganadores recientes' });
  }
});

// Obtener historial de premios de un usuario específico (admin)
router.get('/user/:userId/history', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const stats = await getPrizeStatistics(parseInt(userId));
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error getting user prize history:', error);
    res.status(500).json({ error: 'Error al obtener historial de premios' });
  }
});

export default router;
