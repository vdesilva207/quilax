/**
 * 📦 BATCH OPERATIONS - OPERACIONES MASIVAS OPTIMIZADAS
 */

import { prisma } from '../config/database.js';
import { distributedCache } from '../config/redisCluster.js';

class BatchOperations {
  constructor() {
    this.batchSize = 1000;
    this.maxConcurrency = 100;
    this.queue = [];
    this.processing = false;
  }

  // Batch insert con transacciones
  async batchInsert(model, data, options = {}) {
    const {
      batchSize = this.batchSize,
      skipDuplicates = true,
      updateDuplicates = false,
      onProgress = null
    } = options;

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    const results = {
      success: 0,
      failed: 0,
      duplicates: 0,
      total: data.length,
      errors: []
    };

    console.log(`📦 Starting batch insert: ${data.length} records in batches of ${batchSize}`);

    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(data.length / batchSize);

      try {
        // Usar transacción para consistencia
        const result = await prisma.$transaction(async (tx) => {
          if (skipDuplicates) {
            return await tx[model].createMany({
              data: batch,
              skipDuplicates: true
            });
          } else if (updateDuplicates) {
            // Upsert para actualizar duplicados
            const upsertResults = await Promise.all(
              batch.map(item => 
                tx[model].upsert({
                  where: this.getUniqueKey(model, item),
                  create: item,
                  update: item
                })
              )
            );
            return { count: upsertResults.length };
          } else {
            return await tx[model].createMany({
              data: batch
            });
          }
        });

        results.success += result.count || batch.length;
        
        if (onProgress) {
          onProgress({
            batchNumber,
            totalBatches,
            processed: Math.min(i + batchSize, data.length),
            total: data.length,
            percentage: ((Math.min(i + batchSize, data.length) / data.length) * 100).toFixed(2)
          });
        }

      } catch (error) {
        console.error(`❌ Batch ${batchNumber} insert error:`, error.message);
        results.failed += batch.length;
        results.errors.push({
          batch: batchNumber,
          error: error.message,
          records: batch.length
        });
      }
    }

