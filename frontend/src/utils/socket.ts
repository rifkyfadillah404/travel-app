import { io, Socket } from 'socket.io-client';

// Use ngrok URL for mobile/remote testing
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// Remove '/api' from the end to get the base URL
const SOCKET_URL = API_URL.replace(/\/api$/, '');

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function> = new Map();

  connect() {
    // Disconnect existing socket first if any
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    const token = localStorage.getItem('token');
    console.log('[Socket] Connecting with token:', token ? 'present' : 'missing');

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token
      },
      forceNew: true // Force new connection
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket?.id);
      // Re-attach all stored listeners after connect
      this.reattachListeners();
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    return this.socket;
  }

  private reattachListeners() {
    if (!this.socket) return;
    
    console.log('[Socket] Reattaching', this.listeners.size, 'listeners');
    this.listeners.forEach((callback, event) => {
      this.socket?.off(event);
      this.socket?.on(event, callback as any);
      console.log('[Socket] Attached listener for:', event);
    });
  }

  private addListener(event: string, callback: Function) {
    // Store listener - will be attached when socket connects
    this.listeners.set(event, callback);
    
    // If socket already connected, attach immediately
    if (this.socket?.connected) {
      this.socket.off(event);
      this.socket.on(event, callback as any);
      console.log('[Socket] Immediately attached listener for:', event);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    // Keep listeners in map so they can be reattached on next connect
  }

  sendLocationUpdate(latitude: number, longitude: number) {
    if (!this.socket?.connected) {
      console.warn('[Socket] Cannot send location - not connected');
      return;
    }
    console.log(`[Socket] Emitting location-update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    this.socket.emit('location-update', { latitude, longitude });
  }

  sendPanicAlert(alert: unknown) {
    this.socket?.emit('panic-alert', { alert });
  }

  sendPanicResolved(alertId: string) {
    this.socket?.emit('panic-resolved', { alertId });
  }

  onUserLocationUpdated(callback: (data: { userId: string; location: { lat: number; lng: number; timestamp: number } }) => void) {
    const wrappedCallback = (data: any) => {
      console.log(`[Socket] Received user-location-updated for user ${data.userId}:`, data.location);
      callback(data);
    };
    this.addListener('user-location-updated', wrappedCallback);
  }

  onNewPanicAlert(callback: (alert: unknown) => void) {
    this.addListener('new-panic-alert', callback);
  }

  onPanicResolved(callback: (data: { alertId: string; userId: string }) => void) {
    this.addListener('panic-alert-resolved', callback);
  }

  onUserProfileUpdated(callback: (data: { userId: string; avatar: string }) => void) {
    this.addListener('user-profile-updated', callback);
  }

  getSocket() {
    return this.socket;
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
