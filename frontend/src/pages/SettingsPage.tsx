import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import { MapPin, Power, Clock, Target, Users, LogOut, Loader2, Camera, Edit2 } from 'lucide-react';
import { groupsAdminAPI } from '../utils/api';

// Compress image before upload (client side)
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300; // Resize to max 300px to save DB space
        const scaleSize = MAX_WIDTH / img.width;
        
        // If image is smaller than max width, don't resize up
        const width = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
        const height = img.width > MAX_WIDTH ? img.height * scaleSize : img.height;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress quality 0.7
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export function SettingsPage() {
  const navigate = useNavigate();
  const { settings, updateSettings, group, currentUser, joinGroup, leaveGroup, updateUserProfile, logout } = useAppStore();

  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleGps = () => {
    updateSettings({ isGpsActive: !settings.isGpsActive });
  };

  const handleToggleApp = () => {
    updateSettings({ isAppActive: !settings.isAppActive });
  };

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ trackingInterval: parseInt(e.target.value) });
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ radiusLimit: parseInt(e.target.value) });
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setIsJoining(true);
    setMessage(null);
    
    const result = await joinGroup(joinCode.trim());
    
    setIsJoining(false);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    
    if (result.success) {
      setJoinCode('');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari grup ini?')) return;
    
    setIsLeaving(true);
    setMessage(null);
    
    const result = await leaveGroup();
    
    setIsLeaving(false);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Ukuran foto maksimal 5MB' });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewAvatar(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    setSelectedFile(file);
    setMessage(null);
  };

  const handleSaveAvatar = async () => {
    if (!selectedFile) return;

    setIsUpdatingProfile(true);
    setMessage(null);

    try {
      const base64 = await compressImage(selectedFile);
      const result = await updateUserProfile(base64);
      setMessage({ type: result.success ? 'success' : 'error', text: result.message });
      
      if (result.success) {
        setPreviewAvatar(null);
        setSelectedFile(null);
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Gagal memproses foto' });
    } finally {
      setIsUpdatingProfile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const handleCancelAvatar = () => {
    setPreviewAvatar(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleLogout = async () => {
    if (!confirm('Apakah Anda yakin ingin logout dari aplikasi?')) return;
    await logout();
    navigate('/login');
  };

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  return (
    <div className="settings-page">
      <div className="page-header">
        <h2>Settings</h2>
        <p className="subtitle">Pengaturan akun & aplikasi</p>
      </div>

      <div className="settings-section">
        <h3>Profil Saya</h3>
        <div className="profile-settings-card">
          <div className="profile-avatar-container" onClick={handleAvatarClick} title="Klik untuk ganti foto">
            {previewAvatar ? (
              <img src={previewAvatar} alt="Preview" className="profile-avatar-img" />
            ) : currentUser?.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-placeholder">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="profile-avatar-overlay">
              {isUpdatingProfile ? <Loader2 size={24} className="spin" /> : <Camera size={24} />}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
          <div className="profile-info">
            <span className="profile-name">{currentUser?.name}</span>
            <span className="profile-phone">{currentUser?.phone}</span>
            <div className="profile-role-wrapper">
              <span className={`role-badge role-${currentUser?.role?.toLowerCase()}`}>
                {currentUser?.role}
              </span>
            </div>
            
            {previewAvatar && (
              <div className="avatar-actions">
                <button 
                  className="save-avatar-btn" 
                  onClick={handleSaveAvatar}
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? <Loader2 size={14} className="spin" /> : null}
                  Simpan
                </button>
                <button 
                  className="cancel-avatar-btn" 
                  onClick={handleCancelAvatar}
                  disabled={isUpdatingProfile}
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3>Status Aplikasi</h3>
        <div className="setting-item">
          <div className="setting-info">
            <Power size={20} />
            <div>
              <span className="setting-label">Aplikasi Aktif</span>
              <span className="setting-desc">
                Aktifkan untuk menggunakan fitur tracking
              </span>
            </div>
          </div>
          <button
            className={`toggle-btn ${settings.isAppActive ? 'toggle--active' : ''}`}
            onClick={handleToggleApp}
          >
            {settings.isAppActive ? 'ON' : 'OFF'}
          </button>
        </div>

        {group && (
          <div className="activation-note">
            <p>
              <strong>Note:</strong> Aplikasi akan otomatis aktif saat keberangkatan
              di bandara Indonesia ({group.departureAirport}) pada {new Date(group.departureDate).toLocaleDateString('id-ID')},
              dan akan non-aktif saat kepulangan di tanah air pada {new Date(group.returnDate).toLocaleDateString('id-ID')}.
            </p>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>GPS Settings</h3>

        <div className="setting-item">
          <div className="setting-info">
            <MapPin size={20} />
            <div>
              <span className="setting-label">GPS Tracking</span>
              <span className="setting-desc">
                Aktifkan untuk melacak lokasi secara real-time
              </span>
            </div>
          </div>
          <button
            className={`toggle-btn ${settings.isGpsActive ? 'toggle--active' : ''}`}
            onClick={handleToggleGps}
          >
            {settings.isGpsActive ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <Clock size={20} />
            <div>
              <span className="setting-label">Mode Pelacakan</span>
              <span className="setting-desc">
                Seimbangkan akurasi & daya baterai
              </span>
            </div>
          </div>
          <select
            value={settings.trackingInterval}
            onChange={handleIntervalChange}
            className="setting-select"
          >
            <option value={60}>Akurat (1m)</option>
            <option value={180}>Normal (3m)</option>
            <option value={300}>Hemat Baterai (5m)</option>
          </select>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <Target size={20} />
            <div>
              <span className="setting-label">Radius Limit</span>
              <span className="setting-desc">
                Batas radius untuk monitoring
              </span>
            </div>
          </div>
          <select
            value={settings.radiusLimit}
            onChange={handleRadiusChange}
            className="setting-select"
          >
            <option value={100}>100 meter</option>
            <option value={250}>250 meter</option>
            <option value={500}>500 meter</option>
            <option value={1000}>1 km</option>
            <option value={2000}>2 km</option>
          </select>
        </div>
      </div>

      {/* Group Management Section */}
      <div className="settings-section">
        <h3>Grup Perjalanan</h3>
        
        {message && (
          <div className={`message-alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            {message.text}
          </div>
        )}

        {group ? (
          <div className="current-group-card">
            <div className="group-info-header">
              <Users size={24} />
              <div style={{ flex: 1 }}>
                <div className="group-name-row">
                  <span className="group-name">{group.name}</span>
                </div>
                <span className="group-dates">
                  {new Date(group.departureDate).toLocaleDateString('id-ID')} - {new Date(group.returnDate).toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>

            {!isAdmin && (
              <button 
                className="leave-group-btn"
                onClick={handleLeaveGroup}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <LogOut size={16} />
                )}
                Keluar dari Grup
              </button>
            )}
            
            {isAdmin && (
              <p className="admin-note">
                Sebagai admin, Anda tidak dapat meninggalkan grup.
              </p>
            )}
          </div>
        ) : (
          <div className="join-group-section">
            <p className="join-desc">
              Masukkan kode gabung untuk bergabung ke grup perjalanan.
            </p>
            <form onSubmit={handleJoinGroup} className="join-group-form">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Masukkan Kode Gabung"
                className="join-code-input"
                maxLength={8}
              />
              <button 
                type="submit" 
                className="join-group-btn"
                disabled={isJoining || !joinCode.trim()}
              >
                {isJoining ? (
                  <Loader2 size={16} className="spin" />
                ) : (
                  <Users size={16} />
                )}
                Gabung
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Info GPS</h3>
        <div className="gps-status-card">
          <div className={`gps-indicator ${settings.isGpsActive ? 'gps--active' : 'gps--inactive'}`}>
            <MapPin size={32} />
          </div>
          <div className="gps-info">
            <span className="gps-status">
              GPS {settings.isGpsActive ? 'Aktif' : 'Non-aktif'}
            </span>
            <span className="gps-desc">
              {settings.isGpsActive
                ? `Update setiap ${settings.trackingInterval} detik`
                : 'Aktifkan GPS untuk tracking lokasi'}
            </span>
          </div>
        </div>
      </div>

      <div className="settings-section logout-section">
        <button className="logout-app-btn" onClick={handleLogout}>
          <LogOut size={18} />
          Logout Aplikasi
        </button>
        <p className="app-version">Version 1.0.0</p>
      </div>
    </div>
  );
}
