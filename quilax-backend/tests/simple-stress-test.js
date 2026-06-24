import { WebSocket } from 'ws';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

// Configuración del test de estrés
const STRESS_CONFIG = {
  // Para test inicial: 100 usuarios simultáneos
  CONCURRENT_USERS: 100,
  USERS_PER_BATCH: 20,
  TEST_DURATION: 30000, // 30 segundos
  RAMP_UP_INTERVAL: 200, // Añadir usuarios cada 200ms
};

class SimpleStressUser {
  constructor(userId, batchId) {
    this.userId = userId;
    this.batchId = batchId;
    this.ws = null;
    this.connected = false;
    this.joined = false;
    this.answers = 0;
    this.latency = [];
    this.errors = [];
    this.startTime = Date.now();
  }

  async connect() {
    try {
      // Registrar usuario
      const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `stress-${this.userId}-${Date.now()}@test.com`,
          password: 'password123'
        })
      });

      if (!registerResponse.ok) {
        throw new Error(`Register failed: ${registerResponse.status}`);
      }

      const { token } = await registerResponse.json();

      // Conectar WebSocket
      this.ws = new WebSocket(`${WS_URL}?token=${token}`);

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 5000);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.connected = true;
          console.log(`✅ User ${this.userId} connected`);
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          this.errors.push(`Connection error: ${error.message}`);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data));
        };
      });
    } catch (error) {
      this.errors.push(`Connection failed: ${error.message}`);
      throw error;
    }
  }

  handleMessage(data) {
    const latency = Date.now() - this.startTime;
    this.latency.push(latency);

    switch (data.type) {
      case 'connected':
        console.log(`🔗 User ${this.userId} authenticated`);
        break;
      case 'quizList':
        // Buscar quizzes disponibles
        this.searchQuizzes();
        break;
      case 'quizFound':
        console.log(`📝 User ${this.userId} found quiz: ${data.quiz.title}`);
        this.joinQuiz(data.quiz.id);
        break;
      case 'quizJoined':
        this.joined = true;
        console.log(`🎯 User ${this.userId} joined quiz`);
        break;
      case 'question':
        this.answerQuestion();
        break;
      case 'quizFinished':
        this.finish();
        break;
    }
  }

  searchQuizzes() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'searchQuizzes',
        filters: {
          status: 'PUBLISHED'
        }
      }));
    }
  }

  joinQuiz(quizId) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'joinQuiz',
        quizId
      }));
    }
  }

  answerQuestion() {
    if (this.joined && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const answer = Math.floor(Math.random() * 4); // 0-3
      this.ws.send(JSON.stringify({
        type: 'answer',
        quizId: 1, // Quiz ID por defecto
        answer
      }));
      this.answers++;
    }
  }

  finish() {
    const totalTime = Date.now() - this.startTime;
    console.log(`🏁 User ${this.userId} finished - Answers: ${this.answers}, Time: ${totalTime}ms`);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  getStats() {
    return {
      userId: this.userId,
      batchId: this.batchId,
      connected: this.connected,
      joined: this.joined,
      answers: this.answers,
      errors: this.errors.length,
      avgLatency: this.latency.length > 0 
        ? this.latency.reduce((a, b) => a + b, 0) / this.latency.length 
        : 0,
      maxLatency: this.latency.length > 0 ? Math.max(...this.latency) : 0,
      minLatency: this.latency.length > 0 ? Math.min(...this.latency) : 0
    };
  }
}

class SimpleStressTestManager {
  constructor() {
    this.users = [];
    this.stats = {
      totalUsers: 0,
      connectedUsers: 0,
      joinedUsers: 0,
      totalErrors: 0,
      totalAnswers: 0,
      avgLatency: 0,
      startTime: Date.now()
    };
  }

