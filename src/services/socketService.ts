import { io, Socket } from 'socket.io-client';
import { ApiMenu } from './api';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) {
      return this.socket;
    }

    this.socket = io('https://back-menu.fly.dev', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket conectado:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket desconectado:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Error de conexión socket:', error);
    });

    this.socket.on('connected', (msg) => {
      console.log('🔌 Socket:', msg);
    });

    // Escuchar eventos de menú
    this.socket.on('menus:today', (menu: ApiMenu) => {
      console.log('📋 Menú HOY inicial:', menu);
      this.emit('menuToday', menu);
    });

    this.socket.on('menus:today_updated', (menu: ApiMenu) => {
      console.log('📋 Menú HOY actualizado:', menu);
      this.emit('menuTodayUpdated', menu);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Sistema de eventos interno para comunicar con los componentes
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'disconnected';
  }
}

export const socketService = new SocketService();