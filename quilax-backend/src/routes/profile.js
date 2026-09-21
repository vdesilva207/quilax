import express from 'express';
import { auth, roleMiddleware } from '../middleware/auth.js';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';

const router = express.Router();
const ENTRY_COST = 1;

async function getOptionalViewer(req) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return { id: null, role: null };
    const token = header.split(' ')[1];
    if (!token) return { id: null, role: null };
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return {
      id: decoded?.id ? Number(decoded.id) : null,
      role: decoded?.role || null,
    };
  } catch {
    return { id: null, role: null };
  }
}

async function getOptionalViewerId(req) {
  const v = await getOptionalViewer(req);
  return v.id;
}

async function findRecoverableEnrollments(userId) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const enrollments = await prisma.quizEnrollment.findMany({
    where: { userId },
    include: {
      quiz: {
        include: {
          schedules: { orderBy: { scheduledAt: 'desc' }, take: 5 },
          quizRuns: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { id: true, phase: true, finishedAt: true, createdAt: true },
          },
        },
      },
    },
  });

  const recoverable = [];

  for (const enrollment of enrollments) {
    const quiz = enrollment.quiz;
    if (!quiz) continue;

    const finishedRun = (quiz.quizRuns || []).find(
      (r) => r.phase === 'FINISHED' || r.finishedAt
    );
    if (finishedRun) continue;

    const activeRun = (quiz.quizRuns || []).find(
      (r) => r.phase !== 'FINISHED' && !r.finishedAt
    );
    if (activeRun) continue;

    const schedule = quiz.schedules?.[0];
    const quizCancelled =
      quiz.status === 'REJECTED' || quiz.status === 'FINISHED';
    const neverRan =
      !quiz.quizRuns?.length &&
      schedule &&
      new Date(schedule.scheduledAt) < cutoff;
    const notLive =
      quiz.status !== 'SCHEDULED' &&
      quiz.status !== 'PUBLISHED' &&
      quiz.status !== 'APPROVED' &&
      quizCancelled;

    if (quizCancelled || neverRan || notLive) {
      recoverable.push({
        enrollmentId: enrollment.id,
        quizId: quiz.id,
        title: quiz.title,
        scheduledAt: schedule?.scheduledAt || null,
        reason: quizCancelled ? 'CANCELLED' : 'NEVER_RAN',
      });
    } else if (schedule && new Date(schedule.scheduledAt) < cutoff && !quiz.quizRuns?.length) {
      recoverable.push({
        enrollmentId: enrollment.id,
        quizId: quiz.id,
        title: quiz.title,
        scheduledAt: schedule.scheduledAt,
        reason: 'NEVER_RAN',
      });
    }
  }

  return recoverable;
}

async function refundEnrollment(userId, quizId) {
  return prisma.$transaction(async (tx) => {
    const enrollment = await tx.quizEnrollment.findUnique({
      where: { quizId_userId: { quizId, userId } },
    });

    if (!enrollment) {
      return { refunded: false, reason: 'NO_ENROLLMENT' };
    }

    const alreadyRefunded = await tx.transaction.findFirst({
      where: {
        userId,
        quizId,
        type: { in: ['ENROLLMENT_REFUND', 'PRIZE_PAYOUT'] },
        currency: { in: ['ENROLLMENT_REFUND', 'CREDIT_REFUND'] },
      },
    });

    const paidEntry = await tx.transaction.findFirst({
      where: { userId, quizId, type: 'QUIZ_ENTRY' },
      orderBy: { createdAt: 'desc' },
    });

    await tx.quizEnrollment.delete({ where: { id: enrollment.id } });

    if (!paidEntry || alreadyRefunded) {
      return { refunded: false, reason: alreadyRefunded ? 'ALREADY_REFUNDED' : 'NO_PAYMENT' };
    }

    await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: ENTRY_COST } },
    });

    await tx.transaction.create({
      data: {
        userId,
        quizId,
        type: 'ENROLLMENT_REFUND',
        amount: ENTRY_COST,
        currency: 'ENROLLMENT_REFUND',
      },
    });

    return { refunded: true };
  });
}