  async runStressTest() {
    console.log('🔥 Starting SIMPLE stress test...');
    console.log(`📊 Target: ${STRESS_CONFIG.CONCURRENT_USERS} concurrent users`);
    
    try {
      // Crear usuarios en batches
      const totalBatches = Math.ceil(STRESS_CONFIG.CONCURRENT_USERS / STRESS_CONFIG.USERS_PER_BATCH);
      
      for (let batchId = 0; batchId < totalBatches; batchId++) {
        const batchUsers = [];
        const usersInBatch = Math.min(
          STRESS_CONFIG.USERS_PER_BATCH,
          STRESS_CONFIG.CONCURRENT_USERS - (batchId * STRESS_CONFIG.USERS_PER_BATCH)
        );

        console.log(`📦 Creating batch ${batchId + 1}/${totalBatches} (${usersInBatch} users)`);

        // Crear usuarios del batch
        for (let i = 0; i < usersInBatch; i++) {
          const userId = (batchId * STRESS_CONFIG.USERS_PER_BATCH) + i + 1;
          const user = new SimpleStressUser(userId, batchId);
          batchUsers.push(user);
          this.users.push(user);
        }

        // Conectar usuarios del batch con delay gradual
        for (let i = 0; i < batchUsers.length; i++) {
          const user = batchUsers[i];
          try {
            await user.connect();
            this.stats.totalUsers++;
            this.stats.connectedUsers++;
          } catch (error) {
            this.stats.totalErrors++;
            console.error(`❌ User ${user.userId} failed to connect:`, error.message);
          }

          // Delay entre conexiones para ramp-up gradual
          if (i < batchUsers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, STRESS_CONFIG.RAMP_UP_INTERVAL));
          }
        }

        // Pequeña pausa entre batches
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('✅ All users created and connected');
      
      // Esperar a que los usuarios se estabilicen
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Recopilar estadísticas iniciales
      this.updateStats();

      // Monitorear durante el test
      const monitorInterval = setInterval(() => {
        this.updateStats();
        console.log('📈 Live stats:', this.getLiveStats());
      }, 2000);

      // Esperar duración del test
      await new Promise(resolve => setTimeout(resolve, STRESS_CONFIG.TEST_DURATION));

      clearInterval(monitorInterval);

      // Estadísticas finales
      this.finalStats();

      // Desconectar todos los usuarios
      this.disconnectAll();

    } catch (error) {
      console.error('❌ Stress test failed:', error);
    }
  }

  updateStats() {
    this.stats.connectedUsers = this.users.filter(u => u.connected).length;
    this.stats.joinedUsers = this.users.filter(u => u.joined).length;
    this.stats.totalAnswers = this.users.reduce((sum, u) => sum + u.answers, 0);
    this.stats.totalErrors = this.users.reduce((sum, u) => sum + u.errors.length, 0);
    
    const allLatencies = this.users.flatMap(u => u.latency);
    if (allLatencies.length > 0) {
      this.stats.avgLatency = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
    }
  }

  getLiveStats() {
    return {
      connected: `${this.stats.connectedUsers}/${this.stats.totalUsers}`,
      joined: `${this.stats.joinedUsers}/${this.stats.totalUsers}`,
      answers: this.stats.totalAnswers,
      errors: this.stats.totalErrors,
      avgLatency: Math.round(this.stats.avgLatency) + 'ms'
    };
  }

  finalStats() {
    console.log('\n🏁 SIMPLE STRESS TEST FINAL RESULTS');
    console.log('=====================================');
    
    const successRate = (this.stats.connectedUsers / this.stats.totalUsers) * 100;
    const joinRate = (this.stats.joinedUsers / this.stats.totalUsers) * 100;
    
    console.log(`📊 Total Users: ${this.stats.totalUsers}`);
    console.log(`✅ Connected: ${this.stats.connectedUsers} (${successRate.toFixed(2)}%)`);
    console.log(`🎯 Joined Quiz: ${this.stats.joinedUsers} (${joinRate.toFixed(2)}%)`);
    console.log(`💬 Total Answers: ${this.stats.totalAnswers}`);
    console.log(`❌ Total Errors: ${this.stats.totalErrors}`);
    console.log(`⏱️  Avg Latency: ${Math.round(this.stats.avgLatency)}ms`);
    
    // Estadísticas por batch
    const batchStats = {};
    this.users.forEach(user => {
      if (!batchStats[user.batchId]) {
        batchStats[user.batchId] = { connected: 0, joined: 0, errors: 0, answers: 0 };
      }
      if (user.connected) batchStats[user.batchId].connected++;
      if (user.joined) batchStats[user.batchId].joined++;
      batchStats[user.batchId].errors += user.errors.length;
      batchStats[user.batchId].answers += user.answers;
    });
    
    console.log('\n📦 Batch Performance:');
    Object.entries(batchStats).forEach(([batchId, stats]) => {
      console.log(`  Batch ${batchId}: Connected ${stats.connected}, Joined ${stats.joined}, Answers ${stats.answers}, Errors ${stats.errors}`);
    });

    // Evaluación de rendimiento
    this.evaluatePerformance(successRate, joinRate);
  }

  evaluatePerformance(successRate, joinRate) {
    console.log('\n🎯 PERFORMANCE EVALUATION');
    console.log('=====================================');
    
    if (successRate >= 95 && joinRate >= 85) {
      console.log('🟢 EXCELLENT: System handles concurrent users very well');
    } else if (successRate >= 85 && joinRate >= 70) {
      console.log('🟡 GOOD: System handles concurrent users well with minor issues');
    } else if (successRate >= 70 && joinRate >= 50) {
      console.log('🟠 ACCEPTABLE: System works but needs optimization');
    } else {
      console.log('🔴 POOR: System needs significant optimization');
    }

    // Recomendaciones
    if (successRate < 90) {
      console.log('💡 Recommendation: Optimize connection handling and WebSocket management');
    }
    if (joinRate < 80) {
      console.log('💡 Recommendation: Optimize quiz join process');
    }
    if (this.stats.avgLatency > 1000) {
      console.log('💡 Recommendation: Optimize response times and reduce latency');
    }
    if (this.stats.totalErrors > this.stats.totalUsers * 0.1) {
      console.log('💡 Recommendation: Improve error handling and stability');
    }
    if (this.stats.totalAnswers < this.stats.joinedUsers * 5) {
      console.log('💡 Recommendation: Check quiz flow and question handling');
    }

    // Escalabilidad estimada
    const estimatedMaxUsers = Math.floor((this.stats.connectedUsers / 100) * 1000000); // Estimar para 1M usuarios
    console.log(`\n📈 Estimated scalability: ~${estimatedMaxUsers.toLocaleString()} concurrent users`);
    console.log(`🎯 Target: 2,000,000 concurrent users`);
    console.log(`📊 Current capacity: ${((estimatedMaxUsers / 2000000) * 100).toFixed(1)}% of target`);
  }

  disconnectAll() {
    console.log('🔌 Disconnecting all users...');
    this.users.forEach(user => user.disconnect());
  }
}

// Ejecutar test
async function main() {
  const manager = new SimpleStressTestManager();
  await manager.runStressTest();
  process.exit(0);
}

main().catch(console.error);
