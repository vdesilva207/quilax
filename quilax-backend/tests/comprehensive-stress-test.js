import { WebSocket } from 'ws';
import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

class ComprehensiveStressTest {
  constructor() {
    this.results = {
      login: { success: 0, failed: 0, avgLatency: 0 },
      profile: { success: 0, failed: 0, avgLatency: 0 },
      payments: { success: 0, failed: 0, avgLatency: 0 },
      withdrawals: { success: 0, failed: 0, avgLatency: 0 },
      adminQuizzes: { success: 0, failed: 0, avgLatency: 0 },
      messages: { success: 0, failed: 0, avgLatency: 0 },
      quizzes: { success: 0, failed: 0, avgLatency: 0 }
    };
    this.activeConnections = 0;
    this.maxConnections = 0;
  }

  async runFullTest(userCount = 10000) {
    console.log(`🚀 Starting comprehensive stress test with ${userCount} users`);
    
    const startTime = performance.now();
    
    // Fase 1: Login Concurrente
    await this.testConcurrentLogins(userCount);
    
    // Fase 2: Personalización de Perfiles
    await this.testProfileUpdates(userCount);
    
    // Fase 3: Sistema de Pagos
    await this.testPayments(userCount / 10);
    
    // Fase 4: Sistema de Retiros
    await this.testWithdrawals(userCount / 20);
    
    // Fase 5: Admin - Creación de Quizzes
    await this.testAdminQuizCreation();
    
    // Fase 6: Sistema de Mensajes
    await this.testMessaging(userCount / 2);
    
    // Fase 7: Quizzes con 15-50 preguntas
    await this.testRealQuizzes(userCount);
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    this.generateReport(totalTime);
  }

