import redis from "../lib/redis.js";

const METRICS_TTL = 60; // 1 minute
const ALERT_THRESHOLDS = {
  concurrent_users: 10000,
  response_time_p95: 500, // ms
  error_rate: 0.05, // 5%
  memory_usage: 0.8, // 80%
  cpu_usage: 0.8, // 80%
  db_connections: 0.9, // 90% of pool
};

class ScalingMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = [];
  }

  // Registrar métricas en tiempo real
  async recordMetric(name, value, tags = {}) {
    const timestamp = Date.now();
    const key = `metrics:${name}:${Math.floor(timestamp / 60000)}`; // Group by minute
    
    const metric = {
      name,
      value,
      tags,
      timestamp,
      key
    };

    // Guardar en Redis para análisis
    await redis.zadd(key, timestamp, JSON.stringify(metric));
    await redis.expire(key, METRICS_TTL);

    // Actualizar métricas locales
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name).push(metric);

    // Limpiar métricas viejas (mantiene últimas 1000)
    const metrics = this.metrics.get(name);
    if (metrics.length > 1000) {
      this.metrics.set(name, metrics.slice(-1000));
    }

    // Verificar alertas
    this.checkThresholds(name, value);
  }

  // Verificar umbrales y generar alertas
  checkThresholds(metricName, value) {
    const threshold = ALERT_THRESHOLDS[metricName];
    if (threshold && value > threshold) {
      const alert = {
        metric: metricName,
        value,
        threshold,
        severity: this.getSeverity(value, threshold),
        timestamp: Date.now(),
        message: `${metricName} exceeded threshold: ${value} > ${threshold}`
      };

      this.alerts.push(alert);
      this.sendAlert(alert);
    }
  }

  getSeverity(value, threshold) {
    const ratio = value / threshold;
    if (ratio > 2) return 'critical';
    if (ratio > 1.5) return 'high';
    if (ratio > 1.1) return 'medium';
    return 'low';
  }

  // Enviar alerta (podría integrar con Slack, email, etc.)
  async sendAlert(alert) {
    console.error(`🚨 SCALING ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Guardar alerta en Redis
    await redis.lpush('alerts', JSON.stringify(alert));
    await redis.ltrim('alerts', 0, 999); // Mantener últimas 1000 alertas
  }

  // Obtener estadísticas de una métrica
  async getMetricStats(name, timeRange = 300000) { // 5 minutes default
    const now = Date.now();
    const startTime = now - timeRange;
    
    const metrics = this.metrics.get(name) || [];
    const recentMetrics = metrics.filter(m => m.timestamp >= startTime);
    
    if (recentMetrics.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, p95: 0 };
    }

    const values = recentMetrics.map(m => m.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const min = values[0];
    const max = values[count - 1];
    const p95Index = Math.floor(count * 0.95);
    const p95 = values[p95Index] || max;

    return { count, avg, min, max, p95 };
  }

  // Monitorear salud del sistema
  async getSystemHealth() {
    const health = {
      timestamp: Date.now(),
      status: 'healthy',
      metrics: {},
      alerts: this.alerts.slice(-10) // Últimas 10 alertas
    };

    // Métricas del sistema
    const memUsage = process.memoryUsage();
    health.metrics.memory = {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
      usagePercent: memUsage.heapUsed / memUsage.heapTotal
    };

    // Métricas de Redis
    try {
      const redisInfo = await redis.info('memory');
      const redisMemory = parseInt(redisInfo.split('\r\n')
        .find(line => line.startsWith('used_memory:'))
        ?.split(':')[1] || '0');
      
      health.metrics.redis = {
        usedMemory: redisMemory,
        connected: true
      };
    } catch (error) {
      health.metrics.redis = { connected: false, error: error.message };
      health.status = 'degraded';
    }

    // Métricas de concurrencia
    const concurrentUsers = await this.getMetricStats('concurrent_users');
    const responseTime = await this.getMetricStats('response_time');
    const errorRate = await this.getMetricStats('error_rate');

    health.metrics.performance = {
      concurrentUsers,
      responseTime,
      errorRate
    };

    // Determinar estado general
    if (health.metrics.memory.usagePercent > 0.9) {
      health.status = 'critical';
    } else if (responseTime.p95 > 1000 || errorRate.avg > 0.1) {
      health.status = 'degraded';
    }

    return health;
  }

  // Limpiar métricas viejas
  async cleanup() {
    const now = Date.now();
    const cutoffTime = now - (METRICS_TTL * 1000);

    for (const [name, metrics] of this.metrics.entries()) {
      const filtered = metrics.filter(m => m.timestamp > cutoffTime);
      this.metrics.set(name, filtered);
    }
  }
}

// Instancia global del monitor
export const scalingMonitor = new ScalingMonitor();

// Middleware para registrar métricas de cada request
export function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', async () => {
    const responseTime = Date.now() - startTime;
    const isError = res.statusCode >= 400;
    
    // Registrar métricas
    await scalingMonitor.recordMetric('response_time', responseTime, {
      method: req.method,
      route: req.route?.path || req.path,
      statusCode: res.statusCode
    });

    await scalingMonitor.recordMetric('error_rate', isError ? 1 : 0, {
      method: req.method,
      route: req.route?.path || req.path
    });

    // Registrar usuarios concurrentes (para endpoints de quiz)
    if (req.path.includes('/quiz-play')) {
      await scalingMonitor.recordMetric('concurrent_users', 1, {
        action: 'quiz_join',
        userId: req.user?.id
      });
    }
  });

  next();
}

// Endpoint de health check para load balancers
export async function healthCheck(req, res) {
  try {
    const health = await scalingMonitor.getSystemHealth();
    
    res.status(health.status === 'critical' ? 503 : 200).json(health);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: Date.now()
    });
  }
}

// Cleanup periódico
setInterval(() => {
  scalingMonitor.cleanup();
}, 60000); // Cada minuto