// ============================
// PERFIL DE USUARIO
// ============================

// Obtener perfil completo del usuario
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const lite = req.query.lite === '1' || req.query.lite === 'true';

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        username: true,
        bio: true,
        profilePhoto: true,
        balance: true,
        points: true,
        currency: true,
        country: true,
        nationality: true,
        province: true,
        gender: true,
        timezone: true,
        createdAt: true,
        emailVerified: true,
        idVerified: true,
        idVerifiedAt: true,
        idDocumentType: true,
        idDocumentUrl: true,
        livenessCompletedAt: true,
        // Validaciones y datos bancarios
        dateOfBirth: true,
        isOver18: true,
        guardianPhotoUrl: true,
        verificationVideoUrl: true,
        bankAccountIban: true,
        bankAccountName: true,
        bankAccountBic: true,
        isBankVerified: true,
        language: true,
        profilePublic: true,
        showQuizHistory: true,
        showPrizes: true,
        ...(lite
          ? {}
          : {
              _count: {
                select: {
                  createdQuizzes: true,
                  quizParticipants: true,
                  quizScores: true,
                  quizWinners: true,
                  withdrawals: true,
                  transactions: true,
                },
              },
            }),
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Lite: onboarding / gate — sin agregados pesados ni includes frágiles
    if (lite) {
      return res.json({
        success: true,
        profile: user,
      });
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
            select: { title: true }
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
        totalPayments: 0,
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
      username,
      bio,
      dateOfBirth,
      country,
      province,
      gender,
      currency,
      timezone,
      guardianPhotoUrl,
      verificationVideoUrl,
      profilePublic,
      showQuizHistory,
      showPrizes,
    } = req.body;

    // Validar datos
    const updateData = {};

    if (fullName && fullName.trim()) {
      if (fullName.length < 2 || fullName.length > 100) {
        return res.status(400).json({ error: 'El nombre debe tener entre 2 y 100 caracteres' });
      }
      updateData.fullName = fullName.trim();
    }

    if (username !== undefined) {
      const raw = typeof username === 'string' ? username.trim() : '';
      if (!raw) {
        updateData.username = null;
      } else {
        const normalized = raw.replace(/^@+/, '').slice(0, 30);
        if (!/^[a-zA-Z0-9._]{3,30}$/.test(normalized)) {
          return res.status(400).json({
            error: 'El usuario debe tener 3–30 caracteres (letras, números, . o _)',
            code: 'INVALID_USERNAME',
          });
        }
        const taken = await prisma.user.findFirst({
          where: {
            username: { equals: normalized, mode: 'insensitive' },
            NOT: { id: userId },
          },
          select: { id: true },
        });
        if (taken) {
          return res.status(409).json({
            error: 'Ese nombre de usuario ya está en uso',
            code: 'USERNAME_TAKEN',
          });
        }
        updateData.username = normalized;
      }
    }

    if (bio !== undefined) {
      const text = typeof bio === 'string' ? bio.trim() : '';
      if (text.length > 160) {
        return res.status(400).json({ error: 'La bio no puede superar 160 caracteres' });
      }
      updateData.bio = text || null;
    }

    if (typeof profilePublic === 'boolean') updateData.profilePublic = profilePublic;
    if (typeof showQuizHistory === 'boolean') updateData.showQuizHistory = showQuizHistory;
    if (typeof showPrizes === 'boolean') updateData.showPrizes = showPrizes;

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

    if (country) {
      const code = String(country).trim().toUpperCase().slice(0, 2);
      if (code.length !== 2) {
        return res.status(400).json({ error: 'Código de país inválido' });
      }
      updateData.country = code;
      updateData.nationality = code;
    }

    if (typeof province === 'string' && province.trim()) {
      updateData.province = province.trim().slice(0, 120);
    }

    if (typeof gender === 'string' && gender.trim()) {
      updateData.gender = gender.trim().slice(0, 40);
    }

    if (typeof currency === 'string' && currency.trim()) {
      updateData.currency = currency.trim().toUpperCase().slice(0, 3);
    }

    if (typeof timezone === 'string' && timezone.trim()) {
      updateData.timezone = timezone.trim().slice(0, 64);
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

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        username: true,
        bio: true,
        dateOfBirth: true,
        isOver18: true,
        country: true,
        province: true,
        gender: true,
        currency: true,
        timezone: true,
        guardianPhotoUrl: true,
        verificationVideoUrl: true,
        emailVerified: true,
        idVerified: true,
        profilePublic: true,
        showQuizHistory: true,
        showPrizes: true,
      }
    });

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      user: updatedUser
    });
  } catch (error) {
    if (error?.code === 'P2002') {
      return res.status(409).json({
        error: 'Ese nombre de usuario ya está en uso',
        code: 'USERNAME_TAKEN',
      });
    }
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// Preferencias de notificación in-app (no OS push)
router.get('/notification-settings', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { notificationSettings: true },
    });
    const defaults = { quiz: true, quizReview: true, messages: true, followers: true };
    const stored =
      user?.notificationSettings && typeof user.notificationSettings === 'object'
        ? user.notificationSettings
        : {};
    res.json({ success: true, settings: { ...defaults, ...stored } });
  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({ error: 'Error al obtener preferencias de notificación' });
  }
});

