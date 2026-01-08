import { useState, useEffect } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, Megaphone, Loader2 } from 'lucide-react';
import { notificationAPI } from '../utils/api';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'announcement';
  timestamp: string;
  isRead?: boolean;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle size={20} />;
    case 'success':
      return <CheckCircle size={20} />;
    case 'announcement':
      return <Megaphone size={20} />;
    default:
      return <Info size={20} />;
  }
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  if (hours < 24) return `${hours} jam lalu`;
  if (days < 7) return `${days} hari lalu`;

  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short'
  });
};

const isOldNotification = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  return hours >= 24; // Lebih dari 24 jam = old
};

export function NotificationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await notificationAPI.getAll();
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="notif-page">
        <div className="notif-loading">
          <Loader2 size={28} className="spin" />
          <span>Memuat...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="notif-page">
      {/* Minimal Header */}
      <div className="notif-header-minimal">
        <h1>Notifikasi</h1>
        {notifications.length > 0 && (
          <span className="notif-count">{notifications.length}</span>
        )}
      </div>

      {/* Notification List */}
      <div className="notif-list">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`notif-item ${isOldNotification(notif.timestamp) ? 'old' : 'new'} type-${notif.type}`}
            >
              <div className={`notif-icon-wrapper type-${notif.type}`}>
                {getIcon(notif.type)}
              </div>
              <div className="notif-content">
                <h3>{notif.title}</h3>
                <p className="notif-body">{notif.content}</p>
                <span className="notif-time">{formatTime(notif.timestamp)}</span>
              </div>
              {!isOldNotification(notif.timestamp) && <div className="notif-new-badge">Baru</div>}
            </div>
          ))
        ) : (
          <div className="notif-empty">
            <div className="notif-empty-icon">
              <Bell size={32} />
            </div>
            <h3>Tidak ada notifikasi</h3>
            <p>Notifikasi baru akan muncul di sini</p>
          </div>
        )}
      </div>
    </div>
  );
}
