import { create } from 'zustand';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const useTradingStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  logs: [],
  positions: [],
  engineStatus: 'offline',

  connect: () => {
    if (get().socket) return;
    
    const socket = io(SOCKET_URL);
    
    socket.on('connect', () => set({ isConnected: true }));
    socket.on('disconnect', () => set({ isConnected: false, engineStatus: 'offline' }));
    
    socket.on('system_message', (data) => {
      set((state) => ({ logs: [...state.logs, `[SYSTEM] ${data.msg}`] }));
    });
    
    socket.on('bot_event', (data) => {
      set((state) => ({ logs: [...state.logs, `[BOT] ${data.event}: ${data.status}`] }));
    });

    socket.on('engine_status', (data) => {
      set({ engineStatus: data.status });
    });
    
    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  startBot: () => {
    const { socket } = get();
    if (socket) socket.emit('command', { cmd: 'start_bot' });
  },

  stopBot: () => {
    const { socket } = get();
    if (socket) socket.emit('command', { cmd: 'stop_bot' });
  },
}));
