import { useState, useEffect } from 'react';
// import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

// ... (rest of the file)
// actually let's just replace the specific lines

import {
  Users,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  X,
  Download,
  User,
  Phone,
  Shield,
  Loader2,
  CalendarDays,
  Clock,
  MapPin,
  Plane,
  Lock,
  Search,
} from 'lucide-react';
import { adminAPI, itineraryAPI, groupsAdminAPI } from '../utils/api';
import { useAppStore } from '../stores/appStore';
import type { ItineraryItem } from '../types';
import './Itinerary.css';

interface AdminUser {
  id: number;
  name: string;
  phone: string;
  qrToken: string;
  role: string;
  isOnline: boolean;
  avatar?: string;
}

export function AdminPage() {
  const { currentUser } = useAppStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';
  const isPembimbing = currentUser?.role?.toLowerCase() === 'pembimbing';

  // Set default tab based on role
  const [activeTab, setActiveTab] = useState<'users' | 'itinerary' | 'groups'>('users');

  // Update activeTab when role is determined
  useEffect(() => {
    if (isPembimbing) {
      setActiveTab('itinerary');
    } else if (isAdmin) {
      setActiveTab('users');
    }
  }, [isAdmin, isPembimbing]);

  // Itinerary state
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [newItinerary, setNewItinerary] = useState<Partial<ItineraryItem>>({
    day: 1,
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    activity: '',
    location: '',
    description: '',
    icon: 'calendar',
  });

  // Groups state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groups, setGroups] = useState<{ id: number; name: string; departureDate: string; returnDate: string; joinCode?: string }[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    departureAirport: 'Soekarno-Hatta International Airport'
  });

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    // Pembimbing: also fetch itinerary directly (like ItineraryPage does)
    if (isPembimbing) {
      fetchItinerary();
    }
  }, [isPembimbing]);

  // Fetch itinerary when selected group changes (for admin only)
  useEffect(() => {
    if (isAdmin && selectedGroupId) {
      fetchItineraryByGroup(selectedGroupId);
    } else if (isAdmin && !selectedGroupId) {
      setItinerary([]);
    }
  }, [selectedGroupId, isAdmin]);

  // Auto-select first group when groups are loaded (for admin)
  useEffect(() => {
    if (isAdmin && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, isAdmin]);

  const fetchGroups = async () => {
    try {
      const response = await groupsAdminAPI.getAll();
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  const fetchItineraryByGroup = async (groupId: number) => {
    try {
      const response = await itineraryAPI.getByGroup(groupId);
      setItinerary(response.data);
    } catch (error: any) {
      // If 404 (no itinerary found), just clear the list gracefully
      if (error.response?.status === 404) {
        setItinerary([]);
        // Suppress console error for 404 since it's expected when empty
      } else {
        console.error('Failed to fetch itinerary:', error);
      }
    }
  };

  const fetchItinerary = async () => {
    try {
      const response = await itineraryAPI.getAll();
      setItinerary(response.data);
    } catch (error) {
      console.error('Failed to fetch itinerary:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await adminAPI.getUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // User form state
  const [newUser, setNewUser] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'jamaah',
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await adminAPI.createUser(newUser);
      setShowAddModal(false);
      setNewUser({ name: '', phone: '', password: '', role: 'jamaah' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to add user:', error);
      alert('Gagal menambahkan user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Yakin ingin menghapus user ini?')) return;

    try {
      await adminAPI.deleteUser(userId.toString());
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Gagal menghapus user');
    }
  };

  const handleRegenerateQR = async (userId: number) => {
    if (!confirm('Yakin ingin generate ulang QR Code? QR Code lama tidak akan bisa digunakan lagi.')) return;

    try {
      const response = await adminAPI.regenerateQR(userId.toString());
      // Update local state
      setUsers(users.map(u =>
        u.id === userId ? { ...u, qrToken: response.data.qrToken } : u
      ));
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, qrToken: response.data.qrToken });
      }
    } catch (error) {
      console.error('Failed to regenerate QR:', error);
      alert('Gagal generate ulang QR Code');
    }
  };

  const handleShowQR = (user: AdminUser) => {
    setSelectedUser(user);
    setShowQRModal(true);
  };

  const handleAddItinerary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await itineraryAPI.create(newItinerary);
      setShowItineraryModal(false);
      setNewItinerary({
        day: 1,
        date: new Date().toISOString().split('T')[0],
        time: '08:00',
        activity: '',
        location: '',
        description: '',
        icon: 'calendar',
      });
      fetchItinerary();
    } catch (error) {
      console.error('Failed to add itinerary:', error);
      alert('Gagal menambahkan itinerary');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItinerary = async (id: string) => {
    if (!confirm('Yakin ingin menghapus jadwal ini?')) return;
    try {
      await itineraryAPI.delete(id);
      fetchItinerary();
    } catch (error) {
      console.error('Failed to delete itinerary:', error);
      alert('Gagal menghapus itinerary');
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await groupsAdminAPI.create(newGroup);
      setShowGroupModal(false);
      setNewGroup({
        name: '',
        destination: '',
        departureDate: '',
        returnDate: '',
        departureAirport: 'Soekarno-Hatta International Airport'
      });
      fetchGroups();
      alert(`Grup berhasil dibuat! Join Code: ${response.data.group.joinCode}`);
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('Gagal membuat grup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadQR = () => {
    if (!selectedUser) return;

    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 500;

      if (ctx) {
        // White background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw QR code
        ctx.drawImage(img, 50, 50, 300, 300);

        // Draw name
        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(selectedUser.name, 200, 400);

        // Draw phone
        ctx.fillStyle = '#6b7280';
        ctx.font = '16px Arial';
        ctx.fillText(selectedUser.phone, 200, 430);

        // Draw ITJ Travel
        ctx.fillStyle = '#1e40af';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('ITJ Travel', 200, 470);

        // Download
        const link = document.createElement('a');
        link.download = `QR-${selectedUser.name.replace(/\s+/g, '-')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Check if current user has access
  if (!isAdmin && !isPembimbing) {
    return (
      <div className="admin-page">
        <div className="admin-restricted">
          <Shield size={48} />
          <h2>Akses Terbatas</h2>
          <p>Role Anda saat ini: <strong>{currentUser?.role || 'Tidak Diketahui'}</strong></p>
          <p>Halaman ini hanya untuk Admin dan Pembimbing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <Shield size={28} style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h2 style={{ margin: 0, lineHeight: 1.2 }}>{isAdmin ? 'Panel Admin' : 'Panel Pembimbing'}</h2>
          <p className="subtitle" style={{ margin: 0, marginTop: '2px' }}>
            {isAdmin ? 'Kelola user dan data jamaah' : 'Kelola itinerary dan grup perjalanan'}
          </p>
        </div>
      </div>

      <div className="admin-tabs">
        {isAdmin && (
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} />
            Kelola User
          </button>
        )}
        {isPembimbing && (
          <>
            <button
              className={`tab-btn ${activeTab === 'itinerary' ? 'active' : ''}`}
              onClick={() => setActiveTab('itinerary')}
            >
              <CalendarDays size={18} />
              Kelola Itinerary
            </button>
            <button
              className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveTab('groups')}
            >
              <Plane size={18} />
              Buat Grup Baru
            </button>
          </>
        )}
      </div>

      {activeTab === 'users' ? (
        <>
          <div className="admin-search-bar" style={{ marginBottom: '16px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-400)' }} />
            <input
              type="text"
              placeholder="Cari nama atau nomor telepon..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 40px',
                borderRadius: '12px',
                border: '1.5px solid var(--primary-100)',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>

          <div className="admin-actions">
            <button className="add-btn-circle" onClick={() => setShowAddModal(true)} title="Tambah User">
              <Plus size={24} />
            </button>
          </div>

          {isLoading ? (
            <div className="admin-loading">
              <Loader2 size={32} className="spin" />
              <p>Memuat data user...</p>
            </div>
          ) : (
            <div className="admin-user-list">
              {users
                .filter(u =>
                  u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.phone.includes(searchTerm)
                )
                .map((user) => (
                  <div key={user.id} className="admin-user-card">
                    <div className="admin-user-info">
                      <div className={`admin-user-avatar ${user.isOnline ? 'online' : ''}`}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="admin-user-details">
                        <span className="admin-user-name">
                          {user.name}
                          <span className={`role-badge role-${user.role}`}>{user.role}</span>
                        </span>
                        <span className="admin-user-phone">{user.phone}</span>
                      </div>
                    </div>
                    <div className="admin-user-actions">
                      <button
                        className="admin-action-btn qr-btn"
                        onClick={() => handleShowQR(user)}
                        title="Lihat QR Code"
                      >
                        <QrCode size={22} strokeWidth={2} />
                      </button>
                      <button
                        className="admin-action-btn delete-btn"
                        onClick={() => handleDeleteUser(user.id)}
                        title="Hapus User"
                        disabled={String(user.id) === currentUser?.id}
                      >
                        <Trash2 size={22} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      ) : activeTab === 'itinerary' ? (
        <>
          <div className="admin-actions">
            <button className="add-btn-circle" onClick={() => setShowItineraryModal(true)} title="Tambah Jadwal">
              <Plus size={24} />
            </button>
          </div>

          <div className="admin-itinerary-list">
            {itinerary.length > 0 ? (
              itinerary.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)).map((item) => (
                <div key={item.id} className="admin-user-card itinerary-admin-card">
                  <div className="admin-user-info">
                    <div className="admin-user-avatar itinerary-day-badge">
                      {item.day}
                    </div>
                    <div className="admin-user-details">
                      <span className="admin-user-name">
                        {item.activity}
                      </span>
                      <span className="admin-user-phone">
                        <Clock size={12} style={{ marginRight: 4 }} /> {item.time} |
                        <MapPin size={12} style={{ margin: '0 4px' }} /> {item.location}
                      </span>
                    </div>
                  </div>
                  <div className="admin-user-actions">
                    <button
                      className="admin-action-btn delete-btn"
                      onClick={() => handleDeleteItinerary(item.id)}
                      title="Hapus Jadwal"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <CalendarDays size={48} />
                <p>Belum ada jadwal perjalanan</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="admin-groups-panel">
          <div className="admin-actions">
            <button className="add-btn-circle" onClick={() => setShowGroupModal(true)} title="Buat Grup Baru">
              <Plus size={24} />
            </button>
          </div>

          <div className="admin-user-list">
            {groups.length > 0 ? (
              groups.map((group) => (
                <div key={group.id} className="admin-user-card">
                  <div className="admin-user-info">
                    <div className="admin-user-avatar" style={{ background: 'var(--primary-500)', color: 'white' }}>
                      <Plane size={20} />
                    </div>
                    <div className="admin-user-details">
                      <span className="admin-user-name">{group.name}</span>
                      <span className="admin-user-phone">
                        {new Date(group.departureDate).toLocaleDateString('id-ID')} - {new Date(group.returnDate).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                  </div>
                  {group.joinCode && (
                    <div className="group-join-code">
                      <span className="join-code-label">Kode:</span>
                      <span className="join-code-value">{group.joinCode}</span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Plane size={48} />
                <p>Belum ada grup perjalanan</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals remain the same but added Itinerary Modal */}
      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Tambah User Baru</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddUser} className="modal-form">
              <div className="form-group">
                <label>
                  <User size={16} />
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nama lengkap"
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <Phone size={16} />
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  <Lock size={16} />
                  Password
                </label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>
                  <Shield size={16} />
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="jamaah">Jamaah</option>
                  <option value="pembimbing">Pembimbing</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Tambah User
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal-container qr-modal">
            <div className="modal-header">
              <h3>QR Code Login</h3>
              <button className="modal-close" onClick={() => setShowQRModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="qr-modal-content">
              <div className="qr-code-wrapper">
                {/* QR contains login URL so iOS Camera app can open it directly */}
                <QRCodeSVG
                  id="qr-code-svg"
                  value={`${window.location.origin}/login?qr=${selectedUser.qrToken}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <div className="qr-user-info">
                <h4>{selectedUser.name}</h4>
                <p>{selectedUser.phone}</p>
                <span className={`role-badge role-${selectedUser.role}`}>
                  {selectedUser.role}
                </span>
              </div>
              <div className="qr-actions">
                <button className="qr-download-btn" onClick={handleDownloadQR}>
                  <Download size={18} />
                  Download QR
                </button>
                <button
                  className="qr-regenerate-btn"
                  onClick={() => handleRegenerateQR(selectedUser.id)}
                >
                  <RefreshCw size={18} />
                  Generate Ulang
                </button>
              </div>
              <p className="qr-instruction">
                User dapat scan QR Code ini untuk login tanpa password
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Itinerary Modal */}
      {showItineraryModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Tambah Jadwal Perjalanan</h3>
              <button className="modal-close" onClick={() => setShowItineraryModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddItinerary} className="modal-form">
              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label>Hari Ke-</label>
                  <input
                    type="number"
                    value={newItinerary.day}
                    onChange={(e) => setNewItinerary({ ...newItinerary, day: parseInt(e.target.value) })}
                    required
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Waktu</label>
                  <input
                    type="time"
                    value={newItinerary.time}
                    onChange={(e) => setNewItinerary({ ...newItinerary, time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Tanggal</label>
                <input
                  type="date"
                  value={newItinerary.date}
                  onChange={(e) => setNewItinerary({ ...newItinerary, date: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Aktivitas</label>
                <input
                  type="text"
                  value={newItinerary.activity}
                  onChange={(e) => setNewItinerary({ ...newItinerary, activity: e.target.value })}
                  placeholder="Contoh: City Tour Madinah"
                  required
                />
              </div>
              <div className="form-group">
                <label>Lokasi</label>
                <input
                  type="text"
                  value={newItinerary.location}
                  onChange={(e) => setNewItinerary({ ...newItinerary, location: e.target.value })}
                  placeholder="Contoh: Masjid Nabawi"
                  required
                />
              </div>
              <div className="form-group">
                <label>Deskripsi (Opsional)</label>
                <textarea
                  value={newItinerary.description}
                  onChange={(e) => setNewItinerary({ ...newItinerary, description: e.target.value })}
                  placeholder="Keterangan tambahan..."
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--primary-200)', fontFamily: 'inherit' }}
                />
              </div>
              <div className="form-group">
                <label>Icon</label>
                <select
                  value={newItinerary.icon}
                  onChange={(e) => setNewItinerary({ ...newItinerary, icon: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid var(--primary-200)' }}
                >
                  <option value="calendar">Umum</option>
                  <option value="plane">Pesawat</option>
                  <option value="hotel">Hotel</option>
                  <option value="camera">Wisata</option>
                  <option value="utensils">Makan</option>
                </select>
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Simpan Jadwal
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Add Group Modal */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h3>Buat Grup Baru</h3>
              <button className="modal-close" onClick={() => setShowGroupModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddGroup} className="modal-form">
              <div className="form-group">
                <label>Nama Grup / Rombongan</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  placeholder="Contoh: Tour Korea Spring 2026"
                  required
                />
              </div>
              <div className="form-group">
                <label>Destinasi Utama</label>
                <input
                  type="text"
                  value={newGroup.destination}
                  onChange={(e) => setNewGroup({ ...newGroup, destination: e.target.value })}
                  placeholder="Contoh: Seoul & Nami Island"
                  required
                />
              </div>
              <div className="form-group">
                <label>Tanggal Berangkat</label>
                <input
                  type="date"
                  value={newGroup.departureDate}
                  onChange={(e) => setNewGroup({ ...newGroup, departureDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tanggal Pulang</label>
                <input
                  type="date"
                  value={newGroup.returnDate}
                  onChange={(e) => setNewGroup({ ...newGroup, returnDate: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Bandara Keberangkatan</label>
                <input
                  type="text"
                  value={newGroup.departureAirport}
                  onChange={(e) => setNewGroup({ ...newGroup, departureAirport: e.target.value })}
                  placeholder="Nama Bandara"
                  required
                />
              </div>
              <button type="submit" className="submit-btn" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Tambah Grup
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
