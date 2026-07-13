import promClient from 'prom-client';
import os from 'os';
import fs from 'fs';

// Configuración de métricas Prometheus para monitoreo de 2M usuarios
const register = new promClient.Registry();

// Métricas HTTP
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestsInProgress = new promClient.Gauge({
  name: 'http_requests_in_progress',
  help: 'Number of HTTP requests currently in progress',
  labelNames: ['method', 'route'],
});

// Métricas de base de datos
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
});

const dbConnectionsActive = new promClient.Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections',
});

const dbConnectionsIdle = new promClient.Gauge({
  name: 'db_connections_idle',
  help: 'Number of idle database connections',
});

// Métricas de Redis
const redisCommandsDuration = new promClient.Histogram({
  name: 'redis_commands_duration_seconds',
  help: 'Duration of Redis commands in seconds',
  labelNames: ['command'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1],
});

const redisCacheHitRate = new promClient.Gauge({
  name: 'redis_cache_hit_rate',
  help: 'Redis cache hit rate',
});

// Métricas de Socket.IO
const socketConnections = new promClient.Gauge({
  name: 'socket_connections',
  help: 'Number of active Socket.IO connections',
  labelNames: ['namespace'],
});

const socketMessages = new promClient.Counter({
  name: 'socket_messages_total',
  help: 'Total number of Socket.IO messages',
  labelNames: ['event', 'direction'],
});

// Métricas de usuarios
const activeUsers = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users',
  labelNames: ['type'], // 'quiz', 'auth', 'general'
});

const usersLoggedIn = new promClient.Counter({
  name: 'users_logged_in_total',
  help: 'Total number of user logins',
});

const usersRegistered = new promClient.Counter({
  name: 'users_registered_total',
  help: 'Total number of user registrations',
});

// Métricas de quizzes
const quizzesCreated = new promClient.Counter({
  name: 'quizzes_created_total',
  help: 'Total number of quizzes created',
});

const quizzesPlayed = new promClient.Counter({
  name: 'quizzes_played_total',
  help: 'Total number of quizzes played',
});

const quizParticipants = new promClient.Gauge({
  name: 'quiz_participants',
  help: 'Number of participants in active quizzes',
  labelNames: ['quiz_id'],
});

// Métricas de errores
const errorsTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'severity'],
});

// Métricas de sistema
const cpuUsage = new promClient.Gauge({
  name: 'cpu_usage_percent',
  help: 'CPU usage percentage',
});

const memoryUsage = new promClient.Gauge({
  name: 'memory_usage_bytes',
  help: 'Memory usage in bytes',
});

const diskUsage = new promClient.Gauge({
  name: 'disk_usage_bytes',
  help: 'Disk usage in bytes',
  labelNames: ['mount_point'],
});

// Registrar todas las métricas
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestsInProgress);
register.registerMetric(dbQueryDuration);
register.registerMetric(dbConnectionsActive);
register.registerMetric(dbConnectionsIdle);
register.registerMetric(redisCommandsDuration);
register.registerMetric(redisCacheHitRate);
register.registerMetric(socketConnections);
register.registerMetric(socketMessages);
register.registerMetric(activeUsers);
register.registerMetric(usersLoggedIn);
register.registerMetric(usersRegistered);
register.registerMetric(quizzesCreated);
register.registerMetric(quizzesPlayed);
register.registerMetric(quizParticipants);
register.registerMetric(errorsTotal);
register.registerMetric(cpuUsage);
register.registerMetric(memoryUsage);
register.registerMetric(diskUsage);

// Middleware para Express
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  httpRequestsInProgress.inc({
    method: req.method,
    route: req.route?.path || req.path,
  });

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpRequestDuration.observe({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    }, duration);

    httpRequestTotal.inc({
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode,
    });

    httpRequestsInProgress.dec({
      method: req.method,
      route: req.route?.path || req.path,
    });
  });

  next();
};

// Endpoint de métricas
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error.message);
  }
};

