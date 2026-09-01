import RedisQueueManager from './redisQueueManager.js';
import OptimizedSocketHandler from './optimizedSocketHandler.js';
import { EventEmitter } from 'events';

class ScalabilityManager extends EventEmitter {
  constructor() {
    super();
    this.queueManager = null;
    this.socketHandler = null;
    this.isInitialized = false;
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      messagesProcessed: 0,
      averageLatency: 0,
      errorRate: 0,
      throughput: 0
    };
    
    this.initialize();
  }

  async initialize() {
    try {
      // Inicializar gestor de colas Redis de forma asíncrona
      this.queueManager = new RedisQueueManager();
      
      // Inicializar handler de WebSocket optimizado
      this.socketHandler = new OptimizedSocketHandler();
      
      // Configurar listeners
      this.setupEventListeners();
      
      // Iniciar monitoreo de rendimiento
      this.startPerformanceMonitoring();
      
      this.isInitialized = true;
      this.emit('initialized');
      
    } catch (error) {
      console.error('Failed to initialize Scalability Manager:', error);
      this.emit('error', error);
    }
  }

  setupEventListeners() {
    // Eventos del gestor de colas
    if (this.queueManager) {
      this.queueManager.on('connected', () => {
        console.log('🟢 Redis Queue Manager connected');
        this.emit('redisConnected');
      });

      this.queueManager.on('disconnected', () => {
        console.log('🔴 Redis Queue Manager disconnected');
        this.emit('redisDisconnected');
      });

      this.queueManager.on('jobCompleted', ({ queue, job, result }) => {
        this.metrics.messagesProcessed++;
        this.emit('jobCompleted', { queue, job, result });
      });

      this.queueManager.on('jobFailed', ({ queue, job, error }) => {
        this.metrics.errorRate++;
        this.emit('jobFailed', { queue, job, error });
      });

      this.queueManager.on('error', (error) => {
        console.error('🔴 Redis Queue Manager error:', error.message);
      });
    }

    // Eventos del handler de WebSocket
    if (this.socketHandler) {
      this.socketHandler.on('userConnected', ({ userId, ws }) => {
        this.metrics.totalConnections++;
        this.metrics.activeConnections++;
        this.emit('userConnected', { userId, ws });
      });

      this.socketHandler.on('userDisconnected', ({ userId }) => {
        this.metrics.activeConnections--;
        this.emit('userDisconnected', { userId });
      });

      this.socketHandler.on('error', ({ userId, error }) => {
        this.metrics.errorRate++;
        this.emit('socketError', { userId, error });
      });
    }
  }

  startPerformanceMonitoring() {
    // Monitoreo cada 30 segundos
    setInterval(() => {
      this.updateMetrics();
      this.checkPerformanceThresholds();
    }, 30000);

    // Limpieza cada 2 minutos
    setInterval(() => {
      this.performCleanup();
    }, 120000);

    // Reporte cada 5 minutos
    setInterval(() => {
      this.generatePerformanceReport();
    }, 300000);
  }

  updateMetrics() {
    // Actualizar métricas en tiempo real
    const socketStats = this.socketHandler ? this.socketHandler.getStats() : {};
    
    this.metrics = {
      ...this.metrics,
      totalConnections: socketStats.totalConnections || 0,
      activeConnections: socketStats.totalConnections || 0,
      totalRooms: socketStats.totalRooms || 0,
      pendingMessages: socketStats.pendingMessages || 0
    };
  }

  checkPerformanceThresholds() {
    const { activeConnections, errorRate, averageLatency } = this.metrics;
    
    // Alertas de rendimiento
    if (activeConnections > 1500000) {
      this.emit('highConnections', { count: activeConnections });
    }
    
    if (errorRate > activeConnections * 0.05) {
      this.emit('highErrorRate', { rate: errorRate });
    }
    
    if (averageLatency > 500) {
      this.emit('highLatency', { latency: averageLatency });
    }
  }

  performCleanup() {
    // Limpiar conexiones inactivas
    if (this.socketHandler) {
      this.socketHandler.cleanupInactiveConnections();
    }
    
    // Limpiar datos antiguos en Redis
    if (this.queueManager) {
      try {
        this.queueManager.addJob('cleanup', { type: 'old-sessions' });
        this.queueManager.addJob('cleanup', { type: 'old-notifications' });
        this.queueManager.addJob('cleanup', { type: 'quiz-data' });
      } catch (error) {
        // Silently handle cleanup errors
      }
    }
  }

  generatePerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      systemLoad: this.getSystemLoad(),
      recommendations: this.getRecommendations()
    };
    
    this.emit('performanceReport', report);
  }

  getSystemLoad() {
    const { activeConnections } = this.metrics;
    const connectionUtilization = (activeConnections / 2000000) * 100;
    
    return {
      connectionUtilization: connectionUtilization.toFixed(2) + '%',
      status: connectionUtilization > 80 ? 'CRITICAL' : 
              connectionUtilization > 60 ? 'WARNING' : 'HEALTHY'
    };
  }

  getRecommendations() {
    const { activeConnections, errorRate, averageLatency } = this.metrics;
    const recommendations = [];
    
    if (activeConnections > 1000000) {
      recommendations.push('Consider horizontal scaling - add more server instances');
    }
    
    if (errorRate > activeConnections * 0.02) {
      recommendations.push('Investigate error sources and implement better error handling');
    }
    
    if (averageLatency > 300) {
      recommendations.push('Optimize message processing and database queries');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is performing well - continue monitoring');
    }
    
    return recommendations;
  }

  // Métodos públicos para manejo de carga
  async handleQuizAnswer(answerData) {
    if (!this.isInitialized) {
      return { success: false, error: 'Scalability Manager not initialized' };
    }
    
    try {
      return await this.queueManager.addJob('quiz-answers', answerData, {
        priority: 1,
        delay: 0
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handlePrizeDistribution(prizeData) {
    if (!this.isInitialized) {
      return { success: false, error: 'Scalability Manager not initialized' };
    }
    
    try {
      return await this.queueManager.addJob('prize-distribution', prizeData, {
        priority: 2,
        delay: 0
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleNotification(notificationData) {
    if (!this.isInitialized) {
      return { success: false, error: 'Scalability Manager not initialized' };
    }
    
    try {
      return await this.queueManager.addJob('notifications', notificationData, {
        priority: 1,
        delay: 0
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleRankingRequest(rankingData) {
    if (!this.isInitialized) {
      return { success: false, error: 'Scalability Manager not initialized' };
    }
    
    try {
      return await this.queueManager.addJob('rankings', rankingData, {
        priority: 3,
        delay: 0
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Métodos de control
  getMetrics() {
    return { ...this.metrics };
  }

  getHealthStatus() {
    const { activeConnections, errorRate, averageLatency } = this.metrics;
    const connectionUtilization = (activeConnections / 2000000) * 100;
    
    let status = 'HEALTHY';
    if (connectionUtilization > 80 || errorRate > activeConnections * 0.05 || averageLatency > 500) {
      status = 'CRITICAL';
    } else if (connectionUtilization > 60 || errorRate > activeConnections * 0.02 || averageLatency > 300) {
      status = 'WARNING';
    }
    
    return {
      status,
      connectionUtilization: connectionUtilization.toFixed(2) + '%',
      activeConnections,
      targetConnections: 2000000,
      errorRate,
      averageLatency
    };
  }

  async shutdown() {
    if (this.socketHandler) {
      this.socketHandler.closeAll();
    }
    
    if (this.queueManager) {
      await this.queueManager.shutdown();
    }
    
    this.isInitialized = false;
  }
}

// Instancia global
const scalabilityManager = new ScalabilityManager();

export default scalabilityManager;
export { ScalabilityManager };
