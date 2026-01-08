import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { Link } from 'react-router-dom';
import { AlertTriangle, Edit2, Activity, ShieldCheck, ChevronLeft, ChevronRight, BookOpen, Users, Loader2, Settings } from 'lucide-react';
// import { differenceInDays } from 'date-fns';

import { groupsAdminAPI } from '../utils/api';

const DAILY_DUAS = [
  {
    title: "Doa Safar (Perjalanan)",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ",
    translation: "\"Maha Suci Allah yang telah menundukkan semua ini bagi kami padahal kami sebelumnya tidak mampu menguasainya, dan sesungguhnya kami akan kembali kepada Tuhan kami.\""
  },
  {
    title: "Doa Masuk Masjid",
    arabic: "اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ",
    translation: "\"Ya Allah, bukalah untukku pintu-pintu rahmat-Mu.\""
  },
  {
    title: "Doa Keluar Masjid",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ مِنْ فَضْلِكَ",
    translation: "\"Ya Allah, sesungguhnya aku memohon keutamaan dari-Mu.\""
  },
  {
    title: "Doa Melihat Ka'bah",
    arabic: "اللَّهُمَّ زِدْ هَذَا الْبَيْتَ تَشْرِيفًا وَتَعْظِيمًا وَتَكْرِيمًا وَمَهَابَةً",
    translation: "\"Ya Allah, tambahkanlah kemuliaan, keagungan, kehormatan, dan wibawa pada Baitullah ini.\""
  },
  {
    title: "Rabbana Atina",
    arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    translation: "\"Ya Tuhan kami, berilah kami kebaikan di dunia dan kebaikan di akhirat dan peliharalah kami dari siksa neraka.\""
  }
];

