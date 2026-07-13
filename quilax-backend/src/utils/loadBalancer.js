/**
 * ⚖️ LOAD BALANCER HORIZONTAL PARA 2M USUARIOS
 */

import { createServer } from 'http';
import { Worker } from 'worker_threads';
import os from 'os';
import cluster from 'cluster';

class HorizontalLoadBalancer {
  constructor(options = {}) {
    this.workers = [];
    this.workerCount = options.workers || os.cpus().length;
    this.port = options.port || 3000;
    this.healthCheckInterval = options.healthCheckInterval || 30000;
    this.maxConnections = options.maxConnections || 1000000;
    this.currentConnections = 0;
    this.roundRobinIndex = 0;
    this.workerStats = new Map();
    
    this.initialize();
  }

  initialize() {
    if (cluster.isMaster) {
      console.log(`🖥️  Master process ${process.pid} is running`);
      console.log(`🔧 Creating ${this.workerCount} worker processes`);
      
      this.createWorkers();
      this.setupHealthChecks();
      this.setupGracefulShutdown();
    } else {
      console.log(`👷 Worker process ${process.pid} started`);
      // Worker process will run the actual server
    }
  }

  createWorkers() {
    for (let i = 0; i < this.workerCount; i++) {
      const worker = cluster.fork({
        WORKER_ID: i,
        PORT: this.port + i
      });
      
      this.workers.push(worker);
      this.workerStats.set(worker, {
        id: i,
        pid: worker.process.pid,
        port: this.port + i,
        connections: 0,
        requests: 0,
        errors: 0,
        lastHealthCheck: null,
        status: 'starting'
      });
      
      // Worker event handlers
      worker.on('online', () => {
        console.log(`✅ Worker ${i} (PID: ${worker.process.pid}) is online`);
        this.workerStats.get(worker).status = 'online';
      });
      
      worker.on('message', (message) => {
        this.handleWorkerMessage(worker, message);
      });
      
      worker.on('error', (error) => {
        console.error(`❌ Worker ${i} error:`, error);
        this.workerStats.get(worker).errors++;
        this.restartWorker(worker, i);
      });
      
      worker.on('exit', (code, signal) => {
        console.log(`⚠️  Worker ${i} exited with code ${code} and signal ${signal}`);
        this.restartWorker(worker, i);
      });
    }
  }

  handleWorkerMessage(worker, message) {
    const stats = this.workerStats.get(worker);
    
    switch (message.type) {
      case 'connection':
        stats.connections = message.data.connections;
        this.currentConnections = this.getTotalConnections();
        break;
        
      case 'request':
        stats.requests++;
        break;
        
      case 'error':
        stats.errors++;
        break;
        
      case 'health':
        stats.lastHealthCheck = new Date();
        stats.status = message.data.healthy ? 'healthy' : 'unhealthy';
        break;
        
      default:
        console.log(`📨 Unknown message from worker ${stats.id}:`, message);
    }
  }

  restartWorker(worker, workerId) {
    console.log(`🔄 Restarting worker ${workerId}`);
    
    const newWorker = cluster.fork({
      WORKER_ID: workerId,
      PORT: this.port + workerId
    });
    
    // Reemplazar worker en arrays
    const index = this.workers.indexOf(worker);
    this.workers[index] = newWorker;
    
    // Actualizar stats
    const oldStats = this.workerStats.get(worker);
    this.workerStats.delete(worker);
    this.workerStats.set(newWorker, {
      ...oldStats,
      pid: newWorker.process.pid,
      connections: 0,
      status: 'starting'
    });
    
    // Setup event handlers para nuevo worker
    newWorker.on('online', () => {
      console.log(`✅ Restarted worker ${workerId} (PID: ${newWorker.process.pid})`);
    });
    
    newWorker.on('message', (message) => {
      this.handleWorkerMessage(newWorker, message);
    });
    
    newWorker.on('error', (error) => {
      console.error(`❌ Restarted worker ${workerId} error:`, error);
      this.restartWorker(newWorker, workerId);
    });
    
    newWorker.on('exit', (code, signal) => {
      console.log(`⚠️  Restarted worker ${workerId} exited with code ${code}`);
      this.restartWorker(newWorker, workerId);
    });
  }

  setupHealthChecks() {
    setInterval(() => {
      this.workers.forEach(worker => {
        if (worker.isConnected()) {
          worker.send({
            type: 'health_check',
            timestamp: Date.now()
          });
        }
      });
    }, this.healthCheckInterval);
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`📴 Received ${signal}, shutting down gracefully`);
      
      // Detener nuevos workers
      cluster.disconnect();
      
      // Esperar que los workers terminen
      const shutdownPromises = this.workers.map(worker => {
        return new Promise((resolve) => {
          worker.on('exit', resolve);
          worker.send({ type: 'shutdown' });
        });
      });
      