router.put('/notification-settings', auth, async (req, res) => {
  try {
    const body = req.body || {};
    const settings = {
      quiz: body.quiz !== false,
      quizReview: body.quizReview !== false,
      messages: body.messages !== false,
      followers: body.followers !== false,
    };
    await prisma.user.update({
      where: { id: req.user.id },
      data: { notificationSettings: settings },
    });
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving notification settings:', error);
    res.status(500).json({ error: 'Error al guardar preferencias de notificación' });
  }
});

// Tokens push (Expo / FCM via Expo)
router.post('/push-token', auth, async (req, res) => {
  try {
    const token = String(req.body?.token || '').trim();
    const platform = String(req.body?.platform || '').trim().slice(0, 20) || null;
    if (!token || token.length < 10 || token.length > 512) {
      return res.status(400).json({ error: 'token inválido', code: 'INVALID_PUSH_TOKEN' });
    }
    const row = await prisma.pushToken.upsert({
      where: { token },
      create: { userId: req.user.id, token, platform },
      update: { userId: req.user.id, platform, updatedAt: new Date() },
      select: { id: true, token: true, platform: true },
    });
    res.json({ success: true, pushToken: row });
  } catch (error) {
    console.error('Error saving push token:', error);
    res.status(500).json({ error: 'Error al guardar token push' });
  }
});

router.delete('/push-token', auth, async (req, res) => {
  try {
    const token = String(req.query?.token || req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'token requerido' });
    }
    await prisma.pushToken.deleteMany({
      where: { token, userId: req.user.id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting push token:', error);
    res.status(500).json({ error: 'Error al eliminar token push' });
  }
});

// Zona horaria del dispositivo / región
router.put('/timezone', auth, async (req, res) => {
  try {
    const { timezone } = req.body || {};
    if (!timezone || typeof timezone !== 'string') {
      return res.status(400).json({ error: 'timezone requerido' });
    }
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: { timezone: timezone.trim().slice(0, 64) },
      select: { id: true, timezone: true },
    });
    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('Error updating timezone:', error);
    res.status(500).json({ error: 'Error al actualizar zona horaria' });
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

// Saltar verificación Stripe Identity (solo emails en allowlist — no quita el flujo para el resto)
router.post('/identity/skip', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, idVerified: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const allowlist = (
      process.env.KYC_SKIP_ALLOWLIST ||
      ''
    )
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!allowlist.includes(String(user.email || '').toLowerCase())) {
      return res.status(403).json({
        error: 'No puedes saltarte la verificación de identidad',
        code: 'KYC_SKIP_DENIED',
      });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        idVerified: true,
        idVerifiedAt: new Date(),
        idDocumentType: 'SKIP_ALLOWLIST',
      },
      select: {
        id: true,
        email: true,
        idVerified: true,
        idVerifiedAt: true,
      },
    });

    res.json({
      success: true,
      skipped: true,
      user: updated,
    });
  } catch (error) {
    console.error('Error skipping identity:', error);
    res.status(500).json({ error: 'Error al saltar verificación' });
  }
});

