import { useEffect, useRef, useState } from 'react';
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
  const [isAppVisible, setIsAppVisible] = useState(!document.hidden);

  // Handle app visibility (foreground/background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsAppVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // BATTERY OPTIMIZATION: Only track if app is in foreground
    if (!isAuthenticated || !settings.isAppActive || !settings.isGpsActive || !currentUser || !isAppVisible) {
      // Cleanup if conditions not met (e.g. app goes to background)
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
        // BATTERY OPTIMIZATION: Only send if moved more than 15 meters
        // OR if this is the first time sending
        if (!lastSent || getDistance(current.lat, current.lng, lastSent.lat, lastSent.lng) > 15) {
          sendLocation(current.lat, current.lng);
          lastSentLocationRef.current = { ...current };
        }
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
  }, [isAuthenticated, settings.isAppActive, settings.isGpsActive, settings.trackingInterval, currentUser, sendLocation, isAppVisible, users]);

  // This component doesn't render anything
  return null;
}
