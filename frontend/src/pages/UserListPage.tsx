import { useAppStore } from '../stores/appStore';
import { Phone, MapPin, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

export function UserListPage() {
  const { users, group } = useAppStore();

  // Filter out admins from the list
  const filteredUsers = users.filter(u => u.role?.toLowerCase() !== 'admin');

  return (
    <div className="user-list-page">
      <div className="page-header">
        <h2>User List</h2>
        <p className="subtitle">Daftar jamaah dalam 1 Group</p>
      </div>

      {group && (
        <div className="group-info-card">
          <h3>{group.name}</h3>
          <span className="member-count">{filteredUsers.length} jamaah</span>
        </div>
      )}

      <div className="user-list">
        {filteredUsers.map((user) => (
          <div
            key={user.id}
            className={`user-card ${user.isPanic ? 'user-card--panic' : ''}`}
          >
            <div className="user-avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="user-details">
              <div className="user-name">
                {user.name}
                {user.isPanic && (
                  <span className="panic-badge">
                    <AlertTriangle size={14} /> PANIC
                  </span>
                )}
              </div>
              <div className="user-phone">
                <Phone size={14} />
                {user.phone}
              </div>
              {user.location && (
                <div className="user-location">
                  <MapPin size={14} />
                  <span>
                    {user.location.lat.toFixed(4)}, {user.location.lng.toFixed(4)}
                  </span>
                  <span className="location-time">
                    ({formatDistanceToNow(user.location.timestamp, { addSuffix: true, locale: id })})
                  </span>
                </div>
              )}
            </div>
            <div className={`user-status ${user.isOnline ? 'status--online' : 'status--offline'}`}>
              {user.isOnline ? <Wifi size={16} strokeWidth={1.5} /> : <WifiOff size={16} strokeWidth={1.5} />}
              <span>{user.isOnline ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
