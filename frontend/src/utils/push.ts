import api from './api';

class PushNotificationService {
    private swRegistration: ServiceWorkerRegistration | null = null;
    private vapidPublicKey: string | null = null;

    async init(): Promise<boolean> {
        // Check if push notifications are supported
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('[Push] Push notifications not supported');
            return false;
        }

        try {
            // Register service worker
            this.swRegistration = await navigator.serviceWorker.register('/sw-push.js');
            console.log('[Push] Service worker registered:', this.swRegistration);

            // Get VAPID public key from server
            const response = await api.get('/push/vapid-public-key');
            this.vapidPublicKey = response.data.publicKey;
            console.log('[Push] VAPID key received');

            return true;
        } catch (error) {
            console.error('[Push] Failed to initialize:', error);
            return false;
        }
    }

    async requestPermission(): Promise<NotificationPermission> {
        if (!('Notification' in window)) {
            console.log('[Push] Notifications not supported');
            return 'denied';
        }

        const permission = await Notification.requestPermission();
        console.log('[Push] Permission:', permission);
        return permission;
    }

    async subscribe(): Promise<boolean> {
        if (!this.swRegistration || !this.vapidPublicKey) {
            console.log('[Push] Not initialized, call init() first');
            const initialized = await this.init();
            if (!initialized) return false;
        }

        try {
            // Request permission first
            const permission = await this.requestPermission();
            if (permission !== 'granted') {
                console.log('[Push] Permission denied');
                return false;
            }

            // Subscribe to push
            const subscription = await this.swRegistration!.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey!) as BufferSource
            });

            console.log('[Push] Subscribed:', subscription);

            // Send subscription to server
            await api.post('/push/subscribe', { subscription: subscription.toJSON() });
            console.log('[Push] Subscription saved to server');

            return true;
        } catch (error) {
            console.error('[Push] Subscribe error:', error);
            return false;
        }
    }

    async unsubscribe(): Promise<boolean> {
        if (!this.swRegistration) return false;

        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
                await api.post('/push/unsubscribe');
                console.log('[Push] Unsubscribed');
            }
            return true;
        } catch (error) {
            console.error('[Push] Unsubscribe error:', error);
            return false;
        }
    }

    async isSubscribed(): Promise<boolean> {
        if (!this.swRegistration) return false;

        try {
            const subscription = await this.swRegistration.pushManager.getSubscription();
            return subscription !== null;
        } catch {
            return false;
        }
    }

    getPermissionStatus(): NotificationPermission {
        if (!('Notification' in window)) return 'denied';
        return Notification.permission;
    }

    // Helper function to convert VAPID key
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

export const pushService = new PushNotificationService();