export function DashboardPage() {
  const { users, group, panicAlerts, currentUser, joinGroup } = useAppStore();
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteForm, setNoteForm] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentDuaIndex, setCurrentDuaIndex] = useState(0);

  // Join group state
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const nextDua = () => {
    setCurrentDuaIndex((prev) => (prev + 1) % DAILY_DUAS.length);
  };

  const isPembimbing = currentUser?.role?.toLowerCase() === 'pembimbing';
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  const handleEditNoteClick = () => {
    if (group) {
      setNoteForm(group.destination || '');
      setIsEditingNote(true);
    }
  };

  const handleSaveNote = async () => {
    if (!group) return;
    try {
      await groupsAdminAPI.update(group.id, { destination: noteForm });
      // setGroup({ ...group, destination: noteForm });
      setIsEditingNote(false);
    } catch (error) { console.error(error); alert('Gagal update catatan'); }
  };

  const prevDua = () => {
    setCurrentDuaIndex((prev) => (prev - 1 + DAILY_DUAS.length) % DAILY_DUAS.length);
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setJoinError('');

    const result = await joinGroup(joinCode.trim());

    setIsJoining(false);
    if (result.success) {
      setJoinCode('');
    } else {
      setJoinError(result.message);
    }
  };

  /* const today = new Date();
  const start = group ? new Date(group.departureDate) : new Date();
  const end = group ? new Date(group.returnDate) : new Date(); */
  //   const totalDays = differenceInDays(end, start) || 1;
  //   const daysPassed = differenceInDays(today, start);
  //   const daysLeft = differenceInDays(end, today);
  //   const progressPercent = Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);
  const onlineUsers = users.filter((u) => u.isOnline);
  const unresolvedAlerts = panicAlerts.filter((a) => !a.isResolved);
  const currentDua = DAILY_DUAS[currentDuaIndex];

  if (isAdmin) {
    // Calculate stats
    const totalUsers = users.length;
    const totalPembimbing = users.filter(u => u.role === 'pembimbing').length;
    const totalJamaah = users.filter(u => u.role === 'jamaah').length;
    //     const activeGroups = 1; // Placeholder, or fetch from groups API if available

    return (
      <div className="dashboard-minimal admin-dashboard-layout">
        <div className="admin-header-section">
          <div>
            <h1 className="greeting-admin">Control Panel</h1>
            <p className="sub-greeting">Selamat datang, Administrator</p>
          </div>
          <div className="system-status-badge">
            <div className="status-dot"></div>
            <span>System Online</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="admin-stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon-wrapper">
              <Users size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalUsers}</span>
              <span className="stat-label">Total Pengguna</span>
            </div>
          </div>

          <div className="stat-card secondary">
            <div className="stat-icon-wrapper">
              <ShieldCheck size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalPembimbing}</span>
              <span className="stat-label">Pembimbing</span>
            </div>
          </div>

          <div className="stat-card accent">
            <div className="stat-icon-wrapper">
              <BookOpen size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{totalJamaah}</span>
              <span className="stat-label">Jamaah</span>
            </div>
          </div>
        </div>

        {/* Quick Menu */}
        <h3 className="section-title">Menu Cepat</h3>
        <div className="admin-quick-menu">
          <Link to="/users" className="quick-menu-item">
            <div className="menu-icon bg-blue">
              <Users size={24} />
            </div>
            <div className="menu-text">
              <span className="menu-title">Kelola User</span>
              <span className="menu-desc">Tambah/Edit pengguna</span>
            </div>
            <ChevronRight size={20} className="menu-arrow" />
          </Link>

          <Link to="/settings" className="quick-menu-item">
            <div className="menu-icon bg-purple">
              <Settings size={24} />
            </div>
            <div className="menu-text">
              <span className="menu-title">Pengaturan</span>
              <span className="menu-desc">Konfigurasi sistem</span>
            </div>
            <ChevronRight size={20} className="menu-arrow" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-minimal">
      <div className="minimal-header">
        <div>
          <h1 className="greeting">Halo, {currentUser?.name?.split(' ')[0]}</h1>
          <p className="date-display">
            {currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="live-badge">
          <span className="live-dot"></span> LIVE
        </div>
      </div>

      {/* Show Join Group Card if no group (only for non-admin) */}
      {!group && !isAdmin && (
        <div className="join-group-card">
          <div className="join-group-icon">
            <Users size={32} />
          </div>
          <h2>Gabung ke Grup Perjalanan</h2>
          <p>Masukkan kode dari admin untuk bergabung ke grup perjalanan Anda</p>

          <form onSubmit={handleJoinGroup} className="join-group-form-dashboard">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Masukkan Kode"
              className="join-code-input-dashboard"
              maxLength={10}
            />
            <button
              type="submit"
              className="join-btn-dashboard"
              disabled={isJoining || !joinCode.trim()}
            >
              {isJoining ? (
                <Loader2 size={20} className="spin" />
              ) : (
                'Gabung'
              )}
            </button>
          </form>

          {joinError && (
            <p className="join-error">{joinError}</p>
          )}
        </div>
      )}

      {group && (
        <div className="bento-grid">
          {/* Card 1: Trip Status (Big Left) */}
          <div className="bento-card trip-card">
            <div className="card-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="card-label" style={{ margin: 0 }}>Catatan Pembimbing</span>
              {(isPembimbing || isAdmin) && !isEditingNote && (
                <button onClick={handleEditNoteClick} className="icon-btn" style={{ padding: '4px' }}>
                  <Edit2 size={16} />
                </button>
              )}
            </div>

            {isEditingNote ? (
              <div className="minimal-form">
                <textarea
                  value={noteForm}
                  onChange={e => setNoteForm(e.target.value)}
                  className="minimal-input"
                  placeholder="Ketik catatan atau pengumuman sementara..."
                  style={{ minHeight: '80px', width: '100%', marginBottom: '10px' }}
                />
                <div className="row">
                  <button onClick={handleSaveNote} className="btn-save">Simpan</button>
                  <button onClick={() => setIsEditingNote(false)} className="btn-cancel">Batal</button>
                </div>
              </div>
            ) : (
              <h2 className="trip-name" style={{ fontSize: '1.2rem', fontWeight: '500', marginTop: '10px' }}>
                {group.destination || "Belum ada catatan."}
              </h2>
            )}
          </div>

          {/* Card 2: Live Stats (Top Right) */}
          <div className="bento-card stats-card">
            <div className="stat-row">
              <div className="stat-item">
                <span className="stat-num">{users.length}</span>
                <span className="stat-lbl">Jamaah</span>
              </div>
              <div className="divider-vertical"></div>
              <div className="stat-item">
                <span className="stat-num active">{onlineUsers.length}</span>
                <span className="stat-lbl">Online</span>
              </div>
            </div>
            <div className="stat-extra">
              <Activity size={14} />
              <span>Monitoring Aktif</span>
            </div>
          </div>

          {/* Card 3: Safety Status (Bottom Right) */}
          <div className={`bento-card safety-card ${unresolvedAlerts.length > 0 ? 'danger' : 'safe'}`}>
            <div className="safety-content">
              {unresolvedAlerts.length > 0 ? (
                <>
                  <div className="safety-icon-box danger">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <span className="safety-value">{unresolvedAlerts.length}</span>
                    <span className="safety-label">Panic Alert!</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="safety-icon-box safe">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <span className="safety-status">Aman</span>
                    <span className="safety-label">Tidak ada insiden</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Card 4: Daily Dua Slider (Wide Bottom) */}
          <div className="bento-card dua-card-wide">
            <div className="card-top">
              <span className="card-label">Doa Harian</span>
              <div className="dua-controls">
                <button onClick={prevDua} className="dua-nav-btn"><ChevronLeft size={18} /></button>
                <button onClick={nextDua} className="dua-nav-btn"><ChevronRight size={18} /></button>
              </div>
            </div>

            <div className="dua-content">
              <div className="dua-icon-bg">
                <BookOpen size={120} strokeWidth={0.5} />
              </div>
              <h3 className="dua-title">{currentDua.title}</h3>
              <p className="dua-arabic">{currentDua.arabic}</p>
              <p className="dua-translation">{currentDua.translation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

