import { io, Socket } from 'socket.io-client';

// Use ngrok URL for mobile/remote testing
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// Remove '/api' from the end to get the base URL
const SOCKET_URL = API_URL.replace(/\/api$/, '');

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (this.socket?.connected) return this.socket;

    const token = localStorage.getItem('token');

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      // Re-attach all stored listeners after reconnect
      this.reattachListeners();
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return this.socket;
  }

  private reattachListeners() {
    if (!this.socket) return;
    
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        this.socket?.off(event, callback as any);
        this.socket?.on(event, callback as any);
      });
    });
  }

  private addListener(event: string, callback: Function) {
    // Remove old callbacks for this event to avoid duplicates
    this.listeners.set(event, [callback]);
    this.socket?.off(event);
    this.socket?.on(event, callback as any);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  sendLocationUpdate(latitude: number, longitude: number) {
    console.log(`[Socket] Emitting location-update: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    this.socket?.emit('location-update', { latitude, longitude });
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
}

export const socketService = new SocketService();
