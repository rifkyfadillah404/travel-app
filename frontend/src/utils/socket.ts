import { io, Socket } from 'socket.io-client';

// Use ngrok URL for mobile/remote testing
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
// Remove '/api' from the end to get the base URL
const SOCKET_URL = API_URL.replace(/\/api$/, '');

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket?.connected) return;

    const token = localStorage.getItem('token');

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: {
        token
      }
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return this.socket;
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
    this.socket?.on('user-location-updated', (data) => {
      console.log(`[Socket] Received user-location-updated for user ${data.userId}:`, data.location);
      callback(data);
    });
  }

  onNewPanicAlert(callback: (alert: unknown) => void) {
    this.socket?.on('new-panic-alert', callback);
  }

  onPanicResolved(callback: (data: { alertId: string; userId: string }) => void) {
    this.socket?.on('panic-alert-resolved', callback);
  }

  onUserProfileUpdated(callback: (data: { userId: string; avatar: string }) => void) {
    this.socket?.on('user-profile-updated', callback);
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();