  async testConcurrentLogins(userCount) {
    console.log('🔐 Testing concurrent logins...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < userCount; i++) {
      promises.push(this.simulateLogin(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    this.results.login.avgLatency = avgLatency;
    
    console.log(`✅ Login test completed: ${this.results.login.success} success, ${this.results.login.failed} failed`);
  }

  async simulateLogin(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `testuser${userId}@test.com`,
          password: 'testpassword123'
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.login.success++;
        return await response.json();
      } else {
        this.results.login.failed++;
      }
    } catch (error) {
      this.results.login.failed++;
    }
    
    return null;
  }

  async testProfileUpdates(userCount) {
    console.log('👤 Testing profile updates...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < userCount; i++) {
      promises.push(this.simulateProfileUpdate(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    this.results.profile.avgLatency = avgLatency;
    
    console.log(`✅ Profile test completed: ${this.results.profile.success} success, ${this.results.profile.failed} failed`);
  }

  async simulateProfileUpdate(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const loginResult = await this.simulateLogin(userId, []);
      if (!loginResult?.token) {
        this.results.profile.failed++;
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResult.token}`
        },
        body: JSON.stringify({
          fullName: `Test User ${userId}`,
          dateOfBirth: '1990-01-01',
          isOver18: true
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.profile.success++;
      } else {
        this.results.profile.failed++;
      }
    } catch (error) {
      this.results.profile.failed++;
    }
  }

  async testPayments(userCount) {
    console.log('💳 Testing payment system...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < userCount; i++) {
      promises.push(this.simulatePayment(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    this.results.payments.avgLatency = avgLatency;
    
    console.log(`✅ Payment test completed: ${this.results.payments.success} success, ${this.results.payments.failed} failed`);
  }

  async simulatePayment(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const loginResult = await this.simulateLogin(userId, []);
      if (!loginResult?.token) {
        this.results.payments.failed++;
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResult.token}`
        },
        body: JSON.stringify({
          amount: 1000,
          currency: 'EUR',
          paymentType: 'CREDIT_PURCHASE'
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.payments.success++;
      } else {
        this.results.payments.failed++;
      }
    } catch (error) {
      this.results.payments.failed++;
    }
  }

  async testWithdrawals(userCount) {
    console.log('💸 Testing withdrawal system...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < userCount; i++) {
      promises.push(this.simulateWithdrawal(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    this.results.withdrawals.avgLatency = avgLatency;
    
    console.log(`✅ Withdrawal test completed: ${this.results.withdrawals.success} success, ${this.results.withdrawals.failed} failed`);
  }

  async simulateWithdrawal(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const loginResult = await this.simulateLogin(userId, []);
      if (!loginResult?.token) {
        this.results.withdrawals.failed++;
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/withdraws`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResult.token}`
        },
        body: JSON.stringify({
          amount: 500,
          currency: 'EUR',
          bankAccountIban: 'ES9121000418450200051332',
          bankAccountName: `Test User ${userId}`,
          bankAccountBic: 'CAIXESBBXXX'
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.withdrawals.success++;
      } else {
        this.results.withdrawals.failed++;
      }
    } catch (error) {
      this.results.withdrawals.failed++;
    }
  }

  async testAdminQuizCreation() {
    console.log('📝 Testing admin quiz creation...');
    
    const startTime = performance.now();
    
    try {
      const adminLogin = await this.simulateLogin(999999, []);
      if (!adminLogin?.token) {
        this.results.adminQuizzes.failed++;
        return;
      }
      
      const quizPromises = [];
      for (let i = 0; i < 10; i++) {
        quizPromises.push(this.createQuiz(adminLogin.token, i));
      }
      
      await Promise.allSettled(quizPromises);
      
      const endTime = performance.now();
      this.results.adminQuizzes.avgLatency = endTime - startTime;
      
      console.log(`✅ Admin quiz creation completed: ${this.results.adminQuizzes.success} success, ${this.results.adminQuizzes.failed} failed`);
    } catch (error) {
      this.results.adminQuizzes.failed++;
    }
  }

  async createQuiz(adminToken, quizIndex) {
    const startTime = performance.now();
    
    try {
      const questionCount = 15 + Math.floor(Math.random() * 36); // 15-50 preguntas
      const estimatedDuration = questionCount * 2; // 2 min por pregunta
      
      const questions = [];
      for (let i = 0; i < questionCount; i++) {
        questions.push({
          text: `Question ${i + 1} for quiz ${quizIndex}`,
          maxPoints: 1000,
          readTime: 30,
          answerTime: 60
        });
      }
      
      const response = await fetch(`${BASE_URL}/api/admin/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: `Stress Test Quiz ${quizIndex}`,
          description: `Quiz with ${questionCount} questions`,
          credits: 100,
          difficulty: 'MEDIUM',
          category: 'General',
          estimatedDuration,
          questions
        })
      });
      
      const endTime = performance.now();
      
      if (response.ok) {
        this.results.adminQuizzes.success++;
      } else {
        this.results.adminQuizzes.failed++;
      }
    } catch (error) {
      this.results.adminQuizzes.failed++;
    }
  }

  async testMessaging(userCount) {
    console.log('💬 Testing messaging system...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < userCount; i++) {
      promises.push(this.simulateMessage(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    this.results.messages.avgLatency = avgLatency;
    
    console.log(`✅ Messaging test completed: ${this.results.messages.success} success, ${this.results.messages.failed} failed`);
  }

  async simulateMessage(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const loginResult = await this.simulateLogin(userId, []);
      if (!loginResult?.token) {
        this.results.messages.failed++;
        return;
      }
      
      const targetUserId = (userId + 1) % 1000;
      
      const response = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginResult.token}`
        },
        body: JSON.stringify({
          toUserId: targetUserId,
          content: `Test message from user ${userId} to user ${targetUserId}`
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.messages.success++;
      } else {
        this.results.messages.failed++;
      }
    } catch (error) {
      this.results.messages.failed++;
    }
  }

  async testRealQuizzes(userCount) {
    console.log('🎯 Testing real quizzes (15-50 questions)...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 0; i < userCount / 10; i++) {
      promises.push(this.simulateQuizParticipation(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    this.results.quizzes.avgLatency = avgLatency;
    
    console.log(`✅ Real quiz test completed: ${this.results.quizzes.success} success, ${this.results.quizzes.failed} failed`);
  }

  async simulateQuizParticipation(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const loginResult = await this.simulateLogin(userId, []);
      if (!loginResult?.token) {
        this.results.quizzes.failed++;
        return;
      }
      
      // Conectar WebSocket
      const ws = new WebSocket(`${WS_URL}/socket.io/?token=${loginResult.token}`);
      
      ws.on('open', () => {
        this.activeConnections++;
        this.maxConnections = Math.max(this.maxConnections, this.activeConnections);
        
        // Unirse a quiz
        ws.send(JSON.stringify({
          type: 'join-room',
          roomId: `test-quiz-${userId % 100}`
        }));
        
        // Simular respuestas
        const questionCount = 15 + Math.floor(Math.random() * 36);
        for (let i = 0; i < questionCount; i++) {
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'quiz-answer',
              answer: Math.random() > 0.5
            }));
          }, i * 2000); // 2 segundos por pregunta
        }
      });
      
      ws.on('close', () => {
        this.activeConnections--;
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      this.results.quizzes.success++;
      
      // Cerrar después de completar
      setTimeout(() => ws.close(), questionCount * 2000 + 10000);
      
    } catch (error) {
      this.results.quizzes.failed++;
    }
  }

  generateReport(totalTime) {
    console.log('\n📊 ===== COMPREHENSIVE STRESS TEST REPORT =====');
    console.log(`⏱️  Total Test Time: ${totalTime.toFixed(2)} seconds`);
    console.log(`🔗  Max WebSocket Connections: ${this.maxConnections}`);
    console.log('\n📈 RESULTS BY CATEGORY:');
    
    Object.entries(this.results).forEach(([category, results]) => {
      const successRate = results.success > 0 ? (results.success / (results.success + results.failed) * 100).toFixed(2) : '0.00';
      console.log(`\n${category.toUpperCase()}:`);
      console.log(`  ✅ Success: ${results.success}`);
      console.log(`  ❌ Failed: ${results.failed}`);
      console.log(`  📊 Success Rate: ${successRate}%`);
      console.log(`  ⚡ Avg Latency: ${results.avgLatency.toFixed(2)}ms`);
    });
    
    console.log('\n🎯 PERFORMANCE ANALYSIS:');
    this.analyzePerformance();
    
    console.log('\n✅ ===== TEST COMPLETED =====');
  }

  analyzePerformance() {
    const categories = Object.keys(this.results);
    
    categories.forEach(category => {
      const result = this.results[category];
      const successRate = result.success / (result.success + result.failed) * 100;
      
      if (successRate < 90) {
        console.log(`⚠️  ${category}: Low success rate (${successRate.toFixed(2)}%)`);
      }
      
      if (result.avgLatency > 1000) {
        console.log(`⚠️  ${category}: High latency (${result.avgLatency.toFixed(2)}ms)`);
      }
      
      if (result.avgLatency < 100) {
        console.log(`✅ ${category}: Good latency (${result.avgLatency.toFixed(2)}ms)`);
      }
    });
    
    if (this.maxConnections > 50000) {
      console.log(`🚀 Excellent connection handling: ${this.maxConnections} concurrent connections`);
    }
  }
}

// Ejecutar test
const test = new ComprehensiveStressTest();
test.runFullTest(10000).catch(console.error);