// Funciones helper para actualizar métricas
const updateMetrics = {
  // Actualizar métricas de base de datos
  db: (active, idle) => {
    dbConnectionsActive.set(active);
    dbConnectionsIdle.set(idle);
  },

  // Actualizar métricas de Redis
  redis: (hitRate) => {
    redisCacheHitRate.set(hitRate);
  },

  // Actualizar métricas de Socket.IO
  socket: (connections) => {
    socketConnections.set({ namespace: '/' }, connections);
  },

  // Actualizar métricas de usuarios
  users: {
    incrementLoggedIn: () => usersLoggedIn.inc(),
    incrementRegistered: () => usersRegistered.inc(),
    setActive: (type, count) => activeUsers.set({ type }, count),
  },

  // Actualizar métricas de quizzes
  quizzes: {
    incrementCreated: () => quizzesCreated.inc(),
    incrementPlayed: () => quizzesPlayed.inc(),
    setParticipants: (quizId, count) => quizParticipants.set({ quiz_id: quizId }, count),
  },

  // Actualizar métricas de errores
  errors: (type, severity) => {
    errorsTotal.inc({ type, severity });
  },

  // Actualizar métricas de sistema
  system: (cpu, memory, disk) => {
    cpuUsage.set(cpu);
    memoryUsage.set(memory);
    if (disk) {
      Object.entries(disk).forEach(([mount, usage]) => {
        diskUsage.set({ mount_point: mount }, usage);
      });
    }
  },
};

// Monitoreo de sistema en tiempo real
const systemMonitor = () => {
  setInterval(() => {
    // CPU
    const cpus = os.cpus();
    const cpuUsage = os.loadavg()[0] / cpus.length * 100;
    
    // Memory
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    // Disk (simplificado)
    try {
      const stats = fs.statSync('/');
      // Nota: Esto es simplificado, en producción usar 'diskusage' package
    } catch (error) {
      // Ignorar errores de disk
    }

    updateMetrics.system(cpuUsage, usedMemory);
  }, 5000); // Actualizar cada 5 segundos
};

// Iniciar monitoreo de sistema
if (process.env.NODE_ENV === 'production') {
  systemMonitor();
}

// Alertas basadas en umbrales
const checkAlerts = () => {
  const alerts = [];

  // Verificar uso de CPU
  if (cpuUsage.get() > 80) {
    alerts.push({
      type: 'HIGH_CPU',
      severity: 'WARNING',
      message: `CPU usage is ${cpuUsage.get()}%`,
      value: cpuUsage.get(),
    });
  }

  // Verificar uso de memoria
  const memoryGB = memoryUsage.get() / (1024 * 1024 * 1024);
  if (memoryGB > 8) {
    alerts.push({
      type: 'HIGH_MEMORY',
      severity: 'WARNING',
      message: `Memory usage is ${memoryGB.toFixed(2)}GB`,
      value: memoryGB,
    });
  }

  // Verificar conexiones de base de datos
  if (dbConnectionsActive.get() > 40000) {
    alerts.push({
      type: 'HIGH_DB_CONNECTIONS',
      severity: 'CRITICAL',
      message: `Database connections: ${dbConnectionsActive.get()}`,
      value: dbConnectionsActive.get(),
    });
  }

  // Verificar tasa de errores
  const errorRate = errorsTotal.get() / httpRequestTotal.get();
  if (errorRate > 0.05) {
    alerts.push({
      type: 'HIGH_ERROR_RATE',
      severity: 'CRITICAL',
      message: `Error rate is ${(errorRate * 100).toFixed(2)}%`,
      value: errorRate,
    });
  }

  return alerts;
};

export {
  register,
  httpRequestDuration,
  httpRequestTotal,
  httpRequestsInProgress,
  dbQueryDuration,
  dbConnectionsActive,
  dbConnectionsIdle,
  redisCommandsDuration,
  redisCacheHitRate,
  socketConnections,
  socketMessages,
  activeUsers,
  usersLoggedIn,
  usersRegistered,
  quizzesCreated,
  quizzesPlayed,
  quizParticipants,
  errorsTotal,
  cpuUsage,
  memoryUsage,
  diskUsage,
  metricsMiddleware,
  metricsEndpoint,
  updateMetrics,
  checkAlerts,
};
