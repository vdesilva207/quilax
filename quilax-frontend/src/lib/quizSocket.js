import { io as createSocket } from 'socket.io-client';
import apiClient, { SOCKET_URL } from '@/lib/api';

let socket = null;

export function getQuizSocket() {
  return socket;
}

export function connectQuizSocket() {
  const token = apiClient.getToken?.() || apiClient.token;
  if (!token) return null;

  if (socket?.connected) return socket;

  if (socket) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = createSocket(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 800,
  });

  socket.on('connect', () => {
    socket.emit('join');
  });

  return socket;
}

export function disconnectQuizSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to quiz run state. Returns cleanup fn.
 */
export function subscribeQuizRun(
  quizRunId,
  { onState, onDisconnect, onReconnect, onPrizeDistributed, eventId } = {}
) {
  const s = connectQuizSocket();
  if (!s) return () => {};

  const handler = (payload) => {
    if (!payload) return;
    if (
      payload.quizRunId != null &&
      Number(payload.quizRunId) !== Number(quizRunId) &&
      !(eventId && payload.eventId === eventId)
    ) {
      if (!(eventId && Number(payload.eventId) === Number(eventId))) return;
    }
    onState?.(payload);
  };

  const prizeHandler = (payload) => {
    if (!payload) return;
    if (
      payload.quizRunId != null &&
      Number(payload.quizRunId) !== Number(quizRunId)
    ) {
      return;
    }
    onPrizeDistributed?.(payload);
  };

  const join = () => {
    s.emit('quiz:join', Number(quizRunId));
    if (eventId) s.emit('event:join', eventId);
  };

  const onDisc = () => onDisconnect?.();
  const onConn = () => {
    join();
    onReconnect?.();
  };

  s.on('quiz:state', handler);
  s.on('prize:distributed', prizeHandler);
  s.on('disconnect', onDisc);
  s.on('connect', onConn);
  if (s.connected) join();

  return () => {
    s.off('quiz:state', handler);
    s.off('prize:distributed', prizeHandler);
    s.off('disconnect', onDisc);
    s.off('connect', onConn);
  };
}

export default {
  connectQuizSocket,
  disconnectQuizSocket,
  subscribeQuizRun,
  getQuizSocket,
};
