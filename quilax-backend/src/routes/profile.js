import express from 'express';
import { auth, roleMiddleware } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// ============================
// PERFIL DE USUARIO
// ============================

// Obtener perfil completo del usuario
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        balance: true,
        points: true,
        createdAt: true,
        // Validaciones y datos bancarios
        dateOfBirth: true,
        isOver18: true,
        guardianPhotoUrl: true,
        verificationVideoUrl: true,
        bankAccountIban: true,
        bankAccountName: true,
        bankAccountBic: true,
        isBankVerified: true,
        // Estadísticas
        _count: {
          select: {
            createdQuizzes: true,
            quizParticipants: true,
            quizScores: true,
            quizWinners: true,
            payments: true,
            withdrawals: true,
            transactions: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Calcular estadísticas adicionales
    const [
      totalWinnings,
      recentActivity,
      bestScores
    ] = await Promise.all([
      // Total de premios ganados
      prisma.quizWinner.aggregate({
        where: { userId },
        _sum: { creditsWon: true },
        _count: { userId: true }
      }),
      // Actividad reciente
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          quiz: {
            select: { title: true, category: true }
          }
        }
      }),
      // Mejores scores
      prisma.quizScore.findMany({
        where: { userId },
        orderBy: { score: 'desc' },
        take: 5,
        include: {
          quizRun: {
            include: {
              quiz: {
                select: { title: true, difficulty: true }
              }
            }
          }
        }
      })
    ]);

    const profile = {
      ...user,
      statistics: {
        quizzesCreated: user._count.createdQuizzes,
        quizzesParticipated: user._count.quizParticipants,
        quizzesCompleted: user._count.quizScores,
        quizzesWon: user._count.quizWinners,
        totalPayments: user._count.payments,
        totalWithdrawals: user._count.withdrawals,
        totalTransactions: user._count.transactions
      },
      winnings: {
        totalCredits: totalWinnings._sum.creditsWon || 0,
        totalWins: totalWinnings._count.userId || 0,
        averageCreditsPerWin: totalWinnings._count.userId > 0 
          ? Math.floor((totalWinnings._sum.creditsWon || 0) / totalWinnings._count.userId) 
          : 0
      },
      recentActivity: recentActivity.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        createdAt: t.createdAt,
        description: getTransactionDescription(t),
        quiz: t.quiz
      })),
      bestScores: bestScores.map(score => ({
        id: score.id,
        score: score.score,
        quiz: {
          title: score.quizRun.quiz.title,
          difficulty: score.quizRun.quiz.difficulty
        },
        createdAt: score.createdAt
      }))
    };

    // Eliminar el campo _count del resultado
    delete profile._count;

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Error al obtener perfil de usuario' });
  }
});

// Actualizar perfil básico
router.put('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName,
      dateOfBirth,
      guardianPhotoUrl,
      verificationVideoUrl
    } = req.body;

    // Validar datos
    const updateData = {};

    if (fullName && fullName.trim()) {
      if (fullName.length < 2 || fullName.length > 100) {
        return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
      }
      updateData.fullName = fullName.trim();
    }

    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const now = new Date();

      // Validar que la fecha sea válida y no sea futura
      if (isNaN(birthDate.getTime()) || birthDate > now) {
        return res.status(400).json({ error: 'Fecha de nacimiento inválida' });
      }

      // Validar que no sea demasiado antigua
      const minDate = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
      if (birthDate < minDate) {
        return res.status(400).json({ error: 'Fecha de nacimiento demasiado antigua' });
      }

      updateData.dateOfBirth = birthDate;

      // Calcular si es mayor de 18
      const age = Math.floor((now - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
      updateData.isOver18 = age >= 18;
    }

    // Validar URLs si se proporcionan
    if (guardianPhotoUrl) {
      if (!isValidUrl(guardianPhotoUrl)) {
        return res.status(400).json({ error: 'URL de foto del tutor inválida' });
      }
      updateData.guardianPhotoUrl = guardianPhotoUrl;
    }

    if (verificationVideoUrl) {
      if (!isValidUrl(verificationVideoUrl)) {
        return res.status(400).json({ error: 'URL de vídeo de verificación inválida' });
      }
      updateData.verificationVideoUrl = verificationVideoUrl;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        dateOfBirth: true,
        isOver18: true,
        guardianPhotoUrl: true,
        verificationVideoUrl: true
      }
    });

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// Actualizar foto de perfil
router.put('/profile-photo', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profilePhoto } = req.body;

    if (!profilePhoto) {
      return res.status(400).json({ error: 'URL de foto de perfil es requerida' });
    }

    if (!isValidUrl(profilePhoto)) {
      return res.status(400).json({ error: 'URL de foto de perfil inválida' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto },
      select: {
        id: true,
        profilePhoto: true
      }
    });

    res.json({
      success: true,
      message: 'Foto de perfil actualizada exitosamente',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile photo:', error);
    res.status(500).json({ error: 'Error al actualizar foto de perfil' });
  }
});