    console.log(`✅ Batch insert completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  // Batch update optimizado
  async batchUpdate(model, updates, options = {}) {
    const {
      batchSize = this.batchSize,
      onProgress = null
    } = options;

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error('Updates must be a non-empty array');
    }

    const results = {
      success: 0,
      failed: 0,
      total: updates.length,
      errors: []
    };

    console.log(`📦 Starting batch update: ${updates.length} records`);

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        // Procesar en paralelo dentro del batch
        const updatePromises = batch.map(update => 
          prisma[model].update({
            where: update.where,
            data: update.data
          })
        );

        const batchResults = await Promise.allSettled(updatePromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({
              batch: batchNumber,
              record: index,
              error: result.reason.message
            });
          }
        });

        if (onProgress) {
          onProgress({
            batchNumber,
            processed: Math.min(i + batchSize, updates.length),
            total: updates.length,
            percentage: ((Math.min(i + batchSize, updates.length) / updates.length) * 100).toFixed(2)
          });
        }

      } catch (error) {
        console.error(`❌ Batch ${batchNumber} update error:`, error.message);
        results.failed += batch.length;
        results.errors.push({
          batch: batchNumber,
          error: error.message
        });
      }
    }

    console.log(`✅ Batch update completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  // Batch delete optimizado
  async batchDelete(model, whereConditions, options = {}) {
    const {
      batchSize = this.batchSize,
      onProgress = null
    } = options;

    if (!Array.isArray(whereConditions) || whereConditions.length === 0) {
      throw new Error('Where conditions must be a non-empty array');
    }

    const results = {
      success: 0,
      failed: 0,
      total: whereConditions.length,
      errors: []
    };

    console.log(`📦 Starting batch delete: ${whereConditions.length} records`);

    for (let i = 0; i < whereConditions.length; i += batchSize) {
      const batch = whereConditions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        // Usar $transactionRaw para delete masivo
        const deletePromises = batch.map(where => 
          prisma[model].delete({ where })
        );

        const batchResults = await Promise.allSettled(deletePromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({
              batch: batchNumber,
              error: result.reason.message
            });
          }
        });

        if (onProgress) {
          onProgress({
            batchNumber,
            processed: Math.min(i + batchSize, whereConditions.length),
            total: whereConditions.length,
            percentage: ((Math.min(i + batchSize, whereConditions.length) / whereConditions.length) * 100).toFixed(2)
          });
        }

      } catch (error) {
        console.error(`❌ Batch ${batchNumber} delete error:`, error.message);
        results.failed += batch.length;
        results.errors.push({
          batch: batchNumber,
          error: error.message
        });
      }
    }

    console.log(`✅ Batch delete completed: ${results.success} success, ${results.failed} failed`);
    return results;
  }

  // Batch read con cache
  async batchRead(model, queries, options = {}) {
    const {
      batchSize = 100, // Batch más pequeño para reads
      useCache = true,
      cacheTTL = 3600,
      onProgress = null
    } = options;

    if (!Array.isArray(queries) || queries.length === 0) {
      throw new Error('Queries must be a non-empty array');
    }

    const results = {
      success: 0,
      failed: 0,
      cached: 0,
      total: queries.length,
      data: [],
      errors: []
    };

    console.log(`📦 Starting batch read: ${queries.length} queries`);

    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      try {
        const readPromises = batch.map(async (query, index) => {
          // Cache key basada en el query
          const cacheKey = `batch:${model}:${JSON.stringify(query)}`;
          
          if (useCache) {
            const cached = await distributedCache.get(cacheKey);
            if (cached) {
              results.cached++;
              return { index, data: cached, cached: true };
            }
          }

          const data = await prisma[model].findMany(query);
          
          if (useCache) {
            await distributedCache.set(cacheKey, data, cacheTTL);
          }
          
          return { index, data, cached: false };
        });

        const batchResults = await Promise.allSettled(readPromises);
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            results.success++;
            results.data[result.value.index] = result.value.data;
            if (result.value.cached) {
              results.cached++;
            }
          } else {
            results.failed++;
            results.errors.push({
              batch: batchNumber,
              error: result.reason.message
            });
          }
        });

        if (onProgress) {
          onProgress({
            batchNumber,
            processed: Math.min(i + batchSize, queries.length),
            total: queries.length,
            percentage: ((Math.min(i + batchSize, queries.length) / queries.length) * 100).toFixed(2),
            cached: results.cached
          });
        }

      } catch (error) {
        console.error(`❌ Batch ${batchNumber} read error:`, error.message);
        results.failed += batch.length;
        results.errors.push({
          batch: batchNumber,
          error: error.message
        });
      }
    }

    console.log(`✅ Batch read completed: ${results.success} success, ${results.cached} cached, ${results.failed} failed`);
    return results;
  }

  // Operaciones específicas para usuarios
  async batchCreateUsers(users, options = {}) {
    return this.batchInsert('User', users, {
      ...options,
      skipDuplicates: true
    });
  }

  async batchUpdateProfiles(profiles, options = {}) {
    const updates = profiles.map(profile => ({
      where: { id: profile.id },
      data: {
        fullName: profile.fullName,
        dateOfBirth: profile.dateOfBirth,
        isOver18: profile.isOver18,
        bankAccountIban: profile.bankAccountIban,
        bankAccountName: profile.bankAccountName,
        bankAccountBic: profile.bankAccountBic,
        isBankVerified: profile.isBankVerified
      }
    }));

    return this.batchUpdate('User', updates, options);
  }

  // Operaciones específicas para quizzes
  async batchCreateQuizzes(quizzes, options = {}) {
    return this.batchInsert('Quiz', quizzes, {
      ...options,
      skipDuplicates: true
    });
  }

  async batchCreateQuizQuestions(questions, options = {}) {
    return this.batchInsert('QuizQuestion', questions, {
      ...options,
      batchSize: 500 // Batch más pequeño para questions
    });
  }

  async batchValidateQuizzes(quizzes, options = {}) {
    const results = {
      valid: 0,
      invalid: 0,
      total: quizzes.length,
      details: []
    };

    console.log(`📦 Starting batch validation: ${quizzes.length} quizzes`);

    for (let i = 0; i < quizzes.length; i += this.batchSize) {
      const batch = quizzes.slice(i, i + this.batchSize);
      
      const validationPromises = batch.map(async (quiz) => {
        // Cache key para validación
        const quizHash = this.generateQuizHash(quiz);
        const cacheKey = `validation:${quizHash}`;
        
        // Intentar obtener del cache
        let validationResult = await distributedCache.getValidationResult(quizHash);
        
        if (!validationResult) {
          // Realizar validación
          validationResult = this.validateQuiz(quiz);
          
          // Cache del resultado
          await distributedCache.cacheValidationResult(quizHash, validationResult, 3600);
        }
        
        return {
          quiz,
          validationResult,
          cached: !!validationResult
        };
      });

      const batchResults = await Promise.allSettled(validationPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { validationResult } = result.value;
          
          if (validationResult.isValid) {
            results.valid++;
          } else {
            results.invalid++;
          }
          
          results.details.push(result.value);
        } else {
          results.invalid++;
          results.details.push({
            error: result.reason.message
          });
        }
      });
    }

    console.log(`✅ Batch validation completed: ${results.valid} valid, ${results.invalid} invalid`);
    return results;
  }

  // Utilidades
  getUniqueKey(model, data) {
    const uniqueKeys = {
      User: { email: data.email },
      Quiz: { contentHash: data.contentHash },
      QuizQuestion: { id: data.id }
    };
    
    return uniqueKeys[model] || { id: data.id };
  }

  generateQuizHash(quiz) {
    const hashInput = JSON.stringify({
      title: quiz.title,
      questions: quiz.questions?.length || 0,
      estimatedDuration: quiz.estimatedDuration
    });
    
    return require('crypto').createHash('md5').update(hashInput).digest('hex');
  }

  validateQuiz(quiz) {
    const errors = [];
    const warnings = [];

    // Validación de preguntas
    const questionCount = quiz.questions?.length || 0;
    if (questionCount < 5) {
      errors.push('Un quiz debe tener al menos 5 preguntas');
    }
    if (questionCount > 50) {
      errors.push('Un quiz no puede tener más de 50 preguntas');
    }

    // Validación de duración
    if (quiz.estimatedDuration > 20) {
      errors.push(`El quiz dura ${quiz.estimatedDuration} minutos. El máximo permitido es 20 minutos`);
    }

    // Advertencias
    if (quiz.estimatedDuration >= 18) {
      warnings.push(`El quiz dura ${quiz.estimatedDuration} minutos. Está cerca del límite máximo de 20 minutos`);
    }

    if (questionCount >= 40) {
      warnings.push(`El quiz tiene ${questionCount} preguntas. Asegúrate de que la duración no exceda 20 minutos`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metrics: {
        questionCount,
        estimatedDuration: quiz.estimatedDuration || 0,
        maxAllowedDuration: 20,
        minQuestions: 5,
        maxQuestions: 50
      }
    };
  }

  // Queue processing para operaciones asíncronas
  addToQueue(operation) {
    this.queue.push(operation);
    
    if (!this.processing) {
      this.processQueue();
    }
  }

  async processQueue() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      
      try {
        await this.executeOperation(operation);
      } catch (error) {
        console.error('❌ Queue operation error:', error);
      }
    }
    
    this.processing = false;
  }

  async executeOperation(operation) {
    const { type, model, data, options } = operation;
    
    switch (type) {
      case 'insert':
        return await this.batchInsert(model, data, options);
      case 'update':
        return await this.batchUpdate(model, data, options);
      case 'delete':
        return await this.batchDelete(model, data, options);
      case 'read':
        return await this.batchRead(model, data, options);
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }
}

// Instancia global
const batchOperations = new BatchOperations();

export {
  batchOperations,
  BatchOperations
};
