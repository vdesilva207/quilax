import fetch from 'node-fetch';
import WebSocket from 'ws';
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
    
    this.tokenCache = new Map();
    this.maxWebSocketConnections = 0;
  }

  async runTest(userCount = 10000) {
    console.log(`🚀 Starting comprehensive stress test with ${userCount} users`);
    const startTime = performance.now();
    
    await this.testConcurrentLogins(userCount);
    await this.testProfileUpdates(userCount);
    await this.testPaymentSystem(1000);
    await this.testWithdrawalSystem(500);
    await this.testAdminQuizCreation();
    await this.testMessagingSystem(5000);
    await this.testRealQuizzes(1000);
    
    const endTime = performance.now();
    const totalTime = (endTime - startTime) / 1000;
    
    this.generateReport(totalTime);
  }

  async testConcurrentLogins(userCount) {
    console.log('🔐 Testing concurrent logins...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 1; i <= userCount; i++) {
      promises.push(this.simulateLogin(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.login.avgLatency = avgLatency;
    
    console.log(`✅ Login test completed: ${this.results.login.success} success, ${this.results.login.failed} failed`);
  }

  async simulateLogin(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: `testuser${userId}@test.com`,
          password: 'testpassword123'
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        const data = await response.json();
        if (data.token) {
          this.tokenCache.set(userId, data.token);
          this.results.login.success++;
          return data;
        }
      }
      
      this.results.login.failed++;
    } catch (error) {
      this.results.login.failed++;
    }
    
    return null;
  }

  async testProfileUpdates(userCount) {
    console.log('👤 Testing profile updates...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 1; i <= userCount; i++) {
      promises.push(this.simulateProfileUpdate(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.profile.avgLatency = avgLatency;
    
    console.log(`✅ Profile test completed: ${this.results.profile.success} success, ${this.results.profile.failed} failed`);
  }

  async simulateProfileUpdate(userId, latencies) {
    const startTime = performance.now();
    
    try {
      const token = this.tokenCache.get(userId);
      if (!token) {
        const loginResult = await this.simulateLogin(userId, []);
        if (!loginResult?.token) {
          this.results.profile.failed++;
          return;
        }
        this.tokenCache.set(userId, loginResult.token);
      }
      
      const response = await fetch(`${BASE_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tokenCache.get(userId)}`
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

  async testPaymentSystem(transactionCount) {
    console.log('💳 Testing payment system...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 1; i <= transactionCount; i++) {
      promises.push(this.simulatePayment(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.payments.avgLatency = avgLatency;
    
    console.log(`✅ Payment test completed: ${this.results.payments.success} success, ${this.results.payments.failed} failed`);
  }

  async simulatePayment(transactionId, latencies) {
    const startTime = performance.now();
    
    try {
      const userId = (transactionId % 10000) + 1;
      let token = this.tokenCache.get(userId);
      
      if (!token) {
        const loginResult = await this.simulateLogin(userId, []);
        if (!loginResult?.token) {
          this.results.payments.failed++;
          return;
        }
        token = loginResult.token;
        this.tokenCache.set(userId, token);
      }
      
      const response = await fetch(`${BASE_URL}/api/payments/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 1000,
          method: 'credit_card'
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

  async testWithdrawalSystem(withdrawalCount) {
    console.log('💸 Testing withdrawal system...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 1; i <= withdrawalCount; i++) {
      promises.push(this.simulateWithdrawal(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.withdrawals.avgLatency = avgLatency;
    
    console.log(`✅ Withdrawal test completed: ${this.results.withdrawals.success} success, ${this.results.withdrawals.failed} failed`);
  }

  async simulateWithdrawal(withdrawalId, latencies) {
    const startTime = performance.now();
    
    try {
      const userId = (withdrawalId % 10000) + 1;
      let token = this.tokenCache.get(userId);
      
      if (!token) {
        const loginResult = await this.simulateLogin(userId, []);
        if (!loginResult?.token) {
          this.results.withdrawals.failed++;
          return;
        }
        token = loginResult.token;
        this.tokenCache.set(userId, token);
      }
      
      const response = await fetch(`${BASE_URL}/api/withdraws`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: 500,
          method: 'bank_transfer',
          accountInfo: {
            bankName: 'Test Bank',
            accountNumber: '1234567890'
          }
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
      const adminLoginResult = await this.simulateAdminLogin();
      if (!adminLoginResult?.token) {
        this.results.adminQuizzes.failed++;
        return;
      }
      
      const response = await fetch(`${BASE_URL}/api/admin/quizzes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminLoginResult.token}`
        },
        body: JSON.stringify({
          title: 'Stress Test Quiz',
          description: 'Quiz created during stress test',
          difficulty: 'MEDIUM',
          category: 'General Knowledge',
          estimatedDuration: 20,
          questions: [
            {
              text: 'What is 2+2?',
              maxPoints: 1000,
              readTime: 10,
              answerTime: 30,
              answers: [
                { text: '3', isCorrect: false },
                { text: '4', isCorrect: true },
                { text: '5', isCorrect: false },
                { text: '6', isCorrect: false }
              ]
            }
          ]
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      this.results.adminQuizzes.avgLatency = latency;
      
      if (response.ok) {
        this.results.adminQuizzes.success++;
      } else {
        this.results.adminQuizzes.failed++;
      }
    } catch (error) {
      this.results.adminQuizzes.failed++;
    }
    
    console.log(`✅ Admin quiz test completed: ${this.results.adminQuizzes.success} success, ${this.results.adminQuizzes.failed} failed`);
  }

  async simulateAdminLogin() {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'admin@test.com',
          password: 'adminpassword123'
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Admin login failed:', error);
    }
    
    return null;
  }

  async testMessagingSystem(messageCount) {
    console.log('💬 Testing messaging system...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 1; i <= messageCount; i++) {
      promises.push(this.simulateMessage(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.messages.avgLatency = avgLatency;
    
    console.log(`✅ Messaging test completed: ${this.results.messages.success} success, ${this.results.messages.failed} failed`);
  }

  async simulateMessage(messageId, latencies) {
    const startTime = performance.now();
    
    try {
      const senderId = (messageId % 10000) + 1;
      let token = this.tokenCache.get(senderId);
      
      if (!token) {
        const loginResult = await this.simulateLogin(senderId, []);
        if (!loginResult?.token) {
          this.results.messages.failed++;
          return;
        }
        token = loginResult.token;
        this.tokenCache.set(senderId, token);
      }
      
      const receiverId = ((messageId + 1) % 10000) + 1;
      
      const response = await fetch(`${BASE_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: receiverId,
          content: `Test message ${messageId}`,
          type: 'TEXT'
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

  async testRealQuizzes(quizCount) {
    console.log('🎯 Testing real quizzes (15-50 questions)...');
    
    const promises = [];
    const latencies = [];
    
    for (let i = 1; i <= quizCount; i++) {
      promises.push(this.simulateQuizParticipation(i, latencies));
    }
    
    await Promise.allSettled(promises);
    
    const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    this.results.quizzes.avgLatency = avgLatency;
    
    console.log(`✅ Real quiz test completed: ${this.results.quizzes.success} success, ${this.results.quizzes.failed} failed`);
  }

  async simulateQuizParticipation(quizId, latencies) {
    const startTime = performance.now();
    
    try {
      const userId = (quizId % 10000) + 1;
      let token = this.tokenCache.get(userId);
      
      if (!token) {
        const loginResult = await this.simulateLogin(userId, []);
        if (!loginResult?.token) {
          this.results.quizzes.failed++;
          return;
        }
        token = loginResult.token;
        this.tokenCache.set(userId, token);
      }
      
      const response = await fetch(`${BASE_URL}/api/quiz/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId: 1
        })
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      latencies.push(latency);
      
      if (response.ok) {
        this.results.quizzes.success++;
      } else {
        this.results.quizzes.failed++;
      }
    } catch (error) {
      this.results.quizzes.failed++;
    }
  }

  generateReport(totalTime) {
    console.log('\n📊 ===== COMPREHENSIVE STRESS TEST REPORT =====');
    console.log(`⏱️  Total Test Time: ${totalTime.toFixed(2)} seconds`);
    console.log(`🔗  Max WebSocket Connections: ${this.maxWebSocketConnections}\n`);
    
    console.log('📈 RESULTS BY CATEGORY:\n');
    
    Object.entries(this.results).forEach(([category, result]) => {
      const total = result.success + result.failed;
      const successRate = total > 0 ? (result.success / total * 100).toFixed(2) : '0.00';
      
      console.log(`${category.toUpperCase()}:`);
      console.log(`  ✅ Success: ${result.success}`);
      console.log(`  ❌ Failed: ${result.failed}`);
      console.log(`  📊 Success Rate: ${successRate}%`);
      console.log(`  ⚡ Avg Latency: ${result.avgLatency.toFixed(2)}ms\n`);
    });
    
    console.log('🎯 PERFORMANCE ANALYSIS:');
    Object.entries(this.results).forEach(([category, result]) => {
      const total = result.success + result.failed;
      const successRate = total > 0 ? (result.success / total * 100) : 0;
      
      if (successRate < 50) {
        console.log(`⚠️  ${category}: Low success rate (${successRate.toFixed(2)}%)`);
      }
      
      if (result.avgLatency > 5000) {
        console.log(`⚠️  ${category}: High latency (${result.avgLatency.toFixed(2)}ms)`);
      }
      
      if (successRate >= 50 && result.avgLatency <= 5000) {
        console.log(`✅ ${category}: Good performance`);
      }
    });
    
    console.log('\n✅ ===== TEST COMPLETED =====');
  }
}

const test = new ComprehensiveStressTest();
test.runTest(10000).catch(console.error);
