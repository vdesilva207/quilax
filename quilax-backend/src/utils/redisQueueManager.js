import Redis from 'ioredis';
import Bull from 'bull';
import { EventEmitter } from 'events';

class RedisQueueManager extends EventEmitter {
  constructor() {
    super();
    this.redis = null;
    this.queues = new Map();
    this.isConnected = false;
    this.connectionRetries = 0;
    this.maxRetries = 3;
    this.isInitializing = false;
    
    setTimeout(() => this.initializeRedis(), 100);
  }

  async initializeRedis() {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Configuración de Redis
      this.redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        db: process.env.REDIS_DB || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        keepAlive: 30000,
        family: 4,
        keyPrefix: 'quilax:',
        enableReadyCheck: false,
        maxLoadingTimeout: 2000,
        connectTimeout: 5000,
        commandTimeout: 3000,
        lazyConnect: true
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.connectionRetries = 0;
        this.emit('connected');
      });

      this.redis.on('error', (error) => {
        this.isConnected = false;
        this.emit('error', error);
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        this.emit('disconnected');
      });

      // Conectar con timeout
      await Promise.race([
        this.redis.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Redis connection timeout')), 10000)
        )
      ]);
      
      // Inicializar colas
      this.initializeQueues();
      
    } catch (error) {
      // Failed to initialize Redis
      this.isInitializing = false;
      this.handleReconnection();
    }
  }

  handleReconnection() {
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      const delay = Math.min(1000 * Math.pow(2, this.connectionRetries), 5000); // Max 5s
      
      // Attempting to reconnect to Redis
      
      setTimeout(() => {
        this.isInitializing = false;
        this.initializeRedis();
      }, delay);
    } else {
      this.emit('maxRetriesReached');
    }
  }

  initializeQueues() {
    try {
      // Initializing queues
      
      this.createQueue('quiz-answers', {
        concurrency: 50,
        limiter: {
          max: 500,
          duration: 60000
        }
      });

      this.createQueue('prize-distribution', {
        concurrency: 25,
        limiter: {
          max: 250,
          duration: 60000
        }
      });

      this.createQueue('notifications', {
        concurrency: 100,
        limiter: {
          max: 1000,
          duration: 60000
        }
      });

      this.createQueue('rankings', {
        concurrency: 10,
        limiter: {
          max: 100,
          duration: 60000
        }
      });

      this.createQueue('cleanup', {
        concurrency: 3,
        limiter: {
          max: 30,
          duration: 60000
        }
      });

      // All queues initialized successfully
    } catch (error) {
      console.error('❌ Failed to initialize queues:', error.message);
    }
  }

  createQueue(name, options = {}) {
    try {
      const queue = new Bull(name, {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379,
          db: process.env.REDIS_DB || 0,
          keyPrefix: 'bull:',
          maxRetriesPerRequest: 1 // Reducido
        },
        defaultJobOptions: {
          removeOnComplete: 50, // Reducido
          removeOnFail: 25,     // Reducido
          attempts: 2,          // Reducido
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        },
        settings: {
          stalledInterval: 60000, // Aumentado
          maxStalledCount: 2,
          guardInterval: 10000
        },
        ...options
      });

      // Configurar procesadores por defecto
      this.setupQueueProcessors(queue, name);

      // Eventos de la cola (simplificados)
      queue.on('completed', (job, result) => {
        if (job.id % 100 === 0) { // Loggear solo cada 100 jobs
          console.log(`✅ Queue ${name}: Job ${job.id} completed`);
        }
        this.emit('jobCompleted', { queue: name, job, result });
      });

      queue.on('failed', (job, error) => {
        // Queue job failed
        this.emit('jobFailed', { queue: name, job, error });
      });

      queue.on('stalled', (job) => {
        // Queue job stalled
        this.emit('jobStalled', { queue: name, job });
      });

      this.queues.set(name, queue);
      return queue;
    } catch (error) {
      // Failed to create queue
      return null;
    }
  }

  setupQueueProcessors(queue, name) {
    try {
      switch (name) {
        case 'quiz-answers':
          queue.process(async (job) => {
            return this.processQuizAnswer(job.data);
          });
          break;

        case 'prize-distribution':
          queue.process(async (job) => {
            return this.processPrizeDistribution(job.data);
          });
          break;

        case 'notifications':
          queue.process(async (job) => {
            return this.processNotification(job.data);
          });
          break;

        case 'rankings':
          queue.process(async (job) => {
            return this.processRanking(job.data);
          });
          break;

        case 'cleanup':
          queue.process(async (job) => {
            return this.processCleanup(job.data);
          });
          break;
      }
    } catch (error) {
      // Failed to setup processor for queue
    }
  }

  async processQuizAnswer(data) {
    const { userId, quizId, answer, questionId, timestamp } = data;
    
    try {
      if (this.isConnected && this.redis) {
        await this.redis.hset(
          `quiz:${quizId}:answers:${userId}`,
          `question:${questionId}`,
          JSON.stringify({ answer, timestamp })
        );

        // Actualizar puntuación en Redis
        const currentScore = await this.redis.hget(`quiz:${quizId}:scores`, userId) || 0;
        const newScore = parseInt(currentScore) + (answer.isCorrect ? 10 : 0);
        await this.redis.hset(`quiz:${quizId}:scores`, userId, newScore);

        // Notificar en tiempo real
        await this.addJob('notifications', {
          type: 'answer-processed',
          userId,
          quizId,
          questionId,
          score: newScore
        }, {
          priority: 1,
          delay: 0
        });
      }

      return { success: true, score: answer.isCorrect ? 10 : 0 };
    } catch (error) {
      // Error processing quiz answer
      throw error;
    }
  }

  async processPrizeDistribution(data) {
    const { quizId, winners, totalPrizePool } = data;
    
    try {
      for (const winner of winners) {
        if (this.isConnected && this.redis) {
          await this.redis.lpush(
            'transactions:batch',
            JSON.stringify({
              type: 'PRIZE_PAYOUT',
              userId: winner.userId,
              amount: winner.prize,
              quizId,
              timestamp: Date.now()
            })
          );
        }
      }

      // Notificar a ganadores
      await this.addJob('notifications', {
        type: 'prize-distributed',
        quizId,
        winners: winners.map(w => w.userId)
      });

      return { success: true, winnersProcessed: winners.length };
    } catch (error) {
      // Error processing prize distribution
      throw error;
    }
  }

  async processNotification(data) {
    const { type, userId, ...payload } = data;
    
    try {
      const notification = {
        type,
        payload,
        timestamp: Date.now()
      };

      if (this.isConnected && this.redis) {
        await this.redis.publish(
          `notifications:${userId}`,
          JSON.stringify(notification)
        );

        // Save for offline notifications
        await this.redis.lpush(
          `notifications:${userId}:offline`,
          JSON.stringify(notification)
        );

        // Limit offline notifications to 50 per user
        await this.redis.ltrim(`notifications:${userId}:offline`, 0, 49);
      }

      return { success: true };
    } catch (error) {
      // Error processing notification
      throw error;
    }
  }

  async processRanking(data) {
    const { type, filters = {} } = data;
    
    try {
      let cacheKey = `rankings:${type}`;
      
      if (filters.category) cacheKey += `:category:${filters.category}`;
      if (filters.difficulty) cacheKey += `:difficulty:${filters.difficulty}`;
      if (filters.period) cacheKey += `:period:${filters.period}`;

      const rankings = {
        type,
        filters,
        data: [],
        timestamp: Date.now()
      };

      if (this.isConnected && this.redis) {
        await this.redis.setex(cacheKey, 300, JSON.stringify(rankings));
      }

      return { success: true, cacheKey };
    } catch (error) {
      // Error processing ranking
      throw error;
    }
  }

  async processCleanup(data) {
    const { type } = data;
    
    try {
      if (!this.isConnected || !this.redis) {
        return { success: true, type };
      }

      switch (type) {
        case 'old-sessions':
          const sessions = await this.redis.keys('session:*');
          for (const session of sessions.slice(0, 100)) {
            const ttl = await this.redis.ttl(session);
            if (ttl === -1) {
              await this.redis.expire(session, 3600);
            }
          }
          break;

        case 'old-notifications':
          const notificationKeys = await this.redis.keys('notifications:*:offline');
          for (const key of notificationKeys.slice(0, 50)) {
            await this.redis.ltrim(key, 0, 49);
          }
          break;

        case 'quiz-data':
          const quizKeys = await this.redis.keys('quiz:*');
          for (const key of quizKeys.slice(0, 100)) {
            const ttl = await this.redis.ttl(key);
            if (ttl === -1) {
              await this.redis.expire(key, 86400);
            }
          }
          break;
      }

      return { success: true, type };
    } catch (error) {
      // Error processing cleanup
      throw error;
    }
  }

  async addJob(queueName, data, options = {}) {
    if (!this.isConnected || !this.queues.has(queueName)) {
      return { id: Date.now(), data, options };
    }

    try {
      const queue = this.queues.get(queueName);
      return await queue.add(data, options);
    } catch (error) {
      return { id: Date.now(), data, options };
    }
  }

  async getQueueStats() {
    const stats = {};
    
    for (const [name, queue] of this.queues) {
      try {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        
        stats[name] = {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        };
      } catch (error) {
        stats[name] = {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          error: error.message
        };
      }
    }

    return stats;
  }

  async getRedisInfo() {
    try {
      if (!this.isConnected || !this.redis) {
        return { 
          isConnected: false, 
          message: 'Redis not connected' 
        };
      }

      const info = await this.redis.info('memory');
      const memory = info.split('\r\n').find(line => line.startsWith('used_memory_human:'));
      const clients = await this.redis.info('clients');
      const connectedClients = clients.split('\r\n').find(line => line.startsWith('connected_clients:'));
      
      return {
        memory: memory ? memory.split(':')[1] : 'unknown',
        connectedClients: connectedClients ? parseInt(connectedClients.split(':')[1]) : 0,
        isConnected: this.isConnected
      };
    } catch (error) {
      return { 
        error: error.message, 
        isConnected: false 
      };
    }
  }

  async shutdown() {
    // Shutting down Redis Queue Manager
    
    // Cerrar todas las colas
    for (const [name, queue] of this.queues) {
      try {
        await queue.close();
        // Queue closed
      } catch (error) {
        console.error(`❌ Error closing queue ${name}:`, error.message);
      }
    }
    
    // Cerrar conexión Redis
    if (this.redis) {
      try {
        await this.redis.quit();
        // Redis connection closed
      } catch (error) {
        // Error closing Redis connection
      }
    }
    
    this.queues.clear();
    this.isConnected = false;
    this.isInitializing = false;
  }
}

export default RedisQueueManager;