// Cambiar contraseña
router.put('/password', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    // Validar longitud de nueva contraseña
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    // Obtener usuario con contraseña actual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true }
    });

    if (!user || !user.password) {
      return res.status(400).json({ error: 'Usuario no encontrado o no tiene contraseña establecida' });
    }

    // Verificar contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }

    // Hashear nueva contraseña
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
});

// Actualizar datos bancarios
router.put('/bank-account', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      bankAccountIban,
      bankAccountName,
      bankAccountBic
    } = req.body;

    // Validar que el usuario sea mayor de 18
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isOver18: true }
    });

    if (!user.isOver18) {
      return res.status(403).json({ error: 'Debes ser mayor de 18 años para actualizar datos bancarios' });
    }

    const updateData = {};
    
    if (bankAccountIban) {
      // Validar formato IBAN básico
      if (!isValidIban(bankAccountIban)) {
        return res.status(400).json({ error: 'IBAN inválido' });
      }
      updateData.bankAccountIban = bankAccountIban.replace(/\s/g, '').toUpperCase();
      updateData.isBankVerified = false; // Resetear verificación al cambiar IBAN
    }

    if (bankAccountName && bankAccountName.trim()) {
      if (bankAccountName.length < 2 || bankAccountName.length > 100) {
        return res.status(400).json({ error: 'El nombre del titular debe tener entre 2 y 100 caracteres' });
      }
      updateData.bankAccountName = bankAccountName.trim();
    }

    if (bankAccountBic) {
      // Validar formato BIC/SWIFT básico
      if (!isValidBic(bankAccountBic)) {
        return res.status(400).json({ error: 'BIC/SWIFT inválido' });
      }
      updateData.bankAccountBic = bankAccountBic.replace(/\s/g, '').toUpperCase();
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        bankAccountIban: true,
        bankAccountName: true,
        bankAccountBic: true,
        isBankVerified: true
      }
    });

    // Devolver IBAN enmascarado por seguridad
    const maskedIban = updatedUser.bankAccountIban 
      ? updatedUser.bankAccountIban.replace(/.(?=.{4})/g, '*')
      : null;

    res.json({
      success: true,
      message: 'Datos bancarios actualizados exitosamente',
      user: {
        ...updatedUser,
        bankAccountIban: maskedIban
      }
    });
  } catch (error) {
    console.error('Error updating bank account:', error);
    res.status(500).json({ error: 'Error al actualizar datos bancarios' });
  }
});

// ============================
// VERIFICACIONES
// ============================

// Solicitar verificación de edad
router.post('/verify-age', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dateOfBirth, guardianPhotoUrl, verificationVideoUrl } = req.body;

    if (!dateOfBirth) {
      return res.status(400).json({ error: 'Fecha de nacimiento requerida' });
    }

    const birthDate = new Date(dateOfBirth);
    const now = new Date();
    
    if (isNaN(birthDate.getTime()) || birthDate > now) {
      return res.status(400).json({ error: 'Fecha de nacimiento inválida' });
    }

    const age = Math.floor((now - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    const isOver18 = age >= 18;

    // Si es menor de 18, requiere documentación adicional
    if (!isOver18) {
      if (!guardianPhotoUrl || !verificationVideoUrl) {
        return res.status(400).json({ 
          error: 'Para menores de 18 años se requiere foto del tutor y vídeo de verificación' 
        });
      }

      if (!isValidUrl(guardianPhotoUrl) || !isValidUrl(verificationVideoUrl)) {
        return res.status(400).json({ error: 'URLs de documentación inválidas' });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        dateOfBirth: birthDate,
        isOver18,
        guardianPhotoUrl: isOver18 ? null : guardianPhotoUrl,
        verificationVideoUrl: isOver18 ? null : verificationVideoUrl
      },
      select: {
        id: true,
        dateOfBirth: true,
        isOver18: true,
        guardianPhotoUrl: true,
        verificationVideoUrl: true
      }
    });

    res.json({
      success: true,
      message: isOver18 
        ? 'Verificación de edad completada - Eres mayor de 18 años'
        : 'Verificación de edad iniciada - Requiere documentación adicional',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error verifying age:', error);
    res.status(500).json({ error: 'Error en verificación de edad' });
  }
});

