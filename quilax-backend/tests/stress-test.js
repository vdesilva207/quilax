import { WebSocket } from 'ws';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

// Configuración del test de estrés
const STRESS_CONFIG = {
  // Para test inicial: 100 usuarios simultáneos
  CONCURRENT_USERS: 100,
  // Para test final: 2,000,000 usuarios
  // CONCURRENT_USERS: 2000000,
  
  USERS_PER_BATCH: 50,
  QUIZ_ID: 1,
  TEST_DURATION: 30000, // 30 segundos
  
  // Configuración de ramp-up
  RAMP_UP_TIME: 10000, // 10 segundos para llegar al máximo
  RAMP_UP_INTERVAL: 100, // Añadir usuarios cada 100ms
};

class StressTestUser {
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
      // Primero registrar usuario
      const registerResponse = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `stress-user-${this.userId}-${Date.now()}@test.com`,
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
      case 'quizState':
        if (data.quizId === STRESS_CONFIG.QUIZ_ID && data.phase === 'PRE_START') {
          this.joinQuiz();
        }
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

  joinQuiz() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'joinQuiz',
        quizId: STRESS_CONFIG.QUIZ_ID
      }));
    }
  }

  answerQuestion() {
    if (this.joined && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const answer = Math.floor(Math.random() * 4); // 0-3
      this.ws.send(JSON.stringify({
        type: 'answer',
        quizId: STRESS_CONFIG.QUIZ_ID,
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

class StressTestManager {
  constructor() {
    this.users = [];
    this.batches = [];
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

  async createQuiz() {
    try {
      // Crear un quiz de prueba
      const adminToken = await this.getAdminToken();
      
      const createResponse = await fetch(`${BASE_URL}/admin/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'Stress Test Quiz',
          description: 'Quiz for stress testing',
          credits: 1,
          difficulty: 'MEDIUM',
          category: 'STRESS_TEST',
          questions: [
            {
              text: 'Question 1',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 0,
              timeLimit: 10
            },
            {
              text: 'Question 2',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 1,
              timeLimit: 10
            }
          ]
        })
      });

      if (createResponse.ok) {
        const quiz = await createResponse.json();
        console.log(`📝 Created quiz: ${quiz.id}`);
        return quiz.id;
      } else {
        throw new Error('Failed to create quiz');
      }
    } catch (error) {
      console.error('❌ Error creating quiz:', error);
      return STRESS_CONFIG.QUIZ_ID;
    }
  }

  async getAdminToken() {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@test.com',
        password: 'admin123'
      })
    });

    if (response.ok) {
      const { token } = await response.json();
      return token;
    }
    throw new Error('Failed to get admin token');
  }

  async startQuizRun(quizId) {
    try {
      const adminToken = await this.getAdminToken();
      
      const response = await fetch(`${BASE_URL}/quiz-run/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ quizId })
      });

      if (response.ok) {
        const quizRun = await response.json();
        console.log(`🚀 Started quiz run: ${quizRun.id}`);
        return quizRun.id;
      }
    } catch (error) {
      console.error('❌ Error starting quiz run:', error);
    }
    return null;
  }

  async runStressTest() {
    console.log('🔥 Starting stress test...');
    console.log(`📊 Target: ${STRESS_CONFIG.CONCURRENT_USERS} concurrent users`);
    
    try {
      // Crear quiz
      const quizId = await this.createQuiz();
      
      // Iniciar quiz run
      const quizRunId = await this.startQuizRun(quizId);
      
      if (!quizRunId) {
        throw new Error('Failed to start quiz run');
      }

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
          const user = new StressTestUser(userId, batchId);
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
      
      // Esperar a que los usuarios se unan al quiz
      await new Promise(resolve => setTimeout(resolve, 5000));

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
    console.log('\n🏁 STRESS TEST FINAL RESULTS');
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
        batchStats[user.batchId] = { connected: 0, joined: 0, errors: 0 };
      }
      if (user.connected) batchStats[user.batchId].connected++;
      if (user.joined) batchStats[user.batchId].joined++;
      batchStats[user.batchId].errors += user.errors.length;
    });
    
    console.log('\n📦 Batch Performance:');
    Object.entries(batchStats).forEach(([batchId, stats]) => {
      console.log(`  Batch ${batchId}: Connected ${stats.connected}, Joined ${stats.joined}, Errors ${stats.errors}`);
    });

    // Evaluación de rendimiento
    this.evaluatePerformance(successRate, joinRate);
  }

  evaluatePerformance(successRate, joinRate) {
    console.log('\n🎯 PERFORMANCE EVALUATION');
    console.log('=====================================');
    
    if (successRate >= 95 && joinRate >= 90) {
      console.log('🟢 EXCELLENT: System handles load very well');
    } else if (successRate >= 85 && joinRate >= 75) {
      console.log('🟡 GOOD: System handles load well with minor issues');
    } else if (successRate >= 70 && joinRate >= 60) {
      console.log('🟠 ACCEPTABLE: System works but needs optimization');
    } else {
      console.log('🔴 POOR: System needs significant optimization');
    }

    // Recomendaciones
    if (successRate < 90) {
      console.log('💡 Recommendation: Optimize connection handling');
    }
    if (joinRate < 80) {
      console.log('💡 Recommendation: Optimize quiz join process');
    }
    if (this.stats.avgLatency > 1000) {
      console.log('💡 Recommendation: Optimize response times');
    }
    if (this.stats.totalErrors > this.stats.totalUsers * 0.1) {
      console.log('💡 Recommendation: Improve error handling');
    }
  }

  disconnectAll() {
    console.log('🔌 Disconnecting all users...');
    this.users.forEach(user => user.disconnect());
  }
}

// Ejecutar test
async function main() {
  const manager = new StressTestManager();
  await manager.runStressTest();
  process.exit(0);
}

main().catch(console.error);
