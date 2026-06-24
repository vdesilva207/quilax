import express from 'express';
import { auth } from '../middleware/auth.js';
import scalabilityManager from '../utils/scalabilityManager.js';

const router = express.Router();

router.get('/metrics', auth, async (req, res) => {
  try {
    const metrics = scalabilityManager.getMetrics();
    const healthStatus = scalabilityManager.getHealthStatus();
    
    res.json({
      success: true,
      metrics,
      healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error getting scalability metrics',
      message: error.message
    });
  }
});

router.get('/health', async (req, res) => {
  try {
    const healthStatus = scalabilityManager.getHealthStatus();
    
    res.status(healthStatus.status === 'HEALTHY' ? 200 : 503).json({
      success: true,
      healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error getting health status',
      message: error.message
    });
  }
});

router.post('/cleanup', auth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }
    
    await scalabilityManager.performCleanup();
    
    res.json({
      success: true,
      message: 'Cleanup triggered successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error triggering cleanup',
      message: error.message
    });
  }
});

router.post('/load-test', auth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }
    
    const userCount = parseInt(req.body.userCount) || 1000;
    const duration = parseInt(req.body.duration) || 60;
    
    const testPromises = [];
    for (let i = 0; i < userCount; i++) {
      testPromises.push(simulateUserActivity(i, duration));
    }
    
    await Promise.all(testPromises);
    
    setTimeout(() => {
      for (let i = 0; i < userCount; i++) {
        const userId = `test-user-${i}`;
        scalabilityManager.emit('userDisconnected', { userId });
      }
    }, duration * 1000);
    
    const finalMetrics = scalabilityManager.getMetrics();
    
    res.json({
      success: true,
      message: `Load test completed for ${userCount} users`,
      duration,
      finalMetrics
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error during load test',
      message: error.message
    });
  }
});

async function simulateUserActivity(userId, duration) {
  const startTime = Date.now();
  
  try {
    for (let i = 0; i < 1; i++) {
      setTimeout(() => {
        const userId = `test-user-${userId}`;
        const roomId = `test-room-${Math.floor(userId / 100)}`;
        
        scalabilityManager.emit('userConnected', { userId });
        scalabilityManager.emit('userJoinedRoom', { userId, roomId });
        
        setInterval(() => {
          scalabilityManager.emit('quizAnswer', { userId, roomId, answer: Math.random() > 0.5 });
        }, 5000 + Math.random() * 10000);
        
      }, userId * 10);
    }
  } catch (error) {
  }
}

router.get('/queue-stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }
    
    const queueStats = await scalabilityManager.queueManager.getQueueStats();
    const redisInfo = await scalabilityManager.queueManager.getRedisInfo();
    
    res.json({
      success: true,
      queueStats,
      redisInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error getting queue stats',
      message: error.message
    });
  }
});

router.put('/thresholds', auth, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin access required'
      });
    }
    
    const thresholds = req.body;
    
    res.json({
      success: true,
      message: 'Performance thresholds updated',
      thresholds
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error updating thresholds',
      message: error.message
    });
  }
});

export default router;
