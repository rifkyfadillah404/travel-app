import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { useAppStore } from '../stores/appStore';
import { AlertTriangle, Bell, MapPin, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { settings, currentUser, updateSettings, logout } = useAppStore();
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const toggleGps = () => {
    updateSettings({ isGpsActive: !settings.isGpsActive });
  };

  const handleLogout = async () => {
    if (confirm('Yakin ingin keluar?')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="app-brand">
            <h1>Travel App</h1>
          </div>
          <div className="user-greeting">
            Halo, {currentUser?.name?.split(' ')[0]}
          </div>
        </div>

        <div className="header-actions">
          {isAdmin ? (
            <button
              className="header-btn logout-btn-header"
              onClick={handleLogout}
              title="Keluar"
              style={{ color: 'var(--danger-500)', background: 'var(--danger-50)', border: 'none', padding: '8px', borderRadius: '10px' }}
            >
              <LogOut size={20} strokeWidth={2.5} />
            </button>
          ) : (
            <>
              <button
                className="header-btn panic-btn"
                onClick={() => navigate('/panic')}
                title="Tombol Darurat"
              >
                <AlertTriangle size={20} strokeWidth={2.5} />
              </button>

              <button
                className={`header-btn ${settings.isGpsActive ? 'active' : ''}`}
                onClick={toggleGps}
                title="GPS Toggle"
              >
                <MapPin size={18} strokeWidth={2.5} />
              </button>

              <button
                className="header-btn"
                onClick={() => navigate('/notifications')}
                title="Notifikasi"
              >
                <Bell size={18} strokeWidth={2.5} />
                <span className="notification-dot"></span>
              </button>
            </>
          )}
        </div>
      </header>

      {!settings.isAppActive && (
        <div className="inactive-banner">
          <AlertTriangle size={18} />
          <span>Aplikasi Non-Aktif</span>
        </div>
      )}

      <main className="app-main">
        {children}
      </main>

      <Navigation />
    </div>
  );
}
