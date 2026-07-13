import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { wsPool, poolMonitor } from './connectionPool.js';

class OptimizedSocketHandler extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.rooms = new Map();
    this.messageQueue = new Map();
    this.batchSize = 100;
    this.batchTimeout = 10;
    this.pendingMessages = [];
    this.batchTimer = null;
    
    this.setupBatchProcessing();
  }

  setupBatchProcessing() {
    this.batchTimer = setInterval(() => {
      if (this.pendingMessages.length > 0) {
        this.processBatch();
      }
    }, this.batchTimeout);
  }

  addConnection(ws, userId, token) {
    if (this.connections.has(userId)) {
      const oldWs = this.connections.get(userId);
      if (oldWs && oldWs.readyState === WebSocket.OPEN) {
        oldWs.close(1000, 'New connection from same user');
      }
    }
    this.connections.set(userId, ws);
    
    ws.userId = userId;
    ws.token = token;
    ws.isAlive = true;
    ws.lastPing = Date.now();
    
    ws.on('message', (data) => this.handleMessage(ws, data));
    ws.on('close', () => this.handleClose(userId));
    ws.on('error', (error) => this.handleError(userId, error));
    
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastPing = Date.now();
    });
    
    this.startPingInterval(ws);
    
    poolMonitor.recordConnection('websocket', true);
    
    this.emit('userConnected', { userId, ws });
  }

  handleMessage(ws, data) {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join-room':
          this.handleJoinRoom(ws, message);
          break;
        case 'leave-room':
          this.handleLeaveRoom(ws, message);
          break;
        case 'quiz-answer':
          this.handleQuizAnswer(ws, message);
          break;
        case 'ping':
          this.handlePing(ws);
          break;
      }
    } catch (error) {
      this.emit('error', { userId: ws.userId, error });
    }
  }

  handleJoinRoom(ws, message) {
    const { roomId } = message;
    
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    
    this.rooms.get(roomId).add(ws.userId);
    
    this.broadcastToRoom(roomId, {
      type: 'user-joined',
      userId: ws.userId
    }, ws.userId);
    
    this.emit('userJoinedRoom', { userId: ws.userId, roomId });
  }

  handleLeaveRoom(ws, message) {
    const { roomId } = message;
    
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(ws.userId);
      
      this.broadcastToRoom(roomId, {
        type: 'user-left',
        userId: ws.userId
      }, ws.userId);
      
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
        this.messageQueue.delete(roomId);
      }
    }
    
    this.emit('userLeftRoom', { userId: ws.userId, roomId });
  }

  handleQuizAnswer(ws, message) {
    const { roomId, answer } = message;
    
    this.pendingMessages.push({
      type: 'quiz-answer',
      userId: ws.userId,
      roomId,
      answer,
      timestamp: Date.now()
    });
    
    this.emit('quizAnswer', { userId: ws.userId, roomId, answer });
  }

  handlePing(ws) {
    ws.isAlive = true;
    ws.lastPing = Date.now();
    
    ws.send(JSON.stringify({
      type: 'pong',
      timestamp: Date.now()
    }));
  }

  startPingInterval(ws) {
    const pingInterval = setInterval(() => {
      if (ws.isAlive === false) {
        clearInterval(pingInterval);
        ws.terminate();
        return;
      }
      
      ws.isAlive = false;
      ws.ping();
    }, 30000);
    
    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  }

  processBatch() {
    if (this.pendingMessages.length === 0) return;
    
    const batch = this.pendingMessages.splice(0, this.batchSize);
    
    const roomBatches = new Map();
    for (const message of batch) {
      if (!roomBatches.has(message.roomId)) {
        roomBatches.set(message.roomId, []);
      }
      roomBatches.get(message.roomId).push(message);
    }
    
    for (const [roomId, messages] of roomBatches) {
      if (!this.messageQueue.has(roomId)) {
        this.messageQueue.set(roomId, []);
      }
      this.messageQueue.get(roomId).push(...messages);
      
      const queue = this.messageQueue.get(roomId);
      if (queue.length > 1000) {
        this.messageQueue.set(roomId, queue.slice(-1000));
      }
      
      this.emit('batchProcessed', { roomId, messages: messages.length });
    }
  }

  broadcastToRoom(roomId, message, excludeUserId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const messageStr = JSON.stringify(message);
    
    for (const userId of room) {
      if (userId !== excludeUserId) {
        const ws = this.connections.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(messageStr);
        }
      }
    }
  }

  broadcastToAll(message) {
    const messageStr = JSON.stringify(message);
    
    this.connections.forEach((ws, userId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      }
    });
  }

  handleClose(userId) {
    const ws = this.connections.get(userId);
    if (!ws) return;
    
    for (const [roomId, users] of this.rooms) {
      if (users.has(userId)) {
        users.delete(userId);
        
        this.broadcastToRoom(roomId, {
          type: 'user-left',
          userId
        }, userId);
        
        if (users.size === 0) {
          this.rooms.delete(roomId);
          this.messageQueue.delete(roomId);
        }
      }
    }
    
    this.connections.delete(userId);
    
    this.emit('userDisconnected', { userId });
  }

  handleError(userId, error) {
    this.emit('error', { userId, error });
  }

  cleanupInactiveConnections() {
    const now = Date.now();
    const timeout = 30000;
    
    this.connections.forEach((ws, userId) => {
      if (!ws.isAlive || (now - ws.lastPing > timeout)) {
        ws.close(1000, 'Connection timeout');
        this.connections.delete(userId);
        
        for (const [roomId, users] of this.rooms) {
          if (users.has(userId)) {
            users.delete(userId);
            
            if (users.size === 0) {
              this.rooms.delete(roomId);
              this.messageQueue.delete(roomId);
            }
          }
        }
        
        this.emit('connectionCleaned', { userId });
      }
    });
  }

  getStats() {
    return {
      totalConnections: this.connections.size,
      totalRooms: this.rooms.size,
      roomSizes: Array.from(this.rooms.entries()).map(([roomId, users]) => ({
        roomId,
        userCount: users.size
      })),
      pendingMessages: this.pendingMessages.length,
      poolStats: poolMonitor.getStats()
    };
  }

  closeAll() {
    for (const [userId, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Server shutdown');
      }
    }
    
    this.connections.clear();
    this.rooms.clear();
    this.messageQueue.clear();
    
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
  }
}

export default OptimizedSocketHandler;
