import express from 'express';
import { auth } from '../middleware/auth.js';
import { validateQuizRules, calculateQuizDuration, getQuizTimeBreakdown } from '../utils/quizValidationService.js';

const router = express.Router();

// ============================
// VALIDAR QUIZ ANTES DE GUARDAR
// ============================

router.post('/validate', auth, (req, res) => {
  try {
    const { title, questions } = req.body;
    
    if (!title || !questions) {
      return res.status(400).json({ 
        error: 'Se requieren título y preguntas para validar' 
      });
    }
    
    const quiz = { title, questions };
    const validation = validateQuizRules(quiz);
    
    res.json({
      isValid: validation.isValid,
      canPublish: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      metrics: validation.metrics
    });
  } catch (error) {
    console.error('❌ Quiz validation error:', error);
    res.status(500).json({ error: 'Error al validar quiz' });
  }
});

// ============================
// CALCULAR DURACIÓN ESTIMADA
// ============================

router.post('/calculate-duration', (req, res) => {
  try {
    const { questions } = req.body;
    
    if (!questions || !Array.isArray(questions)) {
      return res.status(400).json({ 
        error: 'Se requieren preguntas válidas' 
      });
    }
    
    const duration = calculateQuizDuration(questions);
    const breakdown = getQuizTimeBreakdown(questions);
    
    res.json({
      durationMinutes: duration,
      breakdown,
      isValid: duration <= 20,
      maxAllowedDuration: 20
    });
  } catch (error) {
    console.error('❌ Duration calculation error:', error);
    res.status(500).json({ error: 'Error al calcular duración' });
  }
});

export default router;