      await Promise.all(shutdownPromises);
      console.log('✅ All workers shut down');
      process.exit(0);
    };
    
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  getTotalConnections() {
    let total = 0;
    this.workerStats.forEach(stats => {
      total += stats.connections;
    });
    return total;
  }

  getBestWorker() {
    // Estrategia: Least Connections
    let bestWorker = null;
    let minConnections = Infinity;
    
    this.workers.forEach(worker => {
      const stats = this.workerStats.get(worker);
      if (stats.status === 'healthy' && stats.connections < minConnections) {
        minConnections = stats.connections;
        bestWorker = worker;
      }
    });
    
    // Si no hay workers saludables, usar round robin
    if (!bestWorker) {
      bestWorker = this.workers[this.roundRobinIndex % this.workers.length];
      this.roundRobinIndex++;
    }
    
    return bestWorker;
  }

  getStats() {
    const stats = {
      master: {
        pid: process.pid,
        uptime: process.uptime(),
        totalConnections: this.currentConnections,
        maxConnections: this.maxConnections,
        workers: this.workerCount
      },
      workers: []
    };
    
    this.workerStats.forEach((workerStats, worker) => {
      stats.workers.push({
        id: workerStats.id,
        pid: workerStats.pid,
        port: workerStats.port,
        connections: workerStats.connections,
        requests: workerStats.requests,
        errors: workerStats.errors,
        status: workerStats.status,
        lastHealthCheck: workerStats.lastHealthCheck,
        healthy: worker.isConnected()
      });
    });
    
    return stats;
  }

  // API para obtener estadísticas
  getStatsAPI() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      loadBalancer: this.getStats()
    };
  }
}

// Worker server
class WorkerServer {
  constructor(options = {}) {
    this.workerId = options.workerId || process.env.WORKER_ID;
    this.port = options.port || process.env.PORT || 3000;
    this.maxConnections = options.maxConnections || 250000;
    this.currentConnections = 0;
    this.requests = 0;
    this.errors = 0;
    
    this.createServer();
    this.setupProcessHandlers();
  }

  createServer() {
    this.server = createServer((req, res) => {
      this.handleRequest(req, res);
    });
    
    this.server.on('connection', (socket) => {
      this.currentConnections++;
      
      socket.on('close', () => {
        this.currentConnections--;
        this.notifyMaster('connection', { connections: this.currentConnections });
      });
      
      this.notifyMaster('connection', { connections: this.currentConnections });
    });
    
    this.server.listen(this.port, () => {
      console.log(`🚀 Worker ${this.workerId} listening on port ${this.port}`);
    });
  }

  handleRequest(req, res) {
    this.requests++;
    this.notifyMaster('request');
    
    // Rate limiting por worker
    if (this.currentConnections > this.maxConnections) {
      res.writeHead(503);
      res.end('Worker overloaded');
      this.errors++;
      this.notifyMaster('error');
      return;
    }
    
    // Simulación de procesamiento
    setTimeout(() => {
      res.writeHead(200);
      res.end(JSON.stringify({
        worker: this.workerId,
        port: this.port,
        connections: this.currentConnections,
        requests: this.requests
      }));
    }, Math.random() * 10);
  }

  setupProcessHandlers() {
    process.on('message', (message) => {
      switch (message.type) {
        case 'health_check':
          this.handleHealthCheck();
          break;
          
        case 'shutdown':
          console.log(`📴 Worker ${this.workerId} shutting down`);
          this.server.close(() => {
            process.exit(0);
          });
          break;
          
        default:
          console.log(`📨 Unknown message to worker ${this.workerId}:`, message);
      }
    });
  }

  handleHealthCheck() {
    const healthy = this.currentConnections < this.maxConnections && this.server.listening;
    
    if (process.send) {
      process.send({
        type: 'health',
        data: {
          healthy,
          connections: this.currentConnections,
          requests: this.requests,
          errors: this.errors,
          uptime: process.uptime()
        }
      });
    }
  }

  notifyMaster(type, data = {}) {
    if (process.send) {
      process.send({
        type,
        data,
        workerId: this.workerId,
        timestamp: Date.now()
      });
    }
  }
}

// Función de inicialización
export function initializeLoadBalancer(options = {}) {
  if (cluster.isMaster) {
    const loadBalancer = new HorizontalLoadBalancer({
      workers: os.cpus().length,
      port: 3000,
      maxConnections: 1000000,
      ...options
    });
    
    // API endpoint para stats
    if (loadBalancer.workers.length > 0) {
      const statsServer = createServer((req, res) => {
        if (req.url === '/stats') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(loadBalancer.getStatsAPI()));
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });
      
      statsServer.listen(8080, () => {
        console.log('📊 Stats server listening on port 8080');
      });
    }
    
    return loadBalancer;
  } else {
    const workerServer = new WorkerServer({
      workerId: process.env.WORKER_ID,
      port: process.env.PORT,
      maxConnections: 250000
    });
    
    return workerServer;
  }
}

export { HorizontalLoadBalancer, WorkerServer };