async function syncStripeIdentityStatus(user) {
  if (!user?.stripeIdentitySessionId || !process.env.STRIPE_SECRET_KEY) {
    return user;
  }
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const session = await stripe.identity.verificationSessions.retrieve(
    user.stripeIdentitySessionId
  );
  if (session.status === 'verified' && !user.idVerified) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        idVerified: true,
        idVerifiedAt: new Date(),
        idDocumentType: 'STRIPE_IDENTITY',
        livenessCompletedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        idVerified: true,
        idVerifiedAt: true,
        stripeIdentitySessionId: true,
      },
    });
  }
  return {
    ...user,
    stripeStatus: session.status,
  };
}

// Crear sesión hospedada de Stripe Identity
router.post('/identity/session', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const returnOrigin =
      (typeof req.body?.returnOrigin === 'string' && req.body.returnOrigin) ||
      process.env.FRONTEND_APP_URL ||
      'http://127.0.0.1:8081';

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        idVerified: true,
        stripeIdentitySessionId: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.idVerified) {
      return res.json({ success: true, alreadyVerified: true, idVerified: true });
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        error: 'Stripe Identity no configurado',
        code: 'STRIPE_NOT_CONFIGURED',
      });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const returnUrl = `${String(returnOrigin).replace(/\/$/, '')}/identity-return`;

    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      metadata: { userId: String(userId) },
      options: {
        document: {
          require_matching_selfie: true,
        },
      },
      return_url: returnUrl,
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeIdentitySessionId: session.id },
    });

    res.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating identity session:', error);
    res.status(500).json({
      error: error?.message || 'Error al crear sesión de identidad',
    });
  }
});

// Estado de verificación Identity (polling)
router.get('/identity/status', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        idVerified: true,
        idVerifiedAt: true,
        stripeIdentitySessionId: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const synced = await syncStripeIdentityStatus(user).catch(() => user);
    res.json({
      success: true,
      idVerified: !!synced.idVerified,
      idVerifiedAt: synced.idVerifiedAt || null,
      status: synced.stripeStatus || (synced.idVerified ? 'verified' : 'pending'),
    });
  } catch (error) {
    console.error('Error identity status:', error);
    res.status(500).json({ error: 'Error al consultar identidad' });
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
        // Do not auto-verify — admin / Stripe Identity must confirm
        idVerified: false,
        idVerifiedAt: null,
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
      message: 'Documento enviado. Pendiente de verificación.',
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

async function setupTwoFactorHandler(req, res) {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA ya está habilitado' });
    }

    const secret = speakeasy.generateSecret({
      name: `Quilax (${user.email})`,
      issuer: 'Quilax',
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false,
      },
    });

    res.json({
      success: true,
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
    });
  } catch (error) {
    console.error('Error setting up 2FA:', error);
    res.status(500).json({ error: 'Error al configurar 2FA' });
  }
}

// Setup 2FA (guardar secreto sin habilitar)
router.post('/security/2fa/setup', auth, setupTwoFactorHandler);

// Alias histórico: enable → mismo flujo que setup
router.post('/security/2fa/enable', auth, setupTwoFactorHandler);

// Confirmar 2FA con TOTP
router.post('/security/2fa/confirm', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Código 2FA requerido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user?.twoFactorSecret) {
      return res.status(400).json({ error: 'Debes iniciar el setup de 2FA primero' });
    }

    if (user.twoFactorEnabled) {
      return res.json({
        success: true,
        security: { twoFactorEnabled: true },
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(token).trim(),
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Código 2FA incorrecto' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    res.json({
      success: true,
      security: { twoFactorEnabled: true },
    });
  } catch (error) {
    console.error('Error confirming 2FA:', error);
    res.status(500).json({ error: 'Error al confirmar 2FA' });
  }
});

/**
 * Rotar secreto 2FA (nuevo QR) cuando ya está activo.
 * Requiere el código TOTP actual — si perdiste el móvil, hace falta soporte.
 */
