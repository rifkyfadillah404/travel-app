import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { AlertTriangle, Phone, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export function PanicButtonPage() {
  const { 
    currentUser, 
    users, 
    panicAlerts, 
    triggerPanic: triggerPanicAction, 
    resolveAlert: resolveAlertAction 
  } = useAppStore();
  
  const [isPressing, setIsPressing] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const [customMessage, setCustomMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);
  const [isResolving, setIsResolving] = useState<string | null>(null);

  const PRESS_DURATION = 3000; // 3 seconds to activate panic

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isPressing) {
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / PRESS_DURATION) * 100, 100);
        setPressProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          handleTriggerPanic();
        }
      }, 50);
    } else {
      setPressProgress(0);
    }

    return () => clearInterval(interval);
  }, [isPressing]);

  const handleTriggerPanic = async () => {
    if (!currentUser) return;

    // Use current location or default
    const lat = currentUser.location?.lat || 0;
    const lng = currentUser.location?.lng || 0;
    const message = customMessage || 'DARURAT! Butuh bantuan segera!';

    await triggerPanicAction(message, lat, lng);

    setIsPressing(false);
    setShowMessageInput(false);
    setCustomMessage('');

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('PANIC ALERT!', {
        body: `${currentUser.name}: ${message}`,
        icon: '/icon.svg',
      });
    }
  };

  const handleResolve = async (alertId: string, userId: string) => {
    setIsResolving(alertId);
    await resolveAlertAction(alertId, userId);
    setIsResolving(null);
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const unresolvedAlerts = panicAlerts.filter((a) => !a.isResolved);
  const resolvedAlerts = panicAlerts.filter((a) => a.isResolved);

  return (
    <div className="panic-button-page">
      <div className="page-header">
        <h2>Panic Button</h2>
        <p className="subtitle">Tombol darurat - informasi ke seluruh user</p>
      </div>

      <div className="panic-section">
        <div className="panic-button-container">
          <button
            className={`panic-button ${isPressing ? 'panic-button--pressing' : ''}`}
            onMouseDown={() => setIsPressing(true)}
            onMouseUp={() => setIsPressing(false)}
            onMouseLeave={() => setIsPressing(false)}
            onTouchStart={() => setIsPressing(true)}
            onTouchEnd={() => setIsPressing(false)}
          >
            <div
              className="panic-progress"
              style={{ height: `${pressProgress}%` }}
            />
            <div className="panic-content">
              <AlertTriangle size={48} strokeWidth={1} />
              <span>PANIC</span>
            </div>
          </button>
          <p className="panic-instruction">
            Tekan dan tahan selama 3 detik untuk mengirim alert darurat
          </p>
        </div>

        <button
          className="custom-message-btn"
          onClick={() => setShowMessageInput(!showMessageInput)}
        >
          {showMessageInput ? 'Tutup' : 'Tambah Pesan Kustom'}
        </button>

        {showMessageInput && (
          <div className="custom-message-input">
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Tulis pesan darurat..."
              maxLength={200}
            />
            <span className="char-count">{customMessage.length}/200</span>
          </div>
        )}
      </div>

      {unresolvedAlerts.length > 0 && (
        <div className="alerts-section">
          <h3>Alert Aktif ({unresolvedAlerts.length})</h3>
          {unresolvedAlerts.map((alert) => {
            const alertUser = users.find((u) => u.id === alert.userId);
            return (
              <div key={alert.id} className="alert-card alert-card--active">
                <div className="alert-header">
                  <AlertTriangle size={20} className="alert-icon" />
                  <strong>{alert.userName}</strong>
                  <span className="alert-time">
                    {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: id })}
                  </span>
                </div>
                <p className="alert-message">{alert.message}</p>
                <div className="alert-details">
                  {alertUser && (
                    <a href={`tel:${alertUser.phone}`} className="alert-phone">
                      <Phone size={14} /> {alertUser.phone}
                    </a>
                  )}
                  <span className="alert-location">
                    <MapPin size={14} /> {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
                  </span>
                </div>
                <button
                  className="resolve-btn"
                  onClick={() => handleResolve(alert.id, alert.userId)}
                  disabled={isResolving === alert.id}
                >
                  {isResolving === alert.id ? <Loader2 size={16} className="spin" /> : <CheckCircle size={16} />}
                  {isResolving === alert.id ? 'Menyelesaikan...' : 'Selesaikan'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {resolvedAlerts.length > 0 && (
        <div className="alerts-section alerts-section--resolved">
          <h3>Riwayat Alert ({resolvedAlerts.length})</h3>
          {resolvedAlerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="alert-card alert-card--resolved">
              <div className="alert-header">
                <CheckCircle size={16} className="resolved-icon" />
                <strong>{alert.userName}</strong>
                <span className="alert-time">
                  {formatDistanceToNow(alert.timestamp, { addSuffix: true, locale: id })}
                </span>
              </div>
              <p className="alert-message">{alert.message}</p>
            </div>
          ))}
        </div>
      )}

      <div className="info-section">
        <h3>Cara Kerja Panic Button</h3>
        <ul>
          <li>Tekan dan tahan tombol PANIC selama 3 detik</li>
          <li>Alert akan dikirim ke seluruh anggota group</li>
          <li>Lokasi Anda akan dibagikan ke pembimbing</li>
          <li>Pembimbing akan segera menghubungi Anda</li>
        </ul>
      </div>
    </div>
  );
}
