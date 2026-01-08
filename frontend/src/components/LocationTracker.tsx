import { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';

// Helper to calculate distance between two coordinates in meters
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in metres
}

export function LocationTracker() {
  const { settings, currentUser, sendLocation, isAuthenticated, users } = useAppStore();
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastSentLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Request wake lock to keep screen on during tracking
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && settings.isGpsActive && isAuthenticated) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
          console.log('[LocationTracker] Wake lock acquired - screen will stay on');
        } catch (err) {
          console.log('[LocationTracker] Wake lock failed:', err);
        }
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden && settings.isGpsActive) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      wakeLock?.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.isGpsActive, isAuthenticated]);

  useEffect(() => {
    // Track even in background, but we won't stop tracking when hidden
    if (!isAuthenticated || !settings.isAppActive || !settings.isGpsActive || !currentUser) {
      // Cleanup if conditions not met
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      return;
    }

    // High accuracy is only needed if there's an active panic or user is pembimbing/admin
    const needsHighAccuracy = currentUser.role !== 'jamaah' || users.some(u => u.isPanic);

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        lastLocationRef.current = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: needsHighAccuracy,
        timeout: 20000,
        maximumAge: 10000, // Reuse location if it's less than 10s old
      }
    );

    // Send location to server at configured interval
    intervalRef.current = setInterval(() => {
      const current = lastLocationRef.current;
      const lastSent = lastSentLocationRef.current;

      if (current) {
        const distance = lastSent ? getDistance(current.lat, current.lng, lastSent.lat, lastSent.lng) : Infinity;

        // Debug log
        console.log(`[LocationTracker] Current: ${current.lat.toFixed(6)}, ${current.lng.toFixed(6)} | Distance moved: ${distance.toFixed(1)}m`);

        // Send if moved more than 5 meters OR first time sending
        if (!lastSent || distance > 5) {
          console.log(`[LocationTracker] Sending location update...`);
          sendLocation(current.lat, current.lng);
          lastSentLocationRef.current = { ...current };
        } else {
          console.log(`[LocationTracker] Not sending - moved only ${distance.toFixed(1)}m (threshold: 5m)`);
        }
      } else {
        console.log(`[LocationTracker] No location available yet`);
      }
    }, settings.trackingInterval * 1000);

    // Cleanup on unmount, background, or settings change
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, settings.isAppActive, settings.isGpsActive, settings.trackingInterval, currentUser, sendLocation, users]);

  // This component doesn't render anything
  return null;
}