router.post('/security/2fa/reset', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Código 2FA requerido' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA no está activo' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: String(token).trim(),
      window: 1,
    });
    if (!verified) {
      return res.status(400).json({ error: 'Código 2FA incorrecto' });
    }

    const secret = speakeasy.generateSecret({
      name: `Quilax (${user.email})`,
      issuer: 'Quilax',
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorEnabled: false,
      },
    });

    res.json({
      success: true,
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      message: 'Escanea el nuevo QR y confirma el código para reactivar 2FA',
    });
  } catch (error) {
    console.error('Error resetting 2FA:', error);
    res.status(500).json({ error: 'Error al regenerar 2FA' });
  }
});

// Deshabilitar 2FA (password + TOTP)
router.post('/security/2fa/disable', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Código 2FA y contraseña son requeridos' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'Cuenta sin contraseña local' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: String(token).trim(),
        window: 1,
      });
      if (!verified) {
        return res.status(400).json({ error: 'Código 2FA incorrecto' });
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    res.json({
      success: true,
      message: '2FA deshabilitado',
      security: { twoFactorEnabled: false },
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
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.quizWinner.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      prizes: prizes.map((prize) => ({
        ...prize,
        quiz: prize.quiz ? { ...prize.quiz, category: null } : null,
      })),
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
          select: {
            id: true,
            phase: true,
            quiz: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    const winners = await prisma.quizWinner.findMany({
      where: { userId },
      select: { creditsWon: true, quizRunId: true },
    });
    const winnerRunIds = new Set(winners.map((w) => w.quizRunId).filter(Boolean));

    const quizRuns = participants.map((p) => p.quizRun).filter(Boolean);
    const totalQuizRuns = quizRuns.length;
    const finishedQuizRuns = quizRuns.filter((run) => run.phase === 'FINISHED');
    const wonQuizRuns = finishedQuizRuns.filter((run) => winnerRunIds.has(run.id));

    const winRate = totalQuizRuns > 0 ? (wonQuizRuns.length / totalQuizRuns) * 100 : 0;
    const completionRate = totalQuizRuns > 0 ? (finishedQuizRuns.length / totalQuizRuns) * 100 : 0;

    const scores = await prisma.quizScore.findMany({
      where: { userId },
      select: { score: true },
    });
    const averageScore = scores.length
      ? scores.reduce((sum, row) => sum + (row.score || 0), 0) / scores.length
      : 0;

    const totalPrizesWon = winners.reduce((sum, w) => sum + (w.creditsWon || 0), 0);

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

// GDPR data export
router.get('/data-export', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [
      profile,
      transactions,
      payments,
      withdrawals,
      quizEnrollments,
      participations,
      notifications,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
          fullName: true,
          username: true,
          bio: true,
          profilePhoto: true,
          balance: true,
          points: true,
          currency: true,
          country: true,
          nationality: true,
          province: true,
          gender: true,
          timezone: true,
          createdAt: true,
          emailVerified: true,
          idVerified: true,
          idVerifiedAt: true,
          idDocumentType: true,
          dateOfBirth: true,
          isOver18: true,
          language: true,
          profilePublic: true,
          showQuizHistory: true,
          showPrizes: true,
          isBankVerified: true,
          twoFactorEnabled: true,
          lastLoginAt: true,
        },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
      prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          creditsPurchased: true,
          paymentType: true,
          createdAt: true,
          failureReason: true,
        },
      }),
      prisma.withdraw.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          processingFee: true,
          createdAt: true,
          processedAt: true,
          failureReason: true,
        },
      }),
      prisma.quizEnrollment.findMany({
        where: { userId },
        include: {
          quiz: { select: { id: true, title: true, status: true } },
        },
        take: 2000,
      }),
      prisma.quizParticipant.findMany({
        where: { userId },
        take: 2000,
        select: {
          id: true,
          quizRunId: true,
          status: true,
          score: true,
          joinedAt: true,
        },
      }),
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          data: true,
          read: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        profile,
        transactions,
        payments,
        withdrawals,
        quizEnrollments,
        participations,
        notifications,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Error al exportar datos' });
  }
});

