import { useEffect, useState } from 'react';
import { socketService } from '../services/socketService';
import { ApiMenu } from '../services/api';

export const useSocketConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  useEffect(() => {
    // Conectar al socket
    const socket = socketService.connect();

    const updateConnectionStatus = () => {
      const status = socketService.getConnectionStatus();
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
    };

    // Escuchar eventos de conexión
    socket.on('connect', updateConnectionStatus);
    socket.on('disconnect', updateConnectionStatus);
    socket.on('connect_error', updateConnectionStatus);

    // Estado inicial
    updateConnectionStatus();

    // Cleanup al desmontar
    return () => {
      socket.off('connect', updateConnectionStatus);
      socket.off('disconnect', updateConnectionStatus);
      socket.off('connect_error', updateConnectionStatus);
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    socketService
  };
};

export const useMenuSocket = (onMenuUpdate?: (menu: ApiMenu) => void) => {
  const { isConnected, connectionStatus } = useSocketConnection();

  useEffect(() => {
    if (!onMenuUpdate) return;

    const handleMenuToday = (menu: ApiMenu) => {
      onMenuUpdate(menu);
    };

    const handleMenuTodayUpdated = (menu: ApiMenu) => {
      onMenuUpdate(menu);
    };

    // Suscribirse a eventos de menú
    socketService.on('menuToday', handleMenuToday);
    socketService.on('menuTodayUpdated', handleMenuTodayUpdated);

    // Cleanup
    return () => {
      socketService.off('menuToday', handleMenuToday);
      socketService.off('menuTodayUpdated', handleMenuTodayUpdated);
    };
  }, [onMenuUpdate]);

  return {
    isConnected,
    connectionStatus
  };
};