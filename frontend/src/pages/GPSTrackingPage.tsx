import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { MapPin, RefreshCw, Navigation, X, Users, Target, Route, Clock, Maximize2, Minimize2, Plus, Minus, Crosshair, Layers } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function GPSTrackingPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const circleRef = useRef<L.Circle | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const myLocationMarkerRef = useRef<L.Marker | null>(null);
  const hasInitialCenteredRef = useRef(false);
  const hasFitRouteRef = useRef(false);
  const { users, settings, currentUser } = useAppStore();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [myLocation, setMyLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [routeDistance, setRouteDistance] = useState<string | null>(null);
  const [routeDuration, setRouteDuration] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [isFollowing, setIsFollowing] = useState(false);

  // Filter out admins from tracking
  const filteredUsers = users.filter(u => u.role?.toLowerCase() !== 'admin');
  // Also filter out current user - can't track yourself
  // Convert both to string for reliable comparison (backend might send number, frontend expects string)
  const currentUserId = String(currentUser?.id || '');

  // DEBUG: Log to see what's happening
  console.log('DEBUG: currentUser.id =', currentUser?.id, 'type:', typeof currentUser?.id);
  console.log('DEBUG: currentUserId (string) =', currentUserId);
  console.log('DEBUG: filteredUsers IDs =', filteredUsers.map(u => ({ id: u.id, type: typeof u.id, name: u.name })));

  const usersWithLocation = filteredUsers.filter((u) => {
    const userId = String(u.id);
    const shouldInclude = u.location && userId !== currentUserId;
    return shouldInclude;
  });
  const selectedUser = selectedUserId ? filteredUsers.find(u => String(u.id) === String(selectedUserId)) : null;

  // Reset route fit flag when changing target user
  useEffect(() => {
    hasFitRouteRef.current = false;
  }, [selectedUserId]);

  // Get current user's location with high accuracy
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Browser tidak mendukung GPS');
      return;
    }

    setGpsError(null);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setMyLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setGpsAccuracy(position.coords.accuracy);
        setGpsError(null);
      },
      (error) => {
        console.error('Geolocation error:', error);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError('Izin GPS ditolak. Aktifkan di pengaturan browser.');
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError('Lokasi tidak tersedia. Coba di area terbuka.');
            break;
          case error.TIMEOUT:
            setGpsError('Timeout. Mencoba ulang...');
            break;
          default:
            setGpsError('Gagal mendapatkan lokasi.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0 // Selalu minta lokasi fresh
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Update my location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !myLocation) return;

    // Remove existing marker to redraw
    if (myLocationMarkerRef.current) {
      myLocationMarkerRef.current.remove();
    }

    const hasAvatar = !!currentUser?.avatar;
    const userInitial = currentUser?.name?.charAt(0) || 'M';
    const iconSize = 48;

    const myIcon = L.divIcon({
      className: 'my-location-marker',
      html: `
        <div style="
          width: ${iconSize}px;
          height: ${iconSize}px;
          background: ${hasAvatar ? '#fff' : '#3b82f6'};
          border: 3px solid #3b82f6;
          border-radius: 50%;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${hasAvatar
          ? `<img src="${currentUser.avatar}" style="width: 100%; height: 100%; object-fit: cover;" />`
          : `<span style="color: white; font-weight: bold; font-size: 18px;">${userInitial}</span>`
        }
        </div>
      `,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    });

    myLocationMarkerRef.current = L.marker([myLocation.lat, myLocation.lng], { icon: myIcon, zIndexOffset: 1000 })
      .addTo(mapInstanceRef.current)
      .bindPopup('Lokasi Anda');

  }, [myLocation, currentUser?.avatar, currentUser?.name]);

  // Fetch route from OSRM API
  const fetchRoute = async (start: { lat: number; lng: number }, end: { lat: number; lng: number }) => {
    try {
      // OSRM API: coordinates are lng,lat (reversed!)
      const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Convert GeoJSON coordinates [lng, lat] to Leaflet LatLng [lat, lng]
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) =>
          L.latLng(coord[1], coord[0])
        );

        return {
          coordinates,
          distance: route.distance, // in meters
          duration: route.duration  // in seconds
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch route:', error);
      return null;
    }
  };

  // Create/update route line when tracking
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Remove existing route line
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    // Create new route if we have both locations
    if (selectedUser?.location && myLocation) {
      const myLatLng = L.latLng(myLocation.lat, myLocation.lng);
      const targetLatLng = L.latLng(selectedUser.location.lat, selectedUser.location.lng);

      setIsLoadingRoute(true);

      // Draw temporary straight line first (instant visual feedback)
      routeLineRef.current = L.polyline([myLatLng, targetLatLng], {
        color: '#94a3b8',
        weight: 3,
        opacity: 0.5,
        dashArray: '10, 10',
      }).addTo(mapInstanceRef.current!);

      // Fetch actual road route from OSRM
      fetchRoute(myLocation, selectedUser.location).then((routeData) => {
        if (!mapInstanceRef.current) return;

        // Remove the temporary line
        if (routeLineRef.current) {
          routeLineRef.current.remove();
        }

        if (routeData) {
          // Draw actual road route
          routeLineRef.current = L.polyline(routeData.coordinates, {
            color: '#3b82f6',
            weight: 5,
            opacity: 0.8,
          }).addTo(mapInstanceRef.current!);

          // Update distance from actual route
          const distanceKm = routeData.distance / 1000;
          if (distanceKm < 1) {
            setRouteDistance(`${Math.round(routeData.distance)} m`);
          } else {
            setRouteDistance(`${distanceKm.toFixed(1)} km`);
          }

          // Update duration from actual route (walking)
          const durationMin = Math.round(routeData.duration / 60);
          if (durationMin < 60) {
            setRouteDuration(`~${durationMin} menit`);
          } else {
            const hours = Math.floor(durationMin / 60);
            const mins = durationMin % 60;
            setRouteDuration(`~${hours} jam ${mins} menit`);
          }
        } else {
          // Fallback to straight line if routing fails
          routeLineRef.current = L.polyline([myLatLng, targetLatLng], {
            color: '#3b82f6',
            weight: 4,
            opacity: 0.7,
          }).addTo(mapInstanceRef.current!);

          // Calculate straight-line distance as fallback
          const R = 6371;
          const dLat = (selectedUser.location!.lat - myLocation.lat) * Math.PI / 180;
          const dLng = (selectedUser.location!.lng - myLocation.lng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(myLocation.lat * Math.PI / 180) * Math.cos(selectedUser.location!.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distanceKm = R * c;

          if (distanceKm < 1) {
            setRouteDistance(`${Math.round(distanceKm * 1000)} m`);
          } else {
            setRouteDistance(`${distanceKm.toFixed(1)} km`);
          }

          const walkingTimeMin = Math.round((distanceKm / 5) * 60);
          if (walkingTimeMin < 60) {
            setRouteDuration(`~${walkingTimeMin} menit`);
          } else {
            const hours = Math.floor(walkingTimeMin / 60);
            const mins = walkingTimeMin % 60;
            setRouteDuration(`~${hours} jam ${mins} menit`);
          }
        }

        setIsLoadingRoute(false);
      });

      // Fit map to show both points (only once)
      if (!hasFitRouteRef.current) {
        const bounds = L.latLngBounds([myLatLng, targetLatLng]);
        mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] });
        hasFitRouteRef.current = true;
      }
    } else {
      setRouteDistance(null);
      setRouteDuration(null);
    }
  }, [selectedUser?.location?.lat, selectedUser?.location?.lng, myLocation?.lat, myLocation?.lng]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Default ke Indonesia (Jakarta) dulu, nanti update setelah dapat lokasi
    const map = L.map(mapRef.current).setView([-6.2088, 106.8456], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Disable follow mode when user manually drags the map
    map.on('dragstart', () => {
      setIsFollowing(false);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Center map on user's location when first detected
  useEffect(() => {
    if (mapInstanceRef.current && myLocation && !selectedUserId && !hasInitialCenteredRef.current) {
      mapInstanceRef.current.setView([myLocation.lat, myLocation.lng], 16);
      hasInitialCenteredRef.current = true;
    }
  }, [myLocation, selectedUserId]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }

    usersWithLocation.forEach((user) => {
      if (!user.location) return;

      const isSelected = user.id === selectedUserId;
      const iconColor = user.isPanic ? '#ef4444' : user.isOnline ? '#22c55e' : '#9ca3af';
      const iconSize = isSelected ? 48 : 36;
      const borderWidth = isSelected ? 4 : 3;

      const avatarContent = user.avatar
        ? `<img src="${user.avatar}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover;" />`
        : `<span style="color: white; font-weight: bold; font-size: ${isSelected ? '16px' : '13px'};">${user.name.charAt(0)}</span>`;

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${user.avatar ? '#fff' : iconColor};
            width: ${iconSize}px;
            height: ${iconSize}px;
            border-radius: 50%;
            border: ${borderWidth}px solid ${isSelected ? '#0ea5e9' : iconColor};
            box-shadow: 0 2px 8px rgba(0,0,0,0.3)${isSelected ? ', 0 0 0 4px rgba(14, 165, 233, 0.3)' : ''};
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          ">
            ${avatarContent}
          </div>
        `,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2],
      });

      const marker = L.marker([user.location.lat, user.location.lng], { icon: customIcon })
        .addTo(mapInstanceRef.current!)
        .bindPopup(`
          <div class="map-popup-card">
            <div class="popup-avatar-wrapper">
              ${user.avatar
            ? `<img src="${user.avatar}" class="popup-avatar-img" alt="${user.name}" />`
            : `<div class="popup-avatar-placeholder">${user.name.charAt(0)}</div>`
          }
              <span class="popup-status-dot ${user.isOnline ? 'online' : 'offline'}"></span>
            </div>
            <div class="popup-info">
              <span class="popup-name">${user.name}</span>
              <span class="popup-phone">${user.phone}</span>
              <span class="popup-status ${user.isOnline ? 'online' : 'offline'}">
                ${user.isOnline ? 'Online' : 'Offline'}
              </span>
              ${user.isPanic ? '<span class="popup-panic">PANIC!</span>' : ''}
            </div>
          </div>
        `, {
          className: 'custom-popup',
          closeButton: false,
          offset: [0, -10]
        });

      markersRef.current.push(marker);

      if (isSelected && user.location) {
        circleRef.current = L.circle([user.location.lat, user.location.lng], {
          radius: settings.radiusLimit,
          color: '#0ea5e9',
          fillColor: '#0ea5e9',
          fillOpacity: 0.1,
          weight: 2,
        }).addTo(mapInstanceRef.current!);

        // Only auto-center if follow mode is enabled
        if (isFollowing) {
          mapInstanceRef.current?.setView(
            [user.location.lat, user.location.lng],
            mapInstanceRef.current.getZoom() // Keep current zoom level
          );
        }
      }
    });

    if (!selectedUserId && usersWithLocation.length > 0 && usersWithLocation[0].location) {
      const center = usersWithLocation[0].location;
      circleRef.current = L.circle([center.lat, center.lng], {
        radius: settings.radiusLimit,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
      }).addTo(mapInstanceRef.current);
    }
  }, [
    JSON.stringify(usersWithLocation.map(u => ({ id: u.id, lat: u.location?.lat, lng: u.location?.lng, isOnline: u.isOnline, isPanic: u.isPanic })),),
    settings.radiusLimit,
    selectedUserId,
    isFollowing
  ]);

  const handleRefresh = () => {
    window.location.reload();
  };

  const centerOnUser = (lat: number, lng: number, userId?: string) => {
    if (userId) {
      setSelectedUserId(userId);
    }
    mapInstanceRef.current?.setView([lat, lng], 17);
  };

  const handleStartTracking = (userId: string) => {
    setSelectedUserId(userId);
    setShowUserPicker(false);
    setIsFollowing(false); // Don't auto-follow, let user explore freely
    const user = users.find(u => u.id === userId);
    if (user?.location) {
      mapInstanceRef.current?.setView([user.location.lat, user.location.lng], 17);
    }
  };

  const handleStopTracking = () => {
    setSelectedUserId(null);
    setIsFollowing(false);
    if (usersWithLocation.length > 0 && usersWithLocation[0].location) {
      mapInstanceRef.current?.setView([usersWithLocation[0].location.lat, usersWithLocation[0].location.lng], 15);
    }
  };

  // Map control functions
  const handleCenterOnMe = () => {
    if (myLocation && mapInstanceRef.current) {
      mapInstanceRef.current.setView([myLocation.lat, myLocation.lng], 17);
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Invalidate map size after state change
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 100);
  };

  const handleToggleMapType = () => {
    if (!mapInstanceRef.current) return;

    const newType = mapType === 'street' ? 'satellite' : 'street';
    setMapType(newType);

    // Remove existing tile layer
    mapInstanceRef.current.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        layer.remove();
      }
    });

    // Add new tile layer
    if (newType === 'satellite') {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri',
      }).addTo(mapInstanceRef.current);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstanceRef.current);
    }
  };

  const handleFitAllUsers = () => {
    if (!mapInstanceRef.current || usersWithLocation.length === 0) return;

    const points: L.LatLng[] = usersWithLocation
      .filter(u => u.location)
      .map(u => L.latLng(u.location!.lat, u.location!.lng));

    if (myLocation) {
      points.push(L.latLng(myLocation.lat, myLocation.lng));
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const renderAvatar = (user: typeof users[0], size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClass = size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : '';
    if (user.avatar) {
      return (
        <div className={`location-avatar ${user.isOnline ? 'avatar--online' : 'avatar--offline'} ${sizeClass}`}>
          <img src={user.avatar} alt={user.name} className="avatar-img" />
        </div>
      );
    }
    return (
      <div className={`location-avatar ${user.isOnline ? 'avatar--online' : 'avatar--offline'} ${sizeClass}`}>
        {user.name.charAt(0)}
      </div>
    );
  };

  return (
    <div className="gps-tracking-page">
      <div className="page-header">
        <h2>GPS Tracking</h2>
        <p className="subtitle">Live lokasi jamaah</p>
        <button className="refresh-btn" onClick={handleRefresh}>
          <RefreshCw size={18} />
        </button>
      </div>

      {selectedUser ? (
        <div className="tracking-active-card">
          <div className="tracking-active-info">
            {selectedUser.avatar ? (
              <div className="tracking-avatar" style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: `3px solid ${selectedUser.isOnline ? '#22c55e' : '#9ca3af'}`,
                flexShrink: 0
              }}>
                <img
                  src={selectedUser.avatar}
                  alt={selectedUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ) : (
              <div className="tracking-avatar" style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: selectedUser.isOnline ? '#22c55e' : '#9ca3af',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '18px',
                flexShrink: 0
              }}>
                {selectedUser.name.charAt(0)}
              </div>
            )}
            <div className="tracking-active-details">
              <span className="tracking-active-label">Sedang Melacak</span>
              <span className="tracking-active-name">{selectedUser.name}</span>
              {isLoadingRoute && (
                <span className="route-loading">Menghitung rute...</span>
              )}
              {(routeDistance || routeDuration) && (
                <div className="route-info">
                  {routeDistance && (
                    <span className="route-stat">
                      <Route size={14} />
                      {routeDistance}
                    </span>
                  )}
                  {routeDuration && (
                    <span className="route-stat">
                      <Clock size={14} />
                      {routeDuration}
                    </span>
                  )}
                </div>
              )}
              {!myLocation && !isLoadingRoute && (
                <span className="route-warning">Aktifkan GPS untuk navigasi</span>
              )}
            </div>
          </div>
          <button className="stop-tracking-btn" onClick={handleStopTracking}>
            <X size={18} />
            Stop
          </button>
        </div>
      ) : (
        <button className="start-tracking-btn" onClick={() => setShowUserPicker(true)}>
          <Navigation size={20} />
          <span>Start Tracking</span>
          <span className="start-tracking-hint">Pilih jamaah untuk dilacak</span>
        </button>
      )}

      {/* Map Container with Controls */}
      <div className={`map-wrapper ${isFullscreen ? 'fullscreen' : ''}`}>
        <div className="map-container" ref={mapRef}></div>

        {/* Map Controls */}
        <div className="map-controls">
          <button className="map-control-btn" onClick={handleToggleFullscreen} title={isFullscreen ? 'Keluar Fullscreen' : 'Fullscreen'}>
            {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>

          {selectedUser && (
            <button
              className={`map-control-btn ${isFollowing ? 'active' : ''}`}
              onClick={() => {
                const newFollowingState = !isFollowing;
                setIsFollowing(newFollowingState);
                if (newFollowingState && selectedUser?.location) {
                  mapInstanceRef.current?.setView([selectedUser.location.lat, selectedUser.location.lng], 16);
                }
              }}
              title={isFollowing ? "Stop Follow" : "Follow User"}
            >
              <Target size={20} className={isFollowing ? "animate-pulse" : ""} />
            </button>
          )}

          {isFullscreen && (
            <>
              <button className="map-control-btn" onClick={handleCenterOnMe} disabled={!myLocation} title="Pusatkan ke Lokasi Saya">
                <Crosshair size={20} />
              </button>
              <button className="map-control-btn" onClick={handleFitAllUsers} title="Lihat Semua User">
                <Users size={20} />
              </button>
              <button className="map-control-btn" onClick={handleToggleMapType} title={mapType === 'street' ? 'Tampilan Satelit' : 'Tampilan Peta'}>
                <Layers size={20} />
              </button>
              <div className="map-control-divider"></div>
              <button className="map-control-btn" onClick={handleZoomIn} title="Zoom In">
                <Plus size={20} />
              </button>
              <button className="map-control-btn" onClick={handleZoomOut} title="Zoom Out">
                <Minus size={20} />
              </button>
            </>
          )}
        </div>

        {/* Fullscreen Info Overlay */}
        {isFullscreen && selectedUser && (
          <div className="fullscreen-info-card">
            <div className="fullscreen-info-header">
              {selectedUser.avatar ? (
                <img src={selectedUser.avatar} alt={selectedUser.name} className="fullscreen-avatar" />
              ) : (
                <div className="fullscreen-avatar-placeholder">{selectedUser.name.charAt(0)}</div>
              )}
              <div className="fullscreen-info-details">
                <span className="fullscreen-name">{selectedUser.name}</span>
                {(routeDistance || routeDuration) && (
                  <div className="fullscreen-route">
                    {routeDistance && <span><Route size={14} /> {routeDistance}</span>}
                    {routeDuration && <span><Clock size={14} /> {routeDuration}</span>}
                  </div>
                )}
              </div>
              <button className="fullscreen-stop-btn" onClick={handleStopTracking}>
                <X size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Fullscreen GPS Status */}
        {isFullscreen && (
          <div className={`fullscreen-gps-status ${gpsError ? 'error' : myLocation ? 'active' : 'loading'}`}>
            <MapPin size={14} />
            {gpsError ? 'GPS Error' : myLocation ? `GPS Aktif ${gpsAccuracy ? `(${Math.round(gpsAccuracy)}m)` : ''}` : 'Mencari...'}
          </div>
        )}
      </div>

      {/* Hide these when fullscreen */}
      {!isFullscreen && (
        <>
          {/* GPS Status Bar */}
          <div className={`gps-status-bar ${gpsError ? 'error' : myLocation ? 'active' : 'loading'}`}>
            {gpsError ? (
              <>
                <MapPin size={16} />
                <span>{gpsError}</span>
              </>
            ) : myLocation ? (
              <>
                <MapPin size={16} />
                <span>GPS Aktif</span>
                {gpsAccuracy && (
                  <span className="gps-accuracy">Akurasi: {Math.round(gpsAccuracy)}m</span>
                )}
              </>
            ) : (
              <>
                <MapPin size={16} className="pulse" />
                <span>Mencari lokasi...</span>
              </>
            )}
          </div>

          <div className="tracking-info">
            <div className="tracking-stats">
              <span className="stat">
                <MapPin size={16} /> {usersWithLocation.length} lokasi aktif
              </span>
              <span className="stat">
                Radius: {settings.radiusLimit}m
              </span>
            </div>
          </div>

          <div className="user-locations-list">
            <h3>Lokasi Jamaah</h3>
            {usersWithLocation.map((user) => (
              <div
                key={user.id}
                className={`location-card ${user.isPanic ? 'location-card--panic' : ''} ${user.id === selectedUserId ? 'location-card--selected' : ''}`}
                onClick={() => user.location && centerOnUser(user.location.lat, user.location.lng, user.id)}
              >
                {renderAvatar(user)}
                <div className="location-details">
                  <span className="location-name">
                    {user.name}
                    {user.id === selectedUserId && <Target size={14} className="tracking-icon" />}
                  </span>
                  {user.location && (
                    <span className="location-coords">
                      {user.location.lat.toFixed(4)}, {user.location.lng.toFixed(4)}
                    </span>
                  )}
                </div>
                {user.location && (
                  <span className="location-time">
                    {formatDistanceToNow(user.location.timestamp, { addSuffix: true, locale: id })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {showUserPicker && (
        <div className="modal-overlay" onClick={() => setShowUserPicker(false)}>
          <div className="modal-container user-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><Users size={20} /> Pilih Jamaah</h3>
              <button className="modal-close-btn" onClick={() => setShowUserPicker(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="user-picker-list">
              {usersWithLocation.length === 0 ? (
                <div className="user-picker-empty">
                  <MapPin size={32} />
                  <p>Belum ada jamaah dengan lokasi aktif</p>
                </div>
              ) : (
                usersWithLocation.map((user) => (
                  <button
                    key={user.id}
                    className="user-picker-item"
                    onClick={() => handleStartTracking(user.id)}
                  >
                    {renderAvatar(user)}
                    <div className="user-picker-info">
                      <span className="user-picker-name">{user.name}</span>
                      <span className="user-picker-status">
                        {user.isOnline ? 'Online' : 'Offline'}
                        {user.isPanic && ' - PANIC!'}
                      </span>
                    </div>
                    <Navigation size={18} className="user-picker-arrow" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