// Upcoming enrollments for current user
router.get('/me/upcoming-enrollments', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const enrollments = await prisma.quizEnrollment.findMany({
      where: { userId },
      include: {
        quiz: {
          include: {
            questions: { select: { id: true } },
            schedules: { orderBy: { scheduledAt: 'asc' } },
            quizRuns: {
              where: { phase: { not: 'FINISHED' } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            _count: { select: { enrollments: true } },
          },
        },
      },
    });

    const items = [];
    for (const enrollment of enrollments) {
      const quiz = enrollment.quiz;
      if (!quiz) continue;

      const futureSchedule = (quiz.schedules || []).find(
        (s) => new Date(s.scheduledAt) >= now
      );
      const activeRun = quiz.quizRuns?.[0] || null;
      const isActivePhase =
        activeRun &&
        (activeRun.phase === 'PRE_START' ||
          activeRun.phase === 'QUESTION_READ' ||
          activeRun.phase === 'QUESTION_ANSWER' ||
          activeRun.phase === 'QUESTION_CORRECTION' ||
          activeRun.phase === 'QUESTION_RANKING');

      if (!futureSchedule && !isActivePhase) continue;

      items.push({
        enrollmentId: enrollment.id,
        quizId: quiz.id,
        title: quiz.title,
        category: null,
        questionsCount: quiz.questions?.length || 0,
        enrollmentCount: quiz._count?.enrollments || 0,
        startsAt: futureSchedule?.scheduledAt || activeRun?.startedAt || null,
        lobby: activeRun?.phase === 'PRE_START',
        live: !!(activeRun && activeRun.phase !== 'PRE_START' && activeRun.phase !== 'FINISHED'),
        activeRunId: activeRun?.id || null,
      });
    }

    res.json({ enrollments: items });
  } catch (error) {
    console.error('Error upcoming enrollments:', error);
    res.status(500).json({ error: 'Error al obtener inscripciones próximas' });
  }
});

router.get('/me/recoverable-enrollments', auth, async (req, res) => {
  try {
    const enrollments = await findRecoverableEnrollments(req.user.id);
    res.json({ enrollments });
  } catch (error) {
    console.error('Error recoverable enrollments:', error);
    res.status(500).json({ error: 'Error al obtener inscripciones recuperables' });
  }
});

router.post('/me/recoverable-enrollments/recover-all', auth, async (req, res) => {
  try {
    const recoverable = await findRecoverableEnrollments(req.user.id);
    let refunded = 0;

    for (const item of recoverable) {
      const result = await refundEnrollment(req.user.id, item.quizId);
      if (result.refunded) refunded += 1;
    }

    res.json({ success: true, refunded });
  } catch (error) {
    console.error('Error recover-all enrollments:', error);
    res.status(500).json({ error: 'Error al recuperar inscripciones' });
  }
});

router.post('/me/recoverable-enrollments/:quizId/recover', auth, async (req, res) => {
  try {
    const quizId = Number(req.params.quizId);
    if (!quizId) return res.status(400).json({ error: 'quizId inválido' });

    const recoverable = await findRecoverableEnrollments(req.user.id);
    if (!recoverable.some((e) => e.quizId === quizId)) {
      return res.status(400).json({ error: 'Inscripción no recuperable' });
    }

    const result = await refundEnrollment(req.user.id, quizId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error recovering enrollment:', error);
    res.status(500).json({ error: 'Error al recuperar inscripción' });
  }
});

// Perfil público
router.get('/:userId/public', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'userId inválido' });

    const viewerId = await getOptionalViewerId(req);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        fullName: true,
        bio: true,
        profilePhoto: true,
        country: true,
        createdAt: true,
        profilePublic: true,
        showQuizHistory: true,
        showPrizes: true,
        points: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isOwner = viewerId === userId;
    if (!user.profilePublic && !isOwner) {
      return res.status(403).json({ error: 'Este perfil es privado', private: true });
    }

    const [followers, following, activeSeason] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      prisma.season.findFirst({
        where: {
          startsAt: { lte: new Date() },
          endsAt: { gt: new Date() },
        },
      }),
    ]);

    let seasonPoints = null;
    let seasonRank = null;
    if (activeSeason) {
      const su = await prisma.seasonUser.findUnique({
        where: {
          userId_seasonId: { userId, seasonId: activeSeason.id },
        },
      });
      seasonPoints = su?.points ?? 0;
      if (su) {
        const better = await prisma.seasonUser.count({
          where: {
            seasonId: activeSeason.id,
            points: { gt: su.points },
          },
        });
        seasonRank = better + 1;
      }
    }

    const { profilePublic, ...publicProfile } = user;

    res.json({
      success: true,
      profile: {
        ...publicProfile,
        statistics: {
          followers,
          following,
          seasonPoints,
          seasonRank,
        },
      },
    });
  } catch (error) {
    console.error('Error public profile:', error);
    res.status(500).json({ error: 'Error al obtener perfil público' });
  }
});

