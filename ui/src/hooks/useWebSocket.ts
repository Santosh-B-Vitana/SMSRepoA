import { useEffect, useState, useCallback } from 'react';
import { getWebSocketService } from '@/services/websocket';
import { useToast } from '@/hooks/use-toast';

interface UseWebSocketOptions {
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { autoConnect = true, onConnect, onDisconnect } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const ws = getWebSocketService();

  const connect = useCallback(async () => {
    try {
      await ws.connect();
      setIsConnected(true);
      setError(null);
      onConnect?.();
    } catch (err) {
      setError(err as Error);
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to establish real-time connection. Some features may be limited.",
        variant: "destructive",
      });
    }
  }, [ws, onConnect, toast]);

  const disconnect = useCallback(() => {
    ws.disconnect();
    setIsConnected(false);
    onDisconnect?.();
  }, [ws, onDisconnect]);

  const send = useCallback((type: string, payload: any) => {
    if (isConnected) {
      ws.send(type, payload);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }, [ws, isConnected]);

  const subscribe = useCallback((type: string, handler: (data: any) => void) => {
    ws.on(type, handler);
    return () => ws.off(type, handler);
  }, [ws]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    send,
    subscribe,
  };
}

// Specific hooks for common use cases
export function useNotificationWebSocket() {
  const { subscribe } = useWebSocket();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribe('notification', (notification) => {
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.type === 'error' ? 'destructive' : 'default',
      });
    });

    return unsubscribe;
  }, [subscribe, toast]);
}

export function useAttendanceWebSocket(onUpdate: (data: any) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('attendance_update', onUpdate);
    return unsubscribe;
  }, [subscribe, onUpdate]);
}

export function useFeePaymentWebSocket(onPayment: (data: any) => void) {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribe = subscribe('payment_received', onPayment);
    return unsubscribe;
  }, [subscribe, onPayment]);
}
