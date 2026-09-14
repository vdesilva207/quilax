import express from 'express';
import { auth, roleMiddleware } from '../middleware/auth.js';
import {
  getPrizeConfig,
  updatePrizeConfig,
  calculateQuizPrizeDistribution,
  calculateSeasonJackpotDistribution,
  updateQuizDistribution,
  updateSeasonJackpotDistribution,
  getPrizeStatistics
} from '../services/prizeConfigService.js';

const router = express.Router();

// ============================
// CONFIGURACIÓN DE PREMIOS
// ============================

// Obtener configuración actual de premios (solo admin)
router.get('/config', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const config = await getPrizeConfig();
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    console.error('Error getting prize config:', error);
    res.status(500).json({ error: 'Error al obtener configuración de premios' });
  }
});

// Actualizar configuración de premios (solo admin)
router.put('/config', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const adminUserId = req.user.id;
    const configUpdates = req.body;
    
    const result = await updatePrizeConfig(adminUserId, configUpdates);
    
    res.json({
      success: true,
      message: result.message,
      config: result.config
    });
  } catch (error) {
    console.error('Error updating prize config:', error);
    res.status(400).json({ error: error.message });
  }
});

// Actualizar reparto de quizzes (solo admin)
router.put('/quiz-distribution', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const adminUserId = req.user.id;
    const { quizDistribution } = req.body;
    
    const result = await updateQuizDistribution(adminUserId, quizDistribution);
    
    res.json({
      success: true,
      message: result.message,
      config: result.config
    });
  } catch (error) {
    console.error('Error updating quiz distribution:', error);
    res.status(400).json({ error: error.message });
  }
});

// Actualizar reparto de jackpot de temporada (solo admin)
router.put('/season-jackpot-distribution', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const adminUserId = req.user.id;
    const { seasonJackpotDistribution } = req.body;
    
    const result = await updateSeasonJackpotDistribution(adminUserId, seasonJackpotDistribution);
    
    res.json({
      success: true,
      message: result.message,
      config: result.config
    });
  } catch (error) {
    console.error('Error updating season jackpot distribution:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================
// ESTADÍSTICAS DE PREMIOS
// ============================

// Obtener estadísticas completas de premios (solo admin)
router.get('/statistics', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const statistics = await getPrizeStatistics();
    
    res.json({
      success: true,
      ...statistics
    });
  } catch (error) {
    console.error('Error getting prize statistics:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de premios' });
  }
});

// Simular distribución de premios de quizzes (solo admin)
// Percentages are shares of the TOTAL pot — same model as live payout.
router.post('/simulate-quiz', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { participantCount, prizePool } = req.body;

    const config = await getPrizeConfig();
    const qd = config.quizDistribution;
    const simulatedPrizePool = Number(prizePool || participantCount || 100);

    const distribution = {
      totalPrizePool: simulatedPrizePool,
      adminJackpot: Math.floor(simulatedPrizePool * (qd.adminJackpotPercentage / 100)),
      adminProfit: Math.floor(simulatedPrizePool * (qd.adminProfitPercentage / 100)),
      creatorPrize: Math.floor(simulatedPrizePool * (qd.creatorPercentage / 100)),
      winners: [],
      totalDistributed: 0,
    };

    for (const rule of qd.positionRules || []) {
      const count = rule.toPosition - rule.fromPosition + 1;
      const slice = Math.floor(simulatedPrizePool * (Number(rule.percentage) / 100));
      const per = Math.floor(slice / count);
      for (let pos = rule.fromPosition; pos <= rule.toPosition; pos++) {
        distribution.winners.push({
          fromPosition: rule.fromPosition,
          toPosition: rule.toPosition,
          position: pos,
          percentage: Number(rule.percentage) / count,
          creditsWon: per,
        });
        distribution.totalDistributed += per;
      }
    }

    distribution.totalDistributed +=
      distribution.adminJackpot + distribution.adminProfit + distribution.creatorPrize;
    distribution.leftover = Math.max(0, simulatedPrizePool - distribution.totalDistributed);

    res.json({
      success: true,
      simulation: distribution,
    });
  } catch (error) {
    console.error('Error simulating quiz prize distribution:', error);
    res.status(500).json({ error: 'Error al simular distribución de premios de quizzes' });
  }
});

// Simular distribución de jackpot de temporada (solo admin)
// Position rules are % of the total season jackpot pool.
router.post('/simulate-season', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const { jackpotPool } = req.body;

    const config = await getPrizeConfig();
    const simulatedJackpot = Number(jackpotPool || 1000);

    const distribution = {
      totalJackpot: simulatedJackpot,
      winners: [],
      totalDistributed: 0,
    };

    for (const rule of config.seasonJackpotDistribution.positionRules || []) {
      const count = rule.toPosition - rule.fromPosition + 1;
      const slice = Math.floor(simulatedJackpot * (Number(rule.percentage) / 100));
      const per = Math.floor(slice / count);
      for (let pos = rule.fromPosition; pos <= rule.toPosition; pos++) {
        distribution.winners.push({
          fromPosition: rule.fromPosition,
          toPosition: rule.toPosition,
          position: pos,
          percentage: Number(rule.percentage) / count,
          creditsWon: per,
        });
        distribution.totalDistributed += per;
      }
    }

    distribution.leftover = Math.max(0, simulatedJackpot - distribution.totalDistributed);

    res.json({
      success: true,
      simulation: distribution,
    });
  } catch (error) {
    console.error('Error simulating season jackpot distribution:', error);
    res.status(500).json({ error: 'Error al simular distribución de jackpot de temporada' });
  }
});

// Validar configuración de premios (solo admin)
router.post('/validate', auth, roleMiddleware(['ADMIN']), async (req, res) => {
  try {
    const config = req.body;
    
    // Importar función de validación
    const { validatePrizeConfig } = await import('../services/prizeConfigService.js');
    
    try {
      const validatedConfig = validatePrizeConfig(config);
      
      res.json({
        success: true,
        valid: true,
        config: validatedConfig,
        message: 'Configuración válida'
      });
    } catch (validationError) {
      res.json({
        success: true,
        valid: false,
        error: validationError.message,
        message: 'Configuración inválida'
      });
    }
  } catch (error) {
    console.error('Error validating prize config:', error);
    res.status(500).json({ error: 'Error al validar configuración' });
  }
});

export default router;