// Historial público / propio
router.get('/:userId/history', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!userId) return res.status(400).json({ error: 'userId inválido' });

    const viewer = await getOptionalViewer(req);
    const viewerId = viewer.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, showQuizHistory: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const isOwner = viewerId === userId;
    const isAdmin = viewer.role === 'ADMIN' || viewer.role === 'ADMIN_WORKER';
    if (!user.showQuizHistory && !isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Historial privado', private: true });
    }

    const [participants, scores, prizes, createdQuizzes] = await Promise.all([
      prisma.quizParticipant.findMany({
        where: { userId },
        take: 100,
        orderBy: { joinedAt: 'desc' },
        include: {
          quizRun: {
            select: {
              id: true,
              quizId: true,
              phase: true,
              finishedAt: true,
              quiz: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.quizScore.findMany({
        where: { userId },
        take: 100,
        orderBy: { lastAnswerAt: 'desc' },
        include: {
          quizRun: {
            select: {
              id: true,
              quizId: true,
              quiz: { select: { id: true, title: true } },
            },
          },
        },
      }),
      prisma.quizWinner.findMany({
        where: { userId },
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          quiz: { select: { id: true, title: true } },
        },
      }),
      prisma.quiz.findMany({
        where: { creatorId: userId },
        take: 50,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          language: true,
          createdAt: true,
        },
      }),
    ]);

    const participatedMap = new Map();
    for (const p of participants) {
      const key = p.quizRunId;
      participatedMap.set(key, {
        quizRunId: p.quizRunId,
        quizId: p.quizRun?.quizId,
        title: p.quizRun?.quiz?.title,
        status: p.status,
        score: p.score,
        joinedAt: p.joinedAt,
        finishedAt: p.quizRun?.finishedAt || null,
      });
    }
    for (const s of scores) {
      const existing = participatedMap.get(s.quizRunId) || {
        quizRunId: s.quizRunId,
        quizId: s.quizRun?.quizId,
        title: s.quizRun?.quiz?.title,
      };
      participatedMap.set(s.quizRunId, {
        ...existing,
        score: s.score ?? existing.score,
        lastAnswerAt: s.lastAnswerAt,
      });
    }

    res.json({
      history: {
        participated: Array.from(participatedMap.values()),
        prizes: prizes.map((p) => ({
          quizId: p.quizId,
          title: p.quiz?.title,
          creditsWon: p.creditsWon,
          percent: p.percent,
          type: p.type,
          createdAt: p.createdAt,
        })),
        created: createdQuizzes.map((q) => ({
          id: q.id,
          title: q.title,
          status: q.status,
          category: q.category,
          language: q.language,
          createdAt: q.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error profile history:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

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
    const shareUrl = `https://appquilax.com/profile/${userId}`;
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
    'BANK_TO_CREDITS': 'Compra de créditos',
    'ENROLLMENT_REFUND': 'Reembolso de inscripción'
  };

  let description = descriptions[transaction.type] || 'Transacción';
  
  if (transaction.quiz) {
    description += ` - ${transaction.quiz.title}`;
  }

  return description;
}

export default router;
