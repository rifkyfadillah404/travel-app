import { useState, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  ChevronRight,
  Loader2,
  CalendarDays,
  Hotel,
  Plane,
  Camera,
  Utensils,
  //   Plus,
  Trash2,
  X,
  Clock,
  AlignLeft
} from 'lucide-react';
import { itineraryAPI } from '../utils/api';
import { useAppStore } from '../stores/appStore';
import type { ItineraryItem } from '../types';
import './Itinerary.css';

export function ItineraryPage() {
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const { currentUser } = useAppStore();

  const isAdminOrPembimbing = currentUser?.role === 'admin' || currentUser?.role === 'pembimbing';

  // Form State
  const [formData, setFormData] = useState({
    day: 1,
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    activity: '',
    location: '',
    description: '',
    icon: 'calendar'
  });

  useEffect(() => {
    fetchItinerary();
  }, []);

  const fetchItinerary = async () => {
    try {
      setIsLoading(true);
      const response = await itineraryAPI.getAll();
      // Defensive check: ensure data is an array
      const data = Array.isArray(response.data) ? response.data : [];
      setItinerary(data);
      if (data.length > 0) {
        const days = Array.from(new Set(data.map((item: ItineraryItem) => item.day))) as number[];
        const sortedDays = days.sort((a, b) => a - b);
        if (!sortedDays.includes(selectedDay)) {
          setSelectedDay(sortedDays[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch itinerary:', error);
      setItinerary([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await itineraryAPI.create(formData);
      setShowAddModal(false);
      setFormData({ ...formData, activity: '', location: '', description: '' });
      fetchItinerary();
    } catch (error) {
      alert('Gagal menambah jadwal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus jadwal ini?')) return;
    try {
      await itineraryAPI.delete(id);
      fetchItinerary();
    } catch (error) {
      alert('Gagal menghapus jadwal');
    }
  };

  const getIcon = (type?: string) => {
    switch (type) {
      case 'plane': return <Plane size={20} />;
      case 'hotel': return <Hotel size={20} />;
      case 'camera': return <Camera size={20} />;
      case 'utensils': return <Utensils size={20} />;
      default: return <Calendar size={20} />;
    }
  };

  const days = Array.from(new Set(itinerary.map(item => item.day))).sort((a, b) => a - b);
  const currentDayItems = itinerary.filter(item => item.day === selectedDay).sort((a, b) => a.time.localeCompare(b.time));

  if (isLoading) {
    return (
      <div className="itinerary-loading">
        <Loader2 size={32} className="spin" />
        <p>Memuat rencana perjalanan...</p>
      </div>
    );
  }

  return (
    <div className="itinerary-page">
      <div className="page-header">
        <div className="header-info">
          <CalendarDays size={28} />
          <div>
            <h2>Itinerary</h2>
            <p className="subtitle">Rencana perjalanan ibadah Anda</p>
          </div>
        </div>
      </div>

      <div className="day-selector-container">
        <div className="day-selector">
          {days.length > 0 ? days.map(day => (
            <button
              key={day}
              className={`day-btn ${selectedDay === day ? 'active' : ''}`}
              onClick={() => setSelectedDay(day)}
            >
              <span>Hari</span>
              <strong>{day}</strong>
            </button>
          )) : (
            <div className="no-days">Belum ada jadwal</div>
          )}
        </div>
      </div>

      <div className="itinerary-timeline">
        {currentDayItems.length > 0 ? (
          currentDayItems.map((item, index) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline-time">
                <span className="time-text">{item.time}</span>
                <div className="timeline-line">
                  <div className="timeline-dot">
                    {getIcon(item.icon)}
                  </div>
                  {index < currentDayItems.length - 1 && <div className="line-connector"></div>}
                </div>
              </div>
              <div className="timeline-content">
                <div className="activity-card">
                  <div className="activity-header">
                    <h3>{item.activity}</h3>
                    {isAdminOrPembimbing ? (
                      <button className="delete-item-btn" onClick={() => handleDelete(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <ChevronRight size={18} className="arrow" />
                    )}
                  </div>
                  <div className="activity-meta">
                    <span className="location">
                      <MapPin size={14} />
                      {item.location}
                    </span>
                    <span className="date">
                      <Calendar size={14} />
                      {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {item.description && (
                    <p className="activity-description">{item.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-itinerary">
            <Calendar size={48} />
            <p>Tidak ada jadwal untuk hari ini</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tambah Jadwal Baru</h3>
              <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleCreate} className="modal-form-body">
              <div className="form-group-row">
                <div className="form-group">
                  <label>Hari Ke-</label>
                  <input
                    type="number"
                    value={formData.day}
                    onChange={e => setFormData({ ...formData, day: parseInt(e.target.value) })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Waktu</label>
                  <div className="input-with-icon">
                    <Clock size={16} />
                    <input
                      type="time"
                      value={formData.time}
                      onChange={e => setFormData({ ...formData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Tanggal</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Kegiatan</label>
                <input
                  type="text"
                  placeholder="Contoh: City Tour Madinah"
                  value={formData.activity}
                  onChange={e => setFormData({ ...formData, activity: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Lokasi</label>
                <div className="input-with-icon">
                  <MapPin size={16} />
                  <input
                    type="text"
                    placeholder="Contoh: Masjid Nabawi"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ikon</label>
                <select
                  value={formData.icon}
                  onChange={e => setFormData({ ...formData, icon: e.target.value })}
                >
                  <option value="calendar">Kalender</option>
                  <option value="plane">Pesawat</option>
                  <option value="hotel">Hotel</option>
                  <option value="camera">Ziarah</option>
                  <option value="utensils">Makan</option>
                </select>
              </div>

              <div className="form-group">
                <label>Keterangan (Opsional)</label>
                <div className="input-with-icon align-top">
                  <AlignLeft size={16} />
                  <textarea
                    placeholder="Tambahkan detail kegiatan..."
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="submit-btn">Simpan Jadwal</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
