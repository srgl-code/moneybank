import { io } from 'socket.io-client';

// VITE_SOCKET_URL is set in Vercel environment variables to point at the Render backend.
// In dev the vite proxy forwards /socket.io → localhost:3001, so we use '' (same origin).
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

/**
 * Singleton socket instance.
 * autoConnect: false → we connect explicitly when needed.
 */
const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 8000,
  timeout: 60000,
});

export default socket;