// Solicitar verificación bancaria
router.post('/verify-bank', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, documentUrl, additionalInfo } = req.body;

    // Verificar que el usuario sea mayor de 18
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isOver18: true, bankAccountIban: true, bankAccountName: true }
    });

    if (!user.isOver18) {
      return res.status(403).json({ error: 'Debes ser mayor de 18 años para verificar cuenta bancaria' });
    }

    if (!user.bankAccountIban || !user.bankAccountName) {
      return res.status(400).json({ error: 'Debes completar tus datos bancarios primero' });
    }

    if (!documentType || !documentUrl) {
      return res.status(400).json({ error: 'Tipo de documento y URL son requeridos' });
    }

    if (!isValidUrl(documentUrl)) {
      return res.status(400).json({ error: 'URL de documento inválida' });
    }

    // Aquí iría la lógica real de verificación bancaria
    // Por ahora, marcamos como verificado manualmente
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBankVerified: true
      },
      select: {
        id: true,
        bankAccountIban: true,
        bankAccountName: true,
        isBankVerified: true
      }
    });

    // Devolver IBAN enmascarado
    const maskedIban = updatedUser.bankAccountIban
      ? updatedUser.bankAccountIban.replace(/.(?=.{4})/g, '*')
      : null;

    res.json({
      success: true,
      message: 'Cuenta bancaria verificada exitosamente',
      user: {
        ...updatedUser,
        bankAccountIban: maskedIban
      }
    });
  } catch (error) {
    console.error('Error verifying bank account:', error);
    res.status(500).json({ error: 'Error en verificación bancaria' });
  }
});

// Solicitar verificación de identidad (ID verification)
router.post('/verify-id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { documentType, documentUrl } = req.body;

    if (!documentType || !documentUrl) {
      return res.status(400).json({ error: 'Tipo de documento y URL son requeridos' });
    }

    const validDocumentTypes = ['PASSPORT', 'DNI', 'DRIVING_LICENSE', 'ID_CARD'];
    if (!validDocumentTypes.includes(documentType)) {
      return res.status(400).json({ error: 'Tipo de documento inválido' });
    }

    if (!isValidUrl(documentUrl)) {
      return res.status(400).json({ error: 'URL de documento inválida' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        idDocumentUrl: documentUrl,
        idDocumentType: documentType,
        idVerified: true,
        idVerifiedAt: new Date()
      },
      select: {
        id: true,
        idDocumentType: true,
        idVerified: true,
        idVerifiedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Verificación de identidad enviada',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error verifying ID:', error);
    res.status(500).json({ error: 'Error en verificación de identidad' });
  }
});

// Obtener estado de verificación de identidad
router.get('/verify-id-status', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        idDocumentType: true,
        idVerified: true,
        idVerifiedAt: true
      }
    });

    res.json({
      success: true,
      verification: user
    });
  } catch (error) {
    console.error('Error getting ID verification status:', error);
    res.status(500).json({ error: 'Error al obtener estado de verificación' });
  }
});

// ============================
// PRIVACY SETTINGS
// ============================

// Obtener configuración de privacidad
router.get('/privacy', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        profilePublic: true,
        showQuizHistory: true,
        showPrizes: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      privacy: user
    });
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración de privacidad' });
  }
});

// Actualizar configuración de privacidad
router.put('/privacy', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { profilePublic, showQuizHistory, showPrizes } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        profilePublic: profilePublic !== undefined ? profilePublic : undefined,
        showQuizHistory: showQuizHistory !== undefined ? showQuizHistory : undefined,
        showPrizes: showPrizes !== undefined ? showPrizes : undefined
      },
      select: {
        profilePublic: true,
        showQuizHistory: true,
        showPrizes: true
      }
    });

    res.json({
      success: true,
      message: 'Configuración de privacidad actualizada',
      privacy: updatedUser
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuración de privacidad' });
  }
});

// ============================
// SECURITY SETTINGS
// ============================

// Obtener configuración de seguridad
router.get('/security', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        lastLoginAt: true,
        lastLoginIp: true,
        emailVerified: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      security: user
    });
  } catch (error) {
    console.error('Error getting security settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración de seguridad' });
  }
});

// Habilitar 2FA
router.post('/security/2fa/enable', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Generar secreto 2FA (simulado)
    const twoFactorSecret = Math.random().toString(36).substring(2, 15);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret,
        twoFactorEnabled: true
      },
      select: {
        twoFactorEnabled: true
      }
    });

    res.json({
      success: true,
      message: '2FA habilitado',
      secret: twoFactorSecret // En producción, esto debería mostrarse solo una vez
    });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    res.status(500).json({ error: 'Error al habilitar 2FA' });
  }
});

// Deshabilitar 2FA
router.post('/security/2fa/disable', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null
      },
      select: {
        twoFactorEnabled: true
      }
    });

    res.json({
      success: true,
      message: '2FA deshabilitado'
    });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    res.status(500).json({ error: 'Error al deshabilitar 2FA' });
  }
});

// Eliminar cuenta
router.delete('/account', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Contraseña requerida para eliminar cuenta' });
    }

    // Verificar contraseña
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true }
    });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    // Eliminar usuario (cascade eliminará todas las relaciones)
    await prisma.user.delete({
      where: { id: userId }
    });

    res.json({
      success: true,
      message: 'Cuenta eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
});

// ============================
// LANGUAGE SETTINGS
// ============================

// Obtener idioma del usuario
router.get('/language', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        language: true
      }
    });

    res.json({
      success: true,
      language: user?.language || 'es'
    });
  } catch (error) {
    console.error('Error getting language:', error);
    res.status(500).json({ error: 'Error al obtener idioma' });
  }
});

// Actualizar idioma del usuario
router.put('/language', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { language } = req.body;

    const supportedLanguages = ['es', 'en', 'fr', 'de', 'it', 'pt'];
    if (!supportedLanguages.includes(language)) {
      return res.status(400).json({ error: 'Idioma no soportado' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { language }
    });

    res.json({
      success: true,
      message: 'Idioma actualizado',
      language
    });
  } catch (error) {
    console.error('Error updating language:', error);
    res.status(500).json({ error: 'Error al actualizar idioma' });
  }
});

// ============================
// PRIZE HISTORY
// ============================

// Obtener historial de premios
router.get('/prizes/history', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [prizes, total] = await Promise.all([
      prisma.quizWinner.findMany({
        where: { userId },
        include: {
          quizRun: {
            include: {
              quiz: {
                select: {
                  title: true,
                  category: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.quizWinner.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      prizes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting prize history:', error);
    res.status(500).json({ error: 'Error al obtener historial de premios' });
  }
});

// ============================
// WIN RATE STATISTICS
// ============================

// Obtener estadísticas de win rate
router.get('/statistics/win-rate', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const participants = await prisma.quizParticipant.findMany({
      where: { userId },
      include: {
        quizRun: {
          include: {
            quiz: {
              select: {
                title: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const quizRuns = participants.map(p => p.quizRun).filter(Boolean);
    const totalQuizRuns = quizRuns.length;
    const finishedQuizRuns = quizRuns.filter(run => run.phase === 'FINISHED');
    const wonQuizRuns = finishedQuizRuns.filter(run => run.prize > 0);

    const winRate = totalQuizRuns > 0 ? (wonQuizRuns.length / totalQuizRuns) * 100 : 0;
    const completionRate = totalQuizRuns > 0 ? (finishedQuizRuns.length / totalQuizRuns) * 100 : 0;

    const averageScore = finishedQuizRuns.length > 0
      ? finishedQuizRuns.reduce((sum, run) => sum + (run.score || 0), 0) / finishedQuizRuns.length
      : 0;

    const totalPrizesWon = wonQuizRuns.reduce((sum, run) => sum + (run.prize || 0), 0);

    res.json({
      success: true,
      statistics: {
        totalQuizRuns,
        finishedQuizRuns: finishedQuizRuns.length,
        wonQuizRuns: wonQuizRuns.length,
        winRate: Math.round(winRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        averageScore: Math.round(averageScore),
        totalPrizesWon
      }
    });
  } catch (error) {
    console.error('Error getting win rate statistics:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas de win rate' });
  }
});

// ============================
// PROFILE SHARING
// ============================

// Generar enlace de compartir perfil
router.get('/:userId/share', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        profilePublic: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.profilePublic) {
      return res.status(403).json({ error: 'Este perfil es privado' });
    }

    // Generar URL de compartir
    const shareUrl = `https://quilax.com/profile/${userId}`;
    const shareText = `¡Mira el perfil de ${user.fullName || user.username} en Quilax!`;

    res.json({
      success: true,
      share: {
        url: shareUrl,
        text: shareText
      }
    });
  } catch (error) {
    console.error('Error generating profile share link:', error);
    res.status(500).json({ error: 'Error al generar enlace de compartir' });
  }
});

// ============================
// UTILIDADES
// ============================

// Validar URL
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Validar IBAN básico
function isValidIban(iban) {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleanIban);
}

// Validar BIC/SWIFT básico
function isValidBic(bic) {
  const cleanBic = bic.replace(/\s/g, '').toUpperCase();
  return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic);
}

// Generar descripción de transacción
function getTransactionDescription(transaction) {
  const descriptions = {
    'QUIZ_ENTRY': 'Entrada a quiz',
    'PRIZE_PAYOUT': 'Premio ganado',
    'PLATFORM_FEE': 'Comisión de plataforma',
    'WITHDRAW': 'Retiro de fondos',
    'BANK_TO_CREDITS': 'Compra de créditos'
  };

  let description = descriptions[transaction.type] || 'Transacción';
  
  if (transaction.quiz) {
    description += ` - ${transaction.quiz.title}`;
  }

  return description;
}

export default router;
